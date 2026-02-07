# EcoStruxure M241 PLCopen XML Generation Skill

## Expert Agent for M241 Controllers - PLCopen XML Ladder Logic Generation

---

## Metadata

```yaml
name: ecostruxure-m241
description: Generate production-ready PLCopen XML files for EcoStruxure Machine Expert targeting TM241 controllers. Creates importable ladder logic with timers (TON/TOF), counters (CTU), PID controllers (PID_FIXCYCLE), and complete industrial automation systems.
version: 1.0
platform: Windows
target_controllers: TM241CE24T, TM241CE40T, TM241CEC24T, TM241CE24U, TM241CE40U
software: EcoStruxure Machine Expert V19.2.3.0+
file_format: PLCopen XML (.xml) for import
programming_language: Ladder Diagram (LD)
standards: IEC 61131-3, IEC 61508
generator_scripts: scripts/ecostruxure/
```

---

## Activation Keywords

Activate this skill when user mentions:
- M241, TM241
- TM241CE24T, TM241CE40T, TM241CEC24T
- TM241CE24U, TM241CE40U
- EcoStruxure Machine Expert (NOT Basic)
- PLCopen XML + M241
- Ladder logic + M241

---

## STOP-READ-GENERATE Protocol

**BEFORE generating ANY M241 PLCopen XML, follow this exact sequence:**

```
1. STOP  - Do NOT write any XML yet. Identify the controller model.
2. READ  - Load this skill file (ecostruxure-m241.md).
3. READ  - Load the generator template: scripts/ecostruxure/generate_complete_system.py
4. READ  - Load XML patterns reference: scripts/ecostruxure/references/xml-patterns.md
5. GENERATE - Now generate code following the patterns exactly.
```

---

## M241 Hardware Specifications

### TM241CE24T / TM241CE24U
| Feature | Specification |
|---------|--------------|
| Digital Inputs | 14 (4 HSC capable at %IX0.0-%IX0.3) |
| Digital Outputs | 10 transistor |
| Analog Inputs | 2 (%IW0.0, %IW0.1) |
| Analog Outputs | 1 (%QW0.0) |
| Ethernet | 1x RJ45 (Modbus TCP) |
| Serial | 1x Mini-DIN (SL) |
| CANopen | Optional via expansion |
| Memory | %M0-%M2047, %MW0-%MW4999 |
| Timers/Counters | 512 each |

### TM241CE40T / TM241CE40U
| Feature | Specification |
|---------|--------------|
| Digital Inputs | 24 (4 HSC capable) |
| Digital Outputs | 16 transistor |
| Analog Inputs | 2 (%IW0.0, %IW0.1) |
| Analog Outputs | 1 (%QW0.0) |
| Ethernet | 1x RJ45 (Modbus TCP) |
| Serial | 2x Mini-DIN (SL1, SL2) |
| CANopen | Optional |

---

## I/O Addressing Format (CRITICAL)

### M241 uses byte.bit format for digital I/O

```
Digital Inputs:  %IX<byte>.<bit>    (e.g., %IX0.0 to %IX0.7, %IX1.0 to %IX1.7)
Digital Outputs: %QX<byte>.<bit>    (e.g., %QX0.0 to %QX0.7, %QX1.0 to %QX1.7)
Analog Inputs:   %IW<module>.<channel>  (e.g., %IW0.0, %IW0.1)
Analog Outputs:  %QW<module>.<channel>  (e.g., %QW0.0)
Memory Bits:     %MX<byte>.<bit>    (e.g., %MX0.0)
Memory Words:    %MW<n>             (e.g., %MW0 to %MW4999)
```

### TM241CE24T I/O Map
```
Inputs:  %IX0.0 to %IX0.7 (Byte 0), %IX1.0 to %IX1.5 (Byte 1) = 14 inputs
Outputs: %QX0.0 to %QX0.7 (Byte 0), %QX1.0 to %QX1.1 (Byte 1) = 10 outputs
Analog:  %IW0.0, %IW0.1 (2 AI), %QW0.0 (1 AO)
```

