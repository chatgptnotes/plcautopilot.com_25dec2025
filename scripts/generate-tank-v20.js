/**
 * Tank Level RTD Generator v20
 *
 * Fixes from v19:
 * 1. Reset_HMI rung: Proper OR logic with %S0/%S1 and multiple reset operations
 * 2. System_Ready rung: Added 3-second timer using BLK %TM0 pattern per skill v3.0
 *
 * Based on skill v3.0/v3.1 patterns from:
 * - Template for configuration of cards.smbp
 * - schneider.md skill file
 */

const fs = require('fs');
const path = require('path');

const projectName = 'Tank_Level_RTD_v28';
const plcModel = 'TM221CE40T';

// Symbol definitions
const symbols = {
  M0: 'SYSTEM_READY',
  M1: 'TANK_LEVEL_LOW',
  M2: 'TANK_LEVEL_HIGH',
  Q00: 'INLET_VALVE',
  Q01: 'OUTLET_VALVE',
  MW100: 'RAW_LEVEL',
  MW101: 'RAW_TEMP',
  MF102: 'HMI_TANK_LITERS',
  MF103: 'HMI_TEMPERATURE',
  MF104: 'HMI_LEVEL_PERCENT',
  I00: 'EMERGENCY_PB',
  TM0: 'STARTUP_TIMER'
};

// Generate line elements
function genLines(startCol, endCol, row = 0) {
  const lines = [];
  for (let c = startCol; c <= endCol; c++) {
    lines.push(`              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>${row}</Row>
                <Column>${c}</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`);
  }
  return lines.join('\n');
}

// Rung 0: System Ready with 3-second Timer (MANDATORY per skill v3.0)
// Pattern: EMERGENCY_PB -> Timer(3s) -> SYSTEM_READY
function generateSystemReadyRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.0</Descriptor>
                <Comment />
                <Symbol>${symbols.I00}</Symbol>
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
${genLines(3, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>${symbols.M0}</Symbol>
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
            <MainComment>3 second startup delay before system ready</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 1: Cold/Warm Start Reset for HMI values
// Pattern: %S0 OR %S1 -> Reset %MF102 (HMI_TANK_LITERS)
function generateResetHMILitersRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S0</Descriptor>
                <Comment>Indicates or executes a cold start</Comment>
                <Symbol>SB_COLDSTART</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S1</Descriptor>
                <Comment>Indicates there was a warm start</Comment>
                <Symbol>SB_WARMSTART</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
${genLines(1, 8)}
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MF102 := 0.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
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
                <InstructionLine>LD    %S0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %S1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF102 := 0.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Reset_HMI_Liters</Name>
            <MainComment>Reset HMI tank liters on cold/warm start</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 2: Cold/Warm Start Reset for HMI Temperature
function generateResetHMITempRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S0</Descriptor>
                <Comment>Indicates or executes a cold start</Comment>
                <Symbol>SB_COLDSTART</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S1</Descriptor>
                <Comment>Indicates there was a warm start</Comment>
                <Symbol>SB_WARMSTART</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
${genLines(1, 8)}
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MF103 := 0.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
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
                <InstructionLine>LD    %S0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %S1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF103 := 0.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Reset_HMI_Temp</Name>
            <MainComment>Reset HMI temperature on cold/warm start</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 3: Cold/Warm Start Reset for HMI Level Percent
function generateResetHMIPercentRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S0</Descriptor>
                <Comment>Indicates or executes a cold start</Comment>
                <Symbol>SB_COLDSTART</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%S1</Descriptor>
                <Comment>Indicates there was a warm start</Comment>
                <Symbol>SB_WARMSTART</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
${genLines(1, 8)}
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MF104 := 0.0</OperationExpression>
                <Row>0</Row>
                <Column>9</Column>
                <ChosenConnection>Left</ChosenConnection>
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
                <InstructionLine>LD    %S0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %S1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF104 := 0.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Reset_HMI_Percent</Name>
            <MainComment>Reset HMI level percent on cold/warm start</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 4: Copy raw level input to memory word
function generateCopyLevelRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>${symbols.M0}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 8)}
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
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MW100 := %IW0.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Copy_Level</Name>
            <MainComment>Copy raw 4-20mA level input to memory word</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 5: Copy raw RTD temperature input to memory word
function generateCopyRTDRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>${symbols.M0}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 8)}
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
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MW101 := %IW1.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Copy_RTD</Name>
            <MainComment>Copy raw RTD temperature input to memory word</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 6: Scale level to liters (4-20mA to 0-1000)
function generateScaleLevelRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>${symbols.M0}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 8)}
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
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF102 := INT_TO_REAL(%MW100 - 2000) / 8.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Scale_Level</Name>
            <MainComment>Scale 4-20mA (2000-10000) to 0-1000 liters</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 7: Scale RTD temperature
function generateScaleTempRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>${symbols.M0}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 8)}
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
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF103 := INT_TO_REAL(%MW101) / 10.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Scale_Temp</Name>
            <MainComment>Scale RTD to degrees C (raw / 10)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 8: Calculate level percentage
function generateLevelPercentRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>${symbols.M0}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 8)}
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
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MF104 := %MF102 / 10.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Level_Percent</Name>
            <MainComment>Calculate level percentage (0-100%)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 9: High Level Detection
function generateHighLevelRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>${symbols.M0}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Comparison</ElementType>
                <ComparisonExpression>%MF102 &gt; 950.0</ComparisonExpression>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(3, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment />
                <Symbol>${symbols.M2}</Symbol>
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
                <InstructionLine>AND   [ %MF102 &gt; 950.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>High_Level</Name>
            <MainComment>Tank level high detection above 950 liters</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 10: Low Level Detection
function generateLowLevelRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>${symbols.M0}</Symbol>
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
              </LadderEntity>
${genLines(3, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment />
                <Symbol>${symbols.M1}</Symbol>
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
                <InstructionLine>AND   [ %MF102 &lt; 50.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Low_Level</Name>
            <MainComment>Tank level low detection below 50 liters</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 11: Inlet Valve Control with hysteresis
function generateInletValveRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment />
                <Symbol>${symbols.M1}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment />
                <Symbol>${symbols.M2}</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(2, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment />
                <Symbol>${symbols.Q00}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment />
                <Symbol>${symbols.Q00}</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Inlet_Valve</Name>
            <MainComment>Fill when low, stop when high (hysteresis)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 12: Outlet Valve Control with hysteresis
function generateOutletValveRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment />
                <Symbol>${symbols.M2}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment />
                <Symbol>${symbols.M1}</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(2, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment />
                <Symbol>${symbols.Q01}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment />
                <Symbol>${symbols.Q01}</Symbol>
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
                <InstructionLine>OR    %Q0.1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Outlet_Valve</Name>
            <MainComment>Drain when high, stop when low (hysteresis)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Generate MemoryBits section
function generateMemoryBits() {
  return `    <MemoryBits>
      <MemoryBit>
        <Address>%M0</Address>
        <Index>0</Index>
        <Symbol>${symbols.M0}</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M1</Address>
        <Index>1</Index>
        <Symbol>${symbols.M1}</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M2</Address>
        <Index>2</Index>
        <Symbol>${symbols.M2}</Symbol>
      </MemoryBit>
    </MemoryBits>`;
}

// Generate Timers section with 3-second timer
function generateTimers() {
  return `    <Timers>
      <TimerTM>
        <Address>%TM0</Address>
        <Index>0</Index>
        <Preset>3</Preset>
        <Base>OneSecond</Base>
      </TimerTM>
    </Timers>`;
}

// Generate DiscretOutput with symbols
function generateDiscretOutputWithSymbol(address, index, symbol) {
  return `          <DiscretOutput>
            <Address>${address}</Address>
            <Index>${index}</Index>
            <Symbol>${symbol}</Symbol>
          </DiscretOutput>`;
}

async function main() {
  console.log('=== Tank Level RTD Generator v20 ===');
  console.log('Fixes:');
  console.log('  1. System_Ready rung with 3-second timer (BLK %TM0 pattern)');
  console.log('  2. Separate rungs for Cold/Warm Start resets');
  console.log('  3. Proper OR logic connections');
  console.log('');

  // Read reference template
  const templatePath = path.join('c:', 'Users', 'HP', 'Downloads', 'Template for configuration of cards.smbp');
  let content = fs.readFileSync(templatePath, 'utf8');

  // Generate rungs in correct order
  const rungs = [
    generateSystemReadyRung(),       // Rung 0: System Ready with Timer
    generateResetHMILitersRung(),    // Rung 1: Reset HMI Liters
    generateResetHMITempRung(),      // Rung 2: Reset HMI Temp
    generateResetHMIPercentRung(),   // Rung 3: Reset HMI Percent
    generateCopyLevelRung(),         // Rung 4: Copy %IW0.0 to %MW100
    generateCopyRTDRung(),           // Rung 5: Copy %IW1.0 to %MW101
    generateScaleLevelRung(),        // Rung 6: Scale to liters
    generateScaleTempRung(),         // Rung 7: Scale to degrees
    generateLevelPercentRung(),      // Rung 8: Calculate percentage
    generateHighLevelRung(),         // Rung 9: High level detection
    generateLowLevelRung(),          // Rung 10: Low level detection
    generateInletValveRung(),        // Rung 11: Inlet valve control
    generateOutletValveRung()        // Rung 12: Outlet valve control
  ];
  const rungsXml = rungs.join('\n');

  // Replace sections
  content = content.replace(/<Rungs>[\s\S]*?<\/Rungs>/, `<Rungs>\n${rungsXml}\n        </Rungs>`);
  content = content.replace(/<MemoryBits>[\s\S]*?<\/MemoryBits>/, generateMemoryBits());
  content = content.replace(/<Timers \/>/, generateTimers());

  // Update DiscretOutput symbols for Q0.0 and Q0.1
  content = content.replace(
    /<DiscretOutput>\s*<Address>%Q0\.0<\/Address>\s*<Index>0<\/Index>\s*<Symbol>[^<]*<\/Symbol>\s*<\/DiscretOutput>/,
    generateDiscretOutputWithSymbol('%Q0.0', 0, symbols.Q00)
  );
  content = content.replace(
    /<DiscretOutput>\s*<Address>%Q0\.1<\/Address>\s*<Index>1<\/Index>\s*<Symbol>[^<]*<\/Symbol>\s*<\/DiscretOutput>/,
    generateDiscretOutputWithSymbol('%Q0.1', 1, symbols.Q01)
  );

  // Update project name
  content = content.replace(/Template for configuration of cards/g, projectName);
  content = content.replace(/<FullName>[^<]*<\/FullName>/, `<FullName>C:\\Projects\\${projectName}.smbp</FullName>`);

  // Ensure BOM
  const BOM = '\uFEFF';
  if (!content.startsWith(BOM)) {
    content = BOM + content;
  }

  // Ensure CRLF
  content = content.replace(/\r?\n/g, '\r\n');

  // Write output
  const outputPath = path.join(__dirname, '..', 'plc_programs', `${projectName}.smbp`);
  fs.writeFileSync(outputPath, content, 'utf8');

  console.log('Generated:', outputPath);
  console.log('');
  console.log('Rungs: 13');
  console.log('  0. System_Ready (3s Timer with BLK %TM0)');
  console.log('  1. Reset_HMI_Liters (%S0 OR %S1 -> %MF102 := 0.0)');
  console.log('  2. Reset_HMI_Temp (%S0 OR %S1 -> %MF103 := 0.0)');
  console.log('  3. Reset_HMI_Percent (%S0 OR %S1 -> %MF104 := 0.0)');
  console.log('  4. Copy_Level (%IW0.0 -> %MW100)');
  console.log('  5. Copy_RTD (%IW1.0 -> %MW101)');
  console.log('  6. Scale_Level (4-20mA to 0-1000 liters)');
  console.log('  7. Scale_Temp (RTD to degrees C)');
  console.log('  8. Level_Percent (0-100%)');
  console.log('  9. High_Level (> 950 liters)');
  console.log(' 10. Low_Level (< 50 liters)');
  console.log(' 11. Inlet_Valve (fill with hysteresis)');
  console.log(' 12. Outlet_Valve (drain with hysteresis)');
  console.log('');
  console.log('Timer: %TM0 = 3 seconds (OneSecond base, Preset 3)');
}

main().catch(console.error);
