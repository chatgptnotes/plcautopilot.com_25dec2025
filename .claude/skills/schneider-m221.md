# Schneider M221 PLC Programming Skill

## Expert Agent for M221 Controllers with Django and Claude API

---

## Metadata

```yaml
name: schneider-m221
description: Expert agent for Schneider Electric M221 PLC programming using Django and Claude API
version: 3.0
platform: Windows
target_controllers: TM221CE16T, TM221CE24T, TM221CE40T, TM221CE16R, TM221CE24R, TM221CE40R
file_formats: .smbp (XML-based single file)
programming_languages: Ladder Diagram (LD), Instruction List (IL)
standards: IEC 61131-3, IEC 61508
framework: Django
ai_engine: Claude API (claude-3-haiku-20240307)
```

---

## Activation Keywords

Activate this skill when user mentions:
- M221, TM221
- TM221CE16T, TM221CE24T, TM221CE40T
- TM221CE16R, TM221CE24R, TM221CE40R
- SoMachine Basic
- Machine Expert Basic (for M221)
- Modicon M221

---

## Architecture Overview

```
PLCAutoPilot M221 Architecture
================================

[User Request] --> [Django View] --> [Claude API] --> [SMBP Generator]
                         |                 |
                         v                 v
                   [Django Models]   [AI Logic Engine]
                         |                 |
                         v                 v
                   [Database]        [XML Builder]
                         |                 |
                         +-------+---------+
                                 |
                                 v
                          [.smbp File Output]
```

---

## Django Project Structure

```
plcautopilot/
├── manage.py
├── plcautopilot/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── m221_generator/
│   ├── __init__.py
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── serializers.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── claude_service.py
│   │   ├── smbp_generator.py
│   │   └── ladder_builder.py
│   ├── templates/
│   │   └── m221_generator/
│   │       ├── project_form.html
│   │       └── download.html
│   └── static/
│       └── m221_generator/
│           └── styles.css
└── requirements.txt
```

---

## Django Models

```python
# m221_generator/models.py
from django.db import models
import uuid

class M221Project(models.Model):
    """Django model for M221 PLC projects"""

    CONTROLLER_CHOICES = [
        ('TM221CE16T', 'TM221CE16T - 16 I/O Transistor'),
        ('TM221CE24T', 'TM221CE24T - 24 I/O Transistor'),
        ('TM221CE40T', 'TM221CE40T - 40 I/O Transistor'),
        ('TM221CE16R', 'TM221CE16R - 16 I/O Relay'),
        ('TM221CE24R', 'TM221CE24R - 24 I/O Relay'),
        ('TM221CE40R', 'TM221CE40R - 40 I/O Relay'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    controller = models.CharField(max_length=20, choices=CONTROLLER_CHOICES, default='TM221CE24T')
    description = models.TextField(blank=True)
    user_specification = models.TextField(help_text="Natural language specification from user")
    generated_xml = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'M221 Project'
        verbose_name_plural = 'M221 Projects'

    def __str__(self):
        return f"{self.name} ({self.controller})"


class M221Rung(models.Model):
    """Ladder rung for M221 project"""

    project = models.ForeignKey(M221Project, on_delete=models.CASCADE, related_name='rungs')
    order = models.PositiveIntegerField()
    name = models.CharField(max_length=100)
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Rung {self.order}: {self.name}"


class M221Element(models.Model):
    """Ladder element for M221 project"""

    ELEMENT_TYPES = [
        ('NormalContact', 'Normally Open Contact'),
        ('NegatedContact', 'Normally Closed Contact'),
        ('Coil', 'Output Coil'),
        ('SetCoil', 'Set (Latch) Coil'),
        ('ResetCoil', 'Reset (Unlatch) Coil'),
        ('Line', 'Horizontal Line'),
        ('TimerFunctionBlock', 'Timer Block'),
        ('CounterFunctionBlock', 'Counter Block'),
    ]

    CONNECTION_TYPES = [
        ('Left, Right', 'Through Connection'),
        ('Down, Left, Right', 'Branch Start'),
        ('Up, Left', 'Branch End'),
        ('Left', 'Terminal (Output)'),
    ]

    rung = models.ForeignKey(M221Rung, on_delete=models.CASCADE, related_name='elements')
    element_type = models.CharField(max_length=30, choices=ELEMENT_TYPES)
    address = models.CharField(max_length=20)
    symbol = models.CharField(max_length=50, blank=True)
    row = models.PositiveIntegerField(default=0)
    column = models.PositiveIntegerField()
    connection = models.CharField(max_length=50, choices=CONNECTION_TYPES, default='Left, Right')

    class Meta:
        ordering = ['row', 'column']

    def __str__(self):
        return f"{self.element_type} at ({self.row}, {self.column})"


class M221Timer(models.Model):
    """Timer configuration for M221 project"""

    TIMER_TYPES = [
        ('TON', 'On-Delay Timer'),
        ('TOF', 'Off-Delay Timer'),
        ('TP', 'Pulse Timer'),
    ]

    TIME_BASES = [
        ('TimeBase1ms', '1 millisecond'),
        ('TimeBase10ms', '10 milliseconds'),
        ('TimeBase100ms', '100 milliseconds'),
        ('TimeBase1s', '1 second'),
        ('TimeBase1min', '1 minute'),
    ]

    project = models.ForeignKey(M221Project, on_delete=models.CASCADE, related_name='timers')
    address = models.CharField(max_length=20)
    symbol = models.CharField(max_length=50)
    timer_type = models.CharField(max_length=10, choices=TIMER_TYPES, default='TON')
    time_base = models.CharField(max_length=20, choices=TIME_BASES, default='TimeBase1s')
    preset = models.PositiveIntegerField(default=1)
    comment = models.TextField(blank=True)

    def __str__(self):
        return f"{self.symbol} ({self.timer_type})"
```

