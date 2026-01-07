/**
 * SMBP XML Fixer
 *
 * Post-processes AI-generated ladder logic XML to match Machine Expert Basic requirements.
 *
 * CRITICAL: Machine Expert Basic requires specific XML element order:
 *
 * For LadderEntity (contacts/coils):
 * 1. <ElementType>
 * 2. <Descriptor>
 * 3. <Comment />  <-- REQUIRED even if empty
 * 4. <Symbol>
 * 5. <Row>
 * 6. <Column>
 * 7. <ChosenConnection>
 *
 * For InstructionLineEntity:
 * 1. <InstructionLine>
 * 2. <Comment />  <-- REQUIRED even if empty
 */

/**
 * Fix AI-generated rungs XML to match Machine Expert Basic requirements
 */
export function fixSmbpXml(xml: string): string {
  if (!xml || xml.trim() === '') {
    return xml;
  }

  console.log('[smbp-xml-fixer] Starting XML fix...');
  console.log('[smbp-xml-fixer] Input length:', xml.length);

  // Step 0: Fix AI typos in XML tags (MUST BE FIRST - before any XML parsing)
  xml = fixXmlTypos(xml);

  // Step 0.1: Remove invalid RungEntity elements (RungNumber, RungDescription not valid in Machine Expert Basic)
  xml = removeInvalidRungElements(xml);

  // Step 0.5: Fix NormalContact/NegatedContact with %MW/%MF addresses (must be Comparisons)
  xml = fixWordFloatContacts(xml);

  // Step 1: Add <Comment /> to LadderEntity elements (after Descriptor, before Symbol)
  xml = fixLadderEntityComments(xml);

  // Step 2: Add <Comment /> to InstructionLineEntity elements
  xml = fixInstructionLineComments(xml);

  // Step 3: Fix orphaned "Down" connections (no element at Row+1)
  xml = fixOrphanedDownConnections(xml);

  // Step 3.5: Fix wide elements (Comparison/Timer/Counter) at Column 0 - MUST start at Column 1
  xml = fixWideElementsAtColumn0(xml);

  // Step 3.6: Fix missing VerticalLine elements for parallel outputs
  xml = fixMissingVerticalLines(xml);

  // Step 4: Ensure Line elements fill gaps between logic and output
  xml = ensureLineElements(xml);

  // Step 5: Inject symbols into hardware configuration (DigitalInputs/DigitalOutputs)
  xml = injectSymbolsToHardwareConfig(xml);

  // Step 6: Fix invalid LD/AND/OR with memory words/floats (must be comparisons)
  xml = fixInvalidWordFloatLoads(xml);

  // Step 7: Fix expansion module addresses (convert %I1.x to valid %I0.x or warn)
  xml = fixExpansionAddresses(xml);

  // Step 8: Fix consecutive %MF addresses (v3.3 rule - must use even numbers only)
  xml = fixConsecutiveMFAddresses(xml);

  // Step 9: Fix analog input Type_NotUsed configuration
  xml = fixAnalogInputTypeNotUsed(xml);

  // Step 10: Warn about complex float operations (too many operators in one expression)
  xml = fixComplexFloatOperations(xml);

  // Step 11: Add Label and IsLadderSelected elements to RungEntity (required by Machine Expert Basic)
  xml = fixRungEntityMissingElements(xml);

  // Step 12: CRITICAL - Normalize indentation inside <Rungs> sections
  // Machine Expert Basic is strict about XML formatting!
  xml = normalizeRungIndentation(xml);

  console.log('[smbp-xml-fixer] Output length:', xml.length);
  console.log('[smbp-xml-fixer] Fix complete');

  return xml;
}

/**
 * Fix consecutive %MF addresses (v3.3 rule)
 * %MF uses 32-bit (2 words), so consecutive addresses cause overlap.
 * This function remaps odd %MF addresses to even numbers.
 *
 * Example: %MF103 -> %MF104, %MF105 -> %MF106
 */
function fixConsecutiveMFAddresses(xml: string): string {
  // Find all %MF addresses used
  const mfMatches = xml.matchAll(/%MF(\d+)/g);
  const mfAddresses = new Set<number>();
  for (const match of mfMatches) {
    mfAddresses.add(parseInt(match[1]));
  }

  // Build remap table for odd addresses > 100 (non-retentive range)
  const remapTable: Record<number, number> = {};
  const sortedAddresses = Array.from(mfAddresses).sort((a, b) => a - b);

  let nextEven = 102; // Start from %MF102
  for (const addr of sortedAddresses) {
    if (addr >= 100) {
      // Non-retentive range - ensure even addresses
      if (addr % 2 !== 0) {
        // Odd address - needs remapping
        // Find next available even address
        while (mfAddresses.has(nextEven) || Object.values(remapTable).includes(nextEven)) {
          nextEven += 2;
        }
        remapTable[addr] = nextEven;
        nextEven += 2;
      } else {
        // Even address - keep track for allocation
        if (addr >= nextEven) {
          nextEven = addr + 2;
        }
      }
    }
  }

  // Apply remapping
  let fixCount = 0;
  for (const [oldAddr, newAddr] of Object.entries(remapTable)) {
    const pattern = new RegExp(`%MF${oldAddr}\\b`, 'g');
    const matches = xml.match(pattern);
    if (matches) {
      fixCount += matches.length;
      xml = xml.replace(pattern, `%MF${newAddr}`);
      console.log(`[smbp-xml-fixer] Remapped %MF${oldAddr} -> %MF${newAddr} (${matches.length} occurrences)`);
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} consecutive %MF addresses (v3.3 rule)`);
  }

  return xml;
}

/**
 * Fix common AI typos in XML tags
 * AI models sometimes generate typos like "LadlerEntity" instead of "LadderEntity"
 */
function fixXmlTypos(xml: string): string {
  const typoFixes: Array<[RegExp, string]> = [
    // LadderEntity typos
    [/<LadlerEntity>/g, '<LadderEntity>'],
    [/<\/LadlerEntity>/g, '</LadderEntity>'],
    [/<LadderEnity>/g, '<LadderEntity>'],
    [/<\/LadderEnity>/g, '</LadderEntity>'],
    [/<LadderEntiy>/g, '<LadderEntity>'],
    [/<\/LadderEntiy>/g, '</LadderEntity>'],
    // RungEntity typos
    [/<RungEnity>/g, '<RungEntity>'],
    [/<\/RungEnity>/g, '</RungEntity>'],
    [/<RunEntity>/g, '<RungEntity>'],
    [/<\/RunEntity>/g, '</RungEntity>'],
    // InstructionLineEntity typos
    [/<InstructionLineEnity>/g, '<InstructionLineEntity>'],
    [/<\/InstructionLineEnity>/g, '</InstructionLineEntity>'],
    // ElementType typos
    [/<ElementTyp>/g, '<ElementType>'],
    [/<\/ElementTyp>/g, '</ElementType>'],
    // ChosenConnection typos
    [/<ChoosenConnection>/g, '<ChosenConnection>'],
    [/<\/ChoosenConnection>/g, '</ChosenConnection>'],
    [/<ChosenConection>/g, '<ChosenConnection>'],
    [/<\/ChosenConection>/g, '</ChosenConnection>'],
  ];

  let fixCount = 0;
  for (const [pattern, replacement] of typoFixes) {
    const matches = xml.match(pattern);
    if (matches) {
      fixCount += matches.length;
      xml = xml.replace(pattern, replacement);
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} XML tag typos`);
  }

  return xml;
}

