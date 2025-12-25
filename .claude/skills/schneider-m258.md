# Schneider M258 PLC Programming Skill

## Expert Agent for M258 Motion Controllers with Django and Claude API

---

## Metadata

```yaml
name: schneider-m258
description: Expert agent for Schneider Electric M258 Motion Controller using Django and Claude API
version: 1.0
platform: Windows
target_controllers: TM258LD42DT, TM258LF42DT, TM258LF42DT4L
file_formats: .smbp (ZIP-based archive)
programming_languages: Ladder (LD), IL, ST, SFC, FBD
specialty: High-performance motion control, multi-axis coordination
standards: IEC 61131-3, IEC 61508, PLCopen Motion
framework: Django
ai_engine: Claude API (claude-3-haiku-20240307)
```

---

## Activation Keywords

Activate this skill when user mentions:
- M258, TM258
- TM258LD42DT, TM258LF42DT
- Motion controller Schneider
- Multi-axis control
- Servo drive integration
- PLCopen motion
- High-speed positioning
- Coordinated motion
- CNC control PLC

---

## M258 Unique Capabilities

The M258 is the **high-performance motion controller** in the Modicon M2xx family:

| Feature | M241 | M258 |
|---------|------|------|
| Motion Axes | 8 | 22 synchronized |
| Cycle Time | 4ms | 1ms |
| Motion Bus | CANopen | Sercos III / CANmotion |
| Interpolation | None | Linear, Circular, Spline |
| Cam Profiles | None | Electronic cam |
| Gearing | None | Electronic gearing |

### Motion Capabilities
- 22 synchronized servo axes
- 1ms motion cycle time
- Sercos III real-time bus
- G-code interpreter
- Electronic cam profiles
- Multi-axis interpolation
- Flying saw / rotary knife

---

## Django Project Structure

```
plcautopilot/
├── m258_generator/
│   ├── __init__.py
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── claude_service.py
│   │   ├── smbp_generator.py
│   │   ├── motion_builder.py
│   │   ├── cam_profile_builder.py
│   │   └── sercos_config.py
│   └── templates/
└── requirements.txt
```

---

## Django Models

```python
# m258_generator/models.py
from django.db import models
import uuid

class M258Project(models.Model):
    """Django model for M258 Motion Controller projects"""

    CONTROLLER_CHOICES = [
        ('TM258LD42DT', 'TM258LD42DT - CANopen Motion'),
        ('TM258LF42DT', 'TM258LF42DT - Sercos III'),
        ('TM258LF42DT4L', 'TM258LF42DT4L - Sercos III Extended'),
    ]

    MOTION_BUS_CHOICES = [
        ('CANMOTION', 'CANmotion'),
        ('SERCOS', 'Sercos III'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    controller = models.CharField(max_length=20, choices=CONTROLLER_CHOICES, default='TM258LF42DT')
    description = models.TextField(blank=True)
    user_specification = models.TextField()

    # Motion Configuration
    motion_bus = models.CharField(max_length=20, choices=MOTION_BUS_CHOICES, default='SERCOS')
    axis_count = models.PositiveIntegerField(default=1)
    cycle_time_ms = models.FloatField(default=1.0)
    enable_interpolation = models.BooleanField(default=False)
    enable_cam = models.BooleanField(default=False)
    enable_gearing = models.BooleanField(default=False)

    # Network Configuration
    ip_address = models.GenericIPAddressField(default='192.168.1.10')

    generated_zip = models.BinaryField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'M258 Motion Project'


class M258Axis(models.Model):
    """Axis configuration for M258 project"""

    AXIS_TYPES = [
        ('LINEAR', 'Linear Axis'),
        ('ROTARY', 'Rotary Axis'),
        ('VIRTUAL', 'Virtual Axis'),
    ]

    DRIVE_TYPES = [
        ('LEXIUM32', 'Lexium 32'),
        ('LEXIUM52', 'Lexium 52'),
        ('LEXIUM62', 'Lexium 62'),
        ('GENERIC', 'Generic Sercos'),
    ]

    project = models.ForeignKey(M258Project, on_delete=models.CASCADE, related_name='axes')
    axis_number = models.PositiveIntegerField()
    name = models.CharField(max_length=50)
    axis_type = models.CharField(max_length=20, choices=AXIS_TYPES, default='LINEAR')
    drive_type = models.CharField(max_length=20, choices=DRIVE_TYPES, default='LEXIUM32')

    # Motion parameters
    max_velocity = models.FloatField(default=1000.0)  # units/sec
    max_acceleration = models.FloatField(default=10000.0)  # units/sec^2
    max_deceleration = models.FloatField(default=10000.0)
    max_jerk = models.FloatField(default=100000.0)  # units/sec^3

    # Homing
    homing_method = models.CharField(max_length=50, default='HomingMethod35')
    homing_velocity = models.FloatField(default=100.0)

    # Units
    position_unit = models.CharField(max_length=20, default='mm')
    gear_ratio_numerator = models.FloatField(default=1.0)
    gear_ratio_denominator = models.FloatField(default=1.0)

    class Meta:
        ordering = ['axis_number']


class M258CamProfile(models.Model):
    """Electronic cam profile for M258"""

    project = models.ForeignKey(M258Project, on_delete=models.CASCADE, related_name='cam_profiles')
    name = models.CharField(max_length=50)
    master_axis = models.ForeignKey(M258Axis, on_delete=models.CASCADE, related_name='master_cams')
    slave_axis = models.ForeignKey(M258Axis, on_delete=models.CASCADE, related_name='slave_cams')

    # Cam data (stored as JSON)
    cam_points = models.JSONField(default=list)
    interpolation_type = models.CharField(max_length=20, default='SPLINE')
    periodic = models.BooleanField(default=True)


class M258MotionSequence(models.Model):
    """Motion sequence/recipe for M258"""

    project = models.ForeignKey(M258Project, on_delete=models.CASCADE, related_name='sequences')
    name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    g_code = models.TextField(blank=True)  # G-code representation
    plcopen_code = models.TextField(blank=True)  # PLCopen motion code
```

