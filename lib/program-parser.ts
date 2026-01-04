/**
 * Program Parser
 * Extracts actual logic from generated SMBP XML files
 * Version: 1.0
 */

export interface ExtractedComparison {
  address: string;        // %MF104
  operator: string;       // ">", "<", "<=", ">=", "=", "<>"
  value: number;          // 400.0
  rungName: string;       // "Inlet_Valve_Control"
  rungIndex: number;
  outputAddress?: string; // %Q0.0
  outputSymbol?: string;  // INLET_VALVE
}

export interface ExtractedTimer {
  address: string;        // %TM0
  preset: number;         // 3
  base: string;           // "OneSecond"
  rungName: string;
  purpose: string;        // inferred from rung name
}

export interface ExtractedInterlock {
  inputAddress: string;   // %I0.0
  inputSymbol: string;    // EMERGENCY_PB
  blocksOutputs: string[];// ["%Q0.0", "%Q0.1"]
  rungNames: string[];
}

export interface ExtractedOutput {
  address: string;        // %Q0.0
  symbol: string;         // INLET_VALVE
  type: 'coil' | 'set' | 'reset';
  controlledBy: string[]; // conditions that control this output
  rungName: string;
}

export interface ExtractedAnalogScaling {
  rawInput: string;       // %IW1.0
  scaledOutput: string;   // %MF104
  formula?: string;       // INT_TO_REAL(%MW100 - 2000) / 8.0
  rungName: string;
}

export interface ExtractedPhase {
  address: string;        // %M1
  symbol: string;         // FILL_PHASE
  type: 'fill' | 'drain' | 'wait' | 'unknown';
  setConditions: string[];
  resetConditions: string[];
}

export interface ProgramParserResult {
  comparisons: ExtractedComparison[];
  timers: ExtractedTimer[];
  interlocks: ExtractedInterlock[];
  outputs: ExtractedOutput[];
  analogScaling: ExtractedAnalogScaling[];
  phases: ExtractedPhase[];
  rungCount: number;
  rungNames: string[];
}

/**
 * Extract comparisons (CompareBlock elements) from rungs
 */
function extractComparisons(rungsXml: string): ExtractedComparison[] {
  const comparisons: ExtractedComparison[] = [];

  // Find all rungs
  const rungMatches = rungsXml.matchAll(/<RungEntity>([\s\S]*?)<\/RungEntity>/g);

  let rungIndex = 0;
  for (const rungMatch of rungMatches) {
    const rungContent = rungMatch[1];

    // Get rung name
    const nameMatch = rungContent.match(/<Name>([^<]*)<\/Name>/);
    const rungName = nameMatch ? nameMatch[1] : `Rung_${rungIndex}`;

    // Find CompareBlock or Comparison elements
    const compareRegex = /<ElementType>(?:CompareBlock|Comparison)<\/ElementType>[\s\S]*?<CompareExpression>([^<]+)<\/CompareExpression>/g;
    let compareMatch;
    while ((compareMatch = compareRegex.exec(rungContent)) !== null) {
      const expression = compareMatch[1];

      // Parse expression like "%MF104 > 400.0" or "%MF104 <= 1400.0"
      const exprMatch = expression.match(/(%\w+\d+)\s*([<>=!]+)\s*(\d+\.?\d*)/);
      if (exprMatch) {
        const [, address, operator, valueStr] = exprMatch;
        const value = parseFloat(valueStr);

        // Try to find associated output (coil in the same rung)
        const coilMatch = rungContent.match(/<ElementType>Coil<\/ElementType>[\s\S]*?<Descriptor>(%Q\d+\.\d+)<\/Descriptor>[\s\S]*?<Symbol>([^<]*)<\/Symbol>/);
        const setCoilMatch = rungContent.match(/<ElementType>SetCoil<\/ElementType>[\s\S]*?<Descriptor>(%[MQ]\d+\.?\d*)<\/Descriptor>/);

        comparisons.push({
          address,
          operator,
          value,
          rungName,
          rungIndex,
          outputAddress: coilMatch?.[1] || setCoilMatch?.[1],
          outputSymbol: coilMatch?.[2]
        });
      }
    }

    rungIndex++;
  }

  return comparisons;
}

/**
 * Extract timer declarations
 */
