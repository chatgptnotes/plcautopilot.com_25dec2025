# -*- coding: utf-8 -*-
"""
Tank Level Control with RTD Temperature Monitoring
Generates .smbp file for Schneider M221 PLC (TM221CE40T)

Specifications:
- Tank: 1m x 1m x 1m = 1000 liters
- Level transmitter: 4-20mA, deadband 300mm, max range 5000mm
- Transmitter installed 500mm above tank top
- Tank full: sensor reads 500mm from surface
- Tank empty: sensor reads 1500mm from surface
- RTD sensor (PT100) for temperature via TM3TI4/G
- 10-second stabilization delay before outlet opens
- Valve position feedback with failure alarms

HMI Tags:
- %MW10: TANK_LITERS (0-1000 liters)
- %MW11: TEMPERATURE (in 0.1 deg C units)

PLCAutoPilot v2.5 - Tank Level RTD Control with TM221CE40T
"""

import os
from datetime import datetime

def generate_smbp():
    """Generate the complete .smbp file"""

    project_name = "Tank_Level_RTD_1m_TM221CE40T"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    xml_content = f'''<?xml version="1.0" encoding="utf-8"?>
<ProjectDescriptor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ProjectVersion>3.0.0.0</ProjectVersion>
  <ManagementLevel>FunctLevelMan21_0</ManagementLevel>
  <Name>{project_name}</Name>
  <FullName>C:\\Projects\\{project_name}.smbp</FullName>
  <CurrentCultureName>en-GB</CurrentCultureName>
  <SoftwareConfiguration>
    <Pous>
      <ProgramOrganizationUnits>
        <Name>Tank Level Control</Name>
        <SectionNumber>0</SectionNumber>
        <Rungs>
          <!-- Rung 1: Read Level Transmitter Analog Input -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S12</Descriptor>
                <Comment>PLC Running</Comment>
                <Symbol>SB_RUNMODE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
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
                <ElementType>Operation</ElementType>
                <OperationExpression>%MW0 := %IW1.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %S12</InstructionLine>
                <Comment>PLC Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MW0 := %IW1.0 ]</InstructionLine>
                <Comment>Read level transmitter raw value</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Read_Level</Name>
            <MainComment>Read level transmitter 4-20mA signal into %MW0 (distance in mm)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 2: Calculate Tank Liters for HMI -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S12</Descriptor>
                <Comment>PLC Running</Comment>
                <Symbol>SB_RUNMODE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
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
                <ElementType>Operation</ElementType>
                <OperationExpression>%MW10 := 1500 - %MW0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %S12</InstructionLine>
                <Comment>PLC Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MW10 := 1500 - %MW0 ]</InstructionLine>
                <Comment>Calculate liters: 1500mm - sensor distance = level in mm = liters</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Calc_Liters</Name>
            <MainComment>HMI Tag: Calculate tank volume in liters (1m x 1m base = 1L per mm)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 3: Read RTD Temperature -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S12</Descriptor>
                <Comment>PLC Running</Comment>
                <Symbol>SB_RUNMODE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
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
                <ElementType>Operation</ElementType>
                <OperationExpression>%MW11 := %IW2.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %S12</InstructionLine>
                <Comment>PLC Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MW11 := %IW2.0 ]</InstructionLine>
                <Comment>HMI Tag: Read RTD temperature (0.1 deg C units)</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Read_Temp</Name>
            <MainComment>HMI Tag: Read RTD temperature from TM3TI4/G (value in 0.1 deg C)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 4: Detect Tank Level High (Full) - sensor reads 500mm when full -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S12</Descriptor>
                <Comment>PLC Running</Comment>
                <Symbol>SB_RUNMODE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Comparison</ElementType>
                <ComparisonExpression>%MW0 &lt;= 550</ComparisonExpression>
                <Row>0</Row>
                <Column>2</Column>
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
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Tank Full</Comment>
                <Symbol>TANK_LEVEL_HIGH</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %S12</InstructionLine>
                <Comment>PLC Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   [ %MW0 &lt;= 550 ]</InstructionLine>
                <Comment>Sensor distance 550mm or less = tank full (with margin)</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment>Set tank high flag</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Level_High</Name>
            <MainComment>Tank Full Detection: sensor &lt;=550mm = tank full (1000L)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 5: Detect Tank Level Low (Empty) - sensor reads 1500mm when empty -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S12</Descriptor>
                <Comment>PLC Running</Comment>
                <Symbol>SB_RUNMODE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Comparison</ElementType>
                <ComparisonExpression>%MW0 &gt;= 1450</ComparisonExpression>
                <Row>0</Row>
                <Column>2</Column>
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
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Tank Empty</Comment>
                <Symbol>TANK_LEVEL_LOW</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %S12</InstructionLine>
                <Comment>PLC Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   [ %MW0 &gt;= 1450 ]</InstructionLine>
                <Comment>Sensor distance 1450mm or more = tank empty (with margin)</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment>Set tank low flag</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Level_Low</Name>
            <MainComment>Tank Empty Detection: sensor &gt;=1450mm = tank empty (0L)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 6: Inlet Valve Control - Fill when START pressed or filling, stop when full -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.0</Descriptor>
                <Comment>Start Fill Button</Comment>
                <Symbol>START_FILL</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Not Full</Comment>
                <Symbol>TANK_LEVEL_HIGH</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.1</Descriptor>
                <Comment>E-Stop</Comment>
                <Symbol>ESTOP</Symbol>
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
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Inlet Valve Output</Comment>
                <Symbol>INLET_VALVE</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Seal-in</Comment>
                <Symbol>INLET_VALVE</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.0</InstructionLine>
                <Comment>Start Fill Button</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.0</InstructionLine>
                <Comment>Seal-in while filling</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M2</InstructionLine>
                <Comment>Stop when tank full</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.1</InstructionLine>
                <Comment>E-Stop check</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment>Inlet Valve Output</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Inlet_Valve</Name>
            <MainComment>Inlet Valve: Open on START, seal-in until FULL, E-Stop override</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 7: 10 Second Stabilization Timer - starts when tank full -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Tank Full</Comment>
                <Symbol>TANK_LEVEL_HIGH</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Inlet Closed</Comment>
                <Symbol>INLET_VALVE</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
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
                <ElementType>TimerFunctionBlock</ElementType>
                <Descriptor>%TM0</Descriptor>
                <Comment>10 sec delay for RTD stabilization</Comment>
                <Symbol>STABILIZE_TMR</Symbol>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
                <TimerType>TON</TimerType>
                <TimeBase>TimeBase1s</TimeBase>
                <Preset>10</Preset>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M2</InstructionLine>
                <Comment>Tank Full</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %Q0.0</InstructionLine>
                <Comment>Inlet Valve Closed</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>IN    %TM0</InstructionLine>
                <Comment>Start 10 sec timer for RTD stabilization</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Stabilize_Timer</Name>
            <MainComment>10 second delay for RTD and level readings to stabilize before drain</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 8: Set Drain Ready Flag when timer done -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM0.Q</Descriptor>
                <Comment>Timer Done</Comment>
                <Symbol>STABILIZE_TMR</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
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
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>Ready to Drain</Comment>
                <Symbol>DRAIN_READY</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %TM0.Q</InstructionLine>
                <Comment>Stabilization timer done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M4</InstructionLine>
                <Comment>Set drain ready flag</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Drain_Ready</Name>
            <MainComment>Set drain ready flag after 10 second stabilization period</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 9: Outlet Valve Control - Open after stabilization, close when empty -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>Drain Ready</Comment>
                <Symbol>DRAIN_READY</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Not Empty</Comment>
                <Symbol>TANK_LEVEL_LOW</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.1</Descriptor>
                <Comment>E-Stop</Comment>
                <Symbol>ESTOP</Symbol>
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
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment>Outlet Valve Output</Comment>
                <Symbol>OUTLET_VALVE</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment>Seal-in</Comment>
                <Symbol>OUTLET_VALVE</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M4</InstructionLine>
                <Comment>Drain Ready (after 10 sec)</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.1</InstructionLine>
                <Comment>Seal-in while draining</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M1</InstructionLine>
                <Comment>Stop when tank empty</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.1</InstructionLine>
                <Comment>E-Stop check</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.1</InstructionLine>
                <Comment>Outlet Valve Output</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Outlet_Valve</Name>
            <MainComment>Outlet Valve: Auto-open after 10 sec stabilization, close when empty</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 10: Inlet Valve Fail Timer - starts when command given but no feedback -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Inlet Cmd ON</Comment>
                <Symbol>INLET_VALVE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.2</Descriptor>
                <Comment>No Open FB</Comment>
                <Symbol>INLET_VLV_FB</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
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
                <ElementType>TimerFunctionBlock</ElementType>
                <Descriptor>%TM1</Descriptor>
                <Comment>Inlet Valve Fail Timer</Comment>
                <Symbol>INLET_FAIL_TMR</Symbol>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
                <TimerType>TON</TimerType>
                <TimeBase>TimeBase1s</TimeBase>
                <Preset>5</Preset>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %Q0.0</InstructionLine>
                <Comment>Inlet Command ON</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.2</InstructionLine>
                <Comment>No Position Feedback</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>IN    %TM1</InstructionLine>
                <Comment>Start 5 sec fail timer</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Inlet_Fail_Timer</Name>
            <MainComment>Inlet Valve Fail Detection: 5 sec with no position feedback</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 11: Inlet Valve Alarm -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM1.Q</Descriptor>
                <Comment>Fail Timer Done</Comment>
                <Symbol>INLET_FAIL_TMR</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.6</Descriptor>
                <Comment>Alarm Reset</Comment>
                <Symbol>ALARM_RESET</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
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
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.2</Descriptor>
                <Comment>Inlet Alarm Out</Comment>
                <Symbol>INLET_VLV_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.2</Descriptor>
                <Comment>Alarm Latch</Comment>
                <Symbol>INLET_VLV_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %TM1.Q</InstructionLine>
                <Comment>Inlet Valve Fail Timer Done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.2</InstructionLine>
                <Comment>Alarm Latch</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.6</InstructionLine>
                <Comment>Alarm Reset Button</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.2</InstructionLine>
                <Comment>Inlet Valve Alarm Output</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Inlet_Alarm</Name>
            <MainComment>Inlet Valve Failure Alarm: Latched until reset</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 12: Outlet Valve Fail Timer -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment>Outlet Cmd ON</Comment>
                <Symbol>OUTLET_VALVE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.4</Descriptor>
                <Comment>No Open FB</Comment>
                <Symbol>OUTLET_VLV_FB</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
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
                <ElementType>TimerFunctionBlock</ElementType>
                <Descriptor>%TM2</Descriptor>
                <Comment>Outlet Valve Fail Timer</Comment>
                <Symbol>OUTLET_FAIL_TMR</Symbol>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
                <TimerType>TON</TimerType>
                <TimeBase>TimeBase1s</TimeBase>
                <Preset>5</Preset>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %Q0.1</InstructionLine>
                <Comment>Outlet Command ON</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.4</InstructionLine>
                <Comment>No Position Feedback</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>IN    %TM2</InstructionLine>
                <Comment>Start 5 sec fail timer</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Outlet_Fail_Timer</Name>
            <MainComment>Outlet Valve Fail Detection: 5 sec with no position feedback</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 13: Outlet Valve Alarm -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM2.Q</Descriptor>
                <Comment>Fail Timer Done</Comment>
                <Symbol>OUTLET_FAIL_TMR</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.6</Descriptor>
                <Comment>Alarm Reset</Comment>
                <Symbol>ALARM_RESET</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
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
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.3</Descriptor>
                <Comment>Outlet Alarm Out</Comment>
                <Symbol>OUTLET_VLV_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.3</Descriptor>
                <Comment>Alarm Latch</Comment>
                <Symbol>OUTLET_VLV_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %TM2.Q</InstructionLine>
                <Comment>Outlet Valve Fail Timer Done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.3</InstructionLine>
                <Comment>Alarm Latch</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.6</InstructionLine>
                <Comment>Alarm Reset Button</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.3</InstructionLine>
                <Comment>Outlet Valve Alarm Output</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Outlet_Alarm</Name>
            <MainComment>Outlet Valve Failure Alarm: Latched until reset</MainComment>
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
    <TimersMemoryAllocation>
      <Allocation>Manual</Allocation>
      <ForcedCount>3</ForcedCount>
    </TimersMemoryAllocation>
    <CountersMemoryAllocation />
    <RegistersMemoryAllocation />
    <DrumsMemoryAllocation />
    <SbrsMemoryAllocation />
    <ScsMemoryAllocation />
    <FcsMemoryAllocation />
    <SchsMemoryAllocation />
    <HscsMemoryAllocation />
    <PtosMemoryAllocation />
    <MemoryBits>
      <MemoryBit>
        <Address>%M1</Address>
        <Index>1</Index>
        <Symbol>TANK_LEVEL_LOW</Symbol>
        <Comment>Tank empty flag</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%M2</Address>
        <Index>2</Index>
        <Symbol>TANK_LEVEL_HIGH</Symbol>
        <Comment>Tank full flag</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%M4</Address>
        <Index>4</Index>
        <Symbol>DRAIN_READY</Symbol>
        <Comment>Ready to drain after stabilization</Comment>
      </MemoryBit>
    </MemoryBits>
    <SystemBits>
      <MemoryBit>
        <Address>%S0</Address>
        <Index>0</Index>
        <Symbol>SB_COLDSTART</Symbol>
        <Comment>Indicates or executes a cold start (data initialized to default values)</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S12</Address>
        <Index>12</Index>
        <Symbol>SB_RUNMODE</Symbol>
        <Comment>The controller is running</Comment>
      </MemoryBit>
    </SystemBits>
    <SystemWords />
    <GrafcetSteps />
    <MemoryWords>
      <MemoryWord>
        <Address>%MW0</Address>
        <Index>0</Index>
        <Symbol>LEVEL_RAW</Symbol>
        <Comment>Level transmitter raw value (distance in mm)</Comment>
      </MemoryWord>
      <MemoryWord>
        <Address>%MW10</Address>
        <Index>10</Index>
        <Symbol>HMI_TANK_LITERS</Symbol>
        <Comment>HMI Tag: Tank volume in liters (0-1000)</Comment>
      </MemoryWord>
      <MemoryWord>
        <Address>%MW11</Address>
        <Index>11</Index>
        <Symbol>HMI_TEMPERATURE</Symbol>
        <Comment>HMI Tag: Temperature in 0.1 deg C units</Comment>
      </MemoryWord>
    </MemoryWords>
    <MemoryDoubleWords />
    <MemoryFloats />
    <ConstantWords />
    <ConstantDoubleWords />
    <ConstantMemoryFloats />
    <Timers>
      <Timer>
        <Address>%TM0</Address>
        <Index>0</Index>
        <Symbol>STABILIZE_TMR</Symbol>
        <Comment>10 second stabilization delay before drain</Comment>
        <Type>TON</Type>
        <TimeBase>TimeBase1s</TimeBase>
        <Preset>10</Preset>
      </Timer>
      <Timer>
        <Address>%TM1</Address>
        <Index>1</Index>
        <Symbol>INLET_FAIL_TMR</Symbol>
        <Comment>5 second inlet valve fail detection timer</Comment>
        <Type>TON</Type>
        <TimeBase>TimeBase1s</TimeBase>
        <Preset>5</Preset>
      </Timer>
      <Timer>
        <Address>%TM2</Address>
        <Index>2</Index>
        <Symbol>OUTLET_FAIL_TMR</Symbol>
        <Comment>5 second outlet valve fail detection timer</Comment>
        <Type>TON</Type>
        <TimeBase>TimeBase1s</TimeBase>
        <Preset>5</Preset>
      </Timer>
    </Timers>
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
  <HardwareConfiguration>
    <Plc>
      <Cpu>
        <Index>0</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference>TM221CE40T</Reference>
        <Name>MyController</Name>
        <Consumption5V>520</Consumption5V>
        <Consumption24V>200</Consumption24V>
        <DigitalInputs>
          <DiscretInput>
            <Address>%I0.0</Address>
            <Index>0</Index>
            <Symbol>START_FILL</Symbol>
            <Comment>Start Fill Button</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.1</Address>
            <Index>1</Index>
            <Symbol>ESTOP</Symbol>
            <Comment>Emergency Stop (NC)</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.2</Address>
            <Index>2</Index>
            <Symbol>INLET_VLV_FB</Symbol>
            <Comment>Inlet Valve Open Position Feedback</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.3</Address>
            <Index>3</Index>
            <Symbol>INLET_VLV_CL_FB</Symbol>
            <Comment>Inlet Valve Closed Position Feedback</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.4</Address>
            <Index>4</Index>
            <Symbol>OUTLET_VLV_FB</Symbol>
            <Comment>Outlet Valve Open Position Feedback</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.5</Address>
            <Index>5</Index>
            <Symbol>OUTLET_VLV_CL_FB</Symbol>
            <Comment>Outlet Valve Closed Position Feedback</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.6</Address>
            <Index>6</Index>
            <Symbol>ALARM_RESET</Symbol>
            <Comment>Alarm Reset Button</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.7</Address>
            <Index>7</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.8</Address>
            <Index>8</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.9</Address>
            <Index>9</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.10</Address>
            <Index>10</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.11</Address>
            <Index>11</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.12</Address>
            <Index>12</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.13</Address>
            <Index>13</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.14</Address>
            <Index>14</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.15</Address>
            <Index>15</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.16</Address>
            <Index>16</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.17</Address>
            <Index>17</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.18</Address>
            <Index>18</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.19</Address>
            <Index>19</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.20</Address>
            <Index>20</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.21</Address>
            <Index>21</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.22</Address>
            <Index>22</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.23</Address>
            <Index>23</Index>
            <Symbol />
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
        </DigitalInputs>
        <DigitalOutputs>
          <DiscretOutput>
            <Address>%Q0.0</Address>
            <Index>0</Index>
            <Symbol>INLET_VALVE</Symbol>
            <Comment>Inlet Valve Solenoid</Comment>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.1</Address>
            <Index>1</Index>
            <Symbol>OUTLET_VALVE</Symbol>
            <Comment>Outlet Valve Solenoid</Comment>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.2</Address>
            <Index>2</Index>
            <Symbol>INLET_VLV_ALARM</Symbol>
            <Comment>Inlet Valve Failure Alarm</Comment>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.3</Address>
            <Index>3</Index>
            <Symbol>OUTLET_VLV_ALARM</Symbol>
            <Comment>Outlet Valve Failure Alarm</Comment>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.4</Address>
            <Index>4</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.5</Address>
            <Index>5</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.6</Address>
            <Index>6</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.7</Address>
            <Index>7</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.8</Address>
            <Index>8</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.9</Address>
            <Index>9</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.10</Address>
            <Index>10</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.11</Address>
            <Index>11</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.12</Address>
            <Index>12</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.13</Address>
            <Index>13</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.14</Address>
            <Index>14</Index>
            <Symbol />
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.15</Address>
            <Index>15</Index>
            <Symbol />
          </DiscretOutput>
        </DigitalOutputs>
        <AnalogInputs>
          <AnalogIO>
            <Address>%IW0.0</Address>
            <Index>0</Index>
            <Type>
              <Value>0</Value>
              <Name>Type_0_10V</Name>
            </Type>
            <Scope>
              <Value>0</Value>
              <Name>Scope_Normal</Name>
            </Scope>
            <Minimum>0</Minimum>
            <Maximum>1000</Maximum>
            <IsInput>true</IsInput>
          </AnalogIO>
          <AnalogIO>
            <Address>%IW0.1</Address>
            <Index>1</Index>
            <Type>
              <Value>0</Value>
              <Name>Type_0_10V</Name>
            </Type>
            <Scope>
              <Value>0</Value>
              <Name>Scope_Normal</Name>
            </Scope>
            <Minimum>0</Minimum>
            <Maximum>1000</Maximum>
            <IsInput>true</IsInput>
          </AnalogIO>
        </AnalogInputs>
        <AnalogInputsStatus />
        <AnalogOutputs />
        <AnalogOutputsStatus />
        <HighSpeedCounters>
          <HighSpeedCounter>
            <Address>%HSC0</Address>
            <Index>0</Index>
            <Preset>0</Preset>
            <DedicatedInputs>
              <DedicatedInput><Index>0</Index></DedicatedInput>
              <DedicatedInput><Index>1</Index></DedicatedInput>
              <DedicatedInput><Index>2</Index></DedicatedInput>
              <DedicatedInput><Index>3</Index></DedicatedInput>
            </DedicatedInputs>
          </HighSpeedCounter>
        </HighSpeedCounters>
        <PulseTrainOutputs />
        <EthernetConfiguration>
          <NetworkName>M221</NetworkName>
          <IpAllocationMode>FixedAddress</IpAllocationMode>
          <IpAddress>0.0.0.0</IpAddress>
          <SubnetMask>0.0.0.0</SubnetMask>
          <GatewayAddress>0.0.0.0</GatewayAddress>
          <TransfertRate>TransfertRateAuto</TransfertRate>
          <EthernetProtocol>ProtocolEthernet2</EthernetProtocol>
          <ModbusTcpSlave>
            <IpMasterAddress>0.0.0.0</IpMasterAddress>
            <UseTimeout>true</UseTimeout>
            <Timeout>2</Timeout>
            <SlavePort>502</SlavePort>
            <UnitId xsi:nil="true" />
            <HoldingRegister>0</HoldingRegister>
            <InputRegister>0</InputRegister>
            <ModbusServerEnabled>false</ModbusServerEnabled>
            <Devices />
            <DigitalInputsIoScanner />
            <DigitalOutputsIoScanner />
            <RegisterInputsIoScanner />
            <RegisterOutputsIoScanner />
            <RegisterDeviceStatusIoScanner />
            <RegisterInputsStatusIoScanner />
            <Drives />
            <IsIoScanner>false</IsIoScanner>
          </ModbusTcpSlave>
          <EthernetIpEntity>
            <EthernetIpEnabled>false</EthernetIpEnabled>
            <OutputAssemblyInstance>0</OutputAssemblyInstance>
            <OutputAssemblySize>0</OutputAssemblySize>
            <InputAssemblySize>0</InputAssemblySize>
            <InputAssemblyInstance>0</InputAssemblyInstance>
          </EthernetIpEntity>
          <ProgrammingProtocolEnabled>false</ProgrammingProtocolEnabled>
          <EthernetIpAdapterEnabled>false</EthernetIpAdapterEnabled>
          <ModbusServerEnabled>false</ModbusServerEnabled>
          <AutoDiscoveryProtocolEnabled>false</AutoDiscoveryProtocolEnabled>
        </EthernetConfiguration>
        <HardwareId>1933</HardwareId>
        <IsExpander>false</IsExpander>
      </Cpu>
      <Extensions>
        <!-- Extension Module 1: TM3AI4/G - Level Transmitter 4-20mA -->
        <ModuleExtensionObject>
          <Index>0</Index>
          <InputNb>0</InputNb>
          <OutputNb>0</OutputNb>
          <Kind>0</Kind>
          <Reference>TM3AI4/G</Reference>
          <Consumption5V>40</Consumption5V>
          <Consumption24V>0</Consumption24V>
          <TechnicalConfiguration>
            <PtoConfiguration>
              <McPowerPtoMax>0</McPowerPtoMax>
              <McMoveVelPtoMax>0</McMoveVelPtoMax>
              <McMoveRelPtoMax>0</McMoveRelPtoMax>
              <McMoveAbsPtoMax>0</McMoveAbsPtoMax>
              <McHomePtoMax>0</McHomePtoMax>
              <McSetPosPtoMax>0</McSetPosPtoMax>
              <McStopPtoMax>0</McStopPtoMax>
              <McHaltPtoMax>0</McHaltPtoMax>
              <McReadActVelPtoMax>0</McReadActVelPtoMax>
              <McReadActPosPtoMax>0</McReadActPosPtoMax>
              <McReadStsPtoMax>0</McReadStsPtoMax>
              <McReadMotionStatePtoMax>0</McReadMotionStatePtoMax>
              <McReadAxisErrorPtoMax>0</McReadAxisErrorPtoMax>
              <McResetPtoMax>0</McResetPtoMax>
              <McTouchProbePtoMax>0</McTouchProbePtoMax>
              <McAbortTriggerPtoMax>0</McAbortTriggerPtoMax>
            </PtoConfiguration>
          </TechnicalConfiguration>
          <DigitalInputs />
          <DigitalOutputs />
          <AnalogInputs>
            <AnalogIO>
              <Address>%IW1.0</Address>
              <Index>0</Index>
              <Symbol>LEVEL_XMTR</Symbol>
              <Comment>Level Transmitter 4-20mA (300-5000mm range)</Comment>
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
              <Maximum>5000</Maximum>
              <IsInput>true</IsInput>
              <R>1</R>
              <B>1</B>
              <T>1</T>
              <Activation>0</Activation>
              <Reactivation>0</Reactivation>
              <InputFilter>0</InputFilter>
            </AnalogIO>
            <AnalogIO>
              <Address>%IW1.1</Address>
              <Index>1</Index>
              <Symbol />
              <Type>
                <Value>31</Value>
                <Name>Type_NotUsed</Name>
              </Type>
              <Scope>
                <Value>128</Value>
                <Name>Scope_NotUsed</Name>
              </Scope>
              <Sampling>
                <Value>0</Value>
                <Name>Sampling_0_1ms</Name>
              </Sampling>
              <Minimum>0</Minimum>
              <Maximum>10000</Maximum>
              <IsInput>true</IsInput>
            </AnalogIO>
            <AnalogIO>
              <Address>%IW1.2</Address>
              <Index>2</Index>
              <Symbol />
              <Type>
                <Value>31</Value>
                <Name>Type_NotUsed</Name>
              </Type>
              <Scope>
                <Value>128</Value>
                <Name>Scope_NotUsed</Name>
              </Scope>
              <Sampling>
                <Value>0</Value>
                <Name>Sampling_0_1ms</Name>
              </Sampling>
              <Minimum>0</Minimum>
              <Maximum>10000</Maximum>
              <IsInput>true</IsInput>
            </AnalogIO>
            <AnalogIO>
              <Address>%IW1.3</Address>
              <Index>3</Index>
              <Symbol />
              <Type>
                <Value>31</Value>
                <Name>Type_NotUsed</Name>
              </Type>
              <Scope>
                <Value>128</Value>
                <Name>Scope_NotUsed</Name>
              </Scope>
              <Sampling>
                <Value>0</Value>
                <Name>Sampling_0_1ms</Name>
              </Sampling>
              <Minimum>0</Minimum>
              <Maximum>10000</Maximum>
              <IsInput>true</IsInput>
            </AnalogIO>
          </AnalogInputs>
          <AnalogInputsStatus>
            <AnalogIoStatus><Address>%IWS1.0</Address><Index>0</Index></AnalogIoStatus>
            <AnalogIoStatus><Address>%IWS1.1</Address><Index>1</Index></AnalogIoStatus>
            <AnalogIoStatus><Address>%IWS1.2</Address><Index>2</Index></AnalogIoStatus>
            <AnalogIoStatus><Address>%IWS1.3</Address><Index>3</Index></AnalogIoStatus>
          </AnalogInputsStatus>
          <AnalogOutputs />
          <AnalogOutputsStatus />
          <HighSpeedCounters />
          <PulseTrainOutputs />
          <HardwareId>193</HardwareId>
          <IsExpander>false</IsExpander>
          <IsOptionnal>false</IsOptionnal>
          <DIOFunctionalMode>DIOFunctionalModeNormal</DIOFunctionalMode>
          <HoldupTime>10</HoldupTime>
        </ModuleExtensionObject>

        <!-- Extension Module 2: TM3TI4/G - RTD Temperature Input (PT100) -->
        <ModuleExtensionObject>
          <Index>1</Index>
          <InputNb>0</InputNb>
          <OutputNb>0</OutputNb>
          <Kind>0</Kind>
          <Reference>TM3TI4/G</Reference>
          <Consumption5V>40</Consumption5V>
          <Consumption24V>0</Consumption24V>
          <TechnicalConfiguration>
            <PtoConfiguration>
              <McPowerPtoMax>0</McPowerPtoMax>
              <McMoveVelPtoMax>0</McMoveVelPtoMax>
              <McMoveRelPtoMax>0</McMoveRelPtoMax>
              <McMoveAbsPtoMax>0</McMoveAbsPtoMax>
              <McHomePtoMax>0</McHomePtoMax>
              <McSetPosPtoMax>0</McSetPosPtoMax>
              <McStopPtoMax>0</McStopPtoMax>
              <McHaltPtoMax>0</McHaltPtoMax>
              <McReadActVelPtoMax>0</McReadActVelPtoMax>
              <McReadActPosPtoMax>0</McReadActPosPtoMax>
              <McReadStsPtoMax>0</McReadStsPtoMax>
              <McReadMotionStatePtoMax>0</McReadMotionStatePtoMax>
              <McReadAxisErrorPtoMax>0</McReadAxisErrorPtoMax>
              <McResetPtoMax>0</McResetPtoMax>
              <McTouchProbePtoMax>0</McTouchProbePtoMax>
              <McAbortTriggerPtoMax>0</McAbortTriggerPtoMax>
            </PtoConfiguration>
          </TechnicalConfiguration>
          <DigitalInputs />
          <DigitalOutputs />
          <AnalogInputs>
            <AnalogIO>
              <Address>%IW2.0</Address>
              <Index>0</Index>
              <Symbol>RTD_TEMP</Symbol>
              <Comment>RTD PT100 Temperature Sensor (0.1 deg C units)</Comment>
              <Type>
                <Value>7</Value>
                <Name>Type_PT100_3W</Name>
              </Type>
              <Scope>
                <Value>32</Value>
                <Name>Scope_Customized</Name>
              </Scope>
              <Sampling>
                <Value>0</Value>
                <Name>Sampling_0_1ms</Name>
              </Sampling>
              <Minimum>-500</Minimum>
              <Maximum>5000</Maximum>
              <IsInput>true</IsInput>
              <R>1</R>
              <B>1</B>
              <T>1</T>
              <Activation>0</Activation>
              <Reactivation>0</Reactivation>
              <InputFilter>0</InputFilter>
            </AnalogIO>
            <AnalogIO>
              <Address>%IW2.1</Address>
              <Index>1</Index>
              <Symbol />
              <Type>
                <Value>31</Value>
                <Name>Type_NotUsed</Name>
              </Type>
              <Scope>
                <Value>128</Value>
                <Name>Scope_NotUsed</Name>
              </Scope>
              <Minimum>0</Minimum>
              <Maximum>10000</Maximum>
              <IsInput>true</IsInput>
            </AnalogIO>
            <AnalogIO>
              <Address>%IW2.2</Address>
              <Index>2</Index>
              <Symbol />
              <Type>
                <Value>31</Value>
                <Name>Type_NotUsed</Name>
              </Type>
              <Scope>
                <Value>128</Value>
                <Name>Scope_NotUsed</Name>
              </Scope>
              <Minimum>0</Minimum>
              <Maximum>10000</Maximum>
              <IsInput>true</IsInput>
            </AnalogIO>
            <AnalogIO>
              <Address>%IW2.3</Address>
              <Index>3</Index>
              <Symbol />
              <Type>
                <Value>31</Value>
                <Name>Type_NotUsed</Name>
              </Type>
              <Scope>
                <Value>128</Value>
                <Name>Scope_NotUsed</Name>
              </Scope>
              <Minimum>0</Minimum>
              <Maximum>10000</Maximum>
              <IsInput>true</IsInput>
            </AnalogIO>
          </AnalogInputs>
          <AnalogInputsStatus>
            <AnalogIoStatus><Address>%IWS2.0</Address><Index>0</Index></AnalogIoStatus>
            <AnalogIoStatus><Address>%IWS2.1</Address><Index>1</Index></AnalogIoStatus>
            <AnalogIoStatus><Address>%IWS2.2</Address><Index>2</Index></AnalogIoStatus>
            <AnalogIoStatus><Address>%IWS2.3</Address><Index>3</Index></AnalogIoStatus>
          </AnalogInputsStatus>
          <AnalogOutputs />
          <AnalogOutputsStatus />
          <HighSpeedCounters />
          <PulseTrainOutputs />
          <HardwareId>194</HardwareId>
          <IsExpander>false</IsExpander>
          <IsOptionnal>false</IsOptionnal>
          <DIOFunctionalMode>DIOFunctionalModeNormal</DIOFunctionalMode>
          <HoldupTime>10</HoldupTime>
        </ModuleExtensionObject>
      </Extensions>
      <SerialLineConfiguration>
        <Baud>Baud19200</Baud>
        <ModemReference>No Modem</ModemReference>
        <Parity>ParityEven</Parity>
        <DataBits>DataBits8</DataBits>
        <StopBits>StopBits1</StopBits>
        <TimeBetweenFrames>10</TimeBetweenFrames>
        <ResponseTime>10</ResponseTime>
        <StartCharacterEnabled>false</StartCharacterEnabled>
        <FirstEndCharacterEnabled>true</FirstEndCharacterEnabled>
        <SecondEndCharacterEnabled>false</SecondEndCharacterEnabled>
        <FrameLengthReceivedAvailable>false</FrameLengthReceivedAvailable>
        <FrameReceivedTimeoutAvailable>false</FrameReceivedTimeoutAvailable>
        <InitCommand />
        <SendFrameCharacter>false</SendFrameCharacter>
        <StartCharacter>0</StartCharacter>
        <FirstEndCharacter>10</FirstEndCharacter>
        <FrameLengthReceived>0</FrameLengthReceived>
        <FrameReceivedTimeout>0</FrameReceivedTimeout>
        <SecondEndCharacter>0</SecondEndCharacter>
        <PhysicalMedium>PhysicalMediumRs485</PhysicalMedium>
        <TransmissionMode>TransmissionModeModbusRtu</TransmissionMode>
        <SlaveId>1</SlaveId>
        <Addressing>SlaveAddressing</Addressing>
      </SerialLineConfiguration>
    </Plc>
  </HardwareConfiguration>
  <DisplayUserLabelsConfiguration>
    <CurrentLanguage>0</CurrentLanguage>
    <DisplayUserLabels />
  </DisplayUserLabelsConfiguration>
  <GlobalProperties>
    <UserInformations />
    <CompanyInformations />
    <ProjectInformations>
      <Name>{project_name}</Name>
    </ProjectInformations>
    <ProjectProtection>
      <Active>false</Active>
      <Password />
      <CanView>true</CanView>
    </ProjectProtection>
    <ApplicationProtection>
      <Active>false</Active>
      <Password />
      <DownloadActive>false</DownloadActive>
      <DownloadPassword />
    </ApplicationProtection>
    <RemoteIpAddresses>
      <IpAddresses />
    </RemoteIpAddresses>
    <ModemConfigurations>
      <ModemConfigurationEntities />
    </ModemConfigurations>
    <KeepModbusParameters>false</KeepModbusParameters>
    <UnitId>1</UnitId>
    <DownloadSettings>
      <ResetMemories>true</ResetMemories>
      <DownloadSymbolsComments>true</DownloadSymbolsComments>
      <DownloadWatchLists>true</DownloadWatchLists>
      <DownloadPouNamesComments>true</DownloadPouNamesComments>
      <DownloadRungNamesComments>true</DownloadRungNamesComments>
      <DownloadIlComments>true</DownloadIlComments>
      <DownloadFrontPageProperties>true</DownloadFrontPageProperties>
      <DownloadCompanyProperties>true</DownloadCompanyProperties>
      <DownloadProjectInfo>true</DownloadProjectInfo>
    </DownloadSettings>
  </GlobalProperties>
  <ReportConfiguration>
    <PageSetup>
      <PaperKind>A4</PaperKind>
      <IsLandscape>false</IsLandscape>
      <ReportUnit>HundredthsOfAnInch</ReportUnit>
      <Top>100</Top>
      <Bottom>100</Bottom>
      <Left>100</Left>
      <Right>100</Right>
    </PageSetup>
    <SubReportConfigurations />
  </ReportConfiguration>
</ProjectDescriptor>'''

    return xml_content

