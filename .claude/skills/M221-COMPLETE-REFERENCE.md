# Schneider Electric M221 PLC Complete Programming Reference

**PLCAutoPilot - Comprehensive M221 Programming Guide**
**Version: 4.0 (Consolidated from all skill files)**
**Last Updated: 2025-12-27**

---

## Table of Contents

1. [Metadata & Activation](#1-metadata--activation)
2. [Controller Models Reference](#2-controller-models-reference)
3. [File Format (.smbp) Structure](#3-file-format-smbp-structure)
4. [Ladder Element Types](#4-ladder-element-types)
5. [Grid Layout Rules (10-Column System)](#5-grid-layout-rules-10-column-system)
6. [Instruction List (IL) Commands](#6-instruction-list-il-commands)
7. [Timer Programming](#7-timer-programming)
8. [Analog Input Handling](#8-analog-input-handling)
9. [Memory Addressing & Retentive Rules](#9-memory-addressing--retentive-rules)
10. [System Bits Reference](#10-system-bits-reference)
11. [Hardware Configuration](#11-hardware-configuration)
12. [Extension Modules](#12-extension-modules)
13. [Mandatory Programming Patterns](#13-mandatory-programming-patterns)
14. [Common Programming Patterns](#14-common-programming-patterns)
15. [Validation Checklist](#15-validation-checklist)
16. [Django/API Integration](#16-djangoapi-integration)
17. [Generator Script Patterns](#17-generator-script-patterns)

---

## 1. Metadata & Activation

### Skill Metadata
```yaml
name: schneider-m221-complete
description: Complete M221 PLC programming reference with .smbp file generation
version: 4.0
platform: Windows
software: EcoStruxure Machine Expert Basic (SoMachine Basic)
file_formats: .smbp (UTF-8 XML single file)
programming_languages: Ladder Diagram (LD), Instruction List (IL)
standards: IEC 61131-3, IEC 61508
```

### Activation Keywords
Activate this skill when user mentions:
- M221, TM221, Modicon M221
- TM221CE16T, TM221CE24T, TM221CE40T (and R/U variants)
- TM221C16T, TM221C24T, TM221C40T (non-Ethernet)
- TM221M16R, TM221M16T, TM221M32TK (modular)
- SoMachine Basic, Machine Expert Basic
- .smbp file

### MANDATORY FIRST ACTION Protocol
```
BEFORE generating ANY M221 program:
1. STOP - Do NOT write PLC code yet
2. READ skill file (.claude/skills/schneider.md)
3. READ generator template (scripts/generate_tank_level_complete.js)
4. GENERATE code following skill patterns exactly
```

---

## 2. Controller Models Reference

### All 21 TM221 Models

#### Compact with Ethernet (CE Series) - 9 Models
| Model        | DI  | DO  | AI | Output Type       | Input Range      | Output Range     | HardwareId |
|--------------|-----|-----|----|--------------------|------------------|------------------|------------|
| TM221CE16R   |  9  |  7  | 0  | Relay              | %I0.0 - %I0.8    | %Q0.0 - %Q0.6   | 1928 |
| TM221CE16T   |  9  |  7  | 0  | Transistor Sink    | %I0.0 - %I0.8    | %Q0.0 - %Q0.6   | 1929 |
| TM221CE16U   |  9  |  7  | 0  | Transistor Source  | %I0.0 - %I0.8    | %Q0.0 - %Q0.6   | 1930 |
| TM221CE24R   | 14  | 10  | 0  | Relay              | %I0.0 - %I0.13   | %Q0.0 - %Q0.9   | 1931 |
| TM221CE24T   | 14  | 10  | 0  | Transistor Sink    | %I0.0 - %I0.13   | %Q0.0 - %Q0.9   | 1932 |
| TM221CE24U   | 14  | 10  | 0  | Transistor Source  | %I0.0 - %I0.13   | %Q0.0 - %Q0.9   | 1933 |
| TM221CE40R   | 24  | 16  | 2  | Relay              | %I0.0 - %I0.23   | %Q0.0 - %Q0.15  | 1934 |
| TM221CE40T   | 24  | 16  | 2  | Transistor Sink    | %I0.0 - %I0.23   | %Q0.0 - %Q0.15  | 1935 |
| TM221CE40U   | 24  | 16  | 2  | Transistor Source  | %I0.0 - %I0.23   | %Q0.0 - %Q0.15  | 1936 |

#### Compact without Ethernet (C Series) - 9 Models
| Model        | DI  | DO  | AI | Output Type       | Input Range      | Output Range     | HardwareId |
|--------------|-----|-----|----|--------------------|------------------|------------------|------------|
| TM221C16R    |  9  |  7  | 0  | Relay              | %I0.0 - %I0.8    | %Q0.0 - %Q0.6   | 1910 |
| TM221C16T    |  9  |  7  | 0  | Transistor Sink    | %I0.0 - %I0.8    | %Q0.0 - %Q0.6   | 1911 |
| TM221C16U    |  9  |  7  | 0  | Transistor Source  | %I0.0 - %I0.8    | %Q0.0 - %Q0.6   | 1912 |
| TM221C24R    | 14  | 10  | 0  | Relay              | %I0.0 - %I0.13   | %Q0.0 - %Q0.9   | 1913 |
| TM221C24T    | 14  | 10  | 0  | Transistor Sink    | %I0.0 - %I0.13   | %Q0.0 - %Q0.9   | 1914 |
| TM221C24U    | 14  | 10  | 0  | Transistor Source  | %I0.0 - %I0.13   | %Q0.0 - %Q0.9   | 1915 |
| TM221C40R    | 24  | 16  | 2  | Relay              | %I0.0 - %I0.23   | %Q0.0 - %Q0.15  | 1916 |
| TM221C40T    | 24  | 16  | 2  | Transistor Sink    | %I0.0 - %I0.23   | %Q0.0 - %Q0.15  | 1917 |
| TM221C40U    | 24  | 16  | 2  | Transistor Source  | %I0.0 - %I0.23   | %Q0.0 - %Q0.15  | 1918 |

#### Book/Modular (M Series) - 3 Models
| Model        | DI  | DO  | AI | Output Type       | Input Range      | Output Range     | HardwareId |
|--------------|-----|-----|----|--------------------|------------------|------------------|------------|
| TM221M16R    |  8  |  8  | 0  | Relay              | %I0.0 - %I0.7    | %Q0.0 - %Q0.7   | 1940 |
| TM221M16T    |  8  |  8  | 0  | Transistor Sink    | %I0.0 - %I0.7    | %Q0.0 - %Q0.7   | 1941 |
| TM221M32TK   | 16  | 16  | 0  | Transistor Sink    | %I0.0 - %I0.15   | %Q0.0 - %Q0.15  | 1942 |

### Model Naming Convention
```
TM221 CE 40 T
  |    |  |  |
  |    |  |  +-- Output Type: R=Relay, T=Sink, U=Source
  |    |  +---- I/O Count: 16, 24, 40 (or 32 for M series)
  |    +------- Form Factor: CE=Compact+Ethernet, C=Compact, M=Modular
  +------------ Controller Family: M221
```

### Common Specifications (All Models)
```
Memory Bits (%M):    1024 addresses (%M0 to %M1023)
Memory Words (%MW):  8000 addresses (%MW0 to %MW7999)
Timers (%TM):        255 addresses (%TM0 to %TM254)
Counters (%C):       255 addresses (%C0 to %C254)
High Speed Counters: 4-8 depending on model
Expansion Modules:   7-14 depending on model
```

---

## 3. File Format (.smbp) Structure

### CRITICAL: File Type
- **M221 .smbp is a SINGLE UTF-8 XML FILE (NOT a ZIP archive!)**
- Must have UTF-8 BOM at start of file
- File extension: `.smbp`

### Root XML Structure
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

### SoftwareConfiguration Structure
```xml
<SoftwareConfiguration>
  <Pous>
    <ProgramOrganizationUnits>
      <Name>Program Name</Name>
      <SectionNumber>1</SectionNumber>
      <Rungs>
        <!-- RungEntity elements -->
      </Rungs>
    </ProgramOrganizationUnits>
  </Pous>
  <MemoryBits>...</MemoryBits>
  <MemoryWords>...</MemoryWords>
  <MemoryFloats>...</MemoryFloats>
  <Timers>...</Timers>
  <Counters>...</Counters>
  <SystemBits>...</SystemBits>
  <SystemWords>...</SystemWords>
  <!-- Other configuration sections -->
</SoftwareConfiguration>
```

### RungEntity Structure (CRITICAL - Dual Representation)
Every rung MUST have both LadderElements AND InstructionLines:
```xml
<RungEntity>
  <LadderElements>
    <!-- Visual ladder diagram elements -->
  </LadderElements>
  <InstructionLines>
    <!-- IL code representation -->
  </InstructionLines>
  <Name>Rung Name</Name>
  <MainComment>Description</MainComment>
  <Label />
  <IsLadderSelected>true</IsLadderSelected>
</RungEntity>
```

---

## 4. Ladder Element Types

### Element Type Reference
| ElementType | Description | Example | Column Position |
|-------------|-------------|---------|-----------------|
| `NormalContact` | Normally Open (NO) contact | START button | 0-9 |
| `NegatedContact` | Normally Closed (NC) contact | STOP button | 0-9 |
| `Coil` | Standard output coil | Motor output | 10 ONLY |
| `SetCoil` | Latch (Set) coil | Alarm latch | 10 ONLY |
| `ResetCoil` | Unlatch (Reset) coil | Alarm reset | 10 ONLY |
| `Line` | Horizontal connection line | Grid filler | Any |
| `Timer` | Timer element in ladder | %TM0 | 1 (spans to 2) |
| `Operation` | Analog/math assignment | %MW0 := %IW1.0 | 9 (terminal) |
| `Comparison` | Value comparison block | %MW1 > 500 | Spans 2 columns |
| `None` | Empty placeholder | Branch terminator | Row 1+ |

### LadderEntity XML Structure
```xml
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%I0.0</Descriptor>
  <Comment>Optional comment</Comment>
  <Symbol>START_BUTTON</Symbol>
  <Row>0</Row>
  <Column>0</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

### Operation Element (Analog Assignment)
```xml
<LadderEntity>
  <ElementType>Operation</ElementType>
  <OperationExpression>%MW100 := %IW0.0</OperationExpression>
  <Row>0</Row>
  <Column>9</Column>
  <ChosenConnection>Left</ChosenConnection>
</LadderEntity>
```
IL: `[ %MW100 := %IW0.0 ]`

### Comparison Element (SPANS 2 COLUMNS!)
```xml
<LadderEntity>
  <ElementType>Comparison</ElementType>
  <ComparisonExpression>%MW100 > 500</ComparisonExpression>
  <Row>0</Row>
  <Column>1</Column>  <!-- Spans columns 1 AND 2 -->
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
<!-- Next element starts at Column 3, not 2! -->
```
IL: `AND   [ %MW100 > 500 ]`

**Comparison Operators:** `=`, `<>`, `<`, `>`, `<=`, `>=`

---

## 5. Grid Layout Rules (10-Column System)

### Column Layout
```
Column 0:    First logic element (typically input contact)
Columns 1-9: Logic elements, timers, comparisons, or Line elements
Column 10:   Output coils ONLY
```

### Connection Types (ChosenConnection)
| Value | Meaning | Use Case |
|-------|---------|----------|
| `Left, Right` | Horizontal through | Standard element in series |
| `Down, Left, Right` | Branch start | Parallel branch begins (OR start) |
| `Down, Up, Left` | Branch middle | Middle of OR chain |
| `Up, Left` | Branch end | Parallel branch ends (OR end) |
| `Left` | Terminal | Output coil (no right connection) |
| `None` | No connection | Branch terminator at Row 1+, Col 10 |

### Row Usage
- **Row 0**: Main logic path
- **Row 1+**: Parallel branches (OR logic, seal-in)

### OR Branch Pattern (CRITICAL)
Both OR branch elements must be in the SAME column:
```xml
<!-- Element 1: Row 0, Col 0 with Down -->
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%I0.0</Descriptor>
  <Row>0</Row>
  <Column>0</Column>
  <ChosenConnection>Down, Left, Right</ChosenConnection>
</LadderEntity>

<!-- Element 2: Row 1, Col 0 with Up -->
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%M0</Descriptor>
  <Row>1</Row>
  <Column>0</Column>
  <ChosenConnection>Up, Left</ChosenConnection>
</LadderEntity>

<!-- CRITICAL: None element at Row 1, Column 10 for branch termination -->
<LadderEntity>
  <ElementType>None</ElementType>
  <Row>1</Row>
  <Column>10</Column>
  <ChosenConnection>None</ChosenConnection>
</LadderEntity>
```

### Line Element Helper Function (JavaScript)
```javascript
function generateLines(startCol, endCol, row = 0) {
    let lines = '';
    for (let col = startCol; col <= endCol; col++) {
        lines += `
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>${row}</Row>
                <Column>${col}</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;
    }
    return lines;
}
```

---

## 6. Instruction List (IL) Commands

### Basic IL Commands
| Command | Description | Example |
|---------|-------------|---------|
| `LD` | Load (start new logic) | `LD    %I0.0` |
| `ST` | Store (output) | `ST    %Q0.0` |
| `AND` | Logical AND | `AND   %I0.2` |
| `OR` | Logical OR | `OR    %M0` |
| `ANDN` | AND NOT | `ANDN  %I0.1` |
| `ORN` | OR NOT | `ORN   %I0.3` |
| `S` | Set (latch) coil | `S     %M10` |
| `R` | Reset (unlatch) coil | `R     %M10` |

### Timer Block Commands
| Command | Description |
|---------|-------------|
| `BLK %TM0` | Begin timer block |
| `IN` | Timer input (starts timer) |
| `OUT_BLK` | Exit block inputs, access outputs |
| `LD Q` | Load timer done bit |
| `END_BLK` | End timer block |

### Operation IL Format
```
[ %MW100 := %IW0.0 ]           ; Copy analog input
[ %MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0 ]  ; Scale to float
```

### Comparison IL Format
```
AND   [ %MW100 > 500 ]         ; Compare in series
```

---

## 7. Timer Programming

### Timer Declaration (CRITICAL FORMAT)
**Use `<TimerTM>` with `<Base>`, NOT `<Timer>` with `<TimeBase>`**
```xml
<Timers>
  <TimerTM>
    <Address>%TM0</Address>
    <Index>0</Index>
    <Preset>3</Preset>
    <Base>OneSecond</Base>
    <Comment>Startup delay</Comment>
    <Symbol>STARTUP_TMR</Symbol>
  </TimerTM>
</Timers>
```

### Time Base Values
| Base Value | Duration |
|------------|----------|
| `OneMillisecond` | 1 millisecond |
| `TenMilliseconds` | 10 milliseconds |
| `HundredMilliseconds` | 100 milliseconds |
| `OneSecond` | 1 second |
| `OneMinute` | 1 minute |

### Timer in Ladder (at Column 1, spans to 2)
```xml
<LadderEntity>
  <ElementType>Timer</ElementType>
  <Descriptor>%TM0</Descriptor>
  <Row>0</Row>
  <Column>1</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

### Timer IL Pattern (BLK Structure)
```
BLK   %TM0      ; Begin timer block
LD    %I0.0     ; Load input condition
IN              ; Apply to timer IN
OUT_BLK         ; Exit block section
LD    Q         ; Load timer Q (done bit)
ST    %M0       ; Store result
END_BLK         ; End timer block
```

### Using Timer Done Bit Directly (Alternative)
```xml
<LadderEntity>
  <ElementType>NormalContact</ElementType>
  <Descriptor>%TM0.Q</Descriptor>
  <Symbol>TMR_DONE</Symbol>
  <Row>0</Row>
  <Column>2</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```
IL: `AND   %TM0.Q`

---

## 8. Analog Input Handling

### CRITICAL RULE: Never Use %IW Directly
**Always copy %IW to %MW first, then calculate from %MW**

**WRONG:**
```xml
<OperationExpression>%MF102 := INT_TO_REAL(%IW0.0 - 2000) / 8.0</OperationExpression>
```

**CORRECT:**
```xml
<!-- Rung 1: Copy raw input -->
<OperationExpression>%MW100 := %IW0.0</OperationExpression>

<!-- Rung 2: Calculate from memory word -->
<OperationExpression>%MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0</OperationExpression>
```

**Why?**
- Analog inputs can change mid-scan
- Memory word provides stable snapshot
- Easier debugging (raw value visible)
- Safer when same input used multiple times

### 4-20mA Scaling Formula
```
TM221CE40T built-in analog: 0-10000 raw for 0-20mA
- 4mA = 2000 raw (minimum)
- 20mA = 10000 raw (maximum)

Formula: Scaled_Value = (Raw - 2000) * (MaxEU - MinEU) / 8000 + MinEU

Simplified for 0-1000 range:
Scaled_Value = (Raw - 2000) / 8
```

### INT_TO_REAL for Float Precision
```xml
<OperationExpression>%MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0</OperationExpression>
```

### Standard Address Layout
| Address | Symbol | Description |
|---------|--------|-------------|
| `%MW100` | RAW_LEVEL | Copy of %IW0.0 (raw 4-20mA) |
| `%MW101` | RAW_TEMP | Copy of %IW1.0 (raw RTD) |
| `%MF102` | HMI_TANK_LITERS | Scaled from %MW100 (0.0-1000.0) |
| `%MF103` | HMI_TEMPERATURE | Scaled from %MW101 |
| `%MF104` | HMI_LEVEL_PERCENT | Calculated from %MF102 (0.0-100.0) |

---

## 9. Memory Addressing & Retentive Rules

### Retentive Memory (CRITICAL)
| Address Range | Behavior | Use For |
|---------------|----------|---------|
| `%MW0` - `%MW99` | **RETENTIVE** (preserved after power loss) | Setpoints, counters, recipe data |
| `%MW100` - `%MW7999` | **Non-retentive** (reset to 0 on power cycle) | Live sensor readings, calculated values |
| `%MF0` - `%MF99` | **RETENTIVE** | Setpoints with decimals, calibration values |
| `%MF100` - `%MF7999` | **Non-retentive** | Live sensor readings, HMI display values |

### Memory Word Declaration
```xml
<MemoryWords>
  <MemoryWord>
    <Address>%MW100</Address>
    <Index>100</Index>
    <Symbol>RAW_LEVEL</Symbol>
    <Comment>Raw 4-20mA level input (copy of %IW0.0)</Comment>
  </MemoryWord>
</MemoryWords>
```

### Memory Float Declaration
```xml
<MemoryFloats>
  <MemoryFloat>
    <Address>%MF102</Address>
    <Index>102</Index>
    <Symbol>HMI_TANK_LITERS</Symbol>
    <Comment>HMI Tag: Tank volume in liters (0.0-1000.0)</Comment>
  </MemoryFloat>
</MemoryFloats>
```

### Memory Bit Declaration
```xml
<MemoryBits>
  <MemoryBit>
    <Address>%M0</Address>
    <Index>0</Index>
    <Symbol>SYSTEM_READY</Symbol>
    <Comment>System ready after startup delay</Comment>
  </MemoryBit>
</MemoryBits>
```

---

## 10. System Bits Reference

| Address | Symbol | Description |
|---------|--------|-------------|
| `%S0` | SB_COLDSTART | Cold start indicator (one scan) |
| `%S1` | SB_WARMSTART | Warm start indicator (one scan) |
| `%S4` | SB_TB10MS | 10ms pulse |
| `%S5` | SB_TB100MS | 100ms pulse |
| `%S6` | SB_TB1S | 1 second pulse |
| `%S7` | SB_TB1MIN | 1 minute pulse |
| `%S12` | SB_RUNMODE | Controller in RUN mode |
| `%S13` | SB_FIRSTRUN | First scan in RUN |
| `%S17` | SB_CARRY | Carry/borrow flag |
| `%S18` | SB_OVERFLOW | Overflow flag |

---

## 11. Hardware Configuration

### CPU Configuration Template
```xml
<HardwareConfiguration>
  <Plc>
    <Cpu>
      <Index>0</Index>
      <InputNb>0</InputNb>
      <OutputNb>0</OutputNb>
      <Kind>0</Kind>
      <Reference>TM221CE16T</Reference>
      <Name>MyController</Name>
      <Consumption5V>520</Consumption5V>
      <Consumption24V>200</Consumption24V>
      <DigitalInputs>...</DigitalInputs>
      <DigitalOutputs>...</DigitalOutputs>
      <EthernetConfiguration>...</EthernetConfiguration>
      <HardwareId>1929</HardwareId>
      <IsExpander>false</IsExpander>
    </Cpu>
    <Extensions>...</Extensions>
    <SerialLineConfiguration>...</SerialLineConfiguration>
  </Plc>
</HardwareConfiguration>
```

### Digital Input Configuration
```xml
<DigitalInputs>
  <DiscretInput>
    <Address>%I0.0</Address>
    <Index>0</Index>
    <Symbol>START_BUTTON</Symbol>
    <Comment>Start pushbutton</Comment>
    <DIFiltering>DIFilterings4ms</DIFiltering>
    <DILatch>DILatchNo</DILatch>
  </DiscretInput>
</DigitalInputs>
```

### Digital Output Configuration
```xml
<DigitalOutputs>
  <DiscretOutput>
    <Address>%Q0.0</Address>
    <Index>0</Index>
    <Symbol>MOTOR_RUN</Symbol>
    <Comment>Motor contactor</Comment>
  </DiscretOutput>
</DigitalOutputs>
```

### Ethernet Configuration (Default - Modbus Disabled)
```xml
<EthernetConfiguration>
  <NetworkName>M221</NetworkName>
  <IpAllocationMode>FixedAddress</IpAllocationMode>
  <IpAddress>0.0.0.0</IpAddress>
  <SubnetMask>0.0.0.0</SubnetMask>
  <GatewayAddress>0.0.0.0</GatewayAddress>
  <ModbusTcpSlave>
    <UnitId xsi:nil="true" />
    <ModbusServerEnabled>false</ModbusServerEnabled>
  </ModbusTcpSlave>
  <ProgrammingProtocolEnabled>false</ProgrammingProtocolEnabled>
  <ModbusServerEnabled>false</ModbusServerEnabled>
</EthernetConfiguration>
```

---

## 12. Extension Modules

### CRITICAL: Extension Index = Address Slot
| Index | Slot | Analog Addresses | Digital Addresses |
|-------|------|------------------|-------------------|
| 0 | 1 | %IW1.0 - %IW1.3 | %I1.0, %Q1.0 |
| 1 | 2 | %IW2.0 - %IW2.3 | %I2.0, %Q2.0 |
| 2 | 3 | %IW3.0 - %IW3.3 | %I3.0, %Q3.0 |

### TM3AI4/G (4 Analog Inputs, 4-20mA)
**HardwareId: 156**
```xml
<ModuleExtensionObject>
  <Index>0</Index>
  <Reference>TM3AI4/G</Reference>
  <HardwareId>156</HardwareId>
  <AnalogInputs>
    <AnalogIO>
      <Address>%IW1.0</Address>
      <Index>0</Index>
      <Symbol>TANK_LEVEL</Symbol>
      <Type>
        <Value>3</Value>
        <Name>Type_4_20mA</Name>
      </Type>
      <Scope>
        <Value>32</Value>
        <Name>Scope_Customized</Name>
      </Scope>
      <Minimum>0</Minimum>
      <Maximum>1000</Maximum>
      <IsInput>true</IsInput>
    </AnalogIO>
  </AnalogInputs>
</ModuleExtensionObject>
```

### TM3TI4/G (4 RTD Temperature Inputs)
**HardwareId: 199**
```xml
<ModuleExtensionObject>
  <Index>0</Index>
  <Reference>TM3TI4/G</Reference>
  <HardwareId>199</HardwareId>
  <AnalogInputs>
    <AnalogIO>
      <Address>%IW1.0</Address>
      <Index>0</Index>
      <Symbol>RTD_TEMP</Symbol>
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
        <Name>Sampling_0_100ms</Name>
      </Sampling>
      <R1>8700</R1>
      <R2>200</R2>
      <T1>234.15</T1>
      <T2>311.15</T2>
    </AnalogIO>
  </AnalogInputs>
  <AnalogInputsStatus>
    <AnalogIoStatus>
      <Address>%IWS1.0</Address>
      <Index>0</Index>
    </AnalogIoStatus>
  </AnalogInputsStatus>
</ModuleExtensionObject>
```

### TMC2 Cartridges
```xml
<!-- TMC2AI2 - 2 Analog Input Cartridge -->
<Cartridge1>
  <Index>0</Index>
  <Reference>TMC2AI2</Reference>
  <AnalogInputs>
    <AnalogIO>
      <Address>%IWC1.0</Address>
      <!-- Same structure as TM3AI4/G -->
    </AnalogIO>
  </AnalogInputs>
</Cartridge1>

<!-- Clear unused cartridge -->
<Cartridge1>
  <Index>0</Index>
  <InputNb>0</InputNb>
  <OutputNb>0</OutputNb>
  <Kind>0</Kind>
  <Reference />  <!-- Empty = no cartridge -->
</Cartridge1>
```

---

## 13. Mandatory Programming Patterns

### Pattern 1: System Ready Rung (MANDATORY FIRST RUNG)
Every program MUST start with System Ready rung:
```xml
<RungEntity>
  <LadderElements>
    <!-- Emergency at Column 0 -->
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%I0.0</Descriptor>
      <Symbol>EMERGENCY_PB</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <!-- Timer at Column 1 -->
    <LadderEntity>
      <ElementType>Timer</ElementType>
      <Descriptor>%TM0</Descriptor>
      <Row>0</Row>
      <Column>1</Column>
      <ChosenConnection>Left, Right</ChosenConnection>
    </LadderEntity>
    <!-- Lines 3-9 -->
    <!-- Coil at Column 10 -->
    <LadderEntity>
      <ElementType>Coil</ElementType>
      <Descriptor>%M0</Descriptor>
      <Symbol>SYSTEM_READY</Symbol>
      <Row>0</Row>
      <Column>10</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>BLK   %TM0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>LD    %I0.0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>IN</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OUT_BLK</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>LD    Q</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>ST    %M0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>END_BLK</InstructionLine></InstructionLineEntity>
  </InstructionLines>
  <Name>System_Ready</Name>
  <MainComment>3 second startup delay before system ready</MainComment>
</RungEntity>
```

### Pattern 2: Cold/Warm Start Reset (SEPARATE RUNGS!)
**Use ONE rung per reset operation:**
```xml
<!-- Rung for %MF102 reset -->
<RungEntity>
  <LadderElements>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S0</Descriptor>
      <Symbol>SB_COLDSTART</Symbol>
      <Row>0</Row>
      <Column>0</Column>
      <ChosenConnection>Down, Left, Right</ChosenConnection>
    </LadderEntity>
    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%S1</Descriptor>
      <Symbol>SB_WARMSTART</Symbol>
      <Row>1</Row>
      <Column>0</Column>
      <ChosenConnection>Up, Left</ChosenConnection>
    </LadderEntity>
    <!-- Lines 1-8 -->
    <LadderEntity>
      <ElementType>Operation</ElementType>
      <OperationExpression>%MF102 := 0.0</OperationExpression>
      <Row>0</Row>
      <Column>9</Column>
      <ChosenConnection>Left</ChosenConnection>
    </LadderEntity>
    <!-- CRITICAL: None element at Row 1, Column 10 -->
    <LadderEntity>
      <ElementType>None</ElementType>
      <Row>1</Row>
      <Column>10</Column>
      <ChosenConnection>None</ChosenConnection>
    </LadderEntity>
  </LadderElements>
  <InstructionLines>
    <InstructionLineEntity><InstructionLine>LD    %S0</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>OR    %S1</InstructionLine></InstructionLineEntity>
    <InstructionLineEntity><InstructionLine>[ %MF102 := 0.0 ]</InstructionLine></InstructionLineEntity>
  </InstructionLines>
  <Name>Reset_HMI_Liters</Name>
</RungEntity>
```

**Repeat for each HMI value:**
- Rung 1: `%MF102 := 0.0` (HMI_TANK_LITERS)
- Rung 2: `%MF103 := 0.0` (HMI_TEMPERATURE)
- Rung 3: `%MF104 := 0.0` (HMI_LEVEL_PERCENT)

---

## 14. Common Programming Patterns

### Motor Start/Stop with Seal-In
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

### Latched Alarm with Reset
```
Logic: (ALARM_CONDITION OR ALARM_LATCH) AND NOT RESET = ALARM_LATCH

Ladder:
    CONDITION      RESET                    ALARM
 |----[ ]------------[/]------------------( )---|
 |     %I0.3         %I0.7                %M10  |
 |                                              |
 |    ALARM                                     |
 |----[ ]--------+                              |
      %M10       |______________________________|
```

### Interlock (Forward/Reverse)
```
FWD = FWD_CMD AND NOT REV_RUNNING AND NOT REV_CMD
REV = REV_CMD AND NOT FWD_RUNNING AND NOT FWD_CMD
```

---

## 15. Validation Checklist

Before generating any .smbp file, verify:

### File Structure
- [ ] Root element is `<ProjectDescriptor>` with proper namespaces
- [ ] `<ProjectVersion>` is `3.0.0.0`
- [ ] `<ManagementLevel>` is `FunctLevelMan21_0`
- [ ] UTF-8 encoding with BOM

### Ladder Elements
- [ ] All columns 0-10 are filled (use Line elements for gaps)
- [ ] Coils are ONLY in column 10
- [ ] Both `<LadderElements>` AND `<InstructionLines>` present
- [ ] `<ChosenConnection>` values are correct for element position
- [ ] OR branches have elements in SAME column
- [ ] OR branches have `None` element at Row 1+, Column 10

### Timers
- [ ] Timer format is `<TimerTM>` with `<Base>` (NOT `<Timer>` with `<TimeBase>`)
- [ ] Timer declarations exist in `<Timers>` section
- [ ] Timer IL uses BLK...END_BLK pattern

### Analog Handling
- [ ] %IW copied to %MW before calculations (NEVER direct %IW in math)
- [ ] Using INT_TO_REAL for float precision
- [ ] Using %MF102+ for HMI floats (NOT %MF0-99 retentive)
- [ ] 4-20mA formula: (Raw - 2000) / 8

### Hardware
- [ ] Hardware config ONLY includes user-specified modules
- [ ] Extension Index 0 = %IW1.x addresses
- [ ] Unused cartridges cleared (empty `<Reference />`)
- [ ] EthernetConfiguration uses defaults (ModbusServerEnabled=false)

### Mandatory Patterns
- [ ] System Ready rung with Timer at Column 1 with BLK pattern
- [ ] Cold/Warm Start uses SEPARATE rungs per reset
- [ ] HMI floats reset on %S0/%S1 startup

---

## 16. Django/API Integration

### Django Model for M221 Projects
```python
from django.db import models
import uuid

class M221Project(models.Model):
    CONTROLLER_CHOICES = [
        ('TM221CE16T', 'TM221CE16T - 16 I/O Transistor'),
        ('TM221CE24T', 'TM221CE24T - 24 I/O Transistor'),
        ('TM221CE40T', 'TM221CE40T - 40 I/O Transistor'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    controller = models.CharField(max_length=20, choices=CONTROLLER_CHOICES)
    user_specification = models.TextField()
    generated_xml = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Claude API Service
```python
import anthropic

class ClaudeM221Service:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = 'claude-3-haiku-20240307'

    def generate_ladder_logic(self, specification: str, controller: str):
        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=self._get_m221_system_prompt(controller),
            messages=[{"role": "user", "content": specification}]
        )
        return message.content[0].text
```

### REST API Endpoint
```python
from django.http import HttpResponse
from .services import SMBPGenerator

class GenerateSMBPView(View):
    def get(self, request, project_id):
        project = M221Project.objects.get(id=project_id)
        generator = SMBPGenerator(project)
        smbp_content = generator.generate()

        response = HttpResponse(smbp_content, content_type='application/xml')
        response['Content-Disposition'] = f'attachment; filename="{project.name}.smbp"'
        return response
```

---

## 17. Generator Script Patterns

### Template-Based Generation (Recommended)
```javascript
const fs = require('fs');

const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'output.smbp';

// Read template
let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');

// Change project name
content = content.split('Template for configuration of cards').join('My_Project');

// Change controller
content = content.split('TM221CE40T').join('TM221CE16T');

// Add rungs before </Rungs>
const rungXML = `...`;
const beforeRungs = content.indexOf('</Rungs>');
content = content.slice(0, beforeRungs) + rungXML + '\n        ' + content.slice(beforeRungs);

// Write output
fs.writeFileSync(OUTPUT_PATH, content, 'utf8');
```

### Line Element Generator
```javascript
function generateLines(startCol, endCol, row = 0) {
    let lines = '';
    for (let col = startCol; col <= endCol; col++) {
        lines += `
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>${row}</Row>
                <Column>${col}</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;
    }
    return lines;
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 2025-12-27 | Consolidated from all 10 skill files into single reference |
| 3.2 | 2025-12-27 | Hardware config rules, System Ready timer pattern, separate reset rungs |
| 3.1 | 2025-12-27 | SYSTEM_READY rung, HMI reset fixes |
| 3.0 | 2025-12-27 | Never use %IW directly, copy to %MW first |
| 2.9 | 2025-12-27 | Retentive memory rules |
| 2.8 | 2025-12-27 | INT_TO_REAL for HMI floats |
| 2.7 | 2025-12-27 | 4-20mA scaling formula |
| 2.6 | 2025-12-27 | Timer format fix (TimerTM/Base) |
| 2.5 | 2025-12-27 | Comparison spans 2 columns |

---

**PLCAutoPilot M221 Complete Reference v4.0 | 2025-12-27 | github.com/chatgptnotes/plcautopilot.com**