### TM241CE40T I/O Map
```
Inputs:  %IX0.0 to %IX0.7, %IX1.0 to %IX1.7, %IX2.0 to %IX2.7 = 24 inputs
Outputs: %QX0.0 to %QX0.7, %QX1.0 to %QX1.7 = 16 outputs
Analog:  %IW0.0, %IW0.1 (2 AI), %QW0.0 (1 AO)
```

---

## PLCopen XML Core Structure

### Namespace
```
http://www.plcopen.org/xml/tc6_0200
```

### Complete Project Template
```xml
<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200">
  <fileHeader companyName="PLCAutoPilot" productName="Machine Expert Logic Builder"
              productVersion="V19.2.3.0" creationDateTime="2026-01-01T00:00:00"/>
  <contentHeader name="ProjectName" version="1.0.0.0">
    <coordinateInfo>
      <fbd><scaling x="1" y="1"/></fbd>
      <ld><scaling x="1" y="1"/></ld>
      <sfc><scaling x="1" y="1"/></sfc>
    </coordinateInfo>
  </contentHeader>
  <types>
    <dataTypes/>
    <pous>
      <pou name="ProgramName" pouType="program">
        <interface>
          <localVars>
            <!-- Variable declarations here -->
          </localVars>
        </interface>
        <body>
          <LD>
            <!-- Ladder elements here -->
          </LD>
        </body>
      </pou>
    </pous>
  </types>
  <instances><configurations/></instances>
  <addData>
    <data name="http://www.3s-software.com/plcopenxml/projectstructure" handleUnknown="discard">
      <ProjectStructure><Object Name="ProgramName"/></ProjectStructure>
    </data>
  </addData>
</project>
```

---

## Variable Declaration Patterns

### With I/O Address (Digital Input)
```xml
<variable name="StartBtn" address="%IX0.0">
  <type><BOOL/></type>
</variable>
```

### With I/O Address (Digital Output)
```xml
<variable name="MotorRun" address="%QX0.0">
  <type><BOOL/></type>
</variable>
```

### Without Address (Internal)
```xml
<variable name="ProcessActive">
  <type><BOOL/></type>
</variable>
```

### Timer Instance (Derived Type)
```xml
<variable name="MixingTimer">
  <type><derived name="TON"/></type>
</variable>
```

### Counter Instance
```xml
<variable name="BatchCounter">
  <type><derived name="CTU"/></type>
</variable>
```

### PID Instance
```xml
<variable name="TempController">
  <type><derived name="PID_FIXCYCLE"/></type>
</variable>
```

### Basic Types
```xml
<variable name="actual_temp"><type><REAL/></type></variable>
<variable name="MixingTime"><type><TIME/></type></variable>
<variable name="BatchTarget"><type><INT/></type></variable>
```

---

## Ladder Element Patterns (CRITICAL)

### Left Power Rail (REQUIRED - Start of every network)
```xml
<leftPowerRail localId="0">
  <position x="0" y="0"/>
  <connectionPointOut formalParameter="none"/>
</leftPowerRail>
```

### Contact (Normally Open)
```xml
<contact localId="1" negated="false" storage="none" edge="none">
  <position x="100" y="100"/>
  <connectionPointIn>
    <connection refLocalId="0"/>  <!-- From power rail -->
  </connectionPointIn>
  <connectionPointOut/>
  <variable>StartBtn</variable>
</contact>
```

### Contact (Normally Closed)
```xml
<contact localId="2" negated="true" storage="none" edge="none">
  <position x="200" y="100"/>
  <connectionPointIn>
    <connection refLocalId="1"/>  <!-- From previous contact -->
  </connectionPointIn>
  <connectionPointOut/>
  <variable>StopBtn</variable>
</contact>
```

### Contact (Edge Detection - for counter triggers)
```xml
<contact localId="30" edge="falling">
  <position x="100" y="300"/>
  <connectionPointIn>
    <connection refLocalId="0"/>
  </connectionPointIn>
  <connectionPointOut/>
  <variable>AgitatorMotor</variable>
</contact>
```

### Coil (Output)
```xml
<coil localId="5">
  <position x="900" y="100"/>
  <connectionPointIn>
    <connection refLocalId="4" formalParameter="Q"/>
  </connectionPointIn>
  <variable>AgitatorMotor</variable>
</coil>
```