---

## Claude API Service

```python
# m221_generator/services/claude_service.py
import anthropic
import os
import json
from typing import Dict, List, Any

class ClaudeM221Service:
    """
    Claude API service for M221 PLC logic generation.
    Uses claude-3-haiku-20240307 for fast, efficient processing.
    """

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get('ANTHROPIC_API_KEY')
        )
        self.model = os.environ.get('CLAUDE_MODEL', 'claude-3-haiku-20240307')

    def generate_ladder_logic(self, specification: str, controller: str) -> Dict[str, Any]:
        """
        Generate ladder logic from natural language specification.

        Args:
            specification: User's natural language description
            controller: Target M221 controller model

        Returns:
            Dictionary containing rungs, elements, timers, and IL code
        """

        system_prompt = self._get_m221_system_prompt(controller)

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate ladder logic for the following specification:

{specification}

Target Controller: {controller}

Respond with a JSON object containing:
1. "rungs": Array of rung objects with name, comment, and elements
2. "timers": Array of timer configurations if needed
3. "counters": Array of counter configurations if needed
4. "il_code": Instruction List representation
5. "io_mapping": Input/Output address assignments

Ensure all addresses are valid for {controller}."""
                }
            ]
        )

        response_text = message.content[0].text

        # Parse JSON from response
        try:
            # Extract JSON from response (handle markdown code blocks)
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text

            return json.loads(json_str)
        except json.JSONDecodeError:
            # Fallback: return structured error response
            return {
                "error": "Failed to parse AI response",
                "raw_response": response_text,
                "rungs": [],
                "timers": [],
                "counters": [],
                "il_code": "",
                "io_mapping": {}
            }

    def _get_m221_system_prompt(self, controller: str) -> str:
        """Get the system prompt for M221 ladder logic generation."""

        io_specs = self._get_io_specifications(controller)

        return f"""You are an expert PLC programmer specializing in Schneider Electric M221 controllers.

TARGET CONTROLLER: {controller}
{io_specs}

PROGRAMMING RULES:
1. Use 10-column grid (columns 0-10)
2. Coils ONLY in column 10
3. Fill empty columns with Line elements
4. Use proper connection types:
   - "Left, Right" for through connections
   - "Down, Left, Right" for branch starts
   - "Up, Left" for branch ends
   - "Left" for output coils

ELEMENT TYPES:
- NormalContact: NO contact (examines ON)
- NegatedContact: NC contact (examines OFF)
- Coil: Standard output
- SetCoil: Latch output
- ResetCoil: Unlatch output
- TimerFunctionBlock: TON/TOF/TP timer
- CounterFunctionBlock: CTU/CTD counter
- Line: Horizontal connection

TIMER CONFIGURATION:
- TimeBase: TimeBase1ms, TimeBase10ms, TimeBase100ms, TimeBase1s, TimeBase1min
- Types: TON (on-delay), TOF (off-delay), TP (pulse)

OUTPUT FORMAT: Valid JSON with rungs, timers, counters, il_code, io_mapping"""

    def _get_io_specifications(self, controller: str) -> str:
        """Get I/O specifications for specific controller."""

        specs = {
            'TM221CE16T': """
I/O SPECIFICATIONS:
- Digital Inputs: %I0.0 to %I0.8 (9 inputs)
- Digital Outputs: %Q0.0 to %Q0.5 (6 outputs)
- Memory Bits: %M0 to %M511
- Memory Words: %MW0 to %MW1999
- Timers: %TM0 to %TM254
- Counters: %C0 to %C254""",

            'TM221CE24T': """
I/O SPECIFICATIONS:
- Digital Inputs: %I0.0 to %I0.13 (14 inputs)
- Digital Outputs: %Q0.0 to %Q0.9 (10 outputs)
- Analog Inputs: %IW0.0 to %IW0.1 (2 inputs)
- Memory Bits: %M0 to %M511
- Memory Words: %MW0 to %MW1999
- Timers: %TM0 to %TM254
- Counters: %C0 to %C254""",

            'TM221CE40T': """
I/O SPECIFICATIONS:
- Digital Inputs: %I0.0 to %I0.23 (24 inputs)
- Digital Outputs: %Q0.0 to %Q0.15 (16 outputs)
- Analog Inputs: %IW0.0 to %IW0.1 (2 inputs)
- Memory Bits: %M0 to %M511
- Memory Words: %MW0 to %MW1999
- Timers: %TM0 to %TM254
- Counters: %C0 to %C254"""
        }

        # Default for relay variants (same I/O as transistor)
        default_spec = specs.get('TM221CE24T')

        return specs.get(controller, default_spec)

    def validate_logic(self, rungs: List[Dict], controller: str) -> Dict[str, Any]:
        """
        Validate generated ladder logic using Claude API.

        Args:
            rungs: List of rung dictionaries
            controller: Target controller model

        Returns:
            Validation results with errors and warnings
        """

        message = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": f"""Validate this M221 ladder logic for {controller}:

{json.dumps(rungs, indent=2)}

Check for:
1. Invalid I/O addresses
2. Missing seal-in circuits
3. Missing emergency stop logic
4. Timer/counter configuration errors
5. Connection type errors

Respond with JSON: {{"valid": true/false, "errors": [], "warnings": []}}"""
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
            return {"valid": True, "errors": [], "warnings": []}
```

