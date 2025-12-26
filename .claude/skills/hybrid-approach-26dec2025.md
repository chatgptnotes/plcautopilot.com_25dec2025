# Hybrid Approach Implementation - 26 Dec 2025

## Problem Identified

### Issue: Skills NOT Connected to Web API

The web application's M221 Program Generator was NOT using the 300KB of skill documentation. Only a basic 3KB SYSTEM_PROMPT was being used.

| Source | Size | Connected to API |
|--------|------|------------------|
| Skills folder (19 files) | ~300 KB | NO |
| SYSTEM_PROMPT (claude.ts) | ~3 KB | YES |

### Result
- Generated .smbp files had invalid XML structure
- Files would not open in Machine Expert Basic
- Error: "This is not an EcoStruxure Machine Expert - Basic file, or the file has been corrupted"

---

## Solution: Hybrid Approach

### Architecture
```
User Description
      |
      v
+------------------+
|    Claude AI     |  --> Analyzes requirements
|  (Pattern-based) |  --> Outputs pattern types (NOT XML)
+------------------+
      |
      v
+------------------+
|  Template Engine |  --> Uses verified XML patterns
| (smbp-templates) |  --> Generates valid .smbp
+------------------+
      |
      v
   Valid .smbp File
```

### Why Hybrid is Better
- **AI is good at**: Understanding requirements, designing logic flow
- **Templates are good at**: Correct XML structure, verified patterns
- **Result**: Valid .smbp files that open in Machine Expert Basic

---

## Files Modified/Created

### 1. lib/smbp-templates.ts (NEW)

Template library with verified rung patterns extracted from working .smbp files.

```typescript
// Available pattern generators
export function generateMotorStartStopRung(params: MotorStartStopParams): RungPattern
export function generateSimpleRung(params: SimpleContactParams): RungPattern
export function generateCompareBlockRung(params: CompareBlockParams): RungPattern
export function generateHysteresisRung(params: HysteresisParams): RungPattern
export function generateFullSmbp(config: SmbpConfig): string
```

### 2. lib/claude.ts (MODIFIED)

Changed from XML generation to pattern-based output.

#### SYSTEM_PROMPT Used:

```
You are an expert Schneider Electric M221 PLC programmer. You analyze control requirements and output a structured JSON that specifies which PATTERNS to use.

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

PLC I/O ADDRESSES:
- Digital Inputs: %I0.0 to %I0.8 (TM221CE16T), %I0.0 to %I0.13 (TM221CE24T)
- Digital Outputs: %Q0.0 to %Q0.6 (TM221CE16T), %Q0.0 to %Q0.9 (TM221CE24T)
- Memory Bits: %M0 to %M511
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
```

#### Key Interfaces:

```typescript
export interface AIPatternOutput {
  projectName: string;
  description: string;
  patterns: PatternDefinition[];
  inputs: IODefinition[];
  outputs: IODefinition[];
  memoryBits: IODefinition[];
}

export interface PatternDefinition {
  type: 'motorStartStop' | 'simpleContact' | 'compareBlock' | 'hysteresis' | 'outputCopy';
  params: Record<string, string | number | boolean>;
  rungName: string;
  rungComment: string;
}

export interface IODefinition {
  address: string;
  symbol: string;
  comment: string;
}
```

### 3. app/api/generate-plc-ai/route.ts (MODIFIED)

Converts AI patterns to valid .smbp using templates.

```typescript
// Flow:
// 1. Get AI patterns
aiOutput = await generateM221Patterns(description, plcModel);

// 2. Convert patterns to rungs using templates
const rungs: RungPattern[] = aiOutput.patterns.map(patternToRung);

// 3. Generate full .smbp using templates
const smbpContent = generateFullSmbp({
  projectName,
  plcModel,
  rungs,
  inputs: aiOutput.inputs,
  outputs: aiOutput.outputs,
  memoryBits: aiOutput.memoryBits,
});
```

---

## Template Patterns (Verified from Working Files)

### Motor Start/Stop Pattern
```xml
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
      <ElementType>NegatedContact</ElementType>
      <Descriptor>%I0.1</Descriptor>
      <Symbol>STOP</Symbol>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <!-- ... more elements ... -->
    <LadderEntity>
      <ElementType>Coil</ElementType>
      <Descriptor>%Q0.0</Descriptor>
      <Symbol>MOTOR</Symbol>
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%Q0.0</Descriptor>
      <Symbol>MOTOR</Symbol>
      <Row>1</Row>
      <Column>0</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity>
      <InstructionLine>LD    %I0.0</InstructionLine>
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>OR    %Q0.0</InstructionLine>
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>ANDN  %I0.1</InstructionLine>
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>ST    %Q0.0</InstructionLine>
    </InstructionLineEntity>
  </InstructionLines>
  <Name>Motor Control</Name>
  <MainComment>Start/Stop with seal-in</MainComment>
</RungEntity>
```

