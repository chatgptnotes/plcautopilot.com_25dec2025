# Schneider M580 PLC Programming Skill

## Expert Agent for Modicon M580 Safety and ePAC Controllers with Django and Claude API

---

## Metadata

```yaml
name: schneider-m580
description: Expert agent for Schneider Electric Modicon M580 ePAC and Safety Controllers using Django and Claude API
version: 1.0
platform: Windows
target_controllers: BMEP581020, BMEP582020, BMEP582040, BMEP583040, BMEP584040, BMEH582040S (Safety)
file_formats: .stu, .xef (Control Expert)
programming_languages: Ladder (LD), IL, ST, SFC, FBD, CFC
specialty: Safety SIL3, Ethernet backbone, cybersecurity, process automation
standards: IEC 61131-3, IEC 61508 SIL3, IEC 62443, ISA-88
framework: Django
ai_engine: Claude API (claude-3-haiku-20240307)
```

---

## Activation Keywords

Activate this skill when user mentions:
- M580, Modicon M580, ePAC
- BMEP581020, BMEP582020, BMEP584040
- BMEH582040S, Safety PLC
- SIL3 controller
- Control Expert M580
- Ethernet backbone PLC
- High availability Schneider
- Cybersecurity PLC Schneider

---

## M580 Overview

The Modicon M580 is Schneider's **flagship ePAC (Programmable Automation Controller)**:

| Feature | M340 | M580 |
|---------|------|------|
| Architecture | Bus-based | Ethernet backbone |
| I/O Capacity | 1,024 | 12,288 |
| Safety | No | SIL3 certified |
| Cybersecurity | Basic | IEC 62443 SL2 |
| Redundancy | Hot Standby | Hot Standby + HSBY+ |
| Performance | Standard | High-performance |
| RIO | Modbus | Native Ethernet |

### Key Capabilities
- Native Ethernet I/O backbone
- SIL3 safety certified (BMEH series)
- IEC 62443 cybersecurity certified
- Hot standby and HSBY+ redundancy
- Up to 12,288 I/O points
- Deterministic Ethernet communication

---

## Django Project Structure

```
plcautopilot/
├── m580_generator/
│   ├── __init__.py
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── claude_service.py
│   │   ├── control_expert_generator.py
│   │   ├── safety_builder.py
│   │   ├── cybersecurity_config.py
│   │   └── ethernet_backbone.py
│   └── templates/
└── requirements.txt
```

---

## Django Models

