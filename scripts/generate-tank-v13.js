/**
 * Tank Level Generator v13
 *
 * Uses test_analog_Card_reference.smbp as template (verified working)
 * Skill v2.1 patterns: Operation, Comparison
 *
 * Tank specs:
 * - 1m tank height
 * - Ultrasonic 4-20mA on %IW1.0
 * - Range 300-3000 (already configured in template)
 * - High level > 2500, Low level < 800
 */

const fs = require('fs');
const path = require('path');

const projectName = 'Tank_Level_v13';

// Generate line elements
function genLines(startCol, endCol) {
  const lines = [];
  for (let c = startCol; c <= endCol; c++) {
    lines.push(`              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>${c}</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`);
  }
  return lines.join('\n');
}

// Rung 1: Read Analog Input (Operation element)
// %M0 is always ON -> copy %IW1.0 to %MW0
function generateAnalogReadRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment />
                <Symbol>ENABLE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 8)}
              <LadderEntity>
                <ElementType>Operation</ElementType>
                <OperationExpression>%MW0 := %IW1.0</OperationExpression>
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
                <InstructionLine>[ %MW0 := %IW1.0 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Read_Analog</Name>
            <MainComment>Copy analog input to memory word for HMI</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 2: High Level Detection (Comparison element)
// %MW0 > 2500 -> %M2 (LEVEL_HIGH)
function generateHighLevelRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>Comparison</ElementType>
                <ComparisonExpression>%MW0 > 2500</ComparisonExpression>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment />
                <Symbol>LEVEL_HIGH</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    [ %MW0 > 2500 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>High_Level</Name>
            <MainComment>Tank level high detection (above 2500)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 3: Low Level Detection (Comparison element)
// %MW0 < 800 -> %M1 (LEVEL_LOW)
function generateLowLevelRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>Comparison</ElementType>
                <ComparisonExpression>%MW0 &lt; 800</ComparisonExpression>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment />
                <Symbol>LEVEL_LOW</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    [ %MW0 &lt; 800 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Low_Level</Name>
            <MainComment>Tank level low detection (below 800)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 4: Inlet Valve Control (hysteresis)
// (%M1 OR %Q0.0) AND NOT %M2 -> %Q0.0
function generateInletValveRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment />
                <Symbol>LEVEL_LOW</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment />
                <Symbol>LEVEL_HIGH</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(2, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment />
                <Symbol>INLET_VLV</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment />
                <Symbol>INLET_VLV</Symbol>
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

// Rung 5: Outlet Valve Control (hysteresis)
// (%M2 OR %Q0.1) AND NOT %M1 -> %Q0.1
function generateOutletValveRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment />
                <Symbol>LEVEL_HIGH</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment />
                <Symbol>LEVEL_LOW</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(2, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment />
                <Symbol>OUTLET_VLV</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment />
                <Symbol>OUTLET_VLV</Symbol>
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

function main() {
  console.log('=== Tank Level Generator v13 ===');
  console.log('Template: test_analog_Card_reference.smbp');
  console.log('Skill: v2.1 (Operation, Comparison elements)');
  console.log('');

  // Read the working analog card template
  const templatePath = path.join(__dirname, '..', 'plc_programs', 'test_analog_Card_reference.smbp');
  let content = fs.readFileSync(templatePath, 'utf8');

  // Generate rungs
  const rungs = [
    generateAnalogReadRung(),
    generateHighLevelRung(),
    generateLowLevelRung(),
    generateInletValveRung(),
    generateOutletValveRung()
  ];

  const rungsXml = rungs.join('\n');

  // Replace rungs section
  content = content.replace(/<Rungs>[\s\S]*?<\/Rungs>/, `<Rungs>\n${rungsXml}\n        </Rungs>`);

  // Update project name
  content = content.replace(/test_analog Card/g, projectName);

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
  console.log('Rungs: 5');
  console.log('  1. Read_Analog - %M0 -> [%MW0 := %IW1.0]');
  console.log('  2. High_Level - [%MW0 > 2500] -> %M2');
  console.log('  3. Low_Level - [%MW0 < 800] -> %M1');
  console.log('  4. Inlet_Valve - (%M1 OR %Q0.0) AND NOT %M2 -> %Q0.0');
  console.log('  5. Outlet_Valve - (%M2 OR %Q0.1) AND NOT %M1 -> %Q0.1');
  console.log('');
  console.log('TM3AI4 config preserved from template (4-20mA, 300-3000 range)');
}

main();
