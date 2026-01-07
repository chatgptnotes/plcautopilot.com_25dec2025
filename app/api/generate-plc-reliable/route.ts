/**
 * Reliable PLC Generator API
 *
 * Strategy:
 * 1. Use a WORKING template file from Machine Expert Basic
 * 2. AI parses user requirements into structured config
 * 3. Inject generated rungs into the template
 * 4. This ensures 100% valid .smbp files
 */

// Vercel serverless function config - extend timeout for AI generation
export const maxDuration = 300; // 5 minutes max (Vercel Pro limit)

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
import { validateSmbpXml } from '@/lib/smbp-validator';
import {
  generateMultiPOUProgram,
  analyzeRequest,
  combinePOURungsXml,
  generatePOUBlocksXml,
  mergeSymbols,
  getEfficiencyStats,
  MultiPOUGenerationConfig,
  POUGenerationResult,
} from '@/lib/pou-orchestrator';
import { POUCategory } from '@/lib/smbp-templates';

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

6. **analogScaling**: Scale 4-20mA to engineering units using PARALLEL OPERATIONS
   - CRITICAL: Copy %IW to %MW first, then calculate from %MW
   - CRITICAL: ONE math operation per Operation block - split complex formulas!
   - CRITICAL: Use ONE rung with PARALLEL Operations (IL executes sequentially!)
   - For 4-20mA: Raw 2000 = 4mA = min, Raw 10000 = 20mA = max

   **EFFICIENT APPROACH: ONE rung with 6 parallel Operations (not 6 separate rungs!)**
   IL code executes SEQUENTIALLY even when Operations are visually parallel in ladder.
   Each Operation has ONE operator, satisfying complexity limits.

   **Required Operations (in one rung, parallel outputs):**
   a) Copy raw input: %MW100 := %IW1.0
   b) Convert to float: %MF102 := INT_TO_REAL(%MW100)
   c) Subtract offset: %MF104 := %MF102 - 2000.0
   d) Normalize (0-1): %MF106 := %MF104 / 8000.0
   e) Scale to range: %MF108 := %MF106 * (MAX - MIN)
   f) Add minimum: %MF110 := %MF108 + MIN

   **Example: 4-20mA to 300-3000mm level sensor (1 RUNG, 6 parallel Operations):**
   %S6 ---+--- [%MW100 := %IW1.0]              (Row 0, Col 9)
          |    [%MF102 := INT_TO_REAL(%MW100)]  (Row 1, Col 9)
          |    [%MF104 := %MF102 - 2000.0]      (Row 2, Col 9)
          |    [%MF106 := %MF104 / 8000.0]      (Row 3, Col 9)
          |    [%MF108 := %MF106 * 2700.0]      (Row 4, Col 9)
          |    [%MF110 := %MF108 + 300.0]       (Row 5, Col 9)

   **IL Code (executes sequentially - values ready for next operation):**
   LD    %S6
   [ %MW100 := %IW1.0 ]
   [ %MF102 := INT_TO_REAL(%MW100) ]
   [ %MF104 := %MF102 - 2000.0 ]
   [ %MF106 := %MF104 / 8000.0 ]
   [ %MF108 := %MF106 * 2700.0 ]
   [ %MF110 := %MF108 + 300.0 ]

   **Ladder XML Structure for Parallel Operations:**
   - NormalContact at Row 0, Col 0: %S6 with ChosenConnection="Left, Right"
   - Lines at Cols 1-7, Row 0 only
   - Line at Col 8, Row 0: ChosenConnection="Down, Left, Right" (branch point)
   - VerticalLine at Col 8, Rows 1-4: ChosenConnection="Up, Down, Right"
   - VerticalLine at Col 8, Row 5: ChosenConnection="Up, Right" (last row)
   - Operations at Col 9: Row 0="Left", Rows 1+="Up, Left"

6a. **volumeCalculation**: Convert level (mm) to volume (liters and cm³)
   - CRITICAL: ONE math operation per rung!
   - For rectangular tank with base L_m × W_m (in meters):
     - Volume_cm3 = L × W × level_mm × 100 (in cm³)
     - Volume_liters = L × W × level_mm / 1000 (in liters)

   **Example: 1m × 1m tank (L=1, W=1):**
   - Volume_liters = 1 × 1 × level_mm = level_mm liters (directly!)
   - Volume_cm3 = level_mm × 1000 cm³

   **Required Rungs for 1m × 1m tank:**
   Rung: %MF112 := %MF110 (copy level_mm as volume_liters - same value!)
   Rung: %MF114 := %MF110 * 1000.0 (volume in cm³)

   **Example: 0.5m × 0.8m tank (L=0.5, W=0.8):**
   Rung: %MF112 := %MF110 * 0.5    (level × L)
   Rung: %MF114 := %MF112 * 0.8    (× W = volume_liters)
   Rung: %MF116 := %MF114 * 1000.0 (volume in cm³)

6b. **densityCalculation**: Calculate density from weight and volume
   - Formula: Density (g/cm³) = Weight (g) / Volume (cm³)
   - Formula: Density (kg/L) = Weight (kg) / Volume (L)
   - CRITICAL: Check volume > 0 before division to avoid divide-by-zero!
   - CRITICAL: ONE operation per rung!

   **Required Rungs:**
   Rung: Check volume > 0: %M11 AND [%MF114 > 0.0] -> %M_CALC_ENABLE
   Rung: Calculate density: %M_CALC_ENABLE -> %MF118 := %MF_WEIGHT / %MF114

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

10. **manualOperation**: Manual mode control rungs (REQUIRED when auto mode exists!)
   - CRITICAL: If program has AUTO mode, it MUST also have MANUAL mode!
   - Use mode selector input (%I0.x) to switch between Auto/Manual
   - Manual mode allows direct operator control of outputs

   **Required Manual Operation Rungs:**
   a) Mode Selection: %I0.x (MODE_SW) -> %M30 (AUTO_MODE) when OFF, %M31 (MANUAL_MODE) when ON
   b) Manual Start: MANUAL_MODE AND START_PB AND NOT FAULT -> %M40 (MANUAL_RUN_CMD)
   c) Manual Stop: MANUAL_MODE AND STOP_PB -> Reset %M40
   d) Manual Output: MANUAL_MODE AND MANUAL_RUN_CMD -> %Q0.x (output)

   **Example Manual Mode Rungs:**
   Rung: Auto_Mode_Select
   IL: LDN %I0.1 / AND %M0 / ST %M30
   (Mode switch OFF = Auto mode enabled)

   Rung: Manual_Mode_Select
   IL: LD %I0.1 / AND %M0 / ST %M31
   (Mode switch ON = Manual mode enabled)

   Rung: Manual_Pump_Start
   IL: LD %M31 / AND %I0.2 / ANDN %M50 / ST %M40
   (Manual mode + Start button + Not fault = Manual run command)

   Rung: Output_Control (combines Auto and Manual)
   IL: LD %M30 / AND %M10 / OR ( / LD %M31 / AND %M40 / ) / ST %Q0.0
   (Auto mode + Auto cmd OR Manual mode + Manual cmd = Output)