/**
 * Remove invalid RungEntity child elements that Machine Expert Basic doesn't recognize.
 * AI sometimes generates:
 * - <RungNumber>0</RungNumber>
 * - <RungDescription>some text</RungDescription>
 * These are not valid and cause "file format is invalid" error.
 *
 * Valid RungEntity children are: LadderElements, InstructionLines, Name, MainComment
 */
function removeInvalidRungElements(xml: string): string {
  let fixCount = 0;

  // Remove <RungNumber>...</RungNumber>
  const rungNumberMatches = xml.match(/<RungNumber>[^<]*<\/RungNumber>\s*/g);
  if (rungNumberMatches) {
    fixCount += rungNumberMatches.length;
    xml = xml.replace(/<RungNumber>[^<]*<\/RungNumber>\s*/g, '');
  }

  // Remove <RungDescription>...</RungDescription>
  const rungDescMatches = xml.match(/<RungDescription>[^<]*<\/RungDescription>\s*/g);
  if (rungDescMatches) {
    fixCount += rungDescMatches.length;
    xml = xml.replace(/<RungDescription>[^<]*<\/RungDescription>\s*/g, '');
  }

  // Remove <RungIndex>...</RungIndex> (another invalid element AI might generate)
  const rungIndexMatches = xml.match(/<RungIndex>[^<]*<\/RungIndex>\s*/g);
  if (rungIndexMatches) {
    fixCount += rungIndexMatches.length;
    xml = xml.replace(/<RungIndex>[^<]*<\/RungIndex>\s*/g, '');
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Removed ${fixCount} invalid RungEntity elements (RungNumber/RungDescription/RungIndex)`);
  }

  return xml;
}

/**
 * Fix NormalContact/NegatedContact elements that use %MW/%MF addresses.
 * These must be Comparison elements, not contacts.
 *
 * WRONG: <ElementType>NormalContact</ElementType><Descriptor>%MW10</Descriptor>
 * CORRECT: <ElementType>Comparison</ElementType><ComparisonExpression>%MW10 <> 0</ComparisonExpression>
 *
 * Contacts require BIT addresses (%I, %Q, %M, %S).
 * %MW (Memory Word) and %MF (Memory Float) are NOT bits.
 */
function fixWordFloatContacts(xml: string): string {
  let fixCount = 0;

  // Fix NormalContact with %MW descriptor -> Comparison with <> 0
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>NormalContact<\/ElementType>\s*<Descriptor>(%MW\d+)<\/Descriptor>\s*<Comment[^>]*>([^<]*)<\/Comment>\s*<Symbol>([^<]*)<\/Symbol>\s*<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>([^<]+)<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, address, comment, symbol, row, col, conn) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed NormalContact ${address} -> Comparison ${address} <> 0`);
      return `<LadderEntity>
      <ElementType>Comparison</ElementType>
      <ComparisonExpression>${address} &lt;&gt; 0</ComparisonExpression>
      <Row>${row}</Row>
      <Column>${col}</Column>
      <ChosenConnection>${conn}</ChosenConnection>
    </LadderEntity>`;
    }
  );

  // Fix NegatedContact with %MW descriptor -> Comparison with = 0
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>NegatedContact<\/ElementType>\s*<Descriptor>(%MW\d+)<\/Descriptor>\s*<Comment[^>]*>([^<]*)<\/Comment>\s*<Symbol>([^<]*)<\/Symbol>\s*<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>([^<]+)<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, address, comment, symbol, row, col, conn) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed NegatedContact ${address} -> Comparison ${address} = 0`);
      return `<LadderEntity>
      <ElementType>Comparison</ElementType>
      <ComparisonExpression>${address} = 0</ComparisonExpression>
      <Row>${row}</Row>
      <Column>${col}</Column>
      <ChosenConnection>${conn}</ChosenConnection>
    </LadderEntity>`;
    }
  );

  // Fix NormalContact with %MF descriptor -> Comparison with <> 0.0
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>NormalContact<\/ElementType>\s*<Descriptor>(%MF\d+)<\/Descriptor>\s*<Comment[^>]*>([^<]*)<\/Comment>\s*<Symbol>([^<]*)<\/Symbol>\s*<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>([^<]+)<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, address, comment, symbol, row, col, conn) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed NormalContact ${address} -> Comparison ${address} <> 0.0`);
      return `<LadderEntity>
      <ElementType>Comparison</ElementType>
      <ComparisonExpression>${address} &lt;&gt; 0.0</ComparisonExpression>
      <Row>${row}</Row>
      <Column>${col}</Column>
      <ChosenConnection>${conn}</ChosenConnection>
    </LadderEntity>`;
    }
  );

  // Fix NegatedContact with %MF descriptor -> Comparison with = 0.0
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>NegatedContact<\/ElementType>\s*<Descriptor>(%MF\d+)<\/Descriptor>\s*<Comment[^>]*>([^<]*)<\/Comment>\s*<Symbol>([^<]*)<\/Symbol>\s*<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>([^<]+)<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, address, comment, symbol, row, col, conn) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed NegatedContact ${address} -> Comparison ${address} = 0.0`);
      return `<LadderEntity>
      <ElementType>Comparison</ElementType>
      <ComparisonExpression>${address} = 0.0</ComparisonExpression>
      <Row>${row}</Row>
      <Column>${col}</Column>
      <ChosenConnection>${conn}</ChosenConnection>
    </LadderEntity>`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} NormalContact/NegatedContact with %MW/%MF addresses`);
  }

  return xml;
}

