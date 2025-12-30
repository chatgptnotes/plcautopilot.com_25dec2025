# Schneider M241 PLC Programming Skill
## Expert Agent for M241/M251/M258 Controllers

---

## Overview

**Target Controllers**: M241, M251, M258 (Modicon M2xx series)
**Software**: EcoStruxure Machine Expert (CODESYS-based)
**File Format**: .project (proprietary CODESYS format)
**Programming Languages**: LD, IL, SFC, ST, FBD
**Standards**: IEC 61131-3, IEC 61508

---

## CRITICAL: M241 vs M221 Differences

### File Structure
**M221**: Single XML file (.smbp) - EcoStruxure Machine Expert Basic
**M241/M251/M258**: .project format (CODESYS-based) - EcoStruxure Machine Expert

```
M241_Project.project (ZIP Archive - CODESYS proprietary format)
├── {GUID}.meta              - Binary metadata for each object
├── {GUID}.object            - Binary serialized object data
├── profile.auxiliary        - Version info (V19.2.3.0)
├── engineeringtoolsversions.auxiliary - Plugin versions
├── __shared_data_storage_string_table__.auxiliary - Device references (TM241CE24T)
└── Cannot be programmatically generated - MUST use Machine Expert IDE
```

### Import Options for M241
Since .project cannot be generated externally, use these import methods:
1. **PLCopen XML** (RECOMMENDED) - Project > Import PLCopen XML
   - See: `.claude/skills/m241-plcopen-template.md` for format details
   - Template: `templates/m241/POU_Ladder_Template.xml`
2. **Structured Text** - Copy/paste into POU
3. **IEC 61131-3 Export** - From other CODESYS platforms

### Memory Differences
| Feature | M221 | M241/M251/M258 |
|---------|------|----------------|
| Memory Bits | %M0-%M511 | %M0-%M2047 |
| Memory Words | %MW0-%MW1999 | %MW0-%MW4999 |
| Timers | 255 | 512 |
| Digital I/O | 40 max | 264 max |
| Analog I/O | 2 | 14 |

### Programming Differences
- M241+ supports **Ethernet communication** (Modbus TCP/IP)
- M241+ supports **IEC 61850** protocol
- M241+ has **PID control** built-in
- M241+ supports **CANopen** communication

---

## Output Formats (Since .project cannot be generated)

**IMPORTANT**: M241 .project format is proprietary CODESYS and cannot be programmatically generated.

### Recommended Output: Structured Text (.st)
Generate complete ST code that users can copy into Machine Expert:

```st
PROGRAM PLC_PRG
VAR
    (* Digital Inputs *)
    START_PB AT %IX0.0 : BOOL;
    STOP_PB  AT %IX0.1 : BOOL;

    (* Digital Outputs *)
    MOTOR    AT %QX0.0 : BOOL;

    (* Internal *)
    Running  : BOOL := FALSE;
END_VAR

(* Main Logic *)
IF START_PB AND NOT STOP_PB THEN
    Running := TRUE;
END_IF;
IF STOP_PB THEN
    Running := FALSE;
END_IF;
MOTOR := Running;

END_PROGRAM
```

### Alternative Output: PLCopen XML (RECOMMENDED FOR LADDER)
Generate PLCopen XML for import via Project > Import PLCopen XML

**Template File**: `.claude/skills/m241-plcopen-template.md`
**Example**: `templates/m241/POU_Ladder_Template.xml`

**PLCopen XML Namespace**: `http://www.plcopen.org/xml/tc6_0200`

Key PLCopen Ladder Elements:
- `<leftPowerRail>` - Start of rung
- `<rightPowerRail>` - End of rung
- `<contact negated="false">` - NO contact
- `<contact negated="true">` - NC contact
- `<coil>` - Output coil
- `<coil storage="set">` - Set (latch) coil
- `<coil storage="reset">` - Reset (unlatch) coil
- `<block typeName="TON">` - Timer function block
- `<block typeName="CTU">` - Counter function block

---

## I/O Addressing (M241/M251/M258)

### Digital Inputs
```
Format: %I0.0.x or %IX0.0.x
Range: %I0.0.0 to %I0.3.15 (up to 64 inputs per module)

Examples:
%I0.0.0 - Module 0, Channel 0, Bit 0
%I0.1.5 - Module 0, Channel 1, Bit 5
```

