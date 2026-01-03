/**
 * Claude API Integration for M221 PLC Program Generation
 *
 * HYBRID APPROACH:
 * - Claude AI analyzes requirements and returns pattern-based structure
 * - Template engine (smbp-templates.ts) generates valid XML
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================
// AI OUTPUT TYPES (Pattern-based)
// ============================================================

export interface AIPatternOutput {
  projectName: string;
  description: string;
  patterns: PatternDefinition[];
  inputs: IODefinition[];
  outputs: IODefinition[];
  memoryBits: IODefinition[];
  usePOUs?: boolean;  // Whether to organize into multiple POUs
}

// POU Categories for organizing code by function type
export type POUCategory =
  | 'system_init'       // System startup, cold/warm resets
  | 'io_mapping'        // Raw I/O reads and writes
  | 'auto_operation'    // Automatic control logic
  | 'manual_operation'  // Manual/HMI overrides
  | 'alarms_faults'     // Alarm detection and handling
  | 'custom';           // User-defined

export interface PatternDefinition {
  type: 'motorStartStop' | 'simpleContact' | 'compareBlock' | 'hysteresis' | 'outputCopy' | 'timer' | 'counter' | 'branch';
  params: Record<string, string | number | boolean>;
  rungName: string;
  rungComment: string;
  pouCategory?: POUCategory;  // Which POU this pattern belongs to
}

export interface IODefinition {
  address: string;
  symbol: string;
  comment: string;
}

// ============================================================
// SYSTEM PROMPT - Pattern-based
// ============================================================

const SYSTEM_PROMPT = `You are an expert Schneider Electric M221 PLC programmer. You analyze control requirements and output a structured JSON that specifies which PATTERNS to use.

AVAILABLE PATTERNS:

1. motorStartStop - Start/Stop with seal-in latch
   params: { startInput, startSymbol, stopInput, stopSymbol, estopInput?, estopSymbol?, output, outputSymbol }
   Use for: Motor control, pump control, any latching ON/OFF

2. simpleContact - Single contact to output
   params: { input, inputSymbol, output, outputSymbol, negated? }
   Use for: Direct mapping, indicator lights, simple logic

3. compareBlock - Analog comparison
   params: { analogInput, operator, value, output, outputSymbol }
   operators: ">", "<", ">=", "<=", "=", "<>"
   Use for: Level control, pressure control, temperature limits

4. hysteresis - Latching control with high/low thresholds
   params: { lowFlag, lowSymbol, highFlag, highSymbol, estopInput?, estopSymbol?, output, outputSymbol }
   Use for: Tank level, pressure band control, temperature regulation

5. outputCopy - Copy memory/input to output
   params: { input, inputSymbol, output, outputSymbol }
   Use for: Output drivers, indicator lights from flags

6. timer - On-delay timer
   params: { timerAddress, timerSymbol?, input, inputSymbol, output, outputSymbol, preset, timeBase }
   timerAddress: %TM0, %TM1, %TM2, etc.
   timeBase: "OneMs", "TenMs", "HundredMs", "OneSecond", "OneMinute"
   Use for: Delay operations, timed sequences, debouncing

7. counter - Up counter
   params: { counterAddress, counterSymbol?, countInput, countSymbol, resetInput?, resetSymbol?, output, outputSymbol, preset }
   counterAddress: %C0, %C1, %C2, etc.
   Use for: Counting parts, events, cycles

8. branch - OR logic with parallel contacts
   params: { mainInput, mainSymbol, branchInput, branchSymbol, output, outputSymbol, mainNegated?, branchNegated? }
   Use for: Multiple start buttons, redundant sensors, alternative conditions

PLC I/O ADDRESSES:
- Digital Inputs: %I0.0 to %I0.8 (TM221CE16T), %I0.0 to %I0.13 (TM221CE24T)
- Digital Outputs: %Q0.0 to %Q0.6 (TM221CE16T), %Q0.0 to %Q0.9 (TM221CE24T)
- Memory Bits: %M0 to %M511
- Timers: %TM0 to %TM254
- Counters: %C0 to %C254
- Analog Inputs: %IW1.0 (with TM3AI4 expansion, 4-20mA = 0-10000)

OUTPUT FORMAT (JSON only, no markdown):
{
  "projectName": "Project_Name",
  "description": "Brief description",
  "patterns": [
    {
      "type": "motorStartStop",
      "params": {
        "startInput": "%I0.0",
        "startSymbol": "START_BTN",
        "stopInput": "%I0.1",
        "stopSymbol": "STOP_BTN",
        "estopInput": "%I0.2",
        "estopSymbol": "ESTOP",
        "output": "%Q0.0",
        "outputSymbol": "MOTOR1"
      },
      "rungName": "Motor 1 Control",
      "rungComment": "Start/Stop control for motor 1"
    }
  ],
  "inputs": [
    { "address": "%I0.0", "symbol": "START_BTN", "comment": "Start button" }
  ],
  "outputs": [
    { "address": "%Q0.0", "symbol": "MOTOR1", "comment": "Motor 1 contactor" }
  ],
  "memoryBits": [
    { "address": "%M0", "symbol": "MOTOR1_RUN", "comment": "Motor 1 running flag" }
  ]
}

RULES:
1. Always include ESTOP in safety-critical applications
2. Use NC (normally closed) contacts for safety devices
3. Use memory bits (%M) for internal flags, outputs (%Q) for physical outputs
4. For redundant/alternating systems, use memory bits to track state
5. Generate multiple patterns for complex logic
6. For timed sequences, use timer patterns with appropriate preset and timeBase
7. For counting operations, use counter patterns with appropriate preset

CRITICAL ANALOG SCALING RULES (v3.8):
8. NEVER combine INT_TO_REAL with calculations in the same rung!
   WRONG: %MF106 := INT_TO_REAL(%MW100 - 2000) / 8.0
   CORRECT (3 separate rungs):
   - Rung 1: %MW100 := %IW1.0 (copy raw analog)
   - Rung 2: %MF102 := INT_TO_REAL(%MW100) (convert to float - NO math!)
   - Rung 3: %MF104 := (%MF102 - 2000.0) / 8.0 (calculate from float)

9. SCALING FORMULA for custom ranges:
   For sensor range MIN_RAW to MAX_RAW mapping to MIN_ENG to MAX_ENG:
   - First convert raw to float: %MF_TEMP := INT_TO_REAL(%MW_RAW)
   - Then scale: %MF_SCALED := ((%MF_TEMP - MIN_RAW) / (MAX_RAW - MIN_RAW)) * (MAX_ENG - MIN_ENG) + MIN_ENG

   Example: 4-20mA (2000-10000 raw) to 300-30000mm:
   - %MF102 := INT_TO_REAL(%MW100) (separate rung)
   - %MF104 := ((%MF102 - 2000.0) / 8000.0) * 29700.0 + 300.0 (separate rung)

   Example: mm to percent (300mm=0%, 30000mm=100%):
   - %MF106 := ((%MF104 - 300.0) / 29700.0) * 100.0 (separate rung)

10. Use EVEN %MF addresses only: %MF100, %MF102, %MF104, %MF106 (NOT consecutive!)

CRITICAL CONTACT ELEMENT RULES (v3.12):
11. NEVER use %MW or %MF as NormalContact or NegatedContact!
    - NormalContact/NegatedContact can ONLY use: %I, %M, %Q, %S (bit addresses)
    - For %MW/%MF comparisons, use compareBlock pattern with operator
    WRONG: Using %MW11 as a contact element
    CORRECT: Use compareBlock with %MW11 = 1 or %MF104 >= 400.0

12. ALL %M bits used in the program MUST have symbols defined in memoryBits array!
    - If you use %M0, %M1, %M2 etc., add them to memoryBits with descriptive symbols
    - Example: { "address": "%M0", "symbol": "SYSTEM_READY", "comment": "System ready flag" }
    - Example: { "address": "%M1", "symbol": "AUTO_MODE", "comment": "Automatic mode active" }

POU ORGANIZATION (v3.6):
When organizing code into multiple POUs, assign each pattern a "pouCategory":
- "system_init": System Ready timer, %S0/%S1 cold/warm start resets
- "io_mapping": %IW to %MW copies, input scaling, raw I/O operations
- "auto_operation": Control logic, motor start/stop, hysteresis, sequences
- "manual_operation": HMI inputs, manual mode, jog controls, overrides
- "alarms_faults": CompareBlock for limits, alarm outputs, fault detection

PATTERN TO POU MAPPING:
- timer with System_Ready purpose → system_init
- simpleContact copying %IW → io_mapping
- motorStartStop, hysteresis → auto_operation
- outputCopy from HMI flag → manual_operation
- compareBlock for alarm limits → alarms_faults

When "usePOUs" is requested, include "pouCategory" field in each pattern.`;

// ============================================================
// PROMPT TEMPLATES FOR DIFFERENT PROMPT TYPES
// ============================================================

const PROMPT_TEMPLATES = {
  // Prompt 1: Basic - Simple pattern generation
  1: (description: string, plcModel: string, allowedPatterns: string[]) => `PLC Model: ${plcModel}

Requirements:
${description}

ALLOWED PATTERNS (only use these): ${allowedPatterns.join(', ')}

Generate a simple program using only the allowed patterns. Output ONLY valid JSON, no explanations.`,

  // Prompt 2: Detailed - With specific I/O addresses
  2: (description: string, plcModel: string, allowedPatterns: string[]) => `PLC Model: ${plcModel}

Requirements:
${description}

ALLOWED PATTERNS (only use these): ${allowedPatterns.join(', ')}

IMPORTANT INSTRUCTIONS:
- Use EXACT I/O addresses as specified in the requirements
- Include all inputs/outputs mentioned
- Specify proper symbols for each address
- Add descriptive comments for each I/O
- Generate detailed patterns with all parameters filled

Output ONLY valid JSON, no explanations.`,

  // Prompt 3: Safety - With E-Stop and interlocks
  3: (description: string, plcModel: string, allowedPatterns: string[]) => `PLC Model: ${plcModel}

Requirements:
${description}

ALLOWED PATTERNS (only use these): ${allowedPatterns.join(', ')}

SAFETY REQUIREMENTS (MANDATORY):
- ALWAYS include E-Stop (%I0.2 or as specified) in EVERY motor control rung
- Use NC (normally closed) contacts for all safety devices
- Add safety interlock between conflicting outputs (e.g., Forward/Reverse)
- Include overload protection inputs where applicable
- All outputs must be fail-safe (de-energize on safety trip)
- Add status/fault indicator outputs

Generate safety-compliant patterns. Output ONLY valid JSON, no explanations.`,

  // Prompt 4: Custom - User writes full prompt, pass through
  4: (description: string, plcModel: string, allowedPatterns: string[]) => `PLC Model: ${plcModel}

User Custom Requirements:
${description}

ALLOWED PATTERNS (only use these): ${allowedPatterns.join(', ')}

Analyze the user requirements carefully and generate the appropriate patterns. Output ONLY valid JSON, no explanations.`,
};

// ============================================================
// GENERATE PATTERNS FROM DESCRIPTION
// ============================================================

export async function generateM221Patterns(
  description: string,
  plcModel: string = 'TM221CE16T',
  selectedSkills: string[] = ['motorStartStop'],
  promptType: number = 1
): Promise<AIPatternOutput> {

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  // Get the appropriate prompt template
  const promptTemplate = PROMPT_TEMPLATES[promptType as keyof typeof PROMPT_TEMPLATES] || PROMPT_TEMPLATES[1];
  const userPrompt = promptTemplate(description, plcModel, selectedSkills);

  try {
    const message = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    // Clean up response
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7);
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    const parsed = JSON.parse(jsonText) as AIPatternOutput;
    return parsed;

  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

// ============================================================
// FALLBACK: Generate patterns without AI
// ============================================================

export function generateFallbackPatterns(
  description: string,
  projectName: string = 'Generated_Program'
): AIPatternOutput {

  const lowerDesc = description.toLowerCase();
  const patterns: PatternDefinition[] = [];
  const inputs: IODefinition[] = [];
  const outputs: IODefinition[] = [];
  const memoryBits: IODefinition[] = [];

  // Detect motor/pump control
  if (lowerDesc.includes('motor') || lowerDesc.includes('pump')) {
    // Count motors mentioned
    const motorMatch = lowerDesc.match(/(\d+)\s*motor/);
    const motorCount = motorMatch ? parseInt(motorMatch[1]) : 1;

    for (let i = 0; i < Math.min(motorCount, 2); i++) {
      const motorNum = i + 1;
      patterns.push({
        type: 'motorStartStop',
        params: {
          startInput: `%I0.${i * 2}`,
          startSymbol: `START_M${motorNum}`,
          stopInput: `%I0.${i * 2 + 1}`,
          stopSymbol: `STOP_M${motorNum}`,
          estopInput: '%I0.4',
          estopSymbol: 'ESTOP',
          output: `%Q0.${i}`,
          outputSymbol: `MOTOR${motorNum}`
        },
        rungName: `Motor ${motorNum} Control`,
        rungComment: `Start/Stop control for Motor ${motorNum}`
      });

      inputs.push(
        { address: `%I0.${i * 2}`, symbol: `START_M${motorNum}`, comment: `Start button Motor ${motorNum}` },
        { address: `%I0.${i * 2 + 1}`, symbol: `STOP_M${motorNum}`, comment: `Stop button Motor ${motorNum}` }
      );
      outputs.push(
        { address: `%Q0.${i}`, symbol: `MOTOR${motorNum}`, comment: `Motor ${motorNum} contactor` }
      );
    }

    inputs.push({ address: '%I0.4', symbol: 'ESTOP', comment: 'Emergency stop' });
  }

  // Detect level/tank control
  if (lowerDesc.includes('level') || lowerDesc.includes('tank')) {
    patterns.push({
      type: 'compareBlock',
      params: {
        analogInput: '%IW1.0',
        operator: '>',
        value: 2000,
        output: '%M1',
        outputSymbol: 'LEVEL_LOW'
      },
      rungName: 'Low Level Detection',
      rungComment: 'Detect when level is low'
    });

    patterns.push({
      type: 'compareBlock',
      params: {
        analogInput: '%IW1.0',
        operator: '<',
        value: 1000,
        output: '%M2',
        outputSymbol: 'LEVEL_HIGH'
      },
      rungName: 'High Level Detection',
      rungComment: 'Detect when level is high'
    });

    patterns.push({
      type: 'hysteresis',
      params: {
        lowFlag: '%M1',
        lowSymbol: 'LEVEL_LOW',
        highFlag: '%M2',
        highSymbol: 'LEVEL_HIGH',
        output: '%M0',
        outputSymbol: 'PUMP_RUN'
      },
      rungName: 'Pump Hysteresis Control',
      rungComment: 'Control pump with level hysteresis'
    });

    memoryBits.push(
      { address: '%M0', symbol: 'PUMP_RUN', comment: 'Pump running flag' },
      { address: '%M1', symbol: 'LEVEL_LOW', comment: 'Level below threshold' },
      { address: '%M2', symbol: 'LEVEL_HIGH', comment: 'Level above threshold' }
    );
  }

  // Detect timer/delay control
  if (lowerDesc.includes('timer') || lowerDesc.includes('delay') || lowerDesc.includes('sequence') || lowerDesc.includes('second')) {
    // Extract delay time if mentioned
    const timeMatch = lowerDesc.match(/(\d+)\s*(?:second|sec|s)/i);
    const preset = timeMatch ? parseInt(timeMatch[1]) : 5;

    patterns.push({
      type: 'timer',
      params: {
        timerAddress: '%TM0',
        timerSymbol: 'DELAY_TMR',
        input: '%I0.0',
        inputSymbol: 'START_TMR',
        output: '%M0',
        outputSymbol: 'TMR_DONE',
        preset: preset,
        timeBase: 'OneSecond'
      },
      rungName: 'Delay Timer',
      rungComment: `${preset} second on-delay timer`
    });

    inputs.push({ address: '%I0.0', symbol: 'START_TMR', comment: 'Timer start input' });
    memoryBits.push({ address: '%M0', symbol: 'TMR_DONE', comment: 'Timer done flag' });
  }

  // Detect counter control
  if (lowerDesc.includes('counter') || lowerDesc.includes('count') || lowerDesc.includes('parts') || lowerDesc.includes('cycle')) {
    // Extract count if mentioned
    const countMatch = lowerDesc.match(/(\d+)\s*(?:count|parts|cycle|piece)/i);
    const preset = countMatch ? parseInt(countMatch[1]) : 10;

    patterns.push({
      type: 'counter',
      params: {
        counterAddress: '%C0',
        counterSymbol: 'PART_CTR',
        countInput: '%I0.0',
        countSymbol: 'COUNT_IN',
        resetInput: '%I0.1',
        resetSymbol: 'RESET_CTR',
        output: '%M0',
        outputSymbol: 'CTR_DONE',
        preset: preset
      },
      rungName: 'Part Counter',
      rungComment: `Count to ${preset}`
    });

    inputs.push(
      { address: '%I0.0', symbol: 'COUNT_IN', comment: 'Counter pulse input' },
      { address: '%I0.1', symbol: 'RESET_CTR', comment: 'Counter reset' }
    );
    memoryBits.push({ address: '%M0', symbol: 'CTR_DONE', comment: 'Counter done flag' });
  }

  // Default if nothing detected
  if (patterns.length === 0) {
    patterns.push({
      type: 'motorStartStop',
      params: {
        startInput: '%I0.0',
        startSymbol: 'START',
        stopInput: '%I0.1',
        stopSymbol: 'STOP',
        estopInput: '%I0.2',
        estopSymbol: 'ESTOP',
        output: '%Q0.0',
        outputSymbol: 'OUTPUT1'
      },
      rungName: 'Main Control',
      rungComment: 'Basic start/stop control'
    });

    inputs.push(
      { address: '%I0.0', symbol: 'START', comment: 'Start button' },
      { address: '%I0.1', symbol: 'STOP', comment: 'Stop button' },
      { address: '%I0.2', symbol: 'ESTOP', comment: 'Emergency stop' }
    );
    outputs.push(
      { address: '%Q0.0', symbol: 'OUTPUT1', comment: 'Main output' }
    );
  }

  return {
    projectName,
    description,
    patterns,
    inputs,
    outputs,
    memoryBits
  };
}

// ============================================================
// LEGACY FUNCTION (for backward compatibility)
// ============================================================

export async function generateM221Program(
  description: string,
  plcModel: string = 'TM221CE16T'
): Promise<string> {
  // Try AI first, fallback if fails
  try {
    const patterns = await generateM221Patterns(description, plcModel);
    return JSON.stringify(patterns, null, 2);
  } catch {
    const fallback = generateFallbackPatterns(description);
    return JSON.stringify(fallback, null, 2);
  }
}