/**
 * Add <Comment /> after <Descriptor> and before <Symbol> in LadderEntity elements
 */
function fixLadderEntityComments(xml: string): string {
  // Pattern: <Descriptor>...</Descriptor> followed by <Symbol> (missing <Comment />)
  const pattern = /(<Descriptor>[^<]*<\/Descriptor>)\s*(<Symbol>)/g;

  return xml.replace(pattern, '$1\n      <Comment />\n      $2');
}

/**
 * Add <Comment /> after <InstructionLine> in InstructionLineEntity elements
 */
function fixInstructionLineComments(xml: string): string {
  // Pattern: <InstructionLine>...</InstructionLine></InstructionLineEntity> (missing <Comment />)
  const pattern = /(<InstructionLine>[^<]*<\/InstructionLine>)\s*(<\/InstructionLineEntity>)/g;

  return xml.replace(pattern, '$1\n      <Comment />\n    $2');
}

/**
 * Fix orphaned "Down" connections - when an element has "Down" in ChosenConnection
 * but there's no element at Row+1 to complete the OR branch
 */
function fixOrphanedDownConnections(xml: string): string {
  // Split into individual rungs
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);

  if (!rungs) {
    return xml;
  }

  let fixedXml = xml;
  let fixCount = 0;

  for (const rung of rungs) {
    // Extract all elements with their positions and connections
    const elementPattern = /<LadderEntity>[\s\S]*?<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>[\s\S]*?<ChosenConnection>([^<]+)<\/ChosenConnection>[\s\S]*?<\/LadderEntity>/g;
    const elements: Array<{ row: number; col: number; connection: string; fullMatch: string }> = [];

    let match;
    while ((match = elementPattern.exec(rung)) !== null) {
      elements.push({
        row: parseInt(match[1]),
        col: parseInt(match[2]),
        connection: match[3],
        fullMatch: match[0],
      });
    }

    // Check each element with "Down" in connection
    for (const el of elements) {
      if (el.connection.includes('Down')) {
        // Check if there's an element at Row+1, same Column
        const hasElementBelow = elements.some(
          other => other.row === el.row + 1 && other.col === el.col
        );

        if (!hasElementBelow) {
          // Remove "Down" from connection
          const oldConnection = el.connection;
          let newConnection = oldConnection
            .replace(/Down,\s*/g, '')
            .replace(/,\s*Down/g, '')
            .replace(/^Down$/g, 'Left, Right');

          // Ensure valid connection remains
          if (!newConnection || newConnection.trim() === '') {
            newConnection = 'Left, Right';
          }

          const oldElement = el.fullMatch;
          const newElement = oldElement.replace(
            `<ChosenConnection>${oldConnection}</ChosenConnection>`,
            `<ChosenConnection>${newConnection}</ChosenConnection>`
          );

          fixedXml = fixedXml.replace(oldElement, newElement);
          fixCount++;
          console.log(`[smbp-xml-fixer] Fixed orphaned Down connection at Row ${el.row}, Col ${el.col}: "${oldConnection}" -> "${newConnection}"`);
        }
      }
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} orphaned Down connections`);
  }

  return fixedXml;
}

/**
 * Fix wide elements (Comparison/Timer/Counter) at Column 0
 * These elements span 2 columns and CANNOT start at Column 0 (power rail location).
 * They must start at Column 1 minimum.
 *
 * Fix strategy:
 * - For OR branch pattern: Add NormalContact with %M0 at Column 0 for each row, shift Comparisons to Column 1
 * - For single element: Add NormalContact, shift element to Column 1
 */
function fixWideElementsAtColumn0(xml: string): string {
  const wideElements = ['Comparison', 'Timer', 'Counter', 'CompareBlock', 'OperateBlock'];

  // Split into individual rungs
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);

  if (!rungs) {
    return xml;
  }

  let fixedXml = xml;
  let fixCount = 0;

  for (const rung of rungs) {
    // Check if this rung has wide elements at Column 0
    const hasWideAtCol0 = wideElements.some(elType =>
      new RegExp(`<ElementType>${elType}<\\/ElementType>[\\s\\S]*?<Column>0<\\/Column>`).test(rung)
    );

    if (!hasWideAtCol0) {
      continue;
    }

    console.log(`[smbp-xml-fixer] Found wide element at Column 0, fixing...`);

    // Extract the LadderElements section
    const ladderMatch = rung.match(/<LadderElements>([\s\S]*?)<\/LadderElements>/);
    if (!ladderMatch) {
      continue;
    }

    const ladderContent = ladderMatch[1];

    // Find all LadderEntity elements with their details
    const entityPattern = /<LadderEntity>([\s\S]*?)<\/LadderEntity>/g;
    const entities: Array<{
      fullMatch: string;
      type: string;
      row: number;
      col: number;
      connection: string;
      descriptor?: string;
      expression?: string;
    }> = [];

    let entityMatch;
    while ((entityMatch = entityPattern.exec(ladderContent)) !== null) {
      const content = entityMatch[1];
      const typeMatch = content.match(/<ElementType>([^<]+)<\/ElementType>/);
      const rowMatch = content.match(/<Row>(\d+)<\/Row>/);
      const colMatch = content.match(/<Column>(\d+)<\/Column>/);
      const connMatch = content.match(/<ChosenConnection>([^<]+)<\/ChosenConnection>/);
      const descMatch = content.match(/<Descriptor>([^<]+)<\/Descriptor>/);
      const exprMatch = content.match(/<ComparisonExpression>([^<]*)<\/ComparisonExpression>/);

      if (typeMatch && rowMatch && colMatch && connMatch) {
        entities.push({
          fullMatch: entityMatch[0],
          type: typeMatch[1],
          row: parseInt(rowMatch[1]),
          col: parseInt(colMatch[1]),
          connection: connMatch[1],
          descriptor: descMatch ? descMatch[1] : undefined,
          expression: exprMatch ? exprMatch[1] : undefined,
        });
      }
    }

    // Find wide elements at Column 0
    const wideAtCol0 = entities.filter(e => wideElements.includes(e.type) && e.col === 0);

    if (wideAtCol0.length === 0) {
      continue;
    }

    // Build replacement content
    let newLadderContent = ladderContent;

    // For each wide element at Column 0, shift it to Column 1
    for (const wideEl of wideAtCol0) {
      const oldEntity = wideEl.fullMatch;

      // Shift to Column 1
      const newEntity = oldEntity.replace(
        /<Column>0<\/Column>/,
        '<Column>1</Column>'
      );

      newLadderContent = newLadderContent.replace(oldEntity, newEntity);
      fixCount++;
      console.log(`[smbp-xml-fixer] Shifted ${wideEl.type} from Column 0 to Column 1 (Row ${wideEl.row})`);
    }

    // Now add NormalContact elements at Column 0 for each row that had wide elements
    // Get unique rows
    const rowsWithWide = [...new Set(wideAtCol0.map(e => e.row))].sort((a, b) => a - b);

    const newContacts: string[] = [];
    for (let i = 0; i < rowsWithWide.length; i++) {
      const row = rowsWithWide[i];
      // Determine connection based on OR branch pattern
      let connection = 'Left, Right';
      if (rowsWithWide.length > 1) {
        if (row === rowsWithWide[0]) {
          // First row in OR branch - needs Down connection
          connection = 'Down, Left, Right';
        } else {
          // Subsequent rows - needs Up connection
          connection = 'Up, Left';
        }
      }

      newContacts.push(`    <LadderEntity>
      <ElementType>NormalContact</ElementType>
      <Descriptor>%M0</Descriptor>
      <Comment />
      <Symbol>SYSTEM_READY</Symbol>
      <Row>${row}</Row>
      <Column>0</Column>
      <ChosenConnection>${connection}</ChosenConnection>
    </LadderEntity>`);
    }

    // Insert new contacts at the beginning of LadderElements
    if (newContacts.length > 0) {
      newLadderContent = '\n' + newContacts.join('\n') + newLadderContent;
      console.log(`[smbp-xml-fixer] Added ${newContacts.length} NormalContact(s) at Column 0`);
    }

    // Update instruction lines if they reference the Comparisons
    // Comparisons at Column 0 in IL start with LD [condition], need to add LD %M0 AND [condition]
    let newRung = rung.replace(ladderContent, newLadderContent);

    // Fix IL code for OR branch pattern: LD [condition] OR [condition2] -> LD %M0 AND [condition] OR [condition2]
    if (wideAtCol0.some(e => e.type === 'Comparison')) {
      // Find the first LD instruction with a comparison
      newRung = newRung.replace(
        /<InstructionLine>LD\s+\[([^\]]+)\]<\/InstructionLine>/,
        '<InstructionLine>LD    %M0</InstructionLine>\n    <InstructionLineEntity><InstructionLine>AND   [$1]</InstructionLine><Comment /></InstructionLineEntity'
      );
    }

    // Replace the original rung
    fixedXml = fixedXml.replace(rung, newRung);
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} wide elements at Column 0`);
  }

  return fixedXml;
}

