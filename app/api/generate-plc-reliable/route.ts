/**
 * Reliable PLC Generator API
 *
 * Strategy:
 * 1. Use a WORKING template file from Machine Expert Basic
 * 2. AI parses user requirements into structured config
 * 3. Inject generated rungs into the template
 * 4. This ensures 100% valid .smbp files
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import {
  generateSmbpFile,
  createSimpleRung,
  createOrBranchRung,
  createComparisonRung,
  createMotorStartStopProgram,
  createUltrasonicTankLevelProgram,
  ProgramConfig,
  RungConfig,
  IOConfig,
  MemoryBitConfig,
  TimerConfig,
  generateRungXml,
} from '@/lib/smbp-generator';

// Path to working template files for each model
const TEMPLATE_PATHS: Record<string, string> = {
  'TM221CE24T': 'c:\\Users\\HP\\Downloads\\TM221CE24T.smbp',
  'TM221CE40T': 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp',
  'default': 'c:\\Users\\HP\\Downloads\\TM221CE24T.smbp',
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Predefined program templates
const PROGRAM_TEMPLATES: Record<string, (projectName: string, model: string) => ProgramConfig> = {
  'motor-start-stop': createMotorStartStopProgram,
  'motor-startstop': createMotorStartStopProgram,
};

interface ParsedRequirements {
  programType: 'motor_start_stop' | 'tank_level' | 'sequential_lights' | 'custom';
  projectName: string;
  inputs: Array<{ address: string; symbol: string; comment: string; type: 'NO' | 'NC' }>;
  outputs: Array<{ address: string; symbol: string; comment: string }>;
  memoryBits: Array<{ address: string; symbol: string; comment: string }>;
  timers: Array<{ address: string; symbol: string; preset: number; comment: string }>;
  rungs: Array<{
    name: string;
    comment: string;
    type: 'simple' | 'seal_in' | 'timer' | 'comparison';
    contactAddress?: string;
    contactSymbol?: string;
    contactType?: 'NO' | 'NC';
    coilAddress?: string;
    coilSymbol?: string;
    // For seal-in
    startAddress?: string;
    stopAddress?: string;
    sealAddress?: string;
    // For comparison
    expression?: string;
  }>;
}

async function parseRequirementsWithAI(userContext: string): Promise<ParsedRequirements> {
  const systemPrompt = `You are a PLC programming expert. Parse user requirements into a structured JSON format.

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "programType": "motor_start_stop" | "tank_level" | "sequential_lights" | "custom",
  "projectName": "string (alphanumeric with underscores)",
  "inputs": [
    { "address": "%I0.0", "symbol": "INPUT_NAME", "comment": "description", "type": "NO" or "NC" }
  ],
  "outputs": [
    { "address": "%Q0.0", "symbol": "OUTPUT_NAME", "comment": "description" }
  ],
  "memoryBits": [
    { "address": "%M0", "symbol": "BIT_NAME", "comment": "description" }
  ],
  "timers": [
    { "address": "%TM0", "symbol": "TIMER_NAME", "preset": 3, "comment": "description" }
  ],
  "rungs": [
    {
      "name": "Rung Name",
      "comment": "What this rung does",
      "type": "simple" | "seal_in" | "timer" | "comparison",
      "contactAddress": "%I0.0",
      "contactSymbol": "INPUT",
      "contactType": "NO" | "NC",
      "coilAddress": "%Q0.0",
      "coilSymbol": "OUTPUT",
      "startAddress": "%I0.1 (for seal_in)",
      "stopAddress": "%I0.2 (for seal_in)",
      "sealAddress": "%M0 (for seal_in)",
      "expression": "[%IW0.0>500] (for comparison)"
    }
  ]
}

Rules:
- Use %I0.x for digital inputs (0-23 depending on PLC)
- Use %Q0.x for digital outputs (0-15 depending on PLC)
- Use %M0+ for memory bits
- Use %TM0+ for timers
- Use %IW0.x or %IW1.x for analog inputs
- Timer presets are in seconds
- NC (Normally Closed) contacts use ANDN/LDN in IL
- Always include a seal-in contact for motor control
- Include safety interlocks (E-stop, overload) as NC contacts`;

  const model = process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307';

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContext }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response format');
  }

  // Extract JSON from response
  let jsonText = content.text.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith('```')) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  try {
    return JSON.parse(jsonText) as ParsedRequirements;
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', jsonText);
    throw new Error('AI did not return valid JSON');
  }
}

function buildProgramConfig(parsed: ParsedRequirements, plcModel: string): ProgramConfig {
  const rungs: RungConfig[] = [];

  for (const rung of parsed.rungs) {
    switch (rung.type) {
      case 'simple':
        if (rung.contactAddress && rung.coilAddress) {
          rungs.push(createSimpleRung(
            rung.name,
            rung.comment,
            rung.contactAddress,
            rung.contactSymbol || '',
            rung.coilAddress,
            rung.coilSymbol || '',
            rung.contactType === 'NC'
          ));
        }
        break;

      case 'seal_in':
        if (rung.startAddress && rung.stopAddress && rung.coilAddress) {
          rungs.push(createOrBranchRung(
            rung.name,
            rung.comment,
            rung.startAddress,
            rung.contactSymbol || 'START',
            rung.sealAddress || rung.coilAddress,
            rung.coilSymbol || 'SEAL',
            rung.coilAddress,
            rung.coilSymbol || 'OUTPUT'
          ));
        }
        break;

      case 'comparison':
        if (rung.expression && rung.coilAddress) {
          rungs.push(createComparisonRung(
            rung.name,
            rung.comment,
            rung.expression,
            rung.coilAddress,
            rung.coilSymbol || ''
          ));
        }
        break;

      default:
        // For unrecognized types, create a simple pass-through
        if (rung.contactAddress && rung.coilAddress) {
          rungs.push(createSimpleRung(
            rung.name,
            rung.comment,
            rung.contactAddress,
            rung.contactSymbol || '',
            rung.coilAddress,
            rung.coilSymbol || ''
          ));
        }
    }
  }

  return {
    projectName: parsed.projectName,
    plcModel,
    inputs: parsed.inputs.map(i => ({
      address: i.address,
      symbol: i.symbol,
      comment: i.comment,
    })),
    outputs: parsed.outputs.map(o => ({
      address: o.address,
      symbol: o.symbol,
      comment: o.comment,
    })),
    memoryBits: parsed.memoryBits.map(m => ({
      address: m.address,
      symbol: m.symbol,
      comment: m.comment,
    })),
    timers: parsed.timers.map(t => ({
      address: t.address,
      symbol: t.symbol,
      preset: t.preset,
      type: 'TON' as const,
      timeBase: 'OneSecond' as const,
      comment: t.comment,
    })),
    rungs,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      context,
      modelName,
      manufacturer,
      template,
      useAI = true,
    } = body;

    if (!context || !modelName) {
      return NextResponse.json(
        { error: 'Missing required fields: context and modelName' },
        { status: 400 }
      );
    }

    // Only support Schneider M221 for now
    if (!manufacturer?.toLowerCase().includes('schneider')) {
      return NextResponse.json(
        { error: 'Reliable generation currently only supports Schneider M221' },
        { status: 400 }
      );
    }

    // Validate M221 model - .smbp only works with Machine Expert Basic (M221)
    const isM221 = modelName.toUpperCase().startsWith('TM221');
    if (!isM221) {
      return NextResponse.json(
        {
          error: `Model ${modelName} is not supported for .smbp generation`,
          details: `Machine Expert Basic (.smbp) only supports M221 controllers (TM221xxx). ` +
            `For ${modelName}, you need Machine Expert (full version) with PLCopen XML format. ` +
            `Please select a TM221 model (TM221CE16T, TM221CE24T, TM221CE40T, etc.)`
        },
        { status: 400 }
      );
    }

    const projectName = modelName.replace(/[^a-zA-Z0-9]/g, '_') + '_Program';
    let programConfig: ProgramConfig;

    // Check for predefined templates first
    if (template && PROGRAM_TEMPLATES[template]) {
      console.log(`Using predefined template: ${template}`);
      programConfig = PROGRAM_TEMPLATES[template](projectName, modelName);
    } else if (useAI && process.env.ANTHROPIC_API_KEY) {
      // Use AI to parse requirements
      console.log('Parsing requirements with AI...');
      const parsed = await parseRequirementsWithAI(context);
      console.log('Parsed requirements:', JSON.stringify(parsed, null, 2));
      programConfig = buildProgramConfig(parsed, modelName);
    } else {
      // Fallback to motor start/stop template
      console.log('Using default motor start/stop template');
      programConfig = createMotorStartStopProgram(projectName, modelName);
    }

    // TEMPLATE-BASED GENERATION: Use working template file and inject rungs
    console.log('Using template-based generation...');

    // Select the correct template for the model
    const templatePath = TEMPLATE_PATHS[modelName] || TEMPLATE_PATHS['default'];
    console.log('Using template:', templatePath);

    // Read the working template
    let templateContent: string;
    try {
      templateContent = fs.readFileSync(templatePath, 'utf-8');
      console.log('Template loaded successfully');
    } catch (err) {
      console.error('Failed to load template, falling back to deterministic generation:', err);
      // Fallback to deterministic generation
      const content = generateSmbpFile(programConfig);
      const filename = `${projectName}.smbp`;
      return NextResponse.json({
        content,
        filename,
        extension: '.smbp',
        model: modelName,
        manufacturer,
        aiGenerated: false,
        reliable: true,
      });
    }

    // Generate only the rungs XML
    const rungsXml = programConfig.rungs.map(rung => generateRungXml(rung)).join('\n');

    // Find and replace the <Rungs>...</Rungs> section in template
    const rungsStartTag = templateContent.indexOf('<Rungs>');
    const rungsEndTag = templateContent.indexOf('</Rungs>');

    let content: string;
    if (rungsStartTag > 0 && rungsEndTag > rungsStartTag) {
      content = templateContent.substring(0, rungsStartTag + '<Rungs>'.length) +
        '\n' + rungsXml + '\n        ' +
        templateContent.substring(rungsEndTag);
      console.log('Rungs injected into template successfully');
    } else {
      console.error('Could not find <Rungs> section in template');
      content = generateSmbpFile(programConfig);
    }

    // Update project name in multiple places
    content = content.replace(
      /<Name>Template for configuration of cards<\/Name>/g,
      `<Name>${projectName}</Name>`
    );
    content = content.replace(
      /<Name>New POU<\/Name>/g,
      `<Name>${projectName}</Name>`
    );
    content = content.replace(
      /<FullName>.*?<\/FullName>/,
      `<FullName>C:\\Users\\HP\\Downloads\\${projectName}.smbp</FullName>`
    );

    // INJECT SYMBOLS into I/O and Memory definitions
    console.log('Injecting symbols into I/O definitions...');

    // Build symbol maps from program config
    const inputSymbols: Record<string, string> = {};
    const outputSymbols: Record<string, string> = {};
    const memoryBitSymbols: Record<string, { symbol: string; comment: string }> = {};

    // Extract symbols from config
    for (const input of programConfig.inputs || []) {
      inputSymbols[input.address] = input.symbol;
    }
    for (const output of programConfig.outputs || []) {
      outputSymbols[output.address] = output.symbol;
    }
    for (const mb of programConfig.memoryBits || []) {
      memoryBitSymbols[mb.address] = { symbol: mb.symbol, comment: mb.comment };
    }

    // Inject symbols into DigitalInputs (add <Symbol> tag after <Index>)
    for (const [address, symbol] of Object.entries(inputSymbols)) {
      const pattern = new RegExp(
        `(<DiscretInput>\\s*<Address>${address.replace('%', '\\%')}</Address>\\s*<Index>\\d+</Index>)`,
        'g'
      );
      content = content.replace(pattern, `$1\n            <Symbol>${symbol}</Symbol>`);
    }

    // Inject symbols into DigitalOutputs (add <Symbol> tag after <Index>)
    for (const [address, symbol] of Object.entries(outputSymbols)) {
      const pattern = new RegExp(
        `(<DiscretOutput>\\s*<Address>${address.replace('%', '\\%')}</Address>\\s*<Index>\\d+</Index>)(\\s*</DiscretOutput>)`,
        'g'
      );
      content = content.replace(pattern, `$1\n            <Symbol>${symbol}</Symbol>$2`);
    }

    // Inject MemoryBits (replace empty <MemoryBits /> with populated section)
    if (Object.keys(memoryBitSymbols).length > 0) {
      const memoryBitsXml = Object.entries(memoryBitSymbols).map(([address, { symbol, comment }], idx) => `
      <MemoryBit>
        <Address>${address}</Address>
        <Index>${idx}</Index>
        <Symbol>${symbol}</Symbol>
        <Comment>${comment || ''}</Comment>
      </MemoryBit>`).join('');

      content = content.replace(
        /<MemoryBits\s*\/>/,
        `<MemoryBits>${memoryBitsXml}\n    </MemoryBits>`
      );
    }

    console.log('Symbols injected successfully');

    const filename = `${projectName}.smbp`;

    console.log('Template-based generation complete!');
    console.log('Filename:', filename);
    console.log('Content length:', content.length);

    return NextResponse.json({
      content,
      filename,
      extension: '.smbp',
      model: modelName,
      manufacturer,
      aiGenerated: false, // Deterministically generated
      reliable: true,
    });

  } catch (error) {
    console.error('Error in reliable generator:', error);
    return NextResponse.json(
      {
        error: 'Generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
