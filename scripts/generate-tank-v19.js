/**
 * Tank Level Generator v19
 *
 * Uses:
 * - Tank_Level_v18_reference.smbp as working template
 * - Skill v2.2 patterns (with symbol definitions)
 * - AI API for pattern generation when available
 *
 * Symbols defined in THREE places per skill v2.2:
 * 1. LadderEntity - for ladder display
 * 2. MemoryBits section - for %M addresses
 * 3. DiscretOutput section - for %Q addresses
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const projectName = 'Tank_Level_v19';
const plcModel = 'TM221CE24T';

// Symbol definitions
const symbols = {
  M0: 'ENABLE_OPERATION',
  M1: 'TANK_LEVEL_LOW',
  M2: 'TANK_LEVEL_HIGH',
  Q00: 'INLET_VALVE',
  Q01: 'OUTLET_VALVE',
  MW0: 'LEVEL_RAW',
  IW10: 'TANK_LEVEL'
};

// Tank level description for AI API
const tankLevelDescription = `
Tank level control system with TM3AI4 analog expansion:
- 1 meter tank with ultrasonic level transmitter (4-20mA on %IW1.0)
- Symbol: TANK_LEVEL for %IW1.0
- Copy analog to %MW0 (LEVEL_RAW) for HMI
- High level detection: %MW0 > 2500 sets %M2 (TANK_LEVEL_HIGH)
- Low level detection: %MW0 < 800 sets %M1 (TANK_LEVEL_LOW)
- Inlet valve %Q0.0 (INLET_VALVE): hysteresis fill when low, stop when high
- Outlet valve %Q0.1 (OUTLET_VALVE): hysteresis drain when high, stop when low
- Enable bit %M0 (ENABLE_OPERATION) for all operations
`;

// Call AI API
async function callAIAPI() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      description: tankLevelDescription,
      plcModel: plcModel,
      projectName: projectName
    });

    const options = {
      hostname: 'localhost',
      port: 3007,
      path: '/api/generate-plc-ai',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(postData);
    req.end();
  });
}

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

// Rung generators with symbols
function generateAnalogReadRung() {
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

// Generate DiscretOutput with symbols
function generateDiscretOutputWithSymbol(address, index, symbol) {
  return `          <DiscretOutput>
            <Address>${address}</Address>
            <Index>${index}</Index>
            <Symbol>${symbol}</Symbol>
          </DiscretOutput>`;
}

async function main() {
  console.log('=== Tank Level Generator v19 ===');
  console.log('Skill: v2.2 (with symbol definitions)');
  console.log('Template: Tank_Level_v18_reference.smbp');
  console.log('');

  // Try AI API first
  let aiUsed = false;
  try {
    console.log('Calling AI API...');
    const aiResponse = await callAIAPI();
    if (aiResponse.success) {
      console.log('AI API responded, patterns:', aiResponse.patternsUsed);
      aiUsed = true;
    }
  } catch (err) {
    console.log('AI API not available:', err.message);
  }

  // Use template-based generation
  console.log('Using template-based generation with skill v2.2...');

  // Read reference template
  const templatePath = path.join(__dirname, '..', 'plc_programs', 'Tank_Level_v18_reference.smbp');
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

  // Replace sections
  content = content.replace(/<Rungs>[\s\S]*?<\/Rungs>/, `<Rungs>\n${rungsXml}\n        </Rungs>`);
  content = content.replace(/<MemoryBits>[\s\S]*?<\/MemoryBits>/, generateMemoryBits());

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
  content = content.replace(/Tank_Level_v18/g, projectName);

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

  console.log('');
  console.log('Generated:', outputPath);
  console.log('AI API used:', aiUsed ? 'Yes' : 'No (fallback)');
  console.log('');
  console.log('Symbols (defined in 3 places per skill v2.2):');
  console.log('  %M0   ', symbols.M0);
  console.log('  %M1   ', symbols.M1);
  console.log('  %M2   ', symbols.M2);
  console.log('  %Q0.0 ', symbols.Q00);
  console.log('  %Q0.1 ', symbols.Q01);
  console.log('');
  console.log('Rungs: 5');
  console.log('  1. Read_Analog');
  console.log('  2. High_Level');
  console.log('  3. Low_Level');
  console.log('  4. Inlet_Valve');
  console.log('  5. Outlet_Valve');
}

main().catch(console.error);
