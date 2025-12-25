# Schneider M340 PLC Programming Skill

## Expert Agent for Modicon M340 Process Controllers with Django and Claude API

---

## Metadata

```yaml
name: schneider-m340
description: Expert agent for Schneider Electric Modicon M340 Process Automation using Django and Claude API
version: 1.0
platform: Windows
target_controllers: BMXP341000, BMXP342000, BMXP342010, BMXP342020, BMXP3420302
file_formats: .stu, .xef (Unity Pro/Control Expert)
programming_languages: Ladder (LD), IL, ST, SFC, FBD
specialty: Process automation, distributed I/O, hot standby
standards: IEC 61131-3, IEC 61508, ISA-88
framework: Django
ai_engine: Claude API (claude-3-haiku-20240307)
```

---

## Activation Keywords

Activate this skill when user mentions:
- M340, Modicon M340
- BMXP341000, BMXP342000, BMXP342010
- Unity Pro, Control Expert
- Process automation PLC
- Distributed I/O Schneider
- Hot standby M340
- Modbus Plus
- Ethernet I/O Schneider

---

## M340 Overview

The Modicon M340 is a **mid-range process automation controller**:

| Feature | M241/M251 | M340 |
|---------|-----------|------|
| I/O Capacity | 264 | 1,024 |
| Distributed I/O | Limited | Extensive |
| Hot Standby | No | Yes |
| Backplane | Fixed | Modular rack |
| Programming | Machine Expert | Control Expert |
| Memory | 4MB | 16MB |

### Key Capabilities
- Modular rack-based architecture
- Up to 4 racks (local + remote)
- Hot standby redundancy
- Modbus TCP/IP, Modbus Plus
- EtherNet/IP, Profibus DP
- Quantum I/O compatibility

---

## Django Project Structure

```
plcautopilot/
├── m340_generator/
│   ├── __init__.py
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── claude_service.py
│   │   ├── unity_generator.py
│   │   ├── rack_builder.py
│   │   ├── redundancy_config.py
│   │   └── process_logic.py
│   └── templates/
└── requirements.txt
```

---

## Django Models

```python
# m340_generator/models.py
from django.db import models
import uuid

class M340Project(models.Model):
    """Django model for Modicon M340 projects"""

    CPU_CHOICES = [
        ('BMXP341000', 'BMXP341000 - Entry Level'),
        ('BMXP342000', 'BMXP342000 - Standard'),
        ('BMXP342010', 'BMXP342010 - Standard + Ethernet'),
        ('BMXP342020', 'BMXP342020 - Performance'),
        ('BMXP3420302', 'BMXP3420302 - Hot Standby Ready'),
    ]

    REDUNDANCY_MODES = [
        ('NONE', 'No Redundancy'),
        ('HOT_STANDBY', 'Hot Standby'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    cpu = models.CharField(max_length=20, choices=CPU_CHOICES, default='BMXP342020')
    description = models.TextField(blank=True)
    user_specification = models.TextField()

    # Rack Configuration
    local_rack_slots = models.PositiveIntegerField(default=8)
    remote_racks = models.PositiveIntegerField(default=0)

    # Redundancy
    redundancy_mode = models.CharField(max_length=20, choices=REDUNDANCY_MODES, default='NONE')

    # Network Configuration
    eth1_ip = models.GenericIPAddressField(default='192.168.1.10')
    modbus_plus_enabled = models.BooleanField(default=False)
    profibus_enabled = models.BooleanField(default=False)

    generated_file = models.BinaryField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'M340 Project'


class M340Rack(models.Model):
    """Rack configuration for M340 project"""

    RACK_TYPES = [
        ('LOCAL', 'Local Rack'),
        ('REMOTE_ETH', 'Remote Ethernet I/O'),
        ('REMOTE_MODBUS', 'Remote Modbus I/O'),
    ]

    project = models.ForeignKey(M340Project, on_delete=models.CASCADE, related_name='racks')
    rack_number = models.PositiveIntegerField()
    rack_type = models.CharField(max_length=20, choices=RACK_TYPES, default='LOCAL')
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    slot_count = models.PositiveIntegerField(default=8)


class M340Module(models.Model):
    """I/O Module in M340 rack"""

    MODULE_TYPES = [
        # Power Supply
        ('BMXCPS2000', 'Power Supply 20W'),
        ('BMXCPS3500', 'Power Supply 36W'),
        # Digital Input
        ('BMXDDI1602', 'DI 16 x 24VDC'),
        ('BMXDDI3202K', 'DI 32 x 24VDC'),
        # Digital Output
        ('BMXDDO1602', 'DO 16 x 24VDC Transistor'),
        ('BMXDDO3202K', 'DO 32 x 24VDC'),
        ('BMXDRA0805', 'DO 8 x Relay'),
        # Analog Input
        ('BMXAMI0410', 'AI 4 x Isolated'),
        ('BMXAMI0810', 'AI 8 x High Level'),
        ('BMXART0414', 'AI 4 x RTD/TC'),
        # Analog Output
        ('BMXAMO0210', 'AO 2 x Isolated'),
        ('BMXAMO0410', 'AO 4 x High Level'),
        # Communication
        ('BMXNOE0100', 'Ethernet 1 Port'),
        ('BMXNOE0110', 'Ethernet 2 Port'),
        ('BMXNOM0200', 'Modbus Plus'),
        ('BMXNRP0200', 'Profibus DP'),
        # Counter
        ('BMXEHC0200', 'High Speed Counter 2ch'),
    ]

    rack = models.ForeignKey(M340Rack, on_delete=models.CASCADE, related_name='modules')
    slot = models.PositiveIntegerField()
    module_type = models.CharField(max_length=20, choices=MODULE_TYPES)
    description = models.CharField(max_length=100, blank=True)


class M340DFB(models.Model):
    """Derived Function Block for M340"""

    project = models.ForeignKey(M340Project, on_delete=models.CASCADE, related_name='dfbs')
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    language = models.CharField(max_length=10, default='ST')
    source_code = models.TextField()
    inputs = models.JSONField(default=list)
    outputs = models.JSONField(default=list)
    internal_vars = models.JSONField(default=list)
```

