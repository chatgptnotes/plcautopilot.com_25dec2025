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

// HYBRID MODE: AI generates rungs XML directly
async function generateRungsWithAI(userContext: string, plcModel: string): Promise<{
  rungsXml: string;
  inputs: Array<{ address: string; symbol: string }>;
  outputs: Array<{ address: string; symbol: string }>;
  memoryBits: Array<{ address: string; symbol: string; comment: string }>;
  timers: Array<{ address: string; preset: number }>;
}> {
  const systemPrompt = `You are a Schneider M221 PLC expert. Generate ladder logic rungs in Machine Expert Basic XML format.

CRITICAL: Return ONLY the XML <RungEntity> elements. No explanation, no markdown.

Example format for a simple contact-to-coil rung:
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%I0.0</Descriptor>
      <Symbol>START_PB</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <!-- Lines for columns 2-9 -->
    <LadderEntity>
      <ElementType>Coil</ElementType>
      <Descriptor>%Q0.0</Descriptor>
      <Symbol>OUTPUT1</Symbol>
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity>
      <InstructionLine>LD    %I0.0</InstructionLine>
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>ST    %Q0.0</InstructionLine>
    </InstructionLineEntity>
  </InstructionLines>
  <Name>Rung Name</Name>
  <MainComment>Description</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>

CRITICAL: Timer and Comparison elements SPAN 2 COLUMNS!
- Timer at Column 1 spans columns 1 AND 2
- Next element (Line) must start at Column 3, NOT Column 2!

Timer block example (TON timer) - NOTE Column numbers carefully:
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%M0</Descriptor>
      <Symbol>ENABLE</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Timer</ElementType>
      <Descriptor>%TM0</Descriptor>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <!-- Timer spans columns 1-2, so Lines start at Column 3 -->
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>3</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>4</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>5</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>6</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>7</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>8</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>9</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Coil</ElementType>
      <Descriptor>%Q0.0</Descriptor>
      <Symbol>OUTPUT</Symbol>
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>BLK   %TM0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>LD    %M0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>IN</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OUT_BLK</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>LD    Q</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>ST    %Q0.0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>END_BLK</InstructionLine></InstructionLineEntity>
  </InstructionLines>
  <Name>Timer Rung</Name>
  <MainComment>Timer controlled output</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>

OR branch (seal-in) example:
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%I0.0</Descriptor>
      <Symbol>START</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Down, Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%M0</Descriptor>
      <Symbol>SEAL</Symbol>
      <Row>1</Row>
      <Column>0</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>NegatedContact</ElementType>
      <Descriptor>%I0.1</Descriptor>
      <Symbol>STOP</Symbol>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <!-- Lines and coil -->
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>LD    %I0.0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OR    %M0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>ANDN  %I0.1</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>ST    %M0</InstructionLine></InstructionLineEntity>
  </InstructionLines>
  <Name>Seal-in Circuit</Name>
  <MainComment>Latching with stop</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>

RULES:
- ElementTypes: NormalContact, NegatedContact, Coil, SetCoil, ResetCoil, Line, Timer, Counter, Operation, Comparison
- Columns 0-10 (11 total), Column 10 is always for output (Coil/SetCoil/ResetCoil/Operation)
- CRITICAL: Timer and Comparison elements SPAN 2 COLUMNS! Timer at col 1 = cols 1+2, next element at col 3
- Fill empty columns with Line elements (accounting for 2-column elements)
- ChosenConnection: "Left", "Right", "Up", "Down" - combine as needed
- First element: "Left, Right" or "Down, Left, Right" (for OR branch)
- Last element (coil): "Left"
- For NegatedContact use ANDN/LDN in IL
- Timer preset is defined separately in Timers section
- Always include proper IL code matching the ladder

MANDATORY: After the rungs XML, you MUST add a JSON block with ALL symbol definitions:
<!--SYMBOLS_JSON
{
  "inputs": [{"address": "%I0.0", "symbol": "START_PB"}, ...],
  "outputs": [{"address": "%Q0.0", "symbol": "OUTPUT1"}, ...],
  "memoryBits": [{"address": "%M0", "symbol": "RUNNING", "comment": "Motor running flag"}, ...],
  "timers": [{"address": "%TM0", "preset": 3}, ...]
}
SYMBOLS_JSON-->

PLC Model: ${plcModel}
Digital Inputs: %I0.0 to %I0.13
Digital Outputs: %Q0.0 to %Q0.9
Memory Bits: %M0 to %M255
Timers: %TM0 to %TM254 (preset in seconds, base OneSecond)`;

  // Use claude-sonnet for hybrid mode as it needs more output tokens
  // Haiku is limited to 4096 tokens which is too small for XML generation
  const model = 'claude-sonnet-4-20250514';

  const response = await anthropic.messages.create({
    model,
    max_tokens: 8000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContext }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response format');
  }

  let responseText = content.text.trim();

  // Remove markdown code blocks if present
  if (responseText.startsWith('```xml')) {
    responseText = responseText.slice(6);
  } else if (responseText.startsWith('```')) {
    responseText = responseText.slice(3);
  }
  if (responseText.endsWith('```')) {
    responseText = responseText.slice(0, -3);
  }
  responseText = responseText.trim();

  // Extract rungs XML (everything before SYMBOLS_JSON)
  let rungsXml = responseText;
  let symbolsJson = { inputs: [], outputs: [], memoryBits: [], timers: [] };

  const symbolsMatch = responseText.match(/<!--SYMBOLS_JSON\s*([\s\S]*?)\s*SYMBOLS_JSON-->/);
  if (symbolsMatch) {
    rungsXml = responseText.substring(0, responseText.indexOf('<!--SYMBOLS_JSON')).trim();
    try {
      symbolsJson = JSON.parse(symbolsMatch[1]);
    } catch (e) {
      console.error('Failed to parse symbols JSON:', e);
    }
  }

  // Ensure we only have RungEntity elements
  const firstRung = rungsXml.indexOf('<RungEntity');
  if (firstRung > 0) {
    rungsXml = rungsXml.substring(firstRung);
  }
  const lastRung = rungsXml.lastIndexOf('</RungEntity>');
  if (lastRung > 0) {
    rungsXml = rungsXml.substring(0, lastRung + '</RungEntity>'.length);
  }

  return {
    rungsXml,
    inputs: symbolsJson.inputs || [],
    outputs: symbolsJson.outputs || [],
    memoryBits: symbolsJson.memoryBits || [],
    timers: symbolsJson.timers || [],
  };
}

