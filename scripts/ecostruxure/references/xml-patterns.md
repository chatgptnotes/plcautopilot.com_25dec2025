# PLCopen XML Patterns for EcoStruxure Machine Expert

## Core XML Structure

### Project Template
```xml
<?xml version="1.0" encoding="utf-8"?>
<project xmlns="http://www.plcopen.org/xml/tc6_0200">
  <fileHeader companyName="PLCArchitect" productName="Machine Expert Logic Builder" 
              productVersion="V19.2.3.0" creationDateTime="2026-01-01T00:00:00"/>
  <contentHeader name="ProjectName" version="1.0.0.0">
    <coordinateInfo>
      <fbd><scaling x="1" y="1"/></fbd>
      <ld><scaling x="1" y="1"/></ld>
      <sfc><scaling x="1" y="1"/></sfc>
    </coordinateInfo>
  </contentHeader>
  <types>
    <dataTypes/>
    <pous>
      <!-- Program content here -->
    </pous>
  </types>
  <instances><configurations/></instances>
  <addData>
    <data name="http://www.3s-software.com/plcopenxml/projectstructure" handleUnknown="discard">
      <ProjectStructure><Object Name="ProjectName"/></ProjectStructure>
    </data>
  </addData>
</project>
```

## Function Block Patterns

### TON Timer Block
```xml
<!-- Time variable input -->
<inVariable localId="10">
  <position x="200" y="120"/>
  <connectionPointOut/>
  <expression>MixingTime</expression>
</inVariable>

<!-- Timer block -->
<block localId="2" typeName="TON" instanceName="MixingTimer">
  <position x="300" y="80"/>
  <inputVariables>
    <!-- IN trigger -->
    <variable formalParameter="IN">
      <connectionPointIn>
        <connection refLocalId="1"/>
      </connectionPointIn>
    </variable>
    <!-- PT preset time -->
    <variable formalParameter="PT">
      <connectionPointIn>
        <connection refLocalId="10"/>
      </connectionPointIn>
    </variable>
  </inputVariables>
  <inOutVariables/>
  <outputVariables>
    <variable formalParameter="Q">
      <connectionPointOut/>
    </variable>
  </outputVariables>
</block>
```

### CTU Counter Block
```xml
<!-- Preset value input -->
<inVariable localId="32">
  <position x="200" y="340"/>
  <connectionPointOut/>
  <expression>BatchTarget</expression>
</inVariable>

<!-- Counter block -->
<block localId="33" typeName="CTU" instanceName="BatchCounter">
  <position x="300" y="300"/>
  <inputVariables>
    <!-- CU count input -->
    <variable formalParameter="CU">
      <connectionPointIn>
        <connection refLocalId="30"/>
      </connectionPointIn>
    </variable>
    <!-- R reset input -->
    <variable formalParameter="R">
      <connectionPointIn>
        <connection refLocalId="31"/>
      </connectionPointIn>
    </variable>
    <!-- PV preset value -->
    <variable formalParameter="PV">
      <connectionPointIn>
        <connection refLocalId="32"/>
      </connectionPointIn>
    </variable>
  </inputVariables>
  <inOutVariables/>
  <outputVariables>
    <!-- Q output (target reached) -->
    <variable formalParameter="Q">
      <connectionPointOut/>
    </variable>
    <!-- CV current value (optional) -->
    <variable formalParameter="CV">
      <connectionPointOut/>
    </variable>
  </outputVariables>
</block>
```

### PID_FIXCYCLE Block
```xml
<!-- Input variables for PID parameters -->
<inVariable localId="50">
  <position x="0" y="0"/>
  <connectionPointOut/>
  <expression>actual_temp</expression>
</inVariable>

<inVariable localId="51">
  <position x="0" y="0"/>
  <connectionPointOut/>
  <expression>setpoint_temp</expression>
</inVariable>

<!-- Direct tuning values -->
<inVariable localId="52">
  <position x="0" y="0"/>
  <connectionPointOut/>
  <expression>1.5</expression>  <!-- Direct Kp value -->
</inVariable>

<!-- PID block -->
<block localId="70" typeName="PID_FIXCYCLE" instanceName="TempController">
  <position x="200" y="400"/>
  <inputVariables>
    <variable formalParameter="ACTUAL">
      <connectionPointIn>
        <connection refLocalId="50"/>
      </connectionPointIn>
    </variable>
    <variable formalParameter="SET_POINT">
      <connectionPointIn>
        <connection refLocalId="51"/>
      </connectionPointIn>
    </variable>
    <variable formalParameter="KP">
      <connectionPointIn>
        <connection refLocalId="52"/>
      </connectionPointIn>
    </variable>
    <!-- Continue for all 12 parameters: TN, TV, Y_MANUAL, Y_OFFSET, Y_MIN, Y_MAX, MANUAL, RESET, CYCLE -->
  </inputVariables>
  <inOutVariables/>
  <outputVariables>
    <!-- Y output (control value) - NO expression element -->
    <variable formalParameter="Y">
      <connectionPointOut/>
    </variable>
    <!-- Status outputs WITH expression elements -->
    <variable formalParameter="LIMITS_ACTIVE">
      <connectionPointOut>
        <expression>limits_active</expression>
      </connectionPointOut>
    </variable>
    <variable formalParameter="OVERFLOW">
      <connectionPointOut>
        <expression>Overflow</expression>
      </connectionPointOut>
    </variable>
  </outputVariables>
  <!-- Required addData for function blocks -->
  <addData>
    <data name="http://www.3s-software.com/plcopenxml/fbdcalltype" handleUnknown="implementation">
      <CallType xmlns="">functionblock</CallType>
    </data>
  </addData>
</block>
```