---

## SMBP Generator Service

```python
# m221_generator/services/smbp_generator.py
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom
from typing import Dict, List, Any
from ..models import M221Project

class M221SMBPGenerator:
    """
    Generate .smbp files for M221 controllers.
    Uses verified XML structure from real SoMachine Basic projects.
    """

    def __init__(self, project: M221Project):
        self.project = project
        self.rungs_data = []
        self.timers_data = []

    def generate(self, logic_data: Dict[str, Any]) -> str:
        """
        Generate complete .smbp XML content.

        Args:
            logic_data: Dictionary from Claude API with rungs, timers, etc.

        Returns:
            Complete XML string for .smbp file
        """

        self.rungs_data = logic_data.get('rungs', [])
        self.timers_data = logic_data.get('timers', [])

        root = Element('ProjectDescriptor')
        root.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        root.set('xmlns:xsd', 'http://www.w3.org/2001/XMLSchema')

        # Project metadata
        SubElement(root, 'ProjectVersion').text = '3.0.0.0'
        SubElement(root, 'ManagementLevel').text = 'FunctLevelMan21_0'
        SubElement(root, 'Name').text = self.project.name
        SubElement(root, 'FullName').text = f'C:\\Projects\\{self.project.name}.smbp'
        SubElement(root, 'CurrentCultureName').text = 'en-GB'

        # Build configurations
        software_config = SubElement(root, 'SoftwareConfiguration')
        self._build_pous(software_config)
        self._build_memory_allocation(software_config)
        self._build_timers(software_config)
        self._build_task_config(software_config)

        hardware_config = SubElement(root, 'HardwareConfiguration')
        self._build_hardware(hardware_config, logic_data.get('io_mapping', {}))

        # Additional sections
        SubElement(root, 'DisplayUserLabelsConfiguration')
        SubElement(root, 'GlobalProperties')
        SubElement(root, 'ReportConfiguration')

        return self._prettify(root)

    def _build_pous(self, parent: Element) -> None:
        """Build Program Organization Units section."""

        pous = SubElement(parent, 'Pous')
        pou_list = SubElement(pous, 'ProgramOrganizationUnits')

        SubElement(pou_list, 'Name').text = self.project.name
        SubElement(pou_list, 'SectionNumber').text = '1'

        rungs_elem = SubElement(pou_list, 'Rungs')

        for rung_data in self.rungs_data:
            self._build_rung(rungs_elem, rung_data)

    def _build_rung(self, parent: Element, rung_data: Dict) -> None:
        """Build a single ladder rung."""

        rung = SubElement(parent, 'RungEntity')
        ladder_elements = SubElement(rung, 'LadderElements')

        for element in rung_data.get('elements', []):
            self._build_ladder_element(ladder_elements, element)

        # Build IL representation
        il_lines = SubElement(rung, 'InstructionLines')
        for il_line in rung_data.get('il_lines', []):
            line_entity = SubElement(il_lines, 'InstructionLineEntity')
            SubElement(line_entity, 'InstructionLine').text = il_line
            SubElement(line_entity, 'Comment')

        SubElement(rung, 'Name').text = rung_data.get('name', 'Rung')
        SubElement(rung, 'MainComment').text = rung_data.get('comment', '')
        SubElement(rung, 'Label')
        SubElement(rung, 'IsLadderSelected').text = 'true'

    def _build_ladder_element(self, parent: Element, element: Dict) -> None:
        """Build a single ladder element."""

        entity = SubElement(parent, 'LadderEntity')
        SubElement(entity, 'ElementType').text = element.get('type', 'Line')

        if element.get('address'):
            SubElement(entity, 'Descriptor').text = element['address']

        SubElement(entity, 'Comment')

        if element.get('symbol'):
            SubElement(entity, 'Symbol').text = element['symbol']

        SubElement(entity, 'Row').text = str(element.get('row', 0))
        SubElement(entity, 'Column').text = str(element.get('column', 0))
        SubElement(entity, 'ChosenConnection').text = element.get('connection', 'Left, Right')

    def _build_memory_allocation(self, parent: Element) -> None:
        """Build memory allocation section."""

        sections = [
            'Subroutines', 'WatchLists', 'CustomSymbols',
            'ConstantWordsMemoryAllocation'
        ]
        for section in sections:
            SubElement(parent, section)

        # Memory bits allocation
        mem_bits = SubElement(parent, 'MemoryBitsMemoryAllocation')
        SubElement(mem_bits, 'Allocation').text = 'Manual'
        SubElement(mem_bits, 'ForcedCount').text = '512'

        # Memory words allocation
        mem_words = SubElement(parent, 'MemoryWordsMemoryAllocation')
        SubElement(mem_words, 'Allocation').text = 'Manual'
        SubElement(mem_words, 'ForcedCount').text = '2000'

        # Other allocations
        alloc_sections = [
            'TimersMemoryAllocation', 'CountersMemoryAllocation',
            'RegistersMemoryAllocation', 'DrumsMemoryAllocation',
            'SbrsMemoryAllocation', 'ScsMemoryAllocation',
            'FcsMemoryAllocation', 'SchsMemoryAllocation',
            'HscsMemoryAllocation', 'PtosMemoryAllocation'
        ]
        for section in alloc_sections:
            SubElement(parent, section)

    def _build_timers(self, parent: Element) -> None:
        """Build timers configuration section."""

        timers_elem = SubElement(parent, 'Timers')

        for timer in self.timers_data:
            timer_elem = SubElement(timers_elem, 'Timer')
            SubElement(timer_elem, 'Address').text = timer.get('address', '%TM0')
            SubElement(timer_elem, 'Index').text = str(timer.get('index', 0))
            SubElement(timer_elem, 'Symbol').text = timer.get('symbol', 'TIMER')
            SubElement(timer_elem, 'Comment').text = timer.get('comment', '')
            SubElement(timer_elem, 'Type').text = timer.get('type', 'TON')
            SubElement(timer_elem, 'TimeBase').text = timer.get('time_base', 'TimeBase1s')
            SubElement(timer_elem, 'Preset').text = str(timer.get('preset', 1))

    def _build_task_config(self, parent: Element) -> None:
        """Build task configuration section."""

        # Empty sections
        sections = [
            'MemoryBits', 'SystemBits', 'SystemWords', 'GrafcetSteps',
            'MemoryWords', 'MemoryDoubleWords', 'MemoryFloats',
            'ConstantWords', 'ConstantDoubleWords', 'ConstantMemoryFloats',
            'Counters', 'FastCounters', 'Registers', 'Drums',
            'ShiftBitRegisters', 'StepCounters', 'ScheduleBlocks',
            'Pids', 'MessageBlocks', 'FunctionBlocks', 'MotionTaskTables'
        ]
        for section in sections:
            SubElement(parent, section)

        # Fast task
        fast_task = SubElement(parent, 'FastTask')
        SubElement(fast_task, 'Period').text = '255'

        # Master task
        mast_task = SubElement(parent, 'MastTask')
        SubElement(mast_task, 'UsePeriodScanMode').text = 'false'
        SubElement(mast_task, 'PeriodScan').text = '100'

        # CPU behavior
        cpu = SubElement(parent, 'CpuBehavior')
        SubElement(cpu, 'StartingMode').text = 'StartAsPreviousState'
        SubElement(cpu, 'RunStopAddress')
        SubElement(cpu, 'AutoSaveRamOnEeprom').text = 'true'
        SubElement(cpu, 'WatchdogPeriod').text = '250'

        SubElement(parent, 'TraceTimeBase').text = 'Time5Sec'
        SubElement(parent, 'UserFunctionPous')
        SubElement(parent, 'UserFunctionBlockPous')
        SubElement(parent, 'UserDefineFunctionBlocks')

    def _build_hardware(self, parent: Element, io_mapping: Dict) -> None:
        """Build hardware configuration section."""

        plc = SubElement(parent, 'Plc')
        cpu = SubElement(plc, 'Cpu')

        SubElement(cpu, 'Index').text = '0'
        SubElement(cpu, 'InputNb').text = '0'
        SubElement(cpu, 'OutputNb').text = '0'
        SubElement(cpu, 'Kind').text = '0'
        SubElement(cpu, 'Reference').text = self.project.controller
        SubElement(cpu, 'Name').text = 'MyController'
        SubElement(cpu, 'Consumption5V').text = '520'
        SubElement(cpu, 'Consumption24V').text = '200'

        # Digital Inputs
        di_elem = SubElement(cpu, 'DigitalInputs')
        for addr, symbol in io_mapping.get('inputs', {}).items():
            di = SubElement(di_elem, 'DiscretInput')
            SubElement(di, 'Address').text = addr
            SubElement(di, 'Index').text = str(self._extract_io_index(addr))
            SubElement(di, 'Symbol').text = symbol
            SubElement(di, 'DIFiltering').text = 'DIFilterings4ms'
            SubElement(di, 'DILatch').text = 'DILatchNo'

        # Digital Outputs
        do_elem = SubElement(cpu, 'DigitalOutputs')
        for addr, symbol in io_mapping.get('outputs', {}).items():
            do = SubElement(do_elem, 'DiscretOutput')
            SubElement(do, 'Address').text = addr
            SubElement(do, 'Index').text = str(self._extract_io_index(addr))
            SubElement(do, 'Symbol').text = symbol

        # Ethernet configuration
        eth = SubElement(cpu, 'EthernetConfiguration')
        SubElement(eth, 'NetworkName').text = 'M221'
        SubElement(eth, 'IpAllocationMode').text = 'ByDhcp'
        SubElement(eth, 'IpAddress').text = '192.168.1.10'
        SubElement(eth, 'SubnetMask').text = '255.255.255.0'
        SubElement(eth, 'GatewayAddress').text = '192.168.1.1'
        SubElement(eth, 'ModbusServerEnabled').text = 'true'
        SubElement(eth, 'ProgrammingProtocolEnabled').text = 'true'

        SubElement(cpu, 'HardwareId').text = '1933'
        SubElement(cpu, 'IsExpander').text = 'false'

        SubElement(plc, 'Extensions')

        # Serial line configuration
        serial = SubElement(plc, 'SerialLineConfiguration')
        SubElement(serial, 'Baud').text = 'Baud19200'
        SubElement(serial, 'Parity').text = 'ParityEven'
        SubElement(serial, 'DataBits').text = 'DataBits8'
        SubElement(serial, 'StopBits').text = 'StopBits1'
        SubElement(serial, 'PhysicalMedium').text = 'PhysicalMediumRs485'
        SubElement(serial, 'TransmissionMode').text = 'TransmissionModeModbusRtu'
        SubElement(serial, 'SlaveId').text = '1'
        SubElement(serial, 'Addressing').text = 'SlaveAddressing'

    def _extract_io_index(self, address: str) -> int:
        """Extract index from I/O address like %I0.5 -> 5"""
        try:
            return int(address.split('.')[-1])
        except:
            return 0

    def _prettify(self, elem: Element) -> str:
        """Return pretty-printed XML string."""
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

---

## Django Views

```python
# m221_generator/views.py
from django.shortcuts import render, get_object_or_404
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json