```python
# m580_generator/models.py
from django.db import models
import uuid

class M580Project(models.Model):
    """Django model for Modicon M580 ePAC projects"""

    CPU_CHOICES = [
        # Standard ePAC
        ('BMEP581020', 'BMEP581020 - Entry (1 ETH, 1 USB)'),
        ('BMEP582020', 'BMEP582020 - Standard (2 ETH, 1 USB)'),
        ('BMEP582040', 'BMEP582040 - Performance (2 ETH, 1 USB)'),
        ('BMEP583040', 'BMEP583040 - High Perf (3 ETH, 1 USB)'),
        ('BMEP584040', 'BMEP584040 - Premium (4 ETH, 1 USB, SD)'),
        # Safety ePAC
        ('BMEH582040S', 'BMEH582040S - Safety SIL3'),
        ('BMEH584040S', 'BMEH584040S - Safety SIL3 Premium'),
    ]

    REDUNDANCY_MODES = [
        ('NONE', 'No Redundancy'),
        ('HOT_STANDBY', 'Hot Standby'),
        ('HSBY_PLUS', 'HSBY+ (Enhanced)'),
    ]

    SECURITY_LEVELS = [
        ('SL0', 'No Security'),
        ('SL1', 'Security Level 1'),
        ('SL2', 'Security Level 2 (IEC 62443)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    cpu = models.CharField(max_length=20, choices=CPU_CHOICES, default='BMEP582040')
    description = models.TextField(blank=True)
    user_specification = models.TextField()

    # Safety Configuration (for BMEH series)
    is_safety = models.BooleanField(default=False)
    sil_level = models.CharField(max_length=10, default='SIL3')
    safety_program_enabled = models.BooleanField(default=False)

    # Ethernet Backbone
    rio_drop_count = models.PositiveIntegerField(default=0)

    # Redundancy
    redundancy_mode = models.CharField(max_length=20, choices=REDUNDANCY_MODES, default='NONE')

    # Cybersecurity
    security_level = models.CharField(max_length=10, choices=SECURITY_LEVELS, default='SL1')
    enable_audit = models.BooleanField(default=True)
    enable_encryption = models.BooleanField(default=True)

    # Network
    service_port_ip = models.GenericIPAddressField(default='192.168.1.10')
    backplane_ip = models.GenericIPAddressField(default='192.168.10.1')

    generated_file = models.BinaryField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'M580 Project'


class M580RIODrop(models.Model):
    """Remote I/O Drop on Ethernet backbone"""

    DROP_TYPES = [
        ('BMENOS0300', 'RIO Drop Adapter 3 slots'),
        ('BMEXBP0400', 'RIO Drop Adapter 4 slots'),
        ('BMEXBP0800', 'RIO Drop Adapter 8 slots'),
        ('BMEXBP1200', 'RIO Drop Adapter 12 slots'),
    ]

    project = models.ForeignKey(M580Project, on_delete=models.CASCADE, related_name='rio_drops')
    drop_number = models.PositiveIntegerField()
    drop_type = models.CharField(max_length=20, choices=DROP_TYPES)
    ip_address = models.GenericIPAddressField()
    ring_member = models.BooleanField(default=True)


class M580SafetyProgram(models.Model):
    """Safety program for SIL3 applications"""

    project = models.ForeignKey(M580Project, on_delete=models.CASCADE, related_name='safety_programs')
    name = models.CharField(max_length=50)
    sil_level = models.CharField(max_length=10, default='SIL3')
    safe_state_description = models.TextField()
    source_code = models.TextField()
    safety_inputs = models.JSONField(default=list)
    safety_outputs = models.JSONField(default=list)
    watchdog_time_ms = models.PositiveIntegerField(default=100)


class M580User(models.Model):
    """User account for M580 cybersecurity"""

    ROLE_CHOICES = [
        ('ADMINISTRATOR', 'Administrator'),
        ('ENGINEER', 'Engineer'),
        ('MAINTENANCE', 'Maintenance'),
        ('OPERATOR', 'Operator'),
        ('VIEWER', 'Viewer'),
    ]

    project = models.ForeignKey(M580Project, on_delete=models.CASCADE, related_name='users')
    username = models.CharField(max_length=50)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    can_modify_safety = models.BooleanField(default=False)
    session_timeout = models.PositiveIntegerField(default=300)
```

---

## Claude API Service for M580