11. **pumpPressureControl**: Pump control based on 4-20mA ANALOG pressure sensor

    **CRITICAL WARNING:**
    - This is ANALOG pressure control using expansion module TM3AI4/G
    - For TM221CE16T/CE24T: Use %IW1.0 (expansion module) - NO built-in analog!
    - For TM221CE40T only: Can use %IW0.0 (built-in 0-10V)
    - DO NOT use digital inputs %I1.0/%I1.1 as pressure switches!
    - You MUST include scaling rungs to convert raw analog to PSI!

    **MINIMUM 7 RUNGS REQUIRED - Generate ALL of them in this EXACT order:**

    **Rung 0 - System Ready** (Timer pattern):
    IL: BLK %TM0 / LD %I0.0 / IN / OUT_BLK / LD Q / ST %M0 / END_BLK

    **Rung 1 - Copy Raw Analog** (Operation pattern with %S6 enable):
    IL: LD %S6 / [%MW100 := %IW1.0]
    - This copies the 4-20mA sensor raw value (2000-10000) to memory
    - ALWAYS use %IW1.0 for TM3AI4/G expansion module on CE16T/CE24T!

    **Rung 2 - Convert to Float** (Operation pattern - SEPARATE rung!):
    IL: LD %S6 / [%MF102 := INT_TO_REAL(%MW100)]
    - Converts integer to float - NO MATH IN THIS RUNG!

    **Rung 3 - Subtract Offset** (ONE operation only!):
    IL: LD %S6 / [%MF104 := %MF102 - 2000.0]
    - Subtracts 4mA offset (2000 raw = 4mA = 0 PSI)

    **Rung 4 - Scale to PSI** (ONE operation only!):
    IL: LD %S6 / [%MF106 := %MF104 / 8.0]
    - Divides by 8 to get 0-1000 PSI range

    **Rung 5 - Low Pressure Check** (Comparison pattern):
    IL: LD %M0 / AND [%MF106 < 200.0] / ST %M1
    - Sets LOW_PRESS_FLAG when pressure below 200 PSI

    **Rung 6 - High Pressure Check** (Comparison pattern):
    IL: LD %M0 / AND [%MF106 > 800.0] / ST %M2
    - Sets HIGH_PRESS_FLAG when pressure above 800 PSI

    **Rung 7 - Pump Control** (Motor pattern with flags):
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
6. If AUTO mode exists, are MANUAL mode rungs also generated? REQUIRED!
   - Mode selector rung (Auto_Mode_Select, Manual_Mode_Select)
   - Manual start/stop rungs (Manual_Pump_Start, Manual_Pump_Stop)
   - Output control combining Auto AND Manual commands

## EFFICIENCY RULES (v3.5) - CRITICAL FOR COMPLEX PROGRAMS

**PRIORITY: Output control rungs MUST be generated first, before utility/reset rungs!**

Generate rungs in this order to ensure completeness:
1. System Ready timer (1 rung)
2. Cold/warm start reset (1-2 rungs, combine where possible)
3. Analog scaling (1 rung with parallel Operations - see pattern 6)
4. Level/sensor check flags (1-2 rungs)
5. AUTO MODE logic - Enable/Disable auto mode (2 rungs)
6. MANUAL MODE logic - Mode select, manual start/stop (3-4 rungs) - REQUIRED if auto exists!
7. OUTPUT CONTROL RUNGS (combines Auto + Manual commands)
8. Alarm outputs if needed

**CRITICAL: If program has AUTO mode, it MUST have MANUAL mode rungs!**
- Mode selector switch (%I0.x) to choose Auto/Manual
- Manual start/stop buttons for direct control
- Output rungs that work in BOTH Auto AND Manual modes

**COMBINE OPERATIONS TO SAVE RUNGS - USE PARALLEL OUTPUTS:**
- WRONG: 6 separate reset rungs for %MW10, %MW11, %MF102, %MF104, %MF106, %MF108
- CORRECT: 1 rung with multiple Operation elements in PARALLEL (stacked vertically)

**Example: Reset rung with 4 parallel outputs (1 rung instead of 4):**

Ladder Layout (parallel outputs on rows 0,1,2,3):
Row 0: %S0 ---+--- Line --- Line --- Line ... --- [%MW10 := 0]
              |
Row 1: %S1 --OR                                   [%MF102 := 0.0]
                                                   [%MF104 := 0.0]
                                                   [%MF106 := 0.0]

Ladder XML Pattern:
<LadderElements>
  <!-- %S0 at Row 0, Col 0 with DOWN connection for OR branch -->
  <LadderEntity><ElementType>NormalContact</ElementType><Descriptor>%S0</Descriptor><Symbol>SB_COLDSTART</Symbol><Row>0</Row><Column>0</Column><ChosenConnection>Down, Left, Right</ChosenConnection></LadderEntity>
  <!-- %S1 at Row 1, Col 0 with UP connection -->
  <LadderEntity><ElementType>NormalContact</ElementType><Descriptor>%S1</Descriptor><Symbol>SB_WARMSTART</Symbol><Row>1</Row><Column>0</Column><ChosenConnection>Up, Left</ChosenConnection></LadderEntity>
  <!-- Lines fill columns 1-8 on Row 0, with DOWN connection at column 8 to branch to parallel outputs -->
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>1</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  <!-- ... more lines ... -->
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>8</Column><ChosenConnection>Down, Left, Right</ChosenConnection></LadderEntity>
  <!-- PARALLEL Operation elements at Column 9, stacked on Rows 0,1,2,3 -->
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MW10 := 0</OperationExpression><Row>0</Row><Column>9</Column><ChosenConnection>Left</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MF102 := 0.0</OperationExpression><Row>1</Row><Column>9</Column><ChosenConnection>Up, Left</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MF104 := 0.0</OperationExpression><Row>2</Row><Column>9</Column><ChosenConnection>Up, Left</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MF106 := 0.0</OperationExpression><Row>3</Row><Column>9</Column><ChosenConnection>Up, Left</ChosenConnection></LadderEntity>
  <!-- None elements to terminate rows 1,2,3 at Column 10 -->
  <LadderEntity><ElementType>None</ElementType><Row>1</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>None</ElementType><Row>2</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>None</ElementType><Row>3</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
</LadderElements>

IL Code (all operations execute when condition is true):
LD    %S0
OR    %S1
[ %MW10 := 0 ]
[ %MF102 := 0.0 ]
[ %MF104 := 0.0 ]
[ %MF106 := 0.0 ]