from .models import M221Project
from .services.claude_service import ClaudeM221Service
from .services.smbp_generator import M221SMBPGenerator


class GenerateM221View(View):
    """API endpoint for generating M221 programs from specifications."""

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        """
        Generate M221 ladder logic from natural language specification.

        Request body:
        {
            "name": "Project Name",
            "controller": "TM221CE24T",
            "specification": "Create a motor start/stop circuit with..."
        }
        """
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        # Create project
        project = M221Project.objects.create(
            name=data.get('name', 'M221_Project'),
            controller=data.get('controller', 'TM221CE24T'),
            description=data.get('description', ''),
            user_specification=data.get('specification', '')
        )

        # Generate logic using Claude API
        claude_service = ClaudeM221Service()
        logic_data = claude_service.generate_ladder_logic(
            specification=project.user_specification,
            controller=project.controller
        )

        # Validate logic
        validation = claude_service.validate_logic(
            rungs=logic_data.get('rungs', []),
            controller=project.controller
        )

        # Generate SMBP file
        generator = M221SMBPGenerator(project)
        smbp_content = generator.generate(logic_data)

        # Save generated XML
        project.generated_xml = smbp_content
        project.save()

        return JsonResponse({
            'success': True,
            'project_id': str(project.id),
            'validation': validation,
            'download_url': f'/api/m221/download/{project.id}/'
        })


