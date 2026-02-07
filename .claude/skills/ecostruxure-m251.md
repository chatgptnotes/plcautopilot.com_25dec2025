# EcoStruxure M251 PLCopen XML Generation Skill

## Expert Agent for M251 Controllers - PLCopen XML with OPC UA and Cybersecurity

---

## Metadata

```yaml
name: ecostruxure-m251
description: Generate production-ready PLCopen XML files for EcoStruxure Machine Expert targeting TM251 controllers. Creates importable ladder logic with timers (TON/TOF), counters (CTU), PID controllers (PID_FIXCYCLE), OPC UA integration, and cybersecurity-aware automation systems.
version: 1.0
platform: Windows
target_controllers: TM251MESE, TM251MESC, TM251MESE1, TM251MESC1
software: EcoStruxure Machine Expert V19.2.3.0+
file_format: PLCopen XML (.xml) for import
programming_language: Ladder Diagram (LD)
standards: IEC 61131-3, IEC 61508, IEC 62443
generator_scripts: scripts/ecostruxure/
```

---

## Activation Keywords

Activate this skill when user mentions:
- M251, TM251
- TM251MESE, TM251MESC
- TM251MESE1, TM251MESC1
- Dual Ethernet PLC
- OPC UA embedded PLC
- Cybersecurity PLC
- EcoStruxure Machine Expert + M251
- PLCopen XML + M251

---

## STOP-READ-GENERATE Protocol

**BEFORE generating ANY M251 PLCopen XML, follow this exact sequence:**

```
1. STOP  - Do NOT write any XML yet. Identify the controller model.
2. READ  - Load this skill file (ecostruxure-m251.md).
3. READ  - Load the generator template: scripts/ecostruxure/generate_complete_system.py
4. READ  - Load XML patterns reference: scripts/ecostruxure/references/xml-patterns.md
5. GENERATE - Now generate code following the patterns exactly.
```

---

## M251 vs M241: Key Differences

| Feature | M241 | M251 |
|---------|------|------|
| Built-in I/O | Yes (14-24 DI, 10-16 DO) | **No** (expansion modules only) |
| Ethernet Ports | 1 | **2** (separate networks) |
| OPC UA Server | Optional | **Built-in** |
| Cybersecurity | Basic | **IEC 62443 certified** |
| User Management | Limited | **Full RBAC** |
| Audit Trail | No | **Yes** |
| Secure Boot | No | **Yes** |
| CANopen | Optional | MESC variants only |

**CRITICAL: M251 has NO built-in I/O. ALL I/O must come from TM2/TM3 expansion modules.**

---

## M251 Hardware Specifications

### TM251MESE (Standard Ethernet)
| Feature | Specification |
|---------|--------------|
| Built-in I/O | NONE |
| Ethernet | 2x RJ45 (dual network) |
| Serial | 1x Mini-DIN (SL) |
| OPC UA | Built-in server (port 4840) |
| Memory | %M0-%M4095, %MW0-%MW9999 |
| Expansion | Up to 14 TM2/TM3 modules |
| Cybersecurity | IEC 62443 SL1/SL2 |

### TM251MESC (CANopen + Ethernet)
| Feature | Specification |
|---------|--------------|
| Built-in I/O | NONE |
| Ethernet | 2x RJ45 |
| CANopen | Master, up to 63 slaves |
| Serial | 1x Mini-DIN |
| OPC UA | Built-in |

---

## I/O Addressing Format (CRITICAL - Expansion Modules Only)

### M251 has NO built-in I/O. Use expansion modules:

```
TM3 Expansion Modules (Slot-based addressing):
  Digital Inputs:   %IX<slot>.<bit>    (e.g., %IX0.0 to %IX0.15)
  Digital Outputs:  %QX<slot>.<bit>    (e.g., %QX0.0 to %QX0.7)
  Analog Inputs:    %IW<slot>.<channel> (e.g., %IW0.0 to %IW0.3)
  Analog Outputs:   %QW<slot>.<channel> (e.g., %QW0.0)

Memory:
  Memory Bits:      %MX<byte>.<bit>    (e.g., %MX0.0)
  Memory Words:     %MW<n>             (e.g., %MW0 to %MW9999)
```