### Coil (Set/Latch)
```xml
<coil localId="7" negated="false" storage="set">
  <position x="0" y="0"/>
  <connectionPointIn>
    <connection refLocalId="6"/>
  </connectionPointIn>
  <connectionPointOut/>
  <variable>LATCHED_OUTPUT</variable>
</coil>
```

### Coil (Reset/Unlatch)
```xml
<coil localId="8" negated="false" storage="reset">
  <position x="0" y="0"/>
  <connectionPointIn>
    <connection refLocalId="7"/>
  </connectionPointIn>
  <connectionPointOut/>
  <variable>LATCHED_OUTPUT</variable>
</coil>
```

### Right Power Rail (for PID/complex blocks)
```xml
<rightPowerRail localId="2147483646">
  <position x="0" y="0"/>
  <connectionPointIn>
    <connection refLocalId="70" formalParameter=""/>
  </connectionPointIn>
</rightPowerRail>
```

---

## Function Block Patterns

### TON Timer (On-Delay) - COMPLETE PATTERN
```xml
<!-- Time variable input for PT -->
<inVariable localId="10">
  <position x="200" y="120"/>
  <connectionPointOut/>
  <expression>MixingTime</expression>
</inVariable>

<!-- Timer block -->
<block localId="2" typeName="TON" instanceName="MixingTimer">
  <position x="300" y="80"/>
  <inputVariables>
    <variable formalParameter="IN">
      <connectionPointIn>
        <connection refLocalId="1"/>  <!-- From trigger contact -->
      </connectionPointIn>
    </variable>
    <variable formalParameter="PT">
      <connectionPointIn>
        <connection refLocalId="10"/>  <!-- From time variable -->
      </connectionPointIn>
    </variable>
  </inputVariables>
  <inOutVariables/>
  <outputVariables>
    <variable formalParameter="Q">
      <connectionPointOut/>
    </variable>
  </outputVariables>
</block>
```

**Timer Rules:**
- MUST connect both IN and PT parameters
- Use TIME variables for PT (not direct values in M241)
- Use `<derived name="TON"/>` in variable declaration
- Q output connects to downstream coils via `formalParameter="Q"`

### CTU Counter (Count Up) - COMPLETE PATTERN
```xml
<!-- Preset value input -->
<inVariable localId="32">
  <position x="200" y="340"/>
  <connectionPointOut/>
  <expression>BatchTarget</expression>
</inVariable>

<!-- Counter block -->
<block localId="33" typeName="CTU" instanceName="BatchCounter">
  <position x="300" y="300"/>
  <inputVariables>
    <variable formalParameter="CU">
      <connectionPointIn>
        <connection refLocalId="30"/>  <!-- Count trigger (use edge detection!) -->
      </connectionPointIn>
    </variable>
    <variable formalParameter="R">
      <connectionPointIn>
        <connection refLocalId="31"/>  <!-- Reset contact -->
      </connectionPointIn>
    </variable>
    <variable formalParameter="PV">
      <connectionPointIn>
        <connection refLocalId="32"/>  <!-- Preset value -->
      </connectionPointIn>
    </variable>
  </inputVariables>
  <inOutVariables/>
  <outputVariables>
    <variable formalParameter="Q">
      <connectionPointOut/>
    </variable>
    <variable formalParameter="CV">
      <connectionPointOut/>
    </variable>
  </outputVariables>
</block>
```

**Counter Rules:**
- MUST connect all three inputs: CU, R, PV
- Use `edge="falling"` or `edge="rising"` on count trigger contact
- PV uses INT variable or inVariable
- Q = target reached, CV = current value

