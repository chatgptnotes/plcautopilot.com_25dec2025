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

  // Step 1: Add <Comment /> to LadderEntity elements (after Descriptor, before Symbol)
  xml = fixLadderEntityComments(xml);

  // Step 2: Add <Comment /> to InstructionLineEntity elements
  xml = fixInstructionLineComments(xml);

  // Step 3: Fix orphaned "Down" connections (no element at Row+1)
  xml = fixOrphanedDownConnections(xml);

  // Step 4: Ensure Line elements fill gaps between logic and output
  xml = ensureLineElements(xml);

  console.log('[smbp-xml-fixer] Output length:', xml.length);
  console.log('[smbp-xml-fixer] Fix complete');

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
  for (const el of elements) {
    if (el.row === 0) {
      occupiedCols.add(el.col);
      // Timer and Comparison span 2 columns
      if (el.type === 'Timer' || el.type === 'Comparison' || el.type === 'CompareBlock') {
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
      if (el.type === 'Timer' || el.type === 'Comparison' || el.type === 'CompareBlock') {
        endCol = el.col + 2;
      }
      startCol = Math.max(startCol, endCol);
    }
  }

  // Generate missing Line elements
  const missingLines: string[] = [];
  for (let col = startCol; col < outputCol; col++) {
    if (!occupiedCols.has(col)) {
      missingLines.push(`    <LadderEntity>
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
