/**
 * Tank Level Control with RTD Temperature Monitoring
 * Based on working template: "Template for configuration of cards.smbp"
 *
 * Specifications:
 * - Tank: 1m x 1m x 1m = 1000 liters
 * - Level transmitter: 4-20mA, deadband 300mm, max range 5000mm
 * - Sensor installed 500mm above tank top
 * - RTD sensor via TM3TI4/G card
 * - 10-second stabilization delay before outlet opens
 * - Valve position feedback with failure alarms
 *
 * I/O Mapping:
 * - %I0.0: EMERGENCY_PB (from template)
 * - %I0.1: INLET_VLV_OPEN_FB
 * - %I0.2: INLET_VLV_CLOSE_FB
 * - %I0.3: OUTLET_VLV_OPEN_FB
 * - %I0.4: OUTLET_VLV_CLOSE_FB
 * - %I0.5: START_FILL_PB
 * - %I0.6: ALARM_RESET_PB
 *
 * - %Q0.0: INLET_VALVE
 * - %Q0.1: OUTLET_VALVE
 * - %Q0.2: INLET_VLV_ALARM_LAMP
 * - %Q0.3: OUTLET_VLV_ALARM_LAMP
 * - %Q0.4: FILLING_LAMP
 * - %Q0.5: DRAINING_LAMP
 * - %Q0.6: TANK_FULL_LAMP
 * - %Q0.7: TANK_EMPTY_LAMP
 *
 * - %IW0.0: LEVEL_XMTR (built-in 4-20mA on TM221CE40T)
 * - %IW1.0: RTD_TEMP (TM3TI4/G - PT100)
 *
 * Raw Input Storage (copy from %IW before calculations):
 * - %MW100: RAW_LEVEL (copy of %IW0.0)
 * - %MW101: RAW_TEMP (copy of %IW1.0)
 *
 * HMI Tags (scaled from memory words, NOT direct %IW):
 * - %MF102: HMI_TANK_LITERS (0.0-1000.0 liters) - scaled from %MW100
 * - %MF103: HMI_TEMPERATURE (degrees C, e.g. 25.5) - scaled from %MW101
 * - %MF104: HMI_LEVEL_PERCENT (0.0-100.0%) - calculated from %MF102
 *
 * CRITICAL: Never use %IW directly in calculations. Always copy to %MW first.
 * This ensures stable values throughout the scan cycle.
 *
 * PLCAutoPilot v3.0
 */

const fs = require('fs');

const PROJECT_NAME = 'Tank_Level_RTD_1m_TM221CE40T';
const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Tank_Level_RTD_v27.smbp';

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

