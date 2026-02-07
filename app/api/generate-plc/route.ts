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

// Template paths - match UI template IDs to files in templates/ folder
const TEMPLATE_PATHS: Record<string, string> = {
  'base': path.join(process.cwd(), 'templates', 'TM221CE24T-base.smbp'),
  'with-expansion': path.join(process.cwd(), 'templates', 'TM221-with-expansion-modules.smbp'),
  // Legacy mappings for backward compatibility
  'motor-startstop': path.join(process.cwd(), 'templates', 'TM221CE24T-base.smbp'),
  'tank-level': path.join(process.cwd(), 'templates', 'TM221CE24T-base.smbp'),
  'sequential-lights': path.join(process.cwd(), 'templates', 'TM221CE24T-base.smbp'),
  'redundant-motors': path.join(process.cwd(), 'templates', 'TM221CE24T-base.smbp'),
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

// Hardware ID mapping for TM3 modules
const MODULE_HARDWARE_IDS: Record<string, number> = {
  'TM3AI8/G': 179,
  'TM3AI4/G': 175,
  'TM3TI4/G': 199,
  'TM3TI4D/G': 186,
  'TM3TI8T/G': 200,
  'TM3DI32K': 1,
  'TM3DQ32TK': 3,
  'TM3DI16/G': 6,
  'TM3DQ16R/G': 13,
  'TM3AQ4/G': 183,
  'TM3AQ2/G': 181,
};

// Generate extension module XML for selected modules
function generateExtensionModulesXml(modules: Array<{
  id: string;
  name: string;
  partNumber: string;
  category: string;
  specifications: Record<string, string>;
}>): string {
  if (modules.length === 0) return '<Extensions />';

  let xml = '<Extensions>\n';

  modules.forEach((module, index) => {
    const hardwareId = MODULE_HARDWARE_IDS[module.partNumber] || 0;
    const channels = parseInt(module.specifications['Channels'] || '4');
    const slotNum = index + 1; // Slot 1, 2, 3...

    xml += `        <ModuleExtensionObject>
          <Index>${index}</Index>
          <InputNb>0</InputNb>
          <OutputNb>0</OutputNb>
          <Kind>0</Kind>
          <Reference>${module.partNumber}</Reference>
          <HardwareId>${hardwareId}</HardwareId>\n`;

    // Generate analog inputs/outputs based on category
    if (module.category === 'analog-input' || module.category === 'temperature') {
      xml += `          <AnalogInputs>\n`;
      for (let ch = 0; ch < channels; ch++) {
        xml += `            <AnalogIO>
              <Address>%IW${slotNum}.${ch}</Address>
              <Index>${ch}</Index>
              <Symbol></Symbol>
              <Type><Value>31</Value><Name>Type_NotUsed</Name></Type>
              <Scope><Value>128</Value><Name>Scope_NotUsed</Name></Scope>
            </AnalogIO>\n`;
      }
      xml += `          </AnalogInputs>\n`;

      xml += `          <AnalogInputsStatus>\n`;
      for (let ch = 0; ch < channels; ch++) {
        xml += `            <AnalogIoStatus><Address>%IWS${slotNum}.${ch}</Address><Index>${ch}</Index></AnalogIoStatus>\n`;
      }
      xml += `          </AnalogInputsStatus>\n`;
    } else if (module.category === 'analog-output') {
      xml += `          <AnalogOutputs>\n`;
      for (let ch = 0; ch < channels; ch++) {
        xml += `            <AnalogIO>
              <Address>%QW${slotNum}.${ch}</Address>
              <Index>${ch}</Index>
              <Symbol></Symbol>
              <Type><Value>31</Value><Name>Type_NotUsed</Name></Type>
              <Scope><Value>128</Value><Name>Scope_NotUsed</Name></Scope>
            </AnalogIO>\n`;
      }
      xml += `          </AnalogOutputs>\n`;
    } else if (module.category === 'digital-input') {
      xml += `          <DigitalInputs>\n`;
      for (let ch = 0; ch < channels; ch++) {
        xml += `            <DiscretIO><Address>%I${slotNum}.${ch}</Address><Index>${ch}</Index><Symbol></Symbol></DiscretIO>\n`;
      }
      xml += `          </DigitalInputs>\n`;
    } else if (module.category === 'digital-output' || module.category === 'relay') {
      xml += `          <DigitalOutputs>\n`;
      for (let ch = 0; ch < channels; ch++) {
        xml += `            <DiscretIO><Address>%Q${slotNum}.${ch}</Address><Index>${ch}</Index><Symbol></Symbol></DiscretIO>\n`;
      }
      xml += `          </DigitalOutputs>\n`;
    }

    xml += `          <DIOFunctionalMode>DIOFunctionalModeNormal</DIOFunctionalMode>
          <HoldupTime>10</HoldupTime>
        </ModuleExtensionObject>\n`;
  });

  xml += '      </Extensions>';
  return xml;
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

CRITICAL M221 XML FORMAT RULES (MUST FOLLOW EXACTLY):

1. **Operation Elements** - Use <OperationExpression>, NOT <Descriptor>:
   CORRECT:
   <LadderEntity>
     <ElementType>Operation</ElementType>
     <OperationExpression>%MF100 := 0.0</OperationExpression>
     <Row>0</Row>
     <Column>9</Column>
     <ChosenConnection>Left</ChosenConnection>
   </LadderEntity>

   WRONG (DO NOT USE):
   <LadderEntity>
     <ElementType>Operation</ElementType>
     <Descriptor>%MF100 := 0.0</Descriptor>  <!-- WRONG! -->
   </LadderEntity>

2. **Contacts/Coils** - Use <Descriptor> with <Symbol>:
   <LadderEntity>
     <ElementType>NormalContact</ElementType>
     <Descriptor>%I0.0</Descriptor>
     <Symbol>START_PB</Symbol>
     <Row>0</Row>
     <Column>0</Column>
     <ChosenConnection>Left, Right</ChosenConnection>
   </LadderEntity>

3. **Comparison Elements** - Use <ComparisonExpression> (NOT Descriptor), NO square brackets:
   CORRECT:
   <LadderEntity>
     <ElementType>Comparison</ElementType>
     <ComparisonExpression>%MF102 > 950.0</ComparisonExpression>
     <Row>0</Row>
     <Column>1</Column>
     <ChosenConnection>Left, Right</ChosenConnection>
   </LadderEntity>

   WRONG (DO NOT USE):
   <LadderEntity>
     <ElementType>Comparison</ElementType>
     <Descriptor>[%MF102>950]</Descriptor>  <!-- WRONG! Use ComparisonExpression, no brackets -->
   </LadderEntity>

   IMPORTANT: Comparison elements SPAN 2 COLUMNS. Next element starts at Column 3, not Column 2.
   Operators: =, <>, <, >, <=, >=

4. **Extension Modules** - MUST include if user selects analog module:
   <Extensions>
     <ModuleExtensionObject>
       <Index>0</Index>
       <Reference>TM3AI8/G</Reference>
       <HardwareId>179</HardwareId>
       <AnalogInputs>...</AnalogInputs>
     </ModuleExtensionObject>
   </Extensions>

   If <Extensions /> is empty but user selected analog module, THIS IS AN ERROR!
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
    let expansionModules: Array<{
      id: string;
      name: string;
      partNumber: string;
      category: string;
      specifications: Record<string, string>;
    }> = [];

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
      expansionModules = body.expansionModules || [];
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

    // CRITICAL: Auto-switch to with-expansion template when expansion modules are selected
    let effectiveTemplateId = templateId;
    if (expansionModules.length > 0 && manufacturer.toLowerCase().includes('schneider')) {
      console.log(`Expansion modules selected (${expansionModules.length}), using with-expansion template`);
      effectiveTemplateId = 'with-expansion';
    }

    // Read template if specified
    let templateContent = '';
    if (effectiveTemplateId) {
      templateContent = readTemplateFile(effectiveTemplateId);
      console.log(`Template loaded: ${effectiveTemplateId}, size: ${templateContent.length} bytes`);
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
    console.log('Model:', process.env.CLAUDE_MODEL || 'claude-opus-4-6');

    // Call Claude API
    const model = process.env.CLAUDE_MODEL || 'claude-opus-4-6';
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

        // Inject extension modules if any were selected
        if (expansionModules.length > 0) {
          console.log(`Injecting ${expansionModules.length} extension modules...`);
          const extensionsXml = generateExtensionModulesXml(expansionModules);

          // Replace <Extensions /> or <Extensions></Extensions> with the generated XML
          generatedContent = generatedContent.replace(
            /<Extensions\s*\/>/,
            extensionsXml
          );
          generatedContent = generatedContent.replace(
            /<Extensions>\s*<\/Extensions>/,
            extensionsXml
          );

          console.log('Extension modules injected successfully!');
        }

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
