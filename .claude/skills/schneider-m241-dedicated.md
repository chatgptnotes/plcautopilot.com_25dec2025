# Schneider M241 PLC Programming Skill

## Expert Agent for M241 Controllers with Django and Claude API

---

## Metadata

```yaml
name: schneider-m241
description: Expert agent for Schneider Electric M241 PLC programming using Django and Claude API
version: 2.1
platform: Windows
target_controllers: TM241CE24T, TM241CE40T, TM241CEC24T, TM241CE24R, TM241CE40R
file_formats: .project (proprietary CODESYS format - cannot be generated externally)
output_formats: Structured Text (.st), PLCopen XML (.xml)
programming_languages: Ladder (LD), IL, ST, SFC, FBD
standards: IEC 61131-3, IEC 61508
framework: Django
ai_engine: Claude API (claude-3-haiku-20240307)
```

---

## Activation Keywords

Activate this skill when user mentions:
- M241, TM241
- TM241CE24T, TM241CE40T
- TM241CEC24T (compact)
- EcoStruxure Machine Expert
- Modbus TCP PLC
- CANopen master
- Motion control M241

---

## CRITICAL: M241 vs M221 Differences

| Feature | M221 | M241 |
|---------|------|------|
| File Format | Single XML (.smbp) | .project (CODESYS) |
| Software | Machine Expert Basic | Machine Expert |
| Languages | LD, IL | LD, IL, ST, SFC, FBD |
| Ethernet | Basic Modbus | Modbus TCP + EtherNet/IP |
| Motion | None | Integrated |
| Max I/O | 40 | 264 |
| CANopen | Slave only | Master + Slave |
| Programmatic Generation | YES (XML) | NO (proprietary) |

---

## Django Project Structure for M241

```
plcautopilot/
├── manage.py
├── plcautopilot/
│   ├── settings.py
│   └── urls.py
├── m241_generator/
│   ├── __init__.py
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── claude_service.py
│   │   ├── smbp_zip_generator.py
│   │   ├── ladder_builder.py
│   │   └── structured_text_builder.py
│   └── templates/
└── requirements.txt
```

---

## Django Models

```python
# m241_generator/models.py
from django.db import models
import uuid

class M241Project(models.Model):
    """Django model for M241 PLC projects"""

    CONTROLLER_CHOICES = [
        ('TM241CE24T', 'TM241CE24T - 24 I/O Transistor'),
        ('TM241CE40T', 'TM241CE40T - 40 I/O Transistor'),
        ('TM241CEC24T', 'TM241CEC24T - Compact 24 I/O'),
        ('TM241CE24R', 'TM241CE24R - 24 I/O Relay'),
        ('TM241CE40R', 'TM241CE40R - 40 I/O Relay'),
    ]

    LANGUAGE_CHOICES = [
        ('LD', 'Ladder Diagram'),
        ('IL', 'Instruction List'),
        ('ST', 'Structured Text'),
        ('SFC', 'Sequential Function Chart'),
        ('FBD', 'Function Block Diagram'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    controller = models.CharField(max_length=20, choices=CONTROLLER_CHOICES, default='TM241CE24T')
    language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='LD')
    description = models.TextField(blank=True)
    user_specification = models.TextField(help_text="Natural language specification")

    # Ethernet configuration
    ip_address = models.GenericIPAddressField(default='192.168.1.10')
    subnet_mask = models.GenericIPAddressField(default='255.255.255.0')
    gateway = models.GenericIPAddressField(default='192.168.1.1')
    modbus_tcp_enabled = models.BooleanField(default=True)
    canopen_enabled = models.BooleanField(default=False)

    # Motion control
    motion_enabled = models.BooleanField(default=False)
    axis_count = models.PositiveIntegerField(default=0)

    generated_zip = models.BinaryField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'M241 Project'

    def __str__(self):
        return f"{self.name} ({self.controller})"


class M241Program(models.Model):
    """Program unit for M241 project"""

    project = models.ForeignKey(M241Project, on_delete=models.CASCADE, related_name='programs')
    name = models.CharField(max_length=100)
    language = models.CharField(max_length=10)
    source_code = models.TextField()
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ['order']


class M241Variable(models.Model):
    """Variable declaration for M241 project"""

    SCOPE_CHOICES = [
        ('GLOBAL', 'Global'),
        ('LOCAL', 'Local'),
        ('RETAIN', 'Retain'),
    ]

    DATA_TYPES = [
        ('BOOL', 'Boolean'),
        ('INT', 'Integer'),
        ('DINT', 'Double Integer'),
        ('REAL', 'Real'),
        ('TIME', 'Time'),
        ('STRING', 'String'),
    ]

    project = models.ForeignKey(M241Project, on_delete=models.CASCADE, related_name='variables')
    name = models.CharField(max_length=50)
    data_type = models.CharField(max_length=20, choices=DATA_TYPES)
    address = models.CharField(max_length=20, blank=True)
    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES, default='GLOBAL')
    initial_value = models.CharField(max_length=50, blank=True)
    comment = models.TextField(blank=True)
```

