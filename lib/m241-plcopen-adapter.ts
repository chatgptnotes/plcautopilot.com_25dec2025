/**
 * M241 PLCopenXML Adapter
 *
 * Adapts generic PLCopenXML generation for Schneider Electric M241 series:
 * - TM241CE24T, TM241CE40T, TM241CEC24T, TM241CEC40T
 *
 * Handles M241-specific:
 * - I/O addressing (%I0.0, %Q0.0, %IW0.0, etc.)
 * - Memory addressing (%M, %MW, %MD, %MF)
 * - Timer/Counter function blocks (TON, TOF, TP, CTU, CTD, CTUD)
 * - Modbus TCP configuration hints
 */

import type {
  PLCopenProject,
  POU,
  Variable,
  LDRung,
  M241ProgramConfig,
  M241IOConfig,
  M241TimerConfig,
  M241CounterConfig,
  GeneratorResult,
  LanguageType,
} from './plcopen-types';

import {
  generatePLCopenXML,
  createBasicProject,
  createSimpleLDProgram,
  createSimpleSTProgram,
  createSimpleRung,
  resetElementIdCounter,
} from './plcopen-generator';

// ============================================================================
// M241 Model Specifications
// ============================================================================

export interface M241ModelSpec {
  model: string;
  digitalInputs: number;
  digitalOutputs: number;
  analogInputs: number;
  analogOutputs: number;
  hasEthernet: boolean;
  hasCANopen: boolean;
}

export const M241_MODELS: Record<string, M241ModelSpec> = {
  'TM241CE24T': {
    model: 'TM241CE24T',
    digitalInputs: 14,
    digitalOutputs: 10,
    analogInputs: 2,
    analogOutputs: 0,
    hasEthernet: true,
    hasCANopen: false,
  },
  'TM241CE40T': {
    model: 'TM241CE40T',
    digitalInputs: 24,
    digitalOutputs: 16,
    analogInputs: 2,
    analogOutputs: 0,
    hasEthernet: true,
    hasCANopen: false,
  },
  'TM241CEC24T': {
    model: 'TM241CEC24T',
    digitalInputs: 14,
    digitalOutputs: 10,
    analogInputs: 2,
    analogOutputs: 0,
    hasEthernet: true,
    hasCANopen: true,
  },
  'TM241CEC40T': {
    model: 'TM241CEC40T',
    digitalInputs: 24,
    digitalOutputs: 16,
    analogInputs: 2,
    analogOutputs: 0,
    hasEthernet: true,
    hasCANopen: true,
  },
};

// ============================================================================
// M241 Address Generation Helpers
// ============================================================================

/**
 * Generate M241 digital input address
 * Format: %IX0.n (bit) or %I0.n (alternate)
 */
export function m241DigitalInputAddress(index: number): string {
  return `%IX0.${index}`;
}

/**
 * Generate M241 digital output address
 * Format: %QX0.n (bit)
 */
export function m241DigitalOutputAddress(index: number): string {
  return `%QX0.${index}`;
}

/**
 * Generate M241 analog input address
 * Format: %IW0.n (word)
 */
export function m241AnalogInputAddress(index: number): string {
  return `%IW0.${index}`;
}

/**
 * Generate M241 analog output address
 * Format: %QW0.n (word)
 */
export function m241AnalogOutputAddress(index: number): string {
  return `%QW0.${index}`;
}

/**
 * Generate M241 memory bit address
 * Format: %MX0.n (bit in word 0)
 */
export function m241MemoryBitAddress(wordIndex: number, bitIndex: number): string {
  return `%MX${wordIndex}.${bitIndex}`;
}

/**
 * Generate M241 memory word address
 * Format: %MW0 (16-bit word)
 */
export function m241MemoryWordAddress(index: number): string {
  return `%MW${index}`;
}

/**
 * Generate M241 memory double word address
 * Format: %MD0 (32-bit)
 */
export function m241MemoryDWordAddress(index: number): string {
  return `%MD${index}`;
}

