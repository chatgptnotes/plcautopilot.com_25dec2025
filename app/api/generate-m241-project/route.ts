/**
 * M241 .project File Generator API
 *
 * Generates complete Machine Expert .project files by:
 * 1. Generating PLCopenXML for the requested logic
 * 2. Using Machine Expert scripting to import into template
 * 3. Returning the complete .project file
 *
 * Prerequisites:
 * - Machine Expert V1.2 must be installed on the server
 * - Template .project file must exist
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateProjectFromXML } from '@/lib/machine-expert-scripting/orchestrator';
import {
  createM241MotorStartStop,
  createM241TankLevel,
  M241_MODELS,
} from '@/lib/m241-plcopen-adapter';
import type { LanguageType } from '@/lib/plcopen-types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default template path - can be overridden via environment variable
const DEFAULT_TEMPLATE_PATH = process.env.M241_TEMPLATE_PATH ||
  'c:\\Users\\HP\\Documents\\Test.project';

// Machine Expert installation path
const ME_PATH = process.env.MACHINE_EXPERT_PATH ||
  'C:\\Program Files\\Schneider Electric\\EcoStruxure Machine Expert\\V1.2';

// ============================================================================
// Request/Response Types
// ============================================================================

interface GenerateProjectRequest {
  projectName: string;
  plcModel: string;
  language: LanguageType;
  logicDescription: string;
  template?: 'motor_start_stop' | 'tank_level' | 'custom';
  templatePath?: string;
  outputFormat?: 'project' | 'xml' | 'both'; // Output format: .project file, raw XML, or both in JSON
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateProjectRequest;
    const {
      projectName,
      plcModel,
      language,
      logicDescription,
      template,
      templatePath,
      outputFormat = 'project', // Default to .project file
    } = body;

    // Validate PLC model
    if (!M241_MODELS[plcModel]) {
      return NextResponse.json(
        {
          error: `Unsupported M241 model: ${plcModel}`,
          validModels: Object.keys(M241_MODELS),
        },
        { status: 400 }
      );
    }

    // Validate language
    if (!['LD', 'ST', 'FBD'].includes(language)) {
      return NextResponse.json(
        { error: 'Language must be LD, ST, or FBD' },
        { status: 400 }
      );
    }

    // Generate PLCopenXML based on template or custom logic
    let xmlContent: string;

    if (template === 'motor_start_stop') {
      const result = createM241MotorStartStop(projectName, plcModel, language);
      if (!result.success || !result.xml) {
        return NextResponse.json(
          { error: result.error || 'Failed to generate motor start/stop template' },
          { status: 500 }
        );
      }
      xmlContent = result.xml;
    } else if (template === 'tank_level') {
      const result = createM241TankLevel(projectName, plcModel, language);
      if (!result.success || !result.xml) {
        return NextResponse.json(
          { error: result.error || 'Failed to generate tank level template' },
          { status: 500 }
        );
      }
      xmlContent = result.xml;
    } else {
      // Generate custom PLCopenXML using AI
      xmlContent = await generateCustomPLCopenXML(
        projectName,
        plcModel,
        language,
        logicDescription
      );

      if (!xmlContent) {
        return NextResponse.json(
          { error: 'Failed to generate custom PLCopenXML' },
          { status: 500 }
        );
      }
    }

    // If outputFormat is 'xml', return just the PLCopenXML
    if (outputFormat === 'xml') {
      const filename = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${plcModel}.xml`;
      return new NextResponse(xmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-PLC-Model': plcModel,
          'X-Language': language,
          'X-Generation-Time': new Date().toISOString(),
        },
      });
    }

    // Use Machine Expert to create .project file
    // Pass the plcModel to change the device model in the project
    const result = await generateProjectFromXML(
      xmlContent,
      templatePath || DEFAULT_TEMPLATE_PATH,
      undefined, // Auto-generate temp output path
      ME_PATH,
      plcModel // Target PLC model (e.g., TM241CE24T)
    );

    if (!result.success || !result.projectBuffer) {
      // If project generation failed but we have XML, offer XML as fallback
      if (outputFormat === 'both' || language === 'LD') {
        return NextResponse.json(
          {
            error: result.error || 'Failed to generate project file',
            logs: result.logs,
            xmlContent: xmlContent, // Include XML for manual import
            note: 'Project generation failed. You can manually import the PLCopenXML via: Project > Import PLCopenXML in Machine Expert',
          },
          { status: 207 } // 207 Multi-Status: partial success
        );
      }
      return NextResponse.json(
        {
          error: result.error || 'Failed to generate project file',
          logs: result.logs,
        },
        { status: 500 }
      );
    }

    // If outputFormat is 'both', return JSON with both project (base64) and XML
    if (outputFormat === 'both') {
      return NextResponse.json({
        success: true,
        projectBase64: result.projectBuffer.toString('base64'),
        projectFilename: `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${plcModel}.project`,
        xmlContent: xmlContent,
        xmlFilename: `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${plcModel}.xml`,
        plcModel,
        language,
        generatedAt: new Date().toISOString(),
        logs: result.logs,
      });
    }

    // Return the .project file (default)
    const filename = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${plcModel}.project`;

    return new NextResponse(result.projectBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-PLC-Model': plcModel,
        'X-Language': language,
        'X-Generation-Time': new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('M241 project generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// AI-Powered PLCopenXML Generator
// ============================================================================

async function generateCustomPLCopenXML(
  projectName: string,
  plcModel: string,
  language: LanguageType,
  logicDescription: string
): Promise<string | null> {
  const modelSpec = M241_MODELS[plcModel];

  const languageNames: Record<string, string> = {
    'LD': 'Ladder Diagram',
    'ST': 'Structured Text',
    'FBD': 'Function Block Diagram',
  };
  const languageName = languageNames[language] || language;

  const systemPrompt = `You are an expert PLC programmer. Generate a valid PLCopenXML file for a ${languageName} program.

PLC Model: ${plcModel}
- Digital Inputs: ${modelSpec.digitalInputs} (%IX0.0 to %IX0.${modelSpec.digitalInputs - 1})
- Digital Outputs: ${modelSpec.digitalOutputs} (%QX0.0 to %QX0.${modelSpec.digitalOutputs - 1})
- Analog Inputs: ${modelSpec.analogInputs} (%IW0.0 to %IW0.${modelSpec.analogInputs - 1})

CRITICAL: Output ONLY valid PLCopenXML. No explanations, no markdown, just the XML.

PLCopenXML Template:
<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0201">
  <fileHeader companyName="PLCAutoPilot" productName="PLCAutoPilot" productVersion="1.0" creationDateTime="..."/>
  <contentHeader name="${projectName}" modificationDateTime="...">
    <coordinateInfo>
      <fbd><scaling x="1" y="1"/></fbd>
      <ld><scaling x="1" y="1"/></ld>
      <sfc><scaling x="1" y="1"/></sfc>
    </coordinateInfo>
  </contentHeader>
  <types>
    <dataTypes/>
    <pous>
      <pou name="Main" pouType="program">
        <interface>
          <localVars>
            <!-- Variables here -->
          </localVars>
        </interface>
        <body>
          <${language === 'ST' ? 'ST' : language}>
            <!-- Program body -->
          </${language === 'ST' ? 'ST' : language}>
        </body>
      </pou>
    </pous>
  </types>
  <instances><configurations/></instances>
</project>

For ST body use: <ST><xhtml xmlns="http://www.w3.org/1999/xhtml">CODE_HERE</xhtml></ST>
For LD/FBD use appropriate elements with positions and connections.`;

  const userPrompt = `Generate a ${languageName} program for: ${logicDescription}

Project name: ${projectName}

Output the complete PLCopenXML file.`;

  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      console.error('Unexpected response type:', content.type);
      return null;
    }

    // Extract XML from response (handle potential markdown wrapping)
    let xmlText = content.text.trim();

    // Remove markdown code block if present
    const xmlMatch = xmlText.match(/```(?:xml)?\s*([\s\S]*?)```/);
    if (xmlMatch) {
      xmlText = xmlMatch[1].trim();
    }

    // Ensure it starts with XML declaration
    if (!xmlText.startsWith('<?xml')) {
      const projectStart = xmlText.indexOf('<project');
      if (projectStart >= 0) {
        xmlText = '<?xml version="1.0" encoding="utf-8"?>\n' + xmlText.substring(projectStart);
      }
    }

    return xmlText;

  } catch (error) {
    console.error('AI generation error:', error);
    return null;
  }
}

// ============================================================================
// GET handler for documentation
// ============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'M241 .project File Generator',
    description: 'Generates complete Machine Expert .project files for M241 controllers',
    usage: {
      method: 'POST',
      contentType: 'application/json',
      body: {
        projectName: 'string (required)',
        plcModel: 'string (required): TM241CE24T, TM241CE40T, TM241CEC24T, TM241CEC40T',
        language: 'string (required): LD, ST, or FBD',
        logicDescription: 'string (required): Natural language description of desired logic',
        template: 'string (optional): motor_start_stop, tank_level, or custom',
        templatePath: 'string (optional): Custom template .project file path',
        outputFormat: 'string (optional): project, xml, or both. Default: project',
      },
      response: {
        project: 'Binary .project file (application/octet-stream)',
        xml: 'PLCopenXML file (application/xml) - for manual import in Machine Expert',
        both: 'JSON with base64-encoded .project and raw XML',
      },
    },
    supportedModels: Object.keys(M241_MODELS),
    supportedLanguages: ['LD', 'ST', 'FBD'],
    templates: ['motor_start_stop', 'tank_level', 'custom'],
    outputFormats: {
      project: 'Returns .project file for direct use in Machine Expert',
      xml: 'Returns PLCopenXML for manual import (useful for LD when scripted import fails)',
      both: 'Returns both formats in JSON (projectBase64 + xmlContent)',
    },
    requirements: [
      'Machine Expert V1.2 must be installed on the server',
      'Template .project file must exist',
      'Server must be running on Windows',
    ],
    workflow: [
      '1. Send POST request with project configuration',
      '2. Server generates PLCopenXML',
      '3. Server uses Machine Expert scripting to import into template',
      '4. Server returns complete .project file (or XML for manual import)',
      '5. Open the downloaded .project file in Machine Expert',
    ],
    notes: [
      'ST format imports successfully via scripting',
      'LD format may require manual import via Machine Expert GUI: Project > Import PLCopenXML',
      'FBD format typically works via scripting',
    ],
  });
}