**CRITICAL: Parallel output connection rules:**
- First output (Row 0): ChosenConnection = "Left" only
- Subsequent outputs (Row 1+): ChosenConnection = "Up, Left" (connects UP to previous row)
- Line at Column 8: ChosenConnection = "Down, Left, Right" (branches DOWN to parallel outputs)
- None elements at Column 10 for rows 1,2,3 to terminate branches

**PARALLEL OPERATIONS FOR SEQUENTIAL CALCULATIONS (v3.14 - UPDATED):**
Parallel Operations in ONE rung execute SEQUENTIALLY in IL code!
This means values from earlier Operations are available for later Operations.
Each Operation must have ONLY ONE math operator.

WRONG (combines multiple math operators in ONE expression):
%MF104 := (%MF102 - 2000.0) / 8.0  <-- TWO operators! WRONG!

CORRECT (ONE rung with parallel Operations, each has ONE operator):
%S6 ---+--- [%MW100 := %IW1.0]              (Row 0 - assignment)
       |    [%MF102 := INT_TO_REAL(%MW100)]  (Row 1 - conversion, MW100 ready)
       |    [%MF104 := %MF102 - 2000.0]      (Row 2 - subtraction, MF102 ready)
       |    [%MF106 := %MF104 / 8000.0]      (Row 3 - division, MF104 ready)
       |    [%MF108 := %MF106 * 2700.0]      (Row 4 - multiplication, MF106 ready)
       |    [%MF110 := %MF108 + 300.0]       (Row 5 - addition, MF108 ready)

IL Code (executes TOP to BOTTOM sequentially):
LD    %S6
[ %MW100 := %IW1.0 ]
[ %MF102 := INT_TO_REAL(%MW100) ]
[ %MF104 := %MF102 - 2000.0 ]
[ %MF106 := %MF104 / 8000.0 ]
[ %MF108 := %MF106 * 2700.0 ]
[ %MF110 := %MF108 + 300.0 ]

BENEFIT: 1 rung instead of 6 separate rungs - much more efficient!

**XML Structure for 6 Parallel Operations (scaling rung):**
<LadderElements>
  <LadderEntity><ElementType>NormalContact</ElementType><Descriptor>%S6</Descriptor><Symbol>SB_RUN</Symbol><Row>0</Row><Column>0</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  <!-- Lines at columns 1-7 on Row 0 only -->
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>1</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>2</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>3</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>4</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>5</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>6</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>7</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
  <!-- Line at Column 8 branches DOWN to parallel outputs -->
  <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>8</Column><ChosenConnection>Down, Left, Right</ChosenConnection></LadderEntity>
  <!-- VerticalLine elements connect rows 1-5 at Column 8 -->
  <LadderEntity><ElementType>VerticalLine</ElementType><Row>1</Row><Column>8</Column><ChosenConnection>Up, Down, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>VerticalLine</ElementType><Row>2</Row><Column>8</Column><ChosenConnection>Up, Down, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>VerticalLine</ElementType><Row>3</Row><Column>8</Column><ChosenConnection>Up, Down, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>VerticalLine</ElementType><Row>4</Row><Column>8</Column><ChosenConnection>Up, Down, Right</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>VerticalLine</ElementType><Row>5</Row><Column>8</Column><ChosenConnection>Up, Right</ChosenConnection></LadderEntity>
  <!-- Operations at Column 9 -->
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MW100 := %IW1.0</OperationExpression><Row>0</Row><Column>9</Column><ChosenConnection>Left</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MF102 := INT_TO_REAL(%MW100)</OperationExpression><Row>1</Row><Column>9</Column><ChosenConnection>Up, Left</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MF104 := %MF102 - 2000.0</OperationExpression><Row>2</Row><Column>9</Column><ChosenConnection>Up, Left</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MF106 := %MF104 / 8000.0</OperationExpression><Row>3</Row><Column>9</Column><ChosenConnection>Up, Left</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MF108 := %MF106 * 2700.0</OperationExpression><Row>4</Row><Column>9</Column><ChosenConnection>Up, Left</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>Operation</ElementType><OperationExpression>%MF110 := %MF108 + 300.0</OperationExpression><Row>5</Row><Column>9</Column><ChosenConnection>Up, Left</ChosenConnection></LadderEntity>
  <!-- None elements terminate rows 1-5 -->
  <LadderEntity><ElementType>None</ElementType><Row>1</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>None</ElementType><Row>2</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>None</ElementType><Row>3</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>None</ElementType><Row>4</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
  <LadderEntity><ElementType>None</ElementType><Row>5</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
</LadderElements>

Parallel outputs also OK for RESETS (simple assignments to 0):
%S0 OR %S1 ---+--- [%MW100 := 0]      (simple assignment)
              |    [%MF102 := 0.0]    (simple assignment)
              |    [%MF104 := 0.0]    (simple assignment)

**PRIORITIZE OUTPUTS!** If you're generating many utility rungs but haven't yet created the actual %Q control rungs, STOP and generate the output control rungs immediately!

## I/O ADDRESSES BY MODEL

**CRITICAL: TM221CE16T and TM221CE24T have ZERO built-in analog inputs!**
**Only TM221CE40T has 2 built-in analog inputs (%IW0.0, %IW0.1).**
**For analog on CE16T/CE24T, you MUST use expansion module (TM3AI4/G) at %IW1.0!**

**TM221CE16T/R:**
- Digital Inputs: %I0.0 - %I0.8 (9 inputs)
- Digital Outputs: %Q0.0 - %Q0.6 (7 outputs)
- Analog Inputs: **NONE** (requires TM3AI4/G expansion -> %IW1.0)

**TM221CE24T/R:**
- Digital Inputs: %I0.0 - %I0.13 (14 inputs)
- Digital Outputs: %Q0.0 - %Q0.9 (10 outputs)
- Analog Inputs: **NONE** (requires TM3AI4/G expansion -> %IW1.0)

**TM221CE40T/R:**
- Digital Inputs: %I0.0 - %I0.23 (24 inputs)
- Digital Outputs: %Q0.0 - %Q0.15 (16 outputs)
- Analog Inputs: %IW0.0, %IW0.1 (2 built-in 0-10V)

**Internal Memory:**
- Memory Bits: %M0 - %M511 (use for internal flags)
- Memory Words: %MW0 - %MW1999 (%MW0-99 RETENTIVE, %MW100+ non-retentive)
- Memory Floats: %MF0 - %MF1999 (%MF0-99 RETENTIVE, %MF100+ for HMI)
- Timers: %TM0 - %TM254 (Preset in seconds with Base=OneSecond)
- Counters: %C0 - %C254

**Expansion Modules (Slot 1 = Index 0) - USE THESE FOR ANALOG ON CE16T/CE24T:**
- TM3AI4/G (4-20mA): %IW1.0 - %IW1.3 (4 channels)
- TM3AI8/G (4-20mA): %IW1.0 - %IW1.7 (8 channels)
- TM3TI4/G (RTD temp): %IW1.0 - %IW1.3 (4 channels) - FOR TEMPERATURE ONLY!
- TM3DI32K: %I1.0 - %I1.31
- TM3DQ32TK: %Q1.0 - %Q1.31