/**
 * Fix missing VerticalLine elements for parallel outputs.
 * When multiple Operations/Coils exist on different rows in a rung,
 * they need VerticalLine elements at Column 8 to connect the parallel paths.
 *
 * Working structure (Program 50):
 * Row 0: [Contact] → [Lines...] → [Line Down] → [Operation]
 * Row 1:                          [VerticalLine Up,Down,Right] → [Operation Up,Left]
 * Row 2:                          [VerticalLine Up,Right] → [Operation Up,Left]
 *
 * Broken structure (Program 52):
 * Row 0: [Contact] → [Lines...] → [Operation]
 * Row 1:                          [Operation Up,Left] → [None]  <-- Missing VerticalLine!
 */
function fixMissingVerticalLines(xml: string): string {
  // Split into individual rungs
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);

  if (!rungs) {
    return xml;
  }

  let fixedXml = xml;
  let totalFixCount = 0;

  for (const rung of rungs) {
    // Extract LadderElements section
    const ladderMatch = rung.match(/<LadderElements>([\s\S]*?)<\/LadderElements>/);
    if (!ladderMatch) {
      continue;
    }

    const ladderContent = ladderMatch[1];

    // Find all elements with their positions
    const entityPattern = /<LadderEntity>([\s\S]*?)<\/LadderEntity>/g;
    const elements: Array<{
      fullMatch: string;
      type: string;
      row: number;
      col: number;
      connection: string;
    }> = [];

    let entityMatch;
    while ((entityMatch = entityPattern.exec(ladderContent)) !== null) {
      const content = entityMatch[1];
      const typeMatch = content.match(/<ElementType>([^<]+)<\/ElementType>/);
      const rowMatch = content.match(/<Row>(\d+)<\/Row>/);
      const colMatch = content.match(/<Column>(\d+)<\/Column>/);
      const connMatch = content.match(/<ChosenConnection>([^<]+)<\/ChosenConnection>/);

      if (typeMatch && rowMatch && colMatch && connMatch) {
        elements.push({
          fullMatch: entityMatch[0],
          type: typeMatch[1],
          row: parseInt(rowMatch[1]),
          col: parseInt(colMatch[1]),
          connection: connMatch[1],
        });
      }
    }

    // Find parallel outputs (Operations at Column 9 on different rows)
    const outputElements = ['Operation', 'Coil', 'SetCoil', 'ResetCoil'];
    const parallelOutputs = elements.filter(
      e => outputElements.includes(e.type) && e.col === 9
    );

    // Need at least 2 outputs on different rows for parallel structure
    if (parallelOutputs.length < 2) {
      continue;
    }

    const outputRows = [...new Set(parallelOutputs.map(e => e.row))].sort((a, b) => a - b);
    if (outputRows.length < 2) {
      continue;
    }

    // Check if VerticalLine elements already exist at Column 8 for rows > 0
    const existingVerticalLines = elements.filter(
      e => e.type === 'VerticalLine' && e.col === 8
    );
    const existingVLRows = new Set(existingVerticalLines.map(e => e.row));

    // Find rows that need VerticalLine elements (all rows > 0 with outputs)
    const rowsNeedingVL = outputRows.filter(row => row > 0 && !existingVLRows.has(row));

    if (rowsNeedingVL.length === 0) {
      continue;
    }

    console.log(`[smbp-xml-fixer] Found parallel outputs on rows ${outputRows.join(', ')}, adding VerticalLine elements for rows ${rowsNeedingVL.join(', ')}`);

    let newLadderContent = ladderContent;
    let fixCount = 0;

    // Remove None elements at Column 10 for rows > 0 (these are invalid)
    for (const row of rowsNeedingVL) {
      const nonePattern = new RegExp(
        `<LadderEntity>\\s*<ElementType>None<\\/ElementType>\\s*<Row>${row}<\\/Row>\\s*<Column>10<\\/Column>\\s*<ChosenConnection>None<\\/ChosenConnection>\\s*<\\/LadderEntity>`,
        'g'
      );
      newLadderContent = newLadderContent.replace(nonePattern, '');
    }

    // Add VerticalLine elements at Column 8 for each row needing them
    const verticalLines: string[] = [];
    for (let i = 0; i < rowsNeedingVL.length; i++) {
      const row = rowsNeedingVL[i];
      // Determine connection based on position
      // First VL row: Up, Down, Right (if more rows below)
      // Middle rows: Up, Down, Right
      // Last row: Up, Right
      const isLast = i === rowsNeedingVL.length - 1 && !outputRows.includes(row + 1);
      const connection = isLast ? 'Up, Right' : 'Up, Down, Right';

      verticalLines.push(`    <LadderEntity>
      <ElementType>VerticalLine</ElementType>
      <Row>${row}</Row>
      <Column>8</Column>
      <ChosenConnection>${connection}</ChosenConnection>
    </LadderEntity>`);
      fixCount++;
    }

    // Insert VerticalLine elements before the first output at Row > 0
    if (verticalLines.length > 0) {
      // Find the first output element at Row > 0 to insert before
      const firstNonZeroOutput = parallelOutputs.find(e => e.row > 0);
      if (firstNonZeroOutput) {
        newLadderContent = newLadderContent.replace(
          firstNonZeroOutput.fullMatch,
          verticalLines.join('\n') + '\n' + firstNonZeroOutput.fullMatch
        );
      }
    }

    // Update Line at Column 8, Row 0 to have Down connection if it exists
    const lineAtCol8Row0 = elements.find(e => e.type === 'Line' && e.col === 8 && e.row === 0);
    if (lineAtCol8Row0 && !lineAtCol8Row0.connection.includes('Down')) {
      const oldLine = lineAtCol8Row0.fullMatch;
      const newConnection = lineAtCol8Row0.connection.replace('Left, Right', 'Down, Left, Right');
      const newLine = oldLine.replace(
        `<ChosenConnection>${lineAtCol8Row0.connection}</ChosenConnection>`,
        `<ChosenConnection>${newConnection}</ChosenConnection>`
      );
      newLadderContent = newLadderContent.replace(oldLine, newLine);
    }

    // Replace the rung in the XML
    if (fixCount > 0) {
      const newRung = rung.replace(ladderContent, newLadderContent);
      fixedXml = fixedXml.replace(rung, newRung);
      totalFixCount += fixCount;
    }
  }

  if (totalFixCount > 0) {
    console.log(`[smbp-xml-fixer] Added ${totalFixCount} VerticalLine elements for parallel outputs`);
  }

  return fixedXml;
}