function extractTimers(smbpContent: string, rungsXml: string): ExtractedTimer[] {
  const timers: ExtractedTimer[] = [];

  // Find timer declarations in Timers section
  const timerDeclRegex = /<TimerTM>([\s\S]*?)<\/TimerTM>/g;
  let timerMatch;
  while ((timerMatch = timerDeclRegex.exec(smbpContent)) !== null) {
    const timerContent = timerMatch[1];

    const addressMatch = timerContent.match(/<Address>(%TM\d+)<\/Address>/);
    const presetMatch = timerContent.match(/<Preset>(\d+)<\/Preset>/);
    const baseMatch = timerContent.match(/<Base>(\w+)<\/Base>/);

    if (addressMatch && presetMatch) {
      const address = addressMatch[1];
      const preset = parseInt(presetMatch[1]);
      const base = baseMatch?.[1] || 'OneSecond';

      // Find which rung uses this timer
      const timerRungRegex = new RegExp(`<Descriptor>${address.replace('%', '\\%')}<\\/Descriptor>[\\s\\S]*?<Name>([^<]+)<\\/Name>`, 'g');
      const rungMatch = timerRungRegex.exec(rungsXml);
      const rungName = rungMatch?.[1] || 'Unknown';

      // Infer purpose from rung name
      let purpose = 'general';
      const rungNameLower = rungName.toLowerCase();
      if (rungNameLower.includes('ready') || rungNameLower.includes('startup')) purpose = 'startup_delay';
      else if (rungNameLower.includes('timeout') || rungNameLower.includes('fill')) purpose = 'timeout';
      else if (rungNameLower.includes('wait')) purpose = 'wait_phase';
      else if (rungNameLower.includes('delay')) purpose = 'delay';

      timers.push({ address, preset, base, rungName, purpose });
    }
  }

  return timers;
}

/**
 * Extract interlock relationships (emergency stop blocking outputs)
 */
function extractInterlocks(rungsXml: string): ExtractedInterlock[] {
  const interlocks: ExtractedInterlock[] = [];
  const interlockMap = new Map<string, { symbol: string; outputs: Set<string>; rungs: Set<string> }>();

  // Find all rungs
  const rungMatches = rungsXml.matchAll(/<RungEntity>([\s\S]*?)<\/RungEntity>/g);

  for (const rungMatch of rungMatches) {
    const rungContent = rungMatch[1];

    const nameMatch = rungContent.match(/<Name>([^<]*)<\/Name>/);
    const rungName = nameMatch ? nameMatch[1] : 'Unknown';

    // Find NC contacts (inverted contacts that block outputs)
    // Pattern: NegatedContact or InvertedContact on %I0.0 with EMERGENCY/ESTOP
    const emergencyPattern = /<ElementType>(?:NormalContact|NegatedContact)<\/ElementType>[\s\S]*?<Descriptor>(%I\d+\.\d+)<\/Descriptor>[\s\S]*?<Symbol>([^<]*(?:EMERGENCY|ESTOP|E_STOP)[^<]*)<\/Symbol>/gi;

    let contactMatch;
    while ((contactMatch = emergencyPattern.exec(rungContent)) !== null) {
      const inputAddress = contactMatch[1];
      const inputSymbol = contactMatch[2];

      // Find outputs in this rung
      const outputPattern = /<Descriptor>(%Q\d+\.\d+)<\/Descriptor>/g;
      const outputs = new Set<string>();
      let outputMatch;
      while ((outputMatch = outputPattern.exec(rungContent)) !== null) {
        outputs.add(outputMatch[1]);
      }

      // Aggregate interlocks
      if (!interlockMap.has(inputAddress)) {
        interlockMap.set(inputAddress, { symbol: inputSymbol, outputs: new Set(), rungs: new Set() });
      }
      const entry = interlockMap.get(inputAddress)!;
      outputs.forEach(o => entry.outputs.add(o));
      entry.rungs.add(rungName);
    }
  }

  // Convert map to array
  interlockMap.forEach((value, inputAddress) => {
    interlocks.push({
      inputAddress,
      inputSymbol: value.symbol,
      blocksOutputs: Array.from(value.outputs),
      rungNames: Array.from(value.rungs)
    });
  });

  return interlocks;
}

/**
 * Extract output definitions
 */
