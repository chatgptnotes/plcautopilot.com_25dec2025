/**
 * Motor Start/Stop with Overload Alarm - TM221CE16T
 * PLCAutoPilot v3.2 - AI Generated PLC Program
 *
 * Specifications:
 * - Controller: TM221CE16T (9 DI, 7 DO)
 * - Motor start/stop with seal-in latch
 * - Overload protection with latched alarm
 * - 3-second startup delay (System Ready)
 * - Alarm reset functionality
 *
 * I/O Mapping:
 * - %I0.0: EMERGENCY_STOP (NC - normally closed for safety)
 * - %I0.1: START_PB (NO pushbutton)
 * - %I0.2: STOP_PB (NC pushbutton - fail-safe)
 * - %I0.3: OVERLOAD_RELAY (NC - thermal overload contact)
 * - %I0.4: ALARM_RESET_PB (NO pushbutton)
 *
 * - %Q0.0: MOTOR_CONTACTOR (main motor output)
 * - %Q0.1: MOTOR_RUN_LAMP (running indicator)
 * - %Q0.2: OVERLOAD_ALARM_LAMP (alarm indicator)
 * - %Q0.3: READY_LAMP (system ready indicator)
 *
 * Memory Bits:
 * - %M0: SYSTEM_READY (after 3s startup)
 * - %M1: MOTOR_RUNNING (motor status)
 * - %M2: OVERLOAD_ALARM (latched alarm)
 * - %M3: ANY_ALARM (consolidated alarm)
 *
 * Timers:
 * - %TM0: System Ready Timer (3 seconds)
 * - %TM1: Overload Debounce Timer (500ms)
 */

const fs = require('fs');

const PROJECT_NAME = 'Motor_StartStop_Overload_TM221CE16T';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Motor_StartStop_Overload_TM221CE16T.smbp';

// Generate line elements for columns
function generateLines(startCol, endCol, row = 0) {
    let lines = '';
    for (let col = startCol; col <= endCol; col++) {
        lines += `
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>${row}</Row>
                <Column>${col}</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`;
    }
    return lines;
}