/**
 * Ensure Line elements fill all gaps between logic elements and output coil
 */
function ensureLineElements(xml: string): string {
  // Split into individual rungs
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);

  if (!rungs) {
    return xml;
  }

  console.log(`[smbp-xml-fixer] Processing ${rungs.length} rungs for Line elements`);

  let fixedXml = xml;

  for (let i = 0; i < rungs.length; i++) {
    const originalRung = rungs[i];
    const fixedRung = fixRungLineElements(originalRung, i);

    if (fixedRung !== originalRung) {
      fixedXml = fixedXml.replace(originalRung, fixedRung);
    }
  }

  return fixedXml;
}

/**
 * Fix Line elements in a single rung
 */
function fixRungLineElements(rung: string, rungIndex: number): string {
  // Extract LadderElements section
  const ladderMatch = rung.match(/<LadderElements>([\s\S]*?)<\/LadderElements>/);
  if (!ladderMatch) {
    return rung;
  }

  const ladderContent = ladderMatch[1];

  // Find all elements with their row/column
  const elementPattern = /<LadderEntity>[\s\S]*?<ElementType>([^<]+)<\/ElementType>[\s\S]*?<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>[\s\S]*?<\/LadderEntity>/g;
  const elements: Array<{ type: string; row: number; col: number }> = [];

  let match;
  while ((match = elementPattern.exec(ladderContent)) !== null) {
    elements.push({
      type: match[1],
      row: parseInt(match[2]),
      col: parseInt(match[3]),
    });
  }

  if (elements.length === 0) {
    return rung;
  }

  // Find occupied columns on row 0
  const occupiedCols = new Set<number>();
  // Elements that span 2 columns in Machine Expert Basic
  const twoColumnElements = ['Timer', 'Comparison', 'CompareBlock', 'Counter', 'OperateBlock'];

  for (const el of elements) {
    if (el.row === 0) {
      occupiedCols.add(el.col);
      // Timer, Comparison, Counter, OperateBlock span 2 columns
      if (twoColumnElements.includes(el.type)) {
        occupiedCols.add(el.col + 1);
      }
    }
  }

  // Find output column (Coil at col 9 or 10)
  const outputElement = elements.find(
    e => (e.type === 'Coil' || e.type === 'SetCoil' || e.type === 'ResetCoil' || e.type === 'Operation') && e.col >= 9
  );

  if (!outputElement) {
    return rung;
  }

  const outputCol = outputElement.col;

  // Find rightmost logic element (excluding output and lines)
  let startCol = 1;
  for (const el of elements) {
    if (el.row === 0 && el.col < outputCol && el.type !== 'Line' && el.type !== 'None') {
      let endCol = el.col + 1;
      // 2-column elements end 2 columns after their start
      if (twoColumnElements.includes(el.type)) {
        endCol = el.col + 2;
      }
      startCol = Math.max(startCol, endCol);
    }
  }

  // Generate missing Line elements - Line elements are SIMPLE (no Descriptor/Comment/Symbol)
  // Based on working Sample program.smbp
  const missingLines: string[] = [];
  for (let col = startCol; col < outputCol; col++) {
    if (!occupiedCols.has(col)) {
      missingLines.push(`              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>${col}</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`);
    }
  }

  if (missingLines.length === 0) {
    return rung;
  }

  console.log(`[smbp-xml-fixer] Rung ${rungIndex}: Adding ${missingLines.length} Line elements (cols ${startCol} to ${outputCol - 1})`);

  // Insert Line elements before </LadderElements>
  const newLadderContent = ladderContent.trimEnd() + '\n' + missingLines.join('\n') + '\n  ';
  return rung.replace(ladderContent, newLadderContent);
}

