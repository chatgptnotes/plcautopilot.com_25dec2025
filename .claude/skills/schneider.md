---
name: schneider
description: Expert agent for Schneider Electric M221 PLC programming with authentic .smbp file generation based on real SoMachine Basic project analysis
version: 3.8
platform: Windows
target_controllers: TM221CE16T, TM221CE24T, TM221CE40T, TM221CE16R, TM221CE24R, TM221CE40R
expansion_modules: TM3DI32K, TM3DQ32TK, TM3AI8/G, TM3AI4/G, TM3TI4/G, TM3TI4D/G
cartridges: TMC2AI2, TMC2TI2
file_formats: .smbp (XML-based)
programming_languages: Ladder Diagram (LD), Instruction List (IL)
standards: IEC 61131-3, IEC 61508
---

# Schneider Electric M221 PLC Programming Skill v2.4

## CRITICAL: Real .smbp File Structure

**VERIFIED FROM ACTUAL SOMACHINE BASIC PROJECT FILE**

The .smbp file is a **SINGLE UTF-8 XML FILE** (NOT a ZIP archive) with the following authentic structure:

```xml
<?xml version="1.0" encoding="utf-8"?>
<ProjectDescriptor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ProjectVersion>3.0.0.0</ProjectVersion>
  <ManagementLevel>FunctLevelMan21_0</ManagementLevel>
  <Name>project_name</Name>
  <FullName>C:\path\to\project.smbp</FullName>
  <CurrentCultureName>en-GB</CurrentCultureName>
  <SoftwareConfiguration>...</SoftwareConfiguration>
  <HardwareConfiguration>...</HardwareConfiguration>
  <DisplayUserLabelsConfiguration>...</DisplayUserLabelsConfiguration>
  <GlobalProperties>...</GlobalProperties>
  <ReportConfiguration>...</ReportConfiguration>
</ProjectDescriptor>
```

---

## Authentic Motor Start/Stop Program Template

### Complete Working Example (Verified from real .smbp file)

This template is extracted from an actual working motor_start_stop_TM221CE24T.smbp file:

```xml
<?xml version="1.0" encoding="utf-8"?>
<ProjectDescriptor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ProjectVersion>3.0.0.0</ProjectVersion>
  <ManagementLevel>FunctLevelMan21_0</ManagementLevel>
  <Name>motor_start_stop_TM221CE24T</Name>
  <FullName>C:\Projects\motor_start_stop_TM221CE24T.smbp</FullName>
  <CurrentCultureName>en-GB</CurrentCultureName>
  <SoftwareConfiguration>
    <Pous>
      <ProgramOrganizationUnits>
        <Name>Motor Control</Name>
        <SectionNumber>1</SectionNumber>
        <Rungs>
          <RungEntity>
            <LadderElements>
              <!-- START_MOTOR Contact (NO) at Column 0 -->
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.0</Descriptor>
                <Comment />
                <Symbol>START_MOTOR</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>

              <!-- STOP_MOTOR Contact (NC) at Column 1 -->
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.1</Descriptor>
                <Comment />
                <Symbol>STOP_MOTOR</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>

              <!-- Horizontal Lines from Column 2-9 -->
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
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>

              <!-- MOTOR_RUN Coil at Column 10 -->
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment />
                <Symbol>MOTOR_RUN</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>

              <!-- Seal-in Contact (MOTOR_RUN) at Row 1, Column 0 -->
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment />
                <Symbol>MOTOR_RUN</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>

            <!-- Instruction List Representation -->
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>

            <Name>Motor Start Stop</Name>
            <MainComment>Start/Stop latching circuit for Motor - TM221CE24T</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
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
    <MemoryBits />
    <SystemBits>
      <!-- System bits are automatically populated by SoMachine Basic -->
    </SystemBits>
    <SystemWords />
    <GrafcetSteps />
    <MemoryWords />
    <MemoryDoubleWords />
    <MemoryFloats />
    <ConstantWords />
    <ConstantDoubleWords />
    <ConstantMemoryFloats />
    <Timers />
    <Counters />
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
  <!-- HardwareConfiguration section follows -->
</ProjectDescriptor>
```

---

## Ladder Element Types (Verified)

| ElementType | Description | Example |
|-------------|-------------|---------|
| `NormalContact` | Normally Open (NO) contact | START button |
| `NegatedContact` | Normally Closed (NC) contact | STOP button |
| `Coil` | Standard output coil | Motor output |
| `SetCoil` | Latch (Set) coil | Alarm latch |
| `ResetCoil` | Unlatch (Reset) coil | Alarm reset |
| `Line` | Horizontal connection line | Grid filler |
| `Operation` | Analog/math assignment | %MW0 := %IW1.0 |
| `Comparison` | Value comparison block | %MW1 > 500 |
| `TimerFunctionBlock` | Timer block (TON/TOF/TP) | Delay timer |
| `CounterFunctionBlock` | Counter block (CTU/CTD) | Part counter |

### Operation Element (Analog Assignment)
**Reference:** `test_analog_Card_reference.smbp`
```xml
<LadderEntity>
  <ElementType>Operation</ElementType>
  <OperationExpression>%MW0 := %IW1.0</OperationExpression>
  <Row>0</Row>
  <Column>9</Column>
  <ChosenConnection>Left</ChosenConnection>
</LadderEntity>
```
IL: `[ %MW0 := %IW1.0 ]`

### Analog Input Best Practice (CRITICAL)

**NEVER use %IW addresses directly in calculations. ALWAYS copy to a memory word first.**

**Why:**
1. Analog inputs can change mid-scan, causing inconsistent calculations
2. Memory word provides stable snapshot for entire scan cycle
3. Easier debugging - raw value visible separately from scaled value
4. Safer when same input is used in multiple calculations

**WRONG - Direct %IW usage:**
```xml
<OperationExpression>%MF100 := INT_TO_REAL(%IW0.0 - 2000) / 8.0</OperationExpression>
```

**CORRECT - Copy to %MW first, then calculate:**
```xml
<!-- Rung 1: Copy raw analog to memory word -->
<OperationExpression>%MW100 := %IW0.0</OperationExpression>

<!-- Rung 2: Calculate scaled value from memory word -->
<OperationExpression>%MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0</OperationExpression>
```

**Recommended Address Layout:**
| Address | Symbol | Description |
|---------|--------|-------------|
| `%MW100` | RAW_LEVEL | Copy of %IW0.0 (raw 4-20mA) |
| `%MW101` | RAW_TEMP | Copy of %IW1.0 (raw RTD) |
| `%MF102` | HMI_TANK_LITERS | Scaled from %MW100 |
| `%MF104` | HMI_TEMPERATURE | Scaled from %MW101 |
| `%MF106` | HMI_LEVEL_PERCENT | Calculated from %MF102 |

**CRITICAL: %MF addresses must use EVEN numbers only (skip 1 address between each)!**

---

### 4-20mA Scaling Formula (CRITICAL)
TM221CE40T built-in analog input: 0-10000 raw for 0-20mA
- 4mA = 2000 raw
- 20mA = 10000 raw

**Formula for 4-20mA to engineering units:**
```
Scaled_Value = (Raw - 2000) * (Max_EU - Min_EU) / 8000 + Min_EU
```

**Example: 4-20mA to 0-1000 liters (using memory word):**
```xml
<!-- Step 1: Copy raw input -->
<OperationExpression>%MW100 := %IW0.0</OperationExpression>

<!-- Step 2: Scale to engineering units -->
<OperationExpression>%MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0</OperationExpression>
```
- When Raw = 2000 (4mA): (2000-2000)/8 = 0 liters
- When Raw = 10000 (20mA): (10000-2000)/8 = 1000 liters

### INT_TO_REAL for HMI Tags (RECOMMENDED)
For HMI tags that need decimal precision, use INT_TO_REAL to convert integer values to floating point.

**IMPORTANT: Always use memory word as source, never %IW directly.**

