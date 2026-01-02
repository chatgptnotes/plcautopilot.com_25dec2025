/**
 * Motor Start/Stop with Overload Alarm Generator - TM221CE16T
 * PLCAutoPilot v3.2 - Uses Template as Base
 *
 * This script modifies the working template file to create a motor control program.
 * CRITICAL: Must use template file to ensure proper XML structure.
 */

const fs = require('fs');

const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Motor_StartStop_Overload_TM221CE16T.smbp';
const PROJECT_NAME = 'Motor_StartStop_Overload_TM221CE16T';

// Motor Control Rungs
const MOTOR_CONTROL_RUNGS = `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.0</Descriptor>
                <Comment>Emergency Stop OK (NC)</Comment>
                <Symbol>EMERGENCY_STOP</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>%TM0</Descriptor>
                <Comment>3s Startup Delay</Comment>
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
            <MainComment>3 second startup delay before system ready</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
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
                <Comment>No Alarm</Comment>
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
                <Comment>Seal-In</Comment>
                <Symbol>MOTOR_RUNNING</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.1</InstructionLine>
                <Comment>Start PB</Comment>
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
                <Comment>Stop PB (NC)</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M3</InstructionLine>
                <Comment>No Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment>Motor Running</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Motor_Control</Name>
            <MainComment>Motor start/stop with seal-in latch</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
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
                <Comment>Overload (NC)</Comment>
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
                <Symbol>OVERLOAD_TMR</Symbol>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>BLK   %TM1</InstructionLine>
                <Comment>Overload Timer</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment>Motor Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.3</InstructionLine>
                <Comment>Overload (NC)</Comment>
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
            <MainComment>Overload detection with debounce</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM1.Q</Descriptor>
                <Comment>Timer Done</Comment>
                <Symbol>OL_TMR_DONE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.4</Descriptor>
                <Comment>Reset Not Pressed</Comment>
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
                <Comment>Seal-In</Comment>
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
                <Comment>Timer Done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M2</InstructionLine>
                <Comment>Seal-In</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.4</InstructionLine>
                <Comment>Reset Not Pressed</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment>Overload Alarm</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Overload_Alarm</Name>
            <MainComment>Overload alarm latch with reset</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
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
            <MainComment>Consolidate all alarms</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
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
          </RungEntity>`;

// Memory bits definition
const MEMORY_BITS = `    <MemoryBits>
      <MemoryBit>
        <Address>%M0</Address>
        <Index>0</Index>
        <Symbol>SYSTEM_READY</Symbol>
        <Comment>System ready after 3s startup</Comment>
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
    </MemoryBits>`;

// Timer definitions - CRITICAL: Use TimerTM with Base (NOT Timer with TimeBase)
const TIMERS = `    <Timers>
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
    </Timers>`;

try {
    console.log("Motor Start/Stop with Overload Alarm Generator");
    console.log("Using template: " + TEMPLATE_PATH);
    console.log();

    // Read template
    console.log("Reading template file...");
    let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // Update project name
    console.log("Updating project name...");
    content = content.replace(/Template for configuration of cards/g, PROJECT_NAME);
    content = content.replace(/<Name>New POU<\/Name>/g, '<Name>Motor Control</Name>');

    // Replace rungs section
    console.log("Replacing ladder rungs...");
    content = content.replace(/<Rungs>[\s\S]*?<\/Rungs>/,
        `<Rungs>\n${MOTOR_CONTROL_RUNGS}\n        </Rungs>`);

    // Replace memory bits
    console.log("Updating memory bits...");
    content = content.replace(/<MemoryBits>[\s\S]*?<\/MemoryBits>/, MEMORY_BITS);

    // Replace timers
    console.log("Updating timer definitions...");
    content = content.replace(/<Timers>[\s\S]*?<\/Timers>/, TIMERS);

    // Update controller reference to TM221CE16T
    console.log("Setting controller to TM221CE16T...");
    content = content.replace(/<Reference>TM221CE40T<\/Reference>/g,
        '<Reference>TM221CE16T</Reference>');

    // Remove extension modules
    console.log("Clearing extension modules...");
    content = content.replace(/<Extensions>[\s\S]*?<\/Extensions>/,
        '<Extensions />');

    // Clear cartridges
    console.log("Clearing cartridges...");
    content = content.replace(/<Cartridge1>[\s\S]*?<\/Cartridge1>/,
        '<Cartridge1 />');
    content = content.replace(/<Cartridge2>[\s\S]*?<\/Cartridge2>/,
        '<Cartridge2 />');

    // Write output file
    console.log("Writing output file...");
    fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

    console.log();
    console.log("=".repeat(70));
    console.log("SUCCESS: Motor Start/Stop Program Generated from Template");
    console.log("=".repeat(70));
    console.log();
    console.log("Output: " + OUTPUT_PATH);
    console.log();
    console.log("--- I/O MAPPING ---");
    console.log("INPUTS:");
    console.log("  %I0.0: EMERGENCY_STOP (NC)");
    console.log("  %I0.1: START_PB (NO)");
    console.log("  %I0.2: STOP_PB (NC)");
    console.log("  %I0.3: OVERLOAD_RELAY (NC)");
    console.log("  %I0.4: ALARM_RESET_PB (NO)");
    console.log();
    console.log("OUTPUTS:");
    console.log("  %Q0.0: MOTOR_CONTACTOR");
    console.log("  %Q0.1: MOTOR_RUN_LAMP");
    console.log("  %Q0.2: OVERLOAD_ALARM_LAMP");
    console.log("  %Q0.3: READY_LAMP");
    console.log();
    console.log("--- PROGRAM RUNGS (9 total) ---");
    console.log("1. System Ready Timer (3s)");
    console.log("2. Motor Start/Stop with Seal-In");
    console.log("3. Motor Contactor Output");
    console.log("4. Overload Detection (500ms debounce)");
    console.log("5. Overload Alarm Latch");
    console.log("6. Any Alarm Consolidation");
    console.log("7. Motor Run Lamp");
    console.log("8. Overload Alarm Lamp");
    console.log("9. System Ready Lamp");
    console.log();
    console.log("PLCAutoPilot v3.2 - Template-based generation");

} catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
}
