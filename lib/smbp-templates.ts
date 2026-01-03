/**
 * SMBP Template Library
 *
 * Verified rung patterns extracted from working .smbp files.
 * These templates generate valid XML that opens in Machine Expert Basic.
 */

// ============================================================
// TYPES
// ============================================================

export interface RungPattern {
  name: string;
  comment: string;
  ladderElements: string;
  ilCode: string[];
}

export interface MotorStartStopParams {
  startInput: string;      // e.g., "%I0.0"
  startSymbol: string;     // e.g., "START_MOTOR"
  stopInput: string;       // e.g., "%I0.1"
  stopSymbol: string;      // e.g., "STOP_MOTOR"
  estopInput?: string;     // e.g., "%I0.2"
  estopSymbol?: string;    // e.g., "ESTOP"
  output: string;          // e.g., "%Q0.0"
  outputSymbol: string;    // e.g., "MOTOR_RUN"
  rungName?: string;
  rungComment?: string;
}

export interface SimpleContactParams {
  input: string;
  inputSymbol: string;
  output: string;
  outputSymbol: string;
  negated?: boolean;
  rungName?: string;
  rungComment?: string;
}

export interface CompareBlockParams {
  analogInput: string;     // e.g., "%IW1.0"
  operator: '>' | '<' | '>=' | '<=' | '=' | '<>';
  value: number;
  output: string;          // e.g., "%M1"
  outputSymbol: string;
  rungName?: string;
  rungComment?: string;
}

export interface HysteresisParams {
  lowFlag: string;         // e.g., "%M1" - set when level is low
  lowSymbol: string;
  highFlag: string;        // e.g., "%M2" - set when level is high
  highSymbol: string;
  estopInput?: string;
  estopSymbol?: string;
  output: string;          // e.g., "%M0" - pump run latch
  outputSymbol: string;
  rungName?: string;
  rungComment?: string;
}

export interface TimerParams {
  timerAddress: string;    // e.g., "%TM0"
  timerSymbol?: string;
  input: string;           // e.g., "%I0.0" - timer enable input
  inputSymbol: string;
  output: string;          // e.g., "%M0" - timer done output
  outputSymbol: string;
  preset: number;          // Timer preset value
  timeBase: 'OneMs' | 'TenMs' | 'HundredMs' | 'OneSecond' | 'OneMinute';
  rungName?: string;
  rungComment?: string;
}

export interface CounterParams {
  counterAddress: string;  // e.g., "%C0"
  counterSymbol?: string;
  countInput: string;      // e.g., "%I0.0" - count pulse input
  countSymbol: string;
  resetInput?: string;     // e.g., "%I0.1" - reset input
  resetSymbol?: string;
  output: string;          // e.g., "%M0" - counter done output
  outputSymbol: string;
  preset: number;          // Counter preset value
  rungName?: string;
  rungComment?: string;
}

export interface BranchParams {
  mainInput: string;       // e.g., "%I0.0" - main path input
  mainSymbol: string;
  branchInput: string;     // e.g., "%I0.1" - parallel branch input
  branchSymbol: string;
  output: string;          // e.g., "%Q0.0"
  outputSymbol: string;
  mainNegated?: boolean;
  branchNegated?: boolean;
  rungName?: string;
  rungComment?: string;
}

// Timer declaration for the <Timers> section
export interface TimerDeclaration {
  address: string;
  index: number;
  preset: number;
  base: 'OneMs' | 'TenMs' | 'HundredMs' | 'OneSecond' | 'OneMinute';
}

// Counter declaration for the <Counters> section
export interface CounterDeclaration {
  address: string;
  index: number;
  preset: number;
}

// TM3AI4 Analog Input Expansion Module
export interface TM3AI4Config {
  channels: Array<{
    address: string;      // e.g., "%IW1.0"
    symbol?: string;
    comment?: string;
    aiType?: 'Current4_20mA' | 'Current0_20mA' | 'Voltage0_10V';
  }>;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateLineElements(startCol: number, endCol: number, row: number = 0): string {
  const lines: string[] = [];
  for (let col = startCol; col <= endCol; col++) {
    lines.push(`              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>${row}</Row>
                <Column>${col}</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`);
  }
  return lines.join('\n');
}

// ============================================================
// TEMPLATE: Motor Start/Stop with Seal-in
// Verified from: motor_start_stop_TM221CE24T.smbp
// ============================================================

export function generateMotorStartStopRung(params: MotorStartStopParams): RungPattern {
  const {
    startInput, startSymbol,
    stopInput, stopSymbol,
    estopInput, estopSymbol,
    output, outputSymbol,
    rungName = 'Motor Start Stop',
    rungComment = 'Start/Stop latching circuit with seal-in'
  } = params;

  const hasEstop = estopInput && estopSymbol;
  const lastContactCol = hasEstop ? 2 : 1;
  const lineStartCol = lastContactCol + 1;

  let ladderElements = `              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${startInput}</Descriptor>
                <Comment />
                <Symbol>${startSymbol}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>${stopInput}</Descriptor>
                <Comment />
                <Symbol>${stopSymbol}</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;

  if (hasEstop) {
    ladderElements += `
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>${estopInput}</Descriptor>
                <Comment />
                <Symbol>${estopSymbol}</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;
  }

  // Add line elements
  ladderElements += '\n' + generateLineElements(lineStartCol, 9);

  // Add coil
  ladderElements += `
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>`;

  // Generate IL code
  const ilCode = [
    `LD    ${startInput}`,
    `OR    ${output}`,
    `ANDN  ${stopInput}`,
  ];
  if (hasEstop) {
    ilCode.push(`ANDN  ${estopInput}`);
  }
  ilCode.push(`ST    ${output}`);

  return {
    name: rungName,
    comment: rungComment,
    ladderElements,
    ilCode
  };
}

// ============================================================
// TEMPLATE: Simple Contact to Coil
// Verified from: pump_pressure_control_TM221CE24T.smbp
// ============================================================

export function generateSimpleRung(params: SimpleContactParams): RungPattern {
  const {
    input, inputSymbol,
    output, outputSymbol,
    negated = false,
    rungName = 'Simple Control',
    rungComment = 'Single contact to coil'
  } = params;

  const elementType = negated ? 'NegatedContact' : 'NormalContact';

  let ladderElements = `              <LadderEntity>
                <ElementType>${elementType}</ElementType>
                <Descriptor>${input}</Descriptor>
                <Comment />
                <Symbol>${inputSymbol}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;

  // Add line elements
  ladderElements += '\n' + generateLineElements(1, 9);

  // Add coil
  ladderElements += `
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>`;

  const ilCode = [
    negated ? `LDN   ${input}` : `LD    ${input}`,
    `ST    ${output}`
  ];

  return {
    name: rungName,
    comment: rungComment,
    ladderElements,
    ilCode
  };
}

// ============================================================
// TEMPLATE: CompareBlock (Analog Comparison)
// Verified from: pump_pressure_control_TM221CE24T.smbp
// ============================================================

export function generateCompareBlockRung(params: CompareBlockParams): RungPattern {
  const {
    analogInput, operator, value,
    output, outputSymbol,
    rungName = 'Analog Comparison',
    rungComment = 'Compare analog value to threshold'
  } = params;

  // Format comparison expression: [%IW1.0>2000]
  const expression = `[${analogInput}${operator}${value}]`;
  const escapedExpression = escapeXml(expression);

  let ladderElements = `              <LadderEntity>
                <ElementType>CompareBlock</ElementType>
                <Descriptor>${escapedExpression}</Descriptor>
                <Comment />
                <Symbol />
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;

  // Add line elements
  ladderElements += '\n' + generateLineElements(1, 9);

  // Add coil
  ladderElements += `
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>`;

  const ilCode = [
    `LD    ${escapedExpression}`,
    `ST    ${output}`
  ];

  return {
    name: rungName,
    comment: rungComment,
    ladderElements,
    ilCode
  };
}

// ============================================================
// TEMPLATE: Hysteresis Control (with seal-in)
// Verified from: pump_pressure_control_TM221CE24T.smbp
// ============================================================