```python
# m580_generator/services/claude_service.py
import anthropic
import os
import json
from typing import Dict, Any, List

class ClaudeM580Service:
    """
    Claude API service for Modicon M580 ePAC.
    Specialized for safety, cybersecurity, and high-performance applications.
    """

    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.environ.get('ANTHROPIC_API_KEY')
        )
        self.model = os.environ.get('CLAUDE_MODEL', 'claude-3-haiku-20240307')

    def generate_epac_program(
        self,
        specification: str,
        cpu: str,
        is_safety: bool = False,
        security_level: str = 'SL1'
    ) -> Dict[str, Any]:
        """Generate M580 ePAC program."""

        system_prompt = self._get_m580_system_prompt(cpu, is_safety, security_level)

        message = self.client.messages.create(
            model=self.model,
            max_tokens=8192,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate program for Modicon M580 ePAC:

{specification}

CPU: {cpu}
Safety Enabled: {is_safety}
Security Level: {security_level}

Include in JSON response:
1. "ethernet_backbone": RIO drop configuration
2. "standard_programs": Non-safety program sections
3. "safety_programs": Safety program sections (if applicable)
4. "dfbs": Derived Function Blocks
5. "io_mapping": Complete I/O symbol table
6. "network_config": Ethernet port configuration
7. "security_config": Cybersecurity settings
8. "redundancy_config": HSBY configuration if applicable
9. "diagnostics": System diagnostics setup"""
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
            return {"error": "Parse failed", "standard_programs": []}

    def generate_safety_program(
        self,
        function_name: str,
        safe_state: str,
        safety_inputs: List[Dict],
        safety_outputs: List[Dict],
        logic_description: str
    ) -> Dict[str, Any]:
        """Generate SIL3 safety program using Claude."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate SIL3 safety program for M580 Safety ePAC:

Function Name: {function_name}
Safe State: {safe_state}

Safety Inputs:
{json.dumps(safety_inputs, indent=2)}

Safety Outputs:
{json.dumps(safety_outputs, indent=2)}

Logic Description:
{logic_description}

Requirements:
1. Follow IEC 61508 SIL3 guidelines
2. Include diagnostic coverage
3. Implement safe state on any failure
4. Use dual-channel redundancy where needed
5. Include watchdog timer
6. Add comments for safety review

Return JSON with:
- 'source_code': FBD-compatible safety logic
- 'diagnostics': Diagnostic test routines
- 'safe_state_logic': Safe state implementation"""
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
            return {"source_code": "", "diagnostics": "", "safe_state_logic": ""}

    def generate_cybersecurity_config(
        self,
        security_level: str,
        users: List[Dict],
        network_zones: List[Dict]
    ) -> Dict[str, Any]:
        """Generate IEC 62443 cybersecurity configuration."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate IEC 62443 cybersecurity configuration for M580:

Security Level: {security_level}

Users:
{json.dumps(users, indent=2)}

Network Zones:
{json.dumps(network_zones, indent=2)}

Include:
1. User role definitions with permissions
2. Password policies
3. Session management
4. Audit trail configuration
5. Network firewall rules
6. Encryption settings
7. Certificate management

Return JSON configuration."""
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
            return {"users": [], "policies": {}}

    def _get_m580_system_prompt(self, cpu: str, is_safety: bool, security_level: str) -> str:
        """System prompt for M580 ePAC programming."""

        safety_info = ""
        if is_safety or cpu.startswith('BMEH'):
            safety_info = """
SAFETY PROGRAMMING (SIL3):
- Use SAFE_ prefixed function blocks
- Implement dual-channel I/O
- Include diagnostic coverage
- Define safe states for all outputs
- Use safety-rated I/O modules only
- Separate SAFE program from standard
- Maximum reaction time considerations

SAFE FUNCTION BLOCKS:
- SAFE_AND, SAFE_OR, SAFE_NOT
- SAFE_TON, SAFE_TOF
- SAFE_MUX, SAFE_SEL
- SAFE_ESTOP (emergency stop)
- SAFE_GUARD (guard monitoring)
- SAFE_2HAND (two-hand control)
"""

        return f"""You are an expert automation programmer for Schneider Electric Modicon M580 ePAC.

TARGET CPU: {cpu}
SAFETY: {is_safety}
SECURITY LEVEL: {security_level}

M580 ARCHITECTURE:
- Native Ethernet backbone (no bus)
- RIO drops connected via Ethernet ring
- Deterministic communication (QoS)
- Up to 31 RIO drops per ring
- Up to 12,288 I/O points

ETHERNET PORTS:
- Service Port: Engineering access
- Backplane Port: I/O backbone
- Device Network: Field devices
- Control Network: Peer controllers

PROGRAMMING:
- Control Expert IDE
- Languages: LD, ST, FBD, SFC, IL, CFC
- Tasks: MAST, FAST, AUX, SAFE, Event

I/O ADDRESSING:
- Local: %I0.x.y (slot.channel)
- RIO: %I\[drop]\0.x.y (drop.slot.channel)
- Topological: %I\ip\0.x.y

CYBERSECURITY (IEC 62443):
- Role-based access control
- Encrypted communications
- Audit trail logging
- Secure boot
- Firewall per port
- Certificate management
{safety_info}
REDUNDANCY:
- Hot Standby: Primary/Standby CPUs
- HSBY+: Bumpless switchover
- Sync via dedicated Ethernet

OUTPUT: Valid JSON with Control Expert compatible structure."""
```

