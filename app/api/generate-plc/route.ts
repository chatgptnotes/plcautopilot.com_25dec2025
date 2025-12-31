import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Skill file paths
const SKILL_FILES: Record<string, string> = {
  'schneider-m221': '.claude/skills/schneider.md',
  'm221-complete': '.claude/skills/M221-COMPLETE-REFERENCE.md',
  'siemens-s7': '.claude/skills/siemens-s7.md',
  'rockwell-ab': '.claude/skills/rockwell-allen-bradley.md',
};

// Template paths
const TEMPLATE_PATHS: Record<string, string> = {
  'motor-startstop': 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp',
  'tank-level': 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp',
  'sequential-lights': 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp',
  'redundant-motors': 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp',
};

function getFileExtension(manufacturer: string): string {
  const mfr = manufacturer.toLowerCase();
  if (mfr.includes('schneider')) return '.smbp';
  if (mfr.includes('siemens')) return '.zap15_1';
  if (mfr.includes('rockwell') || mfr.includes('allen')) return '.ACD';
  if (mfr.includes('mitsubishi')) return '.gx3';
  return '.xml';
}

// Read skill file content
function readSkillFile(skillId: string): string {
  const relativePath = SKILL_FILES[skillId];
  if (!relativePath) return '';

  try {
    const fullPath = path.join(process.cwd(), relativePath);
    return fs.readFileSync(fullPath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read skill file ${skillId}:`, error);
    return '';
  }
}

// Read template file
function readTemplateFile(templateId: string): string {
  const templatePath = TEMPLATE_PATHS[templateId];
  if (!templatePath) return '';

  try {
    return fs.readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read template ${templateId}:`, error);
    return '';
  }
}