**Complete Example - Level Scaling with proper %IW handling:**
```xml
<!-- Rung 3: Copy raw level input to memory word -->
<OperationExpression>%MW100 := %IW0.0</OperationExpression>

<!-- Rung 4: Copy raw RTD input to memory word -->
<OperationExpression>%MW101 := %IW1.0</OperationExpression>

<!-- Rung 5: Scale level to liters (from memory word) -->
<OperationExpression>%MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0</OperationExpression>

<!-- Rung 6: Scale RTD to degrees C (from memory word) -->
<OperationExpression>%MF104 := INT_TO_REAL(%MW101) / 10.0</OperationExpression>

<!-- Rung 7: Calculate percent (from scaled liters) -->
<OperationExpression>%MF106 := %MF102 / 10.0</OperationExpression>
```

**Memory Word Declaration (for raw values):**
```xml
<MemoryWords>
  <MemoryWord>
    <Address>%MW100</Address>
    <Index>100</Index>
    <Symbol>RAW_LEVEL</Symbol>
    <Comment>Raw 4-20mA level input (copy of %IW0.0)</Comment>
  </MemoryWord>
  <MemoryWord>
    <Address>%MW101</Address>
    <Index>101</Index>
    <Symbol>RAW_TEMP</Symbol>
    <Comment>Raw RTD input (copy of %IW1.0)</Comment>
  </MemoryWord>
</MemoryWords>
```

**Memory Float Declaration (for HMI values):**
**CRITICAL: Use EVEN addresses only - %MF occupies 2 words (32-bit)!**
```xml
<MemoryFloats>
  <MemoryFloat>
    <Address>%MF102</Address>
    <Index>102</Index>
    <Symbol>HMI_TANK_LITERS</Symbol>
    <Comment>HMI Tag: Tank volume in liters (0.0-1000.0)</Comment>
  </MemoryFloat>
  <MemoryFloat>
    <Address>%MF104</Address>
    <Index>104</Index>
    <Symbol>HMI_TEMPERATURE</Symbol>
    <Comment>HMI Tag: Temperature in degrees C</Comment>
  </MemoryFloat>
  <MemoryFloat>
    <Address>%MF106</Address>
    <Index>106</Index>
    <Symbol>HMI_LEVEL_PERCENT</Symbol>
    <Comment>HMI Tag: Level percentage (0.0-100.0)</Comment>
  </MemoryFloat>
</MemoryFloats>
```

**Comparison with Float Values:**
```xml
<ComparisonExpression>%MF102 > 950.0</ComparisonExpression>
```
IL: `AND   [ %MF102 > 950.0 ]`

### Comparison Element (Value Comparison)
**Reference:** `test_analog_Card_reference.smbp`

**CRITICAL: Comparison elements SPAN 2 COLUMNS (Column N and N+1)**

```xml
<LadderEntity>
  <ElementType>Comparison</ElementType>
  <ComparisonExpression>%MW1 > 95</ComparisonExpression>
  <Row>0</Row>
  <Column>1</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```
IL: `AND   [ %MW1 > 95 ]`

**Comparison Operators:** `=`, `<>`, `<`, `>`, `<=`, `>=`

**CRITICAL: NEVER use INT_TO_REAL inside ComparisonExpression!**

INT_TO_REAL is a conversion function, NOT valid in comparisons.

**WRONG - INT_TO_REAL in comparison (CAUSES COMPILATION ERROR!):**
```xml
<ComparisonExpression>%MF110 > INT_TO_REAL(%MW20)</ComparisonExpression>
```

**CORRECT - Convert first in separate rung, then compare:**
```xml
<!-- Rung N: Convert setpoint to float -->
<OperationExpression>%MF108 := INT_TO_REAL(%MW20)</OperationExpression>

<!-- Rung N+1: Compare floats ONLY -->
<ComparisonExpression>%MF110 > %MF108</ComparisonExpression>
```

**Rule: ComparisonExpression can ONLY contain:**
- `%MW`, `%MF`, `%MD` addresses
- Numeric constants (500, 95.0)
- Comparison operators (=, <>, <, >, <=, >=)
- **NO function calls** (INT_TO_REAL, REAL_TO_INT, ABS, etc.)

**Column Layout with Comparison:**
- Column 0: Input contact
- Column 1-2: Comparison block (spans 2 columns)
- Column 3-9: Line elements to fill gaps
- Column 10: Output coil

Example for Tank Full detection:
```
Col 0: %M0 SYSTEM_READY (NormalContact)
Col 1-2: %MW12 > 95 (Comparison - spans 2 columns)
Col 3-9: Line elements
Col 10: %M1 TANK_FULL (Coil)
```

---

## Grid Layout Rules

### 10-Column Grid System (Columns 0-10)
- **Column 0**: First logic element (typically input contact)
- **Columns 1-9**: Logic elements or Line elements (fill empty columns)
- **Column 10**: Output coil ONLY

### Connection Types (ChosenConnection)
| Value | Meaning | Use Case |
|-------|---------|----------|
| `Left, Right` | Horizontal through | Standard element |
| `Down, Left, Right` | Branch start | Parallel branch begins |
| `Up, Left` | Branch end | Parallel branch ends |
| `Left` | Terminal | Output coil (no right connection) |

### Row Usage
- **Row 0**: Main logic path
- **Row 1+**: Parallel branches (seal-in, OR logic)

---

## Instruction List (IL) Commands

| Command | Description | Example |
|---------|-------------|---------|
| `LD` | Load (start new rung) | `LD    %I0.0` |
| `ST` | Store (output) | `ST    %Q0.0` |
| `AND` | Logical AND | `AND   %I0.2` |
| `OR` | Logical OR | `OR    %M0` |
| `ANDN` | AND NOT | `ANDN  %I0.1` |
| `ORN` | OR NOT | `ORN   %I0.3` |
| `IN` | Timer/Counter input | `IN    %TM0` |
| `S` | Set coil | `S     %M10` |
| `R` | Reset coil | `R     %M10` |

---

## I/O Addressing Reference

### TM221CE24T Specifications
| Type | Address Range | Count |
|------|---------------|-------|
| Digital Inputs | `%I0.0` to `%I0.13` | 14 |
| Digital Outputs | `%Q0.0` to `%Q0.9` | 10 |
| Analog Inputs | `%IW0.0` to `%IW0.1` | 2 |
| Memory Bits | `%M0` to `%M511` | 512 |
| Memory Words | `%MW0` to `%MW1999` | 2000 |
| Timers | `%TM0` to `%TM254` | 255 |
| Counters | `%C0` to `%C254` | 255 |
| High-Speed Counters | `%HSC0` to `%HSC3` | 4 |

### TM221CE40T Specifications
| Type | Address Range | Count |
|------|---------------|-------|
| Digital Inputs | `%I0.0` to `%I0.23` | 24 |
| Digital Outputs | `%Q0.0` to `%Q0.15` | 16 |
| Analog Inputs | `%IW0.0` to `%IW0.1` | 2 |

### TM3AI4 Expansion Module (4 Analog Inputs)
**Reference:** `test_analog_Card_reference.smbp`

| Address | Description |
|---------|-------------|
| `%IW1.0` | Analog Input 1 |
| `%IW1.1` | Analog Input 2 |
| `%IW1.2` | Analog Input 3 |
| `%IW1.3` | Analog Input 4 |

**Type Values:**
- `3` = Type_4_20mA
- `31` = Type_NotUsed

**Scope Values:**
- `32` = Scope_Customized (use Min/Max)
- `128` = Scope_NotUsed

```xml
<Extensions>
  <ModuleExtensionObject>
    <Reference>TM3AI4/G</Reference>
    <AnalogInputs>
      <AnalogIO>
        <Address>%IW1.0</Address>
        <Symbol>TANK_LEVEL</Symbol>
        <Type>
          <Value>3</Value>
          <Name>Type_4_20mA</Name>
        </Type>
        <Scope>
          <Value>32</Value>
          <Name>Scope_Customized</Name>
        </Scope>
        <Minimum>300</Minimum>
        <Maximum>3000</Maximum>
        <IsInput>true</IsInput>
      </AnalogIO>
    </AnalogInputs>
  </ModuleExtensionObject>
</Extensions>
```

