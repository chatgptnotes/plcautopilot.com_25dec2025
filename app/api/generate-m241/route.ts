/**
 * M241 PLCopenXML Generator API
 *
 * Generates PLCopenXML files for Schneider Electric M241 controllers.
 * Output can be imported into Machine Expert via Project > Import PLCopenXML...
 *
 * Supports both Ladder Diagram (LD) and Structured Text (ST) languages.
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  generateM241Program,
  createM241MotorStartStop,
  createM241TankLevel,
  M241_MODELS,
} from '@/lib/m241-plcopen-adapter';
import type { M241ProgramConfig, LanguageType } from '@/lib/plcopen-types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// Request/Response Types
// ============================================================================

interface GenerateM241Request {
  projectName: string;
  plcModel: string;
  language: LanguageType;
  logicDescription: string;
  template?: 'motor_start_stop' | 'tank_level' | 'custom';
  templateParams?: {
    tankHeight?: number;
    lowLevel?: number;
    highLevel?: number;
  };
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GenerateM241Request;
    const { projectName, plcModel, language, logicDescription, template, templateParams } = body;

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
    if (!['LD', 'ST'].includes(language)) {
      return NextResponse.json(
        { error: 'Language must be LD or ST' },
        { status: 400 }
      );
    }

    let result;

    // Use template if specified
    if (template === 'motor_start_stop') {
      result = createM241MotorStartStop(projectName, plcModel, language);
    } else if (template === 'tank_level') {
      result = createM241TankLevel(
        projectName,
        plcModel,
        language,
        templateParams?.tankHeight,
        templateParams?.lowLevel,
        templateParams?.highLevel
      );
    } else {
      // Use AI to generate custom logic
      const config = await generateConfigFromAI(
        projectName,
        plcModel,
        language,
        logicDescription
      );

      if (!config) {
        return NextResponse.json(
          { error: 'Failed to generate program configuration from description' },
          { status: 500 }
        );
      }

      result = generateM241Program(config);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Return XML with proper content type for download
    const filename = `${projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${plcModel}.xml`;

    return new NextResponse(result.xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-PLC-Model': plcModel,
        'X-Language': language,
      },
    });

  } catch (error) {
    console.error('M241 generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// AI-Powered Configuration Generator
// ============================================================================

async function generateConfigFromAI(
  projectName: string,
  plcModel: string,
  language: LanguageType,
  logicDescription: string
): Promise<M241ProgramConfig | null> {
  const modelSpec = M241_MODELS[plcModel];

  const systemPrompt = `You are an expert M241 PLC programmer. Generate a JSON configuration for a ${language === 'ST' ? 'Structured Text' : 'Ladder Diagram'} program.

PLC Model: ${plcModel}
- Digital Inputs: ${modelSpec.digitalInputs} (%IX0.0 to %IX0.${modelSpec.digitalInputs - 1})
- Digital Outputs: ${modelSpec.digitalOutputs} (%QX0.0 to %QX0.${modelSpec.digitalOutputs - 1})
- Analog Inputs: ${modelSpec.analogInputs} (%IW0.0 to %IW0.${modelSpec.analogInputs - 1})
- Ethernet: ${modelSpec.hasEthernet ? 'Yes' : 'No'}
- CANopen: ${modelSpec.hasCANopen ? 'Yes' : 'No'}

IMPORTANT: Respond ONLY with valid JSON matching this schema:
{
  "projectName": "string",
  "plcModel": "${plcModel}",
  "language": "${language}",
  "io": {
    "digitalInputs": [{"address": "%IX0.n", "name": "NAME", "comment": "description"}],
    "digitalOutputs": [{"address": "%QX0.n", "name": "NAME", "comment": "description"}],
    "analogInputs": [{"address": "%IW0.n", "name": "NAME", "type": "4_20mA|0_10V|0_20mA", "min": 0, "max": 10000, "comment": "description"}],
    "analogOutputs": []
  },
  "timers": [{"name": "TMR_NAME", "type": "TON|TOF|TP", "preset": "T#1s"}],
  "counters": [{"name": "CTR_NAME", "type": "CTU|CTD|CTUD", "preset": 10}],
  "memoryVars": [{"name": "VAR_NAME", "type": "BOOL|INT|REAL", "documentation": "description"}]
}

Rules:
1. Use UPPERCASE for variable names with underscores (e.g., MOTOR_RUN, LEVEL_HIGH)
2. Include appropriate safety interlocks (E-stop, overloads)
3. Add timers for anti-chatter or delays where appropriate
4. Use %IX for digital inputs, %QX for digital outputs
5. Use %IW for analog inputs, %QW for analog outputs`;

  const userPrompt = `Generate a ${language} program configuration for: ${logicDescription}

Project name: ${projectName}`;

  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      console.error('Unexpected response type:', content.type);
      return null;
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const config = JSON.parse(jsonText) as M241ProgramConfig;

    // Validate and clean up config
    config.projectName = projectName;
    config.plcModel = plcModel;
    config.language = language;

    return config;

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
    name: 'M241 PLCopenXML Generator',
    description: 'Generates PLCopenXML files for Schneider Electric M241 controllers',
    usage: {
      method: 'POST',
      contentType: 'application/json',
      body: {
        projectName: 'string (required)',
        plcModel: 'string (required): TM241CE24T, TM241CE40T, TM241CEC24T, TM241CEC40T',
        language: 'string (required): LD or ST',
        logicDescription: 'string (required): Natural language description of desired logic',
        template: 'string (optional): motor_start_stop, tank_level, or custom',
        templateParams: 'object (optional): Parameters for template',
      },
    },
    supportedModels: Object.keys(M241_MODELS),
    supportedLanguages: ['LD', 'ST'],
    templates: ['motor_start_stop', 'tank_level', 'custom'],
    importInstructions: [
      '1. Download the generated .xml file',
      '2. Open Machine Expert',
      '3. Go to Project > Import PLCopenXML...',
      '4. Select the downloaded .xml file',
      '5. The program will be imported into your project',
      '6. Compile and download to M241 controller',
    ],
  });
}