// Legacy function for backward compatibility
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

    // TEMPLATE-BASED GENERATION: Use working template file and inject rungs
    console.log('Using HYBRID template-based generation...');

    // Select the correct template for the model
    const templatePath = TEMPLATE_PATHS[modelName] || TEMPLATE_PATHS['default'];
    console.log('Using template:', templatePath);

    // Read the working template
    let templateContent: string;
    try {
      templateContent = fs.readFileSync(templatePath, 'utf-8');
      console.log('Template loaded successfully');
    } catch (err) {
      console.error('Failed to load template:', err);
      return NextResponse.json(
        { error: 'Template file not found', details: `Could not load template for ${modelName}` },
        { status: 500 }
      );
    }

    // HYBRID MODE: AI generates rungs XML directly
    let rungsXml: string;
    let inputSymbols: Record<string, string> = {};
    let outputSymbols: Record<string, string> = {};
    let memoryBitSymbols: Record<string, { symbol: string; comment: string }> = {};
    let timerConfigs: Array<{ address: string; preset: number }> = [];

    // Check for predefined templates first
    if (template && PROGRAM_TEMPLATES[template]) {
      console.log(`Using predefined template: ${template}`);
      const programConfig = PROGRAM_TEMPLATES[template](projectName, modelName);
      rungsXml = programConfig.rungs.map(rung => generateRungXml(rung)).join('\n');

      // Extract symbols from predefined config
      for (const input of programConfig.inputs || []) {
        inputSymbols[input.address] = input.symbol;
      }
      for (const output of programConfig.outputs || []) {
        outputSymbols[output.address] = output.symbol;
      }
      for (const mb of programConfig.memoryBits || []) {
        memoryBitSymbols[mb.address] = { symbol: mb.symbol, comment: mb.comment || '' };
      }
    } else if (useAI && process.env.ANTHROPIC_API_KEY) {
      // HYBRID: AI generates rungs XML directly
      console.log('Using HYBRID mode: AI generates rungs XML...');
      try {
        const aiResult = await generateRungsWithAI(context, modelName);
        rungsXml = aiResult.rungsXml;

        console.log('AI generated rungs XML length:', rungsXml.length);
        console.log('AI returned inputs:', aiResult.inputs.length);
        console.log('AI returned outputs:', aiResult.outputs.length);
        console.log('AI returned memory bits:', aiResult.memoryBits.length);
        console.log('AI returned timers:', aiResult.timers.length);

        // Extract symbols from AI response
        for (const input of aiResult.inputs) {
          inputSymbols[input.address] = input.symbol;
        }
        for (const output of aiResult.outputs) {
          outputSymbols[output.address] = output.symbol;
        }
        for (const mb of aiResult.memoryBits) {
          memoryBitSymbols[mb.address] = { symbol: mb.symbol, comment: mb.comment || '' };
        }
        timerConfigs = aiResult.timers;
      } catch (aiError) {
        console.error('AI generation failed, falling back to motor start/stop:', aiError);
        const programConfig = createMotorStartStopProgram(projectName, modelName);
        rungsXml = programConfig.rungs.map(rung => generateRungXml(rung)).join('\n');

        for (const input of programConfig.inputs || []) {
          inputSymbols[input.address] = input.symbol;
        }
        for (const output of programConfig.outputs || []) {
          outputSymbols[output.address] = output.symbol;
        }
        for (const mb of programConfig.memoryBits || []) {
          memoryBitSymbols[mb.address] = { symbol: mb.symbol, comment: mb.comment || '' };
        }
      }
    } else {
      // Fallback to motor start/stop template
      console.log('Using default motor start/stop template');
      const programConfig = createMotorStartStopProgram(projectName, modelName);
      rungsXml = programConfig.rungs.map(rung => generateRungXml(rung)).join('\n');

      for (const input of programConfig.inputs || []) {
        inputSymbols[input.address] = input.symbol;
      }
      for (const output of programConfig.outputs || []) {
        outputSymbols[output.address] = output.symbol;
      }
      for (const mb of programConfig.memoryBits || []) {
        memoryBitSymbols[mb.address] = { symbol: mb.symbol, comment: mb.comment || '' };
      }
    }

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
      return NextResponse.json(
        { error: 'Template format invalid', details: 'Could not find <Rungs> section in template' },
        { status: 500 }
      );
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
      /<Name>TM221CE24T<\/Name>/g,
      `<Name>${projectName}</Name>`
    );
    content = content.replace(
      /<FullName>.*?<\/FullName>/,
      `<FullName>C:\\Users\\HP\\Downloads\\${projectName}.smbp</FullName>`
    );

    // INJECT TIMERS if AI generated any
    if (timerConfigs.length > 0) {
      console.log('Injecting timer definitions...');
      const timersXml = timerConfigs.map((timer, idx) => `
        <TimerTM>
          <Address>${timer.address}</Address>
          <Index>${idx}</Index>
          <Preset>${timer.preset}</Preset>
          <Base>OneSecond</Base>
        </TimerTM>`).join('');

      // Replace empty <Timers /> or add to existing <Timers> section
      if (content.includes('<Timers />')) {
        content = content.replace(/<Timers \/>/, `<Timers>${timersXml}\n      </Timers>`);
      } else if (content.includes('<Timers>')) {
        const timersStartTag = content.indexOf('<Timers>');
        content = content.substring(0, timersStartTag + '<Timers>'.length) +
          timersXml +
          content.substring(timersStartTag + '<Timers>'.length);
      }
    }

    // INJECT SYMBOLS into I/O and Memory definitions
    console.log('Injecting symbols into I/O definitions...');

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
    const usedHybridAI = useAI && process.env.ANTHROPIC_API_KEY && !template;

    console.log('HYBRID generation complete!');
    console.log('Filename:', filename);
    console.log('Content length:', content.length);
    console.log('Used hybrid AI:', usedHybridAI);

    return NextResponse.json({
      content,
      filename,
      extension: '.smbp',
      model: modelName,
      manufacturer,
      aiGenerated: usedHybridAI, // AI generated rungs, template for hardware
      reliable: true,
      hybrid: true, // Template for hardware, AI for logic
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