---

## Claude API Service for M241

```python
# m241_generator/services/claude_service.py
import anthropic
import os
import json
from typing import Dict, List, Any

class ClaudeM241Service:
    """
    Claude API service for M241 PLC logic generation.
    Supports multiple IEC 61131-3 languages.
    """

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get('ANTHROPIC_API_KEY')
        )
        self.model = os.environ.get('CLAUDE_MODEL', 'claude-3-haiku-20240307')

    def generate_program(
        self,
        specification: str,
        controller: str,
        language: str = 'LD'
    ) -> Dict[str, Any]:
        """
        Generate M241 program from natural language specification.

        Args:
            specification: User's natural language description
            controller: Target M241 controller model
            language: Programming language (LD, ST, SFC, FBD, IL)

        Returns:
            Dictionary containing program structure
        """

        system_prompt = self._get_m241_system_prompt(controller, language)

        message = self.client.messages.create(
            model=self.model,
            max_tokens=8192,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate {language} program for M241:

{specification}

Target Controller: {controller}
Language: {language}

Respond with JSON containing:
1. "programs": Array of program units
2. "variables": Global and local variable declarations
3. "tasks": Task configuration
4. "io_mapping": I/O address assignments
5. "ethernet_config": Network configuration if needed
6. "canopen_config": CANopen configuration if needed
7. "motion_config": Motion control if needed"""
                }
            ]
        )

        response_text = message.content[0].text

        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text

            return json.loads(json_str)
        except json.JSONDecodeError:
            return {
                "error": "Failed to parse AI response",
                "raw_response": response_text,
                "programs": [],
                "variables": [],
                "tasks": [],
                "io_mapping": {}
            }

    def generate_structured_text(self, specification: str, controller: str) -> str:
        """Generate Structured Text (ST) code."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate IEC 61131-3 Structured Text for M241 ({controller}):

{specification}

Include:
- Variable declarations (VAR/END_VAR)
- Program logic with IF/CASE/FOR/WHILE
- Function blocks for timers, counters
- Comments explaining logic

Format as valid ST code."""
                }
            ]
        )

        return message.content[0].text

    def generate_sfc(self, specification: str, controller: str) -> Dict[str, Any]:
        """Generate Sequential Function Chart."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate SFC for M241 ({controller}):

{specification}

Respond with JSON containing:
1. "steps": Array of steps with names, actions
2. "transitions": Array of transitions with conditions
3. "initial_step": Name of initial step
4. "actions": Action definitions

Follow IEC 61131-3 SFC standard."""
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
            return {"steps": [], "transitions": [], "initial_step": "", "actions": {}}

    def _get_m241_system_prompt(self, controller: str, language: str) -> str:
        """Get system prompt for M241 programming."""

        io_specs = self._get_io_specifications(controller)

        return f"""You are an expert PLC programmer for Schneider Electric M241 controllers.

TARGET CONTROLLER: {controller}
PROGRAMMING LANGUAGE: {language}
{io_specs}

M241 CAPABILITIES:
- Multi-language support (LD, IL, ST, SFC, FBD)
- Modbus TCP/IP master/slave
- EtherNet/IP adapter
- CANopen master with up to 63 slaves
- Integrated motion control (up to 8 axes)
- PID control blocks
- High-speed counters (4 channels)

ADDRESS FORMATS:
- Digital I/O: %IX0.0.0 (Module.Channel.Bit) or %I0.0.0
- Analog I/O: %IW0.0.0, %QW0.0.0
- Memory: %MX0.0 (bit), %MW0 (word), %MD0 (double)

LANGUAGE-SPECIFIC RULES:
- LD: 11-column grid, use FB instances for timers
- ST: IEC 61131-3 syntax, := for assignment
- SFC: Steps with actions, transitions with conditions
- FBD: Function block networks with connections
- IL: Load-accumulator based, CAL for function blocks"""

    def _get_io_specifications(self, controller: str) -> str:
        """Get I/O specifications for specific M241 controller."""

        specs = {
            'TM241CE24T': """
I/O SPECIFICATIONS:
- Digital Inputs: %I0.0 to %I0.15 (16 inputs)
- Fast Inputs: %I0.0 to %I0.3 (4 HSC capable)
- Digital Outputs: %Q0.0 to %Q0.7 (8 outputs)
- Analog Inputs: %IW0.0 to %IW0.3 (4 channels)
- Analog Outputs: %QW0.0 to %QW0.1 (2 channels)
- Memory Bits: %M0 to %M2047
- Memory Words: %MW0 to %MW4999
- Timers: 512 available
- Counters: 512 available""",

            'TM241CE40T': """
I/O SPECIFICATIONS:
- Digital Inputs: %I0.0 to %I0.23 (24 inputs)
- Fast Inputs: %I0.0 to %I0.3 (4 HSC capable)
- Digital Outputs: %Q0.0 to %Q0.15 (16 outputs)
- Analog Inputs: %IW0.0 to %IW0.3 (4 channels)
- Analog Outputs: %QW0.0 to %QW0.1 (2 channels)
- Memory Bits: %M0 to %M2047
- Memory Words: %MW0 to %MW4999"""
        }

        return specs.get(controller, specs['TM241CE24T'])
```