---

## Retentive Memory (CRITICAL)

**In Machine Expert Basic, the first 100 memory words are RETENTIVE by default.**

### Memory Word Retention
| Address Range | Behavior | Use For |
|---------------|----------|---------|
| `%MW0` - `%MW99` | **Retentive** (preserved after power loss) | Setpoints, counters, recipe data, accumulated totals |
| `%MW100` - `%MW7999` | **Non-retentive** (reset to 0 on power cycle) | Live sensor readings, calculated values, status indicators |

### Memory Float Retention
| Address Range | Behavior | Use For |
|---------------|----------|---------|
| `%MF0` - `%MF99` | **Retentive** | Setpoints with decimals, calibration values |
| `%MF100` - `%MF7999` | **Non-retentive** | Live sensor readings, HMI display values |

### HMI Tag Best Practice
**ALWAYS use non-retentive addresses (%MF100+) for live sensor readings:**

```xml
<!-- WRONG: Retentive address shows stale data after power cycle -->
<Address>%MF10</Address>

<!-- CORRECT: Non-retentive address resets to 0 on startup -->
<Address>%MF100</Address>
```

**Recommended HMI Tag Addresses (EVEN NUMBERS ONLY!):**
| Tag | Address | Description |
|-----|---------|-------------|
| HMI_TANK_LITERS | `%MF102` | Live tank level (0.0-1000.0) |
| HMI_TEMPERATURE | `%MF104` | Live temperature reading |
| HMI_LEVEL_PERCENT | `%MF106` | Live level percentage (0.0-100.0) |
| HMI_LEVEL_SETPOINT | `%MF0` | User-configured setpoint (retentive) |
| HMI_TEMP_SETPOINT | `%MF2` | User-configured temp setpoint (retentive) |

**WHY EVEN NUMBERS? %MF uses 32-bit (2 words):**
- `%MF102` uses %MW102 + %MW103
- `%MF103` would OVERLAP with %MF102 (uses %MW103 + %MW104)
- `%MF104` is safe (uses %MW104 + %MW105)

### Cold/Warm Start Reset Pattern
Reset non-retentive HMI floats on startup to ensure clean state:
```xml
<OperationExpression>%MF102 := 0.0</OperationExpression>
<OperationExpression>%MF104 := 0.0</OperationExpression>
<OperationExpression>%MF106 := 0.0</OperationExpression>
```

---

## Symbol Definitions (CRITICAL)

**Reference:** `Tank_Level_v18_reference.smbp`

Symbols must be defined in THREE places:
1. **LadderEntity** - for display in ladder diagram
2. **MemoryBits section** - for %M addresses
3. **DiscretOutput section** - for %Q addresses

### MemoryBits Section (for %M symbols)
```xml
<MemoryBits>
  <MemoryBit>
    <Address>%M0</Address>
    <Index>0</Index>
    <Symbol>ENABLE_OPERATION</Symbol>
  </MemoryBit>
  <MemoryBit>
    <Address>%M1</Address>
    <Index>1</Index>
    <Symbol>TANK_LEVEL_LOW</Symbol>
  </MemoryBit>
  <MemoryBit>
    <Address>%M2</Address>
    <Index>2</Index>
    <Symbol>TANK_LEVEL_HIGH</Symbol>
  </MemoryBit>
</MemoryBits>
```

### DiscretOutput Section (for %Q symbols)
```xml
<DigitalOutputs>
  <DiscretOutput>
    <Address>%Q0.0</Address>
    <Index>0</Index>
    <Symbol>INLET_VALVE</Symbol>
  </DiscretOutput>
  <DiscretOutput>
    <Address>%Q0.1</Address>
    <Index>1</Index>
    <Symbol>OUTLET_VALVE</Symbol>
  </DiscretOutput>
</DigitalOutputs>
```

### LadderEntity Symbol (for contacts/coils)
```xml
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%M0</Descriptor>
  <Comment />
  <Symbol>ENABLE_OPERATION</Symbol>
  <Row>0</Row>
  <Column>0</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

**Note:** Symbol names must match across all three locations for the same address.

---

## Hardware Configuration Template (TM221CE24T)

```xml
<HardwareConfiguration>
  <Plc>
    <Cpu>
      <Index>0</Index>
      <InputNb>0</InputNb>
      <OutputNb>0</OutputNb>
      <Kind>0</Kind>
      <Reference>TM221CE24T</Reference>
      <Name>MyController</Name>
      <Consumption5V>520</Consumption5V>
      <Consumption24V>200</Consumption24V>
      <DigitalInputs>
        <DiscretInput>
          <Address>%I0.0</Address>
          <Index>0</Index>
          <Symbol>START_MOTOR</Symbol>
          <DIFiltering>DIFilterings4ms</DIFiltering>
          <DILatch>DILatchNo</DILatch>
        </DiscretInput>
        <DiscretInput>
          <Address>%I0.1</Address>
          <Index>1</Index>
          <Symbol>STOP_MOTOR</Symbol>
          <DIFiltering>DIFilterings4ms</DIFiltering>
          <DILatch>DILatchNo</DILatch>
        </DiscretInput>
        <!-- Additional inputs %I0.2 through %I0.13 -->
      </DigitalInputs>
      <DigitalOutputs>
        <DiscretOutput>
          <Address>%Q0.0</Address>
          <Index>0</Index>
          <Symbol>MOTOR_RUN</Symbol>
        </DiscretOutput>
        <!-- Additional outputs %Q0.1 through %Q0.9 -->
      </DigitalOutputs>
      <EthernetConfiguration>
        <NetworkName>M221</NetworkName>
        <IpAllocationMode>ByDhcp</IpAllocationMode>
        <IpAddress>192.168.1.10</IpAddress>
        <SubnetMask>255.255.255.0</SubnetMask>
        <GatewayAddress>192.168.1.1</GatewayAddress>
        <ModbusServerEnabled>true</ModbusServerEnabled>
        <ProgrammingProtocolEnabled>true</ProgrammingProtocolEnabled>
      </EthernetConfiguration>
      <HardwareId>1933</HardwareId>
      <IsExpander>false</IsExpander>
    </Cpu>
    <Extensions />
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
```

---

## Timer Configuration

### Timer Declaration (CRITICAL - Use TimerTM format)
**Reference:** `Template for configuration of cards.smbp`

```xml
<Timers>
  <TimerTM>
    <Address>%TM0</Address>
    <Index>0</Index>
    <Preset>3</Preset>
    <Base>OneSecond</Base>
  </TimerTM>
</Timers>
```

**CRITICAL:** Use `<TimerTM>` NOT `<Timer>`. Use `<Base>` NOT `<TimeBase>`.

### Base Values (Time Base)
| Base Value | Duration |
|------------|----------|
| `OneMillisecond` | 1 millisecond |
| `TenMilliseconds` | 10 milliseconds |
| `HundredMilliseconds` | 100 milliseconds |
| `OneSecond` | 1 second |
| `OneMinute` | 1 minute |

### Timer Usage in Ladder
The timer in ladder only references the address - configuration is in `<Timers>` section:
```xml
<LadderEntity>
  <ElementType>Timer</ElementType>
  <Descriptor>%TM0</Descriptor>
  <Comment />
  <Symbol />
  <Row>0</Row>
  <Column>9</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

**Note:** Timer type (TON/TOF/TP) is set by the IL code (BLK %TM0 / IN / OUT_BLK pattern creates TON behavior).

### Timer Done Bit - CRITICAL RULE (v3.4)

**NEVER use %TM addresses as NormalContact descriptors in ladder!**

| Usage | Ladder Contact | IL Instruction | Result |
|-------|----------------|----------------|--------|
| **WRONG** | `<Descriptor>%TM1</Descriptor>` | `LD %TM1.Q` | ERROR! |
| **WRONG** | `<Descriptor>%TM1.Q</Descriptor>` | `LD %TM1.Q` | ERROR! |
| **CORRECT** | `<Descriptor>%M11</Descriptor>` | `LD %M11` | Works! |