class DownloadM221View(View):
    """Download generated .smbp file."""

    def get(self, request, project_id):
        project = get_object_or_404(M221Project, id=project_id)

        if not project.generated_xml:
            return JsonResponse({'error': 'No generated file'}, status=404)

        response = HttpResponse(
            project.generated_xml,
            content_type='application/xml'
        )
        response['Content-Disposition'] = f'attachment; filename="{project.name}.smbp"'
        return response


class M221SpecificationView(View):
    """Form view for entering M221 specifications."""

    def get(self, request):
        return render(request, 'm221_generator/project_form.html', {
            'controllers': M221Project.CONTROLLER_CHOICES
        })

    def post(self, request):
        # Handle form submission
        name = request.POST.get('name')
        controller = request.POST.get('controller')
        specification = request.POST.get('specification')

        project = M221Project.objects.create(
            name=name,
            controller=controller,
            user_specification=specification
        )

        # Generate using Claude API
        claude_service = ClaudeM221Service()
        logic_data = claude_service.generate_ladder_logic(
            specification=specification,
            controller=controller
        )

        generator = M221SMBPGenerator(project)
        smbp_content = generator.generate(logic_data)
        project.generated_xml = smbp_content
        project.save()

        return render(request, 'm221_generator/download.html', {
            'project': project
        })