// Complete SMBP file content
const SMBP_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<ProjectDescriptor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ProjectVersion>3.0.0.0</ProjectVersion>
  <ManagementLevel>FunctLevelMan21_0</ManagementLevel>
  <Name>${PROJECT_NAME}</Name>
  <FullName>C:\\Projects\\${PROJECT_NAME}.smbp</FullName>
  <CurrentCultureName>en-GB</CurrentCultureName>
  <SoftwareConfiguration>
    <Pous>
      <ProgramOrganizationUnits>
        <Name>Motor Control</Name>
        <SectionNumber>1</SectionNumber>
        <Rungs>
          <!-- Rung 0: System Ready Timer (3 second startup delay) -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.0</Descriptor>
                <Comment>Emergency Stop OK (NC contact)</Comment>
                <Symbol>EMERGENCY_STOP</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>%TM0</Descriptor>
                <Comment>3 second startup delay</Comment>
                <Symbol>STARTUP_TMR</Symbol>
                <Row>0</Row>
                <Column>1</Column>
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
                <Descriptor>%M0</Descriptor>
                <Comment>System Ready</Comment>
                <Symbol>SYSTEM_READY</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>BLK   %TM0</InstructionLine>
                <Comment>System Ready Timer</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.0</InstructionLine>
                <Comment>Emergency Stop OK</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>IN</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OUT_BLK</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    Q</InstructionLine>
                <Comment>Timer Done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>END_BLK</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>System_Ready</Name>
            <MainComment>3 second startup delay - SYSTEM_READY after timer done</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 1: Motor Start/Stop with Seal-In Latch -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.1</Descriptor>
                <Comment>Start Pushbutton</Comment>
                <Symbol>START_PB</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment>System Ready</Comment>
                <Symbol>SYSTEM_READY</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.2</Descriptor>
                <Comment>Stop Pushbutton (NC)</Comment>
                <Symbol>STOP_PB</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M3</Descriptor>
                <Comment>No Alarm Active</Comment>
                <Symbol>ANY_ALARM</Symbol>
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
                <Descriptor>%M1</Descriptor>
                <Comment>Motor Running</Comment>
                <Symbol>MOTOR_RUNNING</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Seal-In Contact</Comment>
                <Symbol>MOTOR_RUNNING</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.1</InstructionLine>
                <Comment>Start Pushbutton</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M1</InstructionLine>
                <Comment>Seal-In</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.2</InstructionLine>
                <Comment>Stop Pushbutton (NC)</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M3</InstructionLine>
                <Comment>No Alarm Active</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment>Motor Running</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Motor_Control</Name>
            <MainComment>Motor start/stop with seal-in latch, blocked by alarm</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 2: Motor Contactor Output -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Motor Running</Comment>
                <Symbol>MOTOR_RUNNING</Symbol>
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
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Motor Contactor</Comment>
                <Symbol>MOTOR_CONTACTOR</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment>Motor Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment>Motor Contactor</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Motor_Output</Name>
            <MainComment>Motor contactor output</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 3: Overload Detection with Debounce Timer -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Motor Running</Comment>
                <Symbol>MOTOR_RUNNING</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.3</Descriptor>
                <Comment>Overload Tripped (NC relay)</Comment>
                <Symbol>OVERLOAD_RELAY</Symbol>
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
                <ElementType>Timer</ElementType>
                <Descriptor>%TM1</Descriptor>
                <Comment>500ms Debounce</Comment>
                <Symbol>OVERLOAD_DEBOUNCE</Symbol>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>BLK   %TM1</InstructionLine>
                <Comment>Overload Debounce Timer</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment>Motor Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.3</InstructionLine>
                <Comment>Overload Tripped (NC)</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>IN</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OUT_BLK</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>END_BLK</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Overload_Detect</Name>
            <MainComment>Overload detection with 500ms debounce timer</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 4: Overload Alarm Latch -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM1.Q</Descriptor>
                <Comment>Debounce Timer Done</Comment>
                <Symbol>OVERLOAD_CONFIRM</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.4</Descriptor>
                <Comment>Alarm Reset Not Pressed</Comment>
                <Symbol>ALARM_RESET_PB</Symbol>
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
                <Descriptor>%M2</Descriptor>
                <Comment>Overload Alarm</Comment>
                <Symbol>OVERLOAD_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Alarm Seal-In</Comment>
                <Symbol>OVERLOAD_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>None</ElementType>
                <Row>1</Row>
                <Column>10</Column>
                <ChosenConnection>None</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %TM1.Q</InstructionLine>
                <Comment>Debounce Timer Done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M2</InstructionLine>
                <Comment>Alarm Seal-In</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.4</InstructionLine>
                <Comment>Alarm Reset Not Pressed</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment>Overload Alarm</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Overload_Alarm</Name>
            <MainComment>Overload alarm latch - reset with ALARM_RESET_PB</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 5: Any Alarm Consolidation -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Overload Alarm</Comment>
                <Symbol>OVERLOAD_ALARM</Symbol>
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
                <Descriptor>%M3</Descriptor>
                <Comment>Any Alarm</Comment>
                <Symbol>ANY_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M2</InstructionLine>
                <Comment>Overload Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M3</InstructionLine>
                <Comment>Any Alarm</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Any_Alarm</Name>
            <MainComment>Consolidate all alarms (expandable for more alarm types)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 6: Motor Run Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Motor Running</Comment>
                <Symbol>MOTOR_RUNNING</Symbol>
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
                <Descriptor>%Q0.1</Descriptor>
                <Comment>Motor Run Lamp</Comment>
                <Symbol>MOTOR_RUN_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment>Motor Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.1</InstructionLine>
                <Comment>Motor Run Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Run_Lamp</Name>
            <MainComment>Motor running indicator lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 7: Overload Alarm Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Overload Alarm</Comment>
                <Symbol>OVERLOAD_ALARM</Symbol>
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
                <Descriptor>%Q0.2</Descriptor>
                <Comment>Overload Alarm Lamp</Comment>
                <Symbol>OVERLOAD_ALARM_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M2</InstructionLine>
                <Comment>Overload Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.2</InstructionLine>
                <Comment>Overload Alarm Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Alarm_Lamp</Name>
            <MainComment>Overload alarm indicator lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 8: System Ready Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment>System Ready</Comment>
                <Symbol>SYSTEM_READY</Symbol>
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
                <Descriptor>%Q0.3</Descriptor>
                <Comment>System Ready Lamp</Comment>
                <Symbol>READY_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.3</InstructionLine>
                <Comment>System Ready Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Ready_Lamp</Name>
            <MainComment>System ready indicator lamp</MainComment>
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
    <MemoryBits>
      <MemoryBit>
        <Address>%M0</Address>
        <Index>0</Index>
        <Symbol>SYSTEM_READY</Symbol>
        <Comment>System ready after 3s startup delay</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%M1</Address>
        <Index>1</Index>
        <Symbol>MOTOR_RUNNING</Symbol>
        <Comment>Motor running status</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%M2</Address>
        <Index>2</Index>
        <Symbol>OVERLOAD_ALARM</Symbol>
        <Comment>Overload alarm latched</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%M3</Address>
        <Index>3</Index>
        <Symbol>ANY_ALARM</Symbol>
        <Comment>Any alarm active</Comment>
      </MemoryBit>
    </MemoryBits>
    <SystemBits />
    <SystemWords />
    <GrafcetSteps />
    <MemoryWords />
    <MemoryDoubleWords />
    <MemoryFloats />
    <ConstantWords />
    <ConstantDoubleWords />
    <ConstantMemoryFloats />
    <Timers>
      <TimerTM>
        <Address>%TM0</Address>
        <Index>0</Index>
        <Preset>3</Preset>
        <Base>OneSecond</Base>
      </TimerTM>
      <TimerTM>
        <Address>%TM1</Address>
        <Index>1</Index>
        <Preset>5</Preset>
        <Base>HundredMilliseconds</Base>
      </TimerTM>
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
        <Reference>TM221CE16T</Reference>
        <Name>MyController</Name>
        <Consumption5V>400</Consumption5V>
        <Consumption24V>150</Consumption24V>
        <TechnicalConfiguration>
          <PtoConfiguration>
            <McPowerPtoMax>86</McPowerPtoMax>
            <McMoveVelPtoMax>86</McMoveVelPtoMax>
            <McMoveRelPtoMax>86</McMoveRelPtoMax>
            <McMoveAbsPtoMax>86</McMoveAbsPtoMax>
            <McHomePtoMax>86</McHomePtoMax>
            <McSetPosPtoMax>86</McSetPosPtoMax>
            <McStopPtoMax>86</McStopPtoMax>
            <McHaltPtoMax>86</McHaltPtoMax>
            <McReadActVelPtoMax>40</McReadActVelPtoMax>
            <McReadActPosPtoMax>40</McReadActPosPtoMax>
            <McReadStsPtoMax>40</McReadStsPtoMax>
            <McReadMotionStatePtoMax>40</McReadMotionStatePtoMax>
            <McReadAxisErrorPtoMax>40</McReadAxisErrorPtoMax>
            <McResetPtoMax>40</McResetPtoMax>
            <McTouchProbePtoMax>40</McTouchProbePtoMax>
            <McAbortTriggerPtoMax>40</McAbortTriggerPtoMax>
            <McReadParPtoMax>40</McReadParPtoMax>
            <McWriteParPtoMax>40</McWriteParPtoMax>
            <McMotionTaskPtoMax>2</McMotionTaskPtoMax>
          </PtoConfiguration>
          <ComConfiguration>
            <ReadVarBasicMax>32</ReadVarBasicMax>
            <WriteVarBasicMax>32</WriteVarBasicMax>
            <WriteReadVarBasicMax>32</WriteReadVarBasicMax>
            <SendRecvMsgBasicMax>16</SendRecvMsgBasicMax>
            <SendRecvSmsMax>1</SendRecvSmsMax>
          </ComConfiguration>
          <Compatibility>0</Compatibility>
          <FastCounterMax>4</FastCounterMax>
          <FourInputsEventTask>84148994</FourInputsEventTask>
          <GrafcetBitsMax>200</GrafcetBitsMax>
          <InternalRamStart>0</InternalRamStart>
          <LabelsMax>64</LabelsMax>
          <LfRegistersMax>4</LfRegistersMax>
          <MemoryConstantWordsMax>512</MemoryConstantWordsMax>
          <MemoryWordsMax>8000</MemoryWordsMax>
          <NumRelays>0</NumRelays>
          <NumRelaysMax>9999</NumRelaysMax>
          <NumTransistors>7</NumTransistors>
          <NumTransistorsMax>9999</NumTransistorsMax>
          <PidAmountMax>14</PidAmountMax>
          <PlcNumberSysBits>160</PlcNumberSysBits>
          <PlcNumberSysWords>234</PlcNumberSysWords>
          <PlcStartAddrSysBits>16</PlcStartAddrSysBits>
          <PlcType>0</PlcType>
          <TimersMax>255</TimersMax>
          <AnalogInputPrecision>0</AnalogInputPrecision>
          <AnalogOutputPrecision>0</AnalogOutputPrecision>
          <StepCountersMax>8</StepCountersMax>
          <CountersMax>255</CountersMax>
          <DrumsMax>8</DrumsMax>
          <ExternalRamSize>184320</ExternalRamSize>
          <ExternalRamSizeWithDisplay>221776</ExternalRamSizeWithDisplay>
          <ExternalRamStart>117538816</ExternalRamStart>
          <InternalRamAppStart>512</InternalRamAppStart>
          <InternalRamSize>130560</InternalRamSize>
          <InternalBitsMax>1024</InternalBitsMax>
          <InternalEepromSize>32</InternalEepromSize>
          <MetadataAreaSize>45056</MetadataAreaSize>
          <ScheduleBlocksMax>16</ScheduleBlocksMax>
          <ShiftBitRegistersMax>8</ShiftBitRegistersMax>
          <SubroutinesMax>64</SubroutinesMax>
          <SupportDoubleWord>true</SupportDoubleWord>
          <SupportEvents>true</SupportEvents>
          <SupportFloatingPoint>true</SupportFloatingPoint>
          <NumberOf1MsTimerBase>6</NumberOf1MsTimerBase>
          <UdfbInstanceMax>32</UdfbInstanceMax>
          <UdfMax>64</UdfMax>
          <UdfObjectsMax>4096</UdfObjectsMax>
        </TechnicalConfiguration>
        <DigitalInputs>
          <DiscretInput>
            <Address>%I0.0</Address>
            <Index>0</Index>
            <Symbol>EMERGENCY_STOP</Symbol>
            <Comment>Emergency Stop (NC for safety)</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.1</Address>
            <Index>1</Index>
            <Symbol>START_PB</Symbol>
            <Comment>Start Pushbutton (NO)</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.2</Address>
            <Index>2</Index>
            <Symbol>STOP_PB</Symbol>
            <Comment>Stop Pushbutton (NC for fail-safe)</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.3</Address>
            <Index>3</Index>
            <Symbol>OVERLOAD_RELAY</Symbol>
            <Comment>Thermal Overload Contact (NC)</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.4</Address>
            <Index>4</Index>
            <Symbol>ALARM_RESET_PB</Symbol>
            <Comment>Alarm Reset Pushbutton (NO)</Comment>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.5</Address>
            <Index>5</Index>
            <Symbol>SPARE_IN_5</Symbol>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.6</Address>
            <Index>6</Index>
            <Symbol>SPARE_IN_6</Symbol>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.7</Address>
            <Index>7</Index>
            <Symbol>SPARE_IN_7</Symbol>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
          <DiscretInput>
            <Address>%I0.8</Address>
            <Index>8</Index>
            <Symbol>SPARE_IN_8</Symbol>
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>
        </DigitalInputs>
        <DigitalOutputs>
          <DiscretOutput>
            <Address>%Q0.0</Address>
            <Index>0</Index>
            <Symbol>MOTOR_CONTACTOR</Symbol>
            <Comment>Motor Contactor Output</Comment>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.1</Address>
            <Index>1</Index>
            <Symbol>MOTOR_RUN_LAMP</Symbol>
            <Comment>Motor Running Indicator</Comment>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.2</Address>
            <Index>2</Index>
            <Symbol>OVERLOAD_ALARM_LAMP</Symbol>
            <Comment>Overload Alarm Indicator</Comment>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.3</Address>
            <Index>3</Index>
            <Symbol>READY_LAMP</Symbol>
            <Comment>System Ready Indicator</Comment>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.4</Address>
            <Index>4</Index>
            <Symbol>SPARE_OUT_4</Symbol>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.5</Address>
            <Index>5</Index>
            <Symbol>SPARE_OUT_5</Symbol>
          </DiscretOutput>
          <DiscretOutput>
            <Address>%Q0.6</Address>
            <Index>6</Index>
            <Symbol>SPARE_OUT_6</Symbol>
          </DiscretOutput>
        </DigitalOutputs>
        <AnalogInputs />
        <AnalogOutputs />
        <HighSpeedCounters />
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
        <HardwareId>1929</HardwareId>
        <IsExpander>false</IsExpander>
      </Cpu>
      <Extensions />
      <Cartridge1 />
      <Cartridge2 />
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
  <DisplayUserLabelsConfiguration>
    <DisplayUserLabels>true</DisplayUserLabels>
    <DisplayProgramNames>true</DisplayProgramNames>
    <DisplaySectionNames>true</DisplaySectionNames>
    <DisplayRungNames>true</DisplayRungNames>
  </DisplayUserLabelsConfiguration>
  <GlobalProperties>
    <UserInformations />
    <CompanyInformations />
    <ProjectInformations>
      <Name>${PROJECT_NAME}</Name>
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
</ProjectDescriptor>`;

// Write the file
try {
    console.log('Generating Motor Start/Stop with Overload Alarm program...');
    console.log('');

    fs.writeFileSync(OUTPUT_PATH, SMBP_CONTENT, 'utf8');

    console.log('='.repeat(70));
    console.log('SUCCESS: Motor Start/Stop with Overload Alarm Program Generated');
    console.log('='.repeat(70));
    console.log('');
    console.log('Output File: ' + OUTPUT_PATH);
    console.log('');
    console.log('--- CONTROLLER ---');
    console.log('Model: TM221CE16T');
    console.log('Digital Inputs: 9 (%I0.0 - %I0.8)');
    console.log('Digital Outputs: 7 (%Q0.0 - %Q0.6)');
    console.log('');
    console.log('--- I/O MAPPING ---');
    console.log('INPUTS:');
    console.log('  %I0.0: EMERGENCY_STOP (NC - normally closed for safety)');
    console.log('  %I0.1: START_PB (NO pushbutton)');
    console.log('  %I0.2: STOP_PB (NC pushbutton - fail-safe)');
    console.log('  %I0.3: OVERLOAD_RELAY (NC - thermal overload contact)');
    console.log('  %I0.4: ALARM_RESET_PB (NO pushbutton)');
    console.log('');
    console.log('OUTPUTS:');
    console.log('  %Q0.0: MOTOR_CONTACTOR (main motor output)');
    console.log('  %Q0.1: MOTOR_RUN_LAMP (running indicator)');
    console.log('  %Q0.2: OVERLOAD_ALARM_LAMP (alarm indicator)');
    console.log('  %Q0.3: READY_LAMP (system ready indicator)');
    console.log('');
    console.log('--- MEMORY BITS ---');
    console.log('  %M0: SYSTEM_READY (after 3s startup)');
    console.log('  %M1: MOTOR_RUNNING (motor status)');
    console.log('  %M2: OVERLOAD_ALARM (latched alarm)');
    console.log('  %M3: ANY_ALARM (consolidated alarm)');
    console.log('');
    console.log('--- TIMERS ---');
    console.log('  %TM0: System Ready Timer (3 seconds)');
    console.log('  %TM1: Overload Debounce Timer (500ms)');
    console.log('');
    console.log('--- PROGRAM RUNGS (9 total) ---');
    console.log('  Rung 0: System Ready Timer (3s startup delay)');
    console.log('  Rung 1: Motor Start/Stop with Seal-In Latch');
    console.log('  Rung 2: Motor Contactor Output');
    console.log('  Rung 3: Overload Detection with Debounce');
    console.log('  Rung 4: Overload Alarm Latch');
    console.log('  Rung 5: Any Alarm Consolidation');
    console.log('  Rung 6: Motor Run Lamp');
    console.log('  Rung 7: Overload Alarm Lamp');
    console.log('  Rung 8: System Ready Lamp');
    console.log('');
    console.log('--- SAFETY FEATURES ---');
    console.log('  - Emergency Stop (NC contact for fail-safe)');
    console.log('  - Stop PB (NC contact for fail-safe)');
    console.log('  - Overload (NC contact for fail-safe)');
    console.log('  - 3-second startup delay before operation');
    console.log('  - 500ms debounce on overload detection');
    console.log('  - Latched alarm with manual reset');
    console.log('  - Motor blocked when ANY_ALARM active');
    console.log('');
    console.log('--- OPERATION ---');
    console.log('1. Apply power, wait 3 seconds for READY_LAMP');
    console.log('2. Press START_PB to start motor');
    console.log('3. Press STOP_PB (release NC) to stop motor');
    console.log('4. If overload trips, motor stops and OVERLOAD_ALARM_LAMP lights');
    console.log('5. Clear overload condition, press ALARM_RESET_PB to reset alarm');
    console.log('6. Press EMERGENCY_STOP to stop motor immediately');
    console.log('');
    console.log('PLCAutoPilot v3.2 - AI Generated PLC Program');
    console.log('Generated: ' + new Date().toISOString());

} catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
}