function extractOutputs(rungsXml: string): ExtractedOutput[] {
  const outputs: ExtractedOutput[] = [];
  const outputMap = new Map<string, ExtractedOutput>();

  const rungMatches = rungsXml.matchAll(/<RungEntity>([\s\S]*?)<\/RungEntity>/g);

  for (const rungMatch of rungMatches) {
    const rungContent = rungMatch[1];

    const nameMatch = rungContent.match(/<Name>([^<]*)<\/Name>/);
    const rungName = nameMatch ? nameMatch[1] : 'Unknown';

    // Find Coil elements
    const coilRegex = /<ElementType>(Coil|SetCoil|ResetCoil)<\/ElementType>[\s\S]*?<Descriptor>(%Q\d+\.\d+)<\/Descriptor>(?:[\s\S]*?<Symbol>([^<]*)<\/Symbol>)?/g;

    let coilMatch;
    while ((coilMatch = coilRegex.exec(rungContent)) !== null) {
      const coilType = coilMatch[1].toLowerCase();
      const address = coilMatch[2];
      const symbol = coilMatch[3] || address;

      let type: 'coil' | 'set' | 'reset' = 'coil';
      if (coilType === 'setcoil') type = 'set';
      else if (coilType === 'resetcoil') type = 'reset';

      // Extract controlling conditions (contacts before the coil)
      const conditions: string[] = [];
      const contactPattern = /<Descriptor>(%[IM]\d+\.?\d*)<\/Descriptor>[\s\S]*?<Symbol>([^<]*)<\/Symbol>/g;
      let contactMatch;
      while ((contactMatch = contactPattern.exec(rungContent)) !== null) {
        conditions.push(`${contactMatch[2]} (${contactMatch[1]})`);
      }

      if (!outputMap.has(address)) {
        outputMap.set(address, {
          address,
          symbol,
          type,
          controlledBy: conditions,
          rungName
        });
      }
    }
  }

  return Array.from(outputMap.values());
}

/**
 * Extract analog scaling operations
 */
function extractAnalogScaling(rungsXml: string): ExtractedAnalogScaling[] {
  const scaling: ExtractedAnalogScaling[] = [];

  const rungMatches = rungsXml.matchAll(/<RungEntity>([\s\S]*?)<\/RungEntity>/g);

  for (const rungMatch of rungMatches) {
    const rungContent = rungMatch[1];

    const nameMatch = rungContent.match(/<Name>([^<]*)<\/Name>/);
    const rungName = nameMatch ? nameMatch[1] : 'Unknown';

    // Find Operation elements with analog scaling
    const operationRegex = /<OperationExpression>([^<]+)<\/OperationExpression>/g;

    let opMatch;
    while ((opMatch = operationRegex.exec(rungContent)) !== null) {
      const expression = opMatch[1];

      // Look for patterns like %MF := ... %IW ... or %MW := %IW
      if (expression.includes('%IW') || expression.includes('INT_TO_REAL')) {
        const mfMatch = expression.match(/%MF\d+/);
        const mwMatch = expression.match(/%MW\d+/);
        const iwMatch = expression.match(/%IW\d+\.\d+/);

        if (mfMatch || (mwMatch && iwMatch)) {
          scaling.push({
            rawInput: iwMatch?.[0] || 'Unknown',
            scaledOutput: mfMatch?.[0] || mwMatch?.[0] || 'Unknown',
            formula: expression,
            rungName
          });
        }
      }
    }
  }

  return scaling;
}

/**
 * Extract phase memory bits
 */