export function generateHysteresisRung(params: HysteresisParams): RungPattern {
  const {
    lowFlag, lowSymbol,
    highFlag, highSymbol,
    estopInput, estopSymbol,
    output, outputSymbol,
    rungName = 'Hysteresis Control',
    rungComment = 'Latching control with hysteresis'
  } = params;

  const hasEstop = estopInput && estopSymbol;
  const lastContactCol = hasEstop ? 2 : 1;
  const lineStartCol = lastContactCol + 1;

  let ladderElements = `              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${lowFlag}</Descriptor>
                <Comment />
                <Symbol>${lowSymbol}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>${highFlag}</Descriptor>
                <Comment />
                <Symbol>${highSymbol}</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;

  if (hasEstop) {
    ladderElements += `
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>${estopInput}</Descriptor>
                <Comment />
                <Symbol>${estopSymbol}</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;
  }

  // Add line elements
  ladderElements += '\n' + generateLineElements(lineStartCol, 9);

  // Add coil and seal-in
  ladderElements += `
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>`;

  const ilCode = [
    `LD    ${lowFlag}`,
    `OR    ${output}`,
    `ANDN  ${highFlag}`,
  ];
  if (hasEstop) {
    ilCode.push(`ANDN  ${estopInput}`);
  }
  ilCode.push(`ST    ${output}`);

  return {
    name: rungName,
    comment: rungComment,
    ladderElements,
    ilCode
  };
}

// ============================================================
// TEMPLATE: Timer (On-Delay Timer with BLK structure)
// Verified from: m221-timer-programming.md
// ============================================================

export function generateTimerRung(params: TimerParams): RungPattern {
  const {
    timerAddress, timerSymbol = '',
    input, inputSymbol,
    output, outputSymbol,
    rungName = 'Timer Delay',
    rungComment = 'On-delay timer'
  } = params;

  let ladderElements = `              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${input}</Descriptor>
                <Comment />
                <Symbol>${inputSymbol}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>${timerAddress}</Descriptor>
                <Comment />
                <Symbol>${timerSymbol}</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;

  // Add line elements from column 3 to 9 (Timer occupies columns 1-2)
  ladderElements += '\n' + generateLineElements(3, 9);

  // Add output coil
  ladderElements += `
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>`;

  // Timer IL uses BLK structure
  const ilCode = [
    `BLK   ${timerAddress}`,
    `LD    ${input}`,
    `IN`,
    `OUT_BLK`,
    `LD    Q`,
    `ST    ${output}`,
    `END_BLK`
  ];

  return {
    name: rungName,
    comment: rungComment,
    ladderElements,
    ilCode
  };
}

// ============================================================
// TEMPLATE: Counter (Up Counter with BLK structure)
// Based on M221 counter documentation
// ============================================================

export function generateCounterRung(params: CounterParams): RungPattern {
  const {
    counterAddress, counterSymbol = '',
    countInput, countSymbol,
    resetInput, resetSymbol,
    output, outputSymbol,
    rungName = 'Counter',
    rungComment = 'Up counter with preset'
  } = params;

  const hasReset = resetInput && resetSymbol;

  let ladderElements = `              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${countInput}</Descriptor>
                <Comment />
                <Symbol>${countSymbol}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Counter</ElementType>
                <Descriptor>${counterAddress}</Descriptor>
                <Comment />
                <Symbol>${counterSymbol}</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;

  // Add line elements from column 3 to 9 (Counter occupies columns 1-2)
  ladderElements += '\n' + generateLineElements(3, 9);

  // Add output coil
  ladderElements += `
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>`;

  // Counter IL uses BLK structure
  const ilCode = [
    `BLK   ${counterAddress}`,
    `LD    ${countInput}`,
    `CU`,
  ];

  if (hasReset) {
    ilCode.push(`LD    ${resetInput}`);
    ilCode.push(`R`);
  }

  ilCode.push(`OUT_BLK`);
  ilCode.push(`LD    D`);
  ilCode.push(`ST    ${output}`);
  ilCode.push(`END_BLK`);

  return {
    name: rungName,
    comment: rungComment,
    ladderElements,
    ilCode
  };
}

// ============================================================
// TEMPLATE: Branch (OR logic - parallel contacts)
// Verified from motor_start_stop pattern
// ============================================================

export function generateBranchRung(params: BranchParams): RungPattern {
  const {
    mainInput, mainSymbol,
    branchInput, branchSymbol,
    output, outputSymbol,
    mainNegated = false,
    branchNegated = false,
    rungName = 'OR Logic',
    rungComment = 'Parallel branch logic'
  } = params;

  const mainElementType = mainNegated ? 'NegatedContact' : 'NormalContact';
  const branchElementType = branchNegated ? 'NegatedContact' : 'NormalContact';

  let ladderElements = `              <LadderEntity>
                <ElementType>${mainElementType}</ElementType>
                <Descriptor>${mainInput}</Descriptor>
                <Comment />
                <Symbol>${mainSymbol}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>`;

  // Add line elements from column 1 to 9
  ladderElements += '\n' + generateLineElements(1, 9);

  // Add output coil
  ladderElements += `
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>${branchElementType}</ElementType>
                <Descriptor>${branchInput}</Descriptor>
                <Comment />
                <Symbol>${branchSymbol}</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>`;

  // Generate IL code
  const mainLoad = mainNegated ? `LDN   ${mainInput}` : `LD    ${mainInput}`;
  const branchOr = branchNegated ? `ORN   ${branchInput}` : `OR    ${branchInput}`;

  const ilCode = [
    mainLoad,
    branchOr,
    `ST    ${output}`
  ];

  return {
    name: rungName,
    comment: rungComment,
    ladderElements,
    ilCode
  };
}

// ============================================================
// RUNG TO XML CONVERTER
// ============================================================