---

## Claude API Service for M258

```python
# m258_generator/services/claude_service.py
import anthropic
import os
import json
from typing import Dict, Any, List

class ClaudeM258Service:
    """
    Claude API service for M258 Motion Controller.
    Specialized for multi-axis motion control and PLCopen.
    """

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get('ANTHROPIC_API_KEY')
        )
        self.model = os.environ.get('CLAUDE_MODEL', 'claude-3-haiku-20240307')

    def generate_motion_program(
        self,
        specification: str,
        controller: str,
        axis_count: int = 1
    ) -> Dict[str, Any]:
        """Generate M258 motion program from specification."""

        system_prompt = self._get_m258_system_prompt(controller, axis_count)

        message = self.client.messages.create(
            model=self.model,
            max_tokens=8192,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate motion control program for M258:

{specification}

Controller: {controller}
Number of Axes: {axis_count}

Include in JSON response:
1. "axes": Axis configurations with parameters
2. "motion_program": PLCopen motion program (ST)
3. "homing_sequence": Homing procedure for each axis
4. "motion_sequences": Named motion sequences
5. "cam_profiles": Electronic cam definitions if needed
6. "safety_logic": Safety interlocks and E-stop handling
7. "io_mapping": Digital I/O assignments
8. "sercos_config": Sercos III bus configuration"""
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
            return {"error": "Parse failed", "axes": [], "motion_program": ""}

    def generate_cam_profile(
        self,
        master_range: tuple,
        slave_motion: str,
        points: int = 360
    ) -> Dict[str, Any]:
        """Generate electronic cam profile using Claude."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate electronic cam profile for M258:

Master Range: {master_range[0]} to {master_range[1]} degrees
Slave Motion Description: {slave_motion}
Number of Points: {points}

Return JSON with:
1. "points": Array of [master_position, slave_position] pairs
2. "interpolation": Interpolation type (LINEAR, SPLINE, BEZIER)
3. "derivatives": First and second derivatives at boundaries
4. "description": Technical description of the cam"""
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
            return {"points": [], "interpolation": "SPLINE"}

    def generate_g_code(self, motion_description: str) -> str:
        """Generate G-code from motion description."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate G-code for M258 motion controller:

Motion Description:
{motion_description}

Requirements:
- Use standard G-code syntax (G0, G1, G2, G3, etc.)
- Include appropriate feed rates (F)
- Include spindle speeds if applicable (S)
- Add comments for each section
- Use M-codes for auxiliary functions

Return valid G-code program."""
                }
            ]
        )

        return message.content[0].text

    def _get_m258_system_prompt(self, controller: str, axis_count: int) -> str:
        """System prompt for M258 motion programming."""

        return f"""You are an expert motion control programmer for Schneider Electric M258.

TARGET CONTROLLER: {controller}
NUMBER OF AXES: {axis_count}

M258 MOTION CAPABILITIES:
- Up to 22 synchronized servo axes
- 1ms motion cycle time
- Sercos III real-time bus (up to 511 devices)
- CANmotion for drives
- PLCopen motion function blocks
- Electronic cam (MC_CamIn, MC_CamOut)
- Electronic gearing (MC_GearIn, MC_GearOut)
- Multi-axis interpolation (linear, circular, spline)
- G-code interpreter

PLCOPEN MOTION FUNCTION BLOCKS:
- MC_Power: Enable axis power
- MC_Home: Execute homing
- MC_MoveAbsolute: Move to absolute position
- MC_MoveRelative: Move relative distance
- MC_MoveVelocity: Continuous velocity move
- MC_Stop: Stop axis motion
- MC_SetPosition: Set current position
- MC_ReadActualPosition: Read position
- MC_CamIn: Engage cam coupling
- MC_CamOut: Disengage cam
- MC_GearIn: Engage gear coupling
- MC_GearOut: Disengage gear

AXIS DATA TYPE:
AXIS_REF structure with:
- AxisName: STRING
- AxisNo: UINT
- Status: AXIS_STATUS
- Position: LREAL
- Velocity: LREAL

SERCOS III:
- Cycle time: 250us to 4ms
- Topology: Ring or Line
- Up to 511 devices
- Deterministic communication

OUTPUT: Valid JSON with PLCopen-compliant motion program in Structured Text."""
```

