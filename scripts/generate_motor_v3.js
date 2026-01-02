/**
 * Motor Start/Stop with Overload Alarm - TM221CE16T
 * PLCAutoPilot v3.2 - Using Template and Skill File Patterns
 *
 * Based on working generator: generate_tank_level_complete.js
 * Using template: "Template for configuration of cards.smbp"
 *
 * Controller: TM221CE16T (9 DI / 7 DO)
 * No expansion modules or cartridges needed
 *
 * I/O Mapping:
 * - %I0.0: EMERGENCY_STOP (NC - system stops when opened)
 * - %I0.1: START_PB (NO - momentary push to start)
 * - %I0.2: STOP_PB (NC - opens to stop motor)
 * - %I0.3: OVERLOAD_RELAY (NC - from thermal overload relay)
 * - %I0.4: ALARM_RESET_PB (NO - clears latched alarms)
 *
 * - %Q0.0: MOTOR_CONTACTOR (main contactor coil)
 * - %Q0.1: MOTOR_RUN_LAMP (green - motor running)
 * - %Q0.2: OVERLOAD_LAMP (red - overload alarm)
 * - %Q0.3: READY_LAMP (white - system ready)
 *
 * Memory Bits:
 * - %M0: SYSTEM_READY
 * - %M1: MOTOR_RUNNING
 * - %M2: OVERLOAD_ALARM (latched)
 * - %M3: ANY_ALARM
 *
 * Timers:
 * - %TM0: 3 second startup delay
 * - %TM1: 500ms overload debounce
 */

const fs = require('fs');

const PROJECT_NAME = 'Motor_StartStop_Overload_TM221CE16T';
const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Motor_StartStop_Overload_v2_TM221CE16T.smbp';

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

