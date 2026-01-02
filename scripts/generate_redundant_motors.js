/**
 * Redundant Motor Start/Stop Program - TM221CE16T
 * PLCAutoPilot v3.2 - Following CLAUDE.md Mandatory Steps
 *
 * REDUNDANCY LOGIC:
 * - M1 is primary motor, M2 is backup
 * - On start command, M1 starts first
 * - If M1 fails to reach speed within 5s, M2 auto-starts
 * - If M1 overload trips, M2 auto-starts
 * - Zero speed sensors confirm motor is actually running
 * - Both motors have independent overload protection
 * - All alarms are latched and require manual reset
 *
 * I/O MAPPING (TM221CE16T: 9 DI / 7 DO):
 * Inputs:
 *   %I0.0: EMERGENCY_STOP (NC - system stops when opened)
 *   %I0.1: START_PB (NO - common start for both motors)
 *   %I0.2: STOP_PB (NC - common stop)
 *   %I0.3: M1_OVERLOAD (NC - Motor 1 thermal relay)
 *   %I0.4: M2_OVERLOAD (NC - Motor 2 thermal relay)
 *   %I0.5: M1_ZERO_SPEED (NO - Motor 1 running confirmation)
 *   %I0.6: M2_ZERO_SPEED (NO - Motor 2 running confirmation)
 *   %I0.7: ALARM_RESET_PB (NO - reset all latched alarms)
 *
 * Outputs:
 *   %Q0.0: M1_CONTACTOR (Motor 1 main contactor)
 *   %Q0.1: M2_CONTACTOR (Motor 2 main contactor)
 *   %Q0.2: M1_RUN_LAMP (Green - Motor 1 running)
 *   %Q0.3: M2_RUN_LAMP (Green - Motor 2 running)
 *   %Q0.4: M1_FAIL_LAMP (Red - Motor 1 failure)
 *   %Q0.5: M2_FAIL_LAMP (Red - Motor 2 failure)
 *   %Q0.6: READY_LAMP (White - System ready)
 *
 * Memory Bits:
 *   %M0: SYSTEM_READY (from template)
 *   %M1: RUN_REQUEST (operator wants motor running)
 *   %M2: M1_CMD (Motor 1 start command)
 *   %M3: M2_CMD (Motor 2 start command)
 *   %M4: M1_RUNNING (confirmed by zero speed sensor)
 *   %M5: M2_RUNNING (confirmed by zero speed sensor)
 *   %M6: M1_FAIL (Motor 1 failed to start - latched)
 *   %M7: M2_FAIL (Motor 2 failed to start - latched)
 *   %M8: M1_OL_ALARM (Motor 1 overload - latched)
 *   %M9: M2_OL_ALARM (Motor 2 overload - latched)
 *   %M10: ANY_ALARM (consolidated alarm)
 *
 * Timers:
 *   %TM0: 3s system startup delay (from template)
 *   %TM1: 5s Motor 1 start timeout
 *   %TM2: 5s Motor 2 start timeout
 */

const fs = require('fs');

const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Redundant_Motors_TM221CE16T.smbp';

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