### PID_FIXCYCLE Controller - COMPLETE PATTERN
```xml
<!-- Input variables (10 inVariables needed) -->
<inVariable localId="50">
  <position x="0" y="0"/>
  <connectionPointOut/>
  <expression>actual_temp</expression>
</inVariable>
<inVariable localId="51">
  <position x="0" y="0"/>
  <connectionPointOut/>
  <expression>setpoint_temp</expression>
</inVariable>
<!-- Direct tuning values -->
<inVariable localId="52">
  <position x="0" y="0"/>
  <connectionPointOut/>
  <expression>1.5</expression>  <!-- Kp -->
</inVariable>
<inVariable localId="53">
  <position x="0" y="0"/>
  <connectionPointOut/>
  <expression>10.0</expression>  <!-- Tn -->
</inVariable>
<inVariable localId="54">
  <position x="0" y="0"/>
  <connectionPointOut/>
  <expression>2.0</expression>  <!-- Tv -->
</inVariable>
<!-- Other params: y_manual, y_offset, y_min, y_max, cycle -->

<!-- Boolean contacts for MANUAL and RESET -->
<contact localId="60" negated="false" storage="none" edge="none">
  <position x="0" y="0"/>
  <connectionPointIn>
    <connection refLocalId="0"/>
  </connectionPointIn>
  <connectionPointOut/>
  <variable>Manual</variable>
</contact>
<contact localId="61" negated="false" storage="none" edge="none">
  <position x="0" y="0"/>
  <connectionPointIn>
    <connection refLocalId="0"/>
  </connectionPointIn>
  <connectionPointOut/>
  <variable>reset</variable>
</contact>

<!-- PID block with all 12 parameters -->
<block localId="70" typeName="PID_FIXCYCLE" instanceName="TempController">
  <position x="200" y="400"/>
  <inputVariables>
    <variable formalParameter="ACTUAL">
      <connectionPointIn><connection refLocalId="50"/></connectionPointIn>
    </variable>
    <variable formalParameter="SET_POINT">
      <connectionPointIn><connection refLocalId="51"/></connectionPointIn>
    </variable>
    <variable formalParameter="KP">
      <connectionPointIn><connection refLocalId="52"/></connectionPointIn>
    </variable>
    <variable formalParameter="TN">
      <connectionPointIn><connection refLocalId="53"/></connectionPointIn>
    </variable>
    <variable formalParameter="TV">
      <connectionPointIn><connection refLocalId="54"/></connectionPointIn>
    </variable>
    <variable formalParameter="Y_MANUAL">
      <connectionPointIn><connection refLocalId="55"/></connectionPointIn>
    </variable>
    <variable formalParameter="Y_OFFSET">
      <connectionPointIn><connection refLocalId="56"/></connectionPointIn>
    </variable>
    <variable formalParameter="Y_MIN">
      <connectionPointIn><connection refLocalId="57"/></connectionPointIn>
    </variable>
    <variable formalParameter="Y_MAX">
      <connectionPointIn><connection refLocalId="58"/></connectionPointIn>
    </variable>
    <variable formalParameter="MANUAL">
      <connectionPointIn><connection refLocalId="60"/></connectionPointIn>
    </variable>
    <variable formalParameter="RESET">
      <connectionPointIn><connection refLocalId="61"/></connectionPointIn>
    </variable>
    <variable formalParameter="CYCLE">
      <connectionPointIn><connection refLocalId="59"/></connectionPointIn>
    </variable>
  </inputVariables>
  <inOutVariables/>
  <outputVariables>
    <!-- Y output: NO expression element -->
    <variable formalParameter="Y">
      <connectionPointOut/>
    </variable>
    <!-- Status outputs: WITH expression elements -->
    <variable formalParameter="LIMITS_ACTIVE">
      <connectionPointOut>
        <expression>limits_active</expression>
      </connectionPointOut>
    </variable>
    <variable formalParameter="OVERFLOW">
      <connectionPointOut>
        <expression>Overflow</expression>
      </connectionPointOut>
    </variable>
  </outputVariables>
  <!-- REQUIRED addData for function blocks -->
  <addData>
    <data name="http://www.3s-software.com/plcopenxml/fbdcalltype" handleUnknown="implementation">
      <CallType xmlns="">functionblock</CallType>
    </data>
  </addData>
</block>

<!-- Output variable for PID Y value -->
<outVariable localId="80">
  <position x="600" y="420"/>
  <connectionPointIn>
    <connection refLocalId="70" formalParameter="Y"/>
  </connectionPointIn>
  <expression>heater_output</expression>
</outVariable>
```