---

## Claude API Service for M340

```python
# m340_generator/services/claude_service.py
import anthropic
import os
import json
from typing import Dict, Any, List

class ClaudeM340Service:
    """
    Claude API service for Modicon M340 Process Automation.
    Specialized for process control and distributed I/O.
    """

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get('ANTHROPIC_API_KEY')
        )
        self.model = os.environ.get('CLAUDE_MODEL', 'claude-3-haiku-20240307')

    def generate_process_program(
        self,
        specification: str,
        cpu: str,
        redundancy: str = 'NONE'
    ) -> Dict[str, Any]:
        """Generate M340 process control program."""

        system_prompt = self._get_m340_system_prompt(cpu, redundancy)

        message = self.client.messages.create(
            model=self.model,
            max_tokens=8192,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate process control program for Modicon M340:

{specification}

CPU: {cpu}
Redundancy: {redundancy}

Include in JSON response:
1. "rack_configuration": Rack and module layout
2. "programs": Program sections (MAST, FAST, AUX)
3. "dfbs": Derived Function Blocks
4. "io_mapping": Complete I/O symbol table
5. "network_config": Ethernet, Modbus, Profibus
6. "redundancy_config": Hot standby configuration if applicable
7. "alarm_config": Process alarms and events
8. "scaling_config": Analog scaling parameters"""
                }
            ]
        )

        response_text = message.content[0].text

        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            else:
                json_str = response_text
            return json.loads(json_str)
        except:
            return {"error": "Parse failed", "programs": []}

    def generate_dfb(
        self,
        name: str,
        description: str,
        inputs: List[Dict],
        outputs: List[Dict],
        logic_description: str
    ) -> Dict[str, Any]:
        """Generate Derived Function Block using Claude."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate Derived Function Block for M340:

Name: {name}
Description: {description}

Inputs:
{json.dumps(inputs, indent=2)}

Outputs:
{json.dumps(outputs, indent=2)}

Logic Description:
{logic_description}

Generate complete DFB in Structured Text with:
1. VAR_INPUT section
2. VAR_OUTPUT section
3. VAR section (internal)
4. Implementation code
5. Comments explaining logic

Return JSON with 'source_code' and 'internal_vars'."""
                }
            ]
        )

        try:
            response_text = message.content[0].text
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            else:
                json_str = response_text
            return json.loads(json_str)
        except:
            return {"source_code": "", "internal_vars": []}

    def generate_pid_control(
        self,
        loop_name: str,
        pv_address: str,
        cv_address: str,
        sp_source: str,
        tuning: Dict = None
    ) -> str:
        """Generate PID control loop in ST."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate PID control loop for M340:

Loop Name: {loop_name}
Process Variable: {pv_address}
Control Output: {cv_address}
Setpoint Source: {sp_source}
Tuning: {json.dumps(tuning or {'Kp': 1.0, 'Ti': 10.0, 'Td': 0.0})}

Generate Structured Text using PIDFF function block with:
- Auto/Manual switching
- Setpoint tracking
- Output limiting
- Anti-windup
- Alarm handling (high/low)

Return valid ST code."""
                }
            ]
        )

        return message.content[0].text

    def _get_m340_system_prompt(self, cpu: str, redundancy: str) -> str:
        """System prompt for M340 process programming."""

        return f"""You are an expert process automation programmer for Schneider Electric Modicon M340.

TARGET CPU: {cpu}
REDUNDANCY: {redundancy}

M340 ARCHITECTURE:
- Modular rack-based system (up to 4 racks)
- Local rack: CPU + up to 12 I/O modules
- Remote racks via Ethernet I/O or Modbus
- Hot standby redundancy option

PROGRAMMING ENVIRONMENT:
- Control Expert (formerly Unity Pro)
- Project file format: .stu (project), .xef (export)

TASK STRUCTURE:
- MAST: Main cyclic task (default 100ms)
- FAST: Fast task (10-100ms)
- AUX0-AUX3: Auxiliary tasks
- Events: Interrupt-driven

I/O ADDRESSING:
- Local: %I0.x.y.z (rack.module.channel.bit)
- Drop: %I[drop].x.y.z
- Topological: %I\b\m.c.p

PROCESS FUNCTION BLOCKS:
- PIDFF: PID with feedforward
- INTEGRATOR: Integration
- DERIVATE: Differentiation
- SCALING: Linear scaling
- TOTALIZER: Flow totalization
- RAMP: Ramp generator

DATA TYPES:
- Elementary: BOOL, INT, DINT, REAL, TIME, STRING
- Derived: ARRAY, STRUCT
- DDT: Derived Data Types

REDUNDANCY (Hot Standby):
- Primary/Standby CPU switching
- State synchronization
- Bumpless transfer
- Failover time < 100ms

OUTPUT: Valid JSON with Control Expert compatible structure."""
```