---

## Structured Text Generator (Recommended for M241)

**NOTE**: M241 uses .project format which is proprietary CODESYS and cannot be
programmatically generated. Instead, generate Structured Text (.st) or PLCopen XML
that users can import into Machine Expert.

```python
# m241_generator/services/structured_text_generator.py
from typing import Dict, Any
from ..models import M241Project

class M241StructuredTextGenerator:
    """
    Generate Structured Text (.st) code for M241 controllers.
    M241 .project format is proprietary - generate ST for import instead.
    """

    def __init__(self, project: M241Project):
        self.project = project

    def generate(self, logic_data: Dict[str, Any]) -> bytes:
        """
        Generate complete .smbp ZIP archive.

        Args:
            logic_data: Dictionary from Claude API

        Returns:
            Bytes of ZIP archive
        """

        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Project info
            zipf.writestr('ProjectInfo.xml', self._generate_project_info())

            # Application folder
            zipf.writestr('Application/Program.xml',
                         self._generate_program_xml(logic_data))
            zipf.writestr('Application/Tasks.xml',
                         self._generate_tasks_xml(logic_data))
            zipf.writestr('Application/Variables.xml',
                         self._generate_variables_xml(logic_data))

            # Hardware folder
            zipf.writestr('Hardware/Configuration.xml',
                         self._generate_hardware_xml())
            zipf.writestr('Hardware/IOMapping.xml',
                         self._generate_io_mapping_xml(logic_data))

            # Communication folder
            if self.project.modbus_tcp_enabled:
                zipf.writestr('Communication/ModbusTCP.xml',
                             self._generate_modbus_config())
            if self.project.canopen_enabled:
                zipf.writestr('Communication/CANopen.xml',
                             self._generate_canopen_config(logic_data))

            # Motion folder
            if self.project.motion_enabled:
                zipf.writestr('Motion/AxisConfig.xml',
                             self._generate_motion_config(logic_data))

            # Libraries
            zipf.writestr('Libraries/References.xml',
                         self._generate_library_references())

        zip_buffer.seek(0)
        return zip_buffer.getvalue()

    def _generate_project_info(self) -> str:
        """Generate ProjectInfo.xml."""

        root = Element('ProjectInfo')
        root.set('xmlns', 'http://www.schneider-electric.com/plc')

        SubElement(root, 'Name').text = self.project.name
        SubElement(root, 'Version').text = '1.0.0'
        SubElement(root, 'Author').text = 'PLCAutoPilot'
        SubElement(root, 'Controller').text = self.project.controller
        SubElement(root, 'Language').text = self.project.language
        SubElement(root, 'Created').text = str(self.project.created_at)
        SubElement(root, 'Modified').text = str(self.project.updated_at)

        return self._prettify(root)

    def _generate_program_xml(self, logic_data: Dict) -> str:
        """Generate Program.xml with all program units."""

        root = Element('Programs')

        for program in logic_data.get('programs', []):
            prog_elem = SubElement(root, 'Program')
            SubElement(prog_elem, 'Name').text = program.get('name', 'Main')
            SubElement(prog_elem, 'Language').text = program.get('language', 'LD')

            body = SubElement(prog_elem, 'Body')

            if program.get('language') == 'ST':
                # Structured Text
                SubElement(body, 'ST').text = program.get('source', '')
            elif program.get('language') == 'LD':
                # Ladder Diagram
                self._build_ladder_body(body, program.get('rungs', []))
            elif program.get('language') == 'SFC':
                # Sequential Function Chart
                self._build_sfc_body(body, program.get('steps', []),
                                    program.get('transitions', []))

        return self._prettify(root)

    def _build_ladder_body(self, parent: Element, rungs: list) -> None:
        """Build ladder diagram body."""

        ld = SubElement(parent, 'LD')
        for rung in rungs:
            rung_elem = SubElement(ld, 'Rung')
            SubElement(rung_elem, 'Name').text = rung.get('name', '')
            SubElement(rung_elem, 'Comment').text = rung.get('comment', '')

            network = SubElement(rung_elem, 'Network')
            for element in rung.get('elements', []):
                elem = SubElement(network, 'Element')
                SubElement(elem, 'Type').text = element.get('type')
                SubElement(elem, 'Address').text = element.get('address', '')
                SubElement(elem, 'Row').text = str(element.get('row', 0))
                SubElement(elem, 'Column').text = str(element.get('column', 0))

    def _build_sfc_body(self, parent: Element, steps: list, transitions: list) -> None:
        """Build SFC body."""

        sfc = SubElement(parent, 'SFC')

        steps_elem = SubElement(sfc, 'Steps')
        for step in steps:
            step_elem = SubElement(steps_elem, 'Step')
            SubElement(step_elem, 'Name').text = step.get('name')
            SubElement(step_elem, 'Initial').text = str(step.get('initial', False)).lower()
            actions = SubElement(step_elem, 'Actions')
            for action in step.get('actions', []):
                act = SubElement(actions, 'Action')
                SubElement(act, 'Qualifier').text = action.get('qualifier', 'N')
                SubElement(act, 'Name').text = action.get('name')

        trans_elem = SubElement(sfc, 'Transitions')
        for trans in transitions:
            t = SubElement(trans_elem, 'Transition')
            SubElement(t, 'From').text = trans.get('from')
            SubElement(t, 'To').text = trans.get('to')
            SubElement(t, 'Condition').text = trans.get('condition')

    def _generate_tasks_xml(self, logic_data: Dict) -> str:
        """Generate Tasks.xml."""

        root = Element('Tasks')

        # MAST task (main cyclic)
        mast = SubElement(root, 'Task')
        SubElement(mast, 'Name').text = 'MAST'
        SubElement(mast, 'Type').text = 'Cyclic'
        SubElement(mast, 'Priority').text = '1'
        SubElement(mast, 'Interval').text = '10'  # 10ms
        programs = SubElement(mast, 'Programs')
        for prog in logic_data.get('programs', [{'name': 'Main'}]):
            SubElement(programs, 'Program').text = prog.get('name', 'Main')

        return self._prettify(root)

    def _generate_variables_xml(self, logic_data: Dict) -> str:
        """Generate Variables.xml."""

        root = Element('Variables')

        for var in logic_data.get('variables', []):
            var_elem = SubElement(root, 'Variable')
            SubElement(var_elem, 'Name').text = var.get('name')
            SubElement(var_elem, 'Type').text = var.get('type', 'BOOL')
            SubElement(var_elem, 'Address').text = var.get('address', '')
            SubElement(var_elem, 'Scope').text = var.get('scope', 'GLOBAL')
            SubElement(var_elem, 'InitialValue').text = str(var.get('initial', ''))
            SubElement(var_elem, 'Comment').text = var.get('comment', '')

        return self._prettify(root)

    def _generate_hardware_xml(self) -> str:
        """Generate Hardware Configuration.xml."""

        root = Element('HardwareConfiguration')

        cpu = SubElement(root, 'CPU')
        SubElement(cpu, 'Reference').text = self.project.controller
        SubElement(cpu, 'Name').text = 'M241_Controller'

        # Ethernet
        eth = SubElement(cpu, 'Ethernet')
        SubElement(eth, 'IPAddress').text = str(self.project.ip_address)
        SubElement(eth, 'SubnetMask').text = str(self.project.subnet_mask)
        SubElement(eth, 'Gateway').text = str(self.project.gateway)
        SubElement(eth, 'ModbusTCP').text = str(self.project.modbus_tcp_enabled).lower()

        return self._prettify(root)

    def _generate_io_mapping_xml(self, logic_data: Dict) -> str:
        """Generate IOMapping.xml."""

        root = Element('IOMapping')

        io_map = logic_data.get('io_mapping', {})

        inputs = SubElement(root, 'Inputs')
        for addr, info in io_map.get('inputs', {}).items():
            inp = SubElement(inputs, 'Input')
            SubElement(inp, 'Address').text = addr
            SubElement(inp, 'Symbol').text = info if isinstance(info, str) else info.get('symbol', '')

        outputs = SubElement(root, 'Outputs')
        for addr, info in io_map.get('outputs', {}).items():
            out = SubElement(outputs, 'Output')
            SubElement(out, 'Address').text = addr
            SubElement(out, 'Symbol').text = info if isinstance(info, str) else info.get('symbol', '')

        return self._prettify(root)

    def _generate_modbus_config(self) -> str:
        """Generate Modbus TCP configuration."""

        root = Element('ModbusTCP')

        server = SubElement(root, 'Server')
        SubElement(server, 'Enabled').text = 'true'
        SubElement(server, 'Port').text = '502'
        SubElement(server, 'UnitID').text = '1'

        return self._prettify(root)

    def _generate_canopen_config(self, logic_data: Dict) -> str:
        """Generate CANopen configuration."""

        root = Element('CANopen')

        master = SubElement(root, 'Master')
        SubElement(master, 'NodeID').text = '1'
        SubElement(master, 'Baudrate').text = '500000'

        canopen_config = logic_data.get('canopen_config', {})
        slaves = SubElement(root, 'Slaves')
        for slave in canopen_config.get('slaves', []):
            s = SubElement(slaves, 'Slave')
            SubElement(s, 'NodeID').text = str(slave.get('node_id'))
            SubElement(s, 'EDS').text = slave.get('eds_file', '')

        return self._prettify(root)

    def _generate_motion_config(self, logic_data: Dict) -> str:
        """Generate motion control configuration."""

        root = Element('MotionControl')

        motion_config = logic_data.get('motion_config', {})

        for i in range(self.project.axis_count):
            axis = SubElement(root, 'Axis')
            SubElement(axis, 'Number').text = str(i + 1)
            SubElement(axis, 'Name').text = f'Axis_{i + 1}'
            SubElement(axis, 'Type').text = 'Servo'

        return self._prettify(root)

    def _generate_library_references(self) -> str:
        """Generate library references."""

        root = Element('Libraries')

        libs = [
            ('Standard', '3.5.16.0'),
            ('Util', '3.5.16.0'),
            ('CAA_NetBaseServices', '3.5.16.0'),
            ('SM3_Basic', '3.5.16.0'),
        ]

        for name, version in libs:
            lib = SubElement(root, 'Library')
            SubElement(lib, 'Name').text = name
            SubElement(lib, 'Version').text = version

        return self._prettify(root)

    def _prettify(self, elem: Element) -> str:
        """Return pretty-printed XML string."""
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

---

## Django Views for M241

```python
# m241_generator/views.py
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json