export function rungPatternToXml(pattern: RungPattern): string {
  const ilLines = pattern.ilCode.map(il => `              <InstructionLineEntity>
                <InstructionLine>${il}</InstructionLine>
                <Comment />
              </InstructionLineEntity>`).join('\n');

  return `          <RungEntity>
            <LadderElements>
${pattern.ladderElements}
            </LadderElements>
            <InstructionLines>
${ilLines}
            </InstructionLines>
            <Name>${escapeXml(pattern.name)}</Name>
            <MainComment>${escapeXml(pattern.comment)}</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// ============================================================
// FULL SMBP GENERATOR
// ============================================================

export interface AnalogInputDeclaration {
  address: string;   // e.g., "%IW1.0"
  symbol?: string;
  comment?: string;
}

/**
 * Generate TM3AI4 analog input expansion module XML
 * TM3AI4 provides 4 analog inputs (%IW1.0 to %IW1.3)
 * HardwareId: 3073
 */
function generateExtensionsXml(analogInputs: AnalogInputDeclaration[]): string {
  if (analogInputs.length === 0) {
    return '      <Extensions />';
  }

  // Generate individual analog input elements
  const analogInputsXml = [];
  for (let i = 0; i < 4; i++) {
    const aiAddress = `%IW1.${i}`;
    const ai = analogInputs.find(a => a.address === aiAddress);

    if (ai) {
      analogInputsXml.push(`            <AnalogInput>
              <Address>${aiAddress}</Address>
              <Index>${i}</Index>
              <Symbol>${ai.symbol || ''}</Symbol>
              <Comment>${ai.comment || ''}</Comment>
              <AIType>Current4_20mA</AIType>
              <AIRange>Range0_10000</AIRange>
              <AIFilter>AIFilter4</AIFilter>
            </AnalogInput>`);
    } else {
      analogInputsXml.push(`            <AnalogInput>
              <Address>${aiAddress}</Address>
              <Index>${i}</Index>
              <AIType>Current4_20mA</AIType>
              <AIRange>Range0_10000</AIRange>
              <AIFilter>AIFilter4</AIFilter>
            </AnalogInput>`);
    }
  }

  return `      <Extensions>
        <Extension>
          <Index>0</Index>
          <InputNb>4</InputNb>
          <OutputNb>0</OutputNb>
          <Kind>1</Kind>
          <Reference>TM3AI4</Reference>
          <Name>AI_Expansion</Name>
          <Consumption5V>30</Consumption5V>
          <Consumption24V>35</Consumption24V>
          <AnalogInputs>
${analogInputsXml.join('\n')}
          </AnalogInputs>
          <AnalogInputsStatus>
            <AnalogInputStatus>
              <Address>%IW1.4</Address>
              <Index>0</Index>
            </AnalogInputStatus>
          </AnalogInputsStatus>
          <HardwareId>3073</HardwareId>
          <IsExpander>false</IsExpander>
        </Extension>
      </Extensions>`;
}

export interface SmbpConfig {
  projectName: string;
  plcModel: string;
  rungs: RungPattern[];
  inputs?: Array<{ address: string; symbol: string; comment?: string }>;
  outputs?: Array<{ address: string; symbol: string; comment?: string }>;
  memoryBits?: Array<{ address: string; symbol: string; comment?: string }>;
  timers?: TimerDeclaration[];
  counters?: CounterDeclaration[];
  tm3ai4?: TM3AI4Config;  // TM3AI4 expansion module for analog inputs
  analogInputs?: AnalogInputDeclaration[];  // Analog inputs that trigger TM3AI4 generation
}

// =============================================
// Multi-POU Support (v3.6)
// =============================================

/**
 * POU Categories for organizing code by function type
 */
export type POUCategory =
  | 'system_init'       // System startup, cold/warm resets
  | 'io_mapping'        // Raw I/O reads and writes
  | 'auto_operation'    // Automatic control logic
  | 'manual_operation'  // Manual/HMI overrides
  | 'alarms_faults'     // Alarm detection and handling
  | 'custom';           // User-defined

/**
 * POU Definition for multi-POU programs
 */
export interface POUDefinition {
  name: string;           // User-friendly name like "Tank_Auto_Control"
  sectionNumber: number;  // 0, 1, 2, 3...
  category: POUCategory;
  rungs: RungPattern[];
}

/**
 * Multi-POU configuration for organized programs
 */
export interface MultiPOUSmbpConfig extends Omit<SmbpConfig, 'rungs'> {
  pous: POUDefinition[];
}

// Generate TM3AI4 Extension XML
function generateTM3AI4Xml(tm3ai4: TM3AI4Config): string {
  const analogInputsXml = tm3ai4.channels.map((ch, index) => `        <AnalogInput>
          <Address>${ch.address}</Address>
          <Index>${index}</Index>${ch.symbol ? `
          <Symbol>${ch.symbol}</Symbol>` : ''}${ch.comment ? `
          <Comment>${ch.comment}</Comment>` : ''}
          <AIType>${ch.aiType || 'Current4_20mA'}</AIType>
          <AIRange>Range0_10000</AIRange>
          <AIFilter>AIFilter4</AIFilter>
        </AnalogInput>`).join('\n');

  // Fill remaining channels (TM3AI4 has 4 channels)
  const remainingChannels: string[] = [];
  for (let i = tm3ai4.channels.length; i < 4; i++) {
    remainingChannels.push(`        <AnalogInput>
          <Address>%IW1.${i}</Address>
          <Index>${i}</Index>
          <AIType>Current4_20mA</AIType>
          <AIRange>Range0_10000</AIRange>
          <AIFilter>AIFilter4</AIFilter>
        </AnalogInput>`);
  }

  return `      <Extension>
        <Index>0</Index>
        <InputNb>4</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>1</Kind>
        <Reference>TM3AI4</Reference>
        <Name>AI_Expansion</Name>
        <Consumption5V>30</Consumption5V>
        <Consumption24V>35</Consumption24V>
        <AnalogInputs>
${analogInputsXml}
${remainingChannels.join('\n')}
        </AnalogInputs>
        <AnalogInputsStatus>
          <AnalogInputStatus>
            <Address>%IW1.4</Address>
            <Index>0</Index>
          </AnalogInputStatus>
        </AnalogInputsStatus>
        <HardwareId>3073</HardwareId>
        <IsExpander>false</IsExpander>
      </Extension>`;
}

export function generateFullSmbp(config: SmbpConfig): string {
  const { projectName, plcModel, rungs, inputs = [], outputs = [], memoryBits = [], timers = [], counters = [], tm3ai4, analogInputs = [] } = config;

  // Get PLC hardware ID (CORRECT VALUES from M221-COMPLETE-REFERENCE.md)
  const hardwareIds: Record<string, number> = {
    // CE Series (with Ethernet)
    'TM221CE16R': 1928,
    'TM221CE16T': 1929,
    'TM221CE16U': 1930,
    'TM221CE24R': 1931,
    'TM221CE24T': 1932,
    'TM221CE24U': 1933,
    'TM221CE40R': 1934,
    'TM221CE40T': 1935,
    'TM221CE40U': 1936,
    // C Series (without Ethernet)
    'TM221C16R': 1910,
    'TM221C16T': 1911,
    'TM221C16U': 1912,
    'TM221C24R': 1913,
    'TM221C24T': 1914,
    'TM221C24U': 1915,
    'TM221C40R': 1916,
    'TM221C40T': 1917,
    'TM221C40U': 1918,
    // M Series (Modular)
    'TM221M16R': 1940,
    'TM221M16T': 1941,
    'TM221M32TK': 1942,
  };
  const hardwareId = hardwareIds[plcModel] || 1929;

  // Get I/O counts for all 21 models
  const ioCounts: Record<string, { inputs: number; outputs: number }> = {
    // CE Series
    'TM221CE16R': { inputs: 9, outputs: 7 },
    'TM221CE16T': { inputs: 9, outputs: 7 },
    'TM221CE16U': { inputs: 9, outputs: 7 },
    'TM221CE24R': { inputs: 14, outputs: 10 },
    'TM221CE24T': { inputs: 14, outputs: 10 },
    'TM221CE24U': { inputs: 14, outputs: 10 },
    'TM221CE40R': { inputs: 24, outputs: 16 },
    'TM221CE40T': { inputs: 24, outputs: 16 },
    'TM221CE40U': { inputs: 24, outputs: 16 },
    // C Series
    'TM221C16R': { inputs: 9, outputs: 7 },
    'TM221C16T': { inputs: 9, outputs: 7 },
    'TM221C16U': { inputs: 9, outputs: 7 },
    'TM221C24R': { inputs: 14, outputs: 10 },
    'TM221C24T': { inputs: 14, outputs: 10 },
    'TM221C24U': { inputs: 14, outputs: 10 },
    'TM221C40R': { inputs: 24, outputs: 16 },
    'TM221C40T': { inputs: 24, outputs: 16 },
    'TM221C40U': { inputs: 24, outputs: 16 },
    // M Series
    'TM221M16R': { inputs: 8, outputs: 8 },
    'TM221M16T': { inputs: 8, outputs: 8 },
    'TM221M32TK': { inputs: 16, outputs: 16 },
  };
  const ioCount = ioCounts[plcModel] || { inputs: 9, outputs: 7 };

  // Generate rungs XML
  const rungsXml = rungs.map(rung => rungPatternToXml(rung)).join('\n');

  // Generate digital inputs XML
  const digitalInputsXml = generateDigitalInputsXml(inputs, ioCount.inputs);

  // Generate digital outputs XML
  const digitalOutputsXml = generateDigitalOutputsXml(outputs, ioCount.outputs);

  // Generate memory bits XML (no Comment tag - reference file doesn't have it)
  const memoryBitsXml = memoryBits.map((mb, index) => `      <MemoryBit>
        <Address>${mb.address}</Address>
        <Index>${index}</Index>
        <Symbol>${mb.symbol}</Symbol>
      </MemoryBit>`).join('\n');

  // Generate timers XML
  const timersXml = timers.length > 0 ? timers.map(timer => `      <TimerTM>
        <Address>${timer.address}</Address>
        <Index>${timer.index}</Index>
        <Preset>${timer.preset}</Preset>
        <Base>${timer.base}</Base>
      </TimerTM>`).join('\n') : '';

  // Generate counters XML
  const countersXml = counters.length > 0 ? counters.map(counter => `      <CounterCT>
        <Address>${counter.address}</Address>
        <Index>${counter.index}</Index>
        <Preset>${counter.preset}</Preset>
      </CounterCT>`).join('\n') : '';

  // Generate extensions XML (TM3AI4 expansion module)
  // Use tm3ai4 config if provided, otherwise use analogInputs array
  let extensionsXml = '<Extensions />';
  if (tm3ai4) {
    extensionsXml = `<Extensions>
${generateTM3AI4Xml(tm3ai4)}
      </Extensions>`;
  } else if (analogInputs.length > 0) {
    extensionsXml = generateExtensionsXml(analogInputs);
  }

  // NO BOM and use CRLF line endings - required by EcoStruxure Machine Expert Basic
  const content = `<?xml version="1.0" encoding="utf-8"?>
<ProjectDescriptor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ProjectVersion>3.0.0.0</ProjectVersion>
  <ManagementLevel>FunctLevelMan21_0</ManagementLevel>
  <Name>${projectName}</Name>
  <FullName>${projectName}.smbp</FullName>
  <CurrentCultureName>en-GB</CurrentCultureName>
  <SoftwareConfiguration>
    <Pous>
      <ProgramOrganizationUnits>
        <Name>Main Program</Name>
        <SectionNumber>1</SectionNumber>
        <Rungs>
${rungsXml}
        </Rungs>
      </ProgramOrganizationUnits>
    </Pous>
    <Subroutines />
    <WatchLists />
    <CustomSymbols />
    <ConstantWordsMemoryAllocation />
    <MemoryBitsMemoryAllocation>
      <Allocation>Manual</Allocation>
      <ForcedCount>512</ForcedCount>
    </MemoryBitsMemoryAllocation>
    <MemoryWordsMemoryAllocation>
      <Allocation>Manual</Allocation>
      <ForcedCount>2000</ForcedCount>
    </MemoryWordsMemoryAllocation>
    <TimersMemoryAllocation />
    <CountersMemoryAllocation />
    <RegistersMemoryAllocation />
    <DrumsMemoryAllocation />
    <SbrsMemoryAllocation />
    <ScsMemoryAllocation />
    <FcsMemoryAllocation />
    <SchsMemoryAllocation />
    <HscsMemoryAllocation />
    <PtosMemoryAllocation />
    <MemoryBits>
${memoryBitsXml}
    </MemoryBits>
    <SystemBits>
      <MemoryBit>
        <Address>%S0</Address>
        <Index>0</Index>
        <Symbol>SB_COLDSTART</Symbol>
        <Comment>Indicates or executes a cold start (data initialized to default values)</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S1</Address>
        <Index>1</Index>
        <Symbol>SB_WARMSTART</Symbol>
        <Comment>Indicates there was a warm start with data backup</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S4</Address>
        <Index>4</Index>
        <Symbol>SB_TB10MS</Symbol>
        <Comment>Time base of 10 ms generated by an internal clock</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S5</Address>
        <Index>5</Index>
        <Symbol>SB_TB100MS</Symbol>
        <Comment>Time base of 100 ms generated by an internal clock</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S6</Address>
        <Index>6</Index>
        <Symbol>SB_TB1S</Symbol>
        <Comment>Time base of 1 s generated by an internal clock</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S7</Address>
        <Index>7</Index>
        <Symbol>SB_TB1MIN</Symbol>
        <Comment>Time base of 1 min generated by an internal clock</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S9</Address>
        <Index>9</Index>
        <Symbol>SB_FALLBACKOUTPUT</Symbol>
        <Comment>Set to 1 to apply fallbacks on digital and analog outputs</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S10</Address>
        <Index>10</Index>
        <Symbol>SB_IOCOMBUS</Symbol>
        <Comment>I/O communication is running correctly (1), I/O communication error detected (0)</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S11</Address>
        <Index>11</Index>
        <Symbol>SB_WATCHDOG</Symbol>
        <Comment>Watchdog overflow causes the controller to change to HALT</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S12</Address>
        <Index>12</Index>
        <Symbol>SB_RUNMODE</Symbol>
        <Comment>The controller is running</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S13</Address>
        <Index>13</Index>
        <Symbol>SB_FIRSTRUN</Symbol>
        <Comment>Indicates the first controller cycle in RUN mode</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S14</Address>
        <Index>14</Index>
        <Symbol>SB_IOFORCED</Symbol>
        <Comment>This bit indicates there is at least one input or output forced</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S15</Address>
        <Index>15</Index>
        <Symbol>SB_INFORCED</Symbol>
        <Comment>This bit indicates there is at least one input forced</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S16</Address>
        <Index>16</Index>
        <Symbol>SB_OUTFORCED</Symbol>
        <Comment>This bit indicates there is at least one output forced</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S17</Address>
        <Index>17</Index>
        <Symbol>SB_LASTBIT</Symbol>
        <Comment>It indicates the value of the last ejected bit</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S18</Address>
        <Index>18</Index>
        <Symbol>SB_OPERROR</Symbol>
        <Comment>It indicates an overflow when a 16 bit operation is performed</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S19</Address>
        <Index>19</Index>
        <Symbol>SB_OVERRUN</Symbol>
        <Comment>It indicates scan time greater than the period defined by the user</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S20</Address>
        <Index>20</Index>
        <Symbol>SB_INDERROR</Symbol>
        <Comment>This bit indicates an index overflow of the indexed object address when a 16 bit operation is performed</Comment>
      </MemoryBit>
    </SystemBits>
    <SystemWords>
      <MemoryWord>
        <Address>%SW0</Address>
        <Index>0</Index>
        <Symbol>SW_MASTERTASK</Symbol>
        <Comment>Modifies controller scan period defined at configuration through the user program in the Animation Table Editor</Comment>
      </MemoryWord>
      <MemoryWord>
        <Address>%SW6</Address>
        <Index>6</Index>
        <Symbol>SW_CONTROLSTATUS</Symbol>
        <Comment>Controller Status: NO CONFIG (0), STOP (2), RUN (3), HALT (4), POWERLESS MODE (5)</Comment>
      </MemoryWord>
    </SystemWords>
    <GrafcetSteps />
    <MemoryWords />
    <MemoryDoubleWords />
    <MemoryFloats />
    <ConstantWords />
    <ConstantDoubleWords />
    <ConstantMemoryFloats />
${timers.length > 0 ? `    <Timers>\n${timersXml}\n    </Timers>` : '    <Timers />'}
${counters.length > 0 ? `    <Counters>\n${countersXml}\n    </Counters>` : '    <Counters />'}
    <FastCounters />
    <Registers />
    <Drums />
    <ShiftBitRegisters />
    <StepCounters />
    <ScheduleBlocks />
    <Pids />
    <MessageBlocks>
      <MessageBlock>
        <Address>%MSG1</Address>
        <Index>0</Index>
        <OutputPort>Serial1</OutputPort>
      </MessageBlock>
      <MessageBlock>
        <Address>%MSG3</Address>
        <Index>2</Index>
        <OutputPort>Ethernet</OutputPort>
      </MessageBlock>
    </MessageBlocks>
    <FunctionBlocks />
    <MotionTaskTables />
    <FastTask>
      <Period>255</Period>
    </FastTask>
    <MastTask>
      <UsePeriodScanMode>false</UsePeriodScanMode>
      <PeriodScan>100</PeriodScan>
    </MastTask>
    <CpuBehavior>
      <StartingMode>StartAsPreviousState</StartingMode>
      <RunStopAddress />
      <AutoSaveRamOnEeprom>true</AutoSaveRamOnEeprom>
      <WatchdogPeriod>250</WatchdogPeriod>
    </CpuBehavior>
    <TraceTimeBase>Time5Sec</TraceTimeBase>
    <UserFunctionPous />
    <UserFunctionBlockPous />
    <UserDefineFunctionBlocks />
  </SoftwareConfiguration>
  <HardwareConfiguration>
    <Plc>
      <Cpu>
        <Index>0</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference>${plcModel}</Reference>
        <Name>MyController</Name>
        <Consumption5V>520</Consumption5V>
        <Consumption24V>200</Consumption24V>
        <TechnicalConfiguration>
          <PtoConfiguration>
            <McPowerPtoMax>86</McPowerPtoMax>
            <McMoveVelPtoMax>86</McMoveVelPtoMax>
            <McMoveRelPtoMax>86</McMoveRelPtoMax>
            <McMoveAbsPtoMax>86</McMoveAbsPtoMax>
            <McHomePtoMax>86</McHomePtoMax>
            <McSetPosPtoMax>86</McSetPosPtoMax>
            <McStopPtoMax>86</McStopPtoMax>
            <McHaltPtoMax>86</McHaltPtoMax>
            <McReadActVelPtoMax>40</McReadActVelPtoMax>
            <McReadActPosPtoMax>40</McReadActPosPtoMax>
            <McReadStsPtoMax>40</McReadStsPtoMax>
            <McReadMotionStatePtoMax>40</McReadMotionStatePtoMax>
            <McReadAxisErrorPtoMax>40</McReadAxisErrorPtoMax>
            <McResetPtoMax>40</McResetPtoMax>
            <McTouchProbePtoMax>40</McTouchProbePtoMax>
            <McAbortTriggerPtoMax>40</McAbortTriggerPtoMax>
            <McReadParPtoMax>40</McReadParPtoMax>
            <McWriteParPtoMax>40</McWriteParPtoMax>
            <McMotionTaskPtoMax>2</McMotionTaskPtoMax>
          </PtoConfiguration>
          <ComConfiguration>
            <ReadVarBasicMax>32</ReadVarBasicMax>
            <WriteVarBasicMax>32</WriteVarBasicMax>
            <WriteReadVarBasicMax>32</WriteReadVarBasicMax>
            <SendRecvMsgBasicMax>16</SendRecvMsgBasicMax>
            <SendRecvSmsMax>1</SendRecvSmsMax>
          </ComConfiguration>
          <Compatibility>0</Compatibility>
          <FastCounterMax>4</FastCounterMax>
          <FourInputsEventTask>84148994</FourInputsEventTask>
          <GrafcetBitsMax>200</GrafcetBitsMax>
          <InternalRamStart>0</InternalRamStart>
          <LabelsMax>64</LabelsMax>
          <LfRegistersMax>4</LfRegistersMax>
          <MemoryConstantWordsMax>512</MemoryConstantWordsMax>
          <MemoryWordsMax>8000</MemoryWordsMax>
          <NumRelays>0</NumRelays>
          <NumRelaysMax>9999</NumRelaysMax>
          <NumTransistors>10</NumTransistors>
          <NumTransistorsMax>9999</NumTransistorsMax>
          <PidAmountMax>14</PidAmountMax>
          <PlcNumberSysBits>160</PlcNumberSysBits>
          <PlcNumberSysWords>234</PlcNumberSysWords>
          <PlcStartAddrSysBits>16</PlcStartAddrSysBits>
          <PlcType>0</PlcType>
          <TimersMax>255</TimersMax>
          <AnalogInputPrecision>0</AnalogInputPrecision>
          <AnalogOutputPrecision>0</AnalogOutputPrecision>
        </TechnicalConfiguration>
${digitalInputsXml}
${digitalOutputsXml}
        <AnalogInputs />
        <AnalogInputsStatus />
        <AnalogOutputs />
        <AnalogOutputsStatus />
        <HighSpeedCounters />
        <PulseTrainOutputs />
        <HardwareId>${hardwareId}</HardwareId>
        <IsExpander>false</IsExpander>
        <EthernetConfiguration>
          <NetworkName>M221</NetworkName>
          <IpAllocationMode>FixedAddress</IpAllocationMode>
          <IpAddress>0.0.0.0</IpAddress>
          <SubnetMask>0.0.0.0</SubnetMask>
          <GatewayAddress>0.0.0.0</GatewayAddress>
          <TransfertRate>TransfertRateAuto</TransfertRate>
          <EthernetProtocol>ProtocolEthernet2</EthernetProtocol>
          <ModbusTcpSlave>
            <IpMasterAddress>0.0.0.0</IpMasterAddress>
            <UseTimeout>true</UseTimeout>
            <Timeout>2</Timeout>
            <SlavePort>502</SlavePort>
            <UnitId xsi:nil="true" />
            <HoldingRegister>0</HoldingRegister>
            <InputRegister>0</InputRegister>
            <ModbusServerEnabled>false</ModbusServerEnabled>
            <Devices />
            <DigitalInputsIoScanner />
            <DigitalOutputsIoScanner />
            <RegisterInputsIoScanner />
            <RegisterOutputsIoScanner />
            <RegisterDeviceStatusIoScanner />
            <RegisterInputsStatusIoScanner />
            <Drives />
            <IsIoScanner>false</IsIoScanner>
          </ModbusTcpSlave>
          <EthernetIpEntity>
            <EthernetIpEnabled>false</EthernetIpEnabled>
            <OutputAssemblyInstance>0</OutputAssemblyInstance>
            <OutputAssemblySize>0</OutputAssemblySize>
            <InputAssemblySize>0</InputAssemblySize>
            <InputAssemblyInstance>0</InputAssemblyInstance>
          </EthernetIpEntity>
          <ProgrammingProtocolEnabled>false</ProgrammingProtocolEnabled>
          <EthernetIpAdapterEnabled>false</EthernetIpAdapterEnabled>
          <ModbusServerEnabled>false</ModbusServerEnabled>
          <AutoDiscoveryProtocolEnabled>false</AutoDiscoveryProtocolEnabled>
        </EthernetConfiguration>
      </Cpu>
      ${extensionsXml}
      <SerialLineConfiguration>
        <Baud>Baud19200</Baud>
        <Parity>ParityEven</Parity>
        <DataBits>DataBits8</DataBits>
        <StopBits>StopBits1</StopBits>
        <PhysicalMedium>PhysicalMediumRs485</PhysicalMedium>
        <TransmissionMode>TransmissionModeModbusRtu</TransmissionMode>
        <SlaveId>1</SlaveId>
        <Addressing>SlaveAddressing</Addressing>
      </SerialLineConfiguration>
    </Plc>
  </HardwareConfiguration>
  <DisplayUserLabelsConfiguration>
    <Languages>
      <UserLabelLanguage>
        <Code>English</Code>
        <Name>English</Name>
      </UserLabelLanguage>
    </Languages>
    <Translations />
  </DisplayUserLabelsConfiguration>
  <GlobalProperties>
    <UserInformations />
    <CompanyInformations />
    <ProjectInformations>
      <Name>${projectName}</Name>
    </ProjectInformations>
    <ProjectProtection>
      <Active>false</Active>
      <Password />
      <CanView>true</CanView>
    </ProjectProtection>
    <ApplicationProtection>
      <Active>false</Active>
      <Password />
      <DownloadActive>false</DownloadActive>
      <DownloadPassword />
    </ApplicationProtection>
    <RemoteIpAddresses>
      <IpAddresses />
    </RemoteIpAddresses>
    <ModemConfigurations>
      <ModemConfigurationEntities />
    </ModemConfigurations>
    <KeepModbusParameters>false</KeepModbusParameters>
    <UnitId>1</UnitId>
    <DownloadSettings>
      <ResetMemories>true</ResetMemories>
      <DownloadSymbolsComments>true</DownloadSymbolsComments>
      <DownloadWatchLists>true</DownloadWatchLists>
      <DownloadPouNamesComments>true</DownloadPouNamesComments>
      <DownloadRungNamesComments>true</DownloadRungNamesComments>
      <DownloadIlComments>true</DownloadIlComments>
      <DownloadFrontPageProperties>true</DownloadFrontPageProperties>
      <DownloadCompanyProperties>true</DownloadCompanyProperties>
      <DownloadProjectInfo>true</DownloadProjectInfo>
    </DownloadSettings>
  </GlobalProperties>
  <ReportConfiguration>
    <PageSetup>
      <PaperKind>A4</PaperKind>
      <IsLandscape>false</IsLandscape>
      <ReportUnit>HundredthsOfAnInch</ReportUnit>
      <Top>100</Top>
      <Bottom>100</Bottom>
      <Left>100</Left>
      <Right>100</Right>
    </PageSetup>
    <SubReportConfigurations />
  </ReportConfiguration>
</ProjectDescriptor>`;

  // Convert LF to CRLF (Windows line endings required by Machine Expert Basic)
  return content.replace(/\n/g, '\r\n');
}

function generateDigitalInputsXml(
  inputs: Array<{ address: string; symbol: string; comment?: string }>,
  maxInputs: number
): string {
  const inputsXml: string[] = [];

  for (let i = 0; i < maxInputs; i++) {
    const input = inputs.find(inp => inp.address === `%I0.${i}`);
    // Comment tag IS required for Machine Expert Basic (from working template)
    inputsXml.push(`          <DiscretInput>
            <Address>%I0.${i}</Address>
            <Index>${i}</Index>${input ? `
            <Symbol>${input.symbol}</Symbol>
            <Comment>${input.comment || ''}</Comment>` : ''}
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>`);
  }

  return `        <DigitalInputs>
${inputsXml.join('\n')}
        </DigitalInputs>`;
}

function generateDigitalOutputsXml(
  outputs: Array<{ address: string; symbol: string; comment?: string }>,
  maxOutputs: number
): string {
  const outputsXml: string[] = [];

  for (let i = 0; i < maxOutputs; i++) {
    const output = outputs.find(out => out.address === `%Q0.${i}`);
    // Comment tag IS required for Machine Expert Basic (from working template)
    outputsXml.push(`          <DiscretOutput>
            <Address>%Q0.${i}</Address>
            <Index>${i}</Index>${output ? `
            <Symbol>${output.symbol}</Symbol>
            <Comment>${output.comment || ''}</Comment>` : ''}
          </DiscretOutput>`);
  }

  return `        <DigitalOutputs>
${outputsXml.join('\n')}
        </DigitalOutputs>`;
}

/**
 * Generate TM3AI4/G extension module XML from analog input declarations
 * Uses correct Machine Expert Basic XML structure with Type/Scope sub-elements
 */
function generateExtensionFromAnalogInputs(analogInputs: AnalogInputDeclaration[]): string {
  if (!analogInputs || analogInputs.length === 0) {
    return '      <Extensions />';
  }

  // Generate individual AnalogIO elements for TM3AI4/G (4 channels)
  const analogInputsXml = [];
  for (let i = 0; i < 4; i++) {
    const aiAddress = `%IW1.${i}`;
    const ai = analogInputs.find(a => a.address === aiAddress);

    if (ai) {
      // Used channel - configure as 4-20mA with 0-10000 range
      analogInputsXml.push(`            <AnalogIO>
              <Address>${aiAddress}</Address>
              <Index>${i}</Index>
              <Symbol>${ai.symbol || ''}</Symbol>
              <Type>
                <Value>3</Value>
                <Name>Type_4_20mA</Name>
              </Type>
              <Scope>
                <Value>0</Value>
                <Name>Scope_0_10000</Name>
              </Scope>
              <Sampling>
                <Value>0</Value>
                <Name>Sampling_0_1ms</Name>
              </Sampling>
              <Minimum>0</Minimum>
              <Maximum>10000</Maximum>
              <IsInput>true</IsInput>
              <R>1</R>
              <B>1</B>
              <T>1</T>
              <Activation>3100</Activation>
              <Reactivation>1500</Reactivation>
              <InputFilter>0</InputFilter>
              <R1>8700</R1>
              <R2>200</R2>
              <T1>234.15</T1>
              <T2>311.15</T2>
              <ChartCalculation>false</ChartCalculation>
            </AnalogIO>`);
    } else {
      // Unused channel - configure as Not Used
      analogInputsXml.push(`            <AnalogIO>
              <Address>${aiAddress}</Address>
              <Index>${i}</Index>
              <Type>
                <Value>31</Value>
                <Name>Type_NotUsed</Name>
              </Type>
              <Scope>
                <Value>128</Value>
                <Name>Scope_NotUsed</Name>
              </Scope>
              <Sampling>
                <Value>0</Value>
                <Name>Sampling_0_1ms</Name>
              </Sampling>
              <Minimum>0</Minimum>
              <Maximum>0</Maximum>
              <IsInput>true</IsInput>
              <R>1</R>
              <B>1</B>
              <T>1</T>
              <Activation>3100</Activation>
              <Reactivation>1500</Reactivation>
              <InputFilter>0</InputFilter>
              <R1>8700</R1>
              <R2>200</R2>
              <T1>234.15</T1>
              <T2>311.15</T2>
              <ChartCalculation>false</ChartCalculation>
            </AnalogIO>`);
    }
  }

  // Generate AnalogInputsStatus for all 4 channels
  const analogStatusXml = [];
  for (let i = 0; i < 4; i++) {
    analogStatusXml.push(`            <AnalogIoStatus>
              <Address>%IWS1.${i}</Address>
              <Index>${i}</Index>
            </AnalogIoStatus>`);
  }

  return `      <Extensions>
        <ModuleExtensionObject>
          <Index>0</Index>
          <InputNb>0</InputNb>
          <OutputNb>0</OutputNb>
          <Kind>0</Kind>
          <Reference>TM3AI4/G</Reference>
          <Consumption5V>40</Consumption5V>
          <Consumption24V>0</Consumption24V>
          <TechnicalConfiguration>
            <PtoConfiguration>
              <McPowerPtoMax>0</McPowerPtoMax>
              <McMoveVelPtoMax>0</McMoveVelPtoMax>
              <McMoveRelPtoMax>0</McMoveRelPtoMax>
              <McMoveAbsPtoMax>0</McMoveAbsPtoMax>
              <McHomePtoMax>0</McHomePtoMax>
              <McSetPosPtoMax>0</McSetPosPtoMax>
              <McStopPtoMax>0</McStopPtoMax>
              <McHaltPtoMax>0</McHaltPtoMax>
              <McReadActVelPtoMax>0</McReadActVelPtoMax>
              <McReadActPosPtoMax>0</McReadActPosPtoMax>
              <McReadStsPtoMax>0</McReadStsPtoMax>
              <McReadMotionStatePtoMax>0</McReadMotionStatePtoMax>
              <McReadAxisErrorPtoMax>0</McReadAxisErrorPtoMax>
              <McResetPtoMax>0</McResetPtoMax>
              <McTouchProbePtoMax>0</McTouchProbePtoMax>
              <McAbortTriggerPtoMax>0</McAbortTriggerPtoMax>
              <McReadParPtoMax>0</McReadParPtoMax>
              <McWriteParPtoMax>0</McWriteParPtoMax>
              <McMotionTaskPtoMax>0</McMotionTaskPtoMax>
            </PtoConfiguration>
            <ComConfiguration>
              <ReadVarBasicMax>0</ReadVarBasicMax>
              <WriteVarBasicMax>0</WriteVarBasicMax>
              <WriteReadVarBasicMax>0</WriteReadVarBasicMax>
              <SendRecvMsgBasicMax>0</SendRecvMsgBasicMax>
              <SendRecvSmsMax>0</SendRecvSmsMax>
            </ComConfiguration>
            <Compatibility>0</Compatibility>
            <FastCounterMax>0</FastCounterMax>
            <FourInputsEventTask>0</FourInputsEventTask>
            <GrafcetBitsMax>0</GrafcetBitsMax>
            <InternalRamStart>0</InternalRamStart>
            <LabelsMax>0</LabelsMax>
            <LfRegistersMax>0</LfRegistersMax>
            <MemoryConstantWordsMax>0</MemoryConstantWordsMax>
            <MemoryWordsMax>0</MemoryWordsMax>
            <NumRelays>0</NumRelays>
            <NumRelaysMax>0</NumRelaysMax>
            <NumTransistors>0</NumTransistors>
            <NumTransistorsMax>0</NumTransistorsMax>
            <PidAmountMax>0</PidAmountMax>
            <PlcNumberSysBits>0</PlcNumberSysBits>
            <PlcNumberSysWords>0</PlcNumberSysWords>
            <PlcStartAddrSysBits>0</PlcStartAddrSysBits>
            <PlcType>0</PlcType>
            <TimersMax>0</TimersMax>
            <AnalogInputPrecision>0</AnalogInputPrecision>
            <AnalogOutputPrecision>0</AnalogOutputPrecision>
            <StepCountersMax>0</StepCountersMax>
            <CountersMax>0</CountersMax>
            <DrumsMax>0</DrumsMax>
            <ExternalRamSize>0</ExternalRamSize>
            <ExternalRamSizeWithDisplay>0</ExternalRamSizeWithDisplay>
            <ExternalRamStart>0</ExternalRamStart>
            <InternalRamAppStart>0</InternalRamAppStart>
            <InternalRamSize>0</InternalRamSize>
            <InternalBitsMax>0</InternalBitsMax>
            <InternalEepromSize>0</InternalEepromSize>
            <MetadataAreaSize>0</MetadataAreaSize>
            <ScheduleBlocksMax>0</ScheduleBlocksMax>
            <ShiftBitRegistersMax>0</ShiftBitRegistersMax>
            <SubroutinesMax>0</SubroutinesMax>
            <SupportDoubleWord>false</SupportDoubleWord>
            <SupportEvents>false</SupportEvents>
            <SupportFloatingPoint>false</SupportFloatingPoint>
            <NumberOf1MsTimerBase>0</NumberOf1MsTimerBase>
            <UdfbInstanceMax>0</UdfbInstanceMax>
            <UdfMax>0</UdfMax>
            <UdfObjectsMax>0</UdfObjectsMax>
          </TechnicalConfiguration>
          <DigitalInputs />
          <DigitalOutputs />
          <AnalogInputs>
${analogInputsXml.join('\n')}
          </AnalogInputs>
          <AnalogInputsStatus>
${analogStatusXml.join('\n')}
          </AnalogInputsStatus>
        </ModuleExtensionObject>
      </Extensions>`;
}

/**
 * Get PLC HardwareId based on model
 */
function getPlcHardwareId(plcModel: string): number {
  const hardwareIds: Record<string, number> = {
    'TM221CE16R': 1928, 'TM221CE16T': 1929, 'TM221CE16U': 1930,
    'TM221CE24R': 1931, 'TM221CE24T': 1932, 'TM221CE24U': 1933,
    'TM221CE40R': 1934, 'TM221CE40T': 1935, 'TM221CE40U': 1936,
    'TM221C16R': 1910, 'TM221C16T': 1911, 'TM221C16U': 1912,
    'TM221C24R': 1913, 'TM221C24T': 1914, 'TM221C24U': 1915,
    'TM221C40R': 1916, 'TM221C40T': 1917, 'TM221C40U': 1918,
    'TM221M16R': 1940, 'TM221M16T': 1941, 'TM221M32TK': 1942,
  };
  return hardwareIds[plcModel] || 1929;
}

/**
 * Sanitize POU name to valid format (no spaces, valid characters)
 */
function sanitizePOUName(name: string): string {
  let sanitized = name.replace(/\s+/g, '_');
  sanitized = sanitized.replace(/[^A-Za-z0-9_]/g, '');
  if (!/^[A-Za-z]/.test(sanitized)) {
    sanitized = 'POU_' + sanitized;
  }
  return sanitized.substring(0, 32);
}

/**
 * Generate a single POU XML section for multi-POU programs
 */
function generateSinglePOUXml(pou: POUDefinition): string {
  const sanitizedName = sanitizePOUName(pou.name);
  const rungsXml = pou.rungs.map(rung => `          <RungEntity>
            <LadderElements>
${rung.ladderElements}
            </LadderElements>
            <InstructionLines>
${rung.ilCode.map(line => `              <InstructionLineEntity><InstructionLine>${line}</InstructionLine></InstructionLineEntity>`).join('\n')}
            </InstructionLines>
            <Name>${rung.name}</Name>
            <MainComment>${rung.comment}</MainComment>
          </RungEntity>`).join('\n');

  return `      <ProgramOrganizationUnits>
        <Name>${sanitizedName}</Name>
        <SectionNumber>${pou.sectionNumber}</SectionNumber>
        <Rungs>
${rungsXml}
        </Rungs>
      </ProgramOrganizationUnits>`;
}

/**
 * Generate a complete .smbp file with multiple POUs
 */
export function generateFullSmbpMultiPOU(config: MultiPOUSmbpConfig): string {
  const { projectName, plcModel, pous, inputs = [], outputs = [], memoryBits = [], timers = [], counters = [], tm3ai4, analogInputs } = config;

  // Generate all POUs XML
  const pousXml = pous.map(pou => generateSinglePOUXml(pou)).join('\n');

  // Determine max I/O counts based on PLC model
  const maxInputs = plcModel.includes('40') ? 24 : plcModel.includes('24') ? 14 : 9;
  const maxOutputs = plcModel.includes('40') ? 16 : plcModel.includes('24') ? 10 : 7;

  // Generate extension XML for TM3AI4 if needed
  let extensionXml = '';
  if (tm3ai4) {
    extensionXml = generateExtensionFromAnalogInputs(analogInputs || []);
  } else if (analogInputs && analogInputs.length > 0) {
    extensionXml = generateExtensionFromAnalogInputs(analogInputs);
  }

  const content = `<?xml version="1.0" encoding="utf-8"?>
<ProjectDescriptor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ProjectVersion>3.0.0.0</ProjectVersion>
  <ManagementLevel>FunctLevelMan21_0</ManagementLevel>
  <Name>${projectName}</Name>
  <FullName>C:\\Users\\Hp\\Downloads\\${projectName}.smbp</FullName>
  <CurrentCultureName>en-GB</CurrentCultureName>
  <SoftwareConfiguration>
    <Pous>
${pousXml}
    </Pous>
    <Subroutines />
    <WatchLists />
    <CustomSymbols />
    <ConstantWordsMemoryAllocation />
    <MemoryBitsMemoryAllocation>
      <Allocation>Manual</Allocation>
      <ForcedCount>512</ForcedCount>
    </MemoryBitsMemoryAllocation>
    <MemoryWordsMemoryAllocation>
      <Allocation>Manual</Allocation>
      <ForcedCount>2000</ForcedCount>
    </MemoryWordsMemoryAllocation>
    <TimersMemoryAllocation />
    <CountersMemoryAllocation />
    <RegistersMemoryAllocation />
    <DrumsMemoryAllocation />
    <SbrsMemoryAllocation />
    <ScsMemoryAllocation />
    <FcsMemoryAllocation />
    <SchsMemoryAllocation />
    <HscsMemoryAllocation />
    <PtosMemoryAllocation />
    <MemoryBits>
${memoryBits.map((mb, index) => `      <MemoryBit>
        <Address>${mb.address}</Address>
        <Index>${index}</Index>
        <Symbol>${mb.symbol}</Symbol>
      </MemoryBit>`).join('\n')}
    </MemoryBits>
    <SystemBits>
      <MemoryBit>
        <Address>%S0</Address>
        <Index>0</Index>
        <Symbol>SB_COLDSTART</Symbol>
        <Comment>Indicates or executes a cold start (data initialized to default values)</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S1</Address>
        <Index>1</Index>
        <Symbol>SB_WARMSTART</Symbol>
        <Comment>Indicates there was a warm start with data backup</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S13</Address>
        <Index>13</Index>
        <Symbol>SB_FIRSTRUN</Symbol>
        <Comment>Indicates the first controller cycle in RUN mode</Comment>
      </MemoryBit>
    </SystemBits>
    <SystemWords />
    <GrafcetSteps />
    <MemoryWords />
    <MemoryDoubleWords />
    <MemoryFloats />
    <ConstantWords />
    <ConstantDoubleWords />
    <ConstantMemoryFloats />
    <Timers>
${timers.map((timer, index) => `      <TimerTM>
        <Address>${timer.address}</Address>
        <Index>${index}</Index>
        <Preset>${timer.preset}</Preset>
        <Base>${timer.base}</Base>
      </TimerTM>`).join('\n')}
    </Timers>
    <Counters>
${counters.map((counter, index) => `      <CounterCT>
        <Address>${counter.address}</Address>
        <Index>${index}</Index>
        <Preset>${counter.preset}</Preset>
      </CounterCT>`).join('\n')}
    </Counters>
    <FastCounters />
    <Registers />
    <Drums />
    <ShiftBitRegisters />
    <StepCounters />
    <ScheduleBlocks />
    <Pids />
    <MessageBlocks />
    <FunctionBlocks />
    <MotionTaskTables />
    <FastTask>
      <Period>255</Period>
    </FastTask>
    <MastTask>
      <UsePeriodScanMode>false</UsePeriodScanMode>
      <PeriodScan>100</PeriodScan>
    </MastTask>
    <CpuBehavior>
      <StartingMode>StartAsPreviousState</StartingMode>
      <RunStopAddress />
      <AutoSaveRamOnEeprom>true</AutoSaveRamOnEeprom>
      <WatchdogPeriod>250</WatchdogPeriod>
    </CpuBehavior>
    <TraceTimeBase>Time5Sec</TraceTimeBase>
    <UserFunctionPous />
    <UserFunctionBlockPous />
    <UserDefineFunctionBlocks />
  </SoftwareConfiguration>
  <HardwareConfiguration>
    <Plc>
      <Cpu>
        <Index>0</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference>${plcModel}</Reference>
        <Name>MyController</Name>
        <Consumption5V>520</Consumption5V>
        <Consumption24V>200</Consumption24V>
        <TechnicalConfiguration>
          <PtoConfiguration>
            <McPowerPtoMax>86</McPowerPtoMax>
          </PtoConfiguration>
          <ComConfiguration>
            <ReadVarBasicMax>32</ReadVarBasicMax>
          </ComConfiguration>
          <SubroutinesMax>64</SubroutinesMax>
        </TechnicalConfiguration>
${generateDigitalInputsXml(inputs, maxInputs)}
${generateDigitalOutputsXml(outputs, maxOutputs)}
        <AnalogInputs />
        <AnalogInputsStatus />
        <AnalogOutputs />
        <AnalogOutputsStatus />
        <HighSpeedCounters />
        <PulseTrainOutputs />
        <HardwareId>${getPlcHardwareId(plcModel)}</HardwareId>
        <IsExpander>false</IsExpander>
        <EthernetConfiguration>
          <IpAssignmentPolicy>Dhcp</IpAssignmentPolicy>
          <IpAddress>192.168.1.10</IpAddress>
          <SubNetMask>255.255.255.0</SubNetMask>
          <Gateway>0.0.0.0</Gateway>
          <PrimaryDns>0.0.0.0</PrimaryDns>
          <SecondaryDns>0.0.0.0</SecondaryDns>
        </EthernetConfiguration>
        <MaxCartridge>1</MaxCartridge>
        <C1TranslationX>170</C1TranslationX>
        <C1TranslationY>110</C1TranslationY>
        <C2TranslationX>0</C2TranslationX>
        <C2TranslationY>0</C2TranslationY>
        <C1SizeX>155</C1SizeX>
        <C1SizeY>190</C1SizeY>
        <C2SizeX>0</C2SizeX>
        <C2SizeY>0</C2SizeY>
        <InputAssemblys />
        <OutputAssemblys />
        <InputRegisters />
        <HoldingRegisters />
      </Cpu>
${extensionXml}
      <Cartridge1>
        <Index>0</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference />
        <AnalogInputs />
        <AnalogInputsStatus />
        <AnalogOutputs />
        <AnalogOutputsStatus />
        <HardwareId>0</HardwareId>
        <IsExpander>false</IsExpander>
      </Cartridge1>
      <SerialLineConfiguration>
        <SlaveModbusConfiguration>
          <BaudRate>Baud19200</BaudRate>
          <Parity>ParityEven</Parity>
          <StopBits>One</StopBits>
          <DataBits>8</DataBits>
          <Address>1</Address>
          <TransmissionDelay>1</TransmissionDelay>
          <TransmissionMode>ModbusRTU</TransmissionMode>
        </SlaveModbusConfiguration>
      </SerialLineConfiguration>
      <SerialLineIoScannerConfiguration>
        <Requests />
      </SerialLineIoScannerConfiguration>
    </Plc>
  </HardwareConfiguration>
  <DisplayUserLabelsConfiguration>
    <Languages>
      <UserLabelLanguage>
        <Code>English</Code>
        <Name>English</Name>
      </UserLabelLanguage>
    </Languages>
    <Translations />
  </DisplayUserLabelsConfiguration>
  <GlobalProperties>
    <UserInformations />
    <OpenedPous>
${pous.map(pou => `      <string>${sanitizePOUName(pou.name)}</string>`).join('\n')}
    </OpenedPous>
    <ZoomFactor>100</ZoomFactor>
    <SelectedPou>${sanitizePOUName(pous[0]?.name || projectName)}</SelectedPou>
    <SelectedSubroutine />
    <SelectedTimerCounterId>-1</SelectedTimerCounterId>
    <IlMode>false</IlMode>
  </GlobalProperties>
  <PrintConfiguration>
    <SoftwareConfiguration>
      <PrintLadderFormat>Ladder</PrintLadderFormat>
      <PrintPouTitle>true</PrintPouTitle>
      <PrintCompanyLogo>false</PrintCompanyLogo>
      <PrintRungNames>true</PrintRungNames>
      <PrintRungComments>true</PrintRungComments>
      <PrintRungNumbers>true</PrintRungNumbers>
      <PrintEmptyRungs>false</PrintEmptyRungs>
      <PrintReferenceCrossLadder>true</PrintReferenceCrossLadder>
      <PrintSymbolLadder>true</PrintSymbolLadder>
      <PrintSymbolCommentLadder>true</PrintSymbolCommentLadder>
      <PrintAddressLadder>true</PrintAddressLadder>
    </SoftwareConfiguration>
    <HardwareConfiguration>
      <PrintConfigurations>true</PrintConfigurations>
      <PrintModuleConfiguration>true</PrintModuleConfiguration>
      <PrintIoConfiguration>true</PrintIoConfiguration>
    </HardwareConfiguration>
    <SymbolsConfiguration>
      <PrintSymbolsList>true</PrintSymbolsList>
      <PrintSymbolAddress>true</PrintSymbolAddress>
      <PrintSymbolName>true</PrintSymbolName>
      <PrintSymbolComment>true</PrintSymbolComment>
    </SymbolsConfiguration>
    <CrossReferencesConfiguration>
      <PrintSymbolCrossReference>true</PrintSymbolCrossReference>
      <PrintUnusedSymbolCrossReference>true</PrintUnusedSymbolCrossReference>
      <PrintIoCrossReference>true</PrintIoCrossReference>
    </CrossReferencesConfiguration>
    <OtherConfiguration>
      <PrintFreeComments>true</PrintFreeComments>
    </OtherConfiguration>
    <GlobalConfiguration>
      <PrintProjectsInfo>true</PrintProjectsInfo>
      <PrintSignatureArea>true</PrintSignatureArea>
    </GlobalConfiguration>
  </PrintConfiguration>
  <ReportConfiguration>
    <PrintSymbol>true</PrintSymbol>
    <PrintComment>true</PrintComment>
    <PageSetup>
      <Top>100</Top>
      <Bottom>100</Bottom>
      <Left>100</Left>
      <Right>100</Right>
    </PageSetup>
    <SubReportConfigurations />
  </ReportConfiguration>
</ProjectDescriptor>`;

  // Convert LF to CRLF (Windows line endings required by Machine Expert Basic)
  return content.replace(/\n/g, '\r\n');
}