**Timer Q (done) output can ONLY be accessed INSIDE a BLK/END_BLK structure using: `LD Q`**

**OUTSIDE the BLK structure, you MUST use a dedicated memory bit to capture timer done status.**

### Correct Pattern: Capture Timer Done to Memory Bit

**Step 1: In the timer rung, capture Q to a dedicated memory bit:**
```
IL Code for Timer Block:
BLK %TM1
LD  %M3              ; Step input condition
IN
OUT_BLK
LD  Q                ; Get timer done output
ST  %Q0.0            ; Drive output directly (optional)
ST  %M11             ; CAPTURE timer done to memory bit for use in other rungs!
END_BLK
```

**Step 2: In subsequent rungs, use the MEMORY BIT (not the timer):**
```
; End current step when timer done
LD  %M11             ; Use memory bit that captured timer done
R   %M3              ; Reset step flag

; Start next step when timer done
LD  %M11             ; Use memory bit for next step
S   %M4              ; Set next step flag
```

### Timer Done Memory Bit Allocation
| Timer | Capture To | Symbol |
|-------|------------|--------|
| %TM0 | %M10 | TM0_DONE |
| %TM1 | %M11 | TM1_DONE |
| %TM2 | %M12 | TM2_DONE |
| %TM3 | %M13 | TM3_DONE |

**SYMBOLS_JSON must include timer done bits:**
```json
{"address": "%M10", "symbol": "TM0_DONE", "comment": "Timer 0 done flag"},
{"address": "%M11", "symbol": "TM1_DONE", "comment": "Timer 1 done flag"},
{"address": "%M12", "symbol": "TM2_DONE", "comment": "Timer 2 done flag"}
```

---

## System Bits Reference

| Address | Symbol | Description |
|---------|--------|-------------|
| `%S0` | SB_COLDSTART | Cold start indicator |
| `%S1` | SB_WARMSTART | Warm start indicator |
| `%S4` | SB_TB10MS | 10ms pulse |
| `%S5` | SB_TB100MS | 100ms pulse |
| `%S6` | SB_TB1S | 1 second pulse |
| `%S7` | SB_TB1MIN | 1 minute pulse |
| `%S12` | SB_RUNMODE | Controller in RUN mode |
| `%S13` | SB_FIRSTRUN | First scan in RUN |

---

## Common Programming Patterns

### Pattern 1: Motor Start/Stop with Seal-In
```
Logic: (START OR MOTOR_RUN) AND NOT STOP = MOTOR_RUN

Ladder:
    START_MOTOR    STOP_MOTOR               MOTOR_RUN
 |----[ ]------------[/]------------------( )---|
 |     %I0.0         %I0.1                %Q0.0 |
 |                                              |
 |    MOTOR_RUN                                 |
 |----[ ]--------+                              |
      %Q0.0      |______________________________|

IL:
LD    %I0.0      ; Load START button
OR    %Q0.0      ; OR with output (seal-in)
ANDN  %I0.1      ; AND NOT STOP button
ST    %Q0.0      ; Store to motor output
```

### Pattern 2: Sequential Lights with Timers
```
Rung 1: Enable control (seal-in)
Rung 2: Light 1 ON when enabled (immediate)
Rung 3: Timer 1 starts when enabled
Rung 4: Light 2 ON when Timer 1 done
Rung 5: Timer 2 starts when Timer 1 done
Rung 6: Light 3 ON when Timer 2 done
```

### Pattern 3: Interlock (Forward/Reverse)
```
FWD = FWD_CMD AND NOT REV_RUNNING
REV = REV_CMD AND NOT FWD_RUNNING
```

---

## Django Generator Implementation

### Django Model for PLC Projects

```python
# plc_generator/models.py
from django.db import models

class PLCProject(models.Model):
    CONTROLLER_CHOICES = [
        ('TM221CE16T', 'TM221CE16T (16 I/O)'),
        ('TM221CE24T', 'TM221CE24T (24 I/O)'),
        ('TM221CE40T', 'TM221CE40T (40 I/O)'),
    ]

    name = models.CharField(max_length=100)
    controller = models.CharField(max_length=20, choices=CONTROLLER_CHOICES, default='TM221CE24T')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    smbp_file = models.FileField(upload_to='smbp_files/', blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.controller})"


class LadderRung(models.Model):
    project = models.ForeignKey(PLCProject, on_delete=models.CASCADE, related_name='rungs')
    order = models.PositiveIntegerField()
    name = models.CharField(max_length=100)
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ['order']


class LadderElement(models.Model):
    ELEMENT_TYPES = [
        ('NormalContact', 'NO Contact'),
        ('NegatedContact', 'NC Contact'),
        ('Coil', 'Output Coil'),
        ('Line', 'Horizontal Line'),
        ('TimerFunctionBlock', 'Timer'),
    ]

    rung = models.ForeignKey(LadderRung, on_delete=models.CASCADE, related_name='elements')
    element_type = models.CharField(max_length=30, choices=ELEMENT_TYPES)
    address = models.CharField(max_length=20)  # e.g., %I0.0, %Q0.0
    symbol = models.CharField(max_length=50, blank=True)
    row = models.PositiveIntegerField(default=0)
    column = models.PositiveIntegerField()
    connection = models.CharField(max_length=50, default='Left, Right')
```

### Django View for SMBP Generation

```python
# plc_generator/views.py
from django.http import HttpResponse, FileResponse
from django.views import View
from django.shortcuts import get_object_or_404
from .models import PLCProject
from .services import SMBPGenerator

class GenerateSMBPView(View):
    def get(self, request, project_id):
        project = get_object_or_404(PLCProject, id=project_id)
        generator = SMBPGenerator(project)
        smbp_content = generator.generate()

        response = HttpResponse(smbp_content, content_type='application/xml')
        response['Content-Disposition'] = f'attachment; filename="{project.name}.smbp"'
        return response
```

### Django Service for SMBP XML Generation

```python
# plc_generator/services.py
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

class SMBPGenerator:
    def __init__(self, project):
        self.project = project

    def generate(self):
        root = Element('ProjectDescriptor')
        root.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        root.set('xmlns:xsd', 'http://www.w3.org/2001/XMLSchema')

        SubElement(root, 'ProjectVersion').text = '3.0.0.0'
        SubElement(root, 'ManagementLevel').text = 'FunctLevelMan21_0'
        SubElement(root, 'Name').text = self.project.name
        SubElement(root, 'CurrentCultureName').text = 'en-GB'

        # Build SoftwareConfiguration
        software_config = SubElement(root, 'SoftwareConfiguration')
        self._build_pous(software_config)
        self._build_memory_allocation(software_config)

        # Build HardwareConfiguration
        hardware_config = SubElement(root, 'HardwareConfiguration')
        self._build_hardware(hardware_config)

        return self._prettify(root)

    def _prettify(self, elem):
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

### Django URL Configuration

```python
# plc_generator/urls.py
from django.urls import path
from .views import GenerateSMBPView

urlpatterns = [
    path('generate/<int:project_id>/', GenerateSMBPView.as_view(), name='generate_smbp'),
]
```

### Django REST API (Optional)

```python
# plc_generator/api.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PLCProject
from .serializers import PLCProjectSerializer
from .services import SMBPGenerator

class PLCProjectViewSet(viewsets.ModelViewSet):
    queryset = PLCProject.objects.all()
    serializer_class = PLCProjectSerializer

    @action(detail=True, methods=['get'])
    def generate_smbp(self, request, pk=None):
        project = self.get_object()
        generator = SMBPGenerator(project)
        smbp_content = generator.generate()
        return Response({'smbp_xml': smbp_content})
