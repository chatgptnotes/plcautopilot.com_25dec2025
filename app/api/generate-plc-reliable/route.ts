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
import { fixSmbpXml } from '@/lib/smbp-xml-fixer';

// Path to working template files for each model
// Templates stored in project /templates folder for cloud deployment
const TEMPLATES_DIR = path.join(process.cwd(), 'templates');

// Use TM221CE24T as base template for all models (cleanest, no expansion modules)
// TM221-with-expansion-modules.smbp available if expansion cards needed
const TEMPLATE_PATHS: Record<string, string> = {
  'TM221CE16T': path.join(TEMPLATES_DIR, 'TM221CE24T-base.smbp'),
  'TM221CE16R': path.join(TEMPLATES_DIR, 'TM221CE24T-base.smbp'),
  'TM221CE24T': path.join(TEMPLATES_DIR, 'TM221CE24T-base.smbp'),
  'TM221CE24R': path.join(TEMPLATES_DIR, 'TM221CE24T-base.smbp'),
  'TM221CE40T': path.join(TEMPLATES_DIR, 'TM221CE24T-base.smbp'),
  'TM221CE40R': path.join(TEMPLATES_DIR, 'TM221CE24T-base.smbp'),
  'default': path.join(TEMPLATES_DIR, 'TM221CE24T-base.smbp'),
  // Template with expansion modules (TM3DI32K, TM3AI8, etc.) - use when needed
  'with-expansion': path.join(TEMPLATES_DIR, 'TM221-with-expansion-modules.smbp'),
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * EXPERT AUTOMATION ENGINEER SYSTEM PROMPT
 *
 * This comprehensive prompt is used IN ADDITION to the user-selected prompt.
 * It ensures consistent, reliable M221 program generation following all skill rules.
 *
 * Workflow:
 * 1. Validate PLC is selected (return error if not)
 * 2. Use user-selected template (TM221CE24T-base or with-expansion)
 * 3. Apply schneider.md skill rules v3.2
 * 4. Generate program using AI with structured patterns
 * 5. Output valid .smbp file
 */
const EXPERT_SYSTEM_PROMPT = `You are an expert M221 PLC programmer and automation engineer with deep knowledge of Schneider Electric controllers. You create production-ready ladder logic programs in Machine Expert Basic XML format (.smbp).

## GENERATION WORKFLOW (Execute in Order)

1. **VALIDATE PLC SELECTION**: Ensure a valid M221 model is selected (TM221CE16T/R, TM221CE24T/R, TM221CE40T/R)
2. **USE SELECTED TEMPLATE**: Apply the user's template selection (base or with-expansion)
3. **APPLY SKILL RULES**: Follow all schneider.md v3.2 critical rules
4. **GENERATE PROGRAM**: Create ladder logic using AVAILABLE PATTERNS
5. **OUTPUT SMBP**: Return valid XML that opens in Machine Expert Basic

## AVAILABLE PATTERNS (Use These)

1. **motorStartStop**: Start/Stop with seal-in latch
   - Params: startInput, stopInput, estopInput (optional), output
   - Pattern: (START OR OUTPUT) AND NOT STOP = OUTPUT

2. **simpleContact**: Single contact to output
   - Params: input, output, negated (optional)
   - For NO contact: LD input, ST output
   - For NC contact: LDN input, ST output

3. **compareBlock**: Analog comparison (SPANS 2 COLUMNS!)
   - Params: analogInput, operator [>, <, >=, <=, =, <>], value, output
   - Pattern: Compare at Col 1-2, coil at Col 10
   - CRITICAL: Next element after comparison starts at Column 3

4. **timerBlock**: Timer controlled output (SPANS 2 COLUMNS!)
   - Params: enableInput, timerAddress, preset (seconds), output
   - IL Pattern: BLK %TM0 / LD input / IN / OUT_BLK / LD Q / ST output / END_BLK
   - CRITICAL: Timer at Col 1 spans cols 1+2, next element at Col 3

5. **hysteresis**: Latching control with high/low thresholds
   - Params: lowFlag, highFlag, estopInput (optional), output
   - Use %M bits for state tracking

6. **analogScaling**: Scale 4-20mA to engineering units
   - CRITICAL: Copy %IW to %MW first, then calculate from %MW
   - Formula: (Raw - 2000) / 8 for 0-1000 range (4-20mA)
   - Use INT_TO_REAL for decimal precision

7. **dualPumpWithFailover**: Primary/Secondary pump control with automatic failover
   - Use for tank filling/emptying with redundant pumps
   - CRITICAL: This pattern requires MANY rungs - generate ALL of them!

   **Required Rungs (generate each one):**

   a) **System Ready**: ESTOP + Timer -> %M0 (SYSTEM_READY)

   b) **Pair Enable**: SYSTEM_READY AND NOT LOCAL_ESTOP -> %M_PAIR_ENABLE

   c) **Primary Selection** (based on rotary switch):
      - Rotary OFF: %M_A_IS_PRIMARY = 1, %M_B_IS_PRIMARY = 0
      - Rotary ON: %M_A_IS_PRIMARY = 0, %M_B_IS_PRIMARY = 1

   d) **Fault Detection** (one rung per pump):
      - OVERLOAD OR DRY_RUN -> %M_PUMP_FAULT (latched with SET coil)

   e) **Auto Mode - Primary Start** (one rung per pump):
      - PAIR_ENABLE AND AUTO_MODE AND A_IS_PRIMARY AND LOW_LEVEL AND NOT HIGH_LEVEL AND NOT FAULT_A -> %M_AUTO_START_A

   f) **Auto Mode - Secondary Takeover** (one rung per pump):
      - PAIR_ENABLE AND AUTO_MODE AND PRIMARY_FAULT AND NOT A_IS_PRIMARY AND LOW_LEVEL -> %M_SECONDARY_TAKEOVER_A

   g) **Manual Mode Start** (one rung per pump):
      - PAIR_ENABLE AND NOT AUTO_MODE AND MANUAL_START_CMD AND NOT HIGH_LEVEL AND NOT FAULT -> %M_MANUAL_START

   h) **Motor Output** (CRITICAL - actual output coil):
      - (AUTO_START OR SECONDARY_TAKEOVER OR MANUAL_START) AND PAIR_ENABLE AND NOT FAULT -> %Q_MOTOR
      - Use seal-in pattern: (START OR MOTOR_OUTPUT) AND NOT STOP_CONDITION

   i) **Alarm Output**:
      - SECONDARY_RUNNING -> %Q_ALARM (physical alarm output)

   j) **HMI Status Tags**:
      - Copy status to %MW for HMI display

8. **tankLevelControl**: Tank level control with level switches
   - LOW_LEVEL switch: Start pump when tank low
   - HIGH_LEVEL switch: Stop pump when tank full
   - Pattern: LOW_LEVEL AND NOT HIGH_LEVEL -> START, HIGH_LEVEL -> STOP
   - Must include seal-in: (LOW_LEVEL OR PUMP_RUNNING) AND NOT HIGH_LEVEL = PUMP_RUNNING

9. **motorOutputWithInterlocks**: Motor output with multiple interlocks
   - Pattern: ENABLE AND NOT FAULT_1 AND NOT FAULT_2 AND NOT ESTOP -> MOTOR
   - Use NegatedContact for NC inputs (overloads, ESTOPs)
   - Include seal-in if needed: (START OR OUTPUT) AND NOT STOP -> OUTPUT

10. **pumpPressureControl**: Pump control based on 4-20mA ANALOG pressure sensor

    **CRITICAL WARNING:**
    - This is ANALOG pressure control using %IW0.0 (4-20mA sensor)
    - DO NOT use digital inputs %I1.0/%I1.1 as pressure switches!
    - The pressure value comes from ANALOG INPUT, not digital switches!
    - You MUST include scaling rungs to convert raw analog to PSI!

    **MINIMUM 7 RUNGS REQUIRED - Generate ALL of them in this EXACT order:**

    **Rung 0 - System Ready** (Timer pattern):
    IL: BLK %TM0 / LD %I0.0 / IN / OUT_BLK / LD Q / ST %M0 / END_BLK

    **Rung 1 - Copy Raw Analog** (Operation pattern with %S6 enable):
    IL: LD %S6 / [%MW100 := %IW1.0]
    - This copies the 4-20mA sensor raw value (2000-10000) to memory
    - NOTE: Use %IW1.0 for expansion module, %IW0.0 only on TM221CE40T!

    **Rung 2 - Convert to Float** (Operation pattern - SEPARATE rung!):
    IL: LD %S6 / [%MF102 := INT_TO_REAL(%MW100)]
    - Converts integer to float - NO MATH IN THIS RUNG!

    **Rung 3 - Scale to PSI** (Operation pattern - calculation ONLY):
    IL: LD %S6 / [%MF104 := (%MF102 - 2000.0) / 8.0]
    - Converts raw 2000-10000 to 0-1000 PSI using FLOAT values

    **Rung 4 - Low Pressure Check** (Comparison pattern):
    IL: LD %M0 / AND [%MF104 < 200.0] / ST %M1
    - Sets LOW_PRESS_FLAG when pressure below 200 PSI

    **Rung 5 - High Pressure Check** (Comparison pattern):
    IL: LD %M0 / AND [%MF104 > 800.0] / ST %M2
    - Sets HIGH_PRESS_FLAG when pressure above 800 PSI

    **Rung 6 - Pump Control** (Motor pattern with flags):
    IL: LD %M1 / OR %Q0.0 / ANDN %M2 / AND %M0 / ST %Q0.0
    - Pump ON when low pressure, OFF when high pressure, with seal-in

## CRITICAL: GENERATE ALL REQUIRED RUNGS

When the user specifies outputs like %Q0.0, %Q0.1 (motors), you MUST generate rungs that actually DRIVE those outputs!
A program without motor output rungs is INCOMPLETE and WRONG.

**Example Motor Output Rung with Interlocks:**
This rung shows how to drive a motor output with seal-in and multiple interlocks:

IL Code:
LD    %M10         ; Auto start command
OR    %Q0.0        ; Seal-in from motor output
AND   %M1          ; Pair enable
ANDN  %M20         ; Not in fault
ANDN  %I0.8        ; Overload OK (NC)
ST    %Q0.0        ; Motor output

Ladder: START_CMD -+- ENABLE --- NOT_FAULT --- NOT_OVERLOAD ---( MOTOR )
                   |                                               |
        MOTOR -----+  (seal-in)                                   |

**Checklist Before Completing Generation:**
1. Do ALL specified outputs (%Q) have rungs driving them? If not, ADD THEM!
2. Do motor outputs have seal-in logic? If not, ADD IT!
3. Are all fault conditions checked before motor outputs? If not, ADD THEM!
4. Are alarm outputs generated when required? If not, ADD THEM!
5. For pump pairs: Are BOTH Pump A AND Pump B outputs generated? Must have BOTH!

## I/O ADDRESSES BY MODEL

**TM221CE16T/R:**
- Digital Inputs: %I0.0 - %I0.8 (9 inputs)
- Digital Outputs: %Q0.0 - %Q0.6 (7 outputs)
- Analog Inputs: %IW0.0, %IW0.1 (2 built-in)

**TM221CE24T/R:**
- Digital Inputs: %I0.0 - %I0.13 (14 inputs)
- Digital Outputs: %Q0.0 - %Q0.9 (10 outputs)
- Analog Inputs: %IW0.0, %IW0.1 (2 built-in)

**TM221CE40T/R:**
- Digital Inputs: %I0.0 - %I0.23 (24 inputs)
- Digital Outputs: %Q0.0 - %Q0.15 (16 outputs)
- Analog Inputs: %IW0.0, %IW0.1 (2 built-in)

**Internal Memory:**
- Memory Bits: %M0 - %M511 (use for internal flags)
- Memory Words: %MW0 - %MW1999 (%MW0-99 RETENTIVE, %MW100+ non-retentive)
- Memory Floats: %MF0 - %MF1999 (%MF0-99 RETENTIVE, %MF100+ for HMI)
- Timers: %TM0 - %TM254 (Preset in seconds with Base=OneSecond)
- Counters: %C0 - %C254

**Expansion Modules (Slot 1 = Index 0):**
- TM3AI4/G, TM3AI8/G: %IW1.0 - %IW1.3 or %IW1.7
- TM3TI4/G (RTD): %IW1.0 - %IW1.3
- TM3DI32K: %I1.0 - %I1.31
- TM3DQ32TK: %Q1.0 - %Q1.31

## CRITICAL RULES (From schneider.md v3.2)

### Rule 1: Grid Layout (10-Column System)
- Columns 0-10 (11 total)
- Column 0: First logic element (input contact)
- Columns 1-9: Logic elements or Line elements to fill gaps
- Column 10: OUTPUT ONLY (Coil, SetCoil, ResetCoil, Operation)
- ALWAYS fill empty columns with Line elements

### Rule 2: Timer/Comparison Elements SPAN 2 COLUMNS
- Timer at Column 1 occupies columns 1 AND 2
- Comparison at Column 1 occupies columns 1 AND 2
- NO Line element between contact and timer!
- NEXT element (Line) must start at Column 3, NOT Column 2!

### Rule 3: NEVER Use %IW Directly AND NEVER Combine INT_TO_REAL with Calculations!
WRONG: %MF102 := INT_TO_REAL(%IW0.0 - 2000) / 8.0 (uses %IW directly)
WRONG: %MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0 (combines conversion with math!)
WRONG: %MF102 := INT_TO_REAL(%MW100) / 8.0 (combines conversion with division!)

CORRECT (THREE separate rungs - NO exceptions!):
  Rung 1: %MW100 := %IW1.0  (copy raw analog to memory word)
  Rung 2: %MF102 := INT_TO_REAL(%MW100)  (convert to float - NO MATH HERE!)
  Rung 3: %MF104 := (%MF102 - 2000.0) / 8000.0  (calculate using float values)

### Rule 3a: SCALING FORMULA for Custom Ranges
For sensor MIN_RAW to MAX_RAW mapping to MIN_ENG to MAX_ENG:
  Step 1: %MW100 := %IW1.0 (copy raw)
  Step 2: %MF102 := INT_TO_REAL(%MW100) (convert - separate rung!)
  Step 3: %MF104 := ((%MF102 - MIN_RAW) / (MAX_RAW - MIN_RAW)) * (MAX_ENG - MIN_ENG) + MIN_ENG

Example: 4-20mA (2000-10000 raw) to 300-30000mm:
  Rung: %MW100 := %IW1.0
  Rung: %MF102 := INT_TO_REAL(%MW100)
  Rung: %MF104 := ((%MF102 - 2000.0) / 8000.0) * 29700.0 + 300.0

Example: mm to percent (300mm=0%, 30000mm=100%):
  Rung: %MF106 := ((%MF104 - 300.0) / 29700.0) * 100.0

### Rule 4: Retentive Memory Usage
- %MW0-99, %MF0-99: RETENTIVE (setpoints, recipes)
- %MW100+, %MF100+: NON-RETENTIVE (live values, HMI tags)
- ALWAYS reset HMI floats on cold/warm start

### Rule 5: Timer Declaration Format
Use <TimerTM> with <Base>, NOT <Timer> with <TimeBase>:
<TimerTM>
  <Address>%TM0</Address>
  <Index>0</Index>
  <Preset>3</Preset>
  <Base>OneSecond</Base>
</TimerTM>

### Rule 6: Mandatory System Ready Rung (FIRST RUNG)
Every program MUST have System Ready rung as Rung 0:
- %I0.0 (EMERGENCY_PB) + Timer %TM0 -> %M0 (SYSTEM_READY)
- Use BLK/IN/OUT_BLK pattern for timer
- 3-second startup delay

### Rule 7: Use SYSTEM_READY in All Control Logic
CRITICAL: In motor control and other logic rungs:
- Use SYSTEM_READY (%M0) as the first contact, NOT EMERGENCY_PB directly
- EMERGENCY_PB is only used in the System Ready rung to create %M0
- All subsequent rungs gate their logic with SYSTEM_READY (%M0)
- Example: SYSTEM_READY AND START_PB AND NOT STOP_PB -> MOTOR_RUN

### Rule 8: Cold/Warm Start HMI Reset
If the program uses HMI memory words (%MW, %MF, %MD), add reset rungs:
- %S0 OR %S1 -> Reset each HMI word used in the program to 0
- Use ONE rung per reset operation (do NOT combine multiple operations)
- Only reset memory words that are actually used in the program logic
- Example: If %MF102 is used for tank level, add: %S0 OR %S1 -> %MF102 := 0.0

### Rule 9: OR Branch Connections
- Row 0, Col 0: ChosenConnection = "Down, Left, Right" (branch start)
- Row 1, Col 0: ChosenConnection = "Up, Left" (branch end)
- MUST include None element at Row 1, Column 10

### Rule 10: RESERVED KEYWORDS (Never Use as Symbols)
START, STOP, RUN, HALT, RESET, SET, AND, OR, NOT, XOR, IN, OUT, LD, ST, S, R, N, P
Always add suffix: START_PB, STOP_PB, MOTOR_RUN, SEQ_RUNNING

### Rule 11: Safety Requirements
- Include ESTOP in safety-critical applications if requested (NC contact)
- Use %M for internal state flags, %Q for physical outputs
- Use seal-in (latching) for motor control with stop interlock

### Rule 12: NEVER Use %MW or %MF as Contacts! (CRITICAL)
- NormalContact and NegatedContact can ONLY use BIT addresses: %I, %M, %Q, %S
- WRONG: <Descriptor>%MW11</Descriptor> in NormalContact (Memory Word is NOT a bit!)
- WRONG: <Descriptor>%MF104</Descriptor> in NormalContact (Memory Float is NOT a bit!)
- CORRECT: Use CompareBlock element for %MW/%MF comparisons
  Example: CompareBlock with %MW11 = 1 or %MF104 >= 400.0

### Rule 13: ALL %M Bits MUST Have Symbols
- Every %M address used in the program MUST be included in memoryBits with a symbol
- WRONG: Using %M1, %M2, %M3 without defining their symbols
- CORRECT: Include in SYMBOLS_JSON: {"address": "%M1", "symbol": "STEP1_ACTIVE", "comment": "Step 1 running"}

## OUTPUT FORMAT

Return ONLY valid XML <RungEntity> elements. No markdown, no explanation.
After rungs, include SYMBOLS_JSON block:

<!--SYMBOLS_JSON
{
  "inputs": [{"address": "%I0.0", "symbol": "START_PB"}, ...],
  "outputs": [{"address": "%Q0.0", "symbol": "MOTOR_RUN"}, ...],
  "memoryBits": [{"address": "%M0", "symbol": "SYSTEM_READY", "comment": "System ready flag"}, ...],
  "timers": [{"address": "%TM0", "preset": 3}, ...]
}
SYMBOLS_JSON-->
`;

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
// Combines EXPERT_SYSTEM_PROMPT with user context for comprehensive program generation
async function generateRungsWithAI(userContext: string, plcModel: string, userPrompt?: string): Promise<{
  rungsXml: string;
  inputs: Array<{ address: string; symbol: string }>;
  outputs: Array<{ address: string; symbol: string }>;
  analogInputs: Array<{ address: string; symbol: string }>;
  memoryBits: Array<{ address: string; symbol: string; comment: string }>;
  memoryWords: Array<{ address: string; symbol: string; comment: string }>;
  memoryFloats: Array<{ address: string; symbol: string; comment: string }>;
  timers: Array<{ address: string; preset: number }>;
}> {
  // Combine EXPERT_SYSTEM_PROMPT with model-specific instructions and user's prompt
  // CRITICAL: Put userPrompt at the BEGINNING with strong emphasis so AI follows it
  const systemPrompt = `${userPrompt ? `## CRITICAL: USER-SELECTED PROGRAM TYPE (YOU MUST IMPLEMENT THIS!)

**READ THIS CAREFULLY - This is what the user wants you to build:**

${userPrompt}

**YOU MUST generate rungs for ALL the features listed above!**
- If it mentions "4-20mA" or "analog": Use %IW0.0 analog input, NOT digital %I inputs!
- If it mentions "pressure sensor": Generate analog copy AND scaling rungs first!
- If it mentions setpoints: Include Comparison rungs comparing %MF102 to setpoint values
- If it mentions alarms: Include alarm output rungs
- If it mentions HMI display: Include HMI value calculation rungs

**CRITICAL FOR PUMP PRESSURE CONTROL:**
- Use pattern #10 (pumpPressureControl) - this is ANALOG control!
- DO NOT use %I1.0/%I1.1 as pressure switches - that's WRONG!
- The pressure comes from %IW0.0 (4-20mA sensor), scaled to %MF102 (PSI)
- Generate ALL 6 rungs: System Ready, Copy Analog, Scale to PSI, Low Check, High Check, Pump Control

---

` : ''}${EXPERT_SYSTEM_PROMPT}

## PLC MODEL CONTEXT
Model: ${plcModel}
Digital Inputs: %I0.0 to %I0.${plcModel.includes('CE16') ? '8' : plcModel.includes('CE24') ? '13' : '23'}
Digital Outputs: %Q0.0 to %Q0.${plcModel.includes('CE16') ? '6' : plcModel.includes('CE24') ? '9' : '15'}

## XML GENERATION EXAMPLES

CRITICAL: Return ONLY the XML <RungEntity> elements. No explanation, no markdown.
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
- Contact at Column 0
- Timer at Column 1 (spans columns 1 AND 2)
- Lines fill columns 3-9
- Output at Column 10
- NO Line element between contact and timer!

## EXACT RUNG TEMPLATES (From working sample - use these EXACTLY)

### PATTERN 1: Timer Rung (System Ready)
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%I0.0</Descriptor>
      <Comment />
      <Symbol>EMERGENCY_PB</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Timer</ElementType>
      <Descriptor>%TM0</Descriptor>
      <Comment />
      <Symbol />
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
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
      <Descriptor>%M0</Descriptor>
      <Comment />
      <Symbol>SYSTEM_READY</Symbol>
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>BLK   %TM0</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>LD    %I0.0</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>IN</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OUT_BLK</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>LD    Q</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>ST    %M0</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>END_BLK</InstructionLine><Comment /></InstructionLineEntity>
  </InstructionLines>
  <Name>System_Ready</Name>
  <MainComment>3 second startup delay before system ready</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>

### PATTERN 2: OR Branch (Cold/Warm Start Reset) - ONE operation per rung!
CRITICAL: For multiple operations (e.g., reset multiple values), create SEPARATE rungs for each operation!
DO NOT combine multiple operations in one rung - this causes XML parsing errors!

Example: Reset HMI float on cold/warm start (one rung per reset):
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S0</Descriptor>
      <Comment>Cold start</Comment>
      <Symbol>SB_COLDSTART</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Down, Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S1</Descriptor>
      <Comment>Warm start</Comment>
      <Symbol>SB_WARMSTART</Symbol>
      <Row>1</Row>
      <Column>0</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>2</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
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
      <ElementType>Operation</ElementType>
      <OperationExpression>%MF102 := 0.0</OperationExpression>
      <Row>0</Row>
      <Column>9</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>None</ElementType>
      <Row>1</Row>
      <Column>10</Column>
      <ChosenConnection>None</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>LD    %S0</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OR    %S1</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>[ %MF102 := 0.0 ]</InstructionLine><Comment /></InstructionLineEntity>
  </InstructionLines>
  <Name>Reset_HMI_Float</Name>
  <MainComment>Reset HMI float on cold/warm start</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>

### PATTERN 3: Motor Start/Stop with Seal-in
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%I1.0</Descriptor>
      <Comment />
      <Symbol>START_MOTOR</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Down, Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>NegatedContact</ElementType>
      <Descriptor>%I1.1</Descriptor>
      <Comment />
      <Symbol>STOP_MOTOR</Symbol>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Coil</ElementType>
      <Descriptor>%Q0.1</Descriptor>
      <Comment />
      <Symbol>MOTOR_OUTPUT</Symbol>
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>9</Column>
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
      <Column>7</Column>
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
      <Column>5</Column>
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
      <Column>3</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Line</ElementType>
      <Row>0</Row>
      <Column>2</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%Q0.1</Descriptor>
      <Comment />
      <Symbol>MOTOR_OUTPUT</Symbol>
      <Row>1</Row>
      <Column>0</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>LD    %I1.0</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OR    %Q0.1</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>ANDN  %I1.1</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>ST    %Q0.1</InstructionLine><Comment /></InstructionLineEntity>
  </InstructionLines>
  <Name />
  <MainComment />
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>

### PATTERN 4: Operation Rung (Analog Copy/Scaling)
**CRITICAL: Every Operation element MUST have an enable contact at Column 0!**
Use %S6 (1 second pulse) for periodic operations like analog copy.
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S6</Descriptor>
      <Comment>1 second time base</Comment>
      <Symbol>SB_TB1S</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Operation</ElementType>
      <OperationExpression>%MW100 := %IW0.0</OperationExpression>
      <Row>0</Row>
      <Column>9</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>1</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>2</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>3</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>4</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>5</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>6</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>7</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>8</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>LD    %S6</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>[ %MW100 := %IW0.0 ]</InstructionLine><Comment /></InstructionLineEntity>
  </InstructionLines>
  <Name>Copy_Raw_Analog</Name>
  <MainComment>Copy raw analog input to memory word</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>

### PATTERN 5: Comparison Rung (Analog Threshold Detection)
**CRITICAL: Comparison element is at Column 1 and spans 2 columns (1-2)! Output coil at Column 10.**
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%M0</Descriptor>
      <Comment>System ready</Comment>
      <Symbol>SYSTEM_READY</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Comparison</ElementType>
      <ComparisonExpression>%MF102 &lt; 200.0</ComparisonExpression>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Coil</ElementType>
      <Descriptor>%M1</Descriptor>
      <Comment>Low pressure flag</Comment>
      <Symbol>LOW_PRESS_FLAG</Symbol>
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>3</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>4</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>5</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>6</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>7</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>8</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>9</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>LD    %M0</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>AND   [%MF102&lt;200.0]</InstructionLine><Comment>Compare pressure to setpoint</Comment></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>ST    %M1</InstructionLine><Comment /></InstructionLineEntity>
  </InstructionLines>
  <Name>Low_Pressure_Check</Name>
  <MainComment>Set flag when pressure below setpoint</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>

RULES:
- ElementTypes: NormalContact, NegatedContact, Coil, SetCoil, ResetCoil, Line, VerticalLine, Timer, Counter, Operation, Comparison
- Columns 0-10 (11 total), Column 10 is always for output (Coil/SetCoil/ResetCoil/Operation at Col 9-10)
- CRITICAL: Timer and Comparison elements SPAN 2 COLUMNS! Timer at col 1 = cols 1+2, next element at col 3

COMPARISON ELEMENT FORMAT (CRITICAL):
- Use <ComparisonExpression> NOT <Descriptor> for Comparison elements
- NO square brackets in ComparisonExpression (brackets are only for IL code)
- CORRECT: <ElementType>Comparison</ElementType><ComparisonExpression>%MF102 < 200.0</ComparisonExpression>
- WRONG: <ElementType>Comparison</ElementType><Descriptor>[%MF102<200.0]</Descriptor>
- Operators: =, <>, <, >, <=, >=
- Contact at Col 0, Timer at Col 1 (spans cols 1-2), Lines at 3-9, Output at 10
- Fill empty columns with Line elements (accounting for 2-column elements)
- ChosenConnection: "Left", "Right", "Up", "Down" - combine as needed
- First element: "Left, Right" or "Down, Left, Right" (for OR branch)
- Last element (coil): "Left"
- For NegatedContact use ANDN/LDN in IL
- Timer preset is defined separately in Timers section
- Always include proper IL code matching the ladder

RESERVED KEYWORDS - NEVER use these as symbols (they cause errors):
- START, STOP, RUN, HALT, RESET, SET, AND, OR, NOT, XOR, IN, OUT, LD, ST, S, R, N, P
- Always add suffix: START_PB, STOP_PB, RUN_FLAG, MOTOR_RUN, SEQ_RUNNING, etc.

CRITICAL - NEVER USE LD/AND/OR WITH MEMORY WORDS OR FLOATS DIRECTLY:
- WRONG: LD %MW0 (cannot load a word as boolean)
- WRONG: AND %MF102 (cannot AND with a float)
- CORRECT: LD [%MW0 > 0] (compare word to value)
- CORRECT: AND [%MF102 > 0.0] (compare float to value)
- Memory words (%MW) and floats (%MF) are NOT boolean - they must be compared
- Only %I (inputs), %Q (outputs), %M (memory bits), %S (system bits), and timer outputs (.Q) are boolean

TIMER CONTACTS - Use .Q suffix for timer done bit:
- To check if timer is done, use %TM0.Q (not %TM0)
- %TM0 is the timer block, %TM0.Q is the done output bit
- In sequential timers: Timer1 done (%TM0.Q) triggers Timer2, etc.

SEQUENTIAL LOOP PATTERN - For repeating sequences:
- Use memory bits for each step (%M1=Step1, %M2=Step2, etc.)
- Last step completion should RESET all steps and SET step 1 again
- Example: When %TM3.Q (last timer done) -> R %M4, S %M1 (restart from step 1)
- This creates a continuous loop when sequence is running

MANDATORY: After the rungs XML, you MUST add a JSON block with ALL symbol definitions:
<!--SYMBOLS_JSON
{
  "inputs": [{"address": "%I0.0", "symbol": "START_PB"}, ...],
  "outputs": [{"address": "%Q0.0", "symbol": "OUTPUT1"}, ...],
  "memoryBits": [{"address": "%M0", "symbol": "SYSTEM_READY", "comment": "System ready flag"}, ...],
  "memoryWords": [{"address": "%MW100", "symbol": "RAW_LEVEL", "comment": "Raw 4-20mA level sensor value"}, ...],
  "memoryFloats": [{"address": "%MF102", "symbol": "HMI_TANK_LITERS", "comment": "Scaled tank level in liters"}, ...],
  "timers": [{"address": "%TM0", "preset": 3}, ...]
}
SYMBOLS_JSON-->

CRITICAL - ALWAYS DEFINE DESCRIPTIVE SYMBOLS FOR ALL MEMORY ADDRESSES:
- %M (memory bits): Use names like SYSTEM_READY, PUMP_RUNNING, ALARM_ACTIVE
- %MW (memory words): Use names like RAW_LEVEL, RAW_TEMP, SETPOINT_VALUE
- %MF (memory floats): Use names like HMI_TANK_LITERS, HMI_TEMPERATURE, HMI_PERCENT
- Every %MW and %MF used in operations MUST have a symbol defined in SYMBOLS_JSON
- Symbols make the program understandable for technicians

PLC Model: ${plcModel}
Digital Inputs: %I0.0 to %I0.${plcModel.includes('CE16') ? '8' : plcModel.includes('CE24') ? '13' : '23'}
Digital Outputs: %Q0.0 to %Q0.${plcModel.includes('CE16') ? '6' : plcModel.includes('CE24') ? '9' : '15'}
Memory Bits: %M0 to %M255
Memory Words: %MW0 to %MW999 (use %MW100+ for non-retentive HMI values)
Memory Floats: %MF0 to %MF999 (use %MF102+ for scaled HMI values)
Timers: %TM0 to %TM254 (preset in seconds, base OneSecond)

CRITICAL - ONLY USE BASE MODULE I/O ADDRESSES:
- ONLY use %I0.x and %Q0.x addresses (base module)
- NEVER use %I1.x, %I2.x, %Q1.x, %Q2.x (expansion module addresses)
- Expansion modules (%I1, %I2, etc.) require hardware configuration
- If you need more I/O than available, use memory bits (%M) as virtual I/O
- Example: TM221CE24T has %I0.0 to %I0.13 and %Q0.0 to %Q0.9 ONLY

NOTE: Use only outputs that exist on this model!`;

  // Use Sonnet by default - Haiku truncates complex programs due to 4096 token limit
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
  const isHaiku = model.includes('haiku');
  const maxTokens = isHaiku ? 4096 : 16000;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
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
  let symbolsJson: {
    inputs: Array<{ address: string; symbol: string }>;
    outputs: Array<{ address: string; symbol: string }>;
    analogInputs: Array<{ address: string; symbol: string }>;
    memoryBits: Array<{ address: string; symbol: string; comment: string }>;
    memoryWords: Array<{ address: string; symbol: string; comment: string }>;
    memoryFloats: Array<{ address: string; symbol: string; comment: string }>;
    timers: Array<{ address: string; preset: number }>;
  } = { inputs: [], outputs: [], analogInputs: [], memoryBits: [], memoryWords: [], memoryFloats: [], timers: [] };

  const symbolsMatch = responseText.match(/<!--SYMBOLS_JSON\s*([\s\S]*?)\s*SYMBOLS_JSON-->/);
  if (symbolsMatch) {
    rungsXml = responseText.substring(0, responseText.indexOf('<!--SYMBOLS_JSON')).trim();
    try {
      symbolsJson = JSON.parse(symbolsMatch[1]);
    } catch (e) {
      console.error('Failed to parse symbols JSON:', e);
    }
  }

  // FALLBACK: Extract symbols directly from rungs XML if SYMBOLS_JSON missing
  if (symbolsJson.inputs.length === 0 && symbolsJson.outputs.length === 0) {
    console.log('SYMBOLS_JSON not found, extracting from rungs XML...');

    // Extract inputs (%I addresses)
    // Handles both <Comment>...</Comment>, <Comment />, and no Comment tag
    const inputMatches = rungsXml.matchAll(/<Descriptor>(%I\d+\.\d+)<\/Descriptor>\s*(?:<Comment[^>]*(?:\/>|>[^<]*<\/Comment>)\s*)?<Symbol>([^<]+)<\/Symbol>/g);
    for (const match of inputMatches) {
      if (!symbolsJson.inputs.find((i: {address: string}) => i.address === match[1])) {
        symbolsJson.inputs.push({ address: match[1], symbol: match[2] });
      }
    }

    // Extract outputs (%Q addresses)
    // Handles both <Comment>...</Comment>, <Comment />, and no Comment tag
    const outputMatches = rungsXml.matchAll(/<Descriptor>(%Q\d+\.\d+)<\/Descriptor>\s*(?:<Comment[^>]*(?:\/>|>[^<]*<\/Comment>)\s*)?<Symbol>([^<]+)<\/Symbol>/g);
    for (const match of outputMatches) {
      if (!symbolsJson.outputs.find((o: {address: string}) => o.address === match[1])) {
        symbolsJson.outputs.push({ address: match[1], symbol: match[2] });
      }
    }

    // Extract memory bits (%M addresses) - more robust extraction
    // Method 1: Match Descriptor followed by Symbol (with flexible whitespace and comments)
    const memoryMatches = rungsXml.matchAll(/<Descriptor>(%M\d+)<\/Descriptor>[\s\S]*?<Symbol>([^<]+)<\/Symbol>/g);
    for (const match of memoryMatches) {
      if (match[2] && match[2].trim() && !symbolsJson.memoryBits.find((m: {address: string}) => m.address === match[1])) {
        symbolsJson.memoryBits.push({ address: match[1], symbol: match[2].trim(), comment: '' });
      }
    }

    // Method 2: Also extract from Coil elements specifically (they always have symbols)
    const coilMatches = rungsXml.matchAll(/<ElementType>Coil<\/ElementType>[\s\S]*?<Descriptor>(%M\d+)<\/Descriptor>[\s\S]*?<Symbol>([^<]+)<\/Symbol>/g);
    for (const match of coilMatches) {
      if (match[2] && match[2].trim() && !symbolsJson.memoryBits.find((m: {address: string}) => m.address === match[1])) {
        symbolsJson.memoryBits.push({ address: match[1], symbol: match[2].trim(), comment: '' });
      }
    }

    // Extract timers (%TM addresses) - default preset to 3 seconds
    const timerMatches = rungsXml.matchAll(/<Descriptor>(%TM\d+)<\/Descriptor>/g);
    for (const match of timerMatches) {
      if (!symbolsJson.timers.find((t: {address: string}) => t.address === match[1])) {
        symbolsJson.timers.push({ address: match[1], preset: 3 });
      }
    }

    // Extract analog inputs (%IW addresses) from Operation expressions
    const analogMatches = rungsXml.matchAll(/%IW(\d+)\.(\d+)/g);
    for (const match of analogMatches) {
      const address = `%IW${match[1]}.${match[2]}`;
      if (!symbolsJson.analogInputs.find((a: {address: string}) => a.address === address)) {
        symbolsJson.analogInputs.push({ address, symbol: `ANALOG_IN_${match[1]}_${match[2]}` });
      }
    }

    // Extract memory words (%MW addresses) from Operation expressions
    const mwMatches = rungsXml.matchAll(/%MW(\d+)/g);
    for (const match of mwMatches) {
      const address = `%MW${match[1]}`;
      if (!symbolsJson.memoryWords.find((m: {address: string}) => m.address === address)) {
        // Generate descriptive symbol based on address range
        const idx = parseInt(match[1]);
        let symbol = `MW_${match[1]}`;
        let comment = '';
        if (idx >= 100 && idx < 110) {
          symbol = `RAW_ANALOG_${idx - 100}`;
          comment = `Raw analog input value ${idx - 100}`;
        } else if (idx >= 0 && idx < 10) {
          symbol = `SETPOINT_${idx}`;
          comment = `User setpoint ${idx}`;
        }
        symbolsJson.memoryWords.push({ address, symbol, comment });
      }
    }

    // Extract memory floats (%MF addresses) from Operation expressions
    // CRITICAL: Validate that addresses use EVEN numbers only (v3.3 rule)
    const mfMatches = rungsXml.matchAll(/%MF(\d+)/g);
    for (const match of mfMatches) {
      const address = `%MF${match[1]}`;
      const idx = parseInt(match[1]);

      // Warn if consecutive (odd after even) address is used
      if (idx > 100 && idx % 2 !== 0) {
        console.warn(`WARNING: %MF${idx} uses consecutive address! Should use even numbers only (v3.3 rule). Consider %MF${idx - 1} or %MF${idx + 1}.`);
      }

      if (!symbolsJson.memoryFloats.find((m: {address: string}) => m.address === address)) {
        // Generate descriptive symbol based on address and usage pattern
        let symbol = `MF_${match[1]}`;
        let comment = '';

        // Check context from surrounding XML to infer purpose
        if (idx === 102) {
          symbol = 'HMI_LEVEL';
          comment = 'Tank level in engineering units';
        } else if (idx === 103) {
          symbol = 'HMI_PERCENT';
          comment = 'Level percentage (0-100)';
        } else if (idx === 104) {
          symbol = 'HMI_TEMP';
          comment = 'Temperature in degrees';
        } else if (idx === 106) {
          symbol = 'HMI_VALUE_3';
          comment = 'HMI display value 3';
        } else if (idx >= 102 && idx < 120) {
          symbol = `HMI_VALUE_${idx - 102}`;
          comment = `HMI display value ${idx - 102}`;
        } else if (idx >= 0 && idx < 10) {
          symbol = `SETPOINT_F${idx}`;
          comment = `Float setpoint ${idx} (retentive)`;
        }
        symbolsJson.memoryFloats.push({ address, symbol, comment });
      }
    }

    console.log(`Extracted: ${symbolsJson.inputs.length} inputs, ${symbolsJson.outputs.length} outputs, ${symbolsJson.analogInputs.length} analog inputs, ${symbolsJson.memoryBits.length} memory bits, ${symbolsJson.memoryWords.length} memory words, ${symbolsJson.memoryFloats.length} memory floats, ${symbolsJson.timers.length} timers`);
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
    analogInputs: symbolsJson.analogInputs || [],
    memoryBits: symbolsJson.memoryBits || [],
    memoryWords: symbolsJson.memoryWords || [],
    memoryFloats: symbolsJson.memoryFloats || [],
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

  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4000,
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
      userPrompt, // User-selected prompt content from Supabase
      skills,     // Selected skill IDs
      expansionModules, // Selected expansion modules (e.g., [{partNumber: 'TM3AI8/G', ...}])
    } = body;

    // DEBUG: Log received parameters
    console.log('=== GENERATE-PLC-RELIABLE DEBUG ===');
    console.log('DEBUG - modelName:', modelName);
    console.log('DEBUG - userPrompt received:', userPrompt ? 'YES' : 'NO');
    if (userPrompt) {
      console.log('DEBUG - userPrompt (first 300 chars):', userPrompt.substring(0, 300));
    }
    console.log('DEBUG - context (first 500 chars):', context?.substring(0, 500));
    console.log('=================================');

    // STEP 1: VALIDATE PLC SELECTION (Triggers popup if not selected)
    if (!modelName) {
      return NextResponse.json(
        {
          error: 'PLC_NOT_SELECTED',
          message: 'Please select a PLC model before generating',
          showPopup: true, // Frontend uses this to show popup
          details: 'No PLC model selected. Please go back and select a Schneider M221 controller (TM221CE16T, TM221CE24T, TM221CE40T, etc.)'
        },
        { status: 400 }
      );
    }

    if (!context) {
      return NextResponse.json(
        { error: 'Missing required field: context' },
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

    // Check if expansion modules are selected
    const hasExpansionModules = expansionModules && Array.isArray(expansionModules) && expansionModules.length > 0;
    console.log('DEBUG - expansionModules:', hasExpansionModules ? expansionModules.map((m: {partNumber: string}) => m.partNumber).join(', ') : 'None');

    // Select the correct template - use expansion template if modules are selected
    const templatePath = hasExpansionModules
      ? TEMPLATE_PATHS['with-expansion']
      : (TEMPLATE_PATHS[modelName] || TEMPLATE_PATHS['default']);
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
    let analogInputSymbols: Record<string, string> = {};
    let memoryBitSymbols: Record<string, { symbol: string; comment: string }> = {};
    let memoryWordSymbols: Record<string, { symbol: string; comment: string }> = {};
    let memoryFloatSymbols: Record<string, { symbol: string; comment: string }> = {};
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
      // HYBRID: AI generates rungs XML directly with EXPERT_SYSTEM_PROMPT + userPrompt
      console.log('Using HYBRID mode: AI generates rungs XML with expert prompt...');
      console.log('User prompt provided:', userPrompt ? 'Yes' : 'No');
      console.log('Skills selected:', skills ? skills.join(', ') : 'None');
      try {
        const aiResult = await generateRungsWithAI(context, modelName, userPrompt);
        rungsXml = aiResult.rungsXml;

        console.log('AI generated rungs XML length (before fix):', rungsXml.length);

        // Apply XML fixer to add missing Comment tags and Line elements
        rungsXml = fixSmbpXml(rungsXml);

        console.log('AI generated rungs XML length (after fix):', rungsXml.length);
        console.log('AI returned inputs:', aiResult.inputs.length);
        console.log('AI returned outputs:', aiResult.outputs.length);
        console.log('AI returned analog inputs:', aiResult.analogInputs.length);
        console.log('AI returned memory bits:', aiResult.memoryBits.length);
        console.log('AI returned memory words:', aiResult.memoryWords?.length || 0);
        console.log('AI returned memory floats:', aiResult.memoryFloats?.length || 0);
        console.log('AI returned timers:', aiResult.timers.length);

        // Extract symbols from AI response
        for (const input of aiResult.inputs) {
          inputSymbols[input.address] = input.symbol;
        }
        for (const output of aiResult.outputs) {
          outputSymbols[output.address] = output.symbol;
        }
        for (const analog of aiResult.analogInputs) {
          analogInputSymbols[analog.address] = analog.symbol;
        }
        for (const mb of aiResult.memoryBits) {
          memoryBitSymbols[mb.address] = { symbol: mb.symbol, comment: mb.comment || '' };
        }
        for (const mw of aiResult.memoryWords || []) {
          memoryWordSymbols[mw.address] = { symbol: mw.symbol, comment: mw.comment || '' };
        }
        for (const mf of aiResult.memoryFloats || []) {
          memoryFloatSymbols[mf.address] = { symbol: mf.symbol, comment: mf.comment || '' };
        }
        timerConfigs = aiResult.timers;
      } catch (aiError) {
        // DON'T silently fall back to motor start/stop - report the error!
        console.error('AI generation failed with error:', aiError);
        console.error('Error details:', JSON.stringify(aiError, null, 2));

        // Return error to user instead of wrong program
        return NextResponse.json(
          {
            error: 'AI_GENERATION_FAILED',
            message: 'AI failed to generate the program. Please try again.',
            details: aiError instanceof Error ? aiError.message : 'Unknown AI error',
            userPromptReceived: userPrompt ? userPrompt.substring(0, 200) : 'None',
          },
          { status: 500 }
        );
      }
    } else {
      // No AI available - return error instead of wrong program
      console.log('WARNING: AI not available, useAI:', useAI, 'API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);

      return NextResponse.json(
        {
          error: 'AI_NOT_AVAILABLE',
          message: 'AI generation is not available. Please check API configuration.',
          details: `useAI=${useAI}, API_KEY_EXISTS=${!!process.env.ANTHROPIC_API_KEY}`,
          userPromptReceived: userPrompt ? userPrompt.substring(0, 200) : 'None',
        },
        { status: 503 }
      );
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

    // UPDATE HARDWARE MODEL if different from template
    // HardwareId mapping: TM221CE16T=1929, TM221CE24T=1933, TM221CE40T=1937
    const HARDWARE_IDS: Record<string, number> = {
      'TM221CE16T': 1929,
      'TM221CE16R': 1928,
      'TM221CE24T': 1933,
      'TM221CE24R': 1932,
      'TM221CE40T': 1937,
      'TM221CE40R': 1936,
    };

    // ALWAYS update hardware model to match user selection
    // Templates may have TM221CE24T or TM221CE40T - replace both
    console.log(`Updating hardware model to ${modelName}`);

    // Replace any TM221 model reference with user-selected model
    content = content.replace(
      /<Reference>TM221CE\d+[TR]<\/Reference>/g,
      `<Reference>${modelName}</Reference>`
    );

    // Replace HardwareId based on user-selected model
    const newHardwareId = HARDWARE_IDS[modelName];
    if (newHardwareId) {
      // Replace any TM221 HardwareId (1928-1937 range)
      content = content.replace(
        /<HardwareId>19(2[89]|3[0-7])<\/HardwareId>/g,
        `<HardwareId>${newHardwareId}</HardwareId>`
      );
    }

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

    // Inject symbols into AnalogInputs (add <Symbol> tag after <Index>)
    for (const [address, symbol] of Object.entries(analogInputSymbols)) {
      // AnalogIO has more complex structure, find the right place to inject Symbol
      const pattern = new RegExp(
        `(<AnalogIO>\\s*<Address>${address.replace('%', '\\%')}</Address>\\s*<Index>\\d+</Index>)`,
        'g'
      );
      content = content.replace(pattern, `$1\n            <Symbol>${symbol}</Symbol>`);
    }
    if (Object.keys(analogInputSymbols).length > 0) {
      console.log(`Injected ${Object.keys(analogInputSymbols).length} analog input symbols:`, Object.keys(analogInputSymbols).join(', '));
    }

    // Configure analog input Type for expansion modules (change from NotUsed to actual type)
    // For used analog inputs, set Type based on module type:
    // - TM3TI (RTD): Type 0 = PT100
    // - TM3AI (4-20mA): Type 3 = 4-20mA
    // Detect module type from <Reference> in the ModuleExtensionObject containing the address
    for (const address of Object.keys(analogInputSymbols)) {
      // Only process expansion module addresses (%IW1.x, %IW2.x, etc.)
      const slotMatch = address.match(/%IW(\d+)\./);
      if (!slotMatch || slotMatch[1] === '0') continue; // Skip base controller %IW0.x

      const slot = slotMatch[1];

      // Find the ModuleExtensionObject containing this address and get its Reference
      const modulePattern = new RegExp(
        `<ModuleExtensionObject>[\\s\\S]*?<Index>${parseInt(slot) - 1}</Index>[\\s\\S]*?<Reference>([^<]+)</Reference>[\\s\\S]*?</ModuleExtensionObject>`,
        'm'
      );
      const moduleMatch = content.match(modulePattern);
      const moduleRef = moduleMatch ? moduleMatch[1] : '';

      // Determine type based on module reference
      let typeValue = '3';
      let typeName = 'Type_4_20mA';
      let scopeValue = '32';
      let scopeName = 'Scope_Customized';

      if (moduleRef.includes('TM3TI') || moduleRef.includes('TM3T')) {
        // RTD/Temperature module - use PT100
        typeValue = '0';
        typeName = 'Type_PT100';
        scopeValue = '0';
        scopeName = 'Scope_Normal';
      }

      // Find and replace the Type_NotUsed for this specific analog input
      const analogIOPattern = new RegExp(
        `(<AnalogIO>\\s*<Address>${address.replace('%', '\\%')}</Address>[\\s\\S]*?)<Type>\\s*<Value>31</Value>\\s*<Name>Type_NotUsed</Name>\\s*</Type>`,
        'm'
      );
      content = content.replace(analogIOPattern, `$1<Type>\n                <Value>${typeValue}</Value>\n                <Name>${typeName}</Name>\n              </Type>`);

      // Also update Scope from NotUsed to appropriate scope
      const scopePattern = new RegExp(
        `(<AnalogIO>\\s*<Address>${address.replace('%', '\\%')}</Address>[\\s\\S]*?)<Scope>\\s*<Value>128</Value>\\s*<Name>Scope_NotUsed</Name>\\s*</Scope>`,
        'm'
      );
      content = content.replace(scopePattern, `$1<Scope>\n                <Value>${scopeValue}</Value>\n                <Name>${scopeName}</Name>\n              </Scope>`);

      console.log(`Configured ${address} as ${typeName} (module: ${moduleRef || 'unknown'})`);
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

    // Inject MemoryWords (replace empty <MemoryWords /> with populated section)
    if (Object.keys(memoryWordSymbols).length > 0) {
      const memoryWordsXml = Object.entries(memoryWordSymbols).map(([address, { symbol, comment }], idx) => `
      <MemoryWord>
        <Address>${address}</Address>
        <Index>${idx}</Index>
        <Symbol>${symbol}</Symbol>
        <Comment>${comment || ''}</Comment>
      </MemoryWord>`).join('');

      content = content.replace(
        /<MemoryWords\s*\/>/,
        `<MemoryWords>${memoryWordsXml}\n    </MemoryWords>`
      );
      console.log(`Injected ${Object.keys(memoryWordSymbols).length} memory word symbols:`, Object.keys(memoryWordSymbols).join(', '));
    }

    // Inject MemoryFloats (replace empty <MemoryFloats /> with populated section)
    if (Object.keys(memoryFloatSymbols).length > 0) {
      const memoryFloatsXml = Object.entries(memoryFloatSymbols).map(([address, { symbol, comment }], idx) => `
      <MemoryFloat>
        <Address>${address}</Address>
        <Index>${idx}</Index>
        <Symbol>${symbol}</Symbol>
        <Comment>${comment || ''}</Comment>
      </MemoryFloat>`).join('');

      content = content.replace(
        /<MemoryFloats\s*\/>/,
        `<MemoryFloats>${memoryFloatsXml}\n    </MemoryFloats>`
      );
      console.log(`Injected ${Object.keys(memoryFloatSymbols).length} memory float symbols:`, Object.keys(memoryFloatSymbols).join(', '));
    }

    console.log('Symbols injected successfully');

    // Handle expansion modules configuration
    if (hasExpansionModules) {
      // Keep only the modules user selected
      // Frontend sends partNumber, template uses Reference (e.g., 'TM3AI8/G')
      const keepModules = expansionModules.map((m: {partNumber: string}) => m.partNumber).filter(Boolean);
      console.log('Keeping expansion modules:', keepModules.join(', '));

      // Remove modules not in the list
      const modulePattern = /<ModuleExtensionObject>[\s\S]*?<Reference>([^<]+)<\/Reference>[\s\S]*?<\/ModuleExtensionObject>/g;
      let match;
      const modulesToRemove: string[] = [];

      while ((match = modulePattern.exec(content)) !== null) {
        const moduleRef = match[1];
        if (!keepModules.includes(moduleRef)) {
          modulesToRemove.push(match[0]);
        }
      }

      for (const moduleXml of modulesToRemove) {
        content = content.replace(moduleXml, '');
      }

      // Clear cartridge slots if no cartridges selected
      const hasCartridges = keepModules.some((m: string) => m.startsWith('TMC2'));
      if (!hasCartridges) {
        content = content.replace(
          /<Cartridge1>[\s\S]*?<\/Cartridge1>/,
          `<Cartridge1>
        <Index>0</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference />
      </Cartridge1>`
        );
        content = content.replace(
          /<Cartridge2>[\s\S]*?<\/Cartridge2>/,
          `<Cartridge2>
        <Index>1</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference />
      </Cartridge2>`
        );
      }

      // Reindex remaining modules (Index must start at 0) AND update I/O addresses
      // Module Index 0 = %IW1.x, Index 1 = %IW2.x, etc.
      const remainingModules = content.match(/<ModuleExtensionObject>[\s\S]*?<\/ModuleExtensionObject>/g) || [];
      console.log(`Reindexing ${remainingModules.length} expansion modules...`);

      for (let i = 0; i < remainingModules.length; i++) {
        const original = remainingModules[i];

        // Extract current index from module
        const currentIndexMatch = original.match(/<Index>(\d+)<\/Index>/);
        const currentIndex = currentIndexMatch ? parseInt(currentIndexMatch[1]) : i;
        const currentSlot = currentIndex + 1; // %IWx.y where x = Index + 1
        const newSlot = i + 1; // New slot after reindexing

        let updated = original;

        // Update module Index
        updated = updated.replace(/<Index>\d+<\/Index>/, `<Index>${i}</Index>`);

        // Update I/O addresses if slot changed
        if (currentSlot !== newSlot) {
          console.log(`Module reindex: Index ${currentIndex} -> ${i}, Slot %IW${currentSlot} -> %IW${newSlot}`);

          // Update analog input addresses: %IWx.y -> %IWnew.y
          updated = updated.replace(new RegExp(`%IW${currentSlot}\\.(\\d+)`, 'g'), `%IW${newSlot}.$1`);
          updated = updated.replace(new RegExp(`%IWS${currentSlot}\\.(\\d+)`, 'g'), `%IWS${newSlot}.$1`);

          // Update analog output addresses if any
          updated = updated.replace(new RegExp(`%QW${currentSlot}\\.(\\d+)`, 'g'), `%QW${newSlot}.$1`);
          updated = updated.replace(new RegExp(`%QWS${currentSlot}\\.(\\d+)`, 'g'), `%QWS${newSlot}.$1`);

          // Update digital I/O addresses if any
          updated = updated.replace(new RegExp(`%I${currentSlot}\\.(\\d+)`, 'g'), `%I${newSlot}.$1`);
          updated = updated.replace(new RegExp(`%Q${currentSlot}\\.(\\d+)`, 'g'), `%Q${newSlot}.$1`);
        }

        if (updated !== original) {
          content = content.replace(original, updated);
        }
      }
    } else {
      // No expansion modules - clear the Extensions section
      content = content.replace(/<Extensions>[\s\S]*?<\/Extensions>/, '<Extensions />');
      // Clear cartridge slots
      content = content.replace(
        /<Cartridge1>[\s\S]*?<\/Cartridge1>/,
        `<Cartridge1>
        <Index>0</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference />
      </Cartridge1>`
      );
      content = content.replace(
        /<Cartridge2>[\s\S]*?<\/Cartridge2>/,
        `<Cartridge2>
        <Index>1</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference />
      </Cartridge2>`
      );
      console.log('Cleared expansion modules and cartridges');
    }

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
