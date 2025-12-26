---
name: schneider
description: Expert agent for Schneider Electric M221 PLC programming with authentic .smbp file generation based on real SoMachine Basic project analysis
version: 2.3
platform: Windows
target_controllers: TM221CE16T, TM221CE24T, TM221CE40T, TM221CE16R, TM221CE24R, TM221CE40R
file_formats: .smbp (XML-based)
programming_languages: Ladder Diagram (LD), Instruction List (IL)
standards: IEC 61131-3, IEC 61508
---

# Schneider Electric M221 PLC Programming Skill v2.3

## CRITICAL: Real .smbp File Structure

**VERIFIED FROM ACTUAL SOMACHINE BASIC PROJECT FILE**

The .smbp file is a **SINGLE UTF-8 XML FILE** (NOT a ZIP archive) with the following authentic structure:

```xml
<?xml version="1.0" encoding="utf-8"?>
<ProjectDescriptor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ProjectVersion>3.0.0.0</ProjectVersion>
  <ManagementLevel>FunctLevelMan21_0</ManagementLevel>
  <Name>project_name</Name>
  <FullName>C:\path\to\project.smbp</FullName>
  <CurrentCultureName>en-GB</CurrentCultureName>
  <SoftwareConfiguration>...</SoftwareConfiguration>
  <HardwareConfiguration>...</HardwareConfiguration>
  <DisplayUserLabelsConfiguration>...</DisplayUserLabelsConfiguration>
  <GlobalProperties>...</GlobalProperties>
  <ReportConfiguration>...</ReportConfiguration>
</ProjectDescriptor>
```

---

## Authentic Motor Start/Stop Program Template

### Complete Working Example (Verified from real .smbp file)

This template is extracted from an actual working motor_start_stop_TM221CE24T.smbp file:

```xml
<?xml version="1.0" encoding="utf-8"?>
<ProjectDescriptor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ProjectVersion>3.0.0.0</ProjectVersion>
  <ManagementLevel>FunctLevelMan21_0</ManagementLevel>
  <Name>motor_start_stop_TM221CE24T</Name>
  <FullName>C:\Projects\motor_start_stop_TM221CE24T.smbp</FullName>
  <CurrentCultureName>en-GB</CurrentCultureName>
  <SoftwareConfiguration>
    <Pous>
      <ProgramOrganizationUnits>
        <Name>Motor Control</Name>
        <SectionNumber>1</SectionNumber>
        <Rungs>
          <RungEntity>
            <LadderElements>
              <!-- START_MOTOR Contact (NO) at Column 0 -->
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.0</Descriptor>
                <Comment />
                <Symbol>START_MOTOR</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>

              <!-- STOP_MOTOR Contact (NC) at Column 1 -->
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.1</Descriptor>
                <Comment />
                <Symbol>STOP_MOTOR</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>

              <!-- Horizontal Lines from Column 2-9 -->
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>4</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>5</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>6</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>7</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>8</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>

              <!-- MOTOR_RUN Coil at Column 10 -->
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment />
                <Symbol>MOTOR_RUN</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>

              <!-- Seal-in Contact (MOTOR_RUN) at Row 1, Column 0 -->
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment />
                <Symbol>MOTOR_RUN</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>

            <!-- Instruction List Representation -->
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>

            <Name>Motor Start Stop</Name>
            <MainComment>Start/Stop latching circuit for Motor - TM221CE24T</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
        </Rungs>
      </ProgramOrganizationUnits>
    </Pous>
    <Subroutines />
    <WatchLists />
    <CustomSymbols />
    <ConstantWordsMemoryAllocation />
    <MemoryBitsMemoryAllocation>
      <Allocation>Manual</Allocation>
      <ForcedCount>512</ForcedCount>
    </MemoryBitsMemoryAllocation>
    <MemoryWordsMemoryAllocation>
      <Allocation>Manual</Allocation>
      <ForcedCount>2000</ForcedCount>
    </MemoryWordsMemoryAllocation>
    <TimersMemoryAllocation />
    <CountersMemoryAllocation />
    <RegistersMemoryAllocation />
    <DrumsMemoryAllocation />
    <SbrsMemoryAllocation />
    <ScsMemoryAllocation />
    <FcsMemoryAllocation />
    <SchsMemoryAllocation />
    <HscsMemoryAllocation />
    <PtosMemoryAllocation />
    <MemoryBits />
    <SystemBits>
      <!-- System bits are automatically populated by SoMachine Basic -->
    </SystemBits>
    <SystemWords />
    <GrafcetSteps />
    <MemoryWords />
    <MemoryDoubleWords />
    <MemoryFloats />
    <ConstantWords />
    <ConstantDoubleWords />
    <ConstantMemoryFloats />
    <Timers />
    <Counters />
    <FastCounters />
    <Registers />
    <Drums />
    <ShiftBitRegisters />
    <StepCounters />
    <ScheduleBlocks />
    <Pids />
    <MessageBlocks />
    <FunctionBlocks />
    <MotionTaskTables />
    <FastTask>
      <Period>255</Period>
    </FastTask>
    <MastTask>
      <UsePeriodScanMode>false</UsePeriodScanMode>
      <PeriodScan>100</PeriodScan>
    </MastTask>
    <CpuBehavior>
      <StartingMode>StartAsPreviousState</StartingMode>
      <RunStopAddress />
      <AutoSaveRamOnEeprom>true</AutoSaveRamOnEeprom>
      <WatchdogPeriod>250</WatchdogPeriod>
    </CpuBehavior>
    <TraceTimeBase>Time5Sec</TraceTimeBase>
    <UserFunctionPous />
    <UserFunctionBlockPous />
    <UserDefineFunctionBlocks />
  </SoftwareConfiguration>
  <!-- HardwareConfiguration section follows -->
</ProjectDescriptor>
```