```

---

## Ethernet Configuration (CRITICAL)

**Reference:** `Tank_Level_v18.smbp`, `Tank_1m_Ultrasonic_TM221CE16T.smbp`

### Common Error: Modbus TCP Validation
```
Modbus TCP: Value must be between 1 and 247
Value must be between 1 and 20
```

**Cause:** Invalid Ethernet/Modbus configuration when ModbusServerEnabled is true but UnitId is nil.

### Correct Ethernet Configuration (Default)
```xml
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
```

### Key Rules
| Setting | Default Value | Notes |
|---------|---------------|-------|
| `IpAllocationMode` | `FixedAddress` | Use FixedAddress with 0.0.0.0 for unconfigured |
| `ModbusServerEnabled` | `false` | Set to false to avoid UnitId validation |
| `UnitId` | `xsi:nil="true"` | OK when ModbusServerEnabled=false |
| `UnitId` | `1-247` | REQUIRED when ModbusServerEnabled=true |
| `ProgrammingProtocolEnabled` | `false` | Default disabled |
| `AutoDiscoveryProtocolEnabled` | `false` | Default disabled |

### If Modbus Server is Required
When `ModbusServerEnabled` is `true`, you MUST set valid values:
```xml
<UnitId>1</UnitId>  <!-- Must be 1-247 -->
<ModbusServerEnabled>true</ModbusServerEnabled>
```

---

## Validation Checklist

Before generating any .smbp file, verify:

- [ ] Root element is `<ProjectDescriptor>` with proper namespaces
- [ ] `<ProjectVersion>` is set to `3.0.0.0`
- [ ] `<ManagementLevel>` is `FunctLevelMan21_0`
- [ ] All columns 0-10 are filled (use Line elements for gaps)
- [ ] Coils are ONLY in column 10
- [ ] Both `<LadderElements>` AND `<InstructionLines>` are present
- [ ] `<ChosenConnection>` values are correct for element position
- [ ] Timer declarations exist in `<Timers>` section before use
- [ ] Hardware configuration matches target controller
- [ ] I/O symbols are assigned in `<DigitalInputs>` and `<DigitalOutputs>`
- [ ] **EthernetConfiguration uses default values (ModbusServerEnabled=false)**
- [ ] **UnitId is nil OR valid (1-247) based on ModbusServerEnabled**

---

## BEST PRACTICE: Emergency Rung (MANDATORY)

**Reference:** `Template for configuration of cards.smbp`

Every program MUST have an emergency rung as the FIRST rung. This generates a SYSTEM_READY bit that gates all other operations.

### Emergency Rung Pattern
```xml
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
      <ElementType>Coil</ElementType>
      <Descriptor>%M0</Descriptor>
      <Comment />
      <Symbol>SYSTEM_READY</Symbol>
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <!-- Line elements for columns 3-9 -->
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity>
      <InstructionLine>BLK   %TM0</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>LD    %I0.0</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>IN</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>OUT_BLK</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>LD    Q</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>ST    %M0</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>END_BLK</InstructionLine>
      <Comment />
    </InstructionLineEntity>
  </InstructionLines>
  <Name />
  <MainComment />
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>
```

**Logic:** Emergency pushbutton (%I0.0) must be pressed and held. Timer %TM0 provides startup delay. Output %M0 (SYSTEM_READY) is used to gate all other operations.

---

## BEST PRACTICE: Cold/Warm Start Word Reset (MANDATORY)

**Reference:** `Template for configuration of cards.smbp`

The SECOND rung should reset memory words that might cause issues after a cold or warm restart.

### Word Reset Rung Pattern
```xml
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S0</Descriptor>
      <Comment>Indicates or executes a cold start (data initialized to default values)</Comment>
      <Symbol>SB_COLDSTART</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Down, Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S1</Descriptor>
      <Comment>Indicates there was a warm start with data backup</Comment>
      <Symbol>SB_WARMSTART</Symbol>
      <Row>1</Row>
      <Column>0</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Operation</ElementType>
      <OperationExpression>%MW0 := 0</OperationExpression>
      <Row>0</Row>
      <Column>9</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <!-- Line elements for columns 1-8 -->
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity>
      <InstructionLine>LD    %S0</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>OR    %S1</InstructionLine>
      <Comment />
    </InstructionLineEntity>
    <InstructionLineEntity>
      <InstructionLine>[ %MW0 := 0 ]</InstructionLine>
      <Comment />
    </InstructionLineEntity>
  </InstructionLines>
  <Name />
  <MainComment />
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>
```

**Logic:** On cold start (%S0) OR warm start (%S1), reset %MW0 to 0. Add more operations as needed to reset other words that should not retain values.

**Note:** Words that NEED to retain values (like setpoints) should NOT be reset here.

---

## TM3TI4/G Temperature Input Module (RTD)

**Reference:** `Template for configuration of cards.smbp`
**HardwareId:** 199

### CRITICAL: Analog Input Type Configuration (v3.8)

**When using TM3TI4/G with RTD sensors, you MUST configure the analog input Type!**

**TM3TI4/G Type Values (RTD Sensors):**
| Value | Name | Description |
|-------|------|-------------|
| 0 | Type_Pt100_3W | Pt100 3-wire RTD |
| 1 | Type_Pt100_2W | Pt100 2-wire RTD |
| 2 | Type_Pt1000_3W | Pt1000 3-wire RTD |
| 3 | Type_Pt1000_2W | Pt1000 2-wire RTD |
| 4 | Type_Ni100_3W | Ni100 3-wire RTD |
| 5 | Type_Ni100_2W | Ni100 2-wire RTD |
| 6 | Type_Ni1000_3W | Ni1000 3-wire RTD |
| 7 | Type_Ni1000_2W | Ni1000 2-wire RTD |
| 31 | Type_NotUsed | Not configured (default) |

**Scope Values (Temperature Unit):**
| Value | Name | Description |
|-------|------|-------------|
| 2 | Scope_Celsius | Temperature in Celsius (x0.1 deg C) |
| 3 | Scope_Fahrenheit | Temperature in Fahrenheit (x0.1 deg F) |
| 128 | Scope_NotUsed | Not configured (default) |

**WRONG: Type_NotUsed causes "analog input not configured" error**
```xml
<Type>
  <Value>31</Value>
  <Name>Type_NotUsed</Name>
</Type>
```

**CORRECT: Configure for Pt100 3-wire with Celsius output**
```xml
<Type>
  <Value>0</Value>
  <Name>Type_Pt100_3W</Name>
</Type>
<Scope>
  <Value>2</Value>
  <Name>Scope_Celsius</Name>
</Scope>
<Minimum>-2000</Minimum>
<Maximum>8500</Maximum>
```

**Temperature Range for RTD (in 0.1 deg units):**
| Sensor | Celsius Range | Raw Value Range |
|--------|---------------|-----------------|
| Pt100  | -200 to 850 deg C | -2000 to 8500 |
| Pt1000 | -200 to 850 deg C | -2000 to 8500 |
| Ni100  | -60 to 250 deg C | -600 to 2500 |
| Ni1000 | -60 to 180 deg C | -600 to 1800 |

### Module Configuration (Pt100 3-wire Example)
```xml
<ModuleExtensionObject>
  <Index>0</Index>
  <InputNb>0</InputNb>
  <OutputNb>0</OutputNb>
  <Kind>0</Kind>
  <Reference>TM3TI4/G</Reference>
  <Consumption5V>40</Consumption5V>
  <Consumption24V>0</Consumption24V>
  <TechnicalConfiguration>
    <!-- Full TechnicalConfiguration with all zeros for expansion modules -->
  </TechnicalConfiguration>
  <DigitalInputs />
  <DigitalOutputs />
  <AnalogInputs>
    <AnalogIO>
      <Address>%IW1.0</Address>
      <Index>0</Index>
      <Type>
        <Value>0</Value>
        <Name>Type_Pt100_3W</Name>
      </Type>
      <Scope>
        <Value>2</Value>
        <Name>Scope_Celsius</Name>
      </Scope>
      <Sampling>
        <Value>0</Value>
        <Name>Sampling_0_100ms</Name>
      </Sampling>
      <Minimum>-2000</Minimum>
      <Maximum>8500</Maximum>
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
    </AnalogIO>
    <!-- Repeat for %IW1.1, %IW1.2, %IW1.3 -->
  </AnalogInputs>
  <AnalogInputsStatus>
    <AnalogIoStatus>
      <Address>%IWS1.0</Address>
      <Index>0</Index>
    </AnalogIoStatus>
    <!-- Repeat for %IWS1.1, %IWS1.2, %IWS1.3 -->
  </AnalogInputsStatus>
  <AnalogOutputs />
  <AnalogOutputsStatus />
  <HighSpeedCounters />
  <PulseTrainOutputs />
  <HardwareId>199</HardwareId>
  <IsExpander>false</IsExpander>
  <IsOptionnal>false</IsOptionnal>
  <DIOFunctionalMode>DIOFunctionalModeNormal</DIOFunctionalMode>
  <HoldupTime>10</HoldupTime>
