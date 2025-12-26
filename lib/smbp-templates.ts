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

  // Add line elements from column 2 to 9
  ladderElements += '\n' + generateLineElements(2, 9);

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

  // Add line elements from column 2 to 9
  ladderElements += '\n' + generateLineElements(2, 9);

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
  const { projectName, plcModel, rungs, inputs = [], outputs = [], memoryBits = [], timers = [], counters = [], tm3ai4 } = config;

  // Get PLC hardware ID
  const hardwareIds: Record<string, number> = {
    'TM221CE16T': 1925,
    'TM221CE24T': 1933,
    'TM221CE40T': 1941,
    'TM221CE16R': 1921,
    'TM221CE24R': 1929,
    'TM221CE40R': 1937,
  };
  const hardwareId = hardwareIds[plcModel] || 1925;

  // Get I/O counts
  const ioCounts: Record<string, { inputs: number; outputs: number }> = {
    'TM221CE16T': { inputs: 9, outputs: 7 },
    'TM221CE24T': { inputs: 14, outputs: 10 },
    'TM221CE40T': { inputs: 24, outputs: 16 },
    'TM221CE16R': { inputs: 9, outputs: 7 },
    'TM221CE24R': { inputs: 14, outputs: 10 },
    'TM221CE40R': { inputs: 24, outputs: 16 },
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
  const extensionsXml = tm3ai4
    ? `<Extensions>
${generateTM3AI4Xml(tm3ai4)}
      </Extensions>`
    : '<Extensions />';

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
    <SystemBits />
    <SystemWords />
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
    // Note: Do NOT add Comment tag - Machine Expert Basic doesn't expect it in DiscretInput
    inputsXml.push(`          <DiscretInput>
            <Address>%I0.${i}</Address>
            <Index>${i}</Index>${input ? `
            <Symbol>${input.symbol}</Symbol>` : ''}
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
    // Note: Do NOT add Comment tag - Machine Expert Basic doesn't expect it in DiscretOutput
    outputsXml.push(`          <DiscretOutput>
            <Address>%Q0.${i}</Address>
            <Index>${i}</Index>${output ? `
            <Symbol>${output.symbol}</Symbol>` : ''}
          </DiscretOutput>`);
  }

  return `        <DigitalOutputs>
${outputsXml.join('\n')}
        </DigitalOutputs>`;
}