---

## Unity/Control Expert Generator

```python
# m340_generator/services/unity_generator.py
from typing import Dict, List
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom
import zipfile
import io

class M340UnityGenerator:
    """Generate Unity Pro / Control Expert compatible project files."""

    def __init__(self, project):
        self.project = project

    def generate_xef(self, logic_data: Dict[str, Any]) -> bytes:
        """Generate .xef export file (XML format)."""

        root = Element('XEFProject')
        root.set('version', '13.1')
        root.set('controller', self.project.cpu)

        # Project info
        info = SubElement(root, 'ProjectInfo')
        SubElement(info, 'Name').text = self.project.name
        SubElement(info, 'Description').text = self.project.description

        # Hardware configuration
        hardware = SubElement(root, 'Hardware')
        self._build_rack_config(hardware, logic_data.get('rack_configuration', {}))

        # Variables
        variables = SubElement(root, 'Variables')
        self._build_variables(variables, logic_data.get('io_mapping', {}))

        # Programs
        programs = SubElement(root, 'Programs')
        for prog in logic_data.get('programs', []):
            self._build_program(programs, prog)

        # DFBs
        dfbs = SubElement(root, 'DFBs')
        for dfb in logic_data.get('dfbs', []):
            self._build_dfb(dfbs, dfb)

        # Tasks
        tasks = SubElement(root, 'Tasks')
        self._build_tasks(tasks, logic_data.get('programs', []))

        # Network
        network = SubElement(root, 'Network')
        self._build_network(network, logic_data.get('network_config', {}))

        # Redundancy
        if self.project.redundancy_mode == 'HOT_STANDBY':
            redundancy = SubElement(root, 'Redundancy')
            self._build_redundancy(redundancy, logic_data.get('redundancy_config', {}))

        return self._prettify(root).encode('utf-8')

    def _build_rack_config(self, parent: Element, config: Dict) -> None:
        """Build rack and module configuration."""

        for rack in config.get('racks', []):
            rack_elem = SubElement(parent, 'Rack')
            SubElement(rack_elem, 'Number').text = str(rack.get('number', 0))
            SubElement(rack_elem, 'Type').text = rack.get('type', 'LOCAL')

            if rack.get('ip_address'):
                SubElement(rack_elem, 'IPAddress').text = rack['ip_address']

            modules = SubElement(rack_elem, 'Modules')
            for module in rack.get('modules', []):
                mod = SubElement(modules, 'Module')
                SubElement(mod, 'Slot').text = str(module.get('slot'))
                SubElement(mod, 'Type').text = module.get('type')
                SubElement(mod, 'Description').text = module.get('description', '')

    def _build_variables(self, parent: Element, io_mapping: Dict) -> None:
        """Build variable declarations."""

        # Inputs
        for addr, info in io_mapping.get('inputs', {}).items():
            var = SubElement(parent, 'Variable')
            SubElement(var, 'Name').text = info if isinstance(info, str) else info.get('name')
            SubElement(var, 'Address').text = addr
            SubElement(var, 'Type').text = 'BOOL'
            SubElement(var, 'Scope').text = 'GLOBAL'

        # Outputs
        for addr, info in io_mapping.get('outputs', {}).items():
            var = SubElement(parent, 'Variable')
            SubElement(var, 'Name').text = info if isinstance(info, str) else info.get('name')
            SubElement(var, 'Address').text = addr
            SubElement(var, 'Type').text = 'BOOL'
            SubElement(var, 'Scope').text = 'GLOBAL'

        # Analog
        for addr, info in io_mapping.get('analog_inputs', {}).items():
            var = SubElement(parent, 'Variable')
            name = info if isinstance(info, str) else info.get('name')
            SubElement(var, 'Name').text = name
            SubElement(var, 'Address').text = addr
            SubElement(var, 'Type').text = 'INT'
            SubElement(var, 'Scope').text = 'GLOBAL'

    def _build_program(self, parent: Element, prog: Dict) -> None:
        """Build program section."""

        program = SubElement(parent, 'Program')
        SubElement(program, 'Name').text = prog.get('name', 'Main')
        SubElement(program, 'Language').text = prog.get('language', 'ST')

        body = SubElement(program, 'Body')
        if prog.get('language') == 'ST':
            SubElement(body, 'ST').text = prog.get('source', '')
        elif prog.get('language') == 'LD':
            ld = SubElement(body, 'LD')
            for rung in prog.get('rungs', []):
                rung_elem = SubElement(ld, 'Rung')
                SubElement(rung_elem, 'Name').text = rung.get('name', '')
                SubElement(rung_elem, 'Content').text = rung.get('content', '')

    def _build_dfb(self, parent: Element, dfb: Dict) -> None:
        """Build Derived Function Block."""

        dfb_elem = SubElement(parent, 'DFB')
        SubElement(dfb_elem, 'Name').text = dfb.get('name')
        SubElement(dfb_elem, 'Description').text = dfb.get('description', '')

        inputs = SubElement(dfb_elem, 'Inputs')
        for inp in dfb.get('inputs', []):
            var = SubElement(inputs, 'Variable')
            SubElement(var, 'Name').text = inp.get('name')
            SubElement(var, 'Type').text = inp.get('type', 'BOOL')

        outputs = SubElement(dfb_elem, 'Outputs')
        for out in dfb.get('outputs', []):
            var = SubElement(outputs, 'Variable')
            SubElement(var, 'Name').text = out.get('name')
            SubElement(var, 'Type').text = out.get('type', 'BOOL')

        body = SubElement(dfb_elem, 'Body')
        SubElement(body, 'ST').text = dfb.get('source_code', '')

    def _build_tasks(self, parent: Element, programs: List) -> None:
        """Build task configuration."""

        # MAST task
        mast = SubElement(parent, 'Task')
        SubElement(mast, 'Name').text = 'MAST'
        SubElement(mast, 'Type').text = 'MAST'
        SubElement(mast, 'Period').text = '100'  # 100ms
        progs = SubElement(mast, 'Programs')
        for prog in programs:
            if prog.get('task', 'MAST') == 'MAST':
                SubElement(progs, 'Program').text = prog.get('name')

    def _build_network(self, parent: Element, config: Dict) -> None:
        """Build network configuration."""

        if config.get('ethernet'):
            eth = SubElement(parent, 'Ethernet')
            SubElement(eth, 'IPAddress').text = config['ethernet'].get('ip', '192.168.1.10')
            SubElement(eth, 'SubnetMask').text = config['ethernet'].get('subnet', '255.255.255.0')

        if config.get('modbus_plus'):
            mbp = SubElement(parent, 'ModbusPlus')
            SubElement(mbp, 'NodeAddress').text = str(config['modbus_plus'].get('node', 1))

    def _build_redundancy(self, parent: Element, config: Dict) -> None:
        """Build hot standby redundancy configuration."""

        SubElement(parent, 'Mode').text = 'HOT_STANDBY'
        SubElement(parent, 'PrimaryIP').text = config.get('primary_ip', '192.168.1.10')
        SubElement(parent, 'StandbyIP').text = config.get('standby_ip', '192.168.1.11')
        SubElement(parent, 'SyncInterval').text = str(config.get('sync_interval', 10))

    def _prettify(self, elem: Element) -> str:
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

---

## Django Views

```python
# m340_generator/views.py
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
import json