</ModuleExtensionObject>
```

### TM3TI4/G AnalogIO Fields (RTD Specific)
| Field | Description | Default |
|-------|-------------|---------|
| `Sampling` | Sampling rate (0=100ms) | Sampling_0_100ms |
| `R`, `B`, `T` | RTD coefficients | 1, 1, 1 |
| `Activation` | Activation threshold | 3100 |
| `Reactivation` | Reactivation threshold | 1500 |
| `InputFilter` | Input filter setting | 0 |
| `R1`, `R2` | Resistance values | 8700, 200 |
| `T1`, `T2` | Temperature values (Kelvin) | 234.15, 311.15 |
| `ChartCalculation` | Chart calculation flag | false |

### TM3TI4D/G (Thermocouple Version)
**HardwareId:** 203
Same structure as TM3TI4/G but for thermocouple inputs.

---

## TMC2 Cartridges

### TMC2AI2 - 2 Analog Input Cartridge
**Reference:** `Template for configuration of cards.smbp`

```xml
<Cartridge1>
  <Index>0</Index>
  <InputNb>0</InputNb>
  <OutputNb>0</OutputNb>
  <Kind>0</Kind>
  <Reference>TMC2AI2</Reference>
  <Name />
  <Consumption5V>0</Consumption5V>
  <Consumption24V>0</Consumption24V>
  <!-- Full TechnicalConfiguration -->
  <AnalogInputs>
    <AnalogIO>
      <Address>%IWC1.0</Address>
      <!-- Same structure as TM3AI4/G -->
    </AnalogIO>
  </AnalogInputs>
</Cartridge1>
```

### TMC2TI2 - 2 Temperature Input Cartridge
```xml
<Cartridge2>
  <Index>0</Index>
  <InputNb>0</InputNb>
  <OutputNb>0</OutputNb>
  <Kind>0</Kind>
  <Reference>TMC2TI2</Reference>
  <Name />
  <Consumption5V>0</Consumption5V>
  <Consumption24V>0</Consumption24V>
  <!-- Full TechnicalConfiguration -->
  <AnalogInputs>
    <AnalogIO>
      <Address>%IWC2.0</Address>
      <!-- Same structure as TM3TI4/G with R1, R2, T1, T2 -->
    </AnalogIO>
  </AnalogInputs>
</Cartridge2>
```

---

## Correct GlobalProperties Structure

**Reference:** `Template for configuration of cards.smbp`

```xml
<GlobalProperties>
  <UserInformations />
  <CompanyInformations />
  <ProjectInformations>
    <Name>Project Name</Name>
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
```

---

## Correct ReportConfiguration Structure

**Reference:** `Template for configuration of cards.smbp`

```xml
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
```

---

## TM221CE40T TechnicalConfiguration (CRITICAL)

**Reference:** `Template for configuration of cards.smbp`

The TechnicalConfiguration for TM221CE40T must have proper values (NOT all zeros):

```xml
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
  <NumTransistors>16</NumTransistors>
  <NumTransistorsMax>9999</NumTransistorsMax>
  <PidAmountMax>14</PidAmountMax>
  <PlcNumberSysBits>160</PlcNumberSysBits>
  <PlcNumberSysWords>234</PlcNumberSysWords>
  <PlcStartAddrSysBits>16</PlcStartAddrSysBits>
  <PlcType>0</PlcType>
  <TimersMax>255</TimersMax>
  <AnalogInputPrecision>0</AnalogInputPrecision>
  <AnalogOutputPrecision>0</AnalogOutputPrecision>
  <StepCountersMax>8</StepCountersMax>
  <CountersMax>255</CountersMax>
  <DrumsMax>8</DrumsMax>
  <ExternalRamSize>184320</ExternalRamSize>
  <ExternalRamSizeWithDisplay>221776</ExternalRamSizeWithDisplay>
  <ExternalRamStart>117538816</ExternalRamStart>
  <InternalRamAppStart>512</InternalRamAppStart>
  <InternalRamSize>130560</InternalRamSize>
  <InternalBitsMax>1024</InternalBitsMax>
  <InternalEepromSize>32</InternalEepromSize>
  <MetadataAreaSize>45056</MetadataAreaSize>
  <ScheduleBlocksMax>16</ScheduleBlocksMax>
  <ShiftBitRegistersMax>8</ShiftBitRegistersMax>
  <SubroutinesMax>64</SubroutinesMax>
  <SupportDoubleWord>true</SupportDoubleWord>
  <SupportEvents>true</SupportEvents>
  <SupportFloatingPoint>true</SupportFloatingPoint>
  <NumberOf1MsTimerBase>6</NumberOf1MsTimerBase>
  <UdfbInstanceMax>32</UdfbInstanceMax>
  <UdfMax>64</UdfMax>
  <UdfObjectsMax>4096</UdfObjectsMax>
</TechnicalConfiguration>
```

---

## CRITICAL: Hardware Configuration Rules (v3.2)

### Only Include Specified Modules
**NEVER** include expansion modules or cartridges that the user did not explicitly request.

**Template has multiple modules** - When using `Template for configuration of cards.smbp`, it contains:
- Multiple ModuleExtensionObjects (TM3DI32K, TM3DQ32TK, TM3AI8/G, TM3TI4D/G, TM3TI4/G)
- TMC2AI2 cartridge
- TMC2TI2 cartridge

**You MUST clean these** based on user requirements.

### Extension Module Index = Address Slot
| Index | Slot | Address Prefix |
|-------|------|----------------|
| 0 | 1 | %IW1.x, %I1.x, %Q1.x |
| 1 | 2 | %IW2.x, %I2.x, %Q2.x |
| 2 | 3 | %IW3.x, %I3.x, %Q3.x |

**Example**: TM3TI4/G as ONLY expansion module:
```xml
<ModuleExtensionObject>
  <Index>0</Index>  <!-- Index 0 = Slot 1 = %IW1.x -->
  <Reference>TM3TI4/G</Reference>
  <AnalogInputs>
    <AnalogIO>
      <Address>%IW1.0</Address>  <!-- NOT %IW5.0 -->
    </AnalogIO>
  </AnalogInputs>
</ModuleExtensionObject>
```

### Clearing Unused Cartridges
When user doesn't need cartridges, clear the Reference:
```xml
<Cartridge1>
  <Index>0</Index>
  <InputNb>0</InputNb>
  <OutputNb>0</OutputNb>
  <Kind>0</Kind>
  <Reference />  <!-- Empty reference = no cartridge -->
</Cartridge1>
```

---

## CRITICAL: System Ready Timer Pattern (v3.2)

**Every program MUST have a System Ready rung with startup delay timer.**

### Ladder Structure
```
Column 0: EMERGENCY_PB (%I0.0) - NormalContact
Column 1: Timer %TM0 - Timer element (spans column 1-2)
Column 3-9: Line elements
Column 10: SYSTEM_READY (%M0) - Coil
```

### Timer Element (NOT at Column 9)
```xml
<LadderEntity>
  <ElementType>Timer</ElementType>
  <Descriptor>%TM0</Descriptor>
  <Comment />
  <Symbol />
  <Row>0</Row>
  <Column>1</Column>  <!-- Timer at Column 1 -->
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