---

## Ladder Element Types (Verified)

| ElementType | Description | Example |
|-------------|-------------|---------|
| `NormalContact` | Normally Open (NO) contact | START button |
| `NegatedContact` | Normally Closed (NC) contact | STOP button |
| `Coil` | Standard output coil | Motor output |
| `SetCoil` | Latch (Set) coil | Alarm latch |
| `ResetCoil` | Unlatch (Reset) coil | Alarm reset |
| `Line` | Horizontal connection line | Grid filler |
| `CompareBlock` | Comparison block for analog | Level comparison |
| `Operation` | Assignment/Math operation | Copy analog to memory word |
| `Timer` | Timer block | Delay timer |
| `Counter` | Counter block (CTU/CTD) | Part counter |

### Operation Element (CRITICAL for Analog Value Assignment)

**Discovered from verified working test_analog Card.smbp file:**

The `Operation` element type is used to assign values between memory locations, particularly useful for reading analog inputs into memory words for HMI display:

```xml
<LadderEntity>
  <ElementType>Operation</ElementType>
  <OperationExpression>%MW0 := %IW1.0</OperationExpression>
  <Row>0</Row>
  <Column>9</Column>
  <ChosenConnection>Left</ChosenConnection>
</LadderEntity>
```

**Key Points:**
- Use `Operation` (NOT `OperateBlock`)
- Expression goes in `<OperationExpression>` field (NOT `<Descriptor>`)
- Format: `%MW0 := %IW1.0` (assignment operator is `:=`)
- Typically placed at Column 9 (before output column)
- Can be conditional (preceded by contacts)

**IL Code for Operation:**
```
LD    %M0
[ %MW0 := %IW1.0 ]
```

**Common Operations:**
- `%MW0 := %IW1.0` - Copy analog input to memory word
- `%MW1 := %MW0 + 100` - Math operation
- `%MW2 := %MW0 * 2` - Scaling

### CompareBlock (CRITICAL for Analog Applications)

**Discovered from verified working pump_pressure_control.smbp file:**