**PID Rules (CRITICAL):**
- MUST connect all 12 input parameters
- MUST include addData with CallType="functionblock"
- Y output has NO expression element
- LIMITS_ACTIVE and OVERFLOW outputs HAVE expression elements
- Use rightPowerRail for proper termination
- BOOL parameters (MANUAL, RESET) use contacts, not inVariables

---

## Formal Parameter Reference (Case-Sensitive)

| Function Block | Input Parameters | Output Parameters |
|---------------|-----------------|-------------------|
| TON | IN, PT | Q, ET |
| TOF | IN, PT | Q, ET |
| CTU | CU, R, PV | Q, CV |
| PID_FIXCYCLE | ACTUAL, SET_POINT, KP, TN, TV, Y_MANUAL, Y_OFFSET, Y_MIN, Y_MAX, MANUAL, RESET, CYCLE | Y, LIMITS_ACTIVE, OVERFLOW |

---

## System Architecture Patterns

### Pattern 1: Sequential Process Control
```
StartBtn -> Timer1 -> Process1 -> Timer2 -> Process2
```
- Timer cascade using Q output to trigger next stage
- Use TIME variables for flexible presets
- ProcessActive flag controls parallel operations

### Pattern 2: Batch Production System
```
Sequential Timing: Mixing phase -> Heating phase -> Cooling phase
Batch Counting: CTU counts completed cycles
Production Tracking: BatchTarget and BatchComplete variables
```

### Pattern 3: Temperature Control
```
PID Integration: PID_FIXCYCLE with process timers
Direct Tuning: Use literal values (1.5, 10.0, 2.0) for fixed recipes
Variable Tuning: Use variables for auto-tuning systems
```

### Pattern 4: Conveyor Control
```
Start/Stop with Safety Interlocks
Motor Control with Overload Protection
Load/Unload Station Logic
Proximity Sensor Logic
Alarm Logic
```

---

## Standard Variable Templates by System Type

### Batch Control System
```xml
<!-- Digital Inputs -->
<variable name="StartBtn" address="%IX0.0"><type><BOOL/></type></variable>
<variable name="StopBtn" address="%IX0.1"><type><BOOL/></type></variable>
<variable name="EmergencyStop" address="%IX0.2"><type><BOOL/></type></variable>
<variable name="LevelHigh" address="%IX0.3"><type><BOOL/></type></variable>
<variable name="LevelLow" address="%IX0.4"><type><BOOL/></type></variable>
<variable name="TempSwitch" address="%IX0.5"><type><BOOL/></type></variable>
<variable name="PressureSwitch" address="%IX0.6"><type><BOOL/></type></variable>
<variable name="DrainConfirm" address="%IX0.7"><type><BOOL/></type></variable>
<!-- Digital Outputs -->
<variable name="AgitatorMotor" address="%QX0.0"><type><BOOL/></type></variable>
<variable name="HeatingElement" address="%QX0.1"><type><BOOL/></type></variable>
<variable name="CoolingValve" address="%QX0.2"><type><BOOL/></type></variable>
<variable name="ProcessActive" address="%QX0.3"><type><BOOL/></type></variable>
<variable name="InletValve" address="%QX0.4"><type><BOOL/></type></variable>
<variable name="DrainValve" address="%QX0.5"><type><BOOL/></type></variable>
```

### Conveyor Control System
```xml
<!-- Digital Inputs -->
<variable name="StartBtn" address="%IX0.0"><type><BOOL/></type></variable>
<variable name="StopBtn" address="%IX0.1"><type><BOOL/></type></variable>
<variable name="EmergencyStop" address="%IX0.2"><type><BOOL/></type></variable>
<variable name="LoadStation" address="%IX0.3"><type><BOOL/></type></variable>
<variable name="UnloadStation" address="%IX0.4"><type><BOOL/></type></variable>
<variable name="MotorOverload" address="%IX0.5"><type><BOOL/></type></variable>
<variable name="ProxSensor1" address="%IX0.6"><type><BOOL/></type></variable>
<variable name="ProxSensor2" address="%IX0.7"><type><BOOL/></type></variable>
<variable name="SafetyGate" address="%IX1.0"><type><BOOL/></type></variable>
<!-- Digital Outputs -->
<variable name="ConveyorMotor" address="%QX0.0"><type><BOOL/></type></variable>
<variable name="ProcessActive" address="%QX0.1"><type><BOOL/></type></variable>
<variable name="AlarmLight" address="%QX0.2"><type><BOOL/></type></variable>
<variable name="ReadyLight" address="%QX0.3"><type><BOOL/></type></variable>
```