**RULE: When user specifies 4-20mA analog sensor on TM221CE16T/CE24T:**
- ALWAYS use %IW1.0 (expansion module), NEVER %IW0.0!
- ALWAYS configure TM3AI4/G module with Type_4_20mA

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

CORRECT (SEPARATE rungs with ONE operator each - NO exceptions!):
  Rung 1: %MW100 := %IW1.0            (copy raw)
  Rung 2: %MF102 := INT_TO_REAL(%MW100)  (convert - NO MATH!)
  Rung 3: %MF104 := %MF102 - 2000.0   (subtract offset)
  Rung 4: %MF106 := %MF104 / 8000.0   (divide to normalize)

### Rule 3a: SCALING FORMULA for Custom Ranges (Split into SEPARATE rungs!)
For sensor MIN_RAW to MAX_RAW mapping to MIN_ENG to MAX_ENG:
  Step 1: %MW100 := %IW1.0            (copy raw)
  Step 2: %MF102 := INT_TO_REAL(%MW100)  (convert)
  Step 3: %MF104 := %MF102 - MIN_RAW  (subtract minimum)
  Step 4: %MF106 := %MF104 / (MAX_RAW - MIN_RAW)  (normalize 0-1)
  Step 5: %MF108 := %MF106 * (MAX_ENG - MIN_ENG)  (scale to range)
  Step 6: %MF110 := %MF108 + MIN_ENG  (add offset)

Example: 4-20mA (2000-10000 raw) to 300-3000mm (6 SEPARATE rungs!):
  Rung 1: %MW100 := %IW1.0            (copy raw)
  Rung 2: %MF102 := INT_TO_REAL(%MW100)  (convert)
  Rung 3: %MF104 := %MF102 - 2000.0   (subtract 4mA offset)
  Rung 4: %MF106 := %MF104 / 8000.0   (normalize to 0-1)
  Rung 5: %MF108 := %MF106 * 2700.0   (scale to range)
  Rung 6: %MF110 := %MF108 + 300.0    (add minimum)

Example: mm to percent (300mm=0%, 3000mm=100%) - 3 SEPARATE rungs:
  Rung: %MF112 := %MF110 - 300.0      (subtract minimum)
  Rung: %MF114 := %MF112 / 2700.0     (normalize)
  Rung: %MF116 := %MF114 * 100.0      (to percent)

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

### Rule 8: Cold/Warm Start HMI Reset (v3.6 - Parallel Outputs)
If the program uses HMI memory words (%MW, %MF, %MD), add reset rung with PARALLEL outputs:
- Use ONE rung with multiple Operations stacked vertically on different rows
- %S0 at Row 0, Col 0 with "Down, Left, Right" connection (OR branch start)
- %S1 at Row 1, Col 0 with "Up, Left" connection (OR branch end)
- Lines fill columns 1-7 on Row 0
- Line at Column 8 with "Down, Left, Right" connection (branches to parallel outputs)
- Operations stacked at Column 9: Row 0 = "Left", Row 1+ = "Up, Left"
- None elements at Column 10 for rows 1+ to terminate branches

**Correct Parallel Output Structure:**
Row 0: %S0 ---+--- Lines --- [%MW100 := 0]
              |               [%MF102 := 0.0]
Row 1: %S1 --OR               [%MF104 := 0.0]

**IL Code:**
LD    %S0
OR    %S1
[ %MW100 := 0 ]
[ %MF102 := 0.0 ]
[ %MF104 := 0.0 ]

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

### CRITICAL RULE 13: EVERY %M BIT MUST HAVE A SYMBOL! (v3.13 - MANDATORY)
*** THIS IS A CRITICAL RULE - FAILURE TO FOLLOW CAUSES PROGRAM ERRORS ***

BEFORE using ANY %M address in a rung, you MUST define it in SYMBOLS_JSON memoryBits!

WRONG - Missing symbols:
- Using %M1, %M2, %M3, %M4, %M5 in rungs without defining them = ERROR!

CORRECT - Define ALL %M bits:
"memoryBits": [
  {"address": "%M0", "symbol": "SYSTEM_READY", "comment": "System ready after startup"},
  {"address": "%M1", "symbol": "FILL_PHASE", "comment": "Tank fill phase active"},
  {"address": "%M2", "symbol": "WAIT_PHASE", "comment": "Wait phase active"},
  {"address": "%M3", "symbol": "DRAIN_PHASE", "comment": "Drain phase active"},
  {"address": "%M4", "symbol": "CYCLE_COMPLETE", "comment": "One cycle completed"},
  {"address": "%M5", "symbol": "AUTO_MODE", "comment": "Automatic mode enabled"}
]

NAMING CONVENTION:
- Phase bits: FILL_PHASE, WAIT_PHASE, DRAIN_PHASE, STEP1_ACTIVE
- Mode bits: AUTO_MODE, MANUAL_MODE, JOG_MODE
- Status bits: SYSTEM_READY, PUMP_RUNNING, VALVE_OPEN

### CRITICAL RULE 14: ONE FLOAT OPERATION PER OPERATION BLOCK! (v3.14 - UPDATED)
*** NEVER combine multiple math operations in one Operation expression ***

WRONG - Multiple operations in one expression:
%MF104 := ((%MF102 - 2000.0) / 8000.0) * 29700.0 + 300.0

CORRECT - Use PARALLEL OPERATIONS in ONE rung (more efficient!):
IL code executes sequentially even when Operations are visually parallel.
Each Operation has ONE operator, satisfying complexity limits.

%S6 ---+--- [%MF104 := %MF102 - 2000.0]   (Row 0, Col 9)
       |    [%MF106 := %MF104 / 8000.0]   (Row 1, Col 9)
       |    [%MF108 := %MF106 * 29700.0]  (Row 2, Col 9)
       |    [%MF110 := %MF108 + 300.0]    (Row 3, Col 9)

IL Code:
LD    %S6
[ %MF104 := %MF102 - 2000.0 ]
[ %MF106 := %MF104 / 8000.0 ]
[ %MF108 := %MF106 * 29700.0 ]
[ %MF110 := %MF108 + 300.0 ]

RULE: Maximum ONE mathematical operator (+, -, *, /) per Operation block!
BENEFIT: 1 rung instead of 4 separate rungs - much more efficient!

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
- If it mentions "4-20mA" or "analog": Use %IW1.0 (expansion TM3AI4/G), NOT %IW0.0 (only CE40T has built-in)!
- If it mentions "pressure sensor": Generate analog copy AND scaling rungs first!
- If it mentions setpoints: Include Comparison rungs comparing %MF102 to setpoint values
- If it mentions alarms: Include alarm output rungs
- If it mentions HMI display: Include HMI value calculation rungs