```xml
<LadderEntity>
  <ElementType>CompareBlock</ElementType>
  <Descriptor>[%IW1.0&gt;2000]</Descriptor>
  <Comment />
  <Symbol />
  <Row>0</Row>
  <Column>0</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

**Key Points:**
- Use `CompareBlock` (NOT `Comparison`)
- Expression goes in `<Descriptor>` field (NOT `<ComparisonExpression>`)
- Expression format: `[%IW1.0>2000]` with brackets
- XML-encode special chars: `>` becomes `&gt;`, `<` becomes `&lt;`
- Does NOT span 2 columns (unlike what was previously documented)

**IL Code for CompareBlock:**
```
LD    [%IW1.0>2000]
ST    %M1
```

---

## Grid Layout Rules

### 10-Column Grid System (Columns 0-10)
- **Column 0**: First logic element (typically input contact)
- **Columns 1-9**: Logic elements or Line elements (fill empty columns)
- **Column 10**: Output coil ONLY

### Connection Types (ChosenConnection)
| Value | Meaning | Use Case |
|-------|---------|----------|
| `Left, Right` | Horizontal through | Standard element |
| `Down, Left, Right` | Branch start | Parallel branch begins |
| `Up, Left` | Branch end | Parallel branch ends |
| `Left` | Terminal | Output coil (no right connection) |

### Row Usage
- **Row 0**: Main logic path
- **Row 1+**: Parallel branches (seal-in, OR logic)

---

## Instruction List (IL) Commands

| Command | Description | Example |
|---------|-------------|---------|
| `LD` | Load (start new rung) | `LD    %I0.0` |
| `ST` | Store (output) | `ST    %Q0.0` |
| `AND` | Logical AND | `AND   %I0.2` |
| `OR` | Logical OR | `OR    %M0` |
| `ANDN` | AND NOT | `ANDN  %I0.1` |
| `ORN` | OR NOT | `ORN   %I0.3` |
| `IN` | Timer/Counter input | `IN    %TM0` |
| `S` | Set coil | `S     %M10` |
| `R` | Reset coil | `R     %M10` |

---

## I/O Addressing Reference

### TM221CE24T Specifications
| Type | Address Range | Count |
|------|---------------|-------|
| Digital Inputs | `%I0.0` to `%I0.13` | 14 |
| Digital Outputs | `%Q0.0` to `%Q0.9` | 10 |
| Analog Inputs | `%IW0.0` to `%IW0.1` | 2 |
| Memory Bits | `%M0` to `%M511` | 512 |
| Memory Words | `%MW0` to `%MW1999` | 2000 |
| Timers | `%TM0` to `%TM254` | 255 |
| Counters | `%C0` to `%C254` | 255 |
| High-Speed Counters | `%HSC0` to `%HSC3` | 4 |

### TM221CE40T Specifications
| Type | Address Range | Count |
|------|---------------|-------|
| Digital Inputs | `%I0.0` to `%I0.23` | 24 |
| Digital Outputs | `%Q0.0` to `%Q0.15` | 16 |
| Analog Inputs | `%IW0.0` to `%IW0.1` | 2 |

---

## Hardware Configuration Template (TM221CE24T)

```xml
<HardwareConfiguration>
  <Plc>
    <Cpu>
      <Index>0</Index>
      <InputNb>0</InputNb>
      <OutputNb>0</OutputNb>
      <Kind>0</Kind>
      <Reference>TM221CE24T</Reference>
      <Name>MyController</Name>
      <Consumption5V>520</Consumption5V>
      <Consumption24V>200</Consumption24V>
      <DigitalInputs>
        <DiscretInput>
          <Address>%I0.0</Address>
          <Index>0</Index>
          <Symbol>START_MOTOR</Symbol>
          <DIFiltering>DIFilterings4ms</DIFiltering>
          <DILatch>DILatchNo</DILatch>
        </DiscretInput>
        <DiscretInput>
          <Address>%I0.1</Address>
          <Index>1</Index>
          <Symbol>STOP_MOTOR</Symbol>
          <DIFiltering>DIFilterings4ms</DIFiltering>
          <DILatch>DILatchNo</DILatch>
        </DiscretInput>
        <!-- Additional inputs %I0.2 through %I0.13 -->
      </DigitalInputs>
      <DigitalOutputs>
        <DiscretOutput>
          <Address>%Q0.0</Address>
          <Index>0</Index>
          <Symbol>MOTOR_RUN</Symbol>
        </DiscretOutput>
        <!-- Additional outputs %Q0.1 through %Q0.9 -->
      </DigitalOutputs>
      <EthernetConfiguration>
        <NetworkName>M221</NetworkName>
        <IpAllocationMode>ByDhcp</IpAllocationMode>
        <IpAddress>192.168.1.10</IpAddress>
        <SubnetMask>255.255.255.0</SubnetMask>
        <GatewayAddress>192.168.1.1</GatewayAddress>
        <ModbusServerEnabled>true</ModbusServerEnabled>
        <ProgrammingProtocolEnabled>true</ProgrammingProtocolEnabled>
      </EthernetConfiguration>
      <HardwareId>1933</HardwareId>
      <IsExpander>false</IsExpander>
    </Cpu>
    <Extensions />
    <SerialLineConfiguration>
      <Baud>Baud19200</Baud>
      <Parity>ParityEven</Parity>
      <DataBits>DataBits8</DataBits>
      <StopBits>StopBits1</StopBits>
      <PhysicalMedium>PhysicalMediumRs485</PhysicalMedium>
      <TransmissionMode>TransmissionModeModbusRtu</TransmissionMode>
      <SlaveId>1</SlaveId>
      <Addressing>SlaveAddressing</Addressing>
    </SerialLineConfiguration>
  </Plc>