from .models import M340Project
from .services.claude_service import ClaudeM340Service
from .services.unity_generator import M340UnityGenerator


class GenerateM340View(View):
    """API endpoint for generating M340 programs."""

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        project = M340Project.objects.create(
            name=data.get('name', 'M340_Project'),
            cpu=data.get('cpu', 'BMXP342020'),
            user_specification=data.get('specification', ''),
            local_rack_slots=data.get('local_slots', 8),
            remote_racks=data.get('remote_racks', 0),
            redundancy_mode=data.get('redundancy', 'NONE'),
            eth1_ip=data.get('ip_address', '192.168.1.10'),
        )

        claude_service = ClaudeM340Service()
        logic_data = claude_service.generate_process_program(
            specification=project.user_specification,
            cpu=project.cpu,
            redundancy=project.redundancy_mode
        )

        generator = M340UnityGenerator(project)
        xef_content = generator.generate_xef(logic_data)
        project.generated_file = xef_content
        project.save()

        return JsonResponse({
            'success': True,
            'project_id': str(project.id),
            'cpu': project.cpu,
            'redundancy': project.redundancy_mode,
            'download_url': f'/api/m340/download/{project.id}/'
        })


class DownloadM340View(View):
    """Download generated .xef file."""

    def get(self, request, project_id):
        project = get_object_or_404(M340Project, id=project_id)

        if not project.generated_file:
            return JsonResponse({'error': 'No generated file'}, status=404)

        response = HttpResponse(
            project.generated_file,
            content_type='application/xml'
        )
        response['Content-Disposition'] = f'attachment; filename="{project.name}.xef"'
        return response