**CRITICAL FOR PUMP PRESSURE CONTROL:**
- Use pattern #10 (pumpPressureControl) - this is ANALOG control!
- DO NOT use %I1.0/%I1.1 as pressure switches - that's WRONG!
- The pressure comes from %IW1.0 (4-20mA TM3AI4/G expansion), scaled to %MF102 (PSI)
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
      <OperationExpression>%MW100 := %IW1.0</OperationExpression>
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
    <InstructionLineEntity><InstructionLine>[ %MW100 := %IW1.0 ]</InstructionLine><Comment /></InstructionLineEntity>
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

### PATTERN 5b: OR Branch with Multiple Comparisons
**CRITICAL: Comparisons CANNOT start at Column 0! Always place NormalContact at Column 0, Comparisons at Column 1.**
**This pattern is for "condition1 OR condition2" logic (e.g., reset when selector=Manual OR stop pressed).**
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%M0</Descriptor>
      <Comment>System ready</Comment>
      <Symbol>SYSTEM_READY</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Down, Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%M0</Descriptor>
      <Comment>System ready</Comment>
      <Symbol>SYSTEM_READY</Symbol>
      <Row>1</Row>
      <Column>0</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Comparison</ElementType>
      <ComparisonExpression>%MW10 = 0</ComparisonExpression>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Down, Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Comparison</ElementType>
      <ComparisonExpression>%MW11 = 0</ComparisonExpression>
      <Row>1</Row>
      <Column>1</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>3</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>4</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>5</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>6</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>7</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>8</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>9</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <LadderEntity>
      <ElementType>ResetCoil</ElementType>
      <Descriptor>%M1</Descriptor>
      <Comment />
      <Symbol>AUTO_MODE</Symbol>
      <Row>0</Row>
      <Column>10</Column>
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
    <InstructionLineEntity><InstructionLine>LD    %M0</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>AND   [%MW10=0]</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OR(   %M0</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>AND   [%MW11=0]</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>)</InstructionLine><Comment /></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>R     %M1</InstructionLine><Comment /></InstructionLineEntity>
  </InstructionLines>
  <Name>Auto_Mode_Stop</Name>
  <MainComment>Reset auto mode when selector = Manual OR stop command</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>

**CRITICAL RULE: Comparisons NEVER at Column 0!**
- WRONG: Comparison at Column 0 (spans columns 0-1, conflicts with power rail)
- CORRECT: NormalContact at Column 0, Comparison at Column 1 (spans columns 1-2)

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

TIMER DONE BIT - CRITICAL RULE (v3.4):
*** NEVER use %TM addresses as NormalContact descriptors in ladder! ***

- WRONG: <ElementType>NormalContact</ElementType><Descriptor>%TM1</Descriptor> (INVALID - causes error!)
- WRONG: <ElementType>NormalContact</ElementType><Descriptor>%TM1.Q</Descriptor> (INVALID - causes error!)

- Timer Q (done) output can ONLY be accessed INSIDE a BLK/END_BLK structure using: LD Q
- OUTSIDE the BLK structure, you MUST use a dedicated memory bit to capture timer done status

CORRECT PATTERN for sequential timers:
Step 1: In the timer rung, capture Q to a dedicated memory bit:
  BLK %TM1
  LD  %M3              ; Step input condition
  IN
  OUT_BLK
  LD  Q                ; Get timer done output
  ST  %Q0.0            ; Drive output directly
  ST  %M10             ; ALSO capture timer done to memory bit for use in other rungs!
  END_BLK

Step 2: In subsequent rungs, use the MEMORY BIT (not the timer):
  LD  %M10             ; Use memory bit that captured timer done
  R   %M3              ; Reset step flag

  LD  %M10             ; Use memory bit for next step
  S   %M4              ; Set next step flag

TIMER DONE MEMORY BIT ALLOCATION:
- %TM0 done -> capture to %M10 (TM0_DONE)
- %TM1 done -> capture to %M11 (TM1_DONE)
- %TM2 done -> capture to %M12 (TM2_DONE)
- %TM3 done -> capture to %M13 (TM3_DONE)

SYMBOLS_JSON must include these timer done bits:
{"address": "%M10", "symbol": "TM0_DONE", "comment": "Timer 0 done flag"},
{"address": "%M11", "symbol": "TM1_DONE", "comment": "Timer 1 done flag"},

