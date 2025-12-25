# Schneider M251 PLC Programming Skill

## Expert Agent for M251 Controllers with Django and Claude API

---

## Metadata

```yaml
name: schneider-m251
description: Expert agent for Schneider Electric M251 Logic Controller using Django and Claude API
version: 1.0
platform: Windows
target_controllers: TM251MESE, TM251MESC, TM251MESE1, TM251MESC1
file_formats: .smbp (ZIP-based archive)
programming_languages: Ladder (LD), IL, ST, SFC, FBD
standards: IEC 61131-3, IEC 61508, IEC 62443
framework: Django
ai_engine: Claude API (claude-3-haiku-20240307)
```

---

## Activation Keywords

Activate this skill when user mentions:
- M251, TM251
- TM251MESE, TM251MESC
- Machine Expert M251
- Dual Ethernet PLC
- OPC UA embedded
- Cybersecurity PLC

---

## M251 Unique Features

The M251 is the **cybersecurity-focused** controller in the Modicon M2xx family:

| Feature | M241 | M251 |
|---------|------|------|
| Dual Ethernet | No | Yes (separate networks) |
| OPC UA Server | Optional | Built-in |
| Cybersecurity | Basic | IEC 62443 certified |
| User Management | Limited | Full RBAC |
| Audit Trail | No | Yes |
| Secure Boot | No | Yes |

---

## Django Project Structure

```
plcautopilot/
├── m251_generator/
│   ├── __init__.py
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── claude_service.py
│   │   ├── smbp_generator.py
│   │   ├── security_config.py
│   │   └── opcua_builder.py
│   └── templates/
└── requirements.txt
```

---

## Django Models

```python
# m251_generator/models.py
from django.db import models
import uuid

class M251Project(models.Model):
    """Django model for M251 Logic Controller projects"""

    CONTROLLER_CHOICES = [
        ('TM251MESE', 'TM251MESE - Standard Ethernet'),
        ('TM251MESC', 'TM251MESC - CANopen + Ethernet'),
        ('TM251MESE1', 'TM251MESE1 - Enhanced Security'),
        ('TM251MESC1', 'TM251MESC1 - CANopen + Enhanced Security'),
    ]

    SECURITY_LEVELS = [
        ('NONE', 'No Security'),
        ('BASIC', 'Basic Authentication'),
        ('STANDARD', 'Standard (IEC 62443 SL1)'),
        ('ENHANCED', 'Enhanced (IEC 62443 SL2)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    controller = models.CharField(max_length=20, choices=CONTROLLER_CHOICES, default='TM251MESE')
    description = models.TextField(blank=True)
    user_specification = models.TextField()

    # Dual Ethernet Configuration
    eth1_ip = models.GenericIPAddressField(default='192.168.1.10')
    eth1_subnet = models.GenericIPAddressField(default='255.255.255.0')
    eth1_purpose = models.CharField(max_length=50, default='Control Network')
    eth2_ip = models.GenericIPAddressField(default='10.0.0.10')
    eth2_subnet = models.GenericIPAddressField(default='255.255.255.0')
    eth2_purpose = models.CharField(max_length=50, default='IT/OPC UA Network')

    # Security Configuration
    security_level = models.CharField(max_length=20, choices=SECURITY_LEVELS, default='STANDARD')
    enable_audit_trail = models.BooleanField(default=True)
    enable_secure_boot = models.BooleanField(default=True)

    # OPC UA Configuration
    opcua_enabled = models.BooleanField(default=True)
    opcua_port = models.PositiveIntegerField(default=4840)
    opcua_security_mode = models.CharField(max_length=50, default='SignAndEncrypt')

    # CANopen (for MESC variants)
    canopen_enabled = models.BooleanField(default=False)

    generated_zip = models.BinaryField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'M251 Project'


class M251User(models.Model):
    """User account for M251 RBAC"""

    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('ENGINEER', 'Engineer'),
        ('OPERATOR', 'Operator'),
        ('VIEWER', 'Viewer'),
    ]

    project = models.ForeignKey(M251Project, on_delete=models.CASCADE, related_name='users')
    username = models.CharField(max_length=50)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    password_hash = models.CharField(max_length=255)  # Stored securely
    enabled = models.BooleanField(default=True)


class M251OPCUANode(models.Model):
    """OPC UA node configuration"""

    NODE_TYPES = [
        ('Variable', 'Variable Node'),
        ('Object', 'Object Node'),
        ('Method', 'Method Node'),
    ]

    project = models.ForeignKey(M251Project, on_delete=models.CASCADE, related_name='opcua_nodes')
    name = models.CharField(max_length=100)
    node_type = models.CharField(max_length=20, choices=NODE_TYPES)
    namespace = models.CharField(max_length=100, default='urn:schneider:m251')
    plc_address = models.CharField(max_length=50)
    data_type = models.CharField(max_length=20)
    access_level = models.CharField(max_length=20, default='ReadWrite')
```