/**
 * Extract symbols from ladder rungs and inject them into hardware configuration
 * This ensures symbols appear in the I/O table in Machine Expert Basic
 */
function injectSymbolsToHardwareConfig(xml: string): string {
  // Extract all symbols used in ladder logic with their addresses
  const symbolMap = new Map<string, { symbol: string; comment: string }>();

  // Pattern to match LadderEntity with Descriptor and Symbol
  const ladderPattern = /<LadderEntity>[\s\S]*?<Descriptor>([^<]+)<\/Descriptor>[\s\S]*?<Symbol>([^<]*)<\/Symbol>[\s\S]*?<\/LadderEntity>/g;

  let match;
  while ((match = ladderPattern.exec(xml)) !== null) {
    const address = match[1].trim();
    const symbol = match[2].trim();

    // Only process I/O addresses (%I, %Q) with valid symbols
    if (symbol && (address.startsWith('%I0.') || address.startsWith('%Q0.'))) {
      // Extract comment if present
      const commentMatch = match[0].match(/<Comment>([^<]*)<\/Comment>/);
      const comment = commentMatch ? commentMatch[1].trim() : '';

      if (!symbolMap.has(address)) {
        symbolMap.set(address, { symbol, comment });
      }
    }
  }

  if (symbolMap.size === 0) {
    console.log('[smbp-xml-fixer] No I/O symbols to inject');
    return xml;
  }

  console.log(`[smbp-xml-fixer] Found ${symbolMap.size} I/O symbols to inject`);

  // Inject symbols into DigitalInputs section
  for (const [address, { symbol, comment }] of symbolMap) {
    if (address.startsWith('%I0.')) {
      xml = injectSymbolToDiscretInput(xml, address, symbol, comment);
    } else if (address.startsWith('%Q0.')) {
      xml = injectSymbolToDiscretOutput(xml, address, symbol, comment);
    }
  }

  return xml;
}

/**
 * Inject symbol into a DiscretInput element in the hardware configuration
 */
function injectSymbolToDiscretInput(xml: string, address: string, symbol: string, comment: string): string {
  // Pattern to find the DiscretInput with this address
  const pattern = new RegExp(
    `(<DiscretInput>\\s*<Address>${escapeRegex(address)}<\\/Address>\\s*<Index>\\d+<\\/Index>)(\\s*<DIFiltering>)`,
    'g'
  );

  const replacement = `$1\n            <Symbol>${symbol}</Symbol>${comment ? `\n            <Comment>${comment}</Comment>` : ''}$2`;

  const newXml = xml.replace(pattern, replacement);

  if (newXml !== xml) {
    console.log(`[smbp-xml-fixer] Injected symbol "${symbol}" for ${address}`);
  }

  return newXml;
}

/**
 * Inject symbol into a DiscretOutput element in the hardware configuration
 */
