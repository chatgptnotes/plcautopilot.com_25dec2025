# M241 Project Generator

Automated generation of EcoStruxure Machine Expert projects for Schneider Electric M241 PLCs.

## Overview

This module provides complete automation for generating deployable M241 PLC projects:

- **Scripting API**: Uses LogicBuilderShell.exe for programmatic project creation
- **Templates**: Pre-built templates for common applications (motor control, tank level, temperature)
- **AI Integration**: Natural language to PLC code generation
- **Full Automation**: From specification to downloadable .project file

## Files

| File | Description |
|------|-------------|
| `generate_m241_project.py` | Main generator script for LogicBuilderShell |
| `config_example.json` | Example configuration file |

## Prerequisites

1. **EcoStruxure Machine Expert V1.2+** installed on Windows
2. **Valid Machine Expert license**
3. **Python 2.7/3.x** (built into LogicBuilderShell)

## Usage

### Command Line (with LogicBuilderShell)

```batch
:: Motor start/stop template
"C:\Program Files\Schneider Electric\EcoStruxure Machine Expert\V1.2\LogicBuilderShell.exe" generate_m241_project.py --template motor --name "Motor_Control" --controller TM241CE24T

:: Tank level control template
"C:\Program Files\Schneider Electric\EcoStruxure Machine Expert\V1.2\LogicBuilderShell.exe" generate_m241_project.py --template tank --name "Tank_Level" --controller TM241CE40T

:: Temperature control template
"C:\Program Files\Schneider Electric\EcoStruxure Machine Expert\V1.2\LogicBuilderShell.exe" generate_m241_project.py --template temperature --name "Temp_Control"

:: From configuration file
"C:\Program Files\Schneider Electric\EcoStruxure Machine Expert\V1.2\LogicBuilderShell.exe" generate_m241_project.py --config config_example.json
```

### Via PLCAutoPilot API

```bash
# Generate motor start/stop project
curl -X POST https://plcautopilot.com/api/generate-m241-project \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Motor_Control",
    "plcModel": "TM241CE24T",
    "language": "ST",
    "template": "motor_start_stop"
  }' \
  --output Motor_Control.project

# Generate custom logic
curl -X POST https://plcautopilot.com/api/generate-m241-project \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Custom_Project",
    "plcModel": "TM241CE40T",
    "language": "ST",
    "logicDescription": "Conveyor control with 3 motors, emergency stop, and speed control"
  }' \
  --output Custom_Project.project
```

## Supported Controllers

| Model | Digital I/O | Communication |
|-------|-------------|---------------|
| TM241CE24T | 14 DI / 10 DO | Ethernet, Serial |
| TM241CE24R | 14 DI / 10 DO (Relay) | Ethernet, Serial |
| TM241CE24U | 14 DI / 10 DO | Ethernet, USB |
| TM241CE40T | 24 DI / 16 DO | Ethernet, Serial |
| TM241CE40R | 24 DI / 16 DO (Relay) | Ethernet, Serial |
| TM241CE40U | 24 DI / 16 DO | Ethernet, USB |
| TM241CEC24T | 14 DI / 10 DO | Ethernet, CANopen |
| TM241CEC24R | 14 DI / 10 DO (Relay) | Ethernet, CANopen |
| TM241CEC40T | 24 DI / 16 DO | Ethernet, CANopen |
| TM241CEC40R | 24 DI / 16 DO (Relay) | Ethernet, CANopen |

## Supported Expansion Modules

| Category | Modules |
|----------|---------|
| Digital Input | TM3DI8, TM3DI16, TM3DI32K |
| Digital Output | TM3DQ8T, TM3DQ8R, TM3DQ16T, TM3DQ16R, TM3DQ32TK |
| Mixed Digital | TM3DM8R, TM3DM24R |
| Analog Input | TM3AI2H, TM3AI4, TM3AI8, TM3AI8/G |
| Analog Output | TM3AQ2, TM3AQ4 |
| Mixed Analog | TM3AM6, TM3AM6/G |
| Temperature | TM3TI4, TM3TI4/G, TM3TI4D, TM3TI8T |
| Expert | TM3XHSC202, TM3XPWM302 |

## Templates

### Motor Start/Stop

- Start/Stop pushbutton control
- Overload fault handling
- 3-second startup delay
- Run indicator output
- Runtime tracking

### Tank Level Control

- 4-20mA level sensor input
- Scaling to engineering units (liters)
- High/Low level alarms
- Pump control with hysteresis
- HMI values output

### Temperature Control

- PT100 RTD sensor input
- Heater/Cooler control
- Deadband control
- High/Low temperature alarms
- HMI integration

## Configuration File Format

```json
{
  "project_name": "MyProject",
  "controller": "TM241CE24T",
  "output_path": "C:\\Projects\\M241",
  "task_interval": "T#20ms",
  "task_priority": 1,
  "expansion_modules": [
    {"slot": 1, "type": "TM3AI4"}
  ],
  "global_variables": [
    {"name": "StartPB", "type": "BOOL", "address": "%IX0.0", "comment": "Start button"}
  ],
  "programs": [
    {
      "name": "Main",
      "language": "ST",
      "declaration": "VAR\n    x : BOOL;\nEND_VAR",
      "implementation": "x := TRUE;"
    }
  ]
}
```

## I/O Addressing

### Built-in I/O

| Type | Format | 24-point | 40-point |
|------|--------|----------|----------|
| Digital Input | %IX0.n | 0-13 | 0-23 |
| Digital Output | %QX0.n | 0-9 | 0-15 |

### Expansion I/O (TM3 modules)

| Slot | Analog | Digital |
|------|--------|---------|
| 1 | %IW1.x / %QW1.x | %I1.x / %Q1.x |
| 2 | %IW2.x / %QW2.x | %I2.x / %Q2.x |
| 3-14 | %IWn.x / %QWn.x | %In.x / %Qn.x |

## Troubleshooting

### LogicBuilderShell not found

Verify Machine Expert installation path:
```batch
dir "C:\Program Files\Schneider Electric\EcoStruxure Machine Expert\V1.2\LogicBuilderShell.exe"
```

### License error

Ensure Machine Expert has a valid license. Check Help > License Manager in Machine Expert GUI.

### Script errors

Run with debug output:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Related Files

- **Skill file**: `.claude/skills/schneider-m241.md`
- **API endpoint**: `app/api/generate-m241-project/route.ts`
- **PLCopen adapter**: `lib/m241-plcopen-adapter.ts`

## Version

v2.0 | 2025-12-30 | PLCAutoPilot