---

## Claude API Service for M251

```python
# m251_generator/services/claude_service.py
import anthropic
import os
import json
from typing import Dict, Any

class ClaudeM251Service:
    """
    Claude API service for M251 Logic Controller.
    Specialized for cybersecurity and OPC UA integration.
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
        security_level: str = 'STANDARD'
    ) -> Dict[str, Any]:
        """Generate M251 program with security considerations."""

        system_prompt = self._get_m251_system_prompt(controller, security_level)

        message = self.client.messages.create(
            model=self.model,
            max_tokens=8192,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate secure program for M251 ({controller}):

{specification}

Security Level: {security_level}

Include in JSON response:
1. "programs": Program units with security annotations
2. "variables": Variable declarations with access control
3. "opcua_nodes": OPC UA server configuration
4. "security_config": User roles and permissions
5. "audit_events": Audit trail event definitions
6. "network_config": Dual Ethernet configuration
7. "io_mapping": I/O assignments"""
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
            return {"error": "Parse failed", "programs": [], "opcua_nodes": []}

    def generate_opcua_config(self, variables: list, security_mode: str) -> Dict[str, Any]:
        """Generate OPC UA server configuration."""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": f"""Generate OPC UA server configuration for M251:

Variables to expose:
{json.dumps(variables, indent=2)}

Security Mode: {security_mode}

Include:
1. Node structure (objects, variables, methods)
2. Namespace configuration
3. Security policies
4. User authentication
5. Certificate requirements

Respond with JSON."""
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
            return {"nodes": [], "security": {}}

    def _get_m251_system_prompt(self, controller: str, security_level: str) -> str:
        """System prompt for M251 programming."""

        return f"""You are an expert PLC programmer for Schneider Electric M251 Logic Controller.

TARGET CONTROLLER: {controller}
SECURITY LEVEL: {security_level}

M251 UNIQUE CAPABILITIES:
- Dual Ethernet ports (network segregation)
- Built-in OPC UA server
- IEC 62443 cybersecurity certification
- Role-based access control (RBAC)
- Audit trail logging
- Secure boot mechanism
- Encrypted communications

SECURITY BEST PRACTICES:
1. Segregate control and IT networks
2. Define minimum required permissions
3. Log all security-relevant events
4. Use encrypted protocols
5. Implement timeout policies
6. Validate all inputs

I/O SPECIFICATIONS:
- No built-in I/O (use expansion modules)
- Supports TM2 and TM3 expansion
- Memory: %M0 to %M4095
- Words: %MW0 to %MW9999

OPC UA CONFIGURATION:
- Default port: 4840
- Security modes: None, Sign, SignAndEncrypt
- Authentication: Anonymous, Username, Certificate

OUTPUT: Valid JSON with security-aware program structure."""
```

---

## Security Configuration Service