/**
 * Generate M241 memory float address
 * Format: %MF0 (32-bit float)
 */
export function m241MemoryFloatAddress(index: number): string {
  return `%MF${index}`;
}

// ============================================================================
// M241 Program Generators
// ============================================================================

/**
 * Generate M241 program from configuration
 */
export function generateM241Program(config: M241ProgramConfig): GeneratorResult {
  // Validate PLC model
  const modelSpec = M241_MODELS[config.plcModel];
  if (!modelSpec) {
    return {
      success: false,
      error: `Unknown M241 model: ${config.plcModel}. Valid models: ${Object.keys(M241_MODELS).join(', ')}`,
    };
  }

  // Build variables from I/O config
  const variables = buildM241Variables(config.io, config.timers, config.counters, config.memoryVars);

  // Build POU based on language
  let pou: POU;
  if (config.language === 'LD') {
    const rungs = buildDefaultLDRungs(config);
    pou = createSimpleLDProgram(
      'Main',
      `M241 Ladder Diagram Program - ${config.projectName}`,
      variables,
      rungs
    );
  } else {
    const code = buildDefaultSTCode(config);
    pou = createSimpleSTProgram(
      'Main',
      `M241 Structured Text Program - ${config.projectName}`,
      variables,
      code
    );
  }

  // Create project
  const project = createBasicProject(config.projectName, [pou]);

  // Generate XML
  return generatePLCopenXML(project);
}

/**
 * Build variable list from I/O configuration
 */
function buildM241Variables(
  io: M241IOConfig,
  timers?: M241TimerConfig[],
  counters?: M241CounterConfig[],
  memoryVars?: Variable[]
): Variable[] {
  const variables: Variable[] = [];

  // Digital inputs
  for (const di of io.digitalInputs) {
    variables.push({
      name: di.name,
      type: 'BOOL',
      address: di.address,
      documentation: di.comment,
    });
  }

  // Digital outputs
  for (const do_ of io.digitalOutputs) {
    variables.push({
      name: do_.name,
      type: 'BOOL',
      address: do_.address,
      documentation: do_.comment,
    });
  }

  // Analog inputs
  for (const ai of io.analogInputs) {
    variables.push({
      name: ai.name,
      type: 'INT',
      address: ai.address,
      documentation: `${ai.comment || ''} [${ai.type}]`,
    });
  }

  // Analog outputs
  for (const ao of io.analogOutputs) {
    variables.push({
      name: ao.name,
      type: 'INT',
      address: ao.address,
      documentation: `${ao.comment || ''} [${ao.type}]`,
    });
  }

  // Timers
  if (timers) {
    for (const timer of timers) {
      variables.push({
        name: timer.name,
        type: timer.type,
        documentation: `Timer preset: ${timer.preset}`,
      });
    }
  }

  // Counters
  if (counters) {
    for (const counter of counters) {
      variables.push({
        name: counter.name,
        type: counter.type,
        documentation: `Counter preset: ${counter.preset}`,
      });
    }
  }

  // Memory variables
  if (memoryVars) {
    variables.push(...memoryVars);
  }

  return variables;
}

/**
 * Build default LD rungs for basic I/O program
 */
function buildDefaultLDRungs(config: M241ProgramConfig): LDRung[] {
  const rungs: LDRung[] = [];
  let rungId = 1;

  resetElementIdCounter();

  // If we have inputs and outputs, create simple pass-through rungs
  const inputs = config.io.digitalInputs;
  const outputs = config.io.digitalOutputs;

  // Create sample rungs for first few I/O pairs
  const pairs = Math.min(inputs.length, outputs.length, 3);

  for (let i = 0; i < pairs; i++) {
    const rung = createSimpleRung(
      rungId++,
      `${inputs[i].name} controls ${outputs[i].name}`,
      [{ variable: inputs[i].name, negated: false }],
      outputs[i].name
    );
    rungs.push(rung);
  }

  // Add timer example if timers are configured
  if (config.timers && config.timers.length > 0) {
    // Timer rungs would be more complex - simplified for now
    rungs.push({
      localId: rungId++,
      comment: `Timer ${config.timers[0].name} example - configure in Machine Expert`,
      elements: [],
      connections: [],
    });
  }

  return rungs;
}