### Typical Expansion Configuration
```
Slot 0: TM3DI16  (16 DI)  -> %IX0.0 to %IX0.15
Slot 1: TM3DQ16T (16 DO)  -> %QX1.0 to %QX1.15
Slot 2: TM3AI4   (4 AI)   -> %IW2.0 to %IW2.3
Slot 3: TM3AQ2   (2 AO)   -> %QW3.0 to %QW3.1
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

### With I/O Address (Expansion Module Digital Input)
```xml
<variable name="StartBtn" address="%IX0.0">
  <type><BOOL/></type>
</variable>
```

### With I/O Address (Expansion Module Digital Output)
```xml
<variable name="MotorRun" address="%QX1.0">
  <type><BOOL/></type>
</variable>
```

### Without Address (Internal)
```xml
<variable name="ProcessActive">
  <type><BOOL/></type>
</variable>
```

### Timer, Counter, PID Instances
```xml
<variable name="MixingTimer"><type><derived name="TON"/></type></variable>
<variable name="BatchCounter"><type><derived name="CTU"/></type></variable>
<variable name="TempController"><type><derived name="PID_FIXCYCLE"/></type></variable>
```

### Basic Types
```xml
<variable name="actual_temp"><type><REAL/></type></variable>
<variable name="MixingTime"><type><TIME/></type></variable>
<variable name="BatchTarget"><type><INT/></type></variable>
```

---

## Ladder Element Patterns

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
    <connection refLocalId="0"/>
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
    <connection refLocalId="1"/>
  </connectionPointIn>
  <connectionPointOut/>
  <variable>StopBtn</variable>
</contact>
```

### Contact (Edge Detection)
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

### Set/Reset Coils
```xml
<!-- Set (Latch) -->
<coil localId="7" negated="false" storage="set">
  <connectionPointIn><connection refLocalId="6"/></connectionPointIn>
  <variable>LATCHED_OUTPUT</variable>
</coil>

<!-- Reset (Unlatch) -->
<coil localId="8" negated="false" storage="reset">
  <connectionPointIn><connection refLocalId="7"/></connectionPointIn>
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

### TON Timer (On-Delay)
```xml
<inVariable localId="10">
  <position x="200" y="120"/>
  <connectionPointOut/>
  <expression>MixingTime</expression>
</inVariable>

<block localId="2" typeName="TON" instanceName="MixingTimer">
  <position x="300" y="80"/>
  <inputVariables>
    <variable formalParameter="IN">
      <connectionPointIn><connection refLocalId="1"/></connectionPointIn>
    </variable>
    <variable formalParameter="PT">
      <connectionPointIn><connection refLocalId="10"/></connectionPointIn>
    </variable>
  </inputVariables>
  <inOutVariables/>
  <outputVariables>
    <variable formalParameter="Q"><connectionPointOut/></variable>
  </outputVariables>
</block>
```

### CTU Counter (Count Up)
```xml
<inVariable localId="32">
  <position x="200" y="340"/>
  <connectionPointOut/>
  <expression>BatchTarget</expression>
</inVariable>

<block localId="33" typeName="CTU" instanceName="BatchCounter">
  <position x="300" y="300"/>
  <inputVariables>
    <variable formalParameter="CU">
      <connectionPointIn><connection refLocalId="30"/></connectionPointIn>
    </variable>
    <variable formalParameter="R">
      <connectionPointIn><connection refLocalId="31"/></connectionPointIn>
    </variable>
    <variable formalParameter="PV">
      <connectionPointIn><connection refLocalId="32"/></connectionPointIn>
    </variable>
  </inputVariables>
  <inOutVariables/>
  <outputVariables>
    <variable formalParameter="Q"><connectionPointOut/></variable>
    <variable formalParameter="CV"><connectionPointOut/></variable>
  </outputVariables>
</block>
```

### PID_FIXCYCLE Controller
```xml
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
    <variable formalParameter="Y"><connectionPointOut/></variable>
    <!-- Status outputs: WITH expression elements -->
    <variable formalParameter="LIMITS_ACTIVE">
      <connectionPointOut><expression>limits_active</expression></connectionPointOut>
    </variable>
    <variable formalParameter="OVERFLOW">
      <connectionPointOut><expression>Overflow</expression></connectionPointOut>
    </variable>
  </outputVariables>
  <!-- REQUIRED addData for function blocks -->
  <addData>
    <data name="http://www.3s-software.com/plcopenxml/fbdcalltype" handleUnknown="implementation">
      <CallType xmlns="">functionblock</CallType>
    </data>
  </addData>