function extractPhases(rungsXml: string): ExtractedPhase[] {
  const phases: ExtractedPhase[] = [];
  const phaseMap = new Map<string, { symbol: string; type: ExtractedPhase['type']; setConditions: string[]; resetConditions: string[] }>();

  const rungMatches = rungsXml.matchAll(/<RungEntity>([\s\S]*?)<\/RungEntity>/g);

  for (const rungMatch of rungMatches) {
    const rungContent = rungMatch[1];

    const nameMatch = rungContent.match(/<Name>([^<]*)<\/Name>/);
    const rungName = nameMatch ? nameMatch[1] : 'Unknown';
    const rungNameLower = rungName.toLowerCase();

    // Find SET coils for phase bits
    const setCoilRegex = /<ElementType>SetCoil<\/ElementType>[\s\S]*?<Descriptor>(%M\d+)<\/Descriptor>(?:[\s\S]*?<Symbol>([^<]*)<\/Symbol>)?/g;
    let setMatch;
    while ((setMatch = setCoilRegex.exec(rungContent)) !== null) {
      const address = setMatch[1];
      const symbol = setMatch[2] || address;

      // Determine phase type
      let type: ExtractedPhase['type'] = 'unknown';
      const symbolLower = symbol.toLowerCase();
      if (symbolLower.includes('fill') || rungNameLower.includes('fill')) type = 'fill';
      else if (symbolLower.includes('drain') || rungNameLower.includes('drain')) type = 'drain';
      else if (symbolLower.includes('wait') || rungNameLower.includes('wait')) type = 'wait';

      if (!phaseMap.has(address)) {
        phaseMap.set(address, { symbol, type, setConditions: [], resetConditions: [] });
      }
      phaseMap.get(address)!.setConditions.push(rungName);
    }

    // Find RESET coils for phase bits
    const resetCoilRegex = /<ElementType>ResetCoil<\/ElementType>[\s\S]*?<Descriptor>(%M\d+)<\/Descriptor>/g;
    let resetMatch;
    while ((resetMatch = resetCoilRegex.exec(rungContent)) !== null) {
      const address = resetMatch[1];
      if (phaseMap.has(address)) {
        phaseMap.get(address)!.resetConditions.push(rungName);
      }
    }
  }

  phaseMap.forEach((value, address) => {
    phases.push({
      address,
      symbol: value.symbol,
      type: value.type,
      setConditions: value.setConditions,
      resetConditions: value.resetConditions
    });
  });

  return phases;
}

/**
 * Main parsing function
 */
export function parseProgram(smbpContent: string): ProgramParserResult {
  // Extract rungs section
  const rungsMatch = smbpContent.match(/<Rungs>([\s\S]*?)<\/Rungs>/);
  const rungsXml = rungsMatch ? rungsMatch[1] : '';

  // Count rungs
  const rungMatches = rungsXml.match(/<RungEntity>/g) || [];
  const rungCount = rungMatches.length;

  // Extract rung names
  const rungNames: string[] = [];
  const nameMatches = rungsXml.matchAll(/<Name>([^<]+)<\/Name>/g);
  for (const match of nameMatches) {
    rungNames.push(match[1]);
  }

  return {
    comparisons: extractComparisons(rungsXml),
    timers: extractTimers(smbpContent, rungsXml),
    interlocks: extractInterlocks(rungsXml),
    outputs: extractOutputs(rungsXml),
    analogScaling: extractAnalogScaling(rungsXml),
    phases: extractPhases(rungsXml),
    rungCount,
    rungNames
  };
}

/**
 * Get a summary of the parsed program
 */
export function getProgramSummary(result: ProgramParserResult): string {
  const lines: string[] = [];

  lines.push(`Program has ${result.rungCount} rungs`);
  lines.push(`Rung names: ${result.rungNames.join(', ')}`);

  if (result.comparisons.length > 0) {
    lines.push(`\nComparisons (${result.comparisons.length}):`);
    result.comparisons.forEach(c => {
      lines.push(`  - ${c.address} ${c.operator} ${c.value} in "${c.rungName}" -> ${c.outputAddress || 'N/A'}`);
    });
  }

  if (result.timers.length > 0) {
    lines.push(`\nTimers (${result.timers.length}):`);
    result.timers.forEach(t => {
      lines.push(`  - ${t.address}: ${t.preset} ${t.base} (${t.purpose}) in "${t.rungName}"`);
    });
  }

  if (result.interlocks.length > 0) {
    lines.push(`\nInterlocks (${result.interlocks.length}):`);
    result.interlocks.forEach(i => {
      lines.push(`  - ${i.inputSymbol} (${i.inputAddress}) blocks: ${i.blocksOutputs.join(', ')}`);
    });
  }

  if (result.outputs.length > 0) {
    lines.push(`\nOutputs (${result.outputs.length}):`);
    result.outputs.forEach(o => {
      lines.push(`  - ${o.symbol} (${o.address}): ${o.type} in "${o.rungName}"`);
    });
  }

  if (result.phases.length > 0) {
    lines.push(`\nPhases (${result.phases.length}):`);
    result.phases.forEach(p => {
      lines.push(`  - ${p.symbol} (${p.address}): ${p.type}`);
    });
  }

  return lines.join('\n');
}
