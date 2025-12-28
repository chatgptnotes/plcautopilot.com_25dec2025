/**
 * M221 .smbp File Generator
 *
 * Generates valid EcoStruxure Machine Expert Basic files
 * Based on verified patterns from working .smbp files
 *
 * Key rules discovered:
 * - Comparison blocks span 2 columns (Column 1 must be empty)
 * - Timer blocks span 2 columns (Column 2 must be empty after timer at Col 1)
 * - Counter blocks span 2 columns (Column 2 must be empty)
 * - Branch connections use Up/Down/Left/Right
 * - IL code must match ladder structure exactly
 * - TechnicalConfiguration section is REQUIRED for Machine Expert Basic
 */

// Element types
export type ElementType =
  | 'NormalContact'
  | 'NegatedContact'
  | 'Coil'
  | 'SetCoil'
  | 'ResetCoil'
  | 'Line'
  | 'CompareBlock'    // Correct type for comparison blocks (not 'Comparison')
  | 'OperateBlock'    // Correct type for operation blocks (not 'Operation')
  | 'TimerTM'
  | 'CounterCT';

export type ConnectionType = 'Left' | 'Right' | 'Up' | 'Down';

export interface LadderElement {
  type: ElementType;
  descriptor?: string;
  symbol?: string;
  comment?: string;
  row: number;
  column: number;
  connections: ConnectionType[];
  // For Comparison blocks
  comparisonExpression?: string;
  // For Operation blocks
  operationExpression?: string;
}

export interface TimerConfig {
  address: string;
  symbol: string;
  type: 'TON' | 'TOF' | 'TP';
  preset: number;
  timeBase: 'OneMillisecond' | 'TenMillisecond' | 'HundredMillisecond' | 'OneSecond' | 'OneMinute';
  comment: string;
}

export interface CounterConfig {
  address: string;
  symbol: string;
  preset: number;
  comment: string;
}

export interface RungConfig {
  name: string;
  comment: string;
  elements: LadderElement[];
  ilCode: string[];
}

export interface IOConfig {
  address: string;
  symbol: string;
  comment?: string;
}

export interface MemoryBitConfig {
  address: string;
  symbol: string;
  comment?: string;
}

export interface MemoryWordConfig {
  address: string;
  symbol: string;
  comment?: string;
  initialValue?: number;
}

export interface AnalogInputConfig {
  address: string;
  symbol: string;
  type: '4_20mA' | '0_20mA' | '0_10V' | 'NotUsed';
  minimum?: number;
  maximum?: number;
}

export interface TM3ExpansionConfig {
  reference: string;
  analogInputs?: AnalogInputConfig[];
}

export interface ProgramConfig {
  projectName: string;
  plcModel: string;
  rungs: RungConfig[];
  inputs: IOConfig[];
  outputs: IOConfig[];
  memoryBits: MemoryBitConfig[];
  memoryWords?: MemoryWordConfig[];
  timers?: TimerConfig[];
  counters?: CounterConfig[];
  expansions?: TM3ExpansionConfig[];
}

/**
 * Generate a complete .smbp XML file with all required sections
 */