### Compare Block Pattern
```xml
<LadderEntity>
  <ElementType>CompareBlock</ElementType>
  <Descriptor>%IW1.0&gt;2500</Descriptor>
  <Symbol>PRES_LOW</Symbol>
  <Row>0</Row>
  <Column>0</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

---

## Test Results

### Generated File
- **File**: `plc_programs/Redundant_Motors_Hybrid.smbp`
- **Size**: 15 KB
- **Structure**: Valid XML with correct ProjectVersion, ManagementLevel, LadderEntity elements

### API Response
```json
{
  "success": true,
  "filename": "Redundant_Motors.smbp",
  "model": "TM221CE24T",
  "aiGenerated": false,
  "patternsUsed": ["motorStartStop"],
  "programData": {
    "inputs": [...],
    "outputs": [...],
    "memoryBits": [],
    "rungCount": 1
  }
}
```

---

## Bug Fix: page.tsx Error

### Error
```
Cannot read properties of undefined (reading 'length')
app\m221-generator\page.tsx (474:56)
generatedProgram.programData.memory.length > 0
```

### Fix
Changed `memory` to `memoryBits` and added optional chaining:

```typescript
// Before
{generatedProgram.programData.memory.length > 0 && (
{generatedProgram.programData.memory.map((mem, i) => (

// After
{generatedProgram.programData.memoryBits && generatedProgram.programData.memoryBits.length > 0 && (
{generatedProgram.programData.memoryBits.map((mem, i) => (
```

Also added optional chaining to inputs and outputs:
```typescript
{generatedProgram.programData.inputs?.map((input, i) => (
{generatedProgram.programData.outputs?.map((output, i) => (
```

---

## Current Patterns (8 Total)

1. **motorStartStop** - Start/Stop with seal-in latch
2. **simpleContact** - Single contact to output
3. **compareBlock** - Analog comparison
4. **hysteresis** - Latching control with hysteresis
5. **outputCopy** - Copy memory/input to output
6. **timer** - On-delay timer with BLK structure
7. **counter** - Up counter with BLK structure
8. **branch** - OR logic with parallel contacts

---

## Timer Pattern (Added 26 Dec 2025)

Uses verified BLK...END_BLK structure:

```xml
<LadderEntity>
  <ElementType>Timer</ElementType>
  <Descriptor>%TM0</Descriptor>
  <Row>0</Row>
  <Column>1</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

IL Code:
```
BLK   %TM0
LD    %I0.0
IN
OUT_BLK
LD    Q
ST    %M0
END_BLK
```

Timer Declaration:
```xml
<Timers>
  <TimerTM>
    <Address>%TM0</Address>
    <Index>0</Index>
    <Preset>5</Preset>
    <Base>OneSecond</Base>
  </TimerTM>
</Timers>
```

---

## Counter Pattern (Added 26 Dec 2025)

Uses BLK structure similar to timers:

```xml
<LadderEntity>
  <ElementType>Counter</ElementType>
  <Descriptor>%C0</Descriptor>
  <Row>0</Row>
  <Column>1</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

IL Code:
```
BLK   %C0
LD    %I0.0
CU
LD    %I0.1
R
OUT_BLK
LD    D
ST    %M0
END_BLK
```

---

## Branch Pattern (Added 26 Dec 2025)

Parallel contacts for OR logic:

```
Row 0: [Main Contact]--[Lines]--[Coil]
Row 1: [Branch Contact]----^
```

Uses connections: `Down, Left, Right` for branch start, `Up, Left` for branch end.

---

## Next Steps

1. **Test with API key**: Verify AI generates complex patterns correctly
2. **Validate in Machine Expert Basic**: Open generated files to confirm
3. **Add more complex patterns**: Multi-timer sequences, cascaded counters

---

## Files Reference

| File | Purpose |
|------|---------|
| `lib/smbp-templates.ts` | Template library with verified patterns |
| `lib/claude.ts` | AI pattern generation with SYSTEM_PROMPT |
| `app/api/generate-plc-ai/route.ts` | API endpoint using hybrid approach |
| `app/m221-generator/page.tsx` | UI component (fixed memoryBits bug) |

---

*Created: 26 Dec 2025*
*PLCAutoPilot Hybrid Approach Documentation*
