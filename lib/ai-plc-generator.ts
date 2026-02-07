import Anthropic from '@anthropic-ai/sdk';

export interface AIGeneratedProgram {
  inputs: Array<{
    address: string;
    symbol: string;
    comment: string;
    type: 'NO' | 'NC';
  }>;
  outputs: Array<{
    address: string;
    symbol: string;
    comment: string;
  }>;
  memoryBits: Array<{
    address: string;
    symbol: string;
    comment: string;
  }>;
  timers?: Array<{
    address: string;
    symbol: string;
    type: 'TON' | 'TOF' | 'TP';
    preset: number;
    timeBase: string;
    comment: string;
  }>;
  counters?: Array<{
    address: string;
    symbol: string;
    type: 'CTU' | 'CTD' | 'CTUD';
    preset: number;
    comment: string;
  }>;
  rungs: Array<{
    name: string;
    comment: string;
    logic: string;
    ilCode: string[];
  }>;
  analogInputs?: Array<{
    address: string;
    symbol: string;
    signalType: string;
    minValue: number;
    maxValue: number;
    unit: string;
    comment: string;
  }>;
  memoryWords?: Array<{
    address: string;
    symbol: string;
    comment: string;
  }>;
}

const PLC_SYSTEM_PROMPT = `You are an expert PLC programmer specializing in Schneider Electric M221 PLCs using EcoStruxure Machine Expert Basic.

Your task is to analyze a user's control logic description and generate a complete PLC program configuration.

## M221 PLC Specifications:
- Digital Inputs: %I0.0 to %I0.23 (depending on model)
- Digital Outputs: %Q0.0 to %Q0.15 (depending on model)
- Memory Bits: %M0 to %M255
- Timers: %TM0 to %TM127 (TON, TOF, TP types)
- Counters: %C0 to %C127 (CTU, CTD, CTUD types)
- Analog Inputs: %IW1.0 to %IW1.3 (with TM3AI expansion)
- Analog Outputs: %QW1.0 to %QW1.1 (with TM3AQ expansion)
- System Bits: %S0 (cold start), %S1 (warm start), %S5-S7 (time pulses)

## Ladder Logic Rules:
1. Use seal-in circuits for latching operations
2. NC (normally closed) contacts should be used for STOP, ESTOP, and safety interlocks
3. Always include safety logic (ESTOP, overloads) when motors are involved
4. Use memory bits (%M) for internal state, not direct I/O manipulation
5. Add indicator lights for operator feedback
6. For analog inputs: 4-20mA = 0-10000 raw value, scale accordingly

## IL (Instruction List) Syntax:
- LD %I0.0 (load contact)
- LDN %I0.0 (load negated contact)
- AND %M0 (series AND)
- ANDN %M0 (series AND NOT)
- OR %M1 (parallel OR)
- ORN %M1 (parallel OR NOT)
- ST %Q0.0 (store to coil)
- S %M0 (set latch)
- R %M0 (reset latch)

## Timer IL Syntax:
BLK %TM0
LD %M0
IN
OUT_BLK
LD Q
ST %M1
END_BLK

## Counter IL Syntax:
BLK %C0
LD %I0.0
R
LD %M0
CU
OUT_BLK
LD D
ST %M1
END_BLK

## Comparison IL Syntax:
LD [ %IW1.0 > 5000 ]
ST %M0

Respond ONLY with valid JSON matching this exact structure:
{
  "inputs": [{ "address": "%I0.0", "symbol": "INPUT_NAME", "comment": "Description", "type": "NO" }],
  "outputs": [{ "address": "%Q0.0", "symbol": "OUTPUT_NAME", "comment": "Description" }],
  "memoryBits": [{ "address": "%M0", "symbol": "STATE_NAME", "comment": "Description" }],
  "timers": [{ "address": "%TM0", "symbol": "TIMER_NAME", "type": "TON", "preset": 5, "timeBase": "OneSecond", "comment": "Description" }],
  "counters": [{ "address": "%C0", "symbol": "COUNTER_NAME", "type": "CTU", "preset": 100, "comment": "Description" }],
  "rungs": [{ "name": "Rung Name", "comment": "Rung description", "logic": "Human readable logic", "ilCode": ["LD %I0.0", "ST %Q0.0"] }],
  "analogInputs": [{ "address": "%IW1.0", "symbol": "PRESSURE", "signalType": "4-20mA", "minValue": 0, "maxValue": 10, "unit": "bar", "comment": "Description" }]
}

Include ONLY fields that are needed. Omit timers/counters/analogInputs if not required.
Generate complete, working IL code for each rung.`;