function injectSymbolToDiscretOutput(xml: string, address: string, symbol: string, comment: string): string {
  // Pattern to find the DiscretOutput with this address
  // DiscretOutput format: <Address>%Q0.x</Address><Index>x</Index><DOValue>...</DOValue>
  const pattern = new RegExp(
    `(<DiscretOutput>\\s*<Address>${escapeRegex(address)}<\\/Address>\\s*<Index>\\d+<\\/Index>)(\\s*<DOValue>)`,
    'g'
  );

  const replacement = `$1\n            <Symbol>${symbol}</Symbol>${comment ? `\n            <Comment>${comment}</Comment>` : ''}$2`;

  const newXml = xml.replace(pattern, replacement);

  if (newXml !== xml) {
    console.log(`[smbp-xml-fixer] Injected symbol "${symbol}" for ${address}`);
  }

  return newXml;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fix invalid LD/AND/OR instructions that use memory words (%MW) or floats (%MF) directly.
 * These must be comparisons, not direct loads.
 *
 * WRONG: LD    %MW0   (cannot load a word as boolean)
 * CORRECT: LD    [%MW0 <> 0]  (compare word to value)
 *
 * WRONG: AND   %MF102  (cannot AND with a float)
 * CORRECT: AND   [%MF102 <> 0.0]  (compare float to value)
 */
function fixInvalidWordFloatLoads(xml: string): string {
  let fixCount = 0;

  // Fix LD %MW - convert to comparison
  xml = xml.replace(
    /<InstructionLine>(LD\s+)(%MW\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "LD ${address}" -> "LD [${address} <> 0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0]${suffix}`;
    }
  );

  // Fix AND %MW - convert to comparison
  xml = xml.replace(
    /<InstructionLine>(AND\s+)(%MW\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "AND ${address}" -> "AND [${address} <> 0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0]${suffix}`;
    }
  );

  // Fix OR %MW - convert to comparison
  xml = xml.replace(
    /<InstructionLine>(OR\s+)(%MW\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "OR ${address}" -> "OR [${address} <> 0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0]${suffix}`;
    }
  );

  // Fix LD %MF - convert to comparison with 0.0
  xml = xml.replace(
    /<InstructionLine>(LD\s+)(%MF\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "LD ${address}" -> "LD [${address} <> 0.0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0.0]${suffix}`;
    }
  );

  // Fix AND %MF - convert to comparison with 0.0
  xml = xml.replace(
    /<InstructionLine>(AND\s+)(%MF\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "AND ${address}" -> "AND [${address} <> 0.0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0.0]${suffix}`;
    }
  );

  // Fix OR %MF - convert to comparison with 0.0
  xml = xml.replace(
    /<InstructionLine>(OR\s+)(%MF\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "OR ${address}" -> "OR [${address} <> 0.0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0.0]${suffix}`;
    }
  );

  // Fix OR( %MW - OR with parenthesis (nested OR block)
  xml = xml.replace(
    /<InstructionLine>(OR\(\s+)(%MW\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "OR( ${address}" -> "OR( [${address} <> 0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0]${suffix}`;
    }
  );

  // Fix AND( %MW - AND with parenthesis (nested AND block)
  xml = xml.replace(
    /<InstructionLine>(AND\(\s+)(%MW\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "AND( ${address}" -> "AND( [${address} <> 0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0]${suffix}`;
    }
  );

  // Fix OR( %MF - OR with parenthesis for floats
  xml = xml.replace(
    /<InstructionLine>(OR\(\s+)(%MF\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "OR( ${address}" -> "OR( [${address} <> 0.0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0.0]${suffix}`;
    }
  );

  // Fix AND( %MF - AND with parenthesis for floats
  xml = xml.replace(
    /<InstructionLine>(AND\(\s+)(%MF\d+)(<\/InstructionLine>)/g,
    (match, prefix, address, suffix) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed invalid "AND( ${address}" -> "AND( [${address} <> 0.0]"`);
      return `<InstructionLine>${prefix}[${address} <> 0.0]${suffix}`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} invalid word/float load instructions`);
  }

  return xml;
}

/**
 * Fix expansion module addresses (%I1.x, %Q1.x, etc.)
 * These addresses require expansion modules which may not be configured.
 * Convert them to memory bits or higher base addresses to prevent errors.
 *
 * TM221CE24T has: %I0.0-%I0.13 (14 inputs), %Q0.0-%Q0.9 (10 outputs)
 * %I1.x, %I2.x, %Q1.x, %Q2.x require expansion modules
 */
function fixExpansionAddresses(xml: string): string {
  let fixCount = 0;

  // Map expansion input addresses to memory bits
  // %I1.0 -> %M10, %I1.1 -> %M11, etc.
  xml = xml.replace(
    /%I([1-9])\.(\d+)/g,
    (match, slot, bit) => {
      const memoryBit = 10 + (parseInt(slot) - 1) * 10 + parseInt(bit);
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed expansion address "${match}" -> "%M${memoryBit}"`);
      return `%M${memoryBit}`;
    }
  );

  // Map expansion output addresses to memory bits
  // %Q1.0 -> %M50, %Q1.1 -> %M51, etc.
  xml = xml.replace(
    /%Q([1-9])\.(\d+)/g,
    (match, slot, bit) => {
      const memoryBit = 50 + (parseInt(slot) - 1) * 10 + parseInt(bit);
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed expansion address "${match}" -> "%M${memoryBit}"`);
      return `%M${memoryBit}`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} expansion module addresses (converted to memory bits)`);
  }

  return xml;
}

/**
 * Fix analog input Type_NotUsed configuration.
 * When %IW1.x addresses are used in the program but the analog input type
 * is set to Type_NotUsed (31), change it to Type_0_20mA (2) as a default.
 *
 * Type values for Schneider analog inputs:
 * - 0: Type_NotUsed (legacy)
 * - 1: Type_0_10V
 * - 2: Type_0_20mA
 * - 3: Type_4_20mA
 * - 31: Type_NotUsed
 */
function fixAnalogInputTypeNotUsed(xml: string): string {
  let fixCount = 0;

  // Find all %IW1.x addresses used in the program
  const iwUsed = new Set<string>();
  const iwPattern = /%IW1\.(\d+)/g;
  let match;
  while ((match = iwPattern.exec(xml)) !== null) {
    iwUsed.add(match[0]);
  }

  if (iwUsed.size === 0) {
    return xml;
  }

  console.log(`[smbp-xml-fixer] Found analog inputs used in program: ${Array.from(iwUsed).join(', ')}`);

  // Fix Type_NotUsed (value 31) to Type_0_20mA (value 2) for each used channel
  for (const iwAddr of iwUsed) {
    // Pattern to match the AnalogIO block for this address with Type_NotUsed
    const pattern = new RegExp(
      `(<AnalogIO>\\s*<Address>${escapeRegex(iwAddr)}<\\/Address>[\\s\\S]*?<Type>\\s*<Value>)31(<\\/Value>\\s*<Name>)Type_NotUsed(<\\/Name>\\s*<\\/Type>)`,
      'g'
    );

    const newXml = xml.replace(pattern, '$12$2Type_0_20mA$3');
    if (newXml !== xml) {
      xml = newXml;
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed ${iwAddr} analog input type: Type_NotUsed -> Type_0_20mA`);
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} analog input Type_NotUsed configurations`);
  }

  return xml;
}

/**
 * Fix complex float operations that have too many operators.
 * Machine Expert Basic has limits on expression complexity.
 *
 * WRONG: %MF108 := (%MF106 - 2000.0) / 8000.0 * 2700.0 + 300.0
 * This has 4 operations: subtract, divide, multiply, add
 *
 * The AI should generate separate rungs, but as a post-processor
 * we can at least warn about overly complex expressions.
 * For now, we simplify by removing extra operations from the expression.
 *
 * Note: A full fix would require creating new rungs with intermediate
 * variables, which is complex. For now, we flag these as warnings.
 */
function fixComplexFloatOperations(xml: string): string {
  // Count operators in Operation expressions
  const opPattern = /<OperationExpression>([^<]+)<\/OperationExpression>/g;
  let match;
  let warnCount = 0;

  while ((match = opPattern.exec(xml)) !== null) {
    const expr = match[1];
    // Count math operators (not including := assignment)
    const operators = expr.match(/[\+\-\*\/]/g);
    if (operators && operators.length > 2) {
      warnCount++;
      console.warn(`[smbp-xml-fixer] WARNING: Complex expression with ${operators.length} operators: ${expr}`);
      console.warn(`[smbp-xml-fixer] This may cause errors in Machine Expert Basic. Consider splitting into multiple rungs.`);
    }
  }

  if (warnCount > 0) {
    console.warn(`[smbp-xml-fixer] Found ${warnCount} complex float operations that may need manual splitting`);
  }

  return xml;
}

/**
 * Fix RungEntity elements by adding required Label and IsLadderSelected elements.
 * Machine Expert Basic requires these elements in each RungEntity.
 *
 * Before: </MainComment></RungEntity>
 * After:  </MainComment><Label /><IsLadderSelected>true</IsLadderSelected></RungEntity>
 */
function fixRungEntityMissingElements(xml: string): string {
  let fixCount = 0;

  // Check if RungEntity elements are missing Label and IsLadderSelected
  // Add them before </RungEntity> if not present
  const rungPattern = /<RungEntity>([\s\S]*?)<\/RungEntity>/g;

  xml = xml.replace(rungPattern, (match, content) => {
    // Check if Label is already present
    if (match.includes('<Label')) {
      return match; // Already has Label, skip
    }

    // Check if MainComment is present (add after it) or Name (add after it)
    if (match.includes('</MainComment>')) {
      fixCount++;
      return match.replace(
        /<\/MainComment>\s*<\/RungEntity>/,
        '</MainComment>\n            <Label />\n            <IsLadderSelected>true</IsLadderSelected>\n          </RungEntity>'
      );
    } else if (match.includes('</Name>') && !match.includes('<MainComment')) {
      // Has Name but no MainComment
      fixCount++;
      return match.replace(
        /<\/Name>\s*<\/RungEntity>/,
        '</Name>\n            <MainComment />\n            <Label />\n            <IsLadderSelected>true</IsLadderSelected>\n          </RungEntity>'
      );
    } else if (match.includes('</InstructionLines>') && !match.includes('<Name>')) {
      // Has InstructionLines but no Name or MainComment
      fixCount++;
      return match.replace(
        /<\/InstructionLines>\s*<\/RungEntity>/,
        '</InstructionLines>\n            <Name />\n            <MainComment />\n            <Label />\n            <IsLadderSelected>true</IsLadderSelected>\n          </RungEntity>'
      );
    }

    return match;
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Added Label and IsLadderSelected to ${fixCount} RungEntity elements`);
  }

  return xml;
}