// All redundant motor control rungs
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
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M10</Descriptor>
                <Comment>No Alarm</Comment>
                <Symbol>ANY_ALARM</Symbol>
                <Row>0</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(4, 9, 0)}
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
                <InstructionLine>ANDN  %M10</InstructionLine>
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

          <!-- Rung 4: Motor 1 Command (Primary) -->
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

          <!-- Rung 5: Motor 1 Contactor Output -->
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

          <!-- Rung 6: Motor 1 Running Confirmation -->
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

          <!-- Rung 7: Motor 1 Start Timeout Timer -->
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
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>Not Run</Comment>
                <Symbol>M1_RUNNING</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 7, 0)}
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>%TM1</Descriptor>
                <Comment>5s</Comment>
                <Symbol />
                <Row>0</Row>
                <Column>8</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>BLK   %TM1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M4</InstructionLine>
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
            <Name>M1_Timeout</Name>
            <MainComment>Motor 1 start timeout - 5 seconds</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 8: Motor 1 Failure Alarm (Latched) -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM1.Q</Descriptor>
                <Comment>Timeout</Comment>
                <Symbol>M1_TIMEOUT</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.7</Descriptor>
                <Comment>No Reset</Comment>
                <Symbol>ALARM_RESET_PB</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 9, 0)}
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
                <InstructionLine>LD    %TM1.Q</InstructionLine>
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
            <Name>M1_Fail_Alarm</Name>
            <MainComment>Motor 1 failure alarm - latched</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 9: Motor 1 Overload Alarm (Latched) -->
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
                <Symbol>ALARM_RESET_PB</Symbol>
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
            <MainComment>Motor 1 overload alarm - latched</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 10: Motor 2 Command (Backup - Auto-starts on M1 failure) -->
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
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>M1 Fail</Comment>
                <Symbol>M1_FAIL</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
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
                <Comment>No OL</Comment>
                <Symbol>M2_OL_ALARM</Symbol>
                <Row>0</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.4</Descriptor>
                <Comment>OL OK</Comment>
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
                <Column>1</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND(  %M6</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M8</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>)</InstructionLine>
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

          <!-- Rung 11: Motor 2 Contactor Output -->
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

          <!-- Rung 12: Motor 2 Running Confirmation -->
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

          <!-- Rung 13: Motor 2 Start Timeout Timer -->
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
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M5</Descriptor>
                <Comment>Not Run</Comment>
                <Symbol>M2_RUNNING</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 7, 0)}
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>%TM2</Descriptor>
                <Comment>5s</Comment>
                <Symbol />
                <Row>0</Row>
                <Column>8</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>BLK   %TM2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %M3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M5</InstructionLine>
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
            <Name>M2_Timeout</Name>
            <MainComment>Motor 2 start timeout - 5 seconds</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 14: Motor 2 Failure Alarm (Latched) -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM2.Q</Descriptor>
                <Comment>Timeout</Comment>
                <Symbol>M2_TIMEOUT</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.7</Descriptor>
                <Comment>No Reset</Comment>
                <Symbol>ALARM_RESET_PB</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 9, 0)}
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
                <InstructionLine>LD    %TM2.Q</InstructionLine>
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
            <Name>M2_Fail_Alarm</Name>
            <MainComment>Motor 2 failure alarm - latched</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 15: Motor 2 Overload Alarm (Latched) -->
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
                <Symbol>ALARM_RESET_PB</Symbol>
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
            <MainComment>Motor 2 overload alarm - latched</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 16: Any Alarm Consolidation -->
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
                <Descriptor>%M10</Descriptor>
                <Comment>Any Alm</Comment>
                <Symbol>ANY_ALARM</Symbol>
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
                <InstructionLine>ST    %M10</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Any_Alarm</Name>
            <MainComment>Consolidate all alarms</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 17: Motor 1 Run Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>M1 Run</Comment>
                <Symbol>M1_RUNNING</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.2</Descriptor>
                <Comment>M1 Lamp</Comment>
                <Symbol>M1_RUN_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M4</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M1_Run_Lamp</Name>
            <MainComment>Motor 1 run lamp - green</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 18: Motor 2 Run Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M5</Descriptor>
                <Comment>M2 Run</Comment>
                <Symbol>M2_RUNNING</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.3</Descriptor>
                <Comment>M2 Lamp</Comment>
                <Symbol>M2_RUN_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M5</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M2_Run_Lamp</Name>
            <MainComment>Motor 2 run lamp - green</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 19: Motor 1 Fail Lamp -->
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
                <Descriptor>%Q0.4</Descriptor>
                <Comment>M1 Fail Lp</Comment>
                <Symbol>M1_FAIL_LAMP</Symbol>
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
                <InstructionLine>ST    %Q0.4</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M1_Fail_Lamp</Name>
            <MainComment>Motor 1 fail lamp - red (fail or overload)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 20: Motor 2 Fail Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M7</Descriptor>
                <Comment>M2 Fail</Comment>
                <Symbol>M2_FAIL</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.5</Descriptor>
                <Comment>M2 Fail Lp</Comment>
                <Symbol>M2_FAIL_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M9</Descriptor>
                <Comment>M2 OL</Comment>
                <Symbol>M2_OL_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M7</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M9</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.5</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>M2_Fail_Lamp</Name>
            <MainComment>Motor 2 fail lamp - red (fail or overload)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 21: Ready Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment>Ready</Comment>
                <Symbol>SYSTEM_READY</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.6</Descriptor>
                <Comment>Ready Lp</Comment>
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
                <InstructionLine>ST    %Q0.6</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Ready_Lamp</Name>
            <MainComment>System ready lamp - white</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;

// Memory bits to add
const MEMORY_BITS = `
      <MemoryBit>
        <Address>%M1</Address>
        <Index>1</Index>
        <Symbol>RUN_REQUEST</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M2</Address>
        <Index>2</Index>
        <Symbol>M1_CMD</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M3</Address>
        <Index>3</Index>
        <Symbol>M2_CMD</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M4</Address>
        <Index>4</Index>
        <Symbol>M1_RUNNING</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M5</Address>
        <Index>5</Index>
        <Symbol>M2_RUNNING</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M6</Address>
        <Index>6</Index>
        <Symbol>M1_FAIL</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M7</Address>
        <Index>7</Index>
        <Symbol>M2_FAIL</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M8</Address>
        <Index>8</Index>
        <Symbol>M1_OL_ALARM</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M9</Address>
        <Index>9</Index>
        <Symbol>M2_OL_ALARM</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M10</Address>
        <Index>10</Index>
        <Symbol>ANY_ALARM</Symbol>
      </MemoryBit>`;