export async function generateProgramWithAI(
  description: string,
  plcModel: string
): Promise<AIGeneratedProgram> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback to rule-based generation if no API key
    console.log('No ANTHROPIC_API_KEY found, using rule-based generation');
    return generateWithRules(description, plcModel);
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-6',
      max_tokens: 4096,
      system: PLC_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a PLC program for the following control logic:

PLC Model: ${plcModel}

Control Logic Description:
${description}

Respond with ONLY the JSON object, no markdown, no explanation.`
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    // Parse the JSON response
    let jsonStr = content.text.trim();

    // Remove any markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }

    const program = JSON.parse(jsonStr) as AIGeneratedProgram;

    // Validate required fields
    if (!program.inputs || !program.outputs || !program.rungs) {
      throw new Error('Invalid program structure from AI');
    }

    return program;

  } catch (error: any) {
    console.error('AI generation failed:', error.message);
    // Fallback to rule-based generation
    return generateWithRules(description, plcModel);
  }
}

/**
 * Rule-based fallback generator when AI is not available
 */
function generateWithRules(description: string, plcModel: string): AIGeneratedProgram {
  const lowerDesc = description.toLowerCase();

  // Check for ultrasonic tank level control scenario
  if ((lowerDesc.includes('ultrasonic') || lowerDesc.includes('level transmitter')) &&
      lowerDesc.includes('tank') && lowerDesc.includes('4-20ma')) {
    return generateUltrasonicTankControl(description, plcModel);
  }

  // First, try to parse explicit I/O definitions from description
  const parsedIO = parseExplicitIO(description);

  if (parsedIO.inputs.length > 0 || parsedIO.outputs.length > 0) {
    // User provided explicit I/O - use smart generation
    return generateFromExplicitIO(parsedIO, description, plcModel);
  }

  // Fallback to pattern-based detection
  const hasMotor = lowerDesc.includes('motor');
  const hasPump = lowerDesc.includes('pump');
  const hasStart = lowerDesc.includes('start');
  const hasStop = lowerDesc.includes('stop');
  const hasEstop = lowerDesc.includes('estop') || lowerDesc.includes('emergency');
  const hasOverload = lowerDesc.includes('overload');
  const hasTimer = lowerDesc.includes('timer') || lowerDesc.includes('delay') || lowerDesc.includes('second');
  const hasAnalog = lowerDesc.includes('pressure') || lowerDesc.includes('temperature') || lowerDesc.includes('level') || lowerDesc.includes('analog');
  const hasCounter = lowerDesc.includes('count') || lowerDesc.includes('batch');
  const hasLight = lowerDesc.includes('light') || lowerDesc.includes('indicator') || lowerDesc.includes('lamp');
  const hasSequence = lowerDesc.includes('sequence') || lowerDesc.includes('sequential');
  const hasValve = lowerDesc.includes('valve');
  const hasFan = lowerDesc.includes('fan') || lowerDesc.includes('blower');
  const hasHeater = lowerDesc.includes('heater') || lowerDesc.includes('heating');

  const inputs: AIGeneratedProgram['inputs'] = [];
  const outputs: AIGeneratedProgram['outputs'] = [];
  const memoryBits: AIGeneratedProgram['memoryBits'] = [];
  const rungs: AIGeneratedProgram['rungs'] = [];
  const timers: AIGeneratedProgram['timers'] = [];
  const counters: AIGeneratedProgram['counters'] = [];
  const analogInputs: AIGeneratedProgram['analogInputs'] = [];

  let inputIdx = 0;
  let outputIdx = 0;
  let memoryIdx = 0;
  let timerIdx = 0;

  // Parse custom inputs from description
  const inputMatches = description.match(/%I\d+\.\d+|input\s*\d+|button\s*\d+|switch\s*\d+|sensor\s*\d+/gi) || [];
  const outputMatches = description.match(/%Q\d+\.\d+|output\s*\d+|contactor|relay|valve|motor|pump|light|lamp/gi) || [];

  // Basic start/stop logic
  if (hasStart || hasStop || hasMotor || hasPump || hasFan) {
    inputs.push({
      address: `%I0.${inputIdx++}`,
      symbol: 'PB_START',
      comment: 'Start Push Button',
      type: 'NO'
    });
    inputs.push({
      address: `%I0.${inputIdx++}`,
      symbol: 'PB_STOP',
      comment: 'Stop Push Button',
      type: 'NC'
    });

    if (hasEstop) {
      inputs.push({
        address: `%I0.${inputIdx++}`,
        symbol: 'ESTOP',
        comment: 'Emergency Stop',
        type: 'NC'
      });
    }

    if (hasOverload) {
      inputs.push({
        address: `%I0.${inputIdx++}`,
        symbol: 'OL_TRIP',
        comment: 'Overload Trip',
        type: 'NC'
      });
    }

    const deviceName = hasMotor ? 'MTR' : hasPump ? 'PUMP' : hasFan ? 'FAN' : 'OUTPUT';

    memoryBits.push({
      address: `%M${memoryIdx++}`,
      symbol: `${deviceName}_RUN`,
      comment: `${deviceName} Running State`
    });

    outputs.push({
      address: `%Q0.${outputIdx++}`,
      symbol: `${deviceName}_OUT`,
      comment: `${deviceName} Contactor Output`
    });

    if (hasLight) {
      outputs.push({
        address: `%Q0.${outputIdx++}`,
        symbol: 'LT_RUN',
        comment: 'Run Indicator Light'
      });
    }

    // Build start/stop rung IL
    const startStopIL = ['LD    %I0.0', 'OR    %M0', 'ANDN  %I0.1'];
    if (hasEstop) startStopIL.push('ANDN  %I0.2');
    if (hasOverload) startStopIL.push('ANDN  %I0.3');
    startStopIL.push('ST    %M0');

    rungs.push({
      name: 'Start Stop Control',
      comment: 'Main start/stop with seal-in circuit',
      logic: 'START OR SEALED-IN, AND NOT STOP, AND NOT ESTOP, AND NOT OVERLOAD',
      ilCode: startStopIL
    });

    rungs.push({
      name: `${deviceName} Output`,
      comment: `Drive ${deviceName} contactor from running state`,
      logic: `If ${deviceName}_RUN then ${deviceName}_OUT`,
      ilCode: ['LD    %M0', 'ST    %Q0.0']
    });

    if (hasLight) {
      rungs.push({
        name: 'Run Light',
        comment: 'Run indicator light',
        logic: 'If running then light ON',
        ilCode: ['LD    %M0', 'ST    %Q0.1']
      });
    }
  }

  // Timer logic
  if (hasTimer) {
    const delayMatch = description.match(/(\d+)\s*(?:second|sec|s)/i);
    const delaySeconds = delayMatch ? parseInt(delayMatch[1]) : 5;

    timers.push({
      address: `%TM${timerIdx++}`,
      symbol: 'TMR_DELAY',
      type: 'TON',
      preset: delaySeconds,
      timeBase: 'OneSecond',
      comment: `${delaySeconds} second delay timer`
    });

    rungs.push({
      name: 'Timer Control',
      comment: `${delaySeconds} second timer`,
      logic: 'Start timer when trigger active',
      ilCode: [
        'BLK   %TM0',
        'LD    %M0',
        'IN',
        'OUT_BLK',
        'LD    Q',
        `ST    %M${memoryIdx}`,
        'END_BLK'
      ]
    });

    memoryBits.push({
      address: `%M${memoryIdx++}`,
      symbol: 'TMR_DONE',
      comment: 'Timer completed'
    });
  }

  // Analog input logic
  if (hasAnalog) {
    const pressMatch = description.match(/(\d+\.?\d*)\s*(?:bar|psi|kpa)/gi);
    const tempMatch = description.match(/(\d+\.?\d*)\s*(?:°?[CF]|celsius|fahrenheit|degrees)/gi);

    if (lowerDesc.includes('pressure')) {
      const maxPressure = 20; // default 0-20 bar
      analogInputs.push({
        address: '%IW1.0',
        symbol: 'PRES_AIN',
        signalType: '4-20mA',
        minValue: 0,
        maxValue: maxPressure,
        unit: 'bar',
        comment: 'Pressure Transmitter'
      });

      // Extract setpoints
      const highMatch = description.match(/(?:high|stop|max)[^\d]*(\d+\.?\d*)/i);
      const lowMatch = description.match(/(?:low|start|min)[^\d]*(\d+\.?\d*)/i);

      const highValue = highMatch ? parseFloat(highMatch[1]) : 10;
      const lowValue = lowMatch ? parseFloat(lowMatch[1]) : 5;

      const highRaw = Math.round((highValue / maxPressure) * 10000);
      const lowRaw = Math.round((lowValue / maxPressure) * 10000);

      memoryBits.push({
        address: `%M${memoryIdx++}`,
        symbol: 'PRES_HIGH',
        comment: `Pressure above ${highValue} bar`
      });
      memoryBits.push({
        address: `%M${memoryIdx++}`,
        symbol: 'PRES_LOW',
        comment: `Pressure below ${lowValue} bar`
      });

      rungs.push({
        name: 'High Pressure',
        comment: `Detect pressure > ${highValue} bar`,
        logic: `If %IW1.0 > ${highRaw} then PRES_HIGH`,
        ilCode: [`LD    [ %IW1.0 > ${highRaw} ]`, `ST    %M${memoryIdx - 2}`]
      });

      rungs.push({
        name: 'Low Pressure',
        comment: `Detect pressure < ${lowValue} bar`,
        logic: `If %IW1.0 < ${lowRaw} then PRES_LOW`,
        ilCode: [`LD    [ %IW1.0 < ${lowRaw} ]`, `ST    %M${memoryIdx - 1}`]
      });
    }

    if (lowerDesc.includes('temperature')) {
      analogInputs.push({
        address: '%IW1.0',
        symbol: 'TEMP_AIN',
        signalType: '4-20mA',
        minValue: 0,
        maxValue: 100,
        unit: 'C',
        comment: 'Temperature Sensor'
      });
    }
  }

  // Counter logic
  if (hasCounter) {
    const countMatch = description.match(/(\d+)\s*(?:count|batch|pieces?)/i);
    const countPreset = countMatch ? parseInt(countMatch[1]) : 100;

    counters.push({
      address: '%C0',
      symbol: 'BATCH_CTR',
      type: 'CTU',
      preset: countPreset,
      comment: `Count to ${countPreset}`
    });

    memoryBits.push({
      address: `%M${memoryIdx++}`,
      symbol: 'BATCH_DONE',
      comment: 'Batch count reached'
    });

    rungs.push({
      name: 'Batch Counter',
      comment: `Count to ${countPreset}`,
      logic: 'Count pulses until batch complete',
      ilCode: [
        'BLK   %C0',
        'LD    %I0.0',
        'R',
        'LD    %M0',
        'CU',
        'OUT_BLK',
        'LD    D',
        `ST    %M${memoryIdx - 1}`,
        'END_BLK'
      ]
    });
  }

  // Valve control
  if (hasValve) {
    outputs.push({
      address: `%Q0.${outputIdx++}`,
      symbol: 'VALVE_OUT',
      comment: 'Valve Solenoid Output'
    });
  }

  // Heater control
  if (hasHeater) {
    outputs.push({
      address: `%Q0.${outputIdx++}`,
      symbol: 'HEATER_OUT',
      comment: 'Heater Contactor Output'
    });
  }

  // Ensure we have at least basic I/O if nothing was detected
  if (inputs.length === 0) {
    inputs.push({
      address: '%I0.0',
      symbol: 'INPUT_0',
      comment: 'Digital Input 0',
      type: 'NO'
    });
  }

  if (outputs.length === 0) {
    outputs.push({
      address: '%Q0.0',
      symbol: 'OUTPUT_0',
      comment: 'Digital Output 0'
    });
  }

  if (rungs.length === 0) {
    rungs.push({
      name: 'Basic Logic',
      comment: 'Direct input to output',
      logic: 'If INPUT_0 then OUTPUT_0',
      ilCode: ['LD    %I0.0', 'ST    %Q0.0']
    });
  }

  const result: AIGeneratedProgram = {
    inputs,
    outputs,
    memoryBits,
    rungs
  };

  if (timers.length > 0) result.timers = timers;
  if (counters.length > 0) result.counters = counters;
  if (analogInputs.length > 0) result.analogInputs = analogInputs;

  return result;
}

/**
 * Generate ultrasonic tank level control program
 * Parses specifications like: dead band, range, tank height, pump start/stop levels
 */
function generateUltrasonicTankControl(description: string, plcModel: string): AIGeneratedProgram {
  // Parse specifications from description
  const deadBandMatch = description.match(/dead\s*band[^\d]*(\d+)\s*mm/i);
  const rangeMatch = description.match(/range[^\d]*(\d+)\s*mm/i);
  const tankHeightMatch = description.match(/(?:tank|height)[^\d]*(\d+)\s*mm/i);
  const pumpStartMatch = description.match(/(?:below|falls?\s*below|level\s*<)[^\d]*(\d+)\s*mm/i);
  const pumpStopMatch = description.match(/(?:at|stop[^\d]*)\s*(\d+)\s*mm\s*(?:from|distance)/i);

  // Extract values with defaults
  const deadBand = deadBandMatch ? parseInt(deadBandMatch[1]) : 300;
  const transmitterRange = rangeMatch ? parseInt(rangeMatch[1]) : 5000;
  const tankHeight = tankHeightMatch ? parseInt(tankHeightMatch[1]) : 2000;

  // For ultrasonic, distance from sensor:
  // - Pump starts when level falls below X mm (distance > tankHeight - X)
  // - Pump stops at Y mm from transmitter (distance = Y mm)
  const pumpStartLevel = pumpStartMatch ? parseInt(pumpStartMatch[1]) : 1000; // level from bottom
  const pumpStopDistance = pumpStopMatch ? parseInt(pumpStopMatch[1]) : 500; // distance from sensor

  // Calculate raw values (4-20mA = 0-10000)
  // Distance to raw: raw = (distance / transmitterRange) * 10000
  const pumpStartDistance = tankHeight - pumpStartLevel; // distance when level at start point
  const pumpStartRaw = Math.round((pumpStartDistance / transmitterRange) * 10000);
  const pumpStopRaw = Math.round((pumpStopDistance / transmitterRange) * 10000);
  const pumpStopLevel = tankHeight - pumpStopDistance; // actual level when pump stops

  // Dead band raw value
  const deadBandRaw = Math.round((deadBand / transmitterRange) * 10000);

  const inputs: AIGeneratedProgram['inputs'] = [
    { address: '%I0.0', symbol: 'PB_START', comment: 'Manual Start Button', type: 'NO' },
    { address: '%I0.1', symbol: 'PB_STOP', comment: 'Manual Stop Button NC', type: 'NC' },
    { address: '%I0.2', symbol: 'ESTOP', comment: 'Emergency Stop NC', type: 'NC' },
    { address: '%I0.3', symbol: 'SS_AUTO', comment: 'Auto/Manual Selector', type: 'NO' },
  ];

  const outputs: AIGeneratedProgram['outputs'] = [
    { address: '%Q0.0', symbol: 'PUMP_OUT', comment: 'Fill Pump Contactor' },
    { address: '%Q0.1', symbol: 'LT_RUN', comment: 'Pump Running Indicator' },
    { address: '%Q0.2', symbol: 'LT_AUTO', comment: 'Auto Mode Indicator' },
    { address: '%Q0.3', symbol: 'LT_LOW', comment: 'Low Level Alarm' },
    { address: '%Q0.4', symbol: 'LT_HIGH', comment: 'High Level Indicator' },
  ];

  const memoryBits: AIGeneratedProgram['memoryBits'] = [
    { address: '%M0', symbol: 'PUMP_RUN', comment: 'Pump Running State' },
    { address: '%M1', symbol: 'LEVEL_LOW', comment: `Level below ${pumpStartLevel}mm - Start pump` },
    { address: '%M2', symbol: 'LEVEL_HIGH', comment: `Level above ${pumpStopLevel}mm - Stop pump` },
    { address: '%M3', symbol: 'AUTO_CMD', comment: 'Auto mode pump command (hysteresis)' },
    { address: '%M4', symbol: 'SENSOR_VALID', comment: 'Sensor reading valid (above dead band)' },
    { address: '%M5', symbol: 'SENSOR_FAULT', comment: 'Sensor fault (below dead band)' },
  ];

  const analogInputs: AIGeneratedProgram['analogInputs'] = [
    {
      address: '%IW1.0',
      symbol: 'LVL_AIN',
      signalType: '4-20mA',
      minValue: 0,
      maxValue: transmitterRange,
      unit: 'mm',
      comment: `Ultrasonic Level Transmitter (distance ${deadBand}-${transmitterRange}mm)`
    }
  ];

  // Note: HMI reads analog input %IW1.0 directly
  // Scaling for HMI display:
  //   Distance (mm) = Raw * transmitterRange / 10000
  //   Actual Level (mm) = tankHeight - Distance

  const rungs: AIGeneratedProgram['rungs'] = [
    // Rung 0: Sensor validity check (above dead band)
    {
      name: 'Sensor Validity Check',
      comment: `Check if reading is above dead band (${deadBand}mm = ${deadBandRaw} raw)`,
      logic: `If distance > ${deadBand}mm then sensor valid`,
      ilCode: [`LD    [ %IW1.0 > ${deadBandRaw} ]`, 'ST    %M4']
    },
    // Rung 1: Sensor fault detection
    {
      name: 'Sensor Fault Detection',
      comment: `Sensor fault if reading below dead band`,
      logic: `If distance <= ${deadBand}mm then fault`,
      ilCode: [`LD    [ %IW1.0 <= ${deadBandRaw} ]`, 'ST    %M5']
    },
    // Rung 2: Low level detection (pump start trigger)
    {
      name: 'Low Level Detection',
      comment: `Level below ${pumpStartLevel}mm (distance > ${pumpStartDistance}mm = ${pumpStartRaw} raw)`,
      logic: `If %IW1.0 > ${pumpStartRaw} then LEVEL_LOW`,
      ilCode: [`LD    [ %IW1.0 > ${pumpStartRaw} ]`, 'ST    %M1']
    },
    // Rung 3: High level detection (pump stop trigger)
    {
      name: 'High Level Detection',
      comment: `Level above ${pumpStopLevel}mm (distance < ${pumpStopDistance}mm = ${pumpStopRaw} raw)`,
      logic: `If %IW1.0 < ${pumpStopRaw} then LEVEL_HIGH`,
      ilCode: [`LD    [ %IW1.0 < ${pumpStopRaw} ]`, 'ST    %M2']
    },
    // Rung 4: Auto mode hysteresis control
    {
      name: 'Auto Mode Hysteresis',
      comment: `Start pump at low level, stop at high level (hysteresis ${pumpStartLevel}-${pumpStopLevel}mm)`,
      logic: 'LEVEL_LOW OR (AUTO_CMD AND NOT LEVEL_HIGH)',
      ilCode: [
        'LD    %M1',       // Low level - start
        'OR    %M3',       // Or already running
        'ANDN  %M2',       // And not high level
        'AND   %M4',       // And sensor valid
        'ST    %M3'        // Auto command
      ]
    },
    // Rung 5: Pump control (Auto + Manual with safety)
    {
      name: 'Pump Run Control',
      comment: 'Pump runs in Auto mode with AUTO_CMD, or Manual with PB_START',
      logic: '(AUTO_MODE AND AUTO_CMD) OR (MANUAL_MODE AND PB_START sealed) with ESTOP',
      ilCode: [
        'LD    %I0.3',     // Auto mode selector
        'AND   %M3',       // Auto command
        'OR(   %I0.0',     // Or manual start
        'OR    %M0',       // Sealed
        'ANDN  %I0.3',     // And not in auto mode
        ')',
        'ANDN  %I0.1',     // And not stop pressed
        'ANDN  %I0.2',     // And not ESTOP
        'AND   %M4',       // And sensor valid
        'ST    %M0'        // Pump run state
      ]
    },
    // Rung 6: Pump output
    {
      name: 'Pump Output',
      comment: 'Drive pump contactor',
      logic: 'If PUMP_RUN then PUMP_OUT',
      ilCode: ['LD    %M0', 'ST    %Q0.0']
    },
    // Rung 7: Run indicator
    {
      name: 'Run Indicator',
      comment: 'Pump running light',
      logic: 'If PUMP_RUN then LT_RUN',
      ilCode: ['LD    %M0', 'ST    %Q0.1']
    },
    // Rung 8: Auto mode indicator
    {
      name: 'Auto Mode Indicator',
      comment: 'Auto mode light',
      logic: 'If SS_AUTO then LT_AUTO',
      ilCode: ['LD    %I0.3', 'ST    %Q0.2']
    },
    // Rung 9: Low level alarm
    {
      name: 'Low Level Alarm',
      comment: 'Low level warning light',
      logic: 'If LEVEL_LOW then LT_LOW',
      ilCode: ['LD    %M1', 'ST    %Q0.3']
    },
    // Rung 10: High level indicator
    {
      name: 'High Level Indicator',
      comment: 'Tank full indicator',
      logic: 'If LEVEL_HIGH then LT_HIGH',
      ilCode: ['LD    %M2', 'ST    %Q0.4']
    },
    // Note: HMI reads %IW1.0 directly. Scaling formula for HMI:
    // Distance (mm) = Raw * ${transmitterRange} / 10000
    // Actual Level (mm) = ${tankHeight} - Distance
  ];

  return {
    inputs,
    outputs,
    memoryBits,
    rungs,
    analogInputs
  };
}

interface ParsedIO {
  inputs: Array<{ num: number; name: string; description: string; type: 'NO' | 'NC' }>;
  outputs: Array<{ num: number; name: string; description: string }>;
}

/**
 * Parse explicit I/O definitions from user description
 * Supports patterns like:
 * - "Input 1 is an UP button"
 * - "Input 2 is a DOWN button"
 * - "Output 0 is the motor UP relay"
 * - "%I0.0 is START"
 * - "limit switch on input 3"
 */
function parseExplicitIO(description: string): ParsedIO {
  const inputs: ParsedIO['inputs'] = [];
  const outputs: ParsedIO['outputs'] = [];

  // Pattern: "Input X is (a/an/the) DESCRIPTION"
  const inputPatterns = [
    /input\s*(\d+)\s*(?:is\s*(?:a|an|the)?\s*)?([^,.]+)/gi,
    /%I0\.(\d+)\s*(?:is|:|-|=)\s*([^,.]+)/gi,
    /(\w+(?:\s+\w+)?)\s+(?:button|switch|sensor)\s+(?:on|at)?\s*(?:input)?\s*(\d+)/gi,
  ];

  // Pattern: "Output X is (a/an/the) DESCRIPTION"
  const outputPatterns = [
    /output\s*(\d+)\s*(?:is\s*(?:a|an|the)?\s*)?([^,.]+)/gi,
    /%Q0\.(\d+)\s*(?:is|:|-|=)\s*([^,.]+)/gi,
  ];

  // Parse inputs
  for (const pattern of inputPatterns) {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const num = parseInt(match[1]);
      const desc = match[2].trim();

      // Check if already added
      if (!inputs.find(i => i.num === num)) {
        // Determine if NC or NO based on description
        const isNC = /\b(nc|normally\s*closed|limit|stop|emergency)\b/i.test(desc);
        const name = generateSymbolFromDescription(desc);

        inputs.push({
          num,
          name,
          description: desc,
          type: isNC ? 'NC' : 'NO'
        });
      }
    }
  }

  // Parse outputs
  for (const pattern of outputPatterns) {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const num = parseInt(match[1]);
      const desc = match[2].trim();

      // Check if already added
      if (!outputs.find(o => o.num === num)) {
        const name = generateSymbolFromDescription(desc);
        outputs.push({ num, name, description: desc });
      }
    }
  }

  // Sort by number
  inputs.sort((a, b) => a.num - b.num);
  outputs.sort((a, b) => a.num - b.num);

  return { inputs, outputs };
}

/**
 * Generate a PLC symbol name from description
 */
function generateSymbolFromDescription(desc: string): string {
  const lowerDesc = desc.toLowerCase();

  // Common mappings
  if (lowerDesc.includes('up button') || lowerDesc.includes('up pb')) return 'PB_UP';
  if (lowerDesc.includes('down button') || lowerDesc.includes('down pb')) return 'PB_DOWN';
  if (lowerDesc.includes('start button') || lowerDesc.includes('start pb')) return 'PB_START';
  if (lowerDesc.includes('stop button') || lowerDesc.includes('stop pb')) return 'PB_STOP';
  if (lowerDesc.includes('emergency') || lowerDesc.includes('estop')) return 'ESTOP';
  if (lowerDesc.includes('upper limit')) return 'LS_UPPER';
  if (lowerDesc.includes('lower limit')) return 'LS_LOWER';
  if (lowerDesc.includes('limit switch')) return 'LS';
  if (lowerDesc.includes('float switch')) return 'FS_LEVEL';
  if (lowerDesc.includes('level switch') || lowerDesc.includes('high level')) return 'LS_HIGH';
  if (lowerDesc.includes('low level')) return 'LS_LOW';
  if (lowerDesc.includes('motor up')) return 'MTR_UP';
  if (lowerDesc.includes('motor down')) return 'MTR_DOWN';
  if (lowerDesc.includes('motor')) return 'MTR_OUT';
  if (lowerDesc.includes('pump')) return 'PUMP_OUT';
  if (lowerDesc.includes('valve')) return 'VALVE_OUT';
  if (lowerDesc.includes('relay')) return 'RLY_OUT';
  if (lowerDesc.includes('contactor')) return 'KM_OUT';
  if (lowerDesc.includes('manual') && lowerDesc.includes('override')) return 'SS_MANUAL';
  if (lowerDesc.includes('selector') || lowerDesc.includes('switch')) return 'SS';
  if (lowerDesc.includes('sensor')) return 'SENS';
  if (lowerDesc.includes('light') || lowerDesc.includes('lamp')) return 'LT';

  // Generate from first significant words
  const words = desc.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 0) {
    const symbol = words.slice(0, 2).join('_').toUpperCase().replace(/[^A-Z0-9_]/g, '');
    return symbol.substring(0, 12);
  }

  return 'IO';
}

/**
 * Generate program from explicitly parsed I/O
 */
function generateFromExplicitIO(
  parsedIO: ParsedIO,
  description: string,
  plcModel: string
): AIGeneratedProgram {
  const lowerDesc = description.toLowerCase();

  const inputs: AIGeneratedProgram['inputs'] = parsedIO.inputs.map(i => ({
    address: `%I0.${i.num}`,
    symbol: i.name,
    comment: i.description,
    type: i.type
  }));

  const outputs: AIGeneratedProgram['outputs'] = parsedIO.outputs.map(o => ({
    address: `%Q0.${o.num}`,
    symbol: o.name,
    comment: o.description
  }));

  const memoryBits: AIGeneratedProgram['memoryBits'] = [];
  const rungs: AIGeneratedProgram['rungs'] = [];
  const timers: AIGeneratedProgram['timers'] = [];

  // Detect control patterns from description
  const hasInterlock = lowerDesc.includes('interlock') || lowerDesc.includes('never') || lowerDesc.includes('not at the same time');
  const hasLimit = lowerDesc.includes('limit');
  const hasStop = lowerDesc.includes('stop when') || lowerDesc.includes('stop at');
  const hasSafety = lowerDesc.includes('safety') || lowerDesc.includes('emergency');

  // Create memory bits for output states
  outputs.forEach((out, idx) => {
    memoryBits.push({
      address: `%M${idx}`,
      symbol: `${out.symbol}_RUN`,
      comment: `${out.comment} state`
    });
  });

  // Generate control logic based on detected patterns
  if (parsedIO.outputs.length === 2 && hasInterlock) {
    // Two outputs with interlock (e.g., UP/DOWN, FWD/REV)
    const out0 = outputs[0];
    const out1 = outputs[1];

    // Find matching inputs
    const upInput = inputs.find(i => i.symbol.includes('UP') || i.symbol.includes('FWD'));
    const downInput = inputs.find(i => i.symbol.includes('DOWN') || i.symbol.includes('REV'));
    const limitInputs = inputs.filter(i => i.symbol.includes('LS') || i.symbol.includes('LIMIT'));

    // Output 0 control (e.g., UP)
    const il0: string[] = [];
    if (upInput) il0.push(`LD    ${upInput.address}`);
    else il0.push('LD    %I0.0');

    // Add limit switch if exists
    const upperLimit = limitInputs.find(l => l.symbol.includes('UPPER'));
    if (upperLimit) il0.push(`ANDN  ${upperLimit.address}`);

    // Add interlock - AND NOT other output running
    il0.push('ANDN  %M1');

    // Check for ESTOP
    const estop = inputs.find(i => i.symbol.includes('ESTOP') || i.symbol.includes('EMERGENCY'));
    if (estop) il0.push(`ANDN  ${estop.address}`);

    il0.push('ST    %M0');

    rungs.push({
      name: `${out0.symbol} Control`,
      comment: `Control ${out0.comment} with interlocks`,
      logic: `${upInput?.symbol || 'INPUT'} AND NOT limit AND NOT ${out1.symbol}`,
      ilCode: il0
    });

    // Output 1 control (e.g., DOWN)
    const il1: string[] = [];
    if (downInput) il1.push(`LD    ${downInput.address}`);
    else il1.push('LD    %I0.1');

    const lowerLimit = limitInputs.find(l => l.symbol.includes('LOWER'));
    if (lowerLimit) il1.push(`ANDN  ${lowerLimit.address}`);

    il1.push('ANDN  %M0');
    if (estop) il1.push(`ANDN  ${estop.address}`);
    il1.push('ST    %M1');

    rungs.push({
      name: `${out1.symbol} Control`,
      comment: `Control ${out1.comment} with interlocks`,
      logic: `${downInput?.symbol || 'INPUT'} AND NOT limit AND NOT ${out0.symbol}`,
      ilCode: il1
    });

    // Output rungs
    rungs.push({
      name: `${out0.symbol} Output`,
      comment: `Drive ${out0.comment}`,
      logic: `If ${out0.symbol}_RUN then ${out0.symbol}`,
      ilCode: ['LD    %M0', `ST    ${out0.address}`]
    });

    rungs.push({
      name: `${out1.symbol} Output`,
      comment: `Drive ${out1.comment}`,
      logic: `If ${out1.symbol}_RUN then ${out1.symbol}`,
      ilCode: ['LD    %M1', `ST    ${out1.address}`]
    });

  } else {
    // Generic logic - connect each input to corresponding output or memory
    inputs.forEach((inp, idx) => {
      const outIdx = idx % outputs.length;
      const out = outputs[outIdx];

      rungs.push({
        name: `${inp.symbol} to ${out?.symbol || 'Output'}`,
        comment: `${inp.comment} controls ${out?.comment || 'output'}`,
        logic: `If ${inp.symbol} then ${out?.symbol || 'OUTPUT'}`,
        ilCode: [
          inp.type === 'NC' ? `LDN   ${inp.address}` : `LD    ${inp.address}`,
          `ST    ${out?.address || '%Q0.0'}`
        ]
      });
    });
  }

  return {
    inputs,
    outputs,
    memoryBits,
    rungs,
    timers: timers.length > 0 ? timers : undefined
  };
}