### IL Code (BLK Pattern)
```
BLK   %TM0
LD    %I0.0
IN
OUT_BLK
LD    Q
ST    %M0
END_BLK
```

### Timer Declaration (3 second startup)
```xml
<Timers>
  <TimerTM>
    <Address>%TM0</Address>
    <Index>0</Index>
    <Preset>3</Preset>
    <Base>OneSecond</Base>
  </TimerTM>
</Timers>
```

---

## CRITICAL: Cold/Warm Start Reset Pattern (v3.6 - Parallel Outputs)

**Use PARALLEL output elements in a SINGLE rung** for efficiency. Multiple Operation elements can be stacked vertically on different rows.

### Why Parallel Outputs?
- Saves rungs (1 rung instead of 4-6)
- Reduces token usage for complex programs
- All resets execute together when condition is true

### Correct Pattern (Multiple Resets in ONE Rung with Parallel Outputs)

Ladder Layout:
```
Row 0: %S0 ---+--- Line --- Line ... --- [%MW10 := 0]
              |                           [%MF102 := 0.0]
Row 1: %S1 --OR                           [%MF104 := 0.0]
                                          [%MF106 := 0.0]
```

```xml
<RungEntity>
  <LadderElements>
    <!-- %S0 at Row 0, Column 0 with branch DOWN for OR -->
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S0</Descriptor>
      <Symbol>SB_COLDSTART</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Down, Left, Right</ChosenConnection>
    </LadderEntity>
    <!-- %S1 at Row 1, Column 0 with branch UP -->
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S1</Descriptor>
      <Symbol>SB_WARMSTART</Symbol>
      <Row>1</Row>
      <Column>0</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <!-- Lines 1-7 on Row 0 -->
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>1</Column><ChosenConnection>Left, Right</ChosenConnection></LadderEntity>
    <!-- ... more lines ... -->
    <!-- Line at Column 8 with DOWN branch to parallel outputs -->
    <LadderEntity><ElementType>Line</ElementType><Row>0</Row><Column>8</Column><ChosenConnection>Down, Left, Right</ChosenConnection></LadderEntity>
    <!-- PARALLEL Operation elements at Column 9, stacked on Rows 0,1,2,3 -->
    <LadderEntity>
      <ElementType>Operation</ElementType>
      <OperationExpression>%MW10 := 0</OperationExpression>
      <Row>0</Row>
      <Column>9</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Operation</ElementType>
      <OperationExpression>%MF102 := 0.0</OperationExpression>
      <Row>1</Row>
      <Column>9</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Operation</ElementType>
      <OperationExpression>%MF104 := 0.0</OperationExpression>
      <Row>2</Row>
      <Column>9</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>Operation</ElementType>
      <OperationExpression>%MF106 := 0.0</OperationExpression>
      <Row>3</Row>
      <Column>9</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <!-- None elements to terminate rows 1,2,3 at Column 10 -->
    <LadderEntity><ElementType>None</ElementType><Row>1</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>None</ElementType><Row>2</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
    <LadderEntity><ElementType>None</ElementType><Row>3</Row><Column>10</Column><ChosenConnection>None</ChosenConnection></LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>LD    %S0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OR    %S1</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>[ %MW10 := 0 ]</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>[ %MF102 := 0.0 ]</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>[ %MF104 := 0.0 ]</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>[ %MF106 := 0.0 ]</InstructionLine></InstructionLineEntity>
  </InstructionLines>
  <Name>Reset_HMI_Values</Name>
  <MainComment>Reset all HMI values on cold/warm start</MainComment>
</RungEntity>
```

### Parallel Output Connection Rules
- **First output (Row 0)**: ChosenConnection = "Left" only
- **Subsequent outputs (Row 1+)**: ChosenConnection = "Up, Left" (connects UP to row above)
- **Line at Column 8**: ChosenConnection = "Down, Left, Right" (branches DOWN to parallel outputs)
- **None elements**: Required at Column 10 for rows 1,2,3 to terminate branches

**CRITICAL: Use EVEN %MF addresses only!** (%MF102, %MF104, %MF106 - NOT consecutive)

---

## CRITICAL: Parallel Outputs for Scaling/Math Operations (v3.7)

**Apply the same parallel output pattern to scaling and mathematical operations that share the same enable condition.**

### WRONG (3 separate rungs):
```
Rung 1: %S6 -> %MW100 := %IW1.0
Rung 2: %S6 -> %MF102 := INT_TO_REAL(%MW100)
Rung 3: %S6 -> %MF104 := (%MF102 - 2000.0) / 8.0
```

### CORRECT (1 rung with parallel outputs):
```
%S6 ---+--- [%MW100 := %IW1.0]
       |    [%MF102 := INT_TO_REAL(%MW100)]
       |    [%MF104 := (%MF102 - 2000.0) / 8.0]
```

### IL Code:
```
LD    %S6
[ %MW100 := %IW1.0 ]
[ %MF102 := INT_TO_REAL(%MW100) ]
[ %MF104 := (%MF102 - 2000.0) / 8.0 ]
```

Same ladder XML pattern as reset rungs - stack multiple Operation elements at Column 9 on different rows.

---

## CRITICAL: Use Working Template File

**ALWAYS** use the `Template for configuration of cards.smbp` file as a base when generating new programs. This ensures:
1. Correct GlobalProperties structure
2. Correct ReportConfiguration structure
3. Proper TechnicalConfiguration values
4. All required System Bits and Words are defined
5. File opens without errors in Machine Expert Basic

### Template Location
`c:\Users\HP\Downloads\Template for configuration of cards.smbp`

### How to Use
1. Copy the template file
2. Rename to your project name
3. Modify the rungs in the Pous section
4. Update hardware configuration if different controller
5. Add/modify extension modules as needed

---

## CRITICAL: INT_TO_REAL MUST Be in Separate Conversion Rung (v3.14)

**NEVER use INT_TO_REAL inside ComparisonExpression!**
INT_TO_REAL is a conversion function, NOT valid in comparison expressions.

**WRONG - Causes "Program error(s) detected":**
```xml
<ComparisonExpression>%MF110 &lt;= INT_TO_REAL(%MW20)</ComparisonExpression>
```

**CORRECT - Convert in separate rung first:**
```
Rung N:   %MF150 := INT_TO_REAL(%MW20)    // Conversion rung
Rung N+1: %MF110 <= %MF150                 // Comparison with floats only
```

**Pattern for integer-to-float comparisons:**
1. Create conversion rung BEFORE comparison:
   - Same enable condition (e.g., %M5)
   - Operation: `%MFxxx := INT_TO_REAL(%MWyyy)`
   - Use unique %MF address for each conversion (e.g., %MF150, %MF152, %MF154)
2. Comparison rung uses pre-converted float:
   - `%MF110 <= %MFxxx` or `%MF110 > %MFxxx`
   - NO INT_TO_REAL in ComparisonExpression!

**ComparisonExpression can ONLY contain:**
- `%MW`, `%MF`, `%MD` addresses
- `%IW`, `%QW` (analog I/O words)
- Numeric constants (500, 95.0)
- Comparison operators (=, <>, <, >, <=, >=)
- **NO function calls** (INT_TO_REAL, REAL_TO_INT, ABS, etc.)

---

## CRITICAL: Digital Inputs CANNOT Be Used in Comparisons (v3.15)

**NEVER use %I/%Q/%M in ComparisonExpression!**
These are BIT addresses. Use NormalContact or NegatedContact elements instead.

**WRONG - Digital bit in comparison:**
```xml
<ComparisonExpression>%I0.7 = 1</ComparisonExpression>
```

**CORRECT - Use NormalContact element:**
```xml
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%I0.7</Descriptor>
  <Symbol>EMERGENCY_STOP</Symbol>
  <Row>1</Row>
  <Column>2</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```