/**
 * Build default ST code for basic I/O program
 */
function buildDefaultSTCode(config: M241ProgramConfig): string {
  const lines: string[] = [];

  lines.push('(* M241 Structured Text Program *)');
  lines.push(`(* Project: ${config.projectName} *)`);
  lines.push(`(* PLC Model: ${config.plcModel} *)`);
  lines.push('');
  lines.push('(* Digital I/O Logic *)');

  // Simple pass-through logic
  const inputs = config.io.digitalInputs;
  const outputs = config.io.digitalOutputs;
  const pairs = Math.min(inputs.length, outputs.length, 3);

  for (let i = 0; i < pairs; i++) {
    lines.push(`${outputs[i].name} := ${inputs[i].name};`);
  }

  lines.push('');

  // Analog scaling example
  if (config.io.analogInputs.length > 0) {
    lines.push('(* Analog Input Scaling Example *)');
    const ai = config.io.analogInputs[0];
    lines.push(`(* ${ai.name}: ${ai.type}, range ${ai.min || 0} to ${ai.max || 10000} *)`);
    lines.push('');
  }

  // Timer example
  if (config.timers && config.timers.length > 0) {
    lines.push('(* Timer Example *)');
    const timer = config.timers[0];
    lines.push(`(* ${timer.name}(IN := trigger, PT := ${timer.preset}); *)`);
    lines.push(`(* output := ${timer.name}.Q; *)`);
    lines.push('');
  }

  // Counter example
  if (config.counters && config.counters.length > 0) {
    lines.push('(* Counter Example *)');
    const counter = config.counters[0];
    lines.push(`(* ${counter.name}(CU := pulse, RESET := reset, PV := ${counter.preset}); *)`);
    lines.push(`(* count := ${counter.name}.CV; *)`);
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================================================
// Motor Start/Stop Template
// ============================================================================

export function createM241MotorStartStop(
  projectName: string,
  plcModel: string,
  language: LanguageType
): GeneratorResult {
  const config: M241ProgramConfig = {
    projectName,
    plcModel,
    language,
    io: {
      digitalInputs: [
        { address: '%IX0.0', name: 'START_PB', comment: 'Start pushbutton (NO)' },
        { address: '%IX0.1', name: 'STOP_PB', comment: 'Stop pushbutton (NC)' },
        { address: '%IX0.2', name: 'ESTOP', comment: 'Emergency stop (NC)' },
        { address: '%IX0.3', name: 'OVERLOAD', comment: 'Thermal overload (NC)' },
      ],
      digitalOutputs: [
        { address: '%QX0.0', name: 'MOTOR_CONTACTOR', comment: 'Motor contactor output' },
        { address: '%QX0.1', name: 'RUN_LIGHT', comment: 'Run indicator light' },
        { address: '%QX0.2', name: 'FAULT_LIGHT', comment: 'Fault indicator light' },
      ],
      analogInputs: [],
      analogOutputs: [],
    },
    memoryVars: [
      { name: 'MotorRunning', type: 'BOOL', documentation: 'Motor running latch' },
      { name: 'FaultActive', type: 'BOOL', documentation: 'Fault condition active' },
    ],
  };

  if (language === 'ST') {
    // Override with specific ST code
    const stCode = `(* Motor Start/Stop with Interlocks *)
(* Project: ${projectName} *)
(* PLC Model: ${plcModel} *)

(* Check for faults *)
FaultActive := NOT ESTOP OR NOT OVERLOAD;

(* Motor control logic with seal-in *)
IF START_PB AND NOT FaultActive AND STOP_PB THEN
    MotorRunning := TRUE;
END_IF;

IF NOT STOP_PB OR FaultActive THEN
    MotorRunning := FALSE;
END_IF;

(* Output assignments *)
MOTOR_CONTACTOR := MotorRunning;
RUN_LIGHT := MotorRunning;
FAULT_LIGHT := FaultActive;
`;

    const pou = createSimpleSTProgram(
      'Main',
      'Motor Start/Stop Control',
      buildM241Variables(config.io, undefined, undefined, config.memoryVars),
      stCode
    );

    const project = createBasicProject(projectName, [pou]);
    return generatePLCopenXML(project);
  }

  // LD version
  return generateM241Program(config);
}

// ============================================================================
// Tank Level Control Template
// ============================================================================

export function createM241TankLevel(
  projectName: string,
  plcModel: string,
  language: LanguageType,
  tankHeight: number = 2000,
  lowLevel: number = 500,
  highLevel: number = 1800
): GeneratorResult {
  const config: M241ProgramConfig = {
    projectName,
    plcModel,
    language,
    io: {
      digitalInputs: [
        { address: '%IX0.0', name: 'ESTOP', comment: 'Emergency stop (NC)' },
        { address: '%IX0.1', name: 'PUMP_FAULT', comment: 'Pump fault signal' },
      ],
      digitalOutputs: [
        { address: '%QX0.0', name: 'INLET_PUMP', comment: 'Inlet pump control' },
        { address: '%QX0.1', name: 'LOW_ALARM', comment: 'Low level alarm light' },
        { address: '%QX0.2', name: 'HIGH_ALARM', comment: 'High level alarm light' },
      ],
      analogInputs: [
        {
          address: '%IW0.0',
          name: 'LEVEL_SENSOR',
          type: '4_20mA',
          min: 0,
          max: tankHeight,
          comment: 'Tank level sensor (4-20mA)',
        },
      ],
      analogOutputs: [],
    },
    memoryVars: [
      { name: 'TankLevel', type: 'REAL', documentation: 'Scaled tank level in mm' },
      { name: 'LevelLow', type: 'BOOL', documentation: 'Level below low setpoint' },
      { name: 'LevelHigh', type: 'BOOL', documentation: 'Level above high setpoint' },
      { name: 'PumpEnabled', type: 'BOOL', documentation: 'Pump enabled flag' },
    ],
  };

  if (language === 'ST') {
    const stCode = `(* Tank Level Control *)
(* Project: ${projectName} *)
(* PLC Model: ${plcModel} *)
(* Tank Height: ${tankHeight}mm *)
(* Low Level: ${lowLevel}mm *)
(* High Level: ${highLevel}mm *)

(* Scale analog input: 0-10000 raw -> 0-${tankHeight}mm *)
TankLevel := REAL(LEVEL_SENSOR) * ${tankHeight}.0 / 10000.0;

(* Level comparisons *)
LevelLow := TankLevel < ${lowLevel}.0;
LevelHigh := TankLevel > ${highLevel}.0;

(* Pump control with hysteresis *)
IF LevelLow AND ESTOP AND NOT PUMP_FAULT THEN
    PumpEnabled := TRUE;
END_IF;

IF LevelHigh OR NOT ESTOP OR PUMP_FAULT THEN
    PumpEnabled := FALSE;
END_IF;

(* Output assignments *)
INLET_PUMP := PumpEnabled;
LOW_ALARM := LevelLow;
HIGH_ALARM := LevelHigh;
`;

    const pou = createSimpleSTProgram(
      'Main',
      'Tank Level Control',
      buildM241Variables(config.io, undefined, undefined, config.memoryVars),
      stCode
    );

    const project = createBasicProject(projectName, [pou]);
    return generatePLCopenXML(project);
  }

  // LD version
  return generateM241Program(config);
}

// ============================================================================
// Export all functions
// ============================================================================

export {
  generatePLCopenXML,
  createBasicProject,
  createSimpleLDProgram,
  createSimpleSTProgram,
};
