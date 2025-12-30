# M241 PLCopen XML Template for Ladder Diagram Import

## Overview

This template defines the PLCopen XML format used by EcoStruxure Machine Expert for importing ladder diagram programs into M241/M251/M258 controllers.

**Source**: Extracted from `Machine_Expert_Template.project` and `POU_Ladder.xml`
**Software**: EcoStruxure Machine Expert Logic Builder V19.2.3.0
**Target Devices**: TM241CE24T, TM241CE40T, TM241CEC24T, TM241CE24R, TM241CE40R

---

## File Format Details

### .project Format (CANNOT be generated programmatically)

The `.project` file is a **ZIP archive** containing:
- GUID-named `.meta` and `.object` file pairs (binary format)
- `.auxiliary` files for configuration
- Proprietary CODESYS serialization format

**Structure:**
```
Project.project (ZIP)
|-- {GUID}.meta              - Binary metadata
|-- {GUID}.object            - Binary object data
|-- profile.auxiliary        - Version info (V19.2.3.0)
|-- engineeringtoolsversions.auxiliary - Plugin versions
|-- __shared_data_storage_string_table__.auxiliary - Device references
```

**CRITICAL**: Cannot be programmatically generated. Must use Machine Expert IDE.

---

## PLCopen XML Format (CAN be generated and imported)

### Complete Template Structure

```xml
<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200">
  <fileHeader
    companyName="PLCAutoPilot"
    productName="Machine Expert Logic Builder"
    productVersion="V19.2.3.0"
    creationDateTime="2025-12-30T12:00:00" />

  <contentHeader name="ProjectName" version="1.0.0.0" modificationDateTime="2025-12-30T12:00:00" author="PLCAutoPilot">
    <coordinateInfo>
      <fbd><scaling x="1" y="1" /></fbd>
      <ld><scaling x="1" y="1" /></ld>
      <sfc><scaling x="1" y="1" /></sfc>
    </coordinateInfo>
    <addData>
      <data name="http://www.3s-software.com/plcopenxml/projectinformation" handleUnknown="implementation">
        <ProjectInformation>
          <property name="Author" type="string">PLCAutoPilot</property>
          <property name="Company" type="string">PLCAutoPilot</property>
          <property name="Description" type="string">Generated PLC Program</property>
          <property name="Project" type="string">ProjectName</property>
          <property name="Title" type="string">ProjectName</property>
          <property name="Version" type="version">1.0.0.0</property>
        </ProjectInformation>
      </data>
    </addData>
  </contentHeader>

  <types>
    <dataTypes />
    <pous>
      <!-- POU definitions go here -->
    </pous>
  </types>

  <instances>
    <configurations />
  </instances>

  <addData>
    <data name="http://www.3s-software.com/plcopenxml/projectstructure" handleUnknown="discard">
      <ProjectStructure>
        <Object Name="POU_Name" ObjectId="GUID-HERE" />
      </ProjectStructure>
    </data>
  </addData>
</project>
```

---

## POU (Program Organization Unit) Definition

### Ladder Diagram POU Template

```xml
<pou name="PLC_PRG" pouType="program">
  <interface>
    <localVars>
      <!-- Variable declarations -->
    </localVars>
  </interface>
  <body>
    <LD>
      <!-- Ladder elements -->
    </LD>
  </body>
  <addData>
    <data name="http://www.3s-software.com/plcopenxml/objectid" handleUnknown="discard">
      <ObjectId>GENERATE-UNIQUE-GUID</ObjectId>
    </data>
  </addData>
</pou>
```

---

## Variable Declaration Templates

### Digital Input
```xml
<variable name="START_PB" address="%IX0.0">
  <type><BOOL /></type>
</variable>
```

### Digital Output
```xml
<variable name="MOTOR_RUN" address="%QX0.0">
  <type><BOOL /></type>
</variable>
```