---

## Safety Builder Service

```python
# m580_generator/services/safety_builder.py
from typing import Dict, List
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

class M580SafetyBuilder:
    """Build SIL3 safety programs for M580."""

    def __init__(self, sil_level: str = 'SIL3'):
        self.sil_level = sil_level

    def generate_safety_program_xml(self, programs: List[Dict]) -> str:
        """Generate safety program section XML."""

        root = Element('SafetyPrograms')
        SubElement(root, 'SILLevel').text = self.sil_level

        for prog in programs:
            program = SubElement(root, 'SafetyProgram')
            SubElement(program, 'Name').text = prog.get('name')
            SubElement(program, 'SafeState').text = prog.get('safe_state', 'All outputs OFF')
            SubElement(program, 'WatchdogTime').text = str(prog.get('watchdog_ms', 100))

            # Safety inputs
            inputs = SubElement(program, 'SafetyInputs')
            for inp in prog.get('safety_inputs', []):
                si = SubElement(inputs, 'SafeInput')
                SubElement(si, 'Name').text = inp.get('name')
                SubElement(si, 'Address').text = inp.get('address')
                SubElement(si, 'Type').text = inp.get('type', 'SingleChannel')
                SubElement(si, 'DiagCoverage').text = str(inp.get('dc', 99))

            # Safety outputs
            outputs = SubElement(program, 'SafetyOutputs')
            for out in prog.get('safety_outputs', []):
                so = SubElement(outputs, 'SafeOutput')
                SubElement(so, 'Name').text = out.get('name')
                SubElement(so, 'Address').text = out.get('address')
                SubElement(so, 'SafeState').text = str(out.get('safe_state', 0))

            # Logic
            body = SubElement(program, 'Body')
            SubElement(body, 'FBD').text = prog.get('source_code', '')

        return self._prettify(root)

    def generate_estop_logic(
        self,
        estop_inputs: List[str],
        safe_outputs: List[str]
    ) -> str:
        """Generate emergency stop logic in ST."""

        code = []
        code.append("(* Emergency Stop Safety Function *)")
        code.append("(* SIL3 Certified Logic *)")
        code.append("")

        # Input voting (2oo2 for dual channel)
        code.append("(* E-Stop Input Processing - Dual Channel *)")
        for i, inp in enumerate(estop_inputs):
            if i % 2 == 0 and i + 1 < len(estop_inputs):
                code.append(f"ESTOP_OK_{i//2} := {estop_inputs[i]} AND {estop_inputs[i+1]};")

        code.append("")
        code.append("(* Combined E-Stop Status *)")
        estop_vars = [f"ESTOP_OK_{i}" for i in range(len(estop_inputs)//2)]
        if estop_vars:
            code.append(f"ESTOP_CHAIN_OK := {' AND '.join(estop_vars)};")
        else:
            code.append("ESTOP_CHAIN_OK := TRUE;")

        code.append("")
        code.append("(* Safe Output Control *)")
        for out in safe_outputs:
            code.append(f"{out} := ESTOP_CHAIN_OK AND RUN_PERMITTED;")

        code.append("")
        code.append("(* Diagnostic Check *)")
        code.append("DIAG_OK := NOT (ESTOP_CH1 XOR ESTOP_CH2);  (* Channel discrepancy *)")
        code.append("IF NOT DIAG_OK THEN")
        code.append("    FAULT_WORD := FAULT_WORD OR 16#0001;  (* Channel mismatch *)")
        code.append("END_IF;")

        return "\n".join(code)

    def generate_guard_monitoring(
        self,
        guard_name: str,
        guard_input_ch1: str,
        guard_input_ch2: str,
        associated_output: str
    ) -> str:
        """Generate guard monitoring logic."""

        code = []
        code.append(f"(* {guard_name} Guard Monitoring - SIL3 *)")
        code.append("")
        code.append(f"(* Dual channel guard input processing *)")
        code.append(f"{guard_name}_CH1 := {guard_input_ch1};")
        code.append(f"{guard_name}_CH2 := {guard_input_ch2};")
        code.append("")
        code.append(f"(* Guard closed = both channels TRUE *)")
        code.append(f"{guard_name}_CLOSED := {guard_name}_CH1 AND {guard_name}_CH2;")
        code.append("")
        code.append(f"(* Discrepancy detection *)")
        code.append(f"{guard_name}_DISCREPANCY := {guard_name}_CH1 XOR {guard_name}_CH2;")
        code.append(f"IF {guard_name}_DISCREPANCY THEN")
        code.append(f"    {guard_name}_DISCREPANCY_TMR(IN := TRUE, PT := T#500MS);")
        code.append(f"ELSE")
        code.append(f"    {guard_name}_DISCREPANCY_TMR(IN := FALSE);")
        code.append(f"END_IF;")
        code.append("")
        code.append(f"(* Fault if discrepancy persists *)")
        code.append(f"{guard_name}_FAULT := {guard_name}_DISCREPANCY_TMR.Q;")
        code.append("")
        code.append(f"(* Output control *)")
        code.append(f"{associated_output} := {guard_name}_CLOSED AND NOT {guard_name}_FAULT;")

        return "\n".join(code)

    def _prettify(self, elem: Element) -> str:
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

---

## Cybersecurity Configuration Service

```python
# m580_generator/services/cybersecurity_config.py
from typing import Dict, List
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