</block>

<outVariable localId="80">
  <position x="600" y="420"/>
  <connectionPointIn>
    <connection refLocalId="70" formalParameter="Y"/>
  </connectionPointIn>
  <expression>heater_output</expression>
</outVariable>
```

---

## Formal Parameter Reference (Case-Sensitive)

| Function Block | Input Parameters | Output Parameters |
|---------------|-----------------|-------------------|
| TON | IN, PT | Q, ET |
| TOF | IN, PT | Q, ET |
| CTU | CU, R, PV | Q, CV |
| PID_FIXCYCLE | ACTUAL, SET_POINT, KP, TN, TV, Y_MANUAL, Y_OFFSET, Y_MIN, Y_MAX, MANUAL, RESET, CYCLE | Y, LIMITS_ACTIVE, OVERFLOW |

---

## M251-Specific: Dual Ethernet Configuration

### Network Segregation (CRITICAL for IEC 62443)
```
Ethernet 1 (ETH1): Control Network
  - IP: 192.168.1.10/24
  - Protocols: Modbus TCP (port 502), EtherNet/IP
  - Purpose: Real-time control, I/O communication

Ethernet 2 (ETH2): IT/Supervision Network
  - IP: 10.0.0.10/24
  - Protocols: OPC UA (port 4840), HTTP/HTTPS
  - Purpose: SCADA, MES, historian, HMI
```

### OPC UA Server Configuration
```
Default Port: 4840
Security Modes: None, Sign, SignAndEncrypt
Authentication: Anonymous, Username/Password, Certificate
Max Sessions: 10
Max Subscriptions: 50
Publishing Interval: 100ms
```

### Variables to Expose via OPC UA
When designing programs for M251, consider which variables should be OPC UA accessible:
- Process values (temperatures, levels, pressures)
- Setpoints (operator adjustable)
- Alarm/status flags
- Production counters
- PID tuning parameters (if auto-tuning)

---

## M251-Specific: Cybersecurity Considerations

### IEC 62443 Security Levels
| Level | Description | M251 Support |
|-------|-------------|--------------|
| SL0 | No security | Yes |
| SL1 | Protection against casual violation | Yes (default) |
| SL2 | Protection against intentional violation | Yes |
| SL3 | Protection against sophisticated attack | Partial |

### Security Best Practices for M251 Programs
1. **Network segregation**: Use ETH1 for control, ETH2 for IT
2. **RBAC**: Define minimum required permissions per user role
3. **Audit trail**: Log security-relevant events
4. **Encrypted communications**: Use SignAndEncrypt for OPC UA
5. **Timeout policies**: Auto-logout inactive sessions
6. **Input validation**: Validate all external inputs in PLC logic

### User Roles
| Role | Permissions |
|------|------------|
| Administrator | Full access, configuration, user management |
| Engineer | Programming, parameter changes, diagnostics |
| Operator | Start/stop, setpoint changes, acknowledgments |
| Viewer | Read-only monitoring |

---

## System Architecture Patterns

### Pattern 1: Secure Process Control
```
ETH1 (Control): PLC <-> Remote I/O (Modbus TCP)
ETH2 (IT):      PLC <-> SCADA (OPC UA, SignAndEncrypt)
                 PLC <-> Historian (OPC UA)
                 PLC <-> MES (OPC UA)
```

### Pattern 2: Batch Production with Audit Trail
```
Sequential Timing: Mixing -> Heating -> Cooling
Batch Counting: CTU tracks completed cycles
Audit Events: LOGIN, CONFIG_CHANGE, VARIABLE_WRITE, MODE_CHANGE
```

### Pattern 3: Temperature Control with OPC UA
```
PID_FIXCYCLE: Regulates temperature
OPC UA Nodes: actual_temp, setpoint_temp, heater_output (exposed to SCADA)
Tuning: Direct values or operator-adjustable via OPC UA
```

---

## Standard Variable Templates

### Secure Process Control System
```xml
<!-- Digital Inputs (via TM3DI16 at Slot 0) -->
<variable name="StartBtn" address="%IX0.0"><type><BOOL/></type></variable>
<variable name="StopBtn" address="%IX0.1"><type><BOOL/></type></variable>
<variable name="EmergencyStop" address="%IX0.2"><type><BOOL/></type></variable>
<variable name="LevelHigh" address="%IX0.3"><type><BOOL/></type></variable>
<variable name="LevelLow" address="%IX0.4"><type><BOOL/></type></variable>
<variable name="TempSwitch" address="%IX0.5"><type><BOOL/></type></variable>