def main():
    """Main function to generate and save the .smbp file"""

    # Generate the XML content
    xml_content = generate_smbp()

    # Define output path
    output_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    plc_programs_dir = os.path.join(output_dir, "plc_programs")

    # Create directory if it doesn't exist
    os.makedirs(plc_programs_dir, exist_ok=True)

    # Output file path
    output_file = os.path.join(plc_programs_dir, "Tank_Level_RTD_1m_TM221CE40T.smbp")

    # Write the file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(xml_content)

    print(f"Generated: {output_file}")
    print("\n=== Tank Level RTD Control Program ===")
    print("Controller: TM221CE40T (24 DI, 16 DO)")
    print("Expansion Module 1: TM3AI4/G (Level Transmitter 4-20mA)")
    print("Expansion Module 2: TM3TI4/G (RTD PT100 Temperature)")
    print("\n--- Specifications ---")
    print("Tank: 1m x 1m x 1m = 1000 liters")
    print("Level transmitter: 4-20mA, deadband 300mm, max range 5000mm")
    print("Transmitter installed 500mm above tank top")
    print("RTD: PT100 3-wire, -50 to 500 deg C range")
    print("\n--- HMI Tags ---")
    print("%MW10: HMI_TANK_LITERS - Tank volume in liters (0-1000)")
    print("%MW11: HMI_TEMPERATURE - Temperature in 0.1 deg C units")
    print("\n--- I/O Assignment ---")
    print("Inputs:")
    print("  %I0.0: START_FILL - Start Fill Button")
    print("  %I0.1: ESTOP - Emergency Stop (NC)")
    print("  %I0.2: INLET_VLV_FB - Inlet Valve Open Feedback")
    print("  %I0.3: INLET_VLV_CL_FB - Inlet Valve Closed Feedback")
    print("  %I0.4: OUTLET_VLV_FB - Outlet Valve Open Feedback")
    print("  %I0.5: OUTLET_VLV_CL_FB - Outlet Valve Closed Feedback")
    print("  %I0.6: ALARM_RESET - Alarm Reset Button")
    print("Outputs:")
    print("  %Q0.0: INLET_VALVE - Inlet Valve Solenoid")
    print("  %Q0.1: OUTLET_VALVE - Outlet Valve Solenoid")
    print("  %Q0.2: INLET_VLV_ALARM - Inlet Valve Failure Alarm")
    print("  %Q0.3: OUTLET_VLV_ALARM - Outlet Valve Failure Alarm")
    print("Analog Inputs:")
    print("  %IW1.0: LEVEL_XMTR - Level Transmitter 4-20mA (300-5000mm)")
    print("  %IW2.0: RTD_TEMP - PT100 Temperature (-50 to 500 deg C)")
    print("\n--- Process Sequence ---")
    print("1. Operator presses START_FILL button")
    print("2. Inlet valve opens, tank fills")
    print("3. When tank full (sensor <= 550mm), inlet valve closes")
    print("4. 10-second stabilization delay for RTD readings")
    print("5. Outlet valve opens automatically")
    print("6. When tank empty (sensor >= 1450mm), outlet valve closes")
    print("7. Valve failure alarms if no position feedback within 5 seconds")
    print("\nPLCAutoPilot v2.4 - Tank Level RTD Control")

if __name__ == "__main__":
    main()