</HardwareConfiguration>
```

---

## Timer Configuration (VERIFIED)

**IMPORTANT:** See `m221-timer-programming.md` for complete timer documentation.

### Timer Declaration (Correct Structure)
```xml
<Timers>
  <TimerTM>
    <Address>%TM0</Address>
    <Index>0</Index>
    <Preset>5</Preset>
    <Base>OneSecond</Base>
  </TimerTM>
</Timers>
```

### Time Bases (Verified Values)
| Base Value | Duration |
|------------|----------|
| `OneMs` | 1 millisecond |
| `TenMs` | 10 milliseconds |
| `HundredMs` | 100 milliseconds |
| `OneSecond` | 1 second |
| `OneMinute` | 1 minute |

### Timer in Ladder Element
```xml
<LadderEntity>
  <ElementType>Timer</ElementType>
  <Descriptor>%TM0</Descriptor>
  <Comment />
  <Symbol />
  <Row>0</Row>
  <Column>1</Column>
  <ChosenConnection>Left, Right</ChosenConnection>
</LadderEntity>
```

### Timer in IL (BLK Structure Required)
```
BLK   %TM0      ; Start timer block
LD    %I0.0     ; Load input condition
IN               ; Apply to timer IN
OUT_BLK          ; Exit block, outputs available
LD    Q          ; Load timer Q output (done bit)
ST    %M0        ; Store to output
END_BLK          ; End timer block
```

**CRITICAL:** Timers MUST use BLK...END_BLK structure. Direct access like `%TM0.Q` does NOT work.

---

## System Bits Reference

| Address | Symbol | Description |
|---------|--------|-------------|
| `%S0` | SB_COLDSTART | Cold start indicator |
| `%S1` | SB_WARMSTART | Warm start indicator |
| `%S4` | SB_TB10MS | 10ms pulse |
| `%S5` | SB_TB100MS | 100ms pulse |
| `%S6` | SB_TB1S | 1 second pulse |
| `%S7` | SB_TB1MIN | 1 minute pulse |
| `%S12` | SB_RUNMODE | Controller in RUN mode |
| `%S13` | SB_FIRSTRUN | First scan in RUN |

---

## Common Programming Patterns

### Pattern 1: Motor Start/Stop with Seal-In
```
Logic: (START OR MOTOR_RUN) AND NOT STOP = MOTOR_RUN

Ladder:
    START_MOTOR    STOP_MOTOR               MOTOR_RUN
 |----[ ]------------[/]------------------( )---|
 |     %I0.0         %I0.1                %Q0.0 |
 |                                              |
 |    MOTOR_RUN                                 |
 |----[ ]--------+                              |
      %Q0.0      |______________________________|

IL:
LD    %I0.0      ; Load START button
OR    %Q0.0      ; OR with output (seal-in)
ANDN  %I0.1      ; AND NOT STOP button
ST    %Q0.0      ; Store to motor output
```

### Pattern 2: Sequential Lights with Timers
```
Rung 1: Enable control (seal-in)
Rung 2: Light 1 ON when enabled (immediate)
Rung 3: Timer 1 starts when enabled
Rung 4: Light 2 ON when Timer 1 done
Rung 5: Timer 2 starts when Timer 1 done
Rung 6: Light 3 ON when Timer 2 done
```

### Pattern 3: Interlock (Forward/Reverse)
```
FWD = FWD_CMD AND NOT REV_RUNNING
REV = REV_CMD AND NOT FWD_RUNNING
```

---

## Django Generator Implementation

### Django Model for PLC Projects

```python
# plc_generator/models.py
from django.db import models