<!-- Digital Outputs (via TM3DQ16T at Slot 1) -->
<variable name="AgitatorMotor" address="%QX1.0"><type><BOOL/></type></variable>
<variable name="HeatingElement" address="%QX1.1"><type><BOOL/></type></variable>
<variable name="CoolingValve" address="%QX1.2"><type><BOOL/></type></variable>
<variable name="ProcessActive" address="%QX1.3"><type><BOOL/></type></variable>

<!-- Analog Inputs (via TM3AI4 at Slot 2) -->
<variable name="actual_temp" address="%IW2.0"><type><REAL/></type></variable>
<variable name="actual_level" address="%IW2.1"><type><REAL/></type></variable>

<!-- Analog Outputs (via TM3AQ2 at Slot 3) -->
<variable name="heater_output" address="%QW3.0"><type><REAL/></type></variable>

<!-- Internal: Timers, Counters, PID -->
<variable name="MixingTimer"><type><derived name="TON"/></type></variable>
<variable name="BatchCounter"><type><derived name="CTU"/></type></variable>
<variable name="TempController"><type><derived name="PID_FIXCYCLE"/></type></variable>

<!-- PID Parameters -->
<variable name="setpoint_temp"><type><REAL/></type></variable>
<variable name="MixingTime"><type><TIME/></type></variable>
<variable name="BatchTarget"><type><INT/></type></variable>
```

---

## Connection Rules

### Simple Connection
```xml
<connectionPointIn>
  <connection refLocalId="1"/>
</connectionPointIn>
```

### Connection with Formal Parameter
```xml
<connectionPointIn>
  <connection refLocalId="2" formalParameter="Q"/>
</connectionPointIn>
```

### localId Management
- leftPowerRail: localId="0"
- rightPowerRail: localId="2147483646"
- All other elements: sequential integers starting from 1
- Every element MUST have a unique localId

---

## Validation Checklist

Before outputting any PLCopen XML for M251, verify:

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
- [ ] Variables declared with correct types
- [ ] **M251: No built-in I/O addresses used (expansion modules only)**
- [ ] **M251: I/O addresses match actual expansion module configuration**
- [ ] instances/configurations section present
- [ ] addData/projectstructure section present

---

## Common Import Errors and Fixes

### "Value cannot be null. Parameter name: source"
- Missing or incomplete function block parameter connections
- Ensure all mandatory PID parameters are connected

### "Expression in namespace has invalid child element"
- Expression elements on function block main outputs
- Remove from Q and Y, keep on LIMITS_ACTIVE and OVERFLOW

### "Invalid child element in variable"
- Wrong derived type names
- Use exact names: TON, TOF, CTU, PID_FIXCYCLE

---

## Generator Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| `generate_complete_system.py` | Full automation systems | `scripts/ecostruxure/` |
| `generate_timer_system.py` | Timer-based sequential control | `scripts/ecostruxure/` |
| `generate_pid_system.py` | PID temperature control | `scripts/ecostruxure/` |
| `validate_xml.py` | PLCopen XML compliance validation | `scripts/ecostruxure/` |

---

## Import Instructions

1. Open EcoStruxure Machine Expert
2. Create new project (target: TM251MESE)
3. Configure expansion modules in hardware tree
4. Go to **Project > Import PLCopen XML...**
5. Select the generated XML file
6. Review and accept import options
7. Verify I/O addresses match hardware configuration
8. Configure OPC UA node exposure if needed
9. Build and download to PLC

---

## Version History

- **v1.0** (2026-02-06): Initial creation from ecostruxure-plc skill integration
  - Complete PLCopen XML patterns for TON, CTU, PID_FIXCYCLE
  - M251-specific: no built-in I/O, expansion module addressing
  - Dual Ethernet configuration guidance
  - OPC UA server configuration reference
  - IEC 62443 cybersecurity considerations
  - Python generator scripts reference
  - Validation checklist and troubleshooting guide

---

**PLCAutoPilot EcoStruxure M251 Skill v1.0 | 2026-02-06 | github.com/chatgptnotes/plcautopilot.com**
