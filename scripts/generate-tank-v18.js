/**
 * Tank Level Generator v18
 *
 * Fixed: Add symbols to MemoryBits section
 * Symbols are defined in:
 * - <MemoryBits> for %M addresses
 * - <MemoryWords> for %MW addresses (optional)
 * - <AnalogIO> in Extensions for %IW addresses
 */

const fs = require('fs');
const path = require('path');

const projectName = 'Tank_Level_v18';

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

// Rung 2: High Level Detection
function generateHighLevelRung() {
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
                <Comment />
                <Symbol>LEVEL_HIGH</Symbol>
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
                <InstructionLine>AND   [ %MW0 &gt; 2500 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M2</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>High_Level</Name>
            <MainComment>Tank level high detection above 2500</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 3: Low Level Detection
function generateLowLevelRung() {
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
                <Comment />
                <Symbol>LEVEL_LOW</Symbol>
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
                <InstructionLine>AND   [ %MW0 &lt; 800 ]</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    %M1</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>Low_Level</Name>
            <MainComment>Tank level low detection below 800</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 4: Inlet Valve Control
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
            <MainComment>Fill when low, stop when high</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Rung 5: Outlet Valve Control
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
            <MainComment>Drain when high, stop when low</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Memory bits symbol definitions
function generateMemoryBits() {
  return `    <MemoryBits>
      <MemoryBit>
        <Address>%M0</Address>
        <Index>0</Index>
        <Symbol>ENABLE</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M1</Address>
        <Index>1</Index>
        <Symbol>LEVEL_LOW</Symbol>
      </MemoryBit>
      <MemoryBit>
        <Address>%M2</Address>
        <Index>2</Index>
        <Symbol>LEVEL_HIGH</Symbol>
      </MemoryBit>
    </MemoryBits>`;
}

// Memory words symbol definitions
function generateMemoryWords() {
  return `      <MemoryWord>
        <Address>%MW0</Address>
        <Index>0</Index>
        <Symbol>LEVEL_RAW</Symbol>
      </MemoryWord>`;
}

function main() {
  console.log('=== Tank Level Generator v18 ===');
  console.log('Added: MemoryBits section with symbol definitions');
  console.log('');

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

  // Replace MemoryBits section (add our symbols)
  content = content.replace(/<MemoryBits>[\s\S]*?<\/MemoryBits>/, generateMemoryBits());

  // Add LEVEL_RAW symbol to MemoryWords - find first MemoryWord and add before it
  // Or replace the existing %MW0 entry
  content = content.replace(
    /<MemoryWord>\s*<Address>%MW0<\/Address>\s*<Index>0<\/Index>\s*<Symbol>[^<]*<\/Symbol>\s*<\/MemoryWord>/,
    generateMemoryWords()
  );

  // Update project name
  content = content.replace(/test_analog Card/g, projectName);

  // Ensure BOM
  const BOM = '\uFEFF';
  if (!content.startsWith(BOM)) {
    content = BOM + content;
  }

  // Ensure CRLF
  content = content.replace(/\r?\n/g, '\r\n');

  const outputPath = path.join(__dirname, '..', 'plc_programs', `${projectName}.smbp`);
  fs.writeFileSync(outputPath, content, 'utf8');

  console.log('Generated:', outputPath);
  console.log('');
  console.log('MemoryBits symbols added:');
  console.log('  %M0  ENABLE');
  console.log('  %M1  LEVEL_LOW');
  console.log('  %M2  LEVEL_HIGH');
  console.log('');
  console.log('MemoryWords symbols:');
  console.log('  %MW0 LEVEL_RAW');
  console.log('');
  console.log('Note: %Q0.0/%Q0.1 symbols shown in ladder but');
  console.log('      DiscretOutput section does not support Symbol tag');
}

main();