// Tank Level Control Rungs (to be inserted after emergency and word reset rungs)
const TANK_LEVEL_RUNGS = `
          <!-- Rung 3: Generate SYSTEM_READY bit -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.0</Descriptor>
                <Comment>Emergency Stop NOT Pressed</Comment>
                <Symbol>EMERGENCY_PB</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
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
                <InstructionLine>LDN   %I0.0</InstructionLine>
                <Comment>Emergency Stop NOT Pressed</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>System_Ready</Name>
            <MainComment>Generate SYSTEM_READY when Emergency Stop is NOT pressed</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 4: Copy Raw Level Input to Memory Word -->
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
              </LadderEntity>${generateLines(1, 8, 0)}
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MW100 := %IW0.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MW100 := %IW0.0 ]</InstructionLine>
                <Comment>Copy raw level to memory word</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Copy_Level</Name>
            <MainComment>Copy raw 4-20mA level input to memory word for stable calculations</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 4: Copy Raw RTD Input to Memory Word -->
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
              </LadderEntity>${generateLines(1, 8, 0)}
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MW101 := %IW1.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MW101 := %IW1.0 ]</InstructionLine>
                <Comment>Copy raw RTD to memory word</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Copy_RTD</Name>
            <MainComment>Copy raw RTD input to memory word for stable calculations</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 5: Scale Level to Liters (from memory word) -->
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
              </LadderEntity>${generateLines(1, 8, 0)}
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0 ]</InstructionLine>
                <Comment>Scale 4-20mA to 0-1000.0 liters</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Scale_Level</Name>
            <MainComment>Scale raw level (from %MW100) to liters using INT_TO_REAL</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 6: Scale RTD to Temperature (from memory word) -->
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
              </LadderEntity>${generateLines(1, 8, 0)}
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MF103 := INT_TO_REAL(%MW101) / 10.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF103 := INT_TO_REAL(%MW101) / 10.0 ]</InstructionLine>
                <Comment>Scale raw RTD to degrees C</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Scale_RTD</Name>
            <MainComment>Scale raw RTD (from %MW101) to degrees C using INT_TO_REAL</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 7: Calculate Level Percentage -->
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
              </LadderEntity>${generateLines(1, 8, 0)}
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MF104 := %MF102 / 10.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF104 := %MF102 / 10.0 ]</InstructionLine>
                <Comment>0-1000 liters to 0-100.0 percent</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Calc_Percent</Name>
            <MainComment>Calculate level percentage from scaled liters (%MF102)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 8: Detect Tank Full (Level > 95%) -->
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
                <ElementType>Comparison</ElementType>
                <ComparisonExpression>%MF102 > 950.0</ComparisonExpression>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(3, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Tank Full Flag</Comment>
                <Symbol>TANK_FULL</Symbol>
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
                <InstructionLine>AND   [ %MF102 > 950.0 ]</InstructionLine>
                <Comment>Level > 95%</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment>Tank Full</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Tank_Full</Name>
            <MainComment>Detect tank full condition (level greater than 95%)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 9: Detect Tank Empty (Level < 5%) -->
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
                <ElementType>Comparison</ElementType>
                <ComparisonExpression>%MF102 &lt; 50.0</ComparisonExpression>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(3, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Tank Empty Flag</Comment>
                <Symbol>TANK_EMPTY</Symbol>
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
                <InstructionLine>AND   [ %MF102 &lt; 50.0 ]</InstructionLine>
                <Comment>Level less than 5%</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment>Tank Empty</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Tank_Empty</Name>
            <MainComment>Detect tank empty condition (level less than 5%)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 8: Filling Mode Control (Seal-in) -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.5</Descriptor>
                <Comment>Start Fill Button</Comment>
                <Symbol>START_FILL_PB</Symbol>
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
                <Descriptor>%M1</Descriptor>
                <Comment>Not Tank Full</Comment>
                <Symbol>TANK_FULL</Symbol>
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
                <Descriptor>%M3</Descriptor>
                <Comment>Filling Mode</Comment>
                <Symbol>FILLING_MODE</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M3</Descriptor>
                <Comment>Seal-in</Comment>
                <Symbol>FILLING_MODE</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.5</InstructionLine>
                <Comment>Start Fill Button</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M3</InstructionLine>
                <Comment>Seal-in</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M1</InstructionLine>
                <Comment>Not Tank Full</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M10</InstructionLine>
                <Comment>No Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M3</InstructionLine>
                <Comment>Filling Mode</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Fill_Mode</Name>
            <MainComment>Filling mode control with seal-in, stops when tank full or alarm</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 9: Inlet Valve Control -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M3</Descriptor>
                <Comment>Filling Mode</Comment>
                <Symbol>FILLING_MODE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Inlet Valve</Comment>
                <Symbol>INLET_VALVE</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M3</InstructionLine>
                <Comment>Filling Mode</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment>Open Inlet Valve</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Inlet_Valve</Name>
            <MainComment>Inlet valve opens when filling mode active</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 10: 10-Second Stabilization Timer -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Tank Full</Comment>
                <Symbol>TANK_FULL</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M3</Descriptor>
                <Comment>Filling Stopped</Comment>
                <Symbol>FILLING_MODE</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 8, 0)}
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>%TM1</Descriptor>
                <Comment>10s Stabilization</Comment>
                <Symbol>STAB_TIMER</Symbol>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>BLK   %TM1</InstructionLine>
                <Comment>10s Stabilization Timer</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment>Tank Full</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M3</InstructionLine>
                <Comment>Filling Stopped</Comment>
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
            <Name>Stab_Timer</Name>
            <MainComment>10-second stabilization timer for RTD readings after tank full</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 11: Draining Mode Control -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM1.Q</Descriptor>
                <Comment>Timer Done</Comment>
                <Symbol>STAB_DONE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Not Empty</Comment>
                <Symbol>TANK_EMPTY</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M10</Descriptor>
                <Comment>No Alarm</Comment>
                <Symbol>ANY_ALARM</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(3, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>Draining Mode</Comment>
                <Symbol>DRAINING_MODE</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>Seal-in</Comment>
                <Symbol>DRAINING_MODE</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %TM1.Q</InstructionLine>
                <Comment>10s Timer Done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M4</InstructionLine>
                <Comment>Seal-in</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M2</InstructionLine>
                <Comment>Not Tank Empty</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M10</InstructionLine>
                <Comment>No Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M4</InstructionLine>
                <Comment>Draining Mode</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Drain_Mode</Name>
            <MainComment>Draining mode starts after 10s stabilization, stops when empty</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 12: Outlet Valve Control -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>Draining Mode</Comment>
                <Symbol>DRAINING_MODE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment>Outlet Valve</Comment>
                <Symbol>OUTLET_VALVE</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M4</InstructionLine>
                <Comment>Draining Mode</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.1</InstructionLine>
                <Comment>Open Outlet Valve</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Outlet_Valve</Name>
            <MainComment>Outlet valve opens when draining mode active</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 13: Inlet Valve Feedback Timer -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Inlet Cmd On</Comment>
                <Symbol>INLET_VALVE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.1</Descriptor>
                <Comment>No Feedback</Comment>
                <Symbol>INLET_VLV_OPEN_FB</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 8, 0)}
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>%TM2</Descriptor>
                <Comment>5s Feedback Timer</Comment>
                <Symbol>INLET_FB_TMR</Symbol>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>BLK   %TM2</InstructionLine>
                <Comment>Inlet Valve Feedback Timer</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %Q0.0</InstructionLine>
                <Comment>Inlet Valve Cmd</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.1</InstructionLine>
                <Comment>No Open Feedback</Comment>
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
            <Name>Inlet_FB_Tmr</Name>
            <MainComment>Inlet valve feedback timeout timer (5 seconds)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 14: Inlet Valve Alarm (Latched) -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM2.Q</Descriptor>
                <Comment>Timer Done</Comment>
                <Symbol>INLET_TMR_DONE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.6</Descriptor>
                <Comment>Reset Not Pressed</Comment>
                <Symbol>ALARM_RESET_PB</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M5</Descriptor>
                <Comment>Inlet Valve Alarm</Comment>
                <Symbol>INLET_VLV_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M5</Descriptor>
                <Comment>Seal-in</Comment>
                <Symbol>INLET_VLV_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %TM2.Q</InstructionLine>
                <Comment>Timer Done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M5</InstructionLine>
                <Comment>Seal-in Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.6</InstructionLine>
                <Comment>Reset Not Pressed</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M5</InstructionLine>
                <Comment>Inlet Valve Alarm</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Inlet_Alarm</Name>
            <MainComment>Inlet valve failure alarm - latched until reset</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 15: Outlet Valve Feedback Timer -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment>Outlet Cmd On</Comment>
                <Symbol>OUTLET_VALVE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.3</Descriptor>
                <Comment>No Feedback</Comment>
                <Symbol>OUTLET_VLV_OPEN_FB</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 8, 0)}
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>%TM3</Descriptor>
                <Comment>5s Feedback Timer</Comment>
                <Symbol>OUTLET_FB_TMR</Symbol>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>BLK   %TM3</InstructionLine>
                <Comment>Outlet Valve Feedback Timer</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %Q0.1</InstructionLine>
                <Comment>Outlet Valve Cmd</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.3</InstructionLine>
                <Comment>No Open Feedback</Comment>
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
            <Name>Outlet_FB_Tmr</Name>
            <MainComment>Outlet valve feedback timeout timer (5 seconds)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 16: Outlet Valve Alarm (Latched) -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM3.Q</Descriptor>
                <Comment>Timer Done</Comment>
                <Symbol>OUTLET_TMR_DONE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.6</Descriptor>
                <Comment>Reset Not Pressed</Comment>
                <Symbol>ALARM_RESET_PB</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>Outlet Valve Alarm</Comment>
                <Symbol>OUTLET_VLV_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>Seal-in</Comment>
                <Symbol>OUTLET_VLV_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %TM3.Q</InstructionLine>
                <Comment>Timer Done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M6</InstructionLine>
                <Comment>Seal-in Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.6</InstructionLine>
                <Comment>Reset Not Pressed</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M6</InstructionLine>
                <Comment>Outlet Valve Alarm</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Outlet_Alarm</Name>
            <MainComment>Outlet valve failure alarm - latched until reset</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 17: Any Alarm Consolidation -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M5</Descriptor>
                <Comment>Inlet Alarm</Comment>
                <Symbol>INLET_VLV_ALARM</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M10</Descriptor>
                <Comment>Any Alarm</Comment>
                <Symbol>ANY_ALARM</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>Outlet Alarm</Comment>
                <Symbol>OUTLET_VLV_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M5</InstructionLine>
                <Comment>Inlet Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M6</InstructionLine>
                <Comment>Outlet Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M10</InstructionLine>
                <Comment>Any Alarm</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Any_Alarm</Name>
            <MainComment>Consolidate all alarms into single bit</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 18: Indicator Lamps -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M5</Descriptor>
                <Comment>Inlet Alarm</Comment>
                <Symbol>INLET_VLV_ALARM</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.2</Descriptor>
                <Comment>Inlet Alarm Lamp</Comment>
                <Symbol>INLET_VLV_ALARM_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M5</InstructionLine>
                <Comment>Inlet Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.2</InstructionLine>
                <Comment>Inlet Alarm Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Inlet_Lamp</Name>
            <MainComment>Inlet valve alarm indicator lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 19: Outlet Alarm Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M6</Descriptor>
                <Comment>Outlet Alarm</Comment>
                <Symbol>OUTLET_VLV_ALARM</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.3</Descriptor>
                <Comment>Outlet Alarm Lamp</Comment>
                <Symbol>OUTLET_VLV_ALARM_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M6</InstructionLine>
                <Comment>Outlet Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.3</InstructionLine>
                <Comment>Outlet Alarm Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Outlet_Lamp</Name>
            <MainComment>Outlet valve alarm indicator lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 20: Filling Indicator Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M3</Descriptor>
                <Comment>Filling Mode</Comment>
                <Symbol>FILLING_MODE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.4</Descriptor>
                <Comment>Filling Lamp</Comment>
                <Symbol>FILLING_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M3</InstructionLine>
                <Comment>Filling Mode</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.4</InstructionLine>
                <Comment>Filling Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Fill_Lamp</Name>
            <MainComment>Filling indicator lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 21: Draining Indicator Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M4</Descriptor>
                <Comment>Draining Mode</Comment>
                <Symbol>DRAINING_MODE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.5</Descriptor>
                <Comment>Draining Lamp</Comment>
                <Symbol>DRAINING_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M4</InstructionLine>
                <Comment>Draining Mode</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.5</InstructionLine>
                <Comment>Draining Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Drain_Lamp</Name>
            <MainComment>Draining indicator lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 22: Tank Full Indicator Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Tank Full</Comment>
                <Symbol>TANK_FULL</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.6</Descriptor>
                <Comment>Tank Full Lamp</Comment>
                <Symbol>TANK_FULL_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment>Tank Full</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.6</InstructionLine>
                <Comment>Tank Full Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Full_Lamp</Name>
            <MainComment>Tank full indicator lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 23: Tank Empty Indicator Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Tank Empty</Comment>
                <Symbol>TANK_EMPTY</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.7</Descriptor>
                <Comment>Tank Empty Lamp</Comment>
                <Symbol>TANK_EMPTY_LAMP</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M2</InstructionLine>
                <Comment>Tank Empty</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.7</InstructionLine>
                <Comment>Tank Empty Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Empty_Lamp</Name>
            <MainComment>Tank empty indicator lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;

// Additional Memory Bits to add
const ADDITIONAL_MEMORY_BITS = `
      <MemoryBit>
        <Address>%M1</Address>
        <Index>1</Index>
        <Symbol>TANK_FULL</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M2</Address>
        <Index>2</Index>
        <Symbol>TANK_EMPTY</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M3</Address>
        <Index>3</Index>
        <Symbol>FILLING_MODE</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M4</Address>
        <Index>4</Index>
        <Symbol>DRAINING_MODE</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M5</Address>
        <Index>5</Index>
        <Symbol>INLET_VLV_ALARM</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M6</Address>
        <Index>6</Index>
        <Symbol>OUTLET_VLV_ALARM</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M10</Address>
        <Index>10</Index>
        <Symbol>ANY_ALARM</Symbol>
      </MemoryBit>`;

// Memory Words for Raw Analog Input Storage (copy from %IW before calculations)
// NOTE: Using %MW100+ for NON-RETENTIVE storage (first 100 are retentive)
const MEMORY_WORDS_RAW = `
      <MemoryWord>
        <Address>%MW100</Address>
        <Index>100</Index>
        <Symbol>RAW_LEVEL</Symbol>
        <Comment>Raw 4-20mA level input (copy of %IW0.0) - NON-RETENTIVE</Comment>
      </MemoryWord>
      <MemoryWord>
        <Address>%MW101</Address>
        <Index>101</Index>
        <Symbol>RAW_TEMP</Symbol>
        <Comment>Raw RTD input (copy of %IW1.0) - NON-RETENTIVE</Comment>
      </MemoryWord>`;

// Memory Floats for HMI Tags (using INT_TO_REAL for precision)
// NOTE: Using %MF102+ for NON-RETENTIVE storage (first 100 are retentive)
// %MF102-104 scaled from %MW100-101 (never direct from %IW)
const MEMORY_FLOATS = `
    <MemoryFloats>
      <MemoryFloat>
        <Address>%MF102</Address>
        <Index>102</Index>
        <Symbol>HMI_TANK_LITERS</Symbol>
        <Comment>HMI Tag: Tank volume in liters (0.0-1000.0) - scaled from %MW100</Comment>
      </MemoryFloat>
      <MemoryFloat>
        <Address>%MF103</Address>
        <Index>103</Index>
        <Symbol>HMI_TEMPERATURE</Symbol>
        <Comment>HMI Tag: Temperature in degrees C - scaled from %MW101</Comment>
      </MemoryFloat>
      <MemoryFloat>
        <Address>%MF104</Address>
        <Index>104</Index>
        <Symbol>HMI_LEVEL_PERCENT</Symbol>
        <Comment>HMI Tag: Level percentage (0.0-100.0) - calculated from %MF102</Comment>
      </MemoryFloat>
    </MemoryFloats>`;

// Updated Cold/Warm Start Reset Rung - resets HMI floats to prevent stale data
// Structure: %S0 OR %S1 -> Three Operation elements on rows 0, 1, 2
const COLD_WARM_RESET_RUNG = `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S0</Descriptor>
                <Comment>Cold start</Comment>
                <Symbol>SB_COLDSTART</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S1</Descriptor>
                <Comment>Warm start</Comment>
                <Symbol>SB_WARMSTART</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
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
                <OperationExpression>%MF102 := 0.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>1</Row>
                <Column>1</Column>
                <ChosenConnection>Up, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>1</Row>
                <Column>2</Column>
                <ChosenConnection>Up, Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>1</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>1</Row>
                <Column>4</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>1</Row>
                <Column>5</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>1</Row>
                <Column>6</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>1</Row>
                <Column>7</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>1</Row>
                <Column>8</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MF103 := 0.0</OperationExpression>
                <Row>1</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>2</Row>
                <Column>2</Column>
                <ChosenConnection>Up, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>2</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>2</Row>
                <Column>4</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>2</Row>
                <Column>5</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>2</Row>
                <Column>6</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>2</Row>
                <Column>7</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>2</Row>
                <Column>8</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MF104 := 0.0</OperationExpression>
                <Row>2</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %S0</InstructionLine>
                <Comment>Cold start</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %S1</InstructionLine>
                <Comment>Warm start</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF102 := 0.0 ]</InstructionLine>
                <Comment>Reset HMI Tank Liters</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF103 := 0.0 ]</InstructionLine>
                <Comment>Reset HMI Temperature</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF104 := 0.0 ]</InstructionLine>
                <Comment>Reset HMI Level Percent</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Reset_HMI</Name>
            <MainComment>Reset HMI floats on cold/warm start to prevent stale data display</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;