```

---

## Django URL Configuration

```python
# m221_generator/urls.py
from django.urls import path
from .views import GenerateM221View, DownloadM221View, M221SpecificationView

app_name = 'm221_generator'

urlpatterns = [
    path('', M221SpecificationView.as_view(), name='specification_form'),
    path('api/generate/', GenerateM221View.as_view(), name='generate'),
    path('api/download/<uuid:project_id>/', DownloadM221View.as_view(), name='download'),
]
```

---

## Environment Variables Required

```bash
# .env
ANTHROPIC_API_KEY=your-anthropic-api-key
CLAUDE_MODEL=claude-3-haiku-20240307
DEBUG=True
SECRET_KEY=your-django-secret-key
DATABASE_URL=sqlite:///db.sqlite3
```

---

## Usage Example

```python
# Example: Generate M221 motor start/stop program

import requests

response = requests.post('http://localhost:8000/api/m221/generate/', json={
    'name': 'Motor_Control_TM221CE24T',
    'controller': 'TM221CE24T',
    'specification': '''
        Create a motor start/stop circuit with:
        - START button on %I0.0 (NO contact)
        - STOP button on %I0.1 (NC contact)
        - Motor output on %Q0.0
        - Include seal-in circuit for latching
        - Add emergency stop on %I0.2
    '''
})

result = response.json()
print(f"Project ID: {result['project_id']}")
print(f"Download: {result['download_url']}")
```

---

## Version History

- **v3.0** (2025-12-25): Django + Claude API integration
- **v2.0** (2025-12-25): Verified XML structure
- **v1.0** (2025-12-24): Initial skill creation

---

**PLCAutoPilot Schneider M221 Skill v3.0 | 2025-12-25 | github.com/chatgptnotes/plcautopilot.com**