/**
 * CRITICAL: Normalize indentation inside <Rungs> sections.
 * Machine Expert Basic is strict about XML formatting - wrong indentation
 * causes "file format is invalid" error!
 *
 * Working template indentation (from Multi POU template.smbp):
 * - <RungEntity> at 10 spaces
 * - <LadderElements>, <InstructionLines>, <Name>, <MainComment>, <Label>, <IsLadderSelected> at 12 spaces
 * - </LadderElements>, </InstructionLines> at 12 spaces
 * - <LadderEntity>, </LadderEntity> at 14 spaces
 * - <InstructionLineEntity>, </InstructionLineEntity> at 14 spaces
 * - Content inside LadderEntity/InstructionLineEntity at 16 spaces
 *
 * IMPORTANT: Each element must be on its own line!
 */
function normalizeRungIndentation(xml: string): string {
  // Process each <Rungs>...</Rungs> section
  const rungsPattern = /<Rungs>([\s\S]*?)<\/Rungs>/g;

  let fixCount = 0;

  xml = xml.replace(rungsPattern, (match, content) => {
    // Step 1: Split concatenated elements onto separate lines
    // Add newline before opening tags (except first)
    let normalized = content
      .replace(/><(?!\/)/g, '>\n<')  // "><Tag" -> ">\n<Tag"
      .replace(/><\//g, '>\n</')      // "></Tag" -> ">\n</Tag"
      .replace(/([^>\s])<\//g, '$1\n</'); // "text</Tag" -> "text\n</Tag" for closing tags after content

    const lines = normalized.split('\n');
    const normalizedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let indentedLine: string;

      // RungEntity level (10 spaces)
      if (trimmed.startsWith('<RungEntity>') || trimmed.startsWith('</RungEntity>')) {
        indentedLine = '          ' + trimmed;
      }
      // Direct children of RungEntity (12 spaces)
      else if (
        trimmed.startsWith('<LadderElements>') || trimmed.startsWith('</LadderElements>') ||
        trimmed.startsWith('<InstructionLines>') || trimmed.startsWith('</InstructionLines>') ||
        trimmed.startsWith('<Name>') || trimmed.startsWith('<Name />') || trimmed.startsWith('<Name/>') ||
        trimmed.startsWith('<MainComment>') || trimmed.startsWith('<MainComment />') || trimmed.startsWith('<MainComment/>') ||
        trimmed.startsWith('<Label') ||
        trimmed.startsWith('<IsLadderSelected>')
      ) {
        indentedLine = '            ' + trimmed;
      }
      // LadderEntity and InstructionLineEntity (14 spaces)
      else if (
        trimmed.startsWith('<LadderEntity>') || trimmed.startsWith('</LadderEntity>') ||
        trimmed.startsWith('<InstructionLineEntity>') || trimmed.startsWith('</InstructionLineEntity>')
      ) {
        indentedLine = '              ' + trimmed;
      }
      // Content inside LadderEntity/InstructionLineEntity (16 spaces)
      else {
        indentedLine = '                ' + trimmed;
      }

      normalizedLines.push(indentedLine);
      fixCount++;
    }

    return '<Rungs>\n' + normalizedLines.join('\n') + '\n        </Rungs>';
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Normalized indentation for ${fixCount} lines inside <Rungs> sections`);
  }

  return xml;
}