class PLCProject(models.Model):
    CONTROLLER_CHOICES = [
        ('TM221CE16T', 'TM221CE16T (16 I/O)'),
        ('TM221CE24T', 'TM221CE24T (24 I/O)'),
        ('TM221CE40T', 'TM221CE40T (40 I/O)'),
    ]

    name = models.CharField(max_length=100)
    controller = models.CharField(max_length=20, choices=CONTROLLER_CHOICES, default='TM221CE24T')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    smbp_file = models.FileField(upload_to='smbp_files/', blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.controller})"


class LadderRung(models.Model):
    project = models.ForeignKey(PLCProject, on_delete=models.CASCADE, related_name='rungs')
    order = models.PositiveIntegerField()
    name = models.CharField(max_length=100)
    comment = models.TextField(blank=True)

    class Meta:
        ordering = ['order']


class LadderElement(models.Model):
    ELEMENT_TYPES = [
        ('NormalContact', 'NO Contact'),
        ('NegatedContact', 'NC Contact'),
        ('Coil', 'Output Coil'),
        ('Line', 'Horizontal Line'),
        ('TimerFunctionBlock', 'Timer'),
    ]

    rung = models.ForeignKey(LadderRung, on_delete=models.CASCADE, related_name='elements')
    element_type = models.CharField(max_length=30, choices=ELEMENT_TYPES)
    address = models.CharField(max_length=20)  # e.g., %I0.0, %Q0.0
    symbol = models.CharField(max_length=50, blank=True)
    row = models.PositiveIntegerField(default=0)
    column = models.PositiveIntegerField()
    connection = models.CharField(max_length=50, default='Left, Right')
```

### Django View for SMBP Generation

```python
# plc_generator/views.py
from django.http import HttpResponse, FileResponse
from django.views import View
from django.shortcuts import get_object_or_404
from .models import PLCProject
from .services import SMBPGenerator

class GenerateSMBPView(View):
    def get(self, request, project_id):
        project = get_object_or_404(PLCProject, id=project_id)
        generator = SMBPGenerator(project)
        smbp_content = generator.generate()

        response = HttpResponse(smbp_content, content_type='application/xml')
        response['Content-Disposition'] = f'attachment; filename="{project.name}.smbp"'
        return response
```

### Django Service for SMBP XML Generation

```python
# plc_generator/services.py
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

class SMBPGenerator:
    def __init__(self, project):
        self.project = project

    def generate(self):
        root = Element('ProjectDescriptor')
        root.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
        root.set('xmlns:xsd', 'http://www.w3.org/2001/XMLSchema')

        SubElement(root, 'ProjectVersion').text = '3.0.0.0'
        SubElement(root, 'ManagementLevel').text = 'FunctLevelMan21_0'
        SubElement(root, 'Name').text = self.project.name
        SubElement(root, 'CurrentCultureName').text = 'en-GB'

        # Build SoftwareConfiguration
        software_config = SubElement(root, 'SoftwareConfiguration')
        self._build_pous(software_config)
        self._build_memory_allocation(software_config)

        # Build HardwareConfiguration
        hardware_config = SubElement(root, 'HardwareConfiguration')
        self._build_hardware(hardware_config)

        return self._prettify(root)

    def _prettify(self, elem):
        rough_string = tostring(elem, 'unicode')
        reparsed = minidom.parseString(rough_string)
        return reparsed.toprettyxml(indent="  ")
```

### Django URL Configuration

```python
# plc_generator/urls.py
from django.urls import path
from .views import GenerateSMBPView

urlpatterns = [
    path('generate/<int:project_id>/', GenerateSMBPView.as_view(), name='generate_smbp'),
]
```

### Django REST API (Optional)

```python
# plc_generator/api.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PLCProject
from .serializers import PLCProjectSerializer
from .services import SMBPGenerator

class PLCProjectViewSet(viewsets.ModelViewSet):
    queryset = PLCProject.objects.all()
    serializer_class = PLCProjectSerializer

    @action(detail=True, methods=['get'])
    def generate_smbp(self, request, pk=None):
        project = self.get_object()
        generator = SMBPGenerator(project)
        smbp_content = generator.generate()
        return Response({'smbp_xml': smbp_content})
