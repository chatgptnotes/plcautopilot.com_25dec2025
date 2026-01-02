/**
 * Motor Start/Stop - Incremental Build
 * Test each modification step by step to find corruption source
 */

const fs = require('fs');

const TEMPLATE_PATH = 'c:\\Users\\HP\\Downloads\\Template for configuration of cards.smbp';
const OUTPUT_PATH = 'd:\\plcautopilot.com_25dec2025 (2)\\plcautopilot.com_25dec2025\\plc_programs\\Motor_Incremental_Test.smbp';

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

// Single motor control rung - minimal
const MOTOR_RUNG = `
          <!-- Motor Start/Stop Rung -->
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
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%I0.2</Descriptor>
                <Comment>Stop Button NC</Comment>
                <Symbol>STOP_PB</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>${generateLines(2, 9, 0)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Motor Output</Comment>
                <Symbol>MOTOR</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Seal-in</Comment>
                <Symbol>MOTOR</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %I0.1</InstructionLine>
                <Comment>Start</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.0</InstructionLine>
                <Comment>Seal-in</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %I0.2</InstructionLine>
                <Comment>Stop</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment>Motor</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Motor_StartStop</Name>
            <MainComment>Basic motor start/stop with seal-in</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;

try {
    console.log('Motor Control - Incremental Test');
    console.log('='.repeat(50));
    console.log('');

    // Read template
    console.log('Step 1: Reading template...');
    let content = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    console.log('  Template size:', content.length, 'bytes');

    // Step 2: Change project name (we know this works)
    console.log('Step 2: Changing project name...');
    content = content.split('Template for configuration of cards').join('Motor_Incremental_Test');
    console.log('  Size after name change:', content.length, 'bytes');

    // Step 3: Change controller reference
    console.log('Step 3: Changing controller to TM221CE16T...');
    content = content.split('TM221CE40T').join('TM221CE16T');
    console.log('  Size after controller change:', content.length, 'bytes');

    // Step 4: Add one motor rung
    console.log('Step 4: Adding motor start/stop rung...');
    const beforeRungs = content.indexOf('</Rungs>');
    if (beforeRungs !== -1) {
        content = content.slice(0, beforeRungs) + MOTOR_RUNG + '\n        ' + content.slice(beforeRungs);
        console.log('  Size after adding rung:', content.length, 'bytes');
    } else {
        console.log('  ERROR: Could not find </Rungs> tag');
    }

    // Write output
    console.log('Step 5: Writing output file...');
    fs.writeFileSync(OUTPUT_PATH, content, 'utf8');

    // Verify
    const outSize = fs.statSync(OUTPUT_PATH).size;
    console.log('  Output file size:', outSize, 'bytes');

    console.log('');
    console.log('='.repeat(50));
    console.log('SUCCESS: Incremental test file created');
    console.log('Output:', OUTPUT_PATH);
    console.log('');
    console.log('Changes made:');
    console.log('  1. Project name changed');
    console.log('  2. Controller changed to TM221CE16T');
    console.log('  3. Added ONE motor start/stop rung');
    console.log('');
    console.log('Please test in Machine Expert Basic.');

} catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
}