---

## Motion Builder Service

```python
# m258_generator/services/motion_builder.py
from typing import Dict, List
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

class M258MotionBuilder:
    """Build motion configuration for M258."""

    def __init__(self, project_name: str):
        self.project_name = project_name

    def generate_axis_config_xml(self, axes: List[Dict]) -> str:
        """Generate axis configuration XML."""

        root = Element('MotionConfiguration')
        SubElement(root, 'ProjectName').text = self.project_name
        SubElement(root, 'CycleTime').text = '1.0'  # ms

        axes_elem = SubElement(root, 'Axes')
        for axis in axes:
            ax = SubElement(axes_elem, 'Axis')
            SubElement(ax, 'Number').text = str(axis.get('number', 1))
            SubElement(ax, 'Name').text = axis.get('name', 'Axis1')
            SubElement(ax, 'Type').text = axis.get('type', 'LINEAR')

            # Drive configuration
            drive = SubElement(ax, 'Drive')
            SubElement(drive, 'Type').text = axis.get('drive_type', 'LEXIUM32')
            SubElement(drive, 'NodeId').text = str(axis.get('node_id', 1))
            SubElement(drive, 'Protocol').text = axis.get('protocol', 'SERCOS')

            # Motion parameters
            params = SubElement(ax, 'Parameters')
            SubElement(params, 'MaxVelocity').text = str(axis.get('max_velocity', 1000))
            SubElement(params, 'MaxAcceleration').text = str(axis.get('max_acceleration', 10000))
            SubElement(params, 'MaxDeceleration').text = str(axis.get('max_deceleration', 10000))
            SubElement(params, 'MaxJerk').text = str(axis.get('max_jerk', 100000))

            # Units
            units = SubElement(ax, 'Units')
            SubElement(units, 'Position').text = axis.get('position_unit', 'mm')
            SubElement(units, 'GearRatioNum').text = str(axis.get('gear_num', 1))
            SubElement(units, 'GearRatioDen').text = str(axis.get('gear_den', 1))

            # Homing
            homing = SubElement(ax, 'Homing')
            SubElement(homing, 'Method').text = axis.get('homing_method', 'HomingMethod35')
            SubElement(homing, 'Velocity').text = str(axis.get('homing_velocity', 100))
            SubElement(homing, 'Acceleration').text = str(axis.get('homing_acceleration', 1000))

        return self._prettify(root)

    def generate_plcopen_program(self, axes: List[Dict], sequences: List[Dict]) -> str:
        """Generate PLCopen motion program in Structured Text."""

        program = []
        program.append("PROGRAM MotionControl")
        program.append("VAR")

        # Axis variables
        for axis in axes:
            name = axis.get('name', 'Axis1')
            program.append(f"    {name}: AXIS_REF;")
            program.append(f"    fb{name}_Power: MC_Power;")
            program.append(f"    fb{name}_Home: MC_Home;")
            program.append(f"    fb{name}_MoveAbs: MC_MoveAbsolute;")
            program.append(f"    fb{name}_MoveVel: MC_MoveVelocity;")
            program.append(f"    fb{name}_Stop: MC_Stop;")

        program.append("")
        program.append("    // Control flags")
        program.append("    bEnableDrives: BOOL;")
        program.append("    bStartHoming: BOOL;")
        program.append("    bStartSequence: BOOL;")
        program.append("    bStop: BOOL;")
        program.append("    nSequenceStep: INT;")
        program.append("END_VAR")
        program.append("")

        # Implementation
        program.append("(* Power Control *)")
        for axis in axes:
            name = axis.get('name', 'Axis1')
            program.append(f"fb{name}_Power(")
            program.append(f"    Axis := {name},")
            program.append(f"    Enable := bEnableDrives,")
            program.append(f"    EnablePositive := TRUE,")
            program.append(f"    EnableNegative := TRUE);")
            program.append("")

        program.append("(* Homing Sequence *)")
        program.append("IF bStartHoming THEN")
        for axis in axes:
            name = axis.get('name', 'Axis1')
            program.append(f"    fb{name}_Home(")
            program.append(f"        Axis := {name},")
            program.append(f"        Execute := TRUE,")
            program.append(f"        Position := 0.0);")
        program.append("END_IF")
        program.append("")

        program.append("(* Emergency Stop *)")
        program.append("IF bStop THEN")
        for axis in axes:
            name = axis.get('name', 'Axis1')
            program.append(f"    fb{name}_Stop(Axis := {name}, Execute := TRUE, Deceleration := 50000);")
        program.append("END_IF")
        program.append("")

        program.append("END_PROGRAM")

        return "\n".join(program)

    def _prettify(self, elem: Element) -> str:
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

---

## Cam Profile Builder

```python
# m258_generator/services/cam_profile_builder.py
from typing import Dict, List
import math