IL: `OR    %I0.7` (NOT `AND   [%I0.7=1]`)

**Comparison elements can ONLY contain WORD/FLOAT addresses:**
- `%MW` (Memory Word) - OK
- `%MF` (Memory Float) - OK
- `%MD` (Memory Double) - OK
- `%IW` (Analog Input Word) - OK
- `%QW` (Analog Output Word) - OK

**Comparison elements CANNOT contain BIT addresses:**
- `%I` (Digital Input) - use NormalContact instead
- `%Q` (Digital Output) - use NormalContact instead
- `%M` (Memory Bit) - use NormalContact instead

---

## CRITICAL: Operation Blocks are for WORDS Only, NOT Memory Bits (v3.16)

**NEVER use Operation elements with %M bits!**

Operation blocks are for WORD operations (%MW/%MF/%MD), NOT bit operations (%M).

**WRONG - Causes program errors:**
```xml
<ElementType>Operation</ElementType>
<OperationExpression>%M1 := 0</OperationExpression>
```
The syntax `%M := 0` or `%M := FALSE` is INVALID in Machine Expert Basic.

**WHY THIS IS UNNECESSARY:**
- %M bits are NON-RETENTIVE - they auto-reset to 0 on cold start
- No need for S0/S1 reset rungs for %M bits
- They reset automatically when power cycles

**IF YOU MUST RESET %M BITS:**
Use `ResetCoil` element instead of `Operation`:
```xml
<LadderEntity>
  <ElementType>ResetCoil</ElementType>
  <Descriptor>%M1</Descriptor>
  <Comment />
  <Symbol>MY_FLAG</Symbol>
  <Row>0</Row>
  <Column>10</Column>
  <ChosenConnection>Left</ChosenConnection>
</LadderEntity>
```
IL: `R %M1`

**IF YOU NEED PERSISTENT VALUES:**
Use %MW (Memory Word) instead of %M:
```xml
<ElementType>Operation</ElementType>
<OperationExpression>%MW10 := 0</OperationExpression>
```
- %MW IS valid in Operation blocks
- Use %MW for values that need explicit reset or persistence

**RULE SUMMARY:**
| Address Type | Can Use in Operation? | Alternative |
|--------------|----------------------|-------------|
| `%MW` (Word) | YES | - |
| `%MF` (Float) | YES | - |
| `%MD` (Double) | YES | - |
| `%M` (Bit) | **NO** | Use SetCoil/ResetCoil/Coil |

---

## Version History

- **v3.15** (2026-01-13): DIGITAL BITS IN COMPARISONS - %I/%Q/%M are BIT addresses and cannot be used in ComparisonExpression. Use NormalContact/NegatedContact elements instead.
- **v3.14** (2026-01-13): INT_TO_REAL IN COMPARISONS - INT_TO_REAL must be in SEPARATE conversion rung before comparison. ComparisonExpression can ONLY contain %MW/%MF/%MD/%IW/%QW addresses and numeric constants. NO function calls allowed.
- **v3.8** (2026-01-04): TM3TI4/G ANALOG TYPE CONFIGURATION - RTD analog inputs MUST have Type configured (Pt100, Pt1000, etc.) instead of Type_NotUsed. Added Type values table: 0=Pt100_3W, 1=Pt100_2W, 2=Pt1000_3W, 3=Pt1000_2W, 4=Ni100_3W, 5=Ni100_2W, 6=Ni1000_3W, 7=Ni1000_2W. Scope values: 2=Celsius, 3=Fahrenheit.
- **v3.7** (2026-01-04): SCALING PARALLEL OUTPUTS - Extend v3.6 parallel output pattern to scaling and mathematical operations. When multiple scaling/math operations share the same enable condition (e.g., %S6), combine them in ONE rung with parallel outputs instead of separate rungs.
- **v3.6** (2026-01-04): PARALLEL OUTPUTS - Use multiple Operation elements stacked vertically in a SINGLE rung for resets. First output Row 0 has "Left" connection, subsequent outputs (Row 1+) have "Up, Left" connection. Line at Column 8 has "Down, Left, Right" to branch to parallel outputs. None elements at Column 10 terminate rows 1,2,3.
- **v3.5** (2026-01-04): EFFICIENCY RULES - Generator now uses max_tokens 32000 (up from 16000) to prevent truncation. Added truncation detection (checks stop_reason === 'max_tokens'). Added output validation to detect missing %Q control rungs. PRIORITIZE OUTPUT RUNGS - generate actual control logic before utility/reset rungs. Combine operations where possible (e.g., one reset rung for multiple %MW/%MF).
- **v3.4** (2026-01-04): CRITICAL - NEVER use %TM addresses as NormalContact descriptors in ladder! Timer Q (done) output can ONLY be accessed INSIDE a BLK/END_BLK structure using `LD Q`. OUTSIDE the block, you MUST capture timer done to a dedicated memory bit (e.g., %TM1 done -> %M11) and use that memory bit in subsequent rungs.
- **v3.3** (2026-01-02): CRITICAL - NEVER use consecutive %MF addresses! %MF occupies 32-bit (2 words), so %MF102 uses %MW102+103. Using %MF103 would OVERLAP. Always use EVEN addresses only: %MF102, %MF104, %MF106, etc.
- **v3.2** (2025-12-27): CRITICAL - Hardware config rules: Only include user-specified modules, Extension Index 0 = %IW1.x addresses, clear unused cartridges. System Ready Timer at Column 1 with BLK pattern. Cold/Warm Start uses SEPARATE rungs for each reset (not multiple ops in one rung). Added None element at Row 1 Col 10 for OR branches.
- **v3.1** (2025-12-27): Added SYSTEM_READY rung (LDN %I0.0 -> ST %M0). Fixed Cold/Warm Start reset to include ALL three HMI floats with proper ladder elements on rows 0, 1, 2.
- **v3.0** (2025-12-27): CRITICAL - Never use %IW directly in calculations. Always copy to %MW first, then calculate. Updated address layout: %MW100-101 for raw inputs, %MF102, %MF104, %MF106 for scaled HMI values.
- **v2.9** (2025-12-27): Added Retentive Memory section. First 100 memory words/floats (%MW0-99, %MF0-99) are retentive. Use %MF100+ for live HMI sensor readings. Reset HMI floats on cold/warm start.
- **v2.8** (2025-12-27): Added INT_TO_REAL for HMI tags with decimal precision. Use %MF (MemoryFloat) for values like temperature (25.5 deg C) and level (750.5 liters). Use float comparisons (%MF10 > 950.0).
- **v2.7** (2025-12-27): Added 4-20mA scaling formula. Raw 2000-10000 maps to 4-20mA. Formula: `(Raw - 2000) / 8` for 0-1000 range.
- **v2.6** (2025-12-27): CRITICAL FIX - Timer format is `<TimerTM>` with `<Base>OneSecond</Base>`, NOT `<Timer>` with `<TimeBase>`.
- **v2.5** (2025-12-27): CRITICAL FIX - Comparison elements span 2 columns (not 1). Added hardware configuration rule: only include modules explicitly specified by user.
- **v2.4** (2025-12-26): Added Emergency Rung best practice, Cold/Warm Start Reset best practice, TM3TI4/G RTD module configuration, TMC2 cartridge configurations, correct GlobalProperties and ReportConfiguration structures, TM221CE40T TechnicalConfiguration
- **v2.3** (2025-12-26): Added Ethernet Configuration section, Modbus TCP validation fix
- **v2.2** (2025-12-25): Added Operation element and TM3AI4/G format
- **v2.0** (2025-12-25): Complete rewrite based on actual .smbp file analysis, verified XML structures
- **v1.2** (2025-12-24): Added Python script references
- **v1.1** (2025-12-24): Initial M221 knowledge base integration
- **v1.0** (2025-12-24): Initial skill creation

---

**PLCAutoPilot Schneider Skill v3.8 | Last Updated: 2026-01-04 | github.com/chatgptnotes/plcautopilot.com**