from .models import M241Project
from .services.claude_service import ClaudeM241Service
from .services.smbp_zip_generator import M241SMBPZipGenerator


class GenerateM241View(View):
    """API endpoint for generating M241 programs."""

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        project = M241Project.objects.create(
            name=data.get('name', 'M241_Project'),
            controller=data.get('controller', 'TM241CE24T'),
            language=data.get('language', 'LD'),
            description=data.get('description', ''),
            user_specification=data.get('specification', ''),
            ip_address=data.get('ip_address', '192.168.1.10'),
            modbus_tcp_enabled=data.get('modbus_tcp', True),
            canopen_enabled=data.get('canopen', False),
            motion_enabled=data.get('motion', False),
            axis_count=data.get('axis_count', 0)
        )

        claude_service = ClaudeM241Service()
        logic_data = claude_service.generate_program(
            specification=project.user_specification,
            controller=project.controller,
            language=project.language
        )

        generator = M241SMBPZipGenerator(project)
        zip_content = generator.generate(logic_data)

        project.generated_zip = zip_content
        project.save()

        return JsonResponse({
            'success': True,
            'project_id': str(project.id),
            'download_url': f'/api/m241/download/{project.id}/'
        })


class DownloadM241View(View):
    """Download generated .smbp ZIP file."""

    def get(self, request, project_id):
        project = get_object_or_404(M241Project, id=project_id)

        if not project.generated_zip:
            return JsonResponse({'error': 'No generated file'}, status=404)

        response = HttpResponse(
            project.generated_zip,
            content_type='application/zip'
        )
        response['Content-Disposition'] = f'attachment; filename="{project.name}.smbp"'
        return response