### Memory Bit
```xml
<variable name="System_ready" address="%M?0">
  <type><BOOL /></type>
</variable>
```

### Timer Instance
```xml
<variable name="TON_0">
  <type>
    <derived name="TON" />
  </type>
</variable>
```

### Integer Variable
```xml
<variable name="Counter_Value">
  <type><INT /></type>
</variable>
```

### Real Variable
```xml
<variable name="Temperature">
  <type><REAL /></type>
</variable>
```

---

## Ladder Element Templates

### Left Power Rail (Start of network)
```xml
<leftPowerRail localId="0">
  <position x="0" y="0" />
  <connectionPointOut formalParameter="none" />
</leftPowerRail>
```

### Right Power Rail (End of network)
```xml
<rightPowerRail localId="2147483646">
  <position x="0" y="0" />
  <connectionPointIn />
</rightPowerRail>
```

### Normally Open Contact
```xml
<contact localId="4" negated="false" storage="none" edge="none">
  <position x="0" y="0" />
  <connectionPointIn>
    <connection refLocalId="0" />  <!-- Connect to power rail or previous element -->
  </connectionPointIn>
  <connectionPointOut />
  <variable>START_PB</variable>
</contact>
```

### Normally Closed Contact
```xml
<contact localId="5" negated="true" storage="none" edge="none">
  <position x="0" y="0" />
  <connectionPointIn>
    <connection refLocalId="4" />
  </connectionPointIn>
  <connectionPointOut />
  <variable>STOP_PB</variable>
</contact>
```

### Output Coil
```xml
<coil localId="6" negated="false" storage="none">
  <position x="0" y="0" />
  <connectionPointIn>
    <connection refLocalId="5" />
  </connectionPointIn>
  <connectionPointOut />
  <variable>MOTOR_RUN</variable>
</coil>
```

### Set Coil (Latch)
```xml
<coil localId="7" negated="false" storage="set">
  <position x="0" y="0" />
  <connectionPointIn>
    <connection refLocalId="6" />
  </connectionPointIn>
  <connectionPointOut />
  <variable>LATCHED_OUTPUT</variable>
</coil>
```

### Reset Coil (Unlatch)
```xml
<coil localId="8" negated="false" storage="reset">
  <position x="0" y="0" />
  <connectionPointIn>
    <connection refLocalId="7" />
  </connectionPointIn>
  <connectionPointOut />
  <variable>LATCHED_OUTPUT</variable>
</coil>
```

---

## Function Block Templates

### TON Timer (On-Delay)
```xml
<inVariable localId="5">
  <position x="0" y="0" />
  <connectionPointOut />
  <expression>t#3s</expression>
</inVariable>

<block localId="3" typeName="TON" instanceName="TON_0">
  <position x="0" y="0" />
  <inputVariables>
    <variable formalParameter="IN">
      <connectionPointIn>
        <connection refLocalId="4" />  <!-- Input signal -->
      </connectionPointIn>
    </variable>
    <variable formalParameter="PT">
      <connectionPointIn>
        <connection refLocalId="5" />  <!-- Preset time -->
      </connectionPointIn>
    </variable>
  </inputVariables>
  <inOutVariables />
  <outputVariables>
    <variable formalParameter="Q">
      <connectionPointOut />
    </variable>
    <variable formalParameter="ET">
      <connectionPointOut>
        <expression>???</expression>
      </connectionPointOut>
    </variable>
  </outputVariables>
  <addData>
    <data name="http://www.3s-software.com/plcopenxml/fbdcalltype" handleUnknown="implementation">
      <CallType xmlns="">functionblock</CallType>
    </data>
  </addData>
</block>
```