// Build system prompt based on manufacturer
function buildSystemPrompt(manufacturer: string, skillContents: string[], templateBased: boolean): string {
  const mfr = manufacturer.toLowerCase();

  let basePrompt = `You are an expert PLC programmer. Generate production-ready PLC programs based on user requirements.

CRITICAL RULES:
1. Always include proper ladder diagram XML AND instruction list (IL) representation
2. Use correct element types for the target platform
3. Include all necessary I/O definitions, symbols, and comments
4. Follow IEC 61131-3 standards
5. Include safety considerations (emergency stops, interlocks)
6. Use %M for internal flags, %Q for physical outputs
7. For redundant/alternating systems, use memory bits to track state
`;

  if (templateBased && mfr.includes('schneider')) {
    basePrompt += `
OUTPUT FORMAT - CRITICAL (TEMPLATE-BASED):
You are generating ONLY the <Rungs> section content for insertion into a template.
Return ONLY the <RungEntity> elements. NO <?xml>, NO <ProjectDescriptor>, NO <HardwareConfiguration>.
Start IMMEDIATELY with <RungEntity> and end with </RungEntity>.

Example output format:
<RungEntity>
  <LadderElements>...</LadderElements>
  <InstructionLines>...</InstructionLines>
  <Name>Rung_Name</Name>
  <MainComment>Description</MainComment>
</RungEntity>
<RungEntity>
  ...
</RungEntity>

NEVER include any text, explanations, or XML declarations. ONLY <RungEntity> elements.
`;
  } else {
    basePrompt += `
OUTPUT FORMAT - CRITICAL:
Return ONLY the raw file content. NO preamble text, NO explanations, NO markdown.
Start IMMEDIATELY with the file content - no "Here is..." or similar text.
For Schneider M221 (.smbp): Start with <?xml version="1.0" encoding="utf-8"?>
For Siemens: Start with the actual SCL/STL code.
For Rockwell: Start with the actual ladder logic.
NEVER include any text before or after the actual program content.
`;
  }

  // Add skill-specific knowledge
  if (skillContents.length > 0) {
    basePrompt += `\n\n=== PLATFORM-SPECIFIC KNOWLEDGE ===\n`;
    skillContents.forEach((content, idx) => {
      if (content) {
        // Truncate very long skill files to fit context
        const truncated = content.length > 15000 ? content.substring(0, 15000) + '\n... (truncated)' : content;
        basePrompt += `\n--- Skill ${idx + 1} ---\n${truncated}\n`;
      }
    });
  }

  return basePrompt;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    let context: string;
    let modelId: string;
    let manufacturer: string;
    let series: string;
    let modelName: string;
    let templateId: string;
    let skillIds: string[];

    // Handle JSON format (new UI)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      context = body.context || body.logic || '';
      modelId = body.modelId || '';
      manufacturer = body.manufacturer || '';
      series = body.series || '';
      modelName = body.modelName || '';
      templateId = body.template || '';
      skillIds = body.skills || [];
    }
    // Handle FormData format (legacy)
    else {
      const formData = await request.formData();
      context = formData.get('logic') as string || '';
      modelId = formData.get('modelId') as string || '';
      manufacturer = formData.get('manufacturer') as string || '';
      series = formData.get('series') as string || '';
      modelName = formData.get('modelName') as string || '';
      templateId = '';
      skillIds = [];
    }

    if (!context || !modelId) {
      return NextResponse.json(
        { error: 'Missing required fields: context and modelId' },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Read skill files
    const skillContents = skillIds.map(id => readSkillFile(id));

    // Read template if specified
    let templateContent = '';
    if (templateId) {
      templateContent = readTemplateFile(templateId);
    }

    const extension = getFileExtension(manufacturer);
    const isSchneider = manufacturer.toLowerCase().includes('schneider');
    const useTemplateBased = isSchneider && templateContent.length > 0;

    // Build prompts
    const systemPrompt = buildSystemPrompt(manufacturer, skillContents, useTemplateBased);

    let userPrompt: string;

    if (useTemplateBased) {
      // Template-based generation for Schneider - only generate Rungs
      userPrompt = `Generate ladder logic rungs for the following requirements:

PLC MODEL: ${manufacturer} ${series} - ${modelName}

USER REQUIREMENTS:
${context}

Generate ONLY the <RungEntity> elements. The rungs will be inserted into an existing template.
Each rung must have:
- <LadderElements> with proper <LadderEntity> elements (NormalContact, NegatedContact, Coil, Line, Timer, Operation, etc.)
- <InstructionLines> with IL code
- <Name> and <MainComment>

Start your response with <RungEntity> and end with </RungEntity>. NO other XML elements.`;
    } else {
      // Full generation for other platforms
      userPrompt = `Generate a complete PLC program for the following:

PLC MODEL: ${manufacturer} ${series} - ${modelName}
FILE FORMAT: ${extension}

USER REQUIREMENTS:
${context}

Generate the complete program file. Output ONLY the file content, no explanations.`;
    }

    console.log('Calling Claude API...');
    console.log('Mode:', useTemplateBased ? 'Template-based (Rungs only)' : 'Full generation');
    console.log('Model:', process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514');

    // Call Claude API
    const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
    const maxTokens = model.includes('haiku') ? 4096 : 16000; // Increased for complex programs with 20+ rungs

    const message = await anthropic.messages.create({
      model: model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseContent = message.content[0];
    if (responseContent.type !== 'text') {
      throw new Error('Unexpected response format from Claude');
    }

    let generatedContent = responseContent.text.trim();

    // Clean up response - remove code blocks
    if (generatedContent.startsWith('```xml')) {
      generatedContent = generatedContent.slice(6);
    } else if (generatedContent.startsWith('```')) {
      generatedContent = generatedContent.slice(3);
    }
    if (generatedContent.endsWith('```')) {
      generatedContent = generatedContent.slice(0, -3);
    }
    generatedContent = generatedContent.trim();

    // For template-based Schneider generation, inject rungs into template
    if (useTemplateBased) {
      console.log('Injecting generated rungs into template...');

      // Extract just the RungEntity elements
      let rungs = generatedContent;
      const rungStart = rungs.indexOf('<RungEntity');
      if (rungStart > 0) {
        rungs = rungs.substring(rungStart);
      }
      const rungEnd = rungs.lastIndexOf('</RungEntity>');
      if (rungEnd > 0) {
        rungs = rungs.substring(0, rungEnd + '</RungEntity>'.length);
      }

      // Find and replace the <Rungs>...</Rungs> section in template
      const rungsStartTag = templateContent.indexOf('<Rungs>');
      const rungsEndTag = templateContent.indexOf('</Rungs>');

      if (rungsStartTag > 0 && rungsEndTag > rungsStartTag) {
        generatedContent = templateContent.substring(0, rungsStartTag + '<Rungs>'.length) +
          '\n          ' + rungs + '\n        ' +
          templateContent.substring(rungsEndTag);

        // Update project name
        const projectName = modelName.replace(/[^a-zA-Z0-9]/g, '_') || 'Generated_Program';
        generatedContent = generatedContent.replace(
          /<Name>.*?<\/Name>/,
          `<Name>${projectName}</Name>`
        );

        console.log('Template injection successful!');
      } else {
        console.warn('Could not find <Rungs> section in template, using raw output');
      }
    } else {
      // Non-template: clean up XML
      if (extension === '.smbp' || extension === '.xml') {
        const xmlStart = generatedContent.indexOf('<?xml');
        if (xmlStart > 0) {
          generatedContent = generatedContent.substring(xmlStart);
        }
        const xmlEnd = generatedContent.lastIndexOf('</ProjectDescriptor>');
        if (xmlEnd > 0) {
          generatedContent = generatedContent.substring(0, xmlEnd + '</ProjectDescriptor>'.length);
        }
      }
    }
    generatedContent = generatedContent.trim();

    // Generate filename
    const projectName = modelName.replace(/[^a-zA-Z0-9]/g, '_') || 'Generated_Program';
    const filename = `${projectName}_AI_Generated${extension}`;

    console.log('Program generated successfully!');
    console.log('Filename:', filename);
    console.log('Content length:', generatedContent.length);

    return NextResponse.json({
      content: generatedContent,
      filename: filename,
      extension: extension,
      model: modelName,
      manufacturer: manufacturer,
      aiGenerated: true,
      tokensUsed: message.usage?.output_tokens || 0,
    });

  } catch (error) {
    console.error('Error generating PLC program:', error);

    // Return more detailed error info
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to generate program',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
