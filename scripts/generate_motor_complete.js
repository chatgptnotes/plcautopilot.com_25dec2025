/**
 * Motor Start/Stop with Overload Alarm - TM221CE16T
 * PLCAutoPilot v3.2 - Complete Generator
 *
 * Uses template file and preserves exact XML structure
 */

const fs = require('fs');

const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Motor_StartStop_Overload_TM221CE16T.smbp';
const PROJECT_NAME = 'Motor_StartStop_Overload_TM221CE16T';

// Complete rungs for motor control (exact indentation preserved)
const MOTOR_RUNGS = `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.0</Descriptor>
                <Comment>Emergency Stop OK</Comment>
                <Symbol>EMERGENCY_STOP</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>%TM0</Descriptor>
                <Comment />
                <Symbol />
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
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.0</InstructionLine>
                <Comment />
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
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>END_BLK</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>System_Ready</Name>
            <MainComment>3 second startup delay</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.1</Descriptor>
                <Comment>Start PB</Comment>
                <Symbol>START_PB</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>SYSTEM_READY</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.2</Descriptor>
                <Comment>Stop NC</Comment>
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
                <Comment>Motor Run</Comment>
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
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   %M0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Motor_Control</Name>
            <MainComment>Motor start stop with seal-in</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment />
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
                <Comment>Motor Output</Comment>
                <Symbol>MOTOR_CONTACTOR</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment />
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
                <Comment />
                <Symbol>MOTOR_RUNNING</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.3</Descriptor>
                <Comment>OL Trip NC</Comment>
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
                <Comment />
                <Symbol />
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>BLK   %TM1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.3</InstructionLine>
                <Comment />
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
            <MainComment>Overload detection 500ms debounce</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM1.Q</Descriptor>
                <Comment>OL Confirm</Comment>
                <Symbol />
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.4</Descriptor>
                <Comment>Reset</Comment>
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
                <Comment>OL Alarm</Comment>
                <Symbol>OVERLOAD_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Latch</Comment>
                <Symbol>OVERLOAD_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %TM1.Q</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.4</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Overload_Alarm</Name>
            <MainComment>Overload alarm latched until reset</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment />
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
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Any_Alarm</Name>
            <MainComment>Consolidate alarms</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment />
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
                <Comment>Run Lamp</Comment>
                <Symbol>MOTOR_RUN_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Run_Lamp</Name>
            <MainComment>Motor run indicator</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment />
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
                <Comment>Alarm Lamp</Comment>
                <Symbol>OVERLOAD_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Alarm_Lamp</Name>
            <MainComment>Overload alarm indicator</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
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
                <Comment>Ready Lamp</Comment>
                <Symbol>READY_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Ready_Lamp</Name>
            <MainComment>System ready indicator</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;

// Memory bits
const MEMORY_BITS = `    <MemoryBits>
      <MemoryBit>
        <Address>%M0</Address>
        <Index>0</Index>
        <Symbol>SYSTEM_READY</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M1</Address>
        <Index>1</Index>
        <Symbol>MOTOR_RUNNING</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M2</Address>
        <Index>2</Index>
        <Symbol>OVERLOAD_ALARM</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M3</Address>
        <Index>3</Index>
        <Symbol>ANY_ALARM</Symbol>
      </MemoryBit>
    </MemoryBits>`;

// Timers - CRITICAL: TimerTM with Base
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
    console.log("Motor Start/Stop with Overload Alarm - TM221CE16T");
    console.log("Reading template...");

    let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // 1. Update project name
    console.log("Updating project name...");
    content = content.replace(/Template for configuration of cards/g, PROJECT_NAME);
    content = content.replace(/<Name>New POU<\/Name>/g, '<Name>Motor_Control</Name>');

    // 2. Change controller to TM221CE16T
    console.log("Setting controller to TM221CE16T...");
    content = content.replace(/<Reference>TM221CE40T<\/Reference>/g, '<Reference>TM221CE16T</Reference>');

    // 3. Replace rungs - find the exact pattern
    console.log("Replacing ladder rungs...");
    const rungsStart = content.indexOf('<Rungs>');
    const rungsEnd = content.indexOf('</Rungs>') + '</Rungs>'.length;
    if (rungsStart !== -1 && rungsEnd !== -1) {
        content = content.substring(0, rungsStart) + '<Rungs>\n' + MOTOR_RUNGS + '\n        </Rungs>' + content.substring(rungsEnd);
    }

    // 4. Replace memory bits - find exact pattern
    console.log("Updating memory bits...");
    const mbStart = content.indexOf('<MemoryBits>');
    const mbEnd = content.indexOf('</MemoryBits>') + '</MemoryBits>'.length;
    // Only replace the first occurrence (not MemoryBitsMemoryAllocation)
    if (mbStart !== -1 && mbEnd !== -1 && mbStart > content.indexOf('</PtosMemoryAllocation>')) {
        content = content.substring(0, mbStart) + MEMORY_BITS + content.substring(mbEnd);
    }

    // 5. Replace timers
    console.log("Updating timers...");
    const tmStart = content.indexOf('<Timers>');
    const tmEnd = content.indexOf('</Timers>') + '</Timers>'.length;
    if (tmStart !== -1 && tmEnd !== -1) {
        content = content.substring(0, tmStart) + TIMERS + content.substring(tmEnd);
    }

    // 6. Clear extensions (TM221CE16T base unit only)
    console.log("Clearing extension modules...");
    const extStart = content.indexOf('<Extensions>');
    const extEnd = content.indexOf('</Extensions>') + '</Extensions>'.length;
    if (extStart !== -1 && extEnd !== -1) {
        content = content.substring(0, extStart) + '<Extensions />' + content.substring(extEnd);
    }

    // 7. Clear cartridges
    console.log("Clearing cartridges...");
    const cart1Start = content.indexOf('<Cartridge1>');
    const cart1End = content.indexOf('</Cartridge1>') + '</Cartridge1>'.length;
    if (cart1Start !== -1 && cart1End !== -1) {
        content = content.substring(0, cart1Start) + '<Cartridge1 />' + content.substring(cart1End);
    }
    const cart2Start = content.indexOf('<Cartridge2>');
    const cart2End = content.indexOf('</Cartridge2>') + '</Cartridge2>'.length;
    if (cart2Start !== -1 && cart2End !== -1) {
        content = content.substring(0, cart2Start) + '<Cartridge2 />' + content.substring(cart2End);
    }

    // Write output
    console.log("Writing output file...");
    fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

    console.log("");
    console.log("=".repeat(70));
    console.log("SUCCESS: Motor Start/Stop Program Generated");
    console.log("=".repeat(70));
    console.log("");
    console.log("Output: " + OUTPUT_PATH);
    console.log("Controller: TM221CE16T");
    console.log("");
    console.log("I/O MAPPING:");
    console.log("  %I0.0: EMERGENCY_STOP (NC)");
    console.log("  %I0.1: START_PB (NO)");
    console.log("  %I0.2: STOP_PB (NC)");
    console.log("  %I0.3: OVERLOAD_RELAY (NC)");
    console.log("  %I0.4: ALARM_RESET_PB (NO)");
    console.log("");
    console.log("  %Q0.0: MOTOR_CONTACTOR");
    console.log("  %Q0.1: MOTOR_RUN_LAMP");
    console.log("  %Q0.2: OVERLOAD_LAMP");
    console.log("  %Q0.3: READY_LAMP");
    console.log("");
    console.log("PROGRAM (9 rungs):");
    console.log("  1. System Ready (3s timer)");
    console.log("  2. Motor Start/Stop with seal-in");
    console.log("  3. Motor Contactor Output");
    console.log("  4. Overload Detection (500ms debounce)");
    console.log("  5. Overload Alarm Latch");
    console.log("  6. Any Alarm Consolidation");
    console.log("  7. Motor Run Lamp");
    console.log("  8. Overload Alarm Lamp");
    console.log("  9. System Ready Lamp");

} catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
}