class M580CybersecurityBuilder:
    """Build IEC 62443 cybersecurity configuration for M580."""

    def __init__(self, security_level: str = 'SL1'):
        self.security_level = security_level

    def generate_security_config_xml(self, config: Dict) -> str:
        """Generate complete cybersecurity configuration."""

        root = Element('CybersecurityConfiguration')
        SubElement(root, 'SecurityLevel').text = self.security_level
        SubElement(root, 'Standard').text = 'IEC 62443'

        # User Management
        users = SubElement(root, 'UserManagement')
        self._build_users(users, config.get('users', []))

        # Password Policy
        password = SubElement(root, 'PasswordPolicy')
        self._build_password_policy(password, config.get('password_policy', {}))

        # Session Management
        session = SubElement(root, 'SessionManagement')
        self._build_session_policy(session, config.get('session_policy', {}))

        # Audit Trail
        audit = SubElement(root, 'AuditTrail')
        self._build_audit_config(audit, config.get('audit', {}))

        # Network Security
        network = SubElement(root, 'NetworkSecurity')
        self._build_network_security(network, config.get('network', {}))

        # Encryption
        encryption = SubElement(root, 'Encryption')
        self._build_encryption_config(encryption, config.get('encryption', {}))

        return self._prettify(root)

    def _build_users(self, parent: Element, users: List[Dict]) -> None:
        """Build user configuration."""

        # Predefined roles
        roles = SubElement(parent, 'Roles')
        role_defs = [
            ('ADMINISTRATOR', 'Full system access'),
            ('ENGINEER', 'Programming and configuration'),
            ('MAINTENANCE', 'Diagnostics and tuning'),
            ('OPERATOR', 'Runtime operation only'),
            ('VIEWER', 'Read-only access'),
        ]
        for role_name, desc in role_defs:
            role = SubElement(roles, 'Role')
            SubElement(role, 'Name').text = role_name
            SubElement(role, 'Description').text = desc

        # Users
        users_elem = SubElement(parent, 'Users')
        for user in users:
            u = SubElement(users_elem, 'User')
            SubElement(u, 'Username').text = user.get('username')
            SubElement(u, 'Role').text = user.get('role')
            SubElement(u, 'Enabled').text = str(user.get('enabled', True)).lower()
            if user.get('can_modify_safety') is not None:
                SubElement(u, 'CanModifySafety').text = str(user['can_modify_safety']).lower()

    def _build_password_policy(self, parent: Element, policy: Dict) -> None:
        """Build password policy configuration."""

        SubElement(parent, 'MinLength').text = str(policy.get('min_length', 12))
        SubElement(parent, 'RequireUppercase').text = 'true'
        SubElement(parent, 'RequireLowercase').text = 'true'
        SubElement(parent, 'RequireNumber').text = 'true'
        SubElement(parent, 'RequireSpecial').text = 'true'
        SubElement(parent, 'MaxAge').text = str(policy.get('max_age_days', 90))
        SubElement(parent, 'HistoryCount').text = str(policy.get('history', 12))
        SubElement(parent, 'LockoutThreshold').text = str(policy.get('lockout_attempts', 5))
        SubElement(parent, 'LockoutDuration').text = str(policy.get('lockout_minutes', 30))

    def _build_session_policy(self, parent: Element, policy: Dict) -> None:
        """Build session management configuration."""

        SubElement(parent, 'Timeout').text = str(policy.get('timeout_seconds', 300))
        SubElement(parent, 'MaxConcurrentSessions').text = str(policy.get('max_sessions', 3))
        SubElement(parent, 'RequireReauth').text = 'true'
        SubElement(parent, 'ReauthInterval').text = str(policy.get('reauth_hours', 8))

    def _build_audit_config(self, parent: Element, config: Dict) -> None:
        """Build audit trail configuration."""

        SubElement(parent, 'Enabled').text = 'true'
        SubElement(parent, 'RetentionDays').text = str(config.get('retention_days', 365))
        SubElement(parent, 'MaxSize').text = str(config.get('max_size_mb', 100))

        events = SubElement(parent, 'Events')
        audit_events = [
            'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
            'CONFIG_CHANGE', 'PROGRAM_DOWNLOAD', 'PROGRAM_UPLOAD',
            'FIRMWARE_UPDATE', 'MODE_CHANGE', 'FORCE_VARIABLE',
            'SAFETY_PROGRAM_CHANGE', 'SECURITY_VIOLATION',
            'USER_CREATE', 'USER_DELETE', 'PASSWORD_CHANGE',
            'CERTIFICATE_CHANGE', 'NETWORK_CONFIG_CHANGE'
        ]
        for event in audit_events:
            e = SubElement(events, 'Event')
            SubElement(e, 'Type').text = event
            SubElement(e, 'Enabled').text = 'true'

    def _build_network_security(self, parent: Element, config: Dict) -> None:
        """Build network security configuration."""

        # Firewall rules per port
        for port in ['ServicePort', 'BackplanePort', 'DeviceNetwork', 'ControlNetwork']:
            port_elem = SubElement(parent, port)
            SubElement(port_elem, 'FirewallEnabled').text = 'true'
            SubElement(port_elem, 'DefaultPolicy').text = 'DENY'

            rules = SubElement(port_elem, 'Rules')
            # Allow specific protocols
            if port == 'ServicePort':
                self._add_firewall_rule(rules, 'TCP', 502, 'Allow Modbus')
                self._add_firewall_rule(rules, 'TCP', 44818, 'Allow EtherNet/IP')
            elif port == 'BackplanePort':
                self._add_firewall_rule(rules, 'UDP', 2222, 'Allow RIO')

    def _add_firewall_rule(self, parent: Element, protocol: str, port: int, desc: str) -> None:
        """Add firewall rule."""
        rule = SubElement(parent, 'Rule')
        SubElement(rule, 'Protocol').text = protocol
        SubElement(rule, 'Port').text = str(port)
        SubElement(rule, 'Action').text = 'ALLOW'
        SubElement(rule, 'Description').text = desc

    def _build_encryption_config(self, parent: Element, config: Dict) -> None:
        """Build encryption configuration."""

        SubElement(parent, 'TLSEnabled').text = 'true'
        SubElement(parent, 'TLSVersion').text = '1.3'
        SubElement(parent, 'CipherSuite').text = 'TLS_AES_256_GCM_SHA384'

        certs = SubElement(parent, 'Certificates')
        SubElement(certs, 'RootCA').text = config.get('root_ca', 'PlantRootCA')
        SubElement(certs, 'DeviceCert').text = config.get('device_cert', 'M580_Device')

    def _prettify(self, elem: Element) -> str:
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

