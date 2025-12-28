# Machine Expert Integration Guide

## Overview

PLCAutoPilot generates `.smbp` files that are 100% compatible with Schneider Electric's EcoStruxure Machine Expert Basic software.

## Supported Platforms

### Machine Expert Basic (M221 Controllers)
- **Software**: EcoStruxure Machine Expert Basic V1.2 SP1+
- **Controllers**: TM221CE16T, TM221CE24T, TM221CE40T, TM221CE16R, TM221CE24R, TM221CE40R
- **File Format**: `.smbp` (XML-based project file)
- **Download**: [Machine Expert Basic](https://www.se.com/us/en/download/document/Machine_Expert_Basic_V1_2_SP1/)

### Machine Expert (M241, M251, M258, M340, M580)
- **Software**: EcoStruxure Machine Expert V1.2+
- **File Format**: `.project` (different from .smbp)
- **Note**: PLCAutoPilot currently generates .smbp files for M221. Support for other formats is planned.

## How PLCAutoPilot Works

### 1. XML Generation
PLCAutoPilot generates valid XML that matches the .smbp file structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ProjectData>
  <ProjectInfo>
    <Name>MyProject</Name>
    ...
  </ProjectInfo>
  <Modules>
    <Controller>
      <Reference>TM221CE24T</Reference>
      <HardwareId>1933</HardwareId>
      ...
    </Controller>
  </Modules>
  <Program>
    <Rungs>
      <RungEntity>...</RungEntity>
    </Rungs>
  </Program>
</ProjectData>
```

### 2. Template-Based Approach
We use working templates from Machine Expert Basic to ensure compatibility:
- `templates/TM221CE24T-base.smbp` - Base template for all M221 models
- `templates/TM221-with-expansion-modules.smbp` - Template with expansion cards

### 3. AI-Powered Logic Generation
Claude AI generates ladder logic rungs following strict IEC 61131-3 rules:
- Proper column layout (0-10)
- Timer/Comparison elements span 2 columns
- Correct IL (Instruction List) code
- Symbol table population

## Workflow

1. **User Describes Requirements** in PLCAutoPilot
2. **AI Generates Ladder Logic** following M221 rules
3. **PLCAutoPilot Creates .smbp File** with proper XML structure
4. **User Downloads File** from PLCAutoPilot
5. **User Opens in Machine Expert Basic** - File opens directly
6. **User Compiles and Downloads** to M221 controller

## Machine Expert Python API (Advanced)

For advanced users with Machine Expert (full version, not Basic), there's a built-in Python API:

```python
# Available in LogicBuilderShell.exe
# NOT applicable to Machine Expert Basic

# Open a project
projects.open("MyProject.project")

# Find and modify objects
myObject = projects.primary.find("MyDevice")[0]
myObject.rename("New_Name")

# Compile and download
projects.primary.application.compile()
online.create_online_application(app).download()
```

**Note**: This API is only available in the full Machine Expert software and does NOT work with .smbp files.

## File Format Reference

### .smbp Structure
```
ProjectData/
├── ProjectInfo/          # Project metadata
├── Configuration/        # Hardware configuration
│   ├── Controller/       # Main PLC settings
│   ├── Extensions/       # Expansion modules
│   └── Cartridges/       # Cartridge modules
├── Symbols/              # Variable definitions
│   ├── DigitalInputs/
│   ├── DigitalOutputs/
│   ├── AnalogInputs/
│   ├── MemoryBits/
│   └── Timers/
└── Program/              # Ladder logic
    ├── Rungs/            # Individual rungs
    └── POUs/             # Program Organization Units
```

### Key XML Elements

| Element | Description |
|---------|-------------|
| `<RungEntity>` | Single ladder rung |
| `<LadderEntity>` | Ladder element (contact, coil, etc.) |
| `<ElementType>` | NormalContact, NegatedContact, Coil, Timer, etc. |
| `<InstructionLines>` | IL code for the rung |
| `<TimerTM>` | Timer definition |
| `<MemoryBit>` | Memory bit symbol |

## Hardware IDs

| Model | HardwareId |
|-------|------------|
| TM221CE16T | 1929 |
| TM221CE16R | 1928 |
| TM221CE24T | 1933 |
| TM221CE24R | 1932 |
| TM221CE40T | 1937 |
| TM221CE40R | 1936 |

## Expansion Module Configuration

| Module | Reference | Addresses |
|--------|-----------|-----------|
| TM3AI4/G | Analog 4-ch | %IW1.0 - %IW1.3 |
| TM3AI8/G | Analog 8-ch | %IW1.0 - %IW1.7 |
| TM3TI4/G | RTD 4-ch | %IW1.0 - %IW1.3 |
| TM3DI32K | Digital In 32-ch | %I1.0 - %I1.31 |
| TM3DQ32TK | Digital Out 32-ch | %Q1.0 - %Q1.31 |

## Troubleshooting

### File Won't Open
- Check XML syntax (use XML validator)
- Verify HardwareId matches controller model
- Ensure all tags are properly closed

### Compilation Errors
- Check variable declarations in Symbols section
- Verify I/O addresses match hardware
- Ensure timer format uses `<TimerTM>` with `<Base>`

### Connection Errors in Ladder
- Fill empty columns with `<Line>` elements
- Timer/Comparison elements span 2 columns
- Coil must be at Column 10

## Resources

- [Machine Expert Basic Download](https://www.se.com/us/en/download/document/Machine_Expert_Basic_V1_2_SP1/)
- [Machine Expert Basic Operating Guide (PDF)](https://cdn.i-pulse.nl/isotron/production/products/2616/EcoStruxure%20Machine%20Expert%20-%20Basic,%20Operating%20Guide.pdf)
- [Schneider Electric Community](https://community.se.com/t5/c-krefy84679/EcoStruxure%E2%84%A2-Machine-Expert-Basic/pd-p/ecostruxure-machine-expert---basic)
- [M221 FAQ](https://www.se.com/us/en/faqs/FA404219/)

---

*PLCAutoPilot - AI-Powered PLC Programming*
