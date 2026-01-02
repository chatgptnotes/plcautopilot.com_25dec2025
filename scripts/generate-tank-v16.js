/**
 * Tank Level Generator v16
 *
 * Added: Symbols and names for ALL elements
 *
 * I/O Assignment:
 * %IW1.0 - TANK_LEVEL (analog input from TM3AI4)
 * %MW0   - LEVEL_RAW (scaled analog value for HMI)
 * %M0    - ENABLE (always ON for continuous operation)
 * %M1    - LEVEL_LOW (tank level below 800)
 * %M2    - LEVEL_HIGH (tank level above 2500)
 * %Q0.0  - INLET_VLV (inlet valve output)
 * %Q0.1  - OUTLET_VLV (outlet valve output)
 */

const fs = require('fs');
const path = require('path');

const projectName = 'Tank_Level_v16';

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

// Rung 1: Read Analog Input
// %M0 (ENABLE) -> [%MW0 := %IW1.0]
function generateAnalogReadRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment>Always ON enable bit</Comment>
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
                <Comment>ENABLE</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>[ %MW0 := %IW1.0 ]</InstructionLine>
                <Comment>LEVEL_RAW := TANK_LEVEL</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Read_Analog</Name>
            <MainComment>Copy analog input to memory word for HMI display</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 2: High Level Detection
// %M0 (ENABLE) AND [%MW0 > 2500] -> %M2 (LEVEL_HIGH)
function generateHighLevelRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment>Always ON enable bit</Comment>
                <Symbol>ENABLE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Comparison</ElementType>
                <ComparisonExpression>%MW0 &gt; 2500</ComparisonExpression>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(4, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Tank level high flag</Comment>
                <Symbol>LEVEL_HIGH</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M0</InstructionLine>
                <Comment>ENABLE</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   [ %MW0 &gt; 2500 ]</InstructionLine>
                <Comment>LEVEL_RAW > 2500</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment>LEVEL_HIGH</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>High_Level</Name>
            <MainComment>Tank level high detection - above 2500 (83% full)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 3: Low Level Detection
// %M0 (ENABLE) AND [%MW0 < 800] -> %M1 (LEVEL_LOW)
function generateLowLevelRung() {
  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%M0</Descriptor>
                <Comment>Always ON enable bit</Comment>
                <Symbol>ENABLE</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>Comparison</ElementType>
                <ComparisonExpression>%MW0 &lt; 800</ComparisonExpression>
                <Row>0</Row>
                <Column>2</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(4, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Tank level low flag</Comment>
                <Symbol>LEVEL_LOW</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M0</InstructionLine>
                <Comment>ENABLE</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>AND   [ %MW0 &lt; 800 ]</InstructionLine>
                <Comment>LEVEL_RAW < 800</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment>LEVEL_LOW</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Low_Level</Name>
            <MainComment>Tank level low detection - below 800 (27% full)</MainComment>
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
                <Comment>Tank level low flag</Comment>
                <Symbol>LEVEL_LOW</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M2</Descriptor>
                <Comment>Tank level high flag</Comment>
                <Symbol>LEVEL_HIGH</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(2, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Inlet valve output</Comment>
                <Symbol>INLET_VLV</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.0</Descriptor>
                <Comment>Seal-in contact</Comment>
                <Symbol>INLET_VLV</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M1</InstructionLine>
                <Comment>LEVEL_LOW</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.0</InstructionLine>
                <Comment>INLET_VLV (seal-in)</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M2</InstructionLine>
                <Comment>NOT LEVEL_HIGH</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.0</InstructionLine>
                <Comment>INLET_VLV</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Inlet_Valve</Name>
            <MainComment>Inlet valve control - Fill when low, stop when high (hysteresis)</MainComment>
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
                <Comment>Tank level high flag</Comment>
                <Symbol>LEVEL_HIGH</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>%M1</Descriptor>
                <Comment>Tank level low flag</Comment>
                <Symbol>LEVEL_LOW</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(2, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment>Outlet valve output</Comment>
                <Symbol>OUTLET_VLV</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>%Q0.1</Descriptor>
                <Comment>Seal-in contact</Comment>
                <Symbol>OUTLET_VLV</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    %M2</InstructionLine>
                <Comment>LEVEL_HIGH</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    %Q0.1</InstructionLine>
                <Comment>OUTLET_VLV (seal-in)</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  %M1</InstructionLine>
                <Comment>NOT LEVEL_LOW</Comment>
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %Q0.1</InstructionLine>
                <Comment>OUTLET_VLV</Comment>
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Outlet_Valve</Name>
            <MainComment>Outlet valve control - Drain when high, stop when low (hysteresis)</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

function main() {
  console.log('=== Tank Level Generator v16 ===');
  console.log('Added: Symbols and comments for all elements');
  console.log('');

  const templatePath = path.join(__dirname, '..', 'plc_programs', 'test_analog_Card_reference.smbp');
  let content = fs.readFileSync(templatePath, 'utf8');

  const rungs = [
    generateAnalogReadRung(),
    generateHighLevelRung(),
    generateLowLevelRung(),
    generateInletValveRung(),
    generateOutletValveRung()
  ];

  const rungsXml = rungs.join('\n');

  content = content.replace(/<Rungs>[\s\S]*?<\/Rungs>/, `<Rungs>\n${rungsXml}\n        </Rungs>`);
  content = content.replace(/test_analog Card/g, projectName);

  const BOM = '\uFEFF';
  if (!content.startsWith(BOM)) {
    content = BOM + content;
  }
  content = content.replace(/\r?\n/g, '\r\n');

  const outputPath = path.join(__dirname, '..', 'plc_programs', `${projectName}.smbp`);
  fs.writeFileSync(outputPath, content, 'utf8');

  console.log('Generated:', outputPath);
  console.log('');
  console.log('Symbol Table:');
  console.log('  %IW1.0  TANK_LEVEL   Analog input (4-20mA)');
  console.log('  %MW0    LEVEL_RAW    Scaled value for HMI');
  console.log('  %M0     ENABLE       Always ON bit');
  console.log('  %M1     LEVEL_LOW    Low level flag (<800)');
  console.log('  %M2     LEVEL_HIGH   High level flag (>2500)');
  console.log('  %Q0.0   INLET_VLV    Inlet valve output');
  console.log('  %Q0.1   OUTLET_VLV   Outlet valve output');
  console.log('');
  console.log('Rungs: 5');
  console.log('  1. Read_Analog    - Copy analog to memory');
  console.log('  2. High_Level     - Detect level > 2500');
  console.log('  3. Low_Level      - Detect level < 800');
  console.log('  4. Inlet_Valve    - Fill with hysteresis');
  console.log('  5. Outlet_Valve   - Drain with hysteresis');
}

main();