## Contact and Coil Patterns

### Contact (Input)
```xml
<contact localId="1" negated="false" storage="none" edge="none">
  <position x="100" y="100"/>
  <connectionPointIn>
    <connection refLocalId="0"/>  <!-- From power rail -->
  </connectionPointIn>
  <connectionPointOut/>
  <variable>StartBtn</variable>
</contact>
```

### Contact with Edge Detection
```xml
<contact localId="30" edge="falling">
  <position x="100" y="300"/>
  <connectionPointIn>
    <connection refLocalId="0"/>
  </connectionPointIn>
  <connectionPointOut/>
  <variable>AgitatorMotor</variable>
</contact>
```

### Coil (Output)
```xml
<coil localId="5">
  <position x="900" y="100"/>
  <connectionPointIn>
    <connection refLocalId="4" formalParameter="Q"/>
  </connectionPointIn>
  <variable>AgitatorMotor</variable>
</coil>
```

### Output Variable Assignment
```xml
<outVariable localId="80">
  <position x="600" y="420"/>
  <connectionPointIn>
    <connection refLocalId="70" formalParameter="Y"/>
  </connectionPointIn>
  <expression>heater_output</expression>
</outVariable>
```

## Power Rail Patterns

### Left Power Rail
```xml
<leftPowerRail localId="0">
  <position x="0" y="0"/>
  <connectionPointOut formalParameter="none"/>
</leftPowerRail>
```

### Right Power Rail (for PID/complex blocks)
```xml
<rightPowerRail localId="2147483646">
  <position x="0" y="0"/>
  <connectionPointIn>
    <connection refLocalId="70" formalParameter="">
      <addData>
        <data name="http://www.3s-software.com/plcopenxml/ldbranchid" handleUnknown="implementation">
          <BranchId xmlns="">2</BranchId>
        </data>
      </addData>
    </connection>
  </connectionPointIn>
</rightPowerRail>
```

## Variable Declaration Patterns

### Basic Types
```xml
<variable name="StartBtn">
  <type><BOOL/></type>
</variable>

<variable name="actual_temp">
  <type><REAL/></type>
</variable>

<variable name="MixingTime">
  <type><TIME/></type>
</variable>

<variable name="BatchTarget">
  <type><INT/></type>
</variable>
```

### Derived Types (Function Blocks)
```xml
<variable name="MixingTimer">
  <type>
    <derived name="TON"/>
  </type>
</variable>

<variable name="BatchCounter">
  <type>
    <derived name="CTU"/>
  </type>
</variable>

<variable name="TempController">
  <type>
    <derived name="PID_FIXCYCLE"/>
  </type>
</variable>
```

## Connection Patterns

### Simple Connection
```xml
<connectionPointIn>
  <connection refLocalId="1"/>
</connectionPointIn>
```

### Connection with Formal Parameter
```xml
<connectionPointIn>
  <connection refLocalId="2" formalParameter="Q"/>
</connectionPointIn>
```

### Multiple Connections to Same Element
All elements connecting to the same source use the same refLocalId. Each connection can specify a different formalParameter if needed.

## Critical Validation Rules

1. **Expression Elements**: Only use on outVariable and specific output assignments. Never on main function block outputs (like timer Q or PID Y).

2. **Formal Parameters**: Must match exact parameter names (case-sensitive):
   - Timer: IN, PT, Q, ET
   - Counter: CU, R, PV, Q, CV  
   - PID: ACTUAL, SET_POINT, KP, TN, TV, Y_MANUAL, Y_OFFSET, Y_MIN, Y_MAX, MANUAL, RESET, CYCLE, Y, LIMITS_ACTIVE, OVERFLOW

3. **LocalId Management**: Each element needs unique localId. Use sequential numbering.

4. **Namespace**: All elements must use proper namespace: `http://www.plcopen.org/xml/tc6_0200`

5. **AddData**: Function blocks require addData with CallType="functionblock"