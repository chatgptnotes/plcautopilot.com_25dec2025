# PLCAutoPilot Skills Library
## Complete Reference for All Supported PLC Platforms

---

## Overview

This directory contains expert AI skills for programming all major PLC platforms. Each skill provides Django-based generation with Claude API integration for intelligent logic creation.

**Total Coverage**: 500+ PLC brands through platform-specific and CODESYS universal skills

**Architecture**: Django + Claude API (claude-3-haiku-20240307)

---

## Skill Index

### Schneider Electric Skills (Complete Family)

| Skill File | Controller | Version | Specialty |
|------------|------------|---------|-----------|
| `schneider-m221.md` | M221 (TM221CE24T, etc.) | 3.0 | Entry-level, single XML |
| `schneider-m241-dedicated.md` | M241 | 2.0 | Ethernet, CANopen |
| `schneider-m251.md` | M251 | 1.0 | Dual Ethernet, OPC UA, Cybersecurity |
| `schneider-m258.md` | M258 | 1.0 | Motion control, 22 axes |
| `schneider-m340.md` | M340 | 1.0 | Process automation, Hot standby |
| `schneider-m580.md` | M580 | 1.0 | Safety SIL3, ePAC, IEC 62443 |

---

### Detailed Skill Descriptions

#### 1. schneider-m221.md - M221 Controller Skill
- **Controllers**: TM221CE16T, TM221CE24T, TM221CE40T, TM221CE16R, TM221CE24R, TM221CE40R
- **Version**: 3.0
- **File Format**: .smbp (single XML file)
- **Framework**: Django + Claude API
- **Features**:
  - Ladder Diagram (LD) generation
  - Instruction List (IL) generation
  - Timer/Counter configuration
  - I/O symbol mapping
- **Activation Keywords**: M221, TM221, SoMachine Basic

#### 2. schneider-m241-dedicated.md - M241 Controller Skill
- **Controllers**: TM241CE24T, TM241CE40T, TM241CEC24T
- **Version**: 2.0
- **File Format**: .smbp (ZIP archive)
- **Framework**: Django + Claude API
- **Features**:
  - Multi-language support (LD, ST, SFC, FBD, IL)
  - Modbus TCP/IP
  - CANopen master
  - PID control
- **Activation Keywords**: M241, TM241, Modbus TCP, CANopen

#### 3. schneider-m251.md - M251 Logic Controller Skill
- **Controllers**: TM251MESE, TM251MESC
- **Version**: 1.0
- **File Format**: .smbp (ZIP archive)
- **Framework**: Django + Claude API
- **Features**:
  - Dual Ethernet ports (network segregation)
  - Built-in OPC UA server
  - IEC 62443 cybersecurity
  - Role-based access control
  - Audit trail logging
- **Activation Keywords**: M251, TM251, OPC UA, Cybersecurity

#### 4. schneider-m258.md - M258 Motion Controller Skill
- **Controllers**: TM258LD42DT, TM258LF42DT
- **Version**: 1.0
- **File Format**: .smbp (ZIP archive)
- **Framework**: Django + Claude API
- **Features**:
  - 22 synchronized servo axes
  - 1ms motion cycle time
  - Sercos III / CANmotion
  - PLCopen motion function blocks
  - Electronic cam profiles
  - G-code interpreter
- **Activation Keywords**: M258, TM258, Motion control, Sercos, PLCopen

#### 5. schneider-m340.md - M340 Process Controller Skill
- **Controllers**: BMXP341000, BMXP342000, BMXP342020, BMXP3420302
- **Version**: 1.0
- **File Format**: .xef (Control Expert/Unity Pro)
- **Framework**: Django + Claude API
- **Features**:
  - Modular rack-based architecture
  - Hot standby redundancy
  - Process function blocks (PID, Totalizer)
  - Derived Function Blocks (DFB)
  - Distributed I/O
- **Activation Keywords**: M340, Modicon M340, Unity Pro, Control Expert

#### 6. schneider-m580.md - M580 Safety ePAC Skill
- **Controllers**: BMEP582040, BMEP584040, BMEH582040S, BMEH584040S
- **Version**: 1.0
- **File Format**: .xef (Control Expert)
- **Framework**: Django + Claude API
- **Features**:
  - SIL3 safety certification (BMEH series)
  - IEC 62443 SL2 cybersecurity
  - Native Ethernet backbone
  - HSBY+ redundancy
  - Up to 12,288 I/O points
  - Safety function blocks
- **Activation Keywords**: M580, ePAC, Safety PLC, SIL3

---

### Other Platform Skills