```python
# m251_generator/services/security_config.py
from typing import Dict, List
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

class M251SecurityConfigBuilder:
    """Build security configuration for M251."""

    def __init__(self, security_level: str):
        self.security_level = security_level

    def generate_user_management_xml(self, users: List[Dict]) -> str:
        """Generate user management configuration."""

        root = Element('UserManagement')
        SubElement(root, 'SecurityLevel').text = self.security_level

        # Password policy
        policy = SubElement(root, 'PasswordPolicy')
        SubElement(policy, 'MinLength').text = '8'
        SubElement(policy, 'RequireUppercase').text = 'true'
        SubElement(policy, 'RequireLowercase').text = 'true'
        SubElement(policy, 'RequireNumber').text = 'true'
        SubElement(policy, 'RequireSpecial').text = 'true'
        SubElement(policy, 'MaxAge').text = '90'
        SubElement(policy, 'HistoryCount').text = '5'

        # Session policy
        session = SubElement(root, 'SessionPolicy')
        SubElement(session, 'Timeout').text = '300'  # 5 minutes
        SubElement(session, 'MaxConcurrent').text = '3'
        SubElement(session, 'LockoutThreshold').text = '5'
        SubElement(session, 'LockoutDuration').text = '900'  # 15 minutes

        # Users
        users_elem = SubElement(root, 'Users')
        for user in users:
            u = SubElement(users_elem, 'User')
            SubElement(u, 'Username').text = user.get('username')
            SubElement(u, 'Role').text = user.get('role')
            SubElement(u, 'Enabled').text = 'true'

        return self._prettify(root)

    def generate_audit_config_xml(self, events: List[str]) -> str:
        """Generate audit trail configuration."""

        root = Element('AuditTrail')
        SubElement(root, 'Enabled').text = 'true'
        SubElement(root, 'RetentionDays').text = '365'
        SubElement(root, 'MaxSize').text = '10485760'  # 10MB

        # Standard events
        standard_events = [
            'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
            'CONFIG_CHANGE', 'FIRMWARE_UPDATE', 'MODE_CHANGE',
            'VARIABLE_WRITE', 'PROGRAM_DOWNLOAD', 'SECURITY_VIOLATION'
        ]

        events_elem = SubElement(root, 'Events')
        for event in standard_events + events:
            e = SubElement(events_elem, 'Event')
            SubElement(e, 'Type').text = event
            SubElement(e, 'Severity').text = 'HIGH' if 'FAILURE' in event or 'VIOLATION' in event else 'INFO'

        return self._prettify(root)

    def generate_network_security_xml(self, eth1_config: Dict, eth2_config: Dict) -> str:
        """Generate network security configuration."""

        root = Element('NetworkSecurity')

        # Ethernet 1 (Control Network)
        eth1 = SubElement(root, 'Ethernet1')
        SubElement(eth1, 'Purpose').text = 'ControlNetwork'
        SubElement(eth1, 'IPAddress').text = eth1_config.get('ip', '192.168.1.10')
        SubElement(eth1, 'SubnetMask').text = eth1_config.get('subnet', '255.255.255.0')

        eth1_acl = SubElement(eth1, 'AccessControlList')
        SubElement(eth1_acl, 'DefaultAction').text = 'Deny'
        # Allow Modbus TCP
        rule1 = SubElement(eth1_acl, 'Rule')
        SubElement(rule1, 'Protocol').text = 'TCP'
        SubElement(rule1, 'Port').text = '502'
        SubElement(rule1, 'Action').text = 'Allow'

        # Ethernet 2 (IT/OPC UA Network)
        eth2 = SubElement(root, 'Ethernet2')
        SubElement(eth2, 'Purpose').text = 'ITNetwork'
        SubElement(eth2, 'IPAddress').text = eth2_config.get('ip', '10.0.0.10')
        SubElement(eth2, 'SubnetMask').text = eth2_config.get('subnet', '255.255.255.0')

        eth2_acl = SubElement(eth2, 'AccessControlList')
        SubElement(eth2_acl, 'DefaultAction').text = 'Deny'
        # Allow OPC UA
        rule2 = SubElement(eth2_acl, 'Rule')
        SubElement(rule2, 'Protocol').text = 'TCP'
        SubElement(rule2, 'Port').text = '4840'
        SubElement(rule2, 'Action').text = 'Allow'

        return self._prettify(root)

    def _prettify(self, elem: Element) -> str:
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

---

## OPC UA Builder Service

```python
# m251_generator/services/opcua_builder.py
from typing import Dict, List
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

