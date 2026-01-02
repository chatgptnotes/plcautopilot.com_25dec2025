/**
 * Safe Tank Level Generator
 *
 * Uses working v7 template EXACTLY - only replaces <Rungs> section
 * Skill v2.0 patterns: NormalContact, NegatedContact, Coil, Line
 */

const fs = require('fs');
const path = require('path');

const projectName = 'Tank_Level_Safe_v12';

// Generate line elements (columns startCol to endCol)
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

// Hysteresis rung (motor start/stop style) - skill v2.0 verified pattern
function generateHysteresisRung(params) {
  const { triggerInput, triggerSymbol, stopInput, stopSymbol, output, outputSymbol, rungName, rungComment } = params;

  return `          <RungEntity>
            <LadderElements>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${triggerInput}</Descriptor>
                <Comment />
                <Symbol>${triggerSymbol || ''}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Down, Left, Right</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NegatedContact</ElementType>
                <Descriptor>${stopInput}</Descriptor>
                <Comment />
                <Symbol>${stopSymbol || ''}</Symbol>
                <Row>0</Row>
                <Column>1</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(2, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol || ''}</Symbol>
                <Row>0</Row>
                <Column>10</Column>
                <ChosenConnection>Left</ChosenConnection>
              </LadderEntity>
              <LadderEntity>
                <ElementType>NormalContact</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol || ''}</Symbol>
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

// Simple contact rung - skill v2.0 verified pattern
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
                <Symbol>${inputSymbol || ''}</Symbol>
                <Row>0</Row>
                <Column>0</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>
${genLines(1, 9)}
              <LadderEntity>
                <ElementType>Coil</ElementType>
                <Descriptor>${output}</Descriptor>
                <Comment />
                <Symbol>${outputSymbol || ''}</Symbol>
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

// Main
function main() {
  console.log('=== Safe Tank Level Generator ===');
  console.log('Template: tank_level_v7_TM221CE24T.smbp (verified working)');
  console.log('Skill: v2.0 (hysteresis patterns only)');
  console.log('');

  // Read working template
  const templatePath = path.join(__dirname, '..', 'plc_programs', 'tank_level_v7_TM221CE24T.smbp');
  let content = fs.readFileSync(templatePath, 'utf8');

  // Generate rungs using skill v2.0 patterns
  const rungs = [
    // Rung 1: Inlet Valve - fill when level low, stop when level high
    generateHysteresisRung({
      triggerInput: '%M1',
      triggerSymbol: 'LEVEL_LOW',
      stopInput: '%M2',
      stopSymbol: 'LEVEL_HIGH',
      output: '%Q0.0',
      outputSymbol: 'INLET_VLV',
      rungName: 'Inlet_Valve',
      rungComment: 'Fill tank when low, seal-in until high'
    }),
    // Rung 2: Outlet Valve - drain when level high, stop when level low
    generateHysteresisRung({
      triggerInput: '%M2',
      triggerSymbol: 'LEVEL_HIGH',
      stopInput: '%M1',
      stopSymbol: 'LEVEL_LOW',
      output: '%Q0.1',
      outputSymbol: 'OUTLET_VLV',
      rungName: 'Outlet_Valve',
      rungComment: 'Drain tank when high, seal-in until low'
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
  ];

  const rungsXml = rungs.join('\n');

  // Replace ONLY the Rungs section (keep everything else identical)
  content = content.replace(/<Rungs>[\s\S]*?<\/Rungs>/, `<Rungs>\n${rungsXml}\n        </Rungs>`);

  // Update project name only
  content = content.replace(/tank_level_v7_TM221CE24T/g, projectName);

  // Ensure BOM at start
  const BOM = '\uFEFF';
  if (!content.startsWith(BOM)) {
    content = BOM + content;
  }

  // Ensure CRLF line endings
  content = content.replace(/\r?\n/g, '\r\n');

  // Write output
  const outputPath = path.join(__dirname, '..', 'plc_programs', `${projectName}.smbp`);
  fs.writeFileSync(outputPath, content, 'utf8');

  console.log('Generated:', outputPath);
  console.log('Project:', projectName);
  console.log('Rungs: 4');
  console.log('  1. Inlet_Valve - (%M1 OR %Q0.0) AND NOT %M2 -> %Q0.0');
  console.log('  2. Outlet_Valve - (%M2 OR %Q0.1) AND NOT %M1 -> %Q0.1');
  console.log('  3. Inlet_Running - %Q0.0 -> %Q0.2');
  console.log('  4. Outlet_Running - %Q0.1 -> %Q0.3');
  console.log('');
  console.log('NOTE: Level flags (%M1, %M2) must be set by HMI or external logic');
  console.log('      (v2.0 skill does not have CompareBlock for analog thresholds)');
}

main();