export function generateSmbpFile(config: ProgramConfig): string {
  const { projectName, plcModel, rungs, inputs, outputs, memoryBits, memoryWords, timers, counters, expansions } = config;

  // BOM for UTF-8 (required by Machine Expert Basic)
  const bom = '\ufeff';

  return `${bom}<?xml version="1.0" encoding="utf-8"?>
<ProjectDescriptor xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <ProjectVersion>3.0.0.0</ProjectVersion>
  <ManagementLevel>FunctLevelMan21_0</ManagementLevel>
  <Name>${escapeXml(projectName)}</Name>
  <FullName>C:\\Users\\Hp\\Downloads\\${escapeXml(projectName)}.smbp</FullName>
  <CurrentCultureName>en-GB</CurrentCultureName>
  <SoftwareConfiguration>
    <Pous>
      <ProgramOrganizationUnits>
        <Name>${escapeXml(projectName)}</Name>
        <SectionNumber>0</SectionNumber>
        <Rungs>
${rungs.map(rung => generateRungXml(rung)).join('\n')}
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
${memoryBits.map((mb, i) => generateMemoryBitXml(mb, i)).join('\n')}
    </MemoryBits>
${generateSystemBitsXml()}
${generateSystemWordsXml()}
    <GrafcetSteps />
    <MemoryWords>
${(memoryWords || []).map((mw, i) => generateMemoryWordXml(mw, i)).join('\n')}
    </MemoryWords>
    <MemoryDoubleWords />
    <MemoryFloats />
    <ConstantWords />
    <ConstantDoubleWords />
    <ConstantMemoryFloats />
    <Timers>
${(timers || []).map((t, i) => generateTimerXml(t, i)).join('\n')}
    </Timers>
    <Counters>
${(counters || []).map((c, i) => generateCounterXml(c, i)).join('\n')}
    </Counters>
    <FastCounters />
    <Registers />
    <Drums />
    <ShiftBitRegisters />
    <StepCounters />
    <ScheduleBlocks />
    <Pids />
${generateMessageBlocksXml()}
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
        <Reference>${escapeXml(plcModel)}</Reference>
        <Name>MyController</Name>
        <Consumption5V>520</Consumption5V>
        <Consumption24V>200</Consumption24V>
${generateTechnicalConfigurationXml(plcModel)}
        <DigitalInputs>
${generateDigitalInputsXml(inputs, plcModel)}
        </DigitalInputs>
        <DigitalOutputs>
${generateDigitalOutputsXml(outputs, plcModel)}
        </DigitalOutputs>
${generateAnalogInputsXml(plcModel)}
        <AnalogInputsStatus />
        <AnalogOutputs />
        <AnalogOutputsStatus />
${generateHighSpeedCountersXml(plcModel)}
${generatePulseTrainOutputsXml(plcModel)}
        <HardwareId>${getHardwareId(plcModel)}</HardwareId>
        <IsExpander>false</IsExpander>
${generateEthernetConfigurationXml(plcModel)}
        <MaxCartridge>1</MaxCartridge>
        <C1TranslationX>170</C1TranslationX>
        <C1TranslationY>110</C1TranslationY>
        <C2TranslationX>0</C2TranslationX>
        <C2TranslationY>0</C2TranslationY>
        <C1SizeX>155</C1SizeX>
        <C1SizeY>190</C1SizeY>
        <C2SizeX>0</C2SizeX>
        <C2SizeY>0</C2SizeY>
        <InputAssemblys />
        <OutputAssemblys />
        <InputRegisters />
        <HoldingRegisters />
      </Cpu>
      <Extensions>
${(expansions || []).map((exp, i) => generateExpansionXml(exp, i)).join('\n')}
      </Extensions>
      <Cartridge1>
        <Index>0</Index>
        <InputNb>0</InputNb>
        <OutputNb>0</OutputNb>
        <Kind>0</Kind>
        <Reference />
        <AnalogInputs />
        <AnalogInputsStatus />
        <AnalogOutputs />
        <AnalogOutputsStatus />
        <HardwareId>0</HardwareId>
        <IsExpander>false</IsExpander>
      </Cartridge1>
${generateSerialLineConfigurationXml()}
${generateSerialLineIoScannerConfigurationXml()}
    </Plc>
  </HardwareConfiguration>
  <DisplayUserLabelsConfiguration>
    <Languages>
      <UserLabelLanguage>
        <Code>English</Code>
        <Name>English</Name>
      </UserLabelLanguage>
    </Languages>
    <Translations />
  </DisplayUserLabelsConfiguration>
  <GlobalProperties>
    <UserInformations />
    <CompanyInformations />
    <ProjectInformations>
      <Name>${escapeXml(projectName)}</Name>
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
}

/**
 * Generate Technical Configuration XML (CRITICAL for Machine Expert Basic)
 */
function generateTechnicalConfigurationXml(plcModel: string): string {
  return `        <TechnicalConfiguration>
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
          <NumTransistors>${getMaxOutputs(plcModel)}</NumTransistors>
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
        </TechnicalConfiguration>`;
}

/**
 * Generate System Bits XML
 */
function generateSystemBitsXml(): string {
  return `    <SystemBits>
      <MemoryBit>
        <Address>%S0</Address>
        <Index>0</Index>
        <Symbol>SB_COLDSTART</Symbol>
        <Comment>Indicates or executes a cold start (data initialized to default values)</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S1</Address>
        <Index>1</Index>
        <Symbol>SB_WARMSTART</Symbol>
        <Comment>Indicates there was a warm start with data backup</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S4</Address>
        <Index>4</Index>
        <Symbol>SB_TB10MS</Symbol>
        <Comment>Time base of 10 ms generated by an internal clock</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S5</Address>
        <Index>5</Index>
        <Symbol>SB_TB100MS</Symbol>
        <Comment>Time base of 100 ms generated by an internal clock</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S6</Address>
        <Index>6</Index>
        <Symbol>SB_TB1S</Symbol>
        <Comment>Time base of 1 s generated by an internal clock</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S7</Address>
        <Index>7</Index>
        <Symbol>SB_TB1MIN</Symbol>
        <Comment>Time base of 1 min generated by an internal clock</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S9</Address>
        <Index>9</Index>
        <Symbol>SB_FALLBACKOUTPUT</Symbol>
        <Comment>Set to 1 to apply fallbacks on digital and analog outputs</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S10</Address>
        <Index>10</Index>
        <Symbol>SB_IOCOMBUS</Symbol>
        <Comment>I/O communication is running correctly (1), I/O communication error detected (0)</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S11</Address>
        <Index>11</Index>
        <Symbol>SB_WATCHDOG</Symbol>
        <Comment>Watchdog overflow causes the controller to change to HALT</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S12</Address>
        <Index>12</Index>
        <Symbol>SB_RUNMODE</Symbol>
        <Comment>The controller is running</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S13</Address>
        <Index>13</Index>
        <Symbol>SB_FIRSTRUN</Symbol>
        <Comment>Indicates the first controller cycle in RUN mode</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S14</Address>
        <Index>14</Index>
        <Symbol>SB_IOFORCED</Symbol>
        <Comment>This bit indicates there is at least one input or output forced</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S15</Address>
        <Index>15</Index>
        <Symbol>SB_INFORCED</Symbol>
        <Comment>This bit indicates there is at least one input forced</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S16</Address>
        <Index>16</Index>
        <Symbol>SB_OUTFORCED</Symbol>
        <Comment>This bit indicates there is at least one output forced</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S17</Address>
        <Index>17</Index>
        <Symbol>SB_LASTBIT</Symbol>
        <Comment>It indicates the value of the last ejected bit</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S18</Address>
        <Index>18</Index>
        <Symbol>SB_OPERROR</Symbol>
        <Comment>It indicates an overflow when a 16 bit operation is performed</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S19</Address>
        <Index>19</Index>
        <Symbol>SB_OVERRUN</Symbol>
        <Comment>It indicates scan time greater than the period defined by the user</Comment>
      </MemoryBit>
      <MemoryBit>
        <Address>%S20</Address>
        <Index>20</Index>
        <Symbol>SB_INDERROR</Symbol>
        <Comment>This bit indicates an index overflow of the indexed object address when a 16 bit operation is performed</Comment>
      </MemoryBit>
    </SystemBits>`;
}

/**
 * Generate System Words XML
 */
function generateSystemWordsXml(): string {
  return `    <SystemWords>
      <MemoryWord>
        <Address>%SW0</Address>
        <Index>0</Index>
        <Symbol>SW_MASTERTASK</Symbol>
        <Comment>Modifies controller scan period defined at configuration through the user program in the Animation Table Editor</Comment>
      </MemoryWord>
      <MemoryWord>
        <Address>%SW6</Address>
        <Index>6</Index>
        <Symbol>SW_CONTROLSTATUS</Symbol>
        <Comment>Controller Status: NO CONFIG (0), STOP (2), RUN (3), HALT (4), POWERLESS MODE (5)</Comment>
      </MemoryWord>
    </SystemWords>`;
}

/**
 * Generate Message Blocks XML
 */
function generateMessageBlocksXml(): string {
  return `    <MessageBlocks>
      <MessageBlock>
        <Address>%MSG1</Address>
        <Index>0</Index>
        <OutputPort>Serial1</OutputPort>
      </MessageBlock>
      <MessageBlock>
        <Address>%MSG3</Address>
        <Index>2</Index>
        <OutputPort>Ethernet</OutputPort>
      </MessageBlock>
    </MessageBlocks>`;
}

/**
 * Generate Analog Inputs XML for CPU
 */
function generateAnalogInputsXml(plcModel: string): string {
  // Only 40-point models have built-in analog inputs
  if (!plcModel.includes('40')) {
    return `        <AnalogInputs />`;
  }

  return `        <AnalogInputs>
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
        </AnalogInputs>`;
}

/**
 * Generate High Speed Counters XML
 */
function generateHighSpeedCountersXml(plcModel: string): string {
  const hscCount = 4; // TM221 has 4 HSC
  let result = `        <HighSpeedCounters>\n`;

  for (let i = 0; i < hscCount; i++) {
    result += `          <HighSpeedCounter>
            <Address>%HSC${i}</Address>
            <Index>${i}</Index>
            <Preset>0</Preset>
            <DedicatedInputs>
              <DedicatedInput>
                <Index>0</Index>
              </DedicatedInput>
              <DedicatedInput>
                <Index>1</Index>
              </DedicatedInput>
              <DedicatedInput>
                <Index>2</Index>
              </DedicatedInput>
              <DedicatedInput>
                <Index>3</Index>
              </DedicatedInput>
            </DedicatedInputs>
            <ReflexOutputs>
              <ReflexOutput>
                <Index>0</Index>
                <Activated>false</Activated>
                <LessThanS0>false</LessThanS0>
                <GreaterOrEqualThanS0>false</GreaterOrEqualThanS0>
                <GreaterOrEqualThanS1>false</GreaterOrEqualThanS1>
              </ReflexOutput>
              <ReflexOutput>
                <Index>1</Index>
                <Activated>false</Activated>
                <LessThanS0>false</LessThanS0>
                <GreaterOrEqualThanS0>false</GreaterOrEqualThanS0>
                <GreaterOrEqualThanS1>false</GreaterOrEqualThanS1>
              </ReflexOutput>
            </ReflexOutputs>
            <Thresholds>
              <Threshold>
                <Index>0</Index>
                <ThresholdType>NotUsed</ThresholdType>
                <Priority>7</Priority>
                <SubroutineNumber />
              </Threshold>
              <Threshold>
                <Index>1</Index>
                <ThresholdType>NotUsed</ThresholdType>
                <Priority>7</Priority>
                <SubroutineNumber />
              </Threshold>
            </Thresholds>
            <TimeWindow>OneSecond</TimeWindow>
          </HighSpeedCounter>\n`;
  }

  result += `        </HighSpeedCounters>`;
  return result;
}

/**
 * Generate Pulse Train Outputs XML
 */
function generatePulseTrainOutputsXml(plcModel: string): string {
  return `        <PulseTrainOutputs>
          <PulseTrainOutput>
            <Address>%PLS0/%PWM0/%PTO0/%FREQGEN0</Address>
            <Index>0</Index>
            <PtoObject>
              <RefInput>NotUsed</RefInput>
              <ZPhaseInput>NotUsed</ZPhaseInput>
              <ProbeInput>NotUsed</ProbeInput>
            </PtoObject>
            <GlobalIndex>0</GlobalIndex>
            <Preset>1</Preset>
          </PulseTrainOutput>
          <PulseTrainOutput>
            <Address>%PLS1/%PWM1/%PTO1/%FREQGEN1</Address>
            <Index>1</Index>
            <PtoObject>
              <RefInput>NotUsed</RefInput>
              <ZPhaseInput>NotUsed</ZPhaseInput>
              <ProbeInput>NotUsed</ProbeInput>
            </PtoObject>
            <GlobalIndex>1</GlobalIndex>
            <Preset>1</Preset>
          </PulseTrainOutput>
        </PulseTrainOutputs>`;
}

/**
 * Generate Ethernet Configuration XML
 */
function generateEthernetConfigurationXml(plcModel: string): string {
  // Only CE models have Ethernet
  if (!plcModel.includes('CE')) {
    return '';
  }

  return `        <EthernetConfiguration>
          <NetworkName>M221</NetworkName>
          <IpAllocationMode>ByDhcp</IpAllocationMode>
          <IpAddress>192.168.1.10</IpAddress>
          <SubnetMask>255.255.255.0</SubnetMask>
          <GatewayAddress>192.168.1.1</GatewayAddress>
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
          <ProgrammingProtocolEnabled>true</ProgrammingProtocolEnabled>
          <EthernetIpAdapterEnabled>false</EthernetIpAdapterEnabled>
          <ModbusServerEnabled>true</ModbusServerEnabled>
          <AutoDiscoveryProtocolEnabled>true</AutoDiscoveryProtocolEnabled>
        </EthernetConfiguration>`;
}

/**
 * Generate Serial Line Configuration XML
 */
function generateSerialLineConfigurationXml(): string {
  return `      <SerialLineConfiguration>
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
        <Polarization>
          <Value>0</Value>
          <Name>No</Name>
        </Polarization>
      </SerialLineConfiguration>`;
}

/**
 * Generate Serial Line IO Scanner Configuration XML
 */
function generateSerialLineIoScannerConfigurationXml(): string {
  return `      <SerialLineIoScannerConfiguration>
        <TransmissionMode>TransmissionModeRtu</TransmissionMode>
        <Devices />
        <DigitalInputsIoScanner />
        <DigitalOutputsIoScanner />
        <RegisterInputsIoScanner />
        <RegisterOutputsIoScanner />
        <RegisterDeviceStatusIoScanner />
        <RegisterInputsStatusIoScanner />
        <Drives />
      </SerialLineIoScannerConfiguration>`;
}

/**
 * Generate XML for a single rung
 */
export function generateRungXml(rung: RungConfig): string {
  const elementsXml = rung.elements.map(el => generateLadderElementXml(el)).join('\n');
  const ilXml = rung.ilCode.map(il => `              <InstructionLineEntity>
                <InstructionLine>${escapeXml(il)}</InstructionLine>
                <Comment />
              </InstructionLineEntity>`).join('\n');

  return `          <RungEntity>
            <LadderElements>
${elementsXml}
            </LadderElements>
            <InstructionLines>
${ilXml}
            </InstructionLines>
            <Name>${escapeXml(rung.name)}</Name>
            <MainComment>${escapeXml(rung.comment)}</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

/**
 * Generate XML for a single ladder element
 */
function generateLadderElementXml(element: LadderElement): string {
  const connections = element.connections.join(', ');

  // Handle CompareBlock (comparison blocks)
  // IMPORTANT: Uses 'Descriptor' field with expression like [%IW1.0>2000]
  if (element.type === 'CompareBlock' && element.comparisonExpression) {
    return `              <LadderEntity>
                <ElementType>CompareBlock</ElementType>
                <Descriptor>${escapeXml(element.comparisonExpression)}</Descriptor>
                <Comment />
                <Symbol />
                <Row>${element.row}</Row>
                <Column>${element.column}</Column>
                <ChosenConnection>${connections}</ChosenConnection>
              </LadderEntity>`;
  }

  // Handle OperateBlock (operation blocks)
  // WARNING: OperateBlock requires matching IL code - use with caution
  if (element.type === 'OperateBlock' && element.operationExpression) {
    return `              <LadderEntity>
                <ElementType>OperateBlock</ElementType>
                <Descriptor>${escapeXml(element.operationExpression)}</Descriptor>
                <Comment />
                <Symbol />
                <Row>${element.row}</Row>
                <Column>${element.column}</Column>
                <ChosenConnection>${connections}</ChosenConnection>
              </LadderEntity>`;
  }

  // Handle Timer blocks
  if (element.type === 'TimerTM') {
    return `              <LadderEntity>
                <ElementType>TimerTM</ElementType>
                <Descriptor>${escapeXml(element.descriptor || '')}</Descriptor>
                <Comment />
                <Symbol>${escapeXml(element.symbol || '')}</Symbol>
                <Row>${element.row}</Row>
                <Column>${element.column}</Column>
                <ChosenConnection>${connections}</ChosenConnection>
              </LadderEntity>`;
  }

  // Handle Counter blocks
  if (element.type === 'CounterCT') {
    return `              <LadderEntity>
                <ElementType>CounterCT</ElementType>
                <Descriptor>${escapeXml(element.descriptor || '')}</Descriptor>
                <Comment />
                <Symbol>${escapeXml(element.symbol || '')}</Symbol>
                <Row>${element.row}</Row>
                <Column>${element.column}</Column>
                <ChosenConnection>${connections}</ChosenConnection>
              </LadderEntity>`;
  }

  // Handle Line elements
  if (element.type === 'Line') {
    return `              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>${element.row}</Row>
                <Column>${element.column}</Column>
                <ChosenConnection>${connections}</ChosenConnection>
              </LadderEntity>`;
  }

  // Handle standard contacts and coils
  return `              <LadderEntity>
                <ElementType>${element.type}</ElementType>
                <Descriptor>${escapeXml(element.descriptor || '')}</Descriptor>
                <Comment />
                <Symbol>${escapeXml(element.symbol || '')}</Symbol>
                <Row>${element.row}</Row>
                <Column>${element.column}</Column>
                <ChosenConnection>${connections}</ChosenConnection>
              </LadderEntity>`;
}

/**
 * Generate a simple linear rung (contact -> lines -> coil)
 */
export function createSimpleRung(
  name: string,
  comment: string,
  contactAddress: string,
  contactSymbol: string,
  coilAddress: string,
  coilSymbol: string,
  negated: boolean = false
): RungConfig {
  const elements: LadderElement[] = [
    {
      type: negated ? 'NegatedContact' : 'NormalContact',
      descriptor: contactAddress,
      symbol: contactSymbol,
      row: 0,
      column: 0,
      connections: ['Left', 'Right']
    }
  ];

  // Add line elements from column 1 to 9
  for (let col = 1; col <= 9; col++) {
    elements.push({
      type: 'Line',
      row: 0,
      column: col,
      connections: ['Left', 'Right']
    });
  }

  // Add coil at column 10
  elements.push({
    type: 'Coil',
    descriptor: coilAddress,
    symbol: coilSymbol,
    row: 0,
    column: 10,
    connections: ['Left']
  });

  const ilCode = negated
    ? [`LDN   ${contactAddress}`, `ST    ${coilAddress}`]
    : [`LD    ${contactAddress}`, `ST    ${coilAddress}`];

  return { name, comment, elements, ilCode };
}

/**
 * Create a rung with a CompareBlock
 * Uses correct format discovered from working .smbp files
 * Expression format: [%IW1.0>2000] - brackets included
 */
export function createComparisonRung(
  name: string,
  comment: string,
  expression: string,
  coilAddress: string,
  coilSymbol: string
): RungConfig {
  // Ensure expression has brackets
  const bracketedExpr = expression.startsWith('[') ? expression : `[${expression}]`;

  const elements: LadderElement[] = [
    {
      type: 'CompareBlock',
      comparisonExpression: bracketedExpr,
      row: 0,
      column: 0,
      connections: ['Left', 'Right']
    }
  ];

  // Add line elements from column 1 to 9 (CompareBlock does NOT span 2 columns in working files)
  for (let col = 1; col <= 9; col++) {
    elements.push({
      type: 'Line',
      row: 0,
      column: col,
      connections: ['Left', 'Right']
    });
  }

  // Add coil at column 10
  elements.push({
    type: 'Coil',
    descriptor: coilAddress,
    symbol: coilSymbol,
    row: 0,
    column: 10,
    connections: ['Left']
  });

  // IL uses brackets directly (no extra spaces)
  const ilCode = [
    `LD    ${bracketedExpr}`,
    `ST    ${coilAddress}`
  ];

  return { name, comment, elements, ilCode };
}

/**
 * Create a rung with OR branch (2 parallel contacts)
 */
export function createOrBranchRung(
  name: string,
  comment: string,
  contact1Address: string,
  contact1Symbol: string,
  contact2Address: string,
  contact2Symbol: string,
  coilAddress: string,
  coilSymbol: string
): RungConfig {
  const elements: LadderElement[] = [
    // Row 0: First contact with Down connection
    {
      type: 'NormalContact',
      descriptor: contact1Address,
      symbol: contact1Symbol,
      row: 0,
      column: 0,
      connections: ['Down', 'Left', 'Right']
    }
  ];

  // Add lines for row 0
  for (let col = 1; col <= 9; col++) {
    elements.push({
      type: 'Line',
      row: 0,
      column: col,
      connections: ['Left', 'Right']
    });
  }

  // Add coil
  elements.push({
    type: 'Coil',
    descriptor: coilAddress,
    symbol: coilSymbol,
    row: 0,
    column: 10,
    connections: ['Left']
  });

  // Row 1: Second contact with Up connection
  elements.push({
    type: 'NormalContact',
    descriptor: contact2Address,
    symbol: contact2Symbol,
    row: 1,
    column: 0,
    connections: ['Up', 'Left']
  });

  const ilCode = [
    `LD    ${contact1Address}`,
    `OR    ${contact2Address}`,
    `ST    ${coilAddress}`
  ];

  return { name, comment, elements, ilCode };
}

/**
 * Generate digital inputs XML based on PLC model
 */
function generateDigitalInputsXml(inputs: IOConfig[], plcModel: string): string {
  const maxInputs = getMaxInputs(plcModel);
  const result: string[] = [];

  for (let i = 0; i < maxInputs; i++) {
    const input = inputs.find(inp => inp.address === `%I0.${i}`);
    const symbol = input?.symbol || '';
    const symbolXml = symbol ? `\n            <Symbol>${escapeXml(symbol)}</Symbol>` : '';

    result.push(`          <DiscretInput>
            <Address>%I0.${i}</Address>
            <Index>${i}</Index>${symbolXml}
            <DIFiltering>DIFilterings4ms</DIFiltering>
            <DILatch>DILatchNo</DILatch>
          </DiscretInput>`);
  }

  return result.join('\n');
}

/**
 * Generate digital outputs XML based on PLC model
 */
function generateDigitalOutputsXml(outputs: IOConfig[], plcModel: string): string {
  const maxOutputs = getMaxOutputs(plcModel);
  const result: string[] = [];

  for (let i = 0; i < maxOutputs; i++) {
    const output = outputs.find(out => out.address === `%Q0.${i}`);
    const symbol = output?.symbol || '';
    const symbolXml = symbol ? `\n            <Symbol>${escapeXml(symbol)}</Symbol>` : '';

    result.push(`          <DiscretOutput>
            <Address>%Q0.${i}</Address>
            <Index>${i}</Index>${symbolXml}
          </DiscretOutput>`);
  }

  return result.join('\n');
}

/**
 * Generate memory bit XML
 */
function generateMemoryBitXml(mb: MemoryBitConfig, index: number): string {
  return `      <MemoryBit>
        <Address>${escapeXml(mb.address)}</Address>
        <Index>${index}</Index>
        <Symbol>${escapeXml(mb.symbol)}</Symbol>
        <Comment>${escapeXml(mb.comment || '')}</Comment>
      </MemoryBit>`;
}

/**
 * Generate memory word XML for HMI tags
 */
function generateMemoryWordXml(mw: MemoryWordConfig, index: number): string {
  // Extract the word number from address (e.g., %MW10 -> 10)
  const addrMatch = mw.address.match(/%MW(\d+)/i);
  const wordIndex = addrMatch ? parseInt(addrMatch[1]) : index;

  return `      <MemoryWord>
        <Address>${escapeXml(mw.address)}</Address>
        <Index>${wordIndex}</Index>
        <Symbol>${escapeXml(mw.symbol)}</Symbol>
        <Comment>${escapeXml(mw.comment || '')}</Comment>
      </MemoryWord>`;
}

/**
 * Generate timer XML with correct structure
 */
function generateTimerXml(timer: TimerConfig, index: number): string {
  return `      <TimerTM>
        <Address>${escapeXml(timer.address)}</Address>
        <Index>${index}</Index>
        <Symbol>${escapeXml(timer.symbol)}</Symbol>
        <Comment>${escapeXml(timer.comment)}</Comment>
        <Mode>TON</Mode>
        <Base>${timer.timeBase}</Base>
        <Preset>${timer.preset}</Preset>
      </TimerTM>`;
}

/**
 * Generate counter XML with correct structure
 */
function generateCounterXml(counter: CounterConfig, index: number): string {
  return `      <CounterCT>
        <Address>${escapeXml(counter.address)}</Address>
        <Index>${index}</Index>
        <Symbol>${escapeXml(counter.symbol)}</Symbol>
        <Comment>${escapeXml(counter.comment)}</Comment>
        <Preset>${counter.preset}</Preset>
      </CounterCT>`;
}

/**
 * Generate TM3 expansion module XML
 */
function generateExpansionXml(expansion: TM3ExpansionConfig, index: number): string {
  const analogInputsXml = (expansion.analogInputs || []).map((ai, i) => {
    const typeValue = ai.type === '4_20mA' ? 3 : ai.type === '0_20mA' ? 2 : ai.type === '0_10V' ? 0 : 31;
    const typeName = ai.type === '4_20mA' ? 'Type_4_20mA' : ai.type === '0_20mA' ? 'Type_0_20mA' : ai.type === '0_10V' ? 'Type_0_10V' : 'Type_NotUsed';
    const scopeValue = ai.type === 'NotUsed' ? 128 : 32;
    const scopeName = ai.type === 'NotUsed' ? 'Scope_NotUsed' : 'Scope_Customized';

    return `            <AnalogIO>
              <Address>%IW${index + 1}.${i}</Address>
              <Index>${i}</Index>
              <Symbol>${escapeXml(ai.symbol)}</Symbol>
              <Type>
                <Value>${typeValue}</Value>
                <Name>${typeName}</Name>
              </Type>
              <Scope>
                <Value>${scopeValue}</Value>
                <Name>${scopeName}</Name>
              </Scope>
              <Sampling>
                <Value>0</Value>
                <Name>Sampling_0_1ms</Name>
              </Sampling>
              <Minimum>${ai.minimum || 0}</Minimum>
              <Maximum>${ai.maximum || 10000}</Maximum>
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
            </AnalogIO>`;
  }).join('\n');

  return `        <ModuleExtensionObject>
          <Index>${index}</Index>
          <InputNb>0</InputNb>
          <OutputNb>0</OutputNb>
          <Kind>0</Kind>
          <Reference>${escapeXml(expansion.reference)}</Reference>
          <Consumption5V>40</Consumption5V>
          <Consumption24V>0</Consumption24V>
          <TechnicalConfiguration>
            <PtoConfiguration>
              <McPowerPtoMax>0</McPowerPtoMax>
            </PtoConfiguration>
            <ComConfiguration>
              <ReadVarBasicMax>0</ReadVarBasicMax>
            </ComConfiguration>
          </TechnicalConfiguration>
          <DigitalInputs />
          <DigitalOutputs />
          <AnalogInputs>
${analogInputsXml}
          </AnalogInputs>
          <AnalogInputsStatus />
          <AnalogOutputs />
          <AnalogOutputsStatus />
          <HighSpeedCounters />
          <PulseTrainOutputs />
          <HardwareId>193</HardwareId>
          <IsExpander>false</IsExpander>
          <IsOptionnal>false</IsOptionnal>
          <DIOFunctionalMode>DIOFunctionalModeNormal</DIOFunctionalMode>
          <HoldupTime>10</HoldupTime>
        </ModuleExtensionObject>`;
}

/**
 * Get max digital inputs for a PLC model
 */
function getMaxInputs(plcModel: string): number {
  if (plcModel.includes('16')) return 9;
  if (plcModel.includes('24')) return 14;
  if (plcModel.includes('40')) return 24;
  return 14;
}

/**
 * Get max digital outputs for a PLC model
 */
function getMaxOutputs(plcModel: string): number {
  if (plcModel.includes('16')) return 7;
  if (plcModel.includes('24')) return 10;
  if (plcModel.includes('40')) return 16;
  return 10;
}

/**
 * Get hardware ID for a PLC model
 */
function getHardwareId(plcModel: string): number {
  // Hardware IDs from actual .smbp files
  if (plcModel === 'TM221CE24T') return 1933;
  if (plcModel === 'TM221CE24R') return 1929;
  if (plcModel === 'TM221CE16T') return 1925;
  if (plcModel === 'TM221CE40T') return 1941;
  return 1933; // Default
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a rung with CompareBlock and multiple series contacts
 */
export function createCompareWithContactsRung(
  name: string,
  comment: string,
  compareExpression: string,
  contacts: Array<{ address: string; symbol: string; negated: boolean }>,
  coilAddress: string,
  coilSymbol: string
): RungConfig {
  const bracketedExpr = compareExpression.startsWith('[') ? compareExpression : `[${compareExpression}]`;

  const elements: LadderElement[] = [
    {
      type: 'CompareBlock',
      comparisonExpression: bracketedExpr,
      row: 0,
      column: 0,
      connections: ['Left', 'Right']
    }
  ];

  // Add contacts after compare block
  let col = 1;
  for (const contact of contacts) {
    elements.push({
      type: contact.negated ? 'NegatedContact' : 'NormalContact',
      descriptor: contact.address,
      symbol: contact.symbol,
      row: 0,
      column: col,
      connections: ['Left', 'Right']
    });
    col++;
  }

  // Fill with lines until column 9
  while (col <= 9) {
    elements.push({
      type: 'Line',
      row: 0,
      column: col,
      connections: ['Left', 'Right']
    });
    col++;
  }

  // Add coil at column 10
  elements.push({
    type: 'Coil',
    descriptor: coilAddress,
    symbol: coilSymbol,
    row: 0,
    column: 10,
    connections: ['Left']
  });

  // Build IL code
  const ilCode = [`LD    ${bracketedExpr}`];
  for (const contact of contacts) {
    if (contact.negated) {
      ilCode.push(`ANDN  ${contact.address}`);
    } else {
      ilCode.push(`AND   ${contact.address}`);
    }
  }
  ilCode.push(`ST    ${coilAddress}`);

  return { name, comment, elements, ilCode };
}

/**
 * Export helper for creating ultrasonic tank level control program
 * Parameters:
 * - sensorRange: Total sensor range in mm (e.g., 5000)
 * - tankHeight: Tank height in mm (e.g., 2000)
 * - lowLevelThreshold: Level in mm from bottom to trigger pump start (e.g., 1000)
 * - highLevelDistance: Distance from sensor in mm to stop pump (e.g., 500)
 */
export function createUltrasonicTankLevelProgram(
  projectName: string,
  plcModel: string,
  sensorRange: number = 5000,
  tankHeight: number = 2000,
  lowLevelThreshold: number = 1000,
  highLevelDistance: number = 500
): ProgramConfig {
  // Calculate raw values
  // Raw value = Distance × (10000 / sensorRange)
  const scaleFactor = 10000 / sensorRange;
  const lowLevelDistanceFromSensor = tankHeight - lowLevelThreshold;
  const lowLevelRaw = Math.round(lowLevelDistanceFromSensor * scaleFactor);
  const highLevelRaw = Math.round(highLevelDistance * scaleFactor);

  return {
    projectName,
    plcModel,
    inputs: [
      { address: '%I0.0', symbol: 'PB_RESET', comment: 'Manual reset button' },
      { address: '%I0.1', symbol: 'ESTOP', comment: 'Emergency stop (NC)' },
    ],
    outputs: [
      { address: '%Q0.0', symbol: 'PUMP_CONTACTOR', comment: 'Pump motor contactor' },
      { address: '%Q0.1', symbol: 'LT_RUN', comment: 'Run indicator light' },
      { address: '%Q0.2', symbol: 'LT_LOW_LEVEL', comment: 'Low level warning light' },
    ],
    memoryBits: [
      { address: '%M0', symbol: 'PUMP_RUN', comment: 'Pump running latch with hysteresis' },
      { address: '%M1', symbol: 'LEVEL_LOW', comment: `Tank level below ${lowLevelThreshold}mm from bottom` },
      { address: '%M2', symbol: 'LEVEL_HIGH', comment: `Tank level at ${tankHeight - highLevelDistance}mm (${highLevelDistance}mm from sensor) - pump stop point` },
    ],
    memoryWords: [
      { address: '%MW0', symbol: 'LEVEL_RAW', comment: 'HMI Tag: Raw analog value from ultrasonic sensor (0-10000). Read %IW1.0 via Modbus.' },
      { address: '%MW1', symbol: 'LEVEL_DISTANCE_MM', comment: `HMI Tag: Distance from sensor in mm. Calculate: %IW1.0 / ${scaleFactor}` },
      { address: '%MW2', symbol: 'LEVEL_ACTUAL_MM', comment: `HMI Tag: Actual level from tank bottom in mm. Calculate: ${tankHeight} - (%IW1.0 / ${scaleFactor})` },
    ],
    expansions: [
      {
        reference: 'TM3AI4',
        analogInputs: [
          { address: '%IW1.0', symbol: 'ULTRASONIC_AIN', type: '4_20mA', minimum: 0, maximum: 10000 },
        ],
      },
    ],
    rungs: [
      // Rung 1: Low level detection
      createComparisonRung(
        'Low Level Detection',
        `Ultrasonic: ${sensorRange}mm range = 10000 raw. Raw > ${lowLevelRaw} means distance > ${lowLevelDistanceFromSensor}mm, level < ${lowLevelThreshold}mm.`,
        `[%IW1.0>${lowLevelRaw}]`,
        '%M1',
        'LEVEL_LOW'
      ),
      // Rung 2: High level detection (pump stop point)
      createComparisonRung(
        'High Level Detection',
        `Pump stop: ${highLevelDistance}mm from sensor. Raw < ${highLevelRaw} means level = ${tankHeight - highLevelDistance}mm from bottom.`,
        `[%IW1.0<${highLevelRaw}]`,
        '%M2',
        'LEVEL_HIGH'
      ),
      // Rung 3: Pump hysteresis control
      {
        name: 'Pump Hysteresis Control',
        comment: `Latches ON at level < ${lowLevelThreshold}mm, stays ON until level > ${tankHeight - highLevelDistance}mm. E-Stop stops pump.`,
        elements: [
          { type: 'NormalContact', descriptor: '%M1', symbol: 'LEVEL_LOW', row: 0, column: 0, connections: ['Down', 'Left', 'Right'] },
          { type: 'NegatedContact', descriptor: '%M2', symbol: 'LEVEL_HIGH', row: 0, column: 1, connections: ['Left', 'Right'] },
          { type: 'NegatedContact', descriptor: '%I0.1', symbol: 'ESTOP', row: 0, column: 2, connections: ['Left', 'Right'] },
          { type: 'Line', row: 0, column: 3, connections: ['Left', 'Right'] },
          { type: 'Line', row: 0, column: 4, connections: ['Left', 'Right'] },
          { type: 'Line', row: 0, column: 5, connections: ['Left', 'Right'] },
          { type: 'Line', row: 0, column: 6, connections: ['Left', 'Right'] },
          { type: 'Line', row: 0, column: 7, connections: ['Left', 'Right'] },
          { type: 'Line', row: 0, column: 8, connections: ['Left', 'Right'] },
          { type: 'Line', row: 0, column: 9, connections: ['Left', 'Right'] },
          { type: 'Coil', descriptor: '%M0', symbol: 'PUMP_RUN', row: 0, column: 10, connections: ['Left'] },
          { type: 'NormalContact', descriptor: '%M0', symbol: 'PUMP_RUN', row: 1, column: 0, connections: ['Up', 'Left'] },
        ],
        ilCode: [
          'LD    %M1',
          'OR    %M0',
          'ANDN  %M2',
          'ANDN  %I0.1',
          'ST    %M0',
        ],
      },
      // Rung 4: Pump output
      createSimpleRung('Pump Contactor Output', 'Drive pump motor contactor from PUMP_RUN latch', '%M0', 'PUMP_RUN', '%Q0.0', 'PUMP_CONTACTOR'),
      // Rung 5: Run light
      createSimpleRung('Run Indicator Light', 'Run light ON when pump is running', '%M0', 'PUMP_RUN', '%Q0.1', 'LT_RUN'),
      // Rung 6: Low level warning
      createSimpleRung('Low Level Warning Light', `Light ON when tank level is below ${lowLevelThreshold}mm`, '%M1', 'LEVEL_LOW', '%Q0.2', 'LT_LOW_LEVEL'),
    ],
  };
}

/**
 * Export helper for creating motor start/stop template
 */
export function createMotorStartStopProgram(
  projectName: string,
  plcModel: string
): ProgramConfig {
  return {
    projectName,
    plcModel,
    inputs: [
      { address: '%I0.0', symbol: 'PB_START', comment: 'Start Button' },
      { address: '%I0.1', symbol: 'PB_STOP', comment: 'Stop Button NC' },
      { address: '%I0.2', symbol: 'ESTOP', comment: 'Emergency Stop NC' },
      { address: '%I0.3', symbol: 'OL_TRIP', comment: 'Overload Trip NC' },
    ],
    outputs: [
      { address: '%Q0.0', symbol: 'MTR_OUT', comment: 'Motor Contactor' },
      { address: '%Q0.1', symbol: 'LT_RUN', comment: 'Run Indicator' },
    ],
    memoryBits: [
      { address: '%M0', symbol: 'MTR_RUN', comment: 'Motor Running Latch' },
    ],
    rungs: [
      createOrBranchRung(
        'Motor Start Stop',
        'Start/Stop with seal-in and safety interlocks',
        '%I0.0', 'PB_START',
        '%M0', 'MTR_RUN',
        '%M0', 'MTR_RUN'
      ),
      createSimpleRung(
        'Motor Output',
        'Motor contactor output',
        '%M0', 'MTR_RUN',
        '%Q0.0', 'MTR_OUT'
      ),
      createSimpleRung(
        'Run Light',
        'Run indicator light',
        '%M0', 'MTR_RUN',
        '%Q0.1', 'LT_RUN'
      ),
    ],
  };
}