// Motor Control Rungs - following skill v3.2 patterns
const MOTOR_CONTROL_RUNGS = `
          <!-- Rung 3: Motor Start/Stop with Seal-in (Fail-safe design) -->
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
                <Comment>Stop Button NC</Comment>
                <Symbol>STOP_PB</Symbol>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.3</Descriptor>
                <Comment>Overload OK</Comment>
                <Symbol>OVERLOAD_RELAY</Symbol>
                <Row>0</Row>
                <Column>3</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>No Alarm</Comment>
                <Symbol>OVERLOAD_ALARM</Symbol>
                <Row>0</Row>
                <Column>4</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(5, 9, 0)}
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
                <Comment>Seal-in</Comment>
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
                <Comment>Seal-in</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   %M0</InstructionLine>
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.2</InstructionLine>
                <Comment>Stop Button NC</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.3</InstructionLine>
                <Comment>Overload OK</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M2</InstructionLine>
                <Comment>No Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment>Motor Running</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Motor_Control</Name>
            <MainComment>Motor start/stop with seal-in, fail-safe NC contacts for stop/overload</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 4: Motor Contactor Output -->
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
              </LadderEntity>${generateLines(1, 9, 0)}
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
            <Name>Contactor</Name>
            <MainComment>Drive motor contactor from running status bit</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 5: Overload Detection with 500ms Debounce Timer -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.3</Descriptor>
                <Comment>Overload Tripped</Comment>
                <Symbol>OVERLOAD_RELAY</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 7, 0)}
              <LadderEntity>
                <ElementType>Timer</ElementType>
                <Descriptor>%TM1</Descriptor>
                <Comment>500ms Debounce</Comment>
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
                <Comment>Overload Debounce Timer</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.3</InstructionLine>
                <Comment>Overload Relay Tripped</Comment>
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
            <Name>OL_Debounce</Name>
            <MainComment>500ms debounce for overload relay to filter noise</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 6: Overload Alarm Latch -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%TM1.Q</Descriptor>
                <Comment>Debounce Done</Comment>
                <Symbol>OL_DEBOUNCE_DONE</Symbol>
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
              </LadderEntity>${generateLines(2, 9, 0)}
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
                <Comment>Seal-in</Comment>
                <Symbol>OVERLOAD_ALARM</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %TM1.Q</InstructionLine>
                <Comment>Debounce Timer Done</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %M2</InstructionLine>
                <Comment>Seal-in Alarm</Comment>
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
            <Name>OL_Alarm</Name>
            <MainComment>Latched overload alarm - requires manual reset after fault cleared</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 7: Any Alarm Consolidation -->
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
              </LadderEntity>${generateLines(1, 9, 0)}
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
            <MainComment>Consolidate all alarms into single bit for HMI</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 8: Motor Run Lamp -->
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
              </LadderEntity>${generateLines(1, 9, 0)}
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
                <Comment>Motor Running</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.1</InstructionLine>
                <Comment>Run Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Run_Lamp</Name>
            <MainComment>Green lamp indicates motor is running</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 9: Overload Alarm Lamp -->
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
              </LadderEntity>${generateLines(1, 9, 0)}
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
                <Comment>Overload Alarm</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.2</InstructionLine>
                <Comment>Alarm Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Alarm_Lamp</Name>
            <MainComment>Red lamp indicates overload alarm active</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung 10: System Ready Lamp -->
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
              </LadderEntity>${generateLines(1, 9, 0)}
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
                <Comment>System Ready</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.3</InstructionLine>
                <Comment>Ready Lamp</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Ready_Lamp</Name>
            <MainComment>White lamp indicates system ready for operation</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;

// Additional Memory Bits for motor control
const MOTOR_MEMORY_BITS = `
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
      </MemoryBit>`;

// Timer declarations - CORRECT FORMAT: TimerTM with Base (not Timer with TimeBase)
const MOTOR_TIMERS = `    <Timers>
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
    console.log('Motor Start/Stop with Overload Alarm - TM221CE16T');
    console.log('Using template and skill file patterns (v3.2)');
    console.log('');

    console.log('Reading template file...');
    let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    console.log('Modifying project name...');
    content = content.replace(/Template for configuration of cards/g, PROJECT_NAME);
    content = content.replace(/<Name>New POU<\/Name>/g, '<Name>Motor Control</Name>');

    console.log('Changing controller to TM221CE16T...');
    content = content.replace(/<Reference>TM221CE40T<\/Reference>/g, '<Reference>TM221CE16T</Reference>');
    content = content.replace(/<HardwareId>1920<\/HardwareId>/, '<HardwareId>1933</HardwareId>');

    console.log('Adding motor control rungs...');
    content = content.replace(
        /<\/Rungs>\s*<\/ProgramOrganizationUnits>/,
        MOTOR_CONTROL_RUNGS + '\n        </Rungs>\n      </ProgramOrganizationUnits>'
    );

    console.log('Adding memory bits...');
    content = content.replace(
        /<Symbol>SYSTEM_READY<\/Symbol>\s*<\/MemoryBit>\s*<\/MemoryBits>/,
        '<Symbol>SYSTEM_READY</Symbol>\n      </MemoryBit>' + MOTOR_MEMORY_BITS + '\n    </MemoryBits>'
    );

    console.log('Updating timer declarations...');
    content = content.replace(/<Timers>[\s\S]*?<\/Timers>/, MOTOR_TIMERS);

    console.log('Clearing extension modules (TM221CE16T base unit only)...');
    content = content.replace(/<Extensions>[\s\S]*?<\/Extensions>/, '<Extensions />');

    console.log('Clearing cartridge configurations...');
    content = content.replace(/<Cartridge1>[\s\S]*?<\/Cartridge1>/, '<Cartridge1 />');
    content = content.replace(/<Cartridge2>[\s\S]*?<\/Cartridge2>/, '<Cartridge2 />');

    console.log('Writing output file...');
    fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

    console.log('');
    console.log('='.repeat(70));
    console.log('SUCCESS: Motor Start/Stop with Overload Alarm Program Generated');
    console.log('='.repeat(70));
    console.log('');
    console.log('Output: ' + OUTPUT_PATH);
    console.log('Controller: TM221CE16T (9 DI / 7 DO)');
    console.log('');
    console.log('--- I/O MAPPING ---');
    console.log('Inputs:');
    console.log('  %I0.0: EMERGENCY_STOP (NC - system stops when opened)');
    console.log('  %I0.1: START_PB (NO - momentary push to start)');
    console.log('  %I0.2: STOP_PB (NC - opens to stop motor)');
    console.log('  %I0.3: OVERLOAD_RELAY (NC - from thermal overload relay)');
    console.log('  %I0.4: ALARM_RESET_PB (NO - clears latched alarms)');
    console.log('');
    console.log('Outputs:');
    console.log('  %Q0.0: MOTOR_CONTACTOR (main contactor coil)');
    console.log('  %Q0.1: MOTOR_RUN_LAMP (green - motor running)');
    console.log('  %Q0.2: OVERLOAD_LAMP (red - overload alarm)');
    console.log('  %Q0.3: READY_LAMP (white - system ready)');
    console.log('');
    console.log('--- MEMORY BITS ---');
    console.log('  %M0: SYSTEM_READY (from template emergency rung)');
    console.log('  %M1: MOTOR_RUNNING');
    console.log('  %M2: OVERLOAD_ALARM (latched)');
    console.log('  %M3: ANY_ALARM');
    console.log('');
    console.log('--- TIMERS ---');
    console.log('  %TM0: 3 second startup delay (from template)');
    console.log('  %TM1: 500ms overload debounce');
    console.log('');
    console.log('--- PROGRAM RUNGS (10 total) ---');
    console.log('  1: Emergency Stop with Timer (from template)');
    console.log('  2: Cold/Warm Start Reset (from template)');
    console.log('  3: Motor Start/Stop with Seal-in');
    console.log('  4: Motor Contactor Output');
    console.log('  5: Overload Detection with 500ms Debounce');
    console.log('  6: Overload Alarm Latch (manual reset required)');
    console.log('  7: Any Alarm Consolidation');
    console.log('  8: Motor Run Lamp');
    console.log('  9: Overload Alarm Lamp');
    console.log(' 10: System Ready Lamp');
    console.log('');
    console.log('--- FAIL-SAFE DESIGN ---');
    console.log('- Emergency stop: NC contact - opens to stop');
    console.log('- Stop button: NC contact - opens to stop');
    console.log('- Overload relay: NC contact - opens on fault');
    console.log('- Wire breaks cause safe shutdown');
    console.log('');
    console.log('PLCAutoPilot v3.2 - Motor Start/Stop with Overload Alarm');

} catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
}