class M251OPCUABuilder:
    """Build OPC UA server configuration for M251."""

    def __init__(self, project_name: str, namespace: str = None):
        self.project_name = project_name
        self.namespace = namespace or f"urn:schneider:m251:{project_name}"

    def generate_server_config_xml(
        self,
        nodes: List[Dict],
        security_mode: str = 'SignAndEncrypt',
        port: int = 4840
    ) -> str:
        """Generate OPC UA server configuration."""

        root = Element('OPCUAServer')

        # Server settings
        settings = SubElement(root, 'Settings')
        SubElement(settings, 'Port').text = str(port)
        SubElement(settings, 'MaxSessions').text = '10'
        SubElement(settings, 'MaxSubscriptions').text = '50'
        SubElement(settings, 'PublishingInterval').text = '100'

        # Namespaces
        namespaces = SubElement(root, 'Namespaces')
        ns = SubElement(namespaces, 'Namespace')
        SubElement(ns, 'Uri').text = self.namespace
        SubElement(ns, 'Index').text = '2'

        # Security
        security = SubElement(root, 'Security')
        SubElement(security, 'Mode').text = security_mode

        policies = SubElement(security, 'Policies')
        if security_mode in ['Sign', 'SignAndEncrypt']:
            pol = SubElement(policies, 'Policy')
            SubElement(pol, 'Uri').text = 'http://opcfoundation.org/UA/SecurityPolicy#Basic256Sha256'
            SubElement(pol, 'Mode').text = security_mode

        # Authentication
        auth = SubElement(security, 'Authentication')
        SubElement(auth, 'AllowAnonymous').text = 'false'
        SubElement(auth, 'AllowUsername').text = 'true'
        SubElement(auth, 'AllowCertificate').text = 'true'

        # Certificate
        cert = SubElement(security, 'Certificate')
        SubElement(cert, 'ApplicationUri').text = self.namespace
        SubElement(cert, 'ApplicationName').text = self.project_name
        SubElement(cert, 'ValidityYears').text = '5'

        # Address Space
        address_space = SubElement(root, 'AddressSpace')

        # Create folder structure
        objects = SubElement(address_space, 'Object')
        SubElement(objects, 'NodeId').text = 'ns=2;s=PLCData'
        SubElement(objects, 'BrowseName').text = '2:PLCData'
        SubElement(objects, 'DisplayName').text = 'PLC Data'

        # Add variable nodes
        for node in nodes:
            var = SubElement(objects, 'Variable')
            SubElement(var, 'NodeId').text = f"ns=2;s={node.get('name')}"
            SubElement(var, 'BrowseName').text = f"2:{node.get('name')}"
            SubElement(var, 'DisplayName').text = node.get('display_name', node.get('name'))
            SubElement(var, 'DataType').text = self._map_data_type(node.get('type', 'BOOL'))
            SubElement(var, 'PLCAddress').text = node.get('address')
            SubElement(var, 'AccessLevel').text = node.get('access', 'ReadWrite')

        return self._prettify(root)

    def _map_data_type(self, plc_type: str) -> str:
        """Map PLC data type to OPC UA data type."""
        mapping = {
            'BOOL': 'Boolean',
            'INT': 'Int16',
            'DINT': 'Int32',
            'UINT': 'UInt16',
            'UDINT': 'UInt32',
            'REAL': 'Float',
            'LREAL': 'Double',
            'STRING': 'String',
            'TIME': 'Duration',
            'DATE': 'DateTime',
        }
        return mapping.get(plc_type.upper(), 'Variant')

    def _prettify(self, elem: Element) -> str:
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

---

## Django Views

```python
# m251_generator/views.py
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.shortcuts import get_object_or_404
import json

from .models import M251Project
from .services.claude_service import ClaudeM251Service
from .services.smbp_generator import M251SMBPGenerator


class GenerateM251View(View):
    """API endpoint for generating M251 programs."""

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

        project = M251Project.objects.create(
            name=data.get('name', 'M251_Project'),
            controller=data.get('controller', 'TM251MESE'),
            user_specification=data.get('specification', ''),
            eth1_ip=data.get('eth1_ip', '192.168.1.10'),
            eth2_ip=data.get('eth2_ip', '10.0.0.10'),
            security_level=data.get('security_level', 'STANDARD'),
            opcua_enabled=data.get('opcua_enabled', True),
            opcua_security_mode=data.get('opcua_security', 'SignAndEncrypt'),
        )

        claude_service = ClaudeM251Service()
        logic_data = claude_service.generate_program(
            specification=project.user_specification,
            controller=project.controller,
            security_level=project.security_level
        )

        # Generate OPC UA config if enabled
        if project.opcua_enabled:
            opcua_config = claude_service.generate_opcua_config(
                variables=logic_data.get('variables', []),
                security_mode=project.opcua_security_mode
            )
            logic_data['opcua_config'] = opcua_config

        generator = M251SMBPGenerator(project)
        zip_content = generator.generate(logic_data)
        project.generated_zip = zip_content
        project.save()

        return JsonResponse({
            'success': True,
            'project_id': str(project.id),
            'security_level': project.security_level,
            'opcua_enabled': project.opcua_enabled,
            'download_url': f'/api/m251/download/{project.id}/'
        })
```

---

## Usage Example

```python
import requests

response = requests.post('http://localhost:8000/api/m251/generate/', json={
    'name': 'SecureProcess_Control',
    'controller': 'TM251MESE',
    'specification': '''
        Create a secure process control system with:
        - Temperature monitoring via OPC UA
        - Valve control with audit logging
        - Alarm management with role-based acknowledgment
        - Separate control (Ethernet 1) and IT (Ethernet 2) networks
        - PID control for temperature regulation
    ''',
    'security_level': 'ENHANCED',
    'eth1_ip': '192.168.1.10',
    'eth2_ip': '10.0.0.10',
    'opcua_enabled': True,
    'opcua_security': 'SignAndEncrypt'
})

print(response.json())
```

---

## Version History

- **v1.0** (2025-12-25): Initial M251 skill with Django + Claude API, security focus

---

**PLCAutoPilot Schneider M251 Skill v1.0 | 2025-12-25 | github.com/chatgptnotes/plcautopilot.com**
