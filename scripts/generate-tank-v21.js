/**
 * Tank Level RTD Generator v21
 *
 * Hardware Configuration:
 * - TM221CE40T (main controller with built-in %IW0.0 for 4-20mA level)
 * - TM3TI4/G (RTD module at slot 1 for %IW1.0 temperature)
 *
 * Fixes from v20:
 * - Correct hardware config with ONLY TM221CE40T + TM3TI4/G
 * - TM3TI4/G at Index 0 = addresses %IW1.x
 */

const fs = require('fs');
const path = require('path');

const projectName = 'Tank_Level_RTD_v29';
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
  IW00: 'LEVEL_4_20MA',
  IW10: 'RTD_TEMP'
};

// Generate TM3TI4/G module configuration at Index 0 (slot 1 = %IW1.x)
function generateTM3TI4GModule() {
  return `        <ModuleExtensionObject>
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
              <Symbol>${symbols.IW10}</Symbol>
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
        </ModuleExtensionObject>`;
}

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

// Rung 0: System Ready with 3-second Timer
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

// Rung 1: Cold/Warm Start Reset for HMI Liters
function generateResetHMILitersRung() {
  return `          <RungEntity>
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

// Rung 2: Reset HMI Temperature
function generateResetHMITempRung() {
  return `          <RungEntity>
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

// Rung 3: Reset HMI Level Percent
function generateResetHMIPercentRung() {
  return `          <RungEntity>
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

// Rung 4: Copy raw level from built-in analog %IW0.0
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
            <MainComment>Copy raw 4-20mA level from built-in analog input</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 5: Copy raw RTD temperature from TM3TI4/G module %IW1.0
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
            <MainComment>Copy raw RTD temperature from TM3TI4/G module</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 6: Scale level to liters
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
            <MainComment>Tank level high above 950 liters</MainComment>
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
            <MainComment>Tank level low below 50 liters</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 11: Inlet Valve Control
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
            <MainComment>Fill when low, stop when high</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 12: Outlet Valve Control
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
            <MainComment>Drain when high, stop when low</MainComment>
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

// Generate Timers section
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

async function main() {
  console.log('=== Tank Level RTD Generator v21 ===');
  console.log('Hardware: TM221CE40T + TM3TI4/G ONLY');
  console.log('');

  // Read template
  const templatePath = path.join('c:', 'Users', 'HP', 'Downloads', 'Template for configuration of cards.smbp');
  let content = fs.readFileSync(templatePath, 'utf8');

  // Generate rungs
  const rungs = [
    generateSystemReadyRung(),
    generateResetHMILitersRung(),
    generateResetHMITempRung(),
    generateResetHMIPercentRung(),
    generateCopyLevelRung(),
    generateCopyRTDRung(),
    generateScaleLevelRung(),
    generateScaleTempRung(),
    generateLevelPercentRung(),
    generateHighLevelRung(),
    generateLowLevelRung(),
    generateInletValveRung(),
    generateOutletValveRung()
  ];
  const rungsXml = rungs.join('\n');

  // Replace rungs section
  content = content.replace(/<Rungs>[\s\S]*?<\/Rungs>/, `<Rungs>\n${rungsXml}\n        </Rungs>`);

  // Replace MemoryBits
  content = content.replace(/<MemoryBits>[\s\S]*?<\/MemoryBits>/, generateMemoryBits());

  // Replace Timers
  content = content.replace(/<Timers \/>/, generateTimers());

  // Replace Extensions section with ONLY TM3TI4/G
  content = content.replace(
    /<Extensions>[\s\S]*?<\/Extensions>/,
    `<Extensions>\n${generateTM3TI4GModule()}\n      </Extensions>`
  );

  // Clear Cartridge1 reference (remove TMC2AI2)
  content = content.replace(
    /<Cartridge1>[\s\S]*?<Reference>TMC2AI2<\/Reference>/,
    `<Cartridge1>
        <Index>0</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference />`
  );

  // Clear Cartridge2 reference (remove TMC2TI2)
  content = content.replace(
    /<Cartridge2>[\s\S]*?<Reference>TMC2TI2<\/Reference>/,
    `<Cartridge2>
        <Index>0</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference />`
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
  console.log('Hardware Configuration:');
  console.log('  Controller: TM221CE40T');
  console.log('    - Built-in %IW0.0 for 4-20mA level sensor');
  console.log('  Extension: TM3TI4/G (slot 1)');
  console.log('    - %IW1.0 for RTD temperature sensor');
  console.log('');
  console.log('Addresses:');
  console.log('  %IW0.0 -> %MW100 (RAW_LEVEL)');
  console.log('  %IW1.0 -> %MW101 (RAW_TEMP from TM3TI4/G)');
  console.log('');
  console.log('Rungs: 13');
}

main().catch(console.error);