### TOF Timer (Off-Delay)
```xml
<block localId="10" typeName="TOF" instanceName="TOF_0">
  <position x="0" y="0" />
  <inputVariables>
    <variable formalParameter="IN">
      <connectionPointIn>
        <connection refLocalId="9" />
      </connectionPointIn>
    </variable>
    <variable formalParameter="PT">
      <connectionPointIn>
        <connection refLocalId="11" />
      </connectionPointIn>
    </variable>
  </inputVariables>
  <inOutVariables />
  <outputVariables>
    <variable formalParameter="Q">
      <connectionPointOut />
    </variable>
    <variable formalParameter="ET">
      <connectionPointOut />
    </variable>
  </outputVariables>
  <addData>
    <data name="http://www.3s-software.com/plcopenxml/fbdcalltype" handleUnknown="implementation">
      <CallType xmlns="">functionblock</CallType>
    </data>
  </addData>
</block>
```

### CTU Counter (Count Up)
```xml
<block localId="20" typeName="CTU" instanceName="CTU_0">
  <position x="0" y="0" />
  <inputVariables>
    <variable formalParameter="CU">
      <connectionPointIn>
        <connection refLocalId="19" />
      </connectionPointIn>
    </variable>
    <variable formalParameter="RESET">
      <connectionPointIn>
        <connection refLocalId="21" />
      </connectionPointIn>
    </variable>
    <variable formalParameter="PV">
      <connectionPointIn>
        <connection refLocalId="22" />
      </connectionPointIn>
    </variable>
  </inputVariables>
  <outputVariables>
    <variable formalParameter="Q">
      <connectionPointOut />
    </variable>
    <variable formalParameter="CV">
      <connectionPointOut />
    </variable>
  </outputVariables>
</block>
```

---

## Network Title and Comments

### Network Title
```xml
<vendorElement localId="2">
  <position x="0" y="0" />
  <alternativeText>
    <xhtml xmlns="http://www.w3.org/1999/xhtml" />
  </alternativeText>
  <addData>
    <data name="http://www.3s-software.com/plcopenxml/fbdelementtype" handleUnknown="implementation">
      <ElementType xmlns="">networktitle</ElementType>
    </data>
  </addData>
</vendorElement>
```

### Comment
```xml
<comment localId="1" height="0" width="0">
  <position x="0" y="0" />
  <content>
    <xhtml xmlns="http://www.w3.org/1999/xhtml">System startup timer - 3 second delay</xhtml>
  </content>
</comment>
```

---

## Complete Example: Motor Start/Stop with Timer