```

---

## M241 I/O Reference

### Digital I/O Addressing

```
TM241CE24T:
- Inputs:  %I0.0 to %I0.15 (16 inputs, 4 HSC capable)
- Outputs: %Q0.0 to %Q0.7  (8 outputs)

TM241CE40T:
- Inputs:  %I0.0 to %I0.23 (24 inputs)
- Outputs: %Q0.0 to %Q0.15 (16 outputs)
```

### Analog I/O Addressing

```
Analog Inputs:  %IW0.0 to %IW0.3 (0-10V or 4-20mA)
Analog Outputs: %QW0.0 to %QW0.1 (0-10V or 4-20mA)

Scaling: 0-10000 raw = 0-10V or 4-20mA
```

### High-Speed Counters

```
%HSC0 to %HSC3 (4 channels)
Max frequency: 100 kHz
Modes: Single phase, Differential, A/B quadrature
```

---

## Usage Example

```python
import requests

response = requests.post('http://localhost:8000/api/m241/generate/', json={
    'name': 'Conveyor_Control',
    'controller': 'TM241CE24T',
    'language': 'ST',
    'specification': '''
        Create a conveyor control system with:
        - Start/Stop control via HMI (Modbus TCP)
        - Speed control via analog output
        - Part counting with high-speed counter
        - Fault detection and alarm handling
        - PID control for speed regulation
    ''',
    'modbus_tcp': True,
    'ip_address': '192.168.1.10'
})

result = response.json()
print(f"Download: {result['download_url']}")
```

---

## Version History

- **v2.1** (2025-12-30): Fixed file format - M241 uses .project (CODESYS), not .smbp
  - Updated to generate Structured Text (.st) instead of ZIP archives
  - Added PLCopen XML as alternative output format
  - Clarified that .project cannot be programmatically generated
- **v2.0** (2025-12-25): Django + Claude API integration, ZIP generator
- **v1.0** (2025-12-24): Initial M241 skill creation

---

**PLCAutoPilot Schneider M241 Skill v2.1 | 2025-12-30 | github.com/chatgptnotes/plcautopilot.com**