class M258CamProfileBuilder:
    """Build electronic cam profiles for M258."""

    def generate_cam_xml(self, cam_data: Dict) -> str:
        """Generate cam profile XML."""

        lines = ['<?xml version="1.0" encoding="utf-8"?>']
        lines.append('<CamProfile>')
        lines.append(f'  <Name>{cam_data.get("name", "Cam1")}</Name>')
        lines.append(f'  <Interpolation>{cam_data.get("interpolation", "SPLINE")}</Interpolation>')
        lines.append(f'  <Periodic>{str(cam_data.get("periodic", True)).lower()}</Periodic>')
        lines.append('  <Points>')

        for point in cam_data.get('points', []):
            lines.append('    <Point>')
            lines.append(f'      <Master>{point[0]}</Master>')
            lines.append(f'      <Slave>{point[1]}</Slave>')
            lines.append('    </Point>')

        lines.append('  </Points>')
        lines.append('</CamProfile>')

        return '\n'.join(lines)

    def generate_sinusoidal_cam(
        self,
        name: str,
        master_range: float = 360.0,
        slave_amplitude: float = 100.0,
        points: int = 360
    ) -> Dict:
        """Generate sinusoidal cam profile."""

        cam_points = []
        for i in range(points + 1):
            master = (i / points) * master_range
            slave = slave_amplitude * math.sin(math.radians(master))
            cam_points.append([round(master, 3), round(slave, 3)])

        return {
            'name': name,
            'points': cam_points,
            'interpolation': 'SPLINE',
            'periodic': True
        }

    def generate_modified_sine_cam(
        self,
        name: str,
        master_range: float = 360.0,
        rise: float = 100.0,
        dwell_start: float = 0.0,
        dwell_end: float = 0.0,
        points: int = 360
    ) -> Dict:
        """Generate modified sine (dwell-rise-dwell) cam profile."""

        cam_points = []
        rise_portion = master_range - dwell_start - dwell_end

        for i in range(points + 1):
            master = (i / points) * master_range

            if master <= dwell_start:
                # First dwell
                slave = 0.0
            elif master <= dwell_start + rise_portion:
                # Rise portion (modified sine)
                angle = ((master - dwell_start) / rise_portion) * 180
                slave = rise * (angle / 180 - math.sin(math.radians(2 * angle)) / (2 * math.pi))
            else:
                # Second dwell
                slave = rise

            cam_points.append([round(master, 3), round(slave, 3)])

        return {
            'name': name,
            'points': cam_points,
            'interpolation': 'SPLINE',
            'periodic': False
        }