```

---

## Validation Checklist

Before generating any .smbp file, verify:

- [ ] Root element is `<ProjectDescriptor>` with proper namespaces
- [ ] `<ProjectVersion>` is set to `3.0.0.0`
- [ ] `<ManagementLevel>` is `FunctLevelMan21_0`
- [ ] All columns 0-10 are filled (use Line elements for gaps)
- [ ] Coils are ONLY in column 10
- [ ] Both `<LadderElements>` AND `<InstructionLines>` are present
- [ ] `<ChosenConnection>` values are correct for element position
- [ ] Timer declarations exist in `<Timers>` section before use
- [ ] Hardware configuration matches target controller
- [ ] I/O symbols are assigned in `<DigitalInputs>` and `<DigitalOutputs>`

---

## TM3 Expansion Modules (Analog Inputs)

### TM3AI4 Configuration - Format 1 (SoMachine Basic Style)

The TM3AI4 is a 4-channel analog input expansion module. This format verified from pump_pressure_control.smbp:

```xml
<Extensions>
  <Extension>
    <Index>0</Index>
    <InputNb>4</InputNb>
    <OutputNb>0</OutputNb>
    <Kind>1</Kind>
    <Reference>TM3AI4</Reference>
    <Name>AI_Expansion</Name>
    <Consumption5V>30</Consumption5V>
    <Consumption24V>35</Consumption24V>
    <AnalogInputs>
      <AnalogInput>
        <Address>%IW1.0</Address>
        <Index>0</Index>
        <Symbol>LEVEL_AIN</Symbol>
        <Comment>Ultrasonic sensor 4-20mA</Comment>
        <AIType>Current4_20mA</AIType>
        <AIRange>Range0_10000</AIRange>
        <AIFilter>AIFilter4</AIFilter>
      </AnalogInput>
    </AnalogInputs>
    <AnalogInputsStatus>
      <AnalogInputStatus>
        <Address>%IW1.4</Address>
        <Index>0</Index>
      </AnalogInputStatus>
    </AnalogInputsStatus>
    <HardwareId>3073</HardwareId>
    <IsExpander>false</IsExpander>
  </Extension>
</Extensions>
```

### TM3AI4/G Configuration - Format 2 (EcoStruxure Machine Expert Style)

**Discovered from verified working test_analog Card.smbp file:**

This format uses `ModuleExtensionObject` and `AnalogIO` with detailed Type/Scope configuration:

```xml
<Extensions>
  <ModuleExtensionObject>
    <Index>0</Index>
    <InputNb>0</InputNb>
    <OutputNb>0</OutputNb>
    <Kind>0</Kind>
    <Reference>TM3AI4/G</Reference>
    <Consumption5V>40</Consumption5V>
    <Consumption24V>0</Consumption24V>
    <TechnicalConfiguration>
      <!-- Large configuration block - see full template -->
    </TechnicalConfiguration>
    <DigitalInputs />
    <DigitalOutputs />
    <AnalogInputs>
      <AnalogIO>
        <Address>%IW1.0</Address>
        <Index>0</Index>
        <Symbol>TANK_LEVEL</Symbol>
        <Type>
          <Value>3</Value>
          <Name>Type_4_20mA</Name>
        </Type>
        <Scope>
          <Value>32</Value>
          <Name>Scope_Customized</Name>
        </Scope>
        <Sampling>
          <Value>0</Value>
          <Name>Sampling_0_1ms</Name>
        </Sampling>
        <Minimum>300</Minimum>
        <Maximum>3000</Maximum>
        <IsInput>true</IsInput>
        <R>1</R>
        <B>1</B>
        <T>1</T>
        <Activation>3100</Activation>
        <Reactivation>1500</Reactivation>
        <InputFilter>0</InputFilter>
      </AnalogIO>
      <!-- Unused channels use Type_NotUsed -->
      <AnalogIO>
        <Address>%IW1.1</Address>
        <Index>1</Index>
        <Type>
          <Value>31</Value>
          <Name>Type_NotUsed</Name>
        </Type>
        <Scope>
          <Value>128</Value>
          <Name>Scope_NotUsed</Name>
        </Scope>
        <!-- ... -->
      </AnalogIO>
    </AnalogInputs>
    <AnalogInputsStatus>
      <AnalogIoStatus>
        <Address>%IWS1.0</Address>
        <Index>0</Index>
      </AnalogIoStatus>
      <!-- Status addresses use %IWS1.x format -->
    </AnalogInputsStatus>
    <HardwareId>193</HardwareId>
    <IsExpander>false</IsExpander>
    <IsOptionnal>false</IsOptionnal>
    <DIOFunctionalMode>DIOFunctionalModeNormal</DIOFunctionalMode>
    <HoldupTime>10</HoldupTime>
  </ModuleExtensionObject>