### Digital Outputs
```
Format: %Q0.0.x or %QX0.0.x
Range: %Q0.0.0 to %Q0.3.15

Examples:
%Q0.0.0 - Module 0, Channel 0, Bit 0
%Q0.1.7 - Module 0, Channel 1, Bit 7
```

### Analog Inputs
```
Format: %IW0.0.x
Range: 0-10000 (representing -10V to +10V or 4-20mA)

Examples:
%IW0.0.0 - First analog input
%IW0.0.1 - Second analog input
```

### Analog Outputs
```
Format: %QW0.0.x
Range: 0-10000

Examples:
%QW0.0.0 - First analog output
```

---

## Ethernet Communication (M241+)

### Modbus TCP/IP Master
```python
# M241 supports Modbus TCP/IP natively

# Configuration in XML:
<EthernetConfiguration>
  <IPAddress>192.168.1.10</IPAddress>
  <SubnetMask>255.255.255.0</SubnetMask>
  <Gateway>192.168.1.1</Gateway>
  <ModbusTCP>
    <Enabled>true</Enabled>
    <Port>502</Port>
  </ModbusTCP>
</EthernetConfiguration>
```

### Example: Modbus TCP Read
```
Function Block: READ_VAR
Connection: Modbus TCP
Slave Address: 1
Register: 40001
Data Type: INT
Destination: %MW100
```

---

## PID Control (M241+)

### PID Function Block
```xml
<FunctionBlock>
  <Type>PID</Type>
  <Instance>PID_TEMP_CTRL</Instance>
  <Parameters>
    <Setpoint>%MW100</Setpoint>
    <ProcessVariable>%IW0.0.0</ProcessVariable>
    <Output>%QW0.0.0</Output>
    <Kp>1.5</Kp>
    <Ki>0.1</Ki>
    <Kd>0.05</Kd>
  </Parameters>
</FunctionBlock>
```

---

## Working Examples (To Be Created)

### 1. Sequential Control with Ethernet
**File**: `create_sequential_m241_ethernet.py`
- Modbus TCP communication
- Remote I/O control
- Network diagnostics

### 2. Analog Control with PID
**File**: `create_pid_control_m241.py`
- Temperature control
- PID tuning
- Analog I/O scaling

### 3. CANopen Master
**File**: `create_canopen_m241.py`
- CANopen network setup
- Remote device configuration
- PDO mapping

---

## Activation Rules

**Trigger Keywords**:
- M241, M251, M258
- TM241, TM251, TM258
- Modbus TCP
- PID control
- CANopen
- Ethernet PLC

**Action**: Read appropriate M241 template script

---

## M241 Programming Checklist

- [ ] Generate PLCopen XML or Structured Text (NOT .project directly)
- [ ] Use correct I/O addressing: %IX0.n (inputs), %QX0.n (outputs)
- [ ] Use derived types for function blocks: `<derived name="TON" />`
- [ ] Include localId for each element (unique integer)
- [ ] Connect elements via refLocalId references
- [ ] Configure Ethernet if needed
- [ ] Map I/O correctly (module.channel.bit format)
- [ ] Set up Modbus TCP if remote I/O
- [ ] Configure PID parameters if analog control
- [ ] Test network connectivity
- [ ] Verify CANopen configuration if used

## Template Files

| File | Location | Purpose |
|------|----------|---------|
| PLCopen XML Template | `.claude/skills/m241-plcopen-template.md` | Complete PLCopen XML documentation |
| Ladder Example | `templates/m241/POU_Ladder_Template.xml` | Working ladder program example |
| Machine Expert Template | `plc_programs/M241/Machine_Expert_Template.project` | Reference .project file |

---

## Version History

- **v1.2** (2025-12-30): Added PLCopen XML template and .project structure analysis
  - Analyzed Machine_Expert_Template.project (ZIP archive structure)
  - Created m241-plcopen-template.md with complete element reference
  - Added template files to templates/m241/ directory
  - Documented all ladder element types for PLCopen XML
- **v1.1** (2025-12-30): Fixed file format - M241 uses .project (CODESYS), not .smbp
  - Clarified that .project cannot be programmatically generated
  - Updated to recommend Structured Text (.st) or PLCopen XML output
- **v1.0** (2025-12-24): Initial M241/M251/M258 skill creation

---

**PLCAutoPilot Schneider M241 Skill v1.2 | 2025-12-30 | github.com/chatgptnotes/plcautopilot.com**