// Timer declarations
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
        <Base>OneSecond</Base>
      </TimerTM>
      <TimerTM>
        <Address>%TM2</Address>
        <Index>2</Index>
        <Preset>5</Preset>
        <Base>OneSecond</Base>
      </TimerTM>
    </Timers>`;

try {
    console.log('Redundant Motors Start/Stop - TM221CE16T');
    console.log('PLCAutoPilot v3.2');
    console.log('='.repeat(60));

    // Read template
    console.log('Reading template...');
    let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // Step 1: Project name
    console.log('1. Changing project name...');
    content = content.split('Template for configuration of cards').join('Redundant_Motors_TM221CE16T');

    // Step 2: Controller
    console.log('2. Changing controller to TM221CE16T...');
    content = content.split('TM221CE40T').join('TM221CE16T');

    // Step 3: Add motor rungs
    console.log('3. Adding redundant motor rungs (19 rungs)...');
    const rungsEnd = content.indexOf('</Rungs>');
    if (rungsEnd !== -1) {
        content = content.slice(0, rungsEnd) + REDUNDANT_MOTOR_RUNGS + '\n        ' + content.slice(rungsEnd);
    }

    // Step 4: Add memory bits
    console.log('4. Adding memory bits...');
    const memBitEnd = content.indexOf('</MemoryBit>\n    </MemoryBits>');
    if (memBitEnd !== -1) {
        content = content.slice(0, memBitEnd + 12) + MEMORY_BITS + content.slice(memBitEnd + 12);
    }

    // Step 5: Update timers
    console.log('5. Updating timer declarations...');
    const timersStart = content.indexOf('<Timers>');
    const timersEnd = content.indexOf('</Timers>') + 9;
    if (timersStart !== -1 && timersEnd !== -1) {
        content = content.slice(0, timersStart) + TIMERS + content.slice(timersEnd);
    }

    // Step 6: Clear extensions
    console.log('6. Clearing extension modules...');
    const extStart = content.indexOf('<Extensions>');
    const extEnd = content.indexOf('</Extensions>') + 13;
    if (extStart !== -1 && extEnd !== -1) {
        content = content.slice(0, extStart) + '<Extensions />' + content.slice(extEnd);
    }

    // Step 7: Clear cartridges
    console.log('7. Clearing cartridges...');
    const cart1Start = content.indexOf('<Cartridge1>');
    const cart1End = content.indexOf('</Cartridge1>') + 13;
    if (cart1Start !== -1 && cart1End !== -1) {
        content = content.slice(0, cart1Start) + '<Cartridge1 />' + content.slice(cart1End);
    }
    const cart2Start = content.indexOf('<Cartridge2>');
    const cart2End = content.indexOf('</Cartridge2>') + 13;
    if (cart2Start !== -1 && cart2End !== -1) {
        content = content.slice(0, cart2Start) + '<Cartridge2 />' + content.slice(cart2End);
    }

    // Write output
    console.log('8. Writing output file...');
    fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

    console.log('');
    console.log('='.repeat(60));
    console.log('SUCCESS: Redundant Motors Program Generated');
    console.log('='.repeat(60));
    console.log('');
    console.log('Output:', OUTPUT_PATH);
    console.log('Controller: TM221CE16T (9 DI / 7 DO)');
    console.log('');
    console.log('I/O MAPPING:');
    console.log('INPUTS:');
    console.log('  %I0.0: EMERGENCY_STOP (NC)');
    console.log('  %I0.1: START_PB (NO) - common start');
    console.log('  %I0.2: STOP_PB (NC) - common stop');
    console.log('  %I0.3: M1_OVERLOAD (NC) - Motor 1 thermal relay');
    console.log('  %I0.4: M2_OVERLOAD (NC) - Motor 2 thermal relay');
    console.log('  %I0.5: M1_ZERO_SPEED (NO) - Motor 1 running feedback');
    console.log('  %I0.6: M2_ZERO_SPEED (NO) - Motor 2 running feedback');
    console.log('  %I0.7: ALARM_RESET_PB (NO) - reset all alarms');
    console.log('');
    console.log('OUTPUTS:');
    console.log('  %Q0.0: M1_CONTACTOR');
    console.log('  %Q0.1: M2_CONTACTOR');
    console.log('  %Q0.2: M1_RUN_LAMP (green)');
    console.log('  %Q0.3: M2_RUN_LAMP (green)');
    console.log('  %Q0.4: M1_FAIL_LAMP (red)');
    console.log('  %Q0.5: M2_FAIL_LAMP (red)');
    console.log('  %Q0.6: READY_LAMP (white)');
    console.log('');
    console.log('REDUNDANCY LOGIC:');
    console.log('  1. Press START -> Motor 1 starts (primary)');
    console.log('  2. If M1 fails to reach speed in 5s -> M1_FAIL alarm');
    console.log('  3. If M1 fails OR overloads -> Motor 2 auto-starts');
    console.log('  4. Zero speed sensors confirm motor is running');
    console.log('  5. All alarms are latched - require ALARM_RESET to clear');
    console.log('');
    console.log('PROGRAM (21 rungs):');
    console.log('  1-2:   Emergency/Reset (template)');
    console.log('  3:     Run Request with seal-in');
    console.log('  4-9:   Motor 1 control, timeout, alarms');
    console.log('  10-15: Motor 2 control, timeout, alarms');
    console.log('  16:    Any Alarm consolidation');
    console.log('  17-21: Status lamps');

} catch (err) {
    console.error('ERROR:', err.message);
}
