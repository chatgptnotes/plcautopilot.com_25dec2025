/**
 * Motor Start/Stop with Overload Alarm - TM221CE16T
 * Full program - building on successful incremental test
 */

const fs = require('fs');

const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Motor_Full_TM221CE16T.smbp';

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

// All motor control rungs
const MOTOR_RUNGS = `
          <!-- Rung: Motor Start/Stop with Seal-in -->
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
                <Comment>Motor Run</Comment>
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
                <InstructionLine>ANDN  %I0.3</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Motor_Control</Name>
            <MainComment>Motor start/stop with seal-in</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung: Motor Contactor Output -->
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
                <Comment>Contactor</Comment>
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
            <Name>Contactor</Name>
            <MainComment>Motor contactor output</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung: Overload Alarm Latch -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%I0.3</Descriptor>
                <Comment>Overload Trip</Comment>
                <Symbol>OVERLOAD_RELAY</Symbol>
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
              </LadderEntity>${generateLines(2, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Alarm</Comment>
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
                <InstructionLine>LD    %I0.3</InstructionLine>
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
            <Name>OL_Alarm</Name>
            <MainComment>Overload alarm latch</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung: Motor Run Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Running</Comment>
                <Symbol>MOTOR_RUNNING</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment>Run Lamp</Comment>
                <Symbol>RUN_LAMP</Symbol>
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
            <MainComment>Green run lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung: Overload Alarm Lamp -->
          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Alarm</Comment>
                <Symbol>OVERLOAD_ALARM</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(1, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.2</Descriptor>
                <Comment>Alarm Lamp</Comment>
                <Symbol>ALARM_LAMP</Symbol>
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
            <MainComment>Red alarm lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>

          <!-- Rung: Ready Lamp -->
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
            <MainComment>White ready lamp</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;

// Memory bits to add
const MEMORY_BITS = `
      <MemoryBit>
        <Address>%M1</Address>
        <Index>1</Index>
        <Symbol>MOTOR_RUNNING</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M2</Address>
        <Index>2</Index>
        <Symbol>OVERLOAD_ALARM</Symbol>
      </MemoryBit>`;

try {
    console.log('Motor Start/Stop with Overload - TM221CE16T');
    console.log('Full Program Build');
    console.log('='.repeat(50));

    // Read template
    console.log('Reading template...');
    let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // Step 1: Project name
    console.log('1. Changing project name...');
    content = content.split('Template for configuration of cards').join('Motor_Full_TM221CE16T');

    // Step 2: Controller
    console.log('2. Changing controller to TM221CE16T...');
    content = content.split('TM221CE40T').join('TM221CE16T');

    // Step 3: Add motor rungs before </Rungs>
    console.log('3. Adding motor control rungs...');
    const rungsEnd = content.indexOf('</Rungs>');
    if (rungsEnd !== -1) {
        content = content.slice(0, rungsEnd) + MOTOR_RUNGS + '\n        ' + content.slice(rungsEnd);
    }

    // Step 4: Add memory bits after SYSTEM_READY
    console.log('4. Adding memory bits...');
    const memBitEnd = content.indexOf('</MemoryBit>\n    </MemoryBits>');
    if (memBitEnd !== -1) {
        content = content.slice(0, memBitEnd + 12) + MEMORY_BITS + content.slice(memBitEnd + 12);
    }

    // Step 5: Clear extensions (simple replacement)
    console.log('5. Clearing extension modules...');
    const extStart = content.indexOf('<Extensions>');
    const extEnd = content.indexOf('</Extensions>') + 13;
    if (extStart !== -1 && extEnd !== -1) {
        content = content.slice(0, extStart) + '<Extensions />' + content.slice(extEnd);
    }

    // Step 6: Clear cartridges
    console.log('6. Clearing cartridges...');
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
    console.log('7. Writing output file...');
    fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

    console.log('');
    console.log('='.repeat(50));
    console.log('SUCCESS: Motor Control Program Generated');
    console.log('='.repeat(50));
    console.log('');
    console.log('Output:', OUTPUT_PATH);
    console.log('Controller: TM221CE16T');
    console.log('');
    console.log('I/O MAPPING:');
    console.log('  %I0.0: EMERGENCY_STOP (NC) - from template');
    console.log('  %I0.1: START_PB (NO)');
    console.log('  %I0.2: STOP_PB (NC)');
    console.log('  %I0.3: OVERLOAD_RELAY (NC)');
    console.log('  %I0.4: ALARM_RESET_PB (NO)');
    console.log('');
    console.log('  %Q0.0: MOTOR_CONTACTOR');
    console.log('  %Q0.1: RUN_LAMP (green)');
    console.log('  %Q0.2: ALARM_LAMP (red)');
    console.log('  %Q0.3: READY_LAMP (white)');
    console.log('');
    console.log('PROGRAM (8 rungs):');
    console.log('  1-2: Emergency/Reset (from template)');
    console.log('  3: Motor Start/Stop with seal-in');
    console.log('  4: Motor Contactor Output');
    console.log('  5: Overload Alarm Latch');
    console.log('  6: Run Lamp');
    console.log('  7: Alarm Lamp');
    console.log('  8: Ready Lamp');

} catch (err) {
    console.error('ERROR:', err.message);
}