</Extensions>
```

**Key Differences between Format 1 and Format 2:**

| Aspect | Format 1 (SoMachine Basic) | Format 2 (Machine Expert) |
|--------|---------------------------|---------------------------|
| Extension tag | `<Extension>` | `<ModuleExtensionObject>` |
| Reference | `TM3AI4` | `TM3AI4/G` |
| Analog input tag | `<AnalogInput>` | `<AnalogIO>` |
| Type config | `<AIType>Current4_20mA</AIType>` | `<Type><Value>3</Value><Name>Type_4_20mA</Name></Type>` |
| Range config | `<AIRange>Range0_10000</AIRange>` | `<Minimum>` and `<Maximum>` |
| Status address | `%IW1.4` | `%IWS1.0` (separate status word) |

### Analog Type Values (Format 2)

| Value | Name | Description |
|-------|------|-------------|
| 0 | Type_0_10V | 0-10V voltage |
| 1 | Type_0_5V | 0-5V voltage |
| 2 | Type_0_20mA | 0-20mA current |
| 3 | Type_4_20mA | 4-20mA current (industrial standard) |
| 31 | Type_NotUsed | Channel not configured |

### Analog Scope Values (Format 2)

| Value | Name | Description |
|-------|------|-------------|
| 0 | Scope_0_10000 | Raw 0-10000 |
| 32 | Scope_Customized | Custom min/max range |
| 128 | Scope_NotUsed | Not configured |

### Analog Scaling
- 4-20mA input: Raw value 0-10000 (or custom range)
- 0-10000 raw = full sensor range
- Example: 5000mm sensor range, 0-10000 raw = 0-5000mm (2 counts per mm)
- Format 2 allows custom Minimum/Maximum for direct engineering units

---

## Ultrasonic Tank Level Control Pattern

### Application: Tank Level with Hysteresis Control

**Specifications:**
- Ultrasonic sensor: 4-20mA output, mounted at top of tank
- Sensor range: 5000mm, Dead band: 300mm
- Tank height: 2000mm
- Pump START: Level < 1000mm (distance > 1000mm)
- Pump STOP: 500mm from sensor (level = 1500mm)
- HMI integration via memory words

**Scaling Calculations:**
- Raw value = Distance (mm) x 2 (since 5000mm = 10000 raw)
- Level from bottom = Tank height - Distance
- Start threshold: Distance = 1000mm, Raw = 2000
- Stop threshold: Distance = 500mm, Raw = 1000

**Ladder Logic Structure:**
1. Rung 1: Low level detection (CompareBlock: `[%IW1.0>2000]` -> %M1)
2. Rung 2: High level detection (CompareBlock: `[%IW1.0<1000]` -> %M2)
3. Rung 3: Pump hysteresis latch (M1 OR M0) AND NOT M2 AND NOT ESTOP -> %M0
4. Rung 4: Pump output (%M0 -> %Q0.0)
5. Rung 5: Run indicator (%M0 -> %Q0.1)
6. Rung 6: Low level warning (%M1 -> %Q0.2)

**HMI Tags (Memory Words):**
- %MW0: Raw analog value (read %IW1.0 via Modbus)
- %MW1: Distance from sensor (calculate in HMI: %IW1.0 / 2)
- %MW2: Actual level from bottom (calculate in HMI: 2000 - (%IW1.0 / 2))

---

## Version History

- **v2.3** (2025-12-26): Added Operation element type for analog value assignment, TM3AI4/G Format 2 (ModuleExtensionObject style), Type/Scope value tables, %IWS status addresses. Source: test_analog Card.smbp
- **v2.2** (2025-12-26): Added CompareBlock documentation, TM3AI4 expansion module config, ultrasonic tank level pattern
- **v2.1** (2025-12-25): Corrected timer structure based on test3.smbp analysis, added m221-timer-programming.md reference
- **v2.0** (2025-12-25): Complete rewrite based on actual .smbp file analysis, verified XML structures
- **v1.2** (2025-12-24): Added Python script references
- **v1.1** (2025-12-24): Initial M221 knowledge base integration
- **v1.0** (2025-12-24): Initial skill creation

---

**PLCAutoPilot Schneider Skill v2.3 | Last Updated: 2025-12-26 | github.com/chatgptnotes/plcautopilot.com**