```xml
<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200">
  <fileHeader companyName="PLCAutoPilot" productName="Machine Expert Logic Builder" productVersion="V19.2.3.0" creationDateTime="2025-12-30T12:00:00" />
  <contentHeader name="Motor_StartStop" version="1.0.0.0" modificationDateTime="2025-12-30T12:00:00" author="PLCAutoPilot">
    <coordinateInfo>
      <fbd><scaling x="1" y="1" /></fbd>
      <ld><scaling x="1" y="1" /></ld>
      <sfc><scaling x="1" y="1" /></sfc>
    </coordinateInfo>
  </contentHeader>
  <types>
    <dataTypes />
    <pous>
      <pou name="PLC_PRG" pouType="program">
        <interface>
          <localVars>
            <variable name="emergency_pb" address="%IX0.0">
              <type><BOOL /></type>
            </variable>
            <variable name="start_pb" address="%IX0.1">
              <type><BOOL /></type>
            </variable>
            <variable name="stop_pb" address="%IX0.2">
              <type><BOOL /></type>
            </variable>
            <variable name="motor_run" address="%QX0.0">
              <type><BOOL /></type>
            </variable>
            <variable name="system_ready" address="%M?0">
              <type><BOOL /></type>
            </variable>
            <variable name="TON_Startup">
              <type><derived name="TON" /></type>
            </variable>
          </localVars>
        </interface>
        <body>
          <LD>
            <!-- Network 1: System Ready Timer -->
            <leftPowerRail localId="0">
              <position x="0" y="0" />
              <connectionPointOut formalParameter="none" />
            </leftPowerRail>

            <contact localId="1" negated="false" storage="none" edge="none">
              <position x="0" y="0" />
              <connectionPointIn>
                <connection refLocalId="0" />
              </connectionPointIn>
              <connectionPointOut />
              <variable>emergency_pb</variable>
            </contact>

            <inVariable localId="2">
              <position x="0" y="0" />
              <connectionPointOut />
              <expression>t#3s</expression>
            </inVariable>

            <block localId="3" typeName="TON" instanceName="TON_Startup">
              <position x="0" y="0" />
              <inputVariables>
                <variable formalParameter="IN">
                  <connectionPointIn>
                    <connection refLocalId="1" />
                  </connectionPointIn>
                </variable>
                <variable formalParameter="PT">
                  <connectionPointIn>
                    <connection refLocalId="2" />
                  </connectionPointIn>
                </variable>
              </inputVariables>
              <outputVariables>
                <variable formalParameter="Q">
                  <connectionPointOut />
                </variable>
                <variable formalParameter="ET">
                  <connectionPointOut />
                </variable>
              </outputVariables>
            </block>

            <coil localId="4" negated="false" storage="none">
              <position x="0" y="0" />
              <connectionPointIn>
                <connection refLocalId="3" formalParameter="Q" />
              </connectionPointIn>
              <connectionPointOut />
              <variable>system_ready</variable>
            </coil>

            <!-- Network 2: Motor Control -->
            <contact localId="10" negated="false" storage="none" edge="none">
              <position x="0" y="0" />
              <connectionPointIn>
                <connection refLocalId="0" />
              </connectionPointIn>
              <connectionPointOut />
              <variable>system_ready</variable>
            </contact>

            <contact localId="11" negated="false" storage="none" edge="none">
              <position x="0" y="0" />
              <connectionPointIn>
                <connection refLocalId="10" />
              </connectionPointIn>
              <connectionPointOut />
              <variable>start_pb</variable>
            </contact>

            <contact localId="12" negated="true" storage="none" edge="none">
              <position x="0" y="0" />
              <connectionPointIn>
                <connection refLocalId="11" />
              </connectionPointIn>
              <connectionPointOut />
              <variable>stop_pb</variable>
            </contact>

            <coil localId="13" negated="false" storage="none">
              <position x="0" y="0" />
              <connectionPointIn>
                <connection refLocalId="12" />
              </connectionPointIn>
              <connectionPointOut />
              <variable>motor_run</variable>
            </coil>

            <rightPowerRail localId="2147483646">
              <position x="0" y="0" />
              <connectionPointIn />
            </rightPowerRail>
          </LD>
        </body>
      </pou>
    </pous>
  </types>
  <instances>
    <configurations />
  </instances>
</project>
```

---

## I/O Address Format for M241

### Digital I/O
| Type | Format | Example | Description |
|------|--------|---------|-------------|
| Digital Input | `%IX0.n` | `%IX0.0` | Input bit 0 |
| Digital Output | `%QX0.n` | `%QX0.0` | Output bit 0 |
| Memory Bit | `%M?n` or `%MX0.n` | `%M?0` | Memory bit |

### TM241CE24T I/O Count
- Digital Inputs: %IX0.0 to %IX0.15 (16 inputs)
- Digital Outputs: %QX0.0 to %QX0.7 (8 outputs)
- Analog Inputs: %IW0.0 to %IW0.3 (4 channels)
- Analog Outputs: %QW0.0 to %QW0.1 (2 channels)

---

## Import Instructions

1. Open EcoStruxure Machine Expert
2. Create new project or open existing
3. Go to **Project > Import PLCopen XML...**
4. Select the generated XML file
5. Review and accept import options
6. Program appears in project tree
7. Build and download to PLC

---

## Version History

- **v1.0** (2025-12-30): Initial template from Machine_Expert_Template.project analysis

---

**PLCAutoPilot M241 PLCopen Template v1.0 | 2025-12-30**
