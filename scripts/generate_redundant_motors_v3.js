/**
 * Redundant Motor Start/Stop Program - TM221CE16T - v3 FIXED
 * PLCAutoPilot v3.2 - Fixed OR branch connections
 *
 * Fix: OR branches must have both elements in SAME column
 * - Element with Down connection at Row 0
 * - Element with Up connection at Row 1
 * - IL must match ladder order
 */

const fs = require('fs');

const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Redundant_Motors_v3.smbp';

// Generate line elements
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

// Fixed redundant motor control rungs - v3 with correct OR branches
const REDUNDANT_MOTOR_RUNGS = `
          <!-- Rung 3: Run Request with Seal-in -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.1</Descriptor>
                <Comment>Start Button</Comment>
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
                <Comment>Stop NC</Comment>
                <Symbol>STOP_PB</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(3, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Run Request</Comment>
                <Symbol>RUN_REQUEST</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Seal-in</Comment>
                <Symbol>RUN_REQUEST</Symbol>
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
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Run_Request</Name>
            <MainComment>Operator run request with seal-in</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 4: Motor 1 Command -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Run Req</Comment>
                <Symbol>RUN_REQUEST</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>M1 OK</Comment>
                <Symbol>M1_FAIL</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M8</Descriptor>
                <Comment>No OL</Comment>
                <Symbol>M1_OL_ALARM</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.3</Descriptor>
                <Comment>OL OK</Comment>
                <Symbol>M1_OVERLOAD</Symbol>
                <Row>0</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(4, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>M1 Cmd</Comment>
                <Symbol>M1_CMD</Symbol>
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
                <InstructionLine>ANDN  %M6</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M8</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M1_Command</Name>
            <MainComment>Motor 1 command - primary motor</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 5: Motor 1 Contactor -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>M1 Cmd</Comment>
                <Symbol>M1_CMD</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>M1 Cont</Comment>
                <Symbol>M1_CONTACTOR</Symbol>
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
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M1_Contactor</Name>
            <MainComment>Motor 1 contactor output</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 6: Motor 1 Running -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.5</Descriptor>
                <Comment>M1 Speed</Comment>
                <Symbol>M1_ZERO_SPEED</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>M1 Run</Comment>
                <Symbol>M1_RUNNING</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.5</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M4</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M1_Running</Name>
            <MainComment>Motor 1 running confirmed by zero speed sensor</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 7: Motor 1 Failure (cmd ON but not running for 5s) - Latched -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>M1 Cmd</Comment>
                <Symbol>M1_CMD</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>Not Run</Comment>
                <Symbol>M1_RUNNING</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM1.Q</Descriptor>
                <Comment>5s Done</Comment>
                <Symbol>M1_TMR_Q</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.7</Descriptor>
                <Comment>No Reset</Comment>
                <Symbol>ALARM_RESET</Symbol>
                <Row>0</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(4, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>M1 Fail</Comment>
                <Symbol>M1_FAIL</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>Latch</Comment>
                <Symbol>M1_FAIL</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M4</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   %TM1.Q</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M6</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.7</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M6</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M1_Fail</Name>
            <MainComment>Motor 1 failure alarm - latched until reset</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 8: Motor 1 Overload Alarm - Latched -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.3</Descriptor>
                <Comment>M1 OL</Comment>
                <Symbol>M1_OVERLOAD</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.7</Descriptor>
                <Comment>No Reset</Comment>
                <Symbol>ALARM_RESET</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M8</Descriptor>
                <Comment>M1 OL Alm</Comment>
                <Symbol>M1_OL_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M8</Descriptor>
                <Comment>Latch</Comment>
                <Symbol>M1_OL_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M8</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.7</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M8</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M1_OL_Alarm</Name>
            <MainComment>Motor 1 overload alarm - latched until reset</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 9: Motor 2 Command (Backup - starts on M1 failure OR M1 overload) -->
          <!-- FIXED: OR branch at Col 0, IL matches ladder order -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>M1 Fail</Comment>
                <Symbol>M1_FAIL</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Run Req</Comment>
                <Symbol>RUN_REQUEST</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M7</Descriptor>
                <Comment>M2 OK</Comment>
                <Symbol>M2_FAIL</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M9</Descriptor>
                <Comment>No M2 OL</Comment>
                <Symbol>M2_OL_ALARM</Symbol>
                <Row>0</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.4</Descriptor>
                <Comment>M2 OL OK</Comment>
                <Symbol>M2_OVERLOAD</Symbol>
                <Row>0</Row>
                <Column>4</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(5, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M3</Descriptor>
                <Comment>M2 Cmd</Comment>
                <Symbol>M2_CMD</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M8</Descriptor>
                <Comment>M1 OL</Comment>
                <Symbol>M1_OL_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M6</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M8</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M7</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M9</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.4</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M2_Command</Name>
            <MainComment>Motor 2 backup - auto-starts when M1 fails or overloads</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 10: Motor 2 Contactor -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M3</Descriptor>
                <Comment>M2 Cmd</Comment>
                <Symbol>M2_CMD</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment>M2 Cont</Comment>
                <Symbol>M2_CONTACTOR</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M2_Contactor</Name>
            <MainComment>Motor 2 contactor output</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 11: Motor 2 Running -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.6</Descriptor>
                <Comment>M2 Speed</Comment>
                <Symbol>M2_ZERO_SPEED</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M5</Descriptor>
                <Comment>M2 Run</Comment>
                <Symbol>M2_RUNNING</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.6</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M5</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M2_Running</Name>
            <MainComment>Motor 2 running confirmed by zero speed sensor</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 12: Motor 2 Failure - Latched -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M3</Descriptor>
                <Comment>M2 Cmd</Comment>
                <Symbol>M2_CMD</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M5</Descriptor>
                <Comment>Not Run</Comment>
                <Symbol>M2_RUNNING</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM2.Q</Descriptor>
                <Comment>5s Done</Comment>
                <Symbol>M2_TMR_Q</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.7</Descriptor>
                <Comment>No Reset</Comment>
                <Symbol>ALARM_RESET</Symbol>
                <Row>0</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(4, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M7</Descriptor>
                <Comment>M2 Fail</Comment>
                <Symbol>M2_FAIL</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M7</Descriptor>
                <Comment>Latch</Comment>
                <Symbol>M2_FAIL</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M5</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   %TM2.Q</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M7</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.7</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M7</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M2_Fail</Name>
            <MainComment>Motor 2 failure alarm - latched until reset</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 13: Motor 2 Overload Alarm - Latched -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.4</Descriptor>
                <Comment>M2 OL</Comment>
                <Symbol>M2_OVERLOAD</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.7</Descriptor>
                <Comment>No Reset</Comment>
                <Symbol>ALARM_RESET</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M9</Descriptor>
                <Comment>M2 OL Alm</Comment>
                <Symbol>M2_OL_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M9</Descriptor>
                <Comment>Latch</Comment>
                <Symbol>M2_OL_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.4</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M9</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.7</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M9</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M2_OL_Alarm</Name>
            <MainComment>Motor 2 overload alarm - latched until reset</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 14: Common Alarm Output -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>M1 Fail</Comment>
                <Symbol>M1_FAIL</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.2</Descriptor>
                <Comment>Alarm</Comment>
                <Symbol>COMMON_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M7</Descriptor>
                <Comment>M2 Fail</Comment>
                <Symbol>M2_FAIL</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Up, Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M8</Descriptor>
                <Comment>M1 OL</Comment>
                <Symbol>M1_OL_ALARM</Symbol>
                <Row>2</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Up, Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M9</Descriptor>
                <Comment>M2 OL</Comment>
                <Symbol>M2_OL_ALARM</Symbol>
                <Row>3</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M6</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M7</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M8</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M9</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Common_Alarm</Name>
            <MainComment>Common alarm output - any alarm active</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;

// Memory bits for redundant motors
const MEMORY_BITS = `
              <MemoryBit>
                <Address>%M0</Address>
                <Index>0</Index>
                <Symbol>SYSTEM_READY</Symbol>
                <Comment>System ready after 3s startup</Comment>
              </MemoryBit>
              <MemoryBit>
                <Address>%M1</Address>
                <Index>1</Index>
                <Symbol>RUN_REQUEST</Symbol>
                <Comment>Operator run request</Comment>
              </MemoryBit>
              <MemoryBit>
                <Address>%M2</Address>
                <Index>2</Index>
                <Symbol>M1_CMD</Symbol>
                <Comment>Motor 1 command</Comment>
              </MemoryBit>
              <MemoryBit>
                <Address>%M3</Address>
                <Index>3</Index>
                <Symbol>M2_CMD</Symbol>
                <Comment>Motor 2 command</Comment>
              </MemoryBit>
              <MemoryBit>
                <Address>%M4</Address>
                <Index>4</Index>
                <Symbol>M1_RUNNING</Symbol>
                <Comment>Motor 1 running feedback</Comment>
              </MemoryBit>
              <MemoryBit>
                <Address>%M5</Address>
                <Index>5</Index>
                <Symbol>M2_RUNNING</Symbol>
                <Comment>Motor 2 running feedback</Comment>
              </MemoryBit>
              <MemoryBit>
                <Address>%M6</Address>
                <Index>6</Index>
                <Symbol>M1_FAIL</Symbol>
                <Comment>Motor 1 failure alarm</Comment>
              </MemoryBit>
              <MemoryBit>
                <Address>%M7</Address>
                <Index>7</Index>
                <Symbol>M2_FAIL</Symbol>
                <Comment>Motor 2 failure alarm</Comment>
              </MemoryBit>
              <MemoryBit>
                <Address>%M8</Address>
                <Index>8</Index>
                <Symbol>M1_OL_ALARM</Symbol>
                <Comment>Motor 1 overload alarm</Comment>
              </MemoryBit>
              <MemoryBit>
                <Address>%M9</Address>
                <Index>9</Index>
                <Symbol>M2_OL_ALARM</Symbol>
                <Comment>Motor 2 overload alarm</Comment>
              </MemoryBit>`;

// Timer configuration
const TIMER_CONFIG = `
            <TimerTM>
              <Address>%TM0</Address>
              <Index>0</Index>
              <Preset>3</Preset>
              <Base>OneSecond</Base>
              <Comment>System startup delay</Comment>
              <Symbol>STARTUP_TMR</Symbol>
            </TimerTM>
            <TimerTM>
              <Address>%TM1</Address>
              <Index>1</Index>
              <Preset>5</Preset>
              <Base>OneSecond</Base>
              <Comment>M1 startup timeout</Comment>
              <Symbol>M1_START_TMR</Symbol>
            </TimerTM>
            <TimerTM>
              <Address>%TM2</Address>
              <Index>2</Index>
              <Preset>5</Preset>
              <Base>OneSecond</Base>
              <Comment>M2 startup timeout</Comment>
              <Symbol>M2_START_TMR</Symbol>
            </TimerTM>`;

try {
    console.log('Redundant Motors v3 - TM221CE16T');
    console.log('Fixed: OR branches now in SAME column, IL matches ladder');
    console.log('='.repeat(60));

    // Read template
    console.log('1. Reading template...');
    let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // Change project name
    console.log('2. Changing project name...');
    content = content.split('Template for configuration of cards').join('Redundant_Motors_v3');

    // Change controller
    console.log('3. Changing controller to TM221CE16T...');
    content = content.split('TM221CE40T').join('TM221CE16T');

    // Add rungs before </Rungs>
    console.log('4. Adding rungs...');
    const beforeRungs = content.indexOf('</Rungs>');
    if (beforeRungs !== -1) {
        content = content.slice(0, beforeRungs) + REDUNDANT_MOTOR_RUNGS + '\n        ' + content.slice(beforeRungs);
    }

    // Add memory bits before </MemoryBits>
    console.log('5. Adding memory bits...');
    const beforeMemBits = content.indexOf('</MemoryBits>');
    if (beforeMemBits !== -1) {
        content = content.slice(0, beforeMemBits) + MEMORY_BITS + '\n            ' + content.slice(beforeMemBits);
    }

    // Replace timers section
    console.log('6. Updating timers...');
    const timersStart = content.indexOf('<Timers>');
    const timersEnd = content.indexOf('</Timers>') + '</Timers>'.length;
    if (timersStart !== -1 && timersEnd !== -1) {
        content = content.slice(0, timersStart) + '<Timers>' + TIMER_CONFIG + '\n          </Timers>' + content.slice(timersEnd);
    }

    // Clear extensions
    console.log('7. Clearing extensions...');
    const extStart = content.indexOf('<Extensions>');
    const extEnd = content.indexOf('</Extensions>') + '</Extensions>'.length;
    if (extStart !== -1 && extEnd !== -1) {
        content = content.slice(0, extStart) + '<Extensions>\n          </Extensions>' + content.slice(extEnd);
    }

    // Clear cartridges
    console.log('8. Clearing cartridges...');
    content = content.replace(/<Cartridge1>[\s\S]*?<\/Cartridge1>/,
        `<Cartridge1>
          <Index>0</Index>
          <InputNb>0</InputNb>
          <OutputNb>0</OutputNb>
          <Kind>0</Kind>
          <Reference />
        </Cartridge1>`);
    content = content.replace(/<Cartridge2>[\s\S]*?<\/Cartridge2>/,
        `<Cartridge2>
          <Index>1</Index>
          <InputNb>0</InputNb>
          <OutputNb>0</OutputNb>
          <Kind>0</Kind>
          <Reference />
        </Cartridge2>`);

    // Write output
    console.log('9. Writing output...');
    fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

    console.log('');
    console.log('SUCCESS:', OUTPUT_PATH);
    console.log('');
    console.log('KEY FIX in v3:');
    console.log('- OR branches: Both elements in SAME column (Col 0)');
    console.log('- M2_Command: %M6 (Col 0, Row 0, Down) OR %M8 (Col 0, Row 1, Up)');
    console.log('- IL matches ladder: LD %M6, OR %M8, AND %M1, ...');
    console.log('');
    console.log('I/O Map:');
    console.log('  %I0.0 - Emergency Stop (NC)');
    console.log('  %I0.1 - Start Button');
    console.log('  %I0.2 - Stop Button (NC)');
    console.log('  %I0.3 - M1 Overload (NC)');
    console.log('  %I0.4 - M2 Overload (NC)');
    console.log('  %I0.5 - M1 Zero Speed Sensor');
    console.log('  %I0.6 - M2 Zero Speed Sensor');
    console.log('  %I0.7 - Alarm Reset Button');
    console.log('  %Q0.0 - M1 Contactor');
    console.log('  %Q0.1 - M2 Contactor');
    console.log('  %Q0.2 - Common Alarm');

} catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
}