```

---

## Usage Example

```python
import requests

response = requests.post('http://localhost:8000/api/m340/generate/', json={
    'name': 'WaterTreatment',
    'cpu': 'BMXP3420302',
    'specification': '''
        Create a water treatment plant control system:
        - 4 chemical dosing pumps with PID control
        - 2 filter backwash sequences (SFC)
        - pH and turbidity monitoring
        - Flow totalization
        - Hot standby redundancy
        - Alarm management for process limits

        Include:
        - DFB for dosing pump control
        - DFB for filter sequence
        - Analog scaling for 4-20mA signals
        - Network configuration for SCADA
    ''',
    'redundancy': 'HOT_STANDBY',
    'local_slots': 10,
    'remote_racks': 2,
})

print(response.json())
```

---

## M340 I/O Addressing Reference

```
Local Rack (Rack 0):
%I0.1.0 to %I0.1.15  - Slot 1, 16 inputs
%Q0.2.0 to %Q0.2.15  - Slot 2, 16 outputs
%IW0.3.0 to %IW0.3.7 - Slot 3, 8 analog inputs

Remote Rack (Rack 1):
%I1.1.0 to %I1.1.31  - Remote rack 1, slot 1

Topological (Network):
%I\10.0.2.0.3       - Node 10, rack 0, slot 2, channel 0, bit 3
```

---

## Version History

- **v1.0** (2025-12-25): Initial M340 skill with Django + Claude API, process focus

---

**PLCAutoPilot Schneider M340 Skill v1.0 | 2025-12-25 | github.com/chatgptnotes/plcautopilot.com**