SEQUENTIAL LOOP PATTERN - For repeating sequences:
- Use memory bits for each step (%M1=Step1, %M2=Step2, etc.)
- Capture timer done to %M10+, use those bits to transition steps
- Last step completion should RESET all steps and SET step 1 again
- Example: When %M13 (TM3 done) -> R %M5, S %M3 (restart from step 1)

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
  // v3.5: Increased Sonnet max_tokens to 32000 to prevent truncation of complex programs
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
  const isHaiku = model.includes('haiku');
  const maxTokens = isHaiku ? 4096 : 32000;

  // Use streaming to avoid Anthropic API timeout for long requests
  // The API requires streaming for operations that may take longer than 10 minutes
  let responseText = '';
  let stopReason = '';

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContext }],
  });

  // Collect streamed response
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      responseText += event.delta.text;
    }
    if (event.type === 'message_delta' && event.delta.stop_reason) {
      stopReason = event.delta.stop_reason;
    }
  }

  // v3.5: Check for truncation - if stop_reason is 'max_tokens', the response was cut off
  if (stopReason === 'max_tokens') {
    console.error('WARNING: AI response was truncated due to max_tokens limit!');
    console.error('The generated program may be incomplete. Consider simplifying requirements or using a different approach.');
  }

  responseText = responseText.trim();

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

  // Fix XML escaping for comparison operators in IL code
  // The AI sometimes generates unescaped < and > in InstructionLine and ComparisonExpression tags
  // These must be escaped as &lt; and &gt; for valid XML
  // IMPORTANT: Use [^<]* to match only within element boundaries, not across elements

  // Fix ComparisonExpression tags - escape < and > in content
  responseText = responseText.replace(
    /<ComparisonExpression>([^<]*)<\/ComparisonExpression>/g,
    (match, content) => {
      const escaped = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<ComparisonExpression>${escaped}</ComparisonExpression>`;
    }
  );

  // Fix InstructionLine tags - escape < and > in content
  responseText = responseText.replace(
    /<InstructionLine>([^<]*)<\/InstructionLine>/g,
    (match, content) => {
      const escaped = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<InstructionLine>${escaped}</InstructionLine>`;
    }
  );

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
      const parsed = JSON.parse(symbolsMatch[1]);
      // Merge parsed data with defaults to ensure all arrays exist
      symbolsJson = {
        inputs: parsed.inputs || [],
        outputs: parsed.outputs || [],
        analogInputs: parsed.analogInputs || [],
        memoryBits: parsed.memoryBits || [],
        memoryWords: parsed.memoryWords || [],
        memoryFloats: parsed.memoryFloats || [],
        timers: parsed.timers || [],
      };
    } catch (e) {
      console.error('Failed to parse symbols JSON:', e);
      // Keep default empty arrays on parse failure
    }
  }

  // ALWAYS extract symbols from rungs XML and MERGE with any SYMBOLS_JSON data
  // This ensures we capture ALL symbols from ladder elements, even if AI's JSON is incomplete
  console.log('Extracting symbols from rungs XML to merge with SYMBOLS_JSON...');

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

  console.log(`Extracted from XML: ${symbolsJson.inputs.length} inputs, ${symbolsJson.outputs.length} outputs, ${symbolsJson.analogInputs.length} analog inputs, ${symbolsJson.memoryBits.length} memory bits, ${symbolsJson.memoryWords.length} memory words, ${symbolsJson.memoryFloats.length} memory floats, ${symbolsJson.timers.length} timers`);

  // Ensure we only have RungEntity elements
  const firstRung = rungsXml.indexOf('<RungEntity');
  if (firstRung > 0) {
    rungsXml = rungsXml.substring(firstRung);
  }
  const lastRung = rungsXml.lastIndexOf('</RungEntity>');
  if (lastRung > 0) {
    rungsXml = rungsXml.substring(0, lastRung + '</RungEntity>'.length);
  }

  // v3.5: Validate that all %Q outputs have control rungs (Coil elements driving them)
  const outputsWithCoils = new Set<string>();
  const outputCoilMatches = rungsXml.matchAll(/<ElementType>Coil<\/ElementType>[\s\S]*?<Descriptor>(%Q\d+\.\d+)<\/Descriptor>/g);
  for (const match of outputCoilMatches) {
    outputsWithCoils.add(match[1]);
  }

  const outputsInSymbols = symbolsJson.outputs.map((o: {address: string}) => o.address);
  const missingOutputControl = outputsInSymbols.filter((addr: string) => !outputsWithCoils.has(addr));

  if (missingOutputControl.length > 0) {
    console.warn(`WARNING: The following outputs are declared but have NO control rungs: ${missingOutputControl.join(', ')}`);
    console.warn('The generated program may be INCOMPLETE! Output control logic was likely truncated.');
  }

  // Count rungs to detect potential truncation
  const rungCount = (rungsXml.match(/<RungEntity>/g) || []).length;
  console.log(`Generated ${rungCount} rungs total`);

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
      "expression": "[%IW1.0>500] (for comparison) - use %IW1.0 for expansion module"
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

  // Use streaming to avoid Anthropic API timeout
  let jsonText = '';

  const stream = anthropic.messages.stream({
    model,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContext }],
  });

  // Collect streamed response
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      jsonText += event.delta.text;
    }
  }

  jsonText = jsonText.trim();

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
      useModularPOU = true, // NEW: Use modular POU generation (default: true for token efficiency)
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
    let pouBlocksXml: string = ''; // For multi-POU structure
    let useMultiPOUStructure = false; // Flag to use multi-POU injection
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
        if (mb.address && mb.address.trim()) {
          memoryBitSymbols[mb.address] = { symbol: mb.symbol, comment: mb.comment || '' };
        }
      }
    } else if (useAI && process.env.ANTHROPIC_API_KEY) {
      // Check if modular POU generation is enabled
      if (useModularPOU) {
        // MODULAR POU MODE: Generate each POU separately with focused prompts (55-75% token savings!)
        console.log('=== MODULAR POU GENERATION MODE ===');
        console.log('Analyzing request to determine needed POUs...');

        // Analyze request to determine which POUs are needed
        const userRequest = userPrompt || context;
        const neededPOUs = analyzeRequest(userRequest);
        console.log('POUs to generate:', neededPOUs.join(', '));

        try {
          // Generate all POUs in parallel using focused prompts
          const multiPOUConfig: MultiPOUGenerationConfig = {
            userRequest,
            model: modelName,
            enabledPOUs: neededPOUs,
          };

          const pouResult = await generateMultiPOUProgram(multiPOUConfig);

          if (!pouResult.success) {
            console.error('Some POUs failed to generate');
            // Fall back to monolithic approach if modular fails
            console.log('Falling back to monolithic generation...');
          } else {
            // Generate separate POU blocks for proper multi-POU structure
            // This creates multiple <ProgramOrganizationUnits> elements
            pouBlocksXml = generatePOUBlocksXml(pouResult.results);
            useMultiPOUStructure = true;

            // Also generate combined rungs for the rungsXml variable (for symbol injection)
            rungsXml = combinePOURungsXml(pouResult.results);

            // Apply XML fixer to the POU blocks
            pouBlocksXml = fixSmbpXml(pouBlocksXml);

            // Merge symbols from all POUs
            const mergedSymbols = mergeSymbols(pouResult.results);

            // Extract symbols
            for (const input of mergedSymbols.inputs || []) {
              inputSymbols[input.address] = input.symbol;
            }
            for (const output of mergedSymbols.outputs || []) {
              outputSymbols[output.address] = output.symbol;
            }
            for (const mb of mergedSymbols.memoryBits || []) {
              if (mb.address && mb.address.trim()) {
                memoryBitSymbols[mb.address] = { symbol: mb.symbol, comment: mb.comment || '' };
              }
            }
            for (const timer of mergedSymbols.timers || []) {
              timerConfigs.push({ address: timer.address, preset: timer.preset });
            }

            // Log efficiency stats
            const stats = getEfficiencyStats(pouResult.results);
            console.log('=== MODULAR POU EFFICIENCY ===');
            console.log(`Total input tokens: ${stats.totalInputTokens}`);
            console.log(`Estimated monolithic tokens: ${stats.estimatedMonolithicTokens}`);
            console.log(`Tokens saved: ${stats.tokensSaved} (${stats.percentageSaved}%)`);
            console.log('==============================');

            console.log('Modular POU generation complete!');
            console.log('POUs generated:', pouResult.results.map(r => r.pouName).join(', '));
          }
        } catch (modularError) {
          console.error('Modular POU generation failed:', modularError);
          console.log('Falling back to monolithic generation...');
          // Fall through to monolithic generation below
        }
      }

      // MONOLITHIC MODE (fallback or if useModularPOU=false)
      if (!rungsXml) {
        console.log('Using MONOLITHIC mode: AI generates rungs XML with expert prompt...');
        console.log('User prompt provided:', userPrompt ? 'Yes' : 'No');
        console.log('User prompt length:', userPrompt?.length || 0);
        console.log('Skills selected:', skills ? skills.join(', ') : 'None');
        console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
        console.log('API Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...');
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
        console.error('Error type:', typeof aiError);
        console.error('Error constructor:', aiError?.constructor?.name);
        if (aiError instanceof Error) {
          console.error('Error message:', aiError.message);
          console.error('Error stack:', aiError.stack);
        }
        console.error('Error stringified:', JSON.stringify(aiError, Object.getOwnPropertyNames(aiError || {}), 2));

        // Extract meaningful error message
        let errorDetails = 'Unknown AI error';
        if (aiError instanceof Error) {
          errorDetails = aiError.message;
        } else if (typeof aiError === 'string') {
          errorDetails = aiError;
        } else if (aiError && typeof aiError === 'object') {
          // Handle Anthropic API errors which have specific structure
          const apiError = aiError as { message?: string; error?: { message?: string }; status?: number };
          errorDetails = apiError.message || apiError.error?.message || JSON.stringify(aiError);
        }

        // Return error to user instead of wrong program
        return NextResponse.json(
          {
            error: 'AI_GENERATION_FAILED',
            message: 'AI failed to generate the program. Please try again.',
            details: errorDetails,
            userPromptReceived: userPrompt ? userPrompt.substring(0, 200) : 'None',
          },
          { status: 500 }
        );
      }
      }  // Close if (!rungsXml)
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

    let content: string;

    // Check if we should use multi-POU structure (separate ProgramOrganizationUnits for each POU)
    if (useMultiPOUStructure && pouBlocksXml) {
      // MULTI-POU MODE: Replace entire <Pous>...</Pous> section with multiple POUs
      console.log('Using MULTI-POU structure with separate ProgramOrganizationUnits');
      const pousStartTag = templateContent.indexOf('<Pous>');
      const pousEndTag = templateContent.indexOf('</Pous>');

      if (pousStartTag > 0 && pousEndTag > pousStartTag) {
        const pousXml = `<Pous>\n${pouBlocksXml}\n    </Pous>`;
        content = templateContent.substring(0, pousStartTag) +
          pousXml +
          templateContent.substring(pousEndTag + '</Pous>'.length);
        console.log('Multi-POU blocks injected into template successfully');
      } else {
        console.error('Could not find <Pous> section in template for multi-POU injection');
        return NextResponse.json(
          { error: 'Template format invalid', details: 'Could not find <Pous> section in template' },
          { status: 500 }
        );
      }
    } else {
      // SINGLE-POU MODE: Replace just the <Rungs>...</Rungs> section (original behavior)
      const rungsStartTag = templateContent.indexOf('<Rungs>');
      const rungsEndTag = templateContent.indexOf('</Rungs>');

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
    // Filter out timers with empty/invalid addresses
    const validTimers = timerConfigs.filter(timer => timer.address && timer.address.startsWith('%TM'));

    // DEDUPLICATE timers by address - multiple POUs may define the same timer
    const uniqueTimers = validTimers.reduce((acc, timer) => {
      if (!acc.find(t => t.address === timer.address)) {
        acc.push(timer);
      }
      return acc;
    }, [] as typeof validTimers);

    if (uniqueTimers.length > 0) {
      console.log(`Injecting ${uniqueTimers.length} timer definitions (filtered from ${timerConfigs.length}, deduplicated from ${validTimers.length})...`);
      const timersXml = uniqueTimers.map((timer, idx) => `
      <TimerTM>
        <Address>${timer.address}</Address>
        <Index>${idx}</Index>
        <Preset>${timer.preset || 1000}</Preset>
        <Base>OneSecond</Base>
      </TimerTM>`).join('');

      // REPLACE entire Timers section (not prepend) to avoid duplicates with template
      const timersPattern = /<Timers>[\s\S]*?<\/Timers>/;
      const timersEmptyPattern = /<Timers\s*\/>/;

      if (timersPattern.test(content)) {
        content = content.replace(timersPattern, `<Timers>${timersXml}\n    </Timers>`);
        console.log('Replaced existing Timers section');
      } else if (timersEmptyPattern.test(content)) {
        content = content.replace(timersEmptyPattern, `<Timers>${timersXml}\n    </Timers>`);
        console.log('Replaced empty Timers section');
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

    // MODULE SUBSTITUTION: Replace TM3TI4/G with TM3AI4/G when 4-20mA analog is needed
    // TM3TI4/G is for RTD temperature sensors ONLY - cannot be used for 4-20mA current loop!
    // HardwareId: TM3TI4/G = 199, TM3AI4/G = 185

    // Detect if 4-20mA analog is needed from:
    // 1. User's prompt mentions "4-20mA", "ultrasonic", "pressure sensor", "level sensor", "analog"
    // 2. OR user explicitly selected TM3AI4/G module
    // 3. OR analog input symbols use %IW1.x (expansion module)
    const userPromptLower = (userPrompt || '').toLowerCase();
    const needs4to20mA = userPromptLower.includes('4-20ma') ||
                         userPromptLower.includes('4-20 ma') ||
                         userPromptLower.includes('ultrasonic') ||
                         userPromptLower.includes('pressure sensor') ||
                         userPromptLower.includes('level sensor') ||
                         userPromptLower.includes('analog input') ||
                         userPromptLower.includes('analog sensor') ||
                         Object.keys(analogInputSymbols).some(addr => addr.match(/%IW[1-9]\./));

    const keepModules = hasExpansionModules ?
      expansionModules.map((m: {partNumber: string}) => m.partNumber).filter(Boolean) : [];
    const userSelectedTM3AI4 = keepModules.includes('TM3AI4/G');
    const userSelectedTM3TI4 = keepModules.includes('TM3TI4/G');
    const templateHasTM3TI4 = content.includes('<Reference>TM3TI4/G</Reference>');

    // Substitute TM3TI4/G -> TM3AI4/G if:
    // - User needs 4-20mA AND template has TM3TI4/G AND user didn't explicitly select TM3TI4/G
    // - OR user explicitly selected TM3AI4/G
    if ((needs4to20mA && templateHasTM3TI4 && !userSelectedTM3TI4) || userSelectedTM3AI4) {
      console.log('Detected 4-20mA analog requirement, substituting TM3TI4/G with TM3AI4/G');

      // Replace TM3TI4/G module reference with TM3AI4/G
      content = content.replace(/<Reference>TM3TI4\/G<\/Reference>/g, '<Reference>TM3AI4/G</Reference>');
      // Update HardwareId from 199 (TM3TI4/G) to 185 (TM3AI4/G)
      content = content.replace(/<HardwareId>199<\/HardwareId>/g, '<HardwareId>185</HardwareId>');
      // Update Consumption values (TM3AI4/G: 5V=80mA, 24V=65mA vs TM3TI4/G: 5V=40mA, 24V=0)
      content = content.replace(
        /(<Reference>TM3AI4\/G<\/Reference>[\s\S]*?)<Consumption5V>40<\/Consumption5V>\s*<Consumption24V>0<\/Consumption24V>/g,
        '$1<Consumption5V>80</Consumption5V>\n          <Consumption24V>65</Consumption24V>'
      );
      // Remove RTD-specific fields (R, B, T, R1, R2, T1, T2) from AnalogIO elements in the substituted module
      // These fields are only valid for RTD modules, not 4-20mA
      const rtdFieldPattern = /<R>\d+<\/R>\s*<B>\d+<\/B>\s*<T>\d+<\/T>\s*<Activation>\d+<\/Activation>\s*<Reactivation>\d+<\/Reactivation>\s*<InputFilter>\d+<\/InputFilter>\s*<R1>[\d.]+<\/R1>\s*<R2>[\d.]+<\/R2>\s*<T1>[\d.]+<\/T1>\s*<T2>[\d.]+<\/T2>\s*<ChartCalculation>false<\/ChartCalculation>/g;
      content = content.replace(rtdFieldPattern, '');
      console.log('Substituted TM3TI4/G with TM3AI4/G for 4-20mA analog input');
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
        // RTD/Temperature module - use Pt100 3-wire (v3.8)
        // Type values: 0=Pt100_3W, 1=Pt100_2W, 2=Pt1000_3W, 3=Pt1000_2W
        typeValue = '0';
        typeName = 'Type_Pt100_3W';
        scopeValue = '2';  // Scope_Celsius (2) for temperature in 0.1 deg C
        scopeName = 'Scope_Celsius';
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

      // Update Minimum/Maximum for RTD modules (v3.8)
      // Pt100/Pt1000: -2000 to 8500 (0.1 deg C), Ni100: -600 to 2500, Ni1000: -600 to 1800
      if (moduleRef.includes('TM3TI') || moduleRef.includes('TM3T')) {
        const minMaxPattern = new RegExp(
          `(<AnalogIO>\\s*<Address>${address.replace('%', '\\%')}</Address>[\\s\\S]*?)<Minimum>0</Minimum>\\s*<Maximum>0</Maximum>`,
          'm'
        );
        content = content.replace(minMaxPattern, `$1<Minimum>-2000</Minimum>\n              <Maximum>8500</Maximum>`);
      }

      console.log(`Configured ${address} as ${typeName} (module: ${moduleRef || 'unknown'})`);
    }

    // Inject MemoryBits - replace ENTIRE section (whether empty or with existing content)
    if (Object.keys(memoryBitSymbols).length > 0) {
      // Extract actual bit number from address for correct Index (e.g., %M5 -> Index 5)
      const memoryBitsXml = Object.entries(memoryBitSymbols).map(([address, { symbol, comment }]) => {
        const match = address.match(/%M(\d+)/);
        const index = match ? parseInt(match[1]) : 0;
        return `
      <MemoryBit>
        <Address>${address}</Address>
        <Index>${index}</Index>
        <Symbol>${symbol}</Symbol>
        <Comment>${comment || ''}</Comment>
      </MemoryBit>`;
      }).join('');

      // First try replacing empty self-closing tag
      if (content.includes('<MemoryBits />')) {
        content = content.replace(
          /<MemoryBits\s*\/>/,
          `<MemoryBits>${memoryBitsXml}\n    </MemoryBits>`
        );
      } else {
        // Replace entire MemoryBits section (handles templates with existing content)
        content = content.replace(
          /<MemoryBits>[\s\S]*?<\/MemoryBits>/,
          `<MemoryBits>${memoryBitsXml}\n    </MemoryBits>`
        );
      }
      console.log(`Injected ${Object.keys(memoryBitSymbols).length} memory bits:`, Object.keys(memoryBitSymbols).join(', '));
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

    // POST-PROCESSING: Fix parallel output structure
    // When Operations at Column 9 exist on multiple rows, Line at Column 8 needs "Down, Left, Right"
    // This fixes AI not following the rule for branching to parallel outputs
    const rungPattern = /<RungEntity>[\s\S]*?<\/RungEntity>/g;
    let rungMatch;
    while ((rungMatch = rungPattern.exec(content)) !== null) {
      const rungContent = rungMatch[0];

      // Check if this rung has parallel outputs (Operation/Coil elements on Row 1+ at Column 9)
      const hasParallelOutputs = /<(Operation|Coil|SetCoil|ResetCoil)>[\s\S]*?<Row>[1-9]\d*<\/Row>\s*<Column>9<\/Column>[\s\S]*?<ChosenConnection>Up, Left<\/ChosenConnection>/m.test(rungContent);

      if (hasParallelOutputs) {
        // Find Line at Column 8, Row 0 and ensure it has "Down, Left, Right" connection
        const lineCol8Pattern = /(<LadderEntity>\s*<ElementType>Line<\/ElementType>\s*<Row>0<\/Row>\s*<Column>8<\/Column>\s*<ChosenConnection>)Left, Right(<\/ChosenConnection>)/;
        if (lineCol8Pattern.test(rungContent)) {
          const fixedRung = rungContent.replace(lineCol8Pattern, '$1Down, Left, Right$2');
          content = content.replace(rungContent, fixedRung);
          console.log('Fixed parallel output structure: Line at Column 8 now has "Down, Left, Right"');
        }
      }
    }

    const filename = `${projectName}.smbp`;
    const usedHybridAI = useAI && process.env.ANTHROPIC_API_KEY && !template;

    // CRITICAL: Sanitize any invalid values that slipped through injection
    // This catches timer presets, or any other undefined values before final output
    content = content.replace(/<Preset>undefined<\/Preset>/g, '<Preset>1000</Preset>');
    content = content.replace(/>undefined</g, '><'); // Remove other undefined tag values

    // Remove any TimerTM entries with empty Address (invalid)
    content = content.replace(/<TimerTM>\s*<Address><\/Address>[\s\S]*?<\/TimerTM>/g, '');

    // CRITICAL: Normalize ALL line endings to CRLF (Windows format)
    // Machine Expert Basic requires consistent CRLF line endings!
    content = content
      .replace(/\r\n/g, '\n')  // CRLF -> LF
      .replace(/\r/g, '\n')    // Stray CR -> LF
      .replace(/\n/g, '\r\n'); // LF -> CRLF

    console.log('HYBRID generation complete!');
    console.log('Filename:', filename);
    console.log('Content length:', content.length);
    console.log('Used hybrid AI:', usedHybridAI);

    // VALIDATE generated content before returning
    const validation = validateSmbpXml(content);
    if (!validation.valid) {
      console.error('[VALIDATION FAILED]', JSON.stringify(validation.errors, null, 2));
      return NextResponse.json({
        error: 'Generated file has validation errors',
        validationErrors: validation.errors,
        warnings: validation.warnings,
        content: null, // Don't provide invalid content
        filename,
        valid: false,
        model: modelName,
        manufacturer,
      }, { status: 422 });
    }

    // Log warnings but continue
    if (validation.warnings.length > 0) {
      console.warn('[VALIDATION WARNINGS]', JSON.stringify(validation.warnings, null, 2));
    }

    return NextResponse.json({
      content,
      filename,
      extension: '.smbp',
      model: modelName,
      manufacturer,
      aiGenerated: usedHybridAI, // AI generated rungs, template for hardware
      reliable: true,
      hybrid: true, // Template for hardware, AI for logic
      valid: true,
      warnings: validation.warnings,
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
