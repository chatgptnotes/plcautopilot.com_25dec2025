/**
 * Tank Level Control Generator - AI API Version
 *
 * Uses:
 * - AI API (generate-plc-ai) for pattern generation
 * - schneider.md skill v2.0
 * - smbp-templates for XML generation
 * - Working template as base
 *
 * Requirements:
 * - Tank height: 1m (1000mm)
 * - Ultrasonic: 4-20mA, deadband 300mm, range 3000mm
 * - Sensor 500mm above tank
 * - TM3AI4 expansion card
 * - Inlet/Outlet valves with hysteresis
 * - % level for HMI
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const projectName = 'Tank_Level_AI_v11';
const plcModel = 'TM221CE24T';

// Tank level requirements for AI API
const tankLevelDescription = `
Tank level control system with TM3AI4 analog expansion:
- 1 meter tank with ultrasonic level transmitter (4-20mA on %IW1.0)
- Sensor mounted 500mm above tank, deadband 300mm, range 3000mm
- When tank FULL (level high): close inlet valve, open outlet valve
- When tank EMPTY (level low): close outlet valve, open inlet valve
- Hysteresis control to prevent valve chattering
- Inlet valve on %Q0.0, Outlet valve on %Q0.1
- Use memory bits %M0 for pump run, %M1 for level low, %M2 for level high
`;

// Call the AI API to get patterns
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
      }
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
    req.write(postData);
    req.end();
  });
}

// Generate line elements helper (skill v2.0 pattern)
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

// Generate hysteresis rung (skill v2.0 pattern - motor start/stop style)
function generateHysteresisRung(params) {
  const { triggerInput, triggerSymbol, stopInput, stopSymbol, output, outputSymbol, rungName, rungComment } = params;

  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${triggerInput}</Descriptor>
                <Comment />
                <Symbol>${triggerSymbol}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>${stopInput}</Descriptor>
                <Comment />
                <Symbol>${stopSymbol}</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(2, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>1</Row>
                <Column>0</Column>
                <ChosenConnection>Up, Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>LD    ${triggerInput}</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>OR    ${output}</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ANDN  ${stopInput}</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    ${output}</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>${rungName}</Name>
            <MainComment>${rungComment}</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Generate simple contact rung (skill v2.0 pattern)
function generateSimpleRung(params) {
  const { input, inputSymbol, output, outputSymbol, negated, rungName, rungComment } = params;
  const elementType = negated ? 'NegatedContact' : 'NormalContact';
  const ilCmd = negated ? 'LDN' : 'LD';

  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>${elementType}</ElementType>
                <Descriptor>${input}</Descriptor>
                <Comment />
                <Symbol>${inputSymbol}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
            </LadderElements>
            <InstructionLines>
              <InstructionLineEntity>
                <InstructionLine>${ilCmd}   ${input}</InstructionLine>
                <Comment />
              </InstructionLineEntity>
              <InstructionLineEntity>
                <InstructionLine>ST    ${output}</InstructionLine>
                <Comment />
              </InstructionLineEntity>
            </InstructionLines>
            <Name>${rungName}</Name>
            <MainComment>${rungComment}</MainComment>
            <Label />
            <IsLadderSelected>true</IsLadderSelected>
          </RungEntity>`;
}

// Main execution
async function main() {
  console.log('=== Tank Level Program Generator (AI API + Skill v2.0) ===');
  console.log('Skill: schneider.md v2.0');
  console.log('');

  try {
    // Try calling the AI API
    console.log('Calling AI API at http://localhost:3007/api/generate-plc-ai...');
    const aiResponse = await callAIAPI();

    if (aiResponse.success && aiResponse.content) {
      console.log('AI API returned successfully!');
      console.log('AI Generated:', aiResponse.aiGenerated ? 'Yes (Claude)' : 'No (Fallback)');
      console.log('Patterns used:', aiResponse.patternsUsed);

      // Write the AI-generated file
      const outputPath = path.join(__dirname, '..', 'plc_programs', `${projectName}.smbp`);

      // Ensure BOM at start
      let content = aiResponse.content;
      const BOM = '\uFEFF';
      if (!content.startsWith(BOM)) {
        content = BOM + content;
      }

      fs.writeFileSync(outputPath, content, 'utf8');
      console.log('');
      console.log('Generated:', outputPath);
      console.log('Project:', aiResponse.programData?.projectName || projectName);
      console.log('Rungs:', aiResponse.programData?.rungCount || 'N/A');

      if (aiResponse.programData?.rungs) {
        aiResponse.programData.rungs.forEach((r, i) => {
          console.log(`  ${i+1}. ${r.name}`);
        });
      }
      return;
    }
  } catch (error) {
    console.log('AI API not available:', error.message);
    console.log('Falling back to template-based generation...');
  }

  // Fallback: Use template-based generation with skill v2.0 patterns
  console.log('');
  console.log('Using template-based generation (skill v2.0 hysteresis patterns)...');

  // Read working template
  const templatePath = path.join(__dirname, '..', 'plc_programs', 'tank_level_v7_TM221CE24T.smbp');
  let content = fs.readFileSync(templatePath, 'utf8');

  // Generate rungs using skill v2.0 patterns (hysteresis style)
  // Note: v2.0 uses memory bits as level triggers (would be set by HMI or external logic)
  const rungsXml = [
    // Rung 1: Inlet Valve Control (hysteresis - fill when empty, stop when full)
    generateHysteresisRung({
      triggerInput: '%M1',
      triggerSymbol: 'LEVEL_LOW',
      stopInput: '%M2',
      stopSymbol: 'LEVEL_HIGH',
      output: '%Q0.0',
      outputSymbol: 'INLET_VLV',
      rungName: 'Inlet_Valve_Control',
      rungComment: 'Fill tank when level low, seal-in until level high'
    }),
    // Rung 2: Outlet Valve Control (hysteresis - drain when full, stop when empty)
    generateHysteresisRung({
      triggerInput: '%M2',
      triggerSymbol: 'LEVEL_HIGH',
      stopInput: '%M1',
      stopSymbol: 'LEVEL_LOW',
      output: '%Q0.1',
      outputSymbol: 'OUTLET_VLV',
      rungName: 'Outlet_Valve_Control',
      rungComment: 'Drain tank when level high, seal-in until level low'
    }),
    // Rung 3: Inlet Running Indicator
    generateSimpleRung({
      input: '%Q0.0',
      inputSymbol: 'INLET_VLV',
      output: '%Q0.2',
      outputSymbol: 'INLET_RUN',
      rungName: 'Inlet_Running',
      rungComment: 'Inlet valve running indicator'
    }),
    // Rung 4: Outlet Running Indicator
    generateSimpleRung({
      input: '%Q0.1',
      inputSymbol: 'OUTLET_VLV',
      output: '%Q0.3',
      outputSymbol: 'OUTLET_RUN',
      rungName: 'Outlet_Running',
      rungComment: 'Outlet valve running indicator'
    })
  ].join('\n');

  // Replace rungs section
  content = content.replace(/<Rungs>[\s\S]*?<\/Rungs>/, `<Rungs>\n${rungsXml}\n        </Rungs>`);

  // Update project name
  content = content.replace(/<Name>tank_level_v7_TM221CE24T<\/Name>/, `<Name>${projectName}</Name>`);
  content = content.replace(/<FullName>.*?<\/FullName>/, `<FullName>C:\\plc_programs\\${projectName}.smbp</FullName>`);
  content = content.replace(/<Name>New POU<\/Name>/, '<Name>Tank_Level_Control</Name>');

  // Ensure BOM at start
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
  console.log('Project:', projectName);
  console.log('PLC:', plcModel);
  console.log('Skill: v2.0 (hysteresis patterns)');
  console.log('Rungs: 4');
  console.log('  1. Inlet_Valve_Control - (%M1 OR %Q0.0) AND NOT %M2 -> %Q0.0');
  console.log('  2. Outlet_Valve_Control - (%M2 OR %Q0.1) AND NOT %M1 -> %Q0.1');
  console.log('  3. Inlet_Running - %Q0.0 -> %Q0.2');
  console.log('  4. Outlet_Running - %Q0.1 -> %Q0.3');
  console.log('');
  console.log('NOTE: Level flags (%M1, %M2) must be set by HMI or analog comparison logic');
}

// Run
main().catch(console.error);