| Skill File | Platform | Version |
|------------|----------|---------|
| `siemens-s7.md` | Siemens S7-1200/1500 | 1.0 |
| `rockwell-allen-bradley.md` | Rockwell ControlLogix | 1.0 |
| `schneider.md` | Legacy M221 (deprecated) | 2.0 |
| `m221-knowledge-base.md` | M221 Reference | 1.0 |
| `M221-AGENT-ACTIVATION.md` | M221 Automation Rules | 1.0 |
| `plc-file-handler.md` | Universal File Handler | 1.2 |

---

## Platform Comparison

### Schneider Controller Hierarchy

```
Entry Level          Mid-Range           High-End            Safety
     |                   |                  |                  |
   M221               M241               M340               M580
     |                M251               M580            BMEH series
     |                M258                                    |
     |                   |                  |                  |
  SoMachine        Machine Expert      Control Expert    Control Expert
   Basic              Basic                                  Safety
```

### Feature Comparison

| Feature | M221 | M241 | M251 | M258 | M340 | M580 |
|---------|------|------|------|------|------|------|
| Max I/O | 40 | 264 | 264 | 264 | 1024 | 12288 |
| Languages | LD, IL | All 5 | All 5 | All 5 | All 5 | All 5 |
| Ethernet | Basic | Yes | Dual | Yes | Yes | Backbone |
| Modbus TCP | Slave | Master | Master | Master | Master | Master |
| CANopen | Slave | Master | Master | Master | - | - |
| Motion | - | 8 axes | - | 22 axes | - | - |
| OPC UA | - | - | Built-in | - | Optional | Optional |
| Safety | - | - | - | - | - | SIL3 |
| Cybersecurity | - | - | IEC 62443 | - | - | IEC 62443 |
| Hot Standby | - | - | - | - | Yes | Yes |

---

## Django + Claude API Architecture

All skills use the same architecture pattern:

```
User Request
     |
     v
Django View (views.py)
     |
     v
Claude API Service (claude_service.py)
     |
     v
Logic Generation (AI-powered)
     |
     v
File Generator (smbp_generator.py / unity_generator.py)
     |
     v
.smbp / .xef File Output
```

### Common Django Models Structure

```python
# All skills follow this pattern
class PLCProject(models.Model):
    id = models.UUIDField(primary_key=True)
    name = models.CharField(max_length=100)
    controller = models.CharField(max_length=20)
    user_specification = models.TextField()
    generated_file = models.BinaryField()
    created_at = models.DateTimeField(auto_now_add=True)
```

### Claude API Integration

All skills use claude-3-haiku-20240307 for fast logic generation:

```python
# Environment variable
CLAUDE_MODEL=claude-3-haiku-20240307

# API call pattern
response = self.client.messages.create(
    model=self.model,
    max_tokens=8192,
    system=system_prompt,
    messages=[{"role": "user", "content": specification}]
)
```

---

## Usage Examples

### Generate M221 Motor Start/Stop

```python
import requests

response = requests.post('http://localhost:8000/api/m221/generate/', json={
    'name': 'Motor_Control',
    'controller': 'TM221CE24T',
    'specification': 'Motor start/stop with seal-in circuit'
})
```

### Generate M580 Safety Program

```python
response = requests.post('http://localhost:8000/api/m580/generate/', json={
    'name': 'Press_Safety',
    'cpu': 'BMEH582040S',
    'specification': 'E-Stop and light curtain for press',
    'security_level': 'SL2'
})
```

---

## Activation Rules

| User Mentions | Activate Skill |
|---------------|----------------|
| M221, TM221, SoMachine Basic | schneider-m221.md |
| M241, TM241, Modbus TCP | schneider-m241-dedicated.md |
| M251, OPC UA, Dual Ethernet | schneider-m251.md |
| M258, Motion, Sercos | schneider-m258.md |
| M340, Modicon M340, Unity | schneider-m340.md |
| M580, ePAC, Safety, SIL3 | schneider-m580.md |
| S7-1200, S7-1500, TIA Portal | siemens-s7.md |
| ControlLogix, CompactLogix | rockwell-allen-bradley.md |

---

## Version History

- **v2.0** (2025-12-25): Complete Schneider family with Django + Claude API
  - Added M221, M241, M251, M258, M340, M580 dedicated skills
  - Django framework integration
  - Claude API for logic generation
- **v1.1** (2025-12-24): Added Siemens, Rockwell skills
- **v1.0** (2025-12-24): Initial M221 skill

---

**PLCAutoPilot Skills Library v2.0 | 2025-12-25 | github.com/chatgptnotes/plcautopilot.com**