```

---

## Django Views

```python
# m258_generator/views.py
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
import json

from .models import M258Project, M258Axis
from .services.claude_service import ClaudeM258Service
from .services.smbp_generator import M258SMBPGenerator


class GenerateM258View(View):
    """API endpoint for generating M258 motion programs."""

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        project = M258Project.objects.create(
            name=data.get('name', 'M258_Motion'),
            controller=data.get('controller', 'TM258LF42DT'),
            user_specification=data.get('specification', ''),
            motion_bus=data.get('motion_bus', 'SERCOS'),
            axis_count=data.get('axis_count', 1),
            cycle_time_ms=data.get('cycle_time', 1.0),
            enable_interpolation=data.get('interpolation', False),
            enable_cam=data.get('cam', False),
            enable_gearing=data.get('gearing', False),
        )

        claude_service = ClaudeM258Service()
        logic_data = claude_service.generate_motion_program(
            specification=project.user_specification,
            controller=project.controller,
            axis_count=project.axis_count
        )

        # Create axis records
        for axis_data in logic_data.get('axes', []):
            M258Axis.objects.create(
                project=project,
                axis_number=axis_data.get('number', 1),
                name=axis_data.get('name', 'Axis'),
                axis_type=axis_data.get('type', 'LINEAR'),
                drive_type=axis_data.get('drive_type', 'LEXIUM32'),
                max_velocity=axis_data.get('max_velocity', 1000),
                max_acceleration=axis_data.get('max_acceleration', 10000),
            )

        generator = M258SMBPGenerator(project)
        zip_content = generator.generate(logic_data)
        project.generated_zip = zip_content
        project.save()

        return JsonResponse({
            'success': True,
            'project_id': str(project.id),
            'axis_count': project.axis_count,
            'motion_bus': project.motion_bus,
            'download_url': f'/api/m258/download/{project.id}/'
        })
```

---

## Usage Example

```python
import requests

response = requests.post('http://localhost:8000/api/m258/generate/', json={
    'name': 'PackagingMachine',
    'controller': 'TM258LF42DT',
    'specification': '''
        Create a 4-axis packaging machine control:
        - Axis 1: Infeed conveyor (linear, velocity control)
        - Axis 2: Rotary table (rotary, indexing)
        - Axis 3: Pick and place Z (linear, position control)
        - Axis 4: Pick and place X (linear, position control)

        Include:
        - Coordinated XZ motion for pick/place
        - Electronic cam for table indexing synchronized to infeed
        - Homing sequence for all axes
        - Safety interlocks
    ''',
    'motion_bus': 'SERCOS',
    'axis_count': 4,
    'cycle_time': 1.0,
    'interpolation': True,
    'cam': True
})

print(response.json())
```

---

## Version History

- **v1.0** (2025-12-25): Initial M258 skill with Django + Claude API, motion focus

---

**PLCAutoPilot Schneider M258 Skill v1.0 | 2025-12-25 | github.com/chatgptnotes/plcautopilot.com**