---

## Connection Rules

### Simple Connection
```xml
<connectionPointIn>
  <connection refLocalId="1"/>
</connectionPointIn>
```

### Connection with Formal Parameter (from function block output)
```xml
<connectionPointIn>
  <connection refLocalId="2" formalParameter="Q"/>
</connectionPointIn>
```

### localId Management
- Each element MUST have a unique localId (integer)
- leftPowerRail is always localId="0"
- rightPowerRail uses localId="2147483646"
- Use sequential numbering for all other elements

---

## Validation Checklist

Before outputting any PLCopen XML for M241, verify:

- [ ] Correct namespace: `http://www.plcopen.org/xml/tc6_0200`
- [ ] fileHeader with companyName, productName, productVersion, creationDateTime
- [ ] coordinateInfo with fbd/ld/sfc scaling sections
- [ ] Unique localId on every element
- [ ] leftPowerRail present (localId="0")
- [ ] All function blocks have instanceName attribute
- [ ] TON blocks have both IN and PT connected
- [ ] CTU blocks have CU, R, and PV connected
- [ ] PID blocks have all 12 parameters connected
- [ ] PID blocks have addData with CallType="functionblock"
- [ ] NO expression elements on main function block outputs (Q, Y)
- [ ] Expression elements present on status outputs (LIMITS_ACTIVE, OVERFLOW)
- [ ] All refLocalId values reference existing elements
- [ ] Variables declared with correct types (BOOL, REAL, TIME, INT, derived)
- [ ] I/O addresses use byte.bit format (%IX0.0, %QX0.0)
- [ ] instances/configurations section present
- [ ] addData/projectstructure section present

---

## Common Import Errors and Fixes

### "Value cannot be null. Parameter name: source"
- Missing or incomplete function block parameter connections
- Ensure all mandatory parameters are connected

### "Expression in namespace has invalid child element"
- Expression elements used incorrectly on function block outputs
- Remove expression elements from Q and Y outputs
- Only use expression elements on outVariable and status outputs

### "Invalid child element in variable"
- Incorrect variable structure or missing elements
- Check derived types use correct names (TON, CTU, PID_FIXCYCLE)

---

## Generator Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| `generate_complete_system.py` | Full automation systems (batch, conveyor, HVAC) | `scripts/ecostruxure/` |
| `generate_timer_system.py` | Timer-based sequential control | `scripts/ecostruxure/` |
| `generate_pid_system.py` | PID temperature control | `scripts/ecostruxure/` |
| `validate_xml.py` | PLCopen XML compliance validation | `scripts/ecostruxure/` |

### Quick Usage
```python
from scripts.ecostruxure.generate_complete_system import create_automation_system

xml_content = create_automation_system(
    system_type="batch_control",
    include_timers=True,
    include_counters=True,
    include_pid=True,
    pid_tuning={"Kp": 1.5, "Tn": 10.0, "Tv": 2.0}
)
```

---

## Import Instructions

1. Open EcoStruxure Machine Expert
2. Create new project or open existing (target: TM241CE40T)
3. Go to **Project > Import PLCopen XML...**
4. Select the generated XML file
5. Review and accept import options
6. Program appears in project tree
7. Build and download to PLC

---

## Version History

- **v1.0** (2026-02-06): Initial creation from ecostruxure-plc skill integration
  - Complete PLCopen XML patterns for TON, CTU, PID_FIXCYCLE
  - M241-specific I/O addressing (byte.bit format)
  - System architecture patterns (batch, conveyor, HVAC, packaging)
  - Python generator scripts reference
  - Validation checklist and troubleshooting guide

---

**PLCAutoPilot EcoStruxure M241 Skill v1.0 | 2026-02-06 | github.com/chatgptnotes/plcautopilot.com**
