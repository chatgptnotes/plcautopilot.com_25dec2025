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

## MANDATORY: Use LogicBuilderShell.exe for Project Creation

### Rule: ALWAYS Use LogicBuilderShell API

**CRITICAL**: When creating ANY Machine Expert program for M241/M251/M258, you MUST use LogicBuilderShell.exe scripting API. Do NOT attempt to manually generate or modify .project files.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MANDATORY WORKFLOW FOR M241/M251/M258 PROJECT CREATION                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Generate PLCopen XML file with ladder/ST logic                          │
│  2. Create LogicBuilderShell Python script                                  │
│  3. Execute script via LogicBuilderShell.exe                                │
│  4. Project created with correct device and imported logic                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### LogicBuilderShell Location
```
C:\Program Files\Schneider Electric\EcoStruxure Machine Expert\V1.2\LogicBuilderShell.exe
```

### Device ID Reference (CRITICAL)
| Device Model | Type | Device ID | Version |
|--------------|------|-----------|---------|
| TM241CE24T/U | 4096 | `101a 0711` | 5.0.8.2 |
| TM241CE40T/U | 4096 | `101a 0710` | 5.0.8.2 |
| TM251MESE | 4096 | `101a 0720` | 5.0.8.2 |
| TM258LF42DT | 4096 | `101a 0730` | 5.0.8.2 |

### Template Script: `scripts/create_m241_TM241CE40T_project.py`

```python
# LogicBuilderShell Script Template
import new_project
import projects
import os

# Device Configuration - CHANGE THESE FOR YOUR TARGET
DEVICE_TYPE = 4096
DEVICE_ID = "101a 0710"      # TM241CE40T/U
DEVICE_VERSION = "5.0.8.2"
PROJECT_NAME = "Your_Project_Name"
PROJECT_PATH = r"D:\path\to\plc_programs"
XML_FILE = r"D:\path\to\your_program.xml"

# Create controller settings
ctrl = new_project.create_controller_settings()
ctrl.type = DEVICE_TYPE
ctrl.id = DEVICE_ID
ctrl.version = DEVICE_VERSION
ctrl.device_name = "MyController"
ctrl.implementation_language = ImplementationLanguage.ladder_logic_diagram

# Create project settings
settings = new_project.create_common_project_settings()
settings.project_name = PROJECT_NAME
settings.project_path = PROJECT_PATH
settings.machine_name = "Machine_Name"  # REQUIRED
settings.author = "PLCAutoPilot"
settings.company = "PLCAutoPilot"

# Create project and import XML
new_project.create_project(settings, ctrl)
projects.primary.import_xml(XML_FILE, True)
projects.primary.save()
```

### Execution Command
```cmd
"C:\Program Files\Schneider Electric\EcoStruxure Machine Expert\V1.2\LogicBuilderShell.exe" scripts/create_m241_project.py
```

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
├── __shared_data_storage_string_table__.auxiliary - Device references
└── MUST use LogicBuilderShell.exe API to generate
```

### Project Creation Methods (Priority Order)
1. **LogicBuilderShell.exe** (MANDATORY) - Automated project creation with correct device
   - Script template: `scripts/create_m241_TM241CE40T_project.py`
   - Creates .project with correct device configuration
   - Imports PLCopen XML automatically
2. **PLCopen XML Import** (For logic only) - Project > Import PLCopen XML
   - See: `.claude/skills/m241-plcopen-template.md` for format details
   - Template: `templates/m241/POU_Ladder_Template.xml`
3. **Structured Text** - Copy/paste into POU

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

- **v2.0** (2025-12-30): MANDATORY LogicBuilderShell.exe rule for project creation
  - Added mandatory workflow: ALWAYS use LogicBuilderShell.exe for M241/M251/M258
  - Documented Device ID reference table (TM241CE24T=0711, TM241CE40T=0710)
  - Added complete script template with all required properties
  - Created working example: `scripts/create_m241_TM241CE40T_project.py`
  - Key API discovery: `new_project.create_project(settings, ctrl)`
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

**PLCAutoPilot Schneider M241 Skill v2.0 | 2025-12-30 | github.com/chatgptnotes/plcautopilot.com**