---

## Django Views

```python
# m580_generator/views.py
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
import json

from .models import M580Project
from .services.claude_service import ClaudeM580Service
from .services.control_expert_generator import M580ControlExpertGenerator


class GenerateM580View(View):
    """API endpoint for generating M580 ePAC programs."""

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        cpu = data.get('cpu', 'BMEP582040')
        is_safety = cpu.startswith('BMEH')

        project = M580Project.objects.create(
            name=data.get('name', 'M580_Project'),
            cpu=cpu,
            user_specification=data.get('specification', ''),
            is_safety=is_safety,
            safety_program_enabled=data.get('safety_enabled', is_safety),
            rio_drop_count=data.get('rio_drops', 0),
            redundancy_mode=data.get('redundancy', 'NONE'),
            security_level=data.get('security_level', 'SL1'),
            service_port_ip=data.get('service_ip', '192.168.1.10'),
            backplane_ip=data.get('backplane_ip', '192.168.10.1'),
        )

        claude_service = ClaudeM580Service()
        logic_data = claude_service.generate_epac_program(
            specification=project.user_specification,
            cpu=project.cpu,
            is_safety=project.is_safety,
            security_level=project.security_level
        )

        # Generate cybersecurity configuration
        if project.security_level != 'SL0':
            security_config = claude_service.generate_cybersecurity_config(
                security_level=project.security_level,
                users=data.get('users', []),
                network_zones=data.get('network_zones', [])
            )
            logic_data['security_config'] = security_config

        generator = M580ControlExpertGenerator(project)
        xef_content = generator.generate_xef(logic_data)
        project.generated_file = xef_content
        project.save()

        return JsonResponse({
            'success': True,
            'project_id': str(project.id),
            'cpu': project.cpu,
            'is_safety': project.is_safety,
            'security_level': project.security_level,
            'download_url': f'/api/m580/download/{project.id}/'
        })


class DownloadM580View(View):
    """Download generated .xef file."""

    def get(self, request, project_id):
        project = get_object_or_404(M580Project, id=project_id)

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

response = requests.post('http://localhost:8000/api/m580/generate/', json={
    'name': 'SafetyPress_Cell',
    'cpu': 'BMEH582040S',
    'specification': '''
        Create a SIL3 safety system for a hydraulic press cell:
        - Dual-channel E-Stop (4 buttons)
        - Light curtain guard
        - Two-hand control for operator
        - Interlock for safety door
        - Safe output for hydraulic valve

        Include:
        - Safety program with all interlocks
        - Standard control program for sequence
        - Ethernet backbone with 2 RIO drops
        - IEC 62443 SL2 cybersecurity
        - Hot standby redundancy
    ''',
    'safety_enabled': True,
    'redundancy': 'HOT_STANDBY',
    'security_level': 'SL2',
    'rio_drops': 2,
    'users': [
        {'username': 'admin', 'role': 'ADMINISTRATOR'},
        {'username': 'safety_eng', 'role': 'ENGINEER', 'can_modify_safety': True},
        {'username': 'operator', 'role': 'OPERATOR'}
    ]
})

print(response.json())
```

---

## M580 I/O Addressing Reference

```
Local Rack:
%I0.1.0 to %I0.1.15   - Slot 1, 16 inputs
%Q0.2.0 to %Q0.2.15   - Slot 2, 16 outputs

RIO Drop (Ethernet):
%I\192.168.10.10\0.1.0  - Drop at IP, slot 1, channel 0
%I\1\0.1.0             - Drop number 1, slot 1, channel 0

Safety I/O:
%SAFEI0.1.0            - Safety input
%SAFEQ0.2.0            - Safety output
```

---

## Version History

- **v1.0** (2025-12-25): Initial M580 skill with Django + Claude API, safety and cybersecurity focus

---

**PLCAutoPilot Schneider M580 Skill v1.0 | 2025-12-25 | github.com/chatgptnotes/plcautopilot.com**