// Timer declarations - CORRECT FORMAT: TimerTM with Base (not Timer with TimeBase)
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
        <Preset>10</Preset>
        <Base>OneSecond</Base>
      </TimerTM>
      <TimerTM>
        <Address>%TM2</Address>
        <Index>2</Index>
        <Preset>5</Preset>
        <Base>OneSecond</Base>
      </TimerTM>
      <TimerTM>
        <Address>%TM3</Address>
        <Index>3</Index>
        <Preset>5</Preset>
        <Base>OneSecond</Base>
      </TimerTM>
    </Timers>`;

try {
    console.log('Reading template file...');
    let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    console.log('Modifying project name...');
    // Replace project name
    content = content.replace(/Template for configuration of cards/g, PROJECT_NAME);
    content = content.replace(/<Name>New POU<\/Name>/g, '<Name>Tank Level Control</Name>');

    console.log('Replacing cold/warm start rung with HMI float reset...');
    // Replace the existing %S0/%S1 word reset rung with our updated version that resets HMI floats
    // The template has a rung that does: LD %S0, OR %S1, [ %MW0 := 0 ]
    // We replace it with: LD %S0, OR %S1, [ %MF100 := 0.0 ], [ %MF101 := 0.0 ], [ %MF102 := 0.0 ]
    content = content.replace(
        /<RungEntity>[\s\S]*?<Descriptor>%S0<\/Descriptor>[\s\S]*?<Symbol>SB_COLDSTART<\/Symbol>[\s\S]*?<\/RungEntity>/,
        COLD_WARM_RESET_RUNG
    );

    console.log('Adding tank level control rungs...');
    // Insert tank level rungs after the word reset rung (after </RungEntity> closing the second rung)
    // Find the closing </Rungs> tag and insert before it
    content = content.replace(
        /<\/Rungs>\s*<\/ProgramOrganizationUnits>/,
        TANK_LEVEL_RUNGS + '\n        </Rungs>\n      </ProgramOrganizationUnits>'
    );

    console.log('Adding memory bits...');
    // Add memory bits after SYSTEM_READY
    content = content.replace(
        /<Symbol>SYSTEM_READY<\/Symbol>\s*<\/MemoryBit>\s*<\/MemoryBits>/,
        '<Symbol>SYSTEM_READY</Symbol>\n      </MemoryBit>' + ADDITIONAL_MEMORY_BITS + '\n    </MemoryBits>'
    );

    console.log('Adding HMI memory floats (INT_TO_REAL for precision)...');
    // Replace empty MemoryFloats with our HMI tags
    content = content.replace(/<MemoryFloats \/>/, MEMORY_FLOATS);

    console.log('Adding raw analog storage memory words...');
    // Add memory words for raw analog inputs after the </MemoryWords> closing tag
    content = content.replace(
        /<\/MemoryWords>/,
        MEMORY_WORDS_RAW + '\n    </MemoryWords>'
    );

    console.log('Adding timer declarations...');
    // Replace existing Timers section (template has TM0 defined, we need TM0-TM3)
    content = content.replace(/<Timers>[\s\S]*?<\/Timers>/, TIMERS);

    console.log('Configuring hardware for TM221CE40T + TM3TI4/G only...');
    // Define TM3TI4/G extension at Index 0 with %IW1.x addresses
    const TM3TI4G_EXTENSION = `      <Extensions>
        <ModuleExtensionObject>
          <Index>0</Index>
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
              <McReadParPtoMax>0</McReadParPtoMax>
              <McWriteParPtoMax>0</McWriteParPtoMax>
              <McMotionTaskPtoMax>0</McMotionTaskPtoMax>
            </PtoConfiguration>
            <ComConfiguration>
              <ReadVarBasicMax>0</ReadVarBasicMax>
              <WriteVarBasicMax>0</WriteVarBasicMax>
              <WriteReadVarBasicMax>0</WriteReadVarBasicMax>
              <SendRecvMsgBasicMax>0</SendRecvMsgBasicMax>
              <SendRecvSmsMax>0</SendRecvSmsMax>
            </ComConfiguration>
            <Compatibility>0</Compatibility>
            <FastCounterMax>0</FastCounterMax>
            <FourInputsEventTask>0</FourInputsEventTask>
            <GrafcetBitsMax>0</GrafcetBitsMax>
            <InternalRamStart>0</InternalRamStart>
            <LabelsMax>0</LabelsMax>
            <LfRegistersMax>0</LfRegistersMax>
            <MemoryConstantWordsMax>0</MemoryConstantWordsMax>
            <MemoryWordsMax>0</MemoryWordsMax>
            <NumRelays>0</NumRelays>
            <NumRelaysMax>0</NumRelaysMax>
            <NumTransistors>0</NumTransistors>
            <NumTransistorsMax>0</NumTransistorsMax>
            <PidAmountMax>0</PidAmountMax>
            <PlcNumberSysBits>0</PlcNumberSysBits>
            <PlcNumberSysWords>0</PlcNumberSysWords>
            <PlcStartAddrSysBits>0</PlcStartAddrSysBits>
            <PlcType>0</PlcType>
            <TimersMax>0</TimersMax>
            <AnalogInputPrecision>0</AnalogInputPrecision>
            <AnalogOutputPrecision>0</AnalogOutputPrecision>
            <StepCountersMax>0</StepCountersMax>
            <CountersMax>0</CountersMax>
            <DrumsMax>0</DrumsMax>
            <ExternalRamSize>0</ExternalRamSize>
            <ExternalRamSizeWithDisplay>0</ExternalRamSizeWithDisplay>
            <ExternalRamStart>0</ExternalRamStart>
            <InternalRamAppStart>0</InternalRamAppStart>
            <InternalRamSize>0</InternalRamSize>
            <InternalBitsMax>0</InternalBitsMax>
            <InternalEepromSize>0</InternalEepromSize>
            <MetadataAreaSize>0</MetadataAreaSize>
            <ScheduleBlocksMax>0</ScheduleBlocksMax>
            <ShiftBitRegistersMax>0</ShiftBitRegistersMax>
            <SubroutinesMax>0</SubroutinesMax>
            <SupportDoubleWord>false</SupportDoubleWord>
            <SupportEvents>false</SupportEvents>
            <SupportFloatingPoint>false</SupportFloatingPoint>
            <NumberOf1MsTimerBase>0</NumberOf1MsTimerBase>
            <UdfbInstanceMax>0</UdfbInstanceMax>
            <UdfMax>0</UdfMax>
            <UdfObjectsMax>0</UdfObjectsMax>
          </TechnicalConfiguration>
          <DigitalInputs />
          <DigitalOutputs />
          <AnalogInputs>
            <AnalogIO>
              <Address>%IW1.0</Address>
              <Index>0</Index>
              <Symbol>RTD_TEMP</Symbol>
              <Type>
                <Value>0</Value>
                <Name>Type_PT100</Name>
              </Type>
              <Scope>
                <Value>0</Value>
                <Name>Scope_Standard</Name>
              </Scope>
              <Sampling>
                <Value>0</Value>
                <Name>Sampling_0_100ms</Name>
              </Sampling>
              <Minimum>-200</Minimum>
              <Maximum>850</Maximum>
              <IsInput>true</IsInput>
              <R>1</R>
              <B>1</B>
              <T>1</T>
              <Activation>3100</Activation>
              <Reactivation>1500</Reactivation>
              <InputFilter>0</InputFilter>
              <R1>8700</R1>
              <R2>200</R2>
              <T1>234.15</T1>
              <T2>311.15</T2>
              <ChartCalculation>false</ChartCalculation>
            </AnalogIO>
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
              <Sampling>
                <Value>0</Value>
                <Name>Sampling_0_100ms</Name>
              </Sampling>
              <Minimum>0</Minimum>
              <Maximum>0</Maximum>
              <IsInput>true</IsInput>
              <R>1</R>
              <B>1</B>
              <T>1</T>
              <Activation>3100</Activation>
              <Reactivation>1500</Reactivation>
              <InputFilter>0</InputFilter>
              <R1>8700</R1>
              <R2>200</R2>
              <T1>234.15</T1>
              <T2>311.15</T2>
              <ChartCalculation>false</ChartCalculation>
            </AnalogIO>
            <AnalogIO>
              <Address>%IW1.2</Address>
              <Index>2</Index>
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
                <Name>Sampling_0_100ms</Name>
              </Sampling>
              <Minimum>0</Minimum>
              <Maximum>0</Maximum>
              <IsInput>true</IsInput>
              <R>1</R>
              <B>1</B>
              <T>1</T>
              <Activation>3100</Activation>
              <Reactivation>1500</Reactivation>
              <InputFilter>0</InputFilter>
              <R1>8700</R1>
              <R2>200</R2>
              <T1>234.15</T1>
              <T2>311.15</T2>
              <ChartCalculation>false</ChartCalculation>
            </AnalogIO>
            <AnalogIO>
              <Address>%IW1.3</Address>
              <Index>3</Index>
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
                <Name>Sampling_0_100ms</Name>
              </Sampling>
              <Minimum>0</Minimum>
              <Maximum>0</Maximum>
              <IsInput>true</IsInput>
              <R>1</R>
              <B>1</B>
              <T>1</T>
              <Activation>3100</Activation>
              <Reactivation>1500</Reactivation>
              <InputFilter>0</InputFilter>
              <R1>8700</R1>
              <R2>200</R2>
              <T1>234.15</T1>
              <T2>311.15</T2>
              <ChartCalculation>false</ChartCalculation>
            </AnalogIO>
          </AnalogInputs>
          <AnalogInputsStatus>
            <AnalogIoStatus>
              <Address>%IWS1.0</Address>
              <Index>0</Index>
            </AnalogIoStatus>
            <AnalogIoStatus>
              <Address>%IWS1.1</Address>
              <Index>1</Index>
            </AnalogIoStatus>
            <AnalogIoStatus>
              <Address>%IWS1.2</Address>
              <Index>2</Index>
            </AnalogIoStatus>
            <AnalogIoStatus>
              <Address>%IWS1.3</Address>
              <Index>3</Index>
            </AnalogIoStatus>
          </AnalogInputsStatus>
          <AnalogOutputs />
          <AnalogOutputsStatus />
          <HighSpeedCounters />
          <PulseTrainOutputs />
          <HardwareId>199</HardwareId>
          <IsExpander>false</IsExpander>
          <IsOptionnal>false</IsOptionnal>
          <DIOFunctionalMode>DIOFunctionalModeNormal</DIOFunctionalMode>
          <HoldupTime>10</HoldupTime>
        </ModuleExtensionObject>
      </Extensions>`;

    // Replace entire Extensions section
    content = content.replace(/<Extensions>[\s\S]*?<\/Extensions>/, TM3TI4G_EXTENSION);

    console.log('Removing cartridge configurations...');
    // Replace cartridge sections with empty ones
    content = content.replace(/<Cartridge1>[\s\S]*?<\/Cartridge1>/, '<Cartridge1 />');
    content = content.replace(/<Cartridge2>[\s\S]*?<\/Cartridge2>/, '<Cartridge2 />');

    console.log('Writing output file...');
    fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

    console.log('');
    console.log('='.repeat(60));
    console.log('SUCCESS: Tank Level RTD Control Program Generated');
    console.log('='.repeat(60));
    console.log('');
    console.log('Output: ' + OUTPUT_PATH);
    console.log('');
    console.log('--- SPECIFICATIONS ---');
    console.log('Tank: 1m x 1m x 1m = 1000 liters');
    console.log('Level transmitter: 4-20mA, deadband 300mm, max range 5000mm');
    console.log('RTD: PT100 via TM3TI4/G');
    console.log('Stabilization delay: 10 seconds before outlet opens');
    console.log('');
    console.log('--- RAW ANALOG STORAGE (CRITICAL: copy %IW first!) ---');
    console.log('%MW100: RAW_LEVEL (copy of %IW0.0)');
    console.log('%MW101: RAW_TEMP (copy of %IW1.0)');
    console.log('Note: NEVER use %IW directly in calculations. Copy to %MW first.');
    console.log('');
    console.log('--- HMI TAGS (scaled from memory words) ---');
    console.log('%MF102: HMI_TANK_LITERS (0.0-1000.0 liters) - scaled from %MW100');
    console.log('%MF103: HMI_TEMPERATURE (degrees C) - scaled from %MW101');
    console.log('%MF104: HMI_LEVEL_PERCENT (0.0-100.0%) - calculated from %MF102');
    console.log('Note: Using %MF102+ to avoid retentive storage (first 100 are retentive)');
    console.log('');
    console.log('--- I/O MAPPING ---');
    console.log('Inputs:');
    console.log('  %I0.0: EMERGENCY_PB');
    console.log('  %I0.1: INLET_VLV_OPEN_FB');
    console.log('  %I0.2: INLET_VLV_CLOSE_FB');
    console.log('  %I0.3: OUTLET_VLV_OPEN_FB');
    console.log('  %I0.4: OUTLET_VLV_CLOSE_FB');
    console.log('  %I0.5: START_FILL_PB');
    console.log('  %I0.6: ALARM_RESET_PB');
    console.log('Outputs:');
    console.log('  %Q0.0: INLET_VALVE');
    console.log('  %Q0.1: OUTLET_VALVE');
    console.log('  %Q0.2: INLET_VLV_ALARM_LAMP');
    console.log('  %Q0.3: OUTLET_VLV_ALARM_LAMP');
    console.log('  %Q0.4: FILLING_LAMP');
    console.log('  %Q0.5: DRAINING_LAMP');
    console.log('  %Q0.6: TANK_FULL_LAMP');
    console.log('  %Q0.7: TANK_EMPTY_LAMP');
    console.log('Analog Inputs (copy to %MW first!):');
    console.log('  %IW0.0: LEVEL_XMTR (built-in 4-20mA) -> copy to %MW100');
    console.log('  %IW1.0: RTD_TEMP (TM3TI4/G) -> copy to %MW101');
    console.log('');
    console.log('--- PROGRAM RUNGS (26 total) ---');
    console.log('1: Emergency Stop (from template)');
    console.log('2: Cold/Warm Start -> Reset %MF102, %MF103, %MF104');
    console.log('3: Generate SYSTEM_READY (%M0) from NOT %I0.0');
    console.log('4: Copy %IW0.0 -> %MW100 (RAW_LEVEL)');
    console.log('5: Copy %IW1.0 -> %MW101 (RAW_TEMP)');
    console.log('6: Scale %MW100 -> %MF102 (liters)');
    console.log('7: Scale %MW101 -> %MF103 (temperature)');
    console.log('8: Calculate %MF104 (percent) from %MF102');
    console.log('9: Detect Tank Full (>95%)');
    console.log('10: Detect Tank Empty (<5%)');
    console.log('11: Filling Mode Control');
    console.log('12: Inlet Valve Control');
    console.log('13: 10-Second Stabilization Timer');
    console.log('14: Draining Mode Control');
    console.log('15: Outlet Valve Control');
    console.log('16-17: Inlet Valve Feedback Alarm');
    console.log('18-19: Outlet Valve Feedback Alarm');
    console.log('20: Any Alarm Consolidation');
    console.log('21-26: Indicator Lamps');
    console.log('');
    console.log('PLCAutoPilot v3.1 - Tank Level RTD Control');
    console.log('Features: SYSTEM_READY rung, %S0/%S1 reset for ALL HMI floats');

} catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
}
