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

  // Step 0.05: Fix "undefined" preset values in TimerTM elements
  xml = fixUndefinedTimerPresets(xml);

  // Step 0.1: Remove invalid RungEntity elements (RungNumber, RungDescription not valid in Machine Expert Basic)
  xml = removeInvalidRungElements(xml);

  // Step 0.2: CRITICAL - Replace invalid <LadderElement> with valid <LadderEntity>
  // The AI sometimes generates <LadderElement> but Machine Expert Basic only accepts <LadderEntity>
  xml = fixInvalidLadderElementTag(xml);

  // Step 0.3: Convert <TimerTM> to <Descriptor> in Timer LadderEntity
  // <TimerTM> is valid in Timers section but NOT in LadderEntity
  xml = fixTimerTMInLadderEntity(xml);

  // Step 0.4: Fix Operation elements - convert Descriptor to OperationExpression and remove Comment/Symbol
  xml = fixOperationElementFormat(xml);

  // Step 0.5: Fix NormalContact/NegatedContact with %MW/%MF addresses (must be Comparisons)
  xml = fixWordFloatContacts(xml);

  // Step 0.6: CRITICAL - Fix direct %IW usage in INT_TO_REAL (v3.0/v3.11 rule)
  // The AI sometimes generates INT_TO_REAL(%IW1.0) directly, but %IW must be copied to %MW first
  xml = fixDirectIWUsage(xml);

  // Step 1: Add <Comment /> to LadderEntity elements (after Descriptor, before Symbol)
  xml = fixLadderEntityComments(xml);

  // Step 1.05: Add <Comment /> and <Symbol /> when Descriptor is followed directly by Row
  xml = fixMissingCommentSymbolBeforeRow(xml);

  // Step 1.1: Fix Timer elements missing Comment/Symbol after Descriptor
  xml = fixTimerElementMissingCommentSymbol(xml);

  // Step 1.2: Convert wrong Timer format (TimerType/TimerAddress) to correct Descriptor format
  xml = fixWrongTimerFormat(xml);

  // Step 1.3: Remove invalid Timer elements from LadderEntity (TimerType, Preset, PresetValue)
  xml = removeInvalidTimerLadderElements(xml);

  // Step 1.5: Fix bare InstructionLine tags (must be wrapped with InstructionLineEntity)
  xml = fixBareInstructionLines(xml);

  // Step 1.6: CRITICAL - Fix missing </InstructionLine> closing tag
  // AI sometimes generates: <InstructionLine>content</InstructionLineEntity> (missing </InstructionLine>)
  // This causes "file format is invalid" error in Machine Expert Basic
  xml = fixMissingInstructionLineClosingTag(xml);

  // Step 2: Add <Comment /> to InstructionLineEntity elements
  xml = fixInstructionLineComments(xml);

  // Step 2.5: CRITICAL - Expand single-line InstructionLineEntity to multi-line format
  // Machine Expert Basic requires multi-line format with proper indentation
  xml = expandInstructionLineEntityFormat(xml);

  // Step 3: Fix orphaned "Down" connections (no element at Row+1)
  xml = fixOrphanedDownConnections(xml);

  // Step 3.4: Fix OR branches where Comparison on Row 1 needs merge element at Column 3
  // Comparisons span 2 columns (1-2), so Row 1 must have VerticalLine at col 3 to merge back
  xml = fixOrBranchAfterComparison(xml);

  // Step 3.4b: Fix parallel branches with separate outputs (Row 0 and Row 1 each have output at col 10)
  // This handles SetCoil/ResetCoil patterns where both rows need complete paths
  xml = fixParallelBranchesWithSeparateOutputs(xml);

  // Step 3.4c: DISABLED - This was incorrectly "fixing" valid OR branches
  // The corrected pattern shows "Up, Left" IS CORRECT for OR merge, not "Up, Right"
  // xml = fixOrBranchContactConnections(xml);

  // Step 3.4e: Fix parallel output connections where outputs on Row 1+ have "Up, Left" instead of "Left"
  // Parallel outputs at Column 9/10 should have just "Left" connection - not "Up, Left"
  xml = fixParallelOutputConnections(xml);

  // Step 3.4f: Fix OR branch contacts at Row 1+ Column 0 with incorrect "Right" connection
  // OR branches where Row 1 contact has "Up, Left, Right" should be "Up, Left" (merge up only)
  xml = fixOrBranchRow1Connections(xml);

  // Step 3.4d: Fix None elements at Col 9 before outputs at Col 10
  // None elements don't carry signal - replace with Line elements for parallel outputs
  xml = fixNoneElementsBeforeOutputs(xml);

  // Step 3.5: Fix wide elements (Comparison/Timer/Counter) at Column 0 - MUST start at Column 1
  xml = fixWideElementsAtColumn0(xml);

  // Step 3.6: Fix missing VerticalLine elements for parallel outputs
  xml = fixMissingVerticalLines(xml);

  // Step 3.7: Fix invalid VerticalLine elements at Row 0 (Row 0 cannot have "Up" connection)
  xml = fixInvalidVerticalLinesAtRow0(xml);

  // Step 3.8: Fix invalid connection patterns (Right-only, Down-only)
  xml = fixInvalidRightOnlyConnections(xml);

  // Step 3.9: Fix timer preset format (t#3s -> 3)
  xml = fixTimerPresetFormat(xml);

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

  // Step 12: Remove empty Descriptor elements from Line elements
  // Line elements should NOT have Descriptor tags - working template has 0, but AI generates them
  xml = removeEmptyDescriptorsFromLineElements(xml);

  // Step 13: CRITICAL - Normalize indentation inside <Rungs> sections
  // Machine Expert Basic is strict about XML formatting!
  xml = normalizeRungIndentation(xml);

  // Step 13.5: CRITICAL - Normalize indentation inside <HardwareConfiguration> section
  // AI generates tags like </AnalogIO> and <ModuleExtensionObject> at column 0 (no indentation)
  // This causes "file format is invalid" error in Machine Expert Basic
  xml = normalizeHardwareConfigIndentation(xml);

  // Step 14: CRITICAL - Normalize line endings to CRLF (Windows format)
  // Machine Expert Basic requires consistent CRLF line endings!
  xml = normalizeLineEndings(xml);

  // Step 14.5: Convert empty element pairs to self-closing format
  // Machine Expert Basic requires <Symbol /> not <Symbol></Symbol>
  xml = convertEmptyElementsToSelfClosing(xml);

  // Step 15: SAFETY NET - Fix unbalanced InstructionLineEntity tags
  xml = fixUnbalancedInstructionLineEntity(xml);

  // Step 16: SAFETY NET - Fix unbalanced LadderEntity tags
  xml = fixUnbalancedLadderEntity(xml);

  // Step 17: CRITICAL - Clean up stray empty lines that cause parse errors
  // When modules are removed or substituted, empty lines are left behind
  // Machine Expert Basic XML parser fails on these stray empty lines
  xml = cleanEmptyLines(xml);

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
    [/<LladderEntity>/g, '<LadderEntity>'],
    [/<\/LladderEntity>/g, '</LadderEntity>'],
    // LadderElements typos (AI sometimes generates "Lladder" with double L)
    [/<LladderElements>/g, '<LadderElements>'],
    [/<\/LladderElements>/g, '</LadderElements>'],
    [/<LadlerElements>/g, '<LadderElements>'],
    [/<\/LadlerElements>/g, '</LadderElements>'],
    // IsLadderSelected typos
    [/<IsLladderSelected>/g, '<IsLadderSelected>'],
    [/<\/IsLladderSelected>/g, '</IsLadderSelected>'],
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
    [/<ChosenCollection>/g, '<ChosenConnection>'],
    [/<\/ChosenCollection>/g, '</ChosenConnection>'],
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
 * Fix invalid "undefined" preset values in TimerTM elements.
 * Machine Expert Basic requires numeric preset values.
 * AI sometimes generates <Preset>undefined</Preset> which is invalid.
 */
function fixUndefinedTimerPresets(xml: string): string {
  let fixCount = 0;

  xml = xml.replace(/<Preset>undefined<\/Preset>/g, () => {
    fixCount++;
    return '<Preset>1000</Preset>';
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} undefined timer presets -> 1000`);
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
 * CRITICAL: Replace invalid <LadderElement> with valid <LadderEntity>
 * The AI sometimes generates <LadderElement> but Machine Expert Basic
 * only accepts <LadderEntity> tags inside <LadderElements>.
 *
 * Working template uses <LadderEntity> (46 instances, 0 LadderElement)
 * Invalid generated files use <LadderElement> (causes "file format is invalid")
 */
function fixInvalidLadderElementTag(xml: string): string {
  let fixCount = 0;

  // Count and replace opening tags
  const openingMatches = xml.match(/<LadderElement>/g);
  if (openingMatches) {
    fixCount = openingMatches.length;
    xml = xml.replace(/<LadderElement>/g, '<LadderEntity>');
  }

  // Replace closing tags
  xml = xml.replace(/<\/LadderElement>/g, '</LadderEntity>');

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Replaced ${fixCount} invalid <LadderElement> tags with <LadderEntity>`);
  }

  return xml;
}

/**
 * Convert <TimerTM>%TMx</TimerTM> to <Descriptor>%TMx</Descriptor> in Timer LadderEntity.
 *
 * <TimerTM> is VALID inside the <Timers> section (for timer declarations),
 * but it is INVALID inside <LadderEntity> (for timer elements in rungs).
 *
 * WRONG (inside LadderEntity):
 * <ElementType>Timer</ElementType>
 * <TimerTM>%TM0</TimerTM>     <-- Should be <Descriptor>
 *
 * CORRECT:
 * <ElementType>Timer</ElementType>
 * <Descriptor>%TM0</Descriptor>
 */
function fixTimerTMInLadderEntity(xml: string): string {
  let fixCount = 0;

  // Convert <TimerTM>%TMx</TimerTM> to <Descriptor>%TMx</Descriptor>
  // ONLY when it follows <ElementType>Timer</ElementType> (inside LadderEntity)
  xml = xml.replace(
    /(<ElementType>Timer<\/ElementType>\s*)<TimerTM>(%TM\d+)<\/TimerTM>/g,
    (match, prefix, timerAddr) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Converted <TimerTM>${timerAddr}</TimerTM> to <Descriptor>${timerAddr}</Descriptor>`);
      return `${prefix}<Descriptor>${timerAddr}</Descriptor>`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Converted ${fixCount} <TimerTM> to <Descriptor> in LadderEntity`);
  }

  return xml;
}

/**
 * Fix Operation element format.
 *
 * Operation elements should use <OperationExpression>, NOT <Descriptor>,
 * and should NOT have <Comment /> or <Symbol /> elements.
 *
 * WRONG (AI sometimes generates this):
 * <ElementType>Operation</ElementType>
 * <Descriptor>%MW10 := 0</Descriptor>
 * <Comment />
 * <Symbol />
 * <Row>0</Row>
 *
 * CORRECT (template format):
 * <ElementType>Operation</ElementType>
 * <OperationExpression>%MW10 := 0</OperationExpression>
 * <Row>0</Row>
 */
function fixOperationElementFormat(xml: string): string {
  let fixCount = 0;

  // Fix 1: Convert <Descriptor> to <OperationExpression> for Operation elements
  xml = xml.replace(
    /(<ElementType>Operation<\/ElementType>\s*)<Descriptor>([^<]+)<\/Descriptor>/g,
    (match, prefix, expr) => {
      fixCount++;
      return `${prefix}<OperationExpression>${expr}</OperationExpression>`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Converted ${fixCount} Operation <Descriptor> to <OperationExpression>`);
  }

  // Fix 2: Remove Comment and Symbol that incorrectly appear after OperationExpression
  let removeCount = 0;
  xml = xml.replace(
    /(<OperationExpression>[^<]+<\/OperationExpression>)\s*<Comment\s*\/>\s*<Symbol\s*\/>\s*(<Row>)/g,
    (match, opExpr, row) => {
      removeCount++;
      return `${opExpr}\n                ${row}`;
    }
  );

  // Also handle case where just Comment appears (no Symbol)
  xml = xml.replace(
    /(<OperationExpression>[^<]+<\/OperationExpression>)\s*<Comment\s*\/>\s*(<Row>)/g,
    (match, opExpr, row) => {
      removeCount++;
      return `${opExpr}\n                ${row}`;
    }
  );

  if (removeCount > 0) {
    console.log(`[smbp-xml-fixer] Removed ${removeCount} invalid Comment/Symbol from Operation elements`);
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
  // Pattern handles both <Comment /> (self-closing) and <Comment>text</Comment>
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>NormalContact<\/ElementType>\s*<Descriptor>(%MW\d+)<\/Descriptor>\s*<Comment\s*(?:\/>|[^>]*>[^<]*<\/Comment>)\s*<Symbol>([^<]*)<\/Symbol>\s*<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>([^<]+)<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, address, symbol, row, col, conn) => {
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
  // Pattern handles both <Comment /> (self-closing) and <Comment>text</Comment>
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>NegatedContact<\/ElementType>\s*<Descriptor>(%MW\d+)<\/Descriptor>\s*<Comment\s*(?:\/>|[^>]*>[^<]*<\/Comment>)\s*<Symbol>([^<]*)<\/Symbol>\s*<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>([^<]+)<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, address, symbol, row, col, conn) => {
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
  // Pattern handles both <Comment /> (self-closing) and <Comment>text</Comment>
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>NormalContact<\/ElementType>\s*<Descriptor>(%MF\d+)<\/Descriptor>\s*<Comment\s*(?:\/>|[^>]*>[^<]*<\/Comment>)\s*<Symbol>([^<]*)<\/Symbol>\s*<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>([^<]+)<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, address, symbol, row, col, conn) => {
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
  // Pattern handles both <Comment /> (self-closing) and <Comment>text</Comment>
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>NegatedContact<\/ElementType>\s*<Descriptor>(%MF\d+)<\/Descriptor>\s*<Comment\s*(?:\/>|[^>]*>[^<]*<\/Comment>)\s*<Symbol>([^<]*)<\/Symbol>\s*<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>([^<]+)<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, address, symbol, row, col, conn) => {
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
 * Add <Comment /> and <Symbol /> when Descriptor is followed directly by Row.
 * This handles contacts/coils that are missing both Comment and Symbol.
 *
 * WRONG:
 * <ElementType>NormalContact</ElementType>
 * <Descriptor>%S0</Descriptor>
 * <Row>0</Row>    <-- Missing Comment and Symbol!
 *
 * CORRECT:
 * <ElementType>NormalContact</ElementType>
 * <Descriptor>%S0</Descriptor>
 * <Comment />
 * <Symbol />
 * <Row>0</Row>
 */
function fixMissingCommentSymbolBeforeRow(xml: string): string {
  let fixCount = 0;

  // Pattern: <Descriptor>...</Descriptor> followed directly by <Row> (missing both Comment and Symbol)
  xml = xml.replace(
    /(<Descriptor>[^<]*<\/Descriptor>)\s*(<Row>)/g,
    (match, descriptor, row) => {
      fixCount++;
      return `${descriptor}\n                <Comment />\n                <Symbol />\n                ${row}`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Added Comment/Symbol to ${fixCount} elements where Descriptor was followed by Row`);
  }

  return xml;
}

/**
 * Fix Timer elements that are missing Comment and Symbol after Descriptor.
 *
 * WRONG (missing Comment/Symbol):
 * <ElementType>Timer</ElementType>
 * <Descriptor>%TM0</Descriptor>
 * <Row>0</Row>
 *
 * CORRECT:
 * <ElementType>Timer</ElementType>
 * <Descriptor>%TM0</Descriptor>
 * <Comment />
 * <Symbol />
 * <Row>0</Row>
 */
function fixTimerElementMissingCommentSymbol(xml: string): string {
  let fixCount = 0;

  // Pattern: Timer element with Descriptor followed directly by Row (missing Comment/Symbol)
  // Match: <ElementType>Timer</ElementType>...<Descriptor>%TM...</Descriptor>...<Row>
  // (handles various whitespace/newline patterns)
  xml = xml.replace(
    /(<ElementType>Timer<\/ElementType>\s*<Descriptor>(%TM\d+)<\/Descriptor>)\s*(<Row>)/g,
    (match, prefix, timerAddr, rowStart) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Added Comment/Symbol to Timer element ${timerAddr}`);
      return `${prefix}\n                <Comment />\n                <Symbol />\n                ${rowStart}`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} Timer elements missing Comment/Symbol`);
  }

  return xml;
}

/**
 * Convert wrong Timer format (TimerType/TimerAddress/Preset) to correct Descriptor format.
 *
 * WRONG format (AI sometimes generates this):
 * <ElementType>Timer</ElementType>
 * <TimerType>TON</TimerType>
 * <TimerAddress>%TM0</TimerAddress>
 * <Preset>3</Preset>
 * <Row>0</Row>
 *
 * CORRECT format:
 * <ElementType>Timer</ElementType>
 * <Descriptor>%TM0</Descriptor>
 * <Comment />
 * <Symbol />
 * <Row>0</Row>
 *
 * Note: TimerType, TimerAddress, and Preset belong in the <Timers> section, not in LadderEntity!
 */
function fixWrongTimerFormat(xml: string): string {
  let fixCount = 0;

  // Pattern: Timer element with wrong TimerType/TimerAddress/Preset structure
  xml = xml.replace(
    /<ElementType>Timer<\/ElementType>\s*<TimerType>[^<]*<\/TimerType>\s*<TimerAddress>(%TM\d+)<\/TimerAddress>\s*<Preset>[^<]*<\/Preset>\s*(<Row>\d+<\/Row>)/g,
    (match, timerAddr, rowElement) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Converted wrong Timer format for ${timerAddr} to Descriptor format`);
      return `<ElementType>Timer</ElementType>\n                <Descriptor>${timerAddr}</Descriptor>\n                <Comment />\n                <Symbol />\n                ${rowElement}`;
    }
  );

  // Also handle variant without Preset
  xml = xml.replace(
    /<ElementType>Timer<\/ElementType>\s*<TimerType>[^<]*<\/TimerType>\s*<TimerAddress>(%TM\d+)<\/TimerAddress>\s*(<Row>\d+<\/Row>)/g,
    (match, timerAddr, rowElement) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Converted wrong Timer format (no Preset) for ${timerAddr} to Descriptor format`);
      return `<ElementType>Timer</ElementType>\n                <Descriptor>${timerAddr}</Descriptor>\n                <Comment />\n                <Symbol />\n                ${rowElement}`;
    }
  );

  // Handle variant with just TimerAddress (no TimerType)
  xml = xml.replace(
    /<ElementType>Timer<\/ElementType>\s*<TimerAddress>(%TM\d+)<\/TimerAddress>\s*(<Row>\d+<\/Row>)/g,
    (match, timerAddr, rowElement) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Converted Timer with TimerAddress for ${timerAddr} to Descriptor format`);
      return `<ElementType>Timer</ElementType>\n                <Descriptor>${timerAddr}</Descriptor>\n                <Comment />\n                <Symbol />\n                ${rowElement}`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Converted ${fixCount} wrong Timer formats to correct Descriptor format`);
  }

  return xml;
}

/**
 * Remove invalid elements from Timer LadderEntity.
 * AI sometimes adds TimerType, Preset, PresetValue inside LadderEntity,
 * but these belong ONLY in the <Timers> section, not in ladder elements.
 *
 * WRONG (file 90 patterns):
 * <ElementType>Timer</ElementType>
 * <TimerType>TON</TimerType>           <-- REMOVE
 * <Descriptor>%TM0</Descriptor>
 * <Comment />
 * <Symbol>FILL_DELAY</Symbol>
 * <Preset>30</Preset>                   <-- REMOVE
 * <Row>0</Row>
 *
 * Also: <PresetValue>T#30s</PresetValue>  <-- REMOVE
 */
function removeInvalidTimerLadderElements(xml: string): string {
  let fixCount = 0;

  // Remove <TimerType>...</TimerType> from anywhere in LadderEntity
  // (It appears between ElementType and Descriptor in some patterns)
  const timerTypeMatches = xml.match(/<TimerType>[^<]*<\/TimerType>\s*/g);
  if (timerTypeMatches) {
    fixCount += timerTypeMatches.length;
    xml = xml.replace(/<TimerType>[^<]*<\/TimerType>\s*/g, '');
    console.log(`[smbp-xml-fixer] Removed ${timerTypeMatches.length} invalid <TimerType> elements from LadderEntity`);
  }

  // Remove <Preset>...</Preset> that appears inside LadderEntity (after Symbol, before Row)
  // Be careful: Don't remove Preset from <Timers> section (where it belongs)
  // Pattern: Inside LadderEntity, Preset appears after Symbol and before Row
  const presetAfterSymbolMatches = xml.match(/<Symbol>[^<]*<\/Symbol>\s*<Preset>[^<]*<\/Preset>\s*<Row>/g);
  if (presetAfterSymbolMatches) {
    fixCount += presetAfterSymbolMatches.length;
    xml = xml.replace(
      /(<Symbol>[^<]*<\/Symbol>)\s*<Preset>[^<]*<\/Preset>\s*(<Row>)/g,
      '$1\n                $2'
    );
    console.log(`[smbp-xml-fixer] Removed ${presetAfterSymbolMatches.length} invalid <Preset> elements (after Symbol) from LadderEntity`);
  }

  // Also remove <Preset>...</Preset> that appears BEFORE <Symbol> in LadderEntity
  // Pattern: <Preset>...</Preset><Symbol>...</Symbol>
  const presetBeforeSymbolMatches = xml.match(/<Preset>[^<]*<\/Preset>\s*<Symbol>/g);
  if (presetBeforeSymbolMatches) {
    fixCount += presetBeforeSymbolMatches.length;
    xml = xml.replace(
      /<Preset>[^<]*<\/Preset>\s*(<Symbol>)/g,
      '$1'
    );
    console.log(`[smbp-xml-fixer] Removed ${presetBeforeSymbolMatches.length} invalid <Preset> elements (before Symbol) from LadderEntity`);
  }

  // Remove <PresetValue>...</PresetValue> from LadderEntity
  const presetValueMatches = xml.match(/<PresetValue>[^<]*<\/PresetValue>\s*/g);
  if (presetValueMatches) {
    fixCount += presetValueMatches.length;
    xml = xml.replace(/<PresetValue>[^<]*<\/PresetValue>\s*/g, '');
    console.log(`[smbp-xml-fixer] Removed ${presetValueMatches.length} invalid <PresetValue> elements from LadderEntity`);
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Removed ${fixCount} total invalid timer elements from LadderEntity`);
  }

  return xml;
}

/**
 * Fix bare InstructionLine tags that are missing the InstructionLineEntity wrapper.
 * AI sometimes generates:
 *   <InstructionLines>
 *       <InstructionLine>LD %S6</InstructionLine>
 *   </InstructionLines>
 * But Machine Expert Basic requires:
 *   <InstructionLines>
 *     <InstructionLineEntity>
 *       <InstructionLine>LD %S6</InstructionLine>
 *       <Comment />
 *     </InstructionLineEntity>
 *   </InstructionLines>
 */
function fixBareInstructionLines(xml: string): string {
  let fixCount = 0;

  // Find InstructionLines sections with ONLY bare <InstructionLine> tags (no InstructionLineEntity at all)
  // This is the safe case - we only wrap when the entire section has bare tags
  xml = xml.replace(
    /(<InstructionLines>)([\s\S]*?)(<\/InstructionLines>)/g,
    (match, open, content, close) => {
      // ONLY process if there are InstructionLine tags but NO InstructionLineEntity tags
      // This avoids double-wrapping in mixed cases
      if (/<InstructionLine>/.test(content) && !/<InstructionLineEntity>/.test(content)) {
        // Wrap each bare InstructionLine with InstructionLineEntity
        // Use minimal indentation - normalizeRungIndentation will apply correct absolute indentation
        const fixed = content.replace(
          /\s*<InstructionLine>([\s\S]*?)<\/InstructionLine>/g,
          (m, line) => {
            fixCount++;
            return `\n<InstructionLineEntity>\n<InstructionLine>${line}</InstructionLine>\n<Comment />\n</InstructionLineEntity>`;
          }
        );
        return `${open}${fixed}\n${close}`;
      }
      return match;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Wrapped ${fixCount} bare InstructionLine elements with InstructionLineEntity`);
  }

  return xml;
}

/**
 * CRITICAL: Fix missing </InstructionLine> closing tag
 *
 * AI model sometimes generates malformed XML where the </InstructionLine> closing tag
 * is missing entirely, jumping directly to </InstructionLineEntity>:
 *
 * WRONG (AI-generated malformed XML):
 * <InstructionLineEntity>
 *   <InstructionLine>OR    %S1</InstructionLineEntity>
 *
 * CORRECT:
 * <InstructionLineEntity>
 *   <InstructionLine>OR    %S1</InstructionLine>
 *   <Comment />
 * </InstructionLineEntity>
 *
 * This happens due to model prediction errors when generating repetitive XML structures.
 * The model "shortcuts" to closing tags it recognizes, skipping intermediate structure.
 */
function fixMissingInstructionLineClosingTag(xml: string): string {
  // Pattern: <InstructionLine>content</InstructionLineEntity> (missing </InstructionLine>)
  // The [^<]* matches content that doesn't contain < (the actual instruction text)
  const pattern = /<InstructionLine>([^<]*)<\/InstructionLineEntity>/g;

  let fixCount = 0;
  const result = xml.replace(pattern, (match, content) => {
    fixCount++;
    console.log(`[smbp-xml-fixer] Fixed missing </InstructionLine> for: "${content.trim()}"`);
    return `<InstructionLine>${content}</InstructionLine>\n                <Comment />\n              </InstructionLineEntity>`;
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} missing </InstructionLine> closing tag(s)`);
  }

  return result;
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
 * Expand single-line InstructionLineEntity to multi-line format
 * Machine Expert Basic requires multi-line format with proper indentation
 *
 * WRONG (single-line):
 * <InstructionLineEntity><InstructionLine>LD %I0.0</InstructionLine><Comment /></InstructionLineEntity>
 *
 * CORRECT (multi-line):
 * <InstructionLineEntity>
 *   <InstructionLine>LD %I0.0</InstructionLine>
 *   <Comment />
 * </InstructionLineEntity>
 */
function expandInstructionLineEntityFormat(xml: string): string {
  // Match single-line InstructionLineEntity elements
  const pattern = /<InstructionLineEntity><InstructionLine>([^<]*)<\/InstructionLine><Comment\s*\/><\/InstructionLineEntity>/g;

  let fixCount = 0;
  const result = xml.replace(pattern, (match, content) => {
    fixCount++;
    // Use minimal indentation - normalizeRungIndentation will apply correct absolute indentation
    return `<InstructionLineEntity>\n<InstructionLine>${content}</InstructionLine>\n<Comment />\n</InstructionLineEntity>`;
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Expanded ${fixCount} single-line InstructionLineEntity to multi-line format`);
  }

  return result;
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
 * Fix OR branches where Row 1 has a Comparison element that ends without merging.
 * Comparison elements span 2 columns (1-2), so Row 1 must have a VerticalLine at
 * column 3 to merge back into Row 0's flow.
 *
 * WRONG: Row 1 Comparison at col 1-2 ends, no element at col 3
 * CORRECT: Row 1 has VerticalLine at col 3 with "Up, Right" to merge to Row 0
 *
 * This fixes the Auto_Mode_Stop pattern where:
 * Row 0: SYSTEM_READY -> Comparison(%MW10=0) -> Lines -> ResetCoil
 * Row 1: SYSTEM_READY -> Comparison(%MW11=0) -> [needs VerticalLine here] -> None
 */
function fixOrBranchAfterComparison(xml: string): string {
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);

  if (!rungs) return xml;

  let fixedXml = xml;
  let fixCount = 0;

  for (const rung of rungs) {
    // Check if rung has Comparison on Row 1, Column 1
    const hasRow1Comparison = /<LadderEntity>[\s\S]*?<ElementType>Comparison<\/ElementType>[\s\S]*?<Row>1<\/Row>\s*<Column>1<\/Column>/.test(rung);

    if (!hasRow1Comparison) continue;

    // Check if Row 1 has element at Column 3
    const hasRow1Col3 = /<LadderEntity>[\s\S]*?<Row>1<\/Row>\s*<Column>3<\/Column>/.test(rung);

    if (hasRow1Col3) continue; // Already has element, skip

    // Check if Row 0 has Line at Column 3
    const row0Col3Match = rung.match(/<LadderEntity>([\s\S]*?<ElementType>Line<\/ElementType>[\s\S]*?<Row>0<\/Row>\s*<Column>3<\/Column>[\s\S]*?<ChosenConnection>([^<]+)<\/ChosenConnection>[\s\S]*?)<\/LadderEntity>/);

    if (!row0Col3Match) continue;

    // Update Row 0 Col 3 Line to have "Down, Left, Right" connection
    const oldRow0Connection = row0Col3Match[2];
    if (!oldRow0Connection.includes('Down')) {
      const newRow0Connection = 'Down, Left, Right';
      const oldRow0Entity = row0Col3Match[0];
      const newRow0Entity = oldRow0Entity.replace(
        `<ChosenConnection>${oldRow0Connection}</ChosenConnection>`,
        `<ChosenConnection>${newRow0Connection}</ChosenConnection>`
      );
      fixedXml = fixedXml.replace(oldRow0Entity, newRow0Entity);
      console.log(`[smbp-xml-fixer] Updated Row 0, Col 3 Line connection: "${oldRow0Connection}" -> "${newRow0Connection}"`);
    }

    // Add VerticalLine at Row 1, Column 3 to merge the branch
    const verticalLineXml = `
              <LadderEntity>
                <ElementType>VerticalLine</ElementType>
                <Row>1</Row>
                <Column>3</Column>
                <ChosenConnection>Up, Right</ChosenConnection>
              </LadderEntity>`;

    // Insert after Row 1 Comparison element
    const row1ComparisonMatch = rung.match(/<LadderEntity>[\s\S]*?<ElementType>Comparison<\/ElementType>[\s\S]*?<Row>1<\/Row>\s*<Column>1<\/Column>[\s\S]*?<\/LadderEntity>/);
    if (row1ComparisonMatch) {
      fixedXml = fixedXml.replace(row1ComparisonMatch[0], row1ComparisonMatch[0] + verticalLineXml);
      fixCount++;
      console.log(`[smbp-xml-fixer] Added VerticalLine at Row 1, Col 3 to merge OR branch after Comparison`);
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} OR branches with Comparisons`);
  }

  return fixedXml;
}

/**
 * Fix parallel branches where Row 0 and Row 1 have SEPARATE outputs.
 * This differs from OR-merge pattern where branches merge into one output.
 *
 * Pattern detection:
 * - Row 0 has output (Coil/SetCoil/ResetCoil/Operation) at column 10
 * - Row 1 ALSO has output at column 10
 * - Row 1 is missing Lines at columns 4-9
 *
 * Fix:
 * 1. Update Row 1 element connections from "Up, Left" to "Up, Left, Right"
 * 2. Update Row 1 Col 3 VerticalLine to "Up, Right"
 * 3. Add Line elements for Row 1 columns 4-9 with "Left, Right"
 *
 * This fixes rungs like Auto_Mode_Select where:
 * Row 0: %M0 -> Comparison(%MW10=1) -> Lines -> SetCoil
 * Row 1: %M0 -> Comparison(%MW10=0) -> [needs Lines here] -> ResetCoil
 */
function fixParallelBranchesWithSeparateOutputs(xml: string): string {
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);
  if (!rungs) return xml;

  let fixedXml = xml;
  let fixCount = 0;

  for (const rung of rungs) {
    // Check if Row 0 has output at column 10
    const hasRow0Output = /<LadderEntity>[\s\S]*?<ElementType>(Coil|SetCoil|ResetCoil|Operation)<\/ElementType>[\s\S]*?<Row>0<\/Row>\s*<Column>10<\/Column>/.test(rung);

    // Check if Row 1 has output at column 10 (NOT None)
    const hasRow1Output = /<LadderEntity>[\s\S]*?<ElementType>(Coil|SetCoil|ResetCoil|Operation)<\/ElementType>[\s\S]*?<Row>1<\/Row>\s*<Column>10<\/Column>/.test(rung);

    if (!hasRow0Output || !hasRow1Output) continue;

    // Check if Row 1 has Line at column 4 (indicates path exists)
    const hasRow1Col4Line = /<LadderEntity>[\s\S]*?<ElementType>Line<\/ElementType>[\s\S]*?<Row>1<\/Row>\s*<Column>4<\/Column>/.test(rung);

    if (hasRow1Col4Line) continue; // Already has lines, skip

    // This rung needs fixing - Row 1 has output but no path to it
    let fixedRung = rung;

    // Step 1: Fix Row 1 element connections at col 0 and col 1
    // Change "Up, Left" to "Up, Left, Right" to continue the path
    fixedRung = fixedRung.replace(
      /(<Row>1<\/Row>\s*<Column>0<\/Column>\s*<ChosenConnection>)Up, Left(<\/ChosenConnection>)/g,
      '$1Up, Left, Right$2'
    );
    fixedRung = fixedRung.replace(
      /(<Row>1<\/Row>\s*<Column>1<\/Column>\s*<ChosenConnection>)Up, Left(<\/ChosenConnection>)/g,
      '$1Left, Right$2'
    );

    // Step 2: Check if VerticalLine at Row 1, Col 3 exists and fix its connection
    // If it has "Up, Right", that's correct for continuing to the right

    // Step 3: Add Line elements for Row 1, columns 4-9
    const linesToAdd: string[] = [];
    for (let col = 4; col <= 9; col++) {
      // Check if element already exists at this position
      const hasElementAtCol = new RegExp(`<Row>1</Row>\\s*<Column>${col}</Column>`).test(fixedRung);
      if (!hasElementAtCol) {
        linesToAdd.push(`
              <LadderEntity>
                <ElementType>Line</ElementType>
                <Row>1</Row>
                <Column>${col}</Column>
                <ChosenConnection>Left, Right</ChosenConnection>
              </LadderEntity>`);
      }
    }

    if (linesToAdd.length > 0) {
      // Insert lines after the Row 1 Col 3 element
      const row1Col3Match = fixedRung.match(/<LadderEntity>[\s\S]*?<Row>1<\/Row>\s*<Column>3<\/Column>[\s\S]*?<\/LadderEntity>/);
      if (row1Col3Match) {
        fixedRung = fixedRung.replace(row1Col3Match[0], row1Col3Match[0] + linesToAdd.join(''));
      }

      fixedXml = fixedXml.replace(rung, fixedRung);
      fixCount++;
      console.log(`[smbp-xml-fixer] Added ${linesToAdd.length} Line elements for Row 1 parallel branch`);
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} parallel branches with separate outputs`);
  }

  return fixedXml;
}

/**
 * Fix OR branch connections where Row 1, Col 0 has "Up, Left" instead of "Up, Right".
 * For OR logic that MERGES into a single output, Row 1 contact must continue RIGHT.
 *
 * Pattern: Row 0 has "Down, Left, Right", Row 1 has "Up, Left" -> change to "Up, Right"
 *
 * This fixes rungs like Reset_HMI_CalcDensity where:
 * Row 0: %S0(DLR) -> Lines -> Operation
 * Row 1: %S1(UL) -> [DEAD END] - should be %S1(UR) to merge with Row 0
 *
 * FIXED: Now uses entity-based matching to avoid regex crossing LadderEntity boundaries.
 */
function fixOrBranchContactConnections(xml: string): string {
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);
  if (!rungs) return xml;

  let fixedXml = xml;
  let fixCount = 0;

  for (const rung of rungs) {
    // Match ALL LadderEntity elements in this rung (prevents cross-boundary matching)
    const entities = rung.match(/<LadderEntity>[\s\S]*?<\/LadderEntity>/g) || [];

    // Check if Row 0, Col 0 has "Down, Left, Right" (OR branch start)
    let hasRow0BranchDown = false;
    let row1Col0Entity: string | null = null;

    for (const entity of entities) {
      // Check for OR branch start at Row 0, Col 0
      if (entity.includes('<Row>0</Row>') &&
          entity.includes('<Column>0</Column>') &&
          entity.includes('Down, Left, Right')) {
        hasRow0BranchDown = true;
      }

      // Find Row 1, Col 0 entity with EXACTLY "Up, Left" connection (not "Up, Left, Right")
      // "Up, Left, Right" is CORRECT for OR branches where Row 1 has its own logic after the contact
      if (entity.includes('<Row>1</Row>') &&
          entity.includes('<Column>0</Column>') &&
          entity.includes('<ChosenConnection>Up, Left</ChosenConnection>')) {
        row1Col0Entity = entity;
      }
    }

    // Skip if no OR branch at Row 0, Col 0
    if (!hasRow0BranchDown) continue;

    // Fix Row 1, Col 0 from EXACTLY "Up, Left" to "Up, Right"
    // CRITICAL: Only fix when connection is EXACTLY "Up, Left", NOT "Up, Left, Right"
    // "Up, Left, Right" means Row 1 has its own logic path and is CORRECT
    if (row1Col0Entity && row1Col0Entity.includes('<ChosenConnection>Up, Left</ChosenConnection>')) {
      const fixedEntity = row1Col0Entity.replace(
        '<ChosenConnection>Up, Left</ChosenConnection>',
        '<ChosenConnection>Up, Right</ChosenConnection>'
      );
      const fixedRung = rung.replace(row1Col0Entity, fixedEntity);
      fixedXml = fixedXml.replace(rung, fixedRung);
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed OR branch: Row 1, Col 0 "Up, Left" -> "Up, Right"`);
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} OR branch contact connections`);
  }

  return fixedXml;
}

/**
 * Fix parallel output connections where Row 1+ outputs have "Up, Left" instead of "Left"
 *
 * When parallel outputs (Coil/SetCoil/ResetCoil/Operation) are at Column 9/10 on Rows 1+,
 * they receive power from a VerticalLine - not from an OR merge.
 * These outputs should have just "Left" connection, not "Up, Left".
 *
 * Detection:
 * - VerticalLine elements exist (indicates parallel branch structure)
 * - Row 0 has output at Col 9 or 10 (indicates parallel outputs pattern)
 * - Row 1+ outputs have "Up, Left" connection (wrong - should be just "Left")
 *
 * Fix: Change "Up, Left" to "Left" for outputs at Column 9/10 on Rows 1+
 */
function fixParallelOutputConnections(xml: string): string {
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);
  if (!rungs) return xml;

  let fixedXml = xml;
  let fixCount = 0;

  for (const rung of rungs) {
    const entities = rung.match(/<LadderEntity>[\s\S]*?<\/LadderEntity>/g) || [];

    // Check if there are VerticalLines anywhere (indicates parallel branch)
    // Also check if Row 0 has output at Col 9/10 (Row 0 output)
    let hasVerticalLineBeforeOutputs = false;
    let hasRow0OutputAtCol9or10 = false;

    for (const entity of entities) {
      // Check for VerticalLine anywhere
      if (entity.includes('<ElementType>VerticalLine</ElementType>')) {
        hasVerticalLineBeforeOutputs = true;
      }

      // Check for Line with "Down" connection (starts parallel branch)
      if (entity.includes('<ElementType>Line</ElementType>') &&
          entity.includes('Down')) {
        hasVerticalLineBeforeOutputs = true;
      }

      // Check if Row 0 has an output at Col 9 or 10
      if (entity.includes('<Row>0</Row>') &&
          (entity.includes('<Column>9</Column>') || entity.includes('<Column>10</Column>')) &&
          (entity.includes('<ElementType>Coil</ElementType>') ||
           entity.includes('<ElementType>SetCoil</ElementType>') ||
           entity.includes('<ElementType>ResetCoil</ElementType>') ||
           entity.includes('<ElementType>Operation</ElementType>'))) {
        hasRow0OutputAtCol9or10 = true;
      }
    }

    // Skip if no parallel branch structure detected
    if (!hasVerticalLineBeforeOutputs || !hasRow0OutputAtCol9or10) continue;

    // Find outputs at Column 9/10 on Rows 1+ with "Up, Left" connection and fix to "Left"
    let fixedRung = rung;
    for (const entity of entities) {
      // Check for output element types at Column 9 or 10
      const isOutputElement =
        entity.includes('<ElementType>Coil</ElementType>') ||
        entity.includes('<ElementType>SetCoil</ElementType>') ||
        entity.includes('<ElementType>ResetCoil</ElementType>') ||
        entity.includes('<ElementType>Operation</ElementType>');

      const col9 = entity.includes('<Column>9</Column>');
      const col10 = entity.includes('<Column>10</Column>');

      if (isOutputElement && (col9 || col10)) {
        // Extract row number
        const rowMatch = entity.match(/<Row>(\d+)<\/Row>/);
        if (!rowMatch) continue;

        const row = parseInt(rowMatch[1]);
        const col = col9 ? 9 : 10;

        // Only fix Row 1+ outputs with "Up, Left" connection
        if (row > 0 && entity.includes('<ChosenConnection>Up, Left</ChosenConnection>')) {
          const fixedEntity = entity.replace(
            '<ChosenConnection>Up, Left</ChosenConnection>',
            '<ChosenConnection>Left</ChosenConnection>'
          );
          fixedRung = fixedRung.replace(entity, fixedEntity);
          fixCount++;
          console.log(`[smbp-xml-fixer] Fixed parallel output at Row ${row}, Col ${col}: "Up, Left" -> "Left"`);
        }
      }
    }

    if (fixedRung !== rung) {
      fixedXml = fixedXml.replace(rung, fixedRung);
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} parallel output connections`);
  }

  return fixedXml;
}

/**
 * Fix OR branch contacts at Row 1+ Column 0 with incorrect "Right" connection.
 *
 * OR branches with two contacts at Column 0:
 * - Row 0: First contact with "Down, Left, Right" (branches down, continues right) - CORRECT
 * - Row 1: Second contact with "Up, Left, Right" - WRONG! Should be "Up, Left" only
 *
 * The Row 1 element should NOT have "Right" because:
 * 1. It's at Column 0 - the merge happens at Column 0
 * 2. Only Row 0 continues the signal to the right
 * 3. Row 1 just provides an alternative path that merges UP
 *
 * This fixes rungs like Inlet_Valve_Control where:
 * Row 0, Col 0: AUTO_FILL_CMD (%M5) with "Down, Left, Right" - OK
 * Row 1, Col 0: MANUAL_INLET_CMD (%M7) with "Up, Left, Right" - ERROR: Has "Right"!
 */
function fixOrBranchRow1Connections(xml: string): string {
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);
  if (!rungs) return xml;

  let fixedXml = xml;
  let fixCount = 0;

  for (const rung of rungs) {
    const entities = rung.match(/<LadderEntity>[\s\S]*?<\/LadderEntity>/g) || [];

    let fixedRung = rung;
    for (const entity of entities) {
      // Check for NormalContact or NegatedContact
      const isContact = entity.includes('<ElementType>NormalContact</ElementType>') ||
                        entity.includes('<ElementType>NegatedContact</ElementType>');
      if (!isContact) continue;

      // Check for Column 0
      if (!entity.includes('<Column>0</Column>')) continue;

      // Extract row number
      const rowMatch = entity.match(/<Row>(\d+)<\/Row>/);
      if (!rowMatch) continue;
      const row = parseInt(rowMatch[1]);

      // Only fix Row 1+ (Row 0 is fine with "Down, Left, Right")
      if (row === 0) continue;

      // Check for connection with both "Up" and "Right" (incorrect pattern)
      const connMatch = entity.match(/<ChosenConnection>([^<]*)<\/ChosenConnection>/);
      if (!connMatch) continue;
      const connection = connMatch[1];

      if (connection.includes('Up') && connection.includes('Right')) {
        // Remove "Right" from the connection
        // Handle various formats: "Up, Left, Right", "Up, Right, Left", etc.
        let newConnection = connection
          .replace(/, Right/g, '')
          .replace(/Right, /g, '')
          .replace(/Right/g, '');

        // Clean up any double commas or trailing commas
        newConnection = newConnection.replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();

        const fixedEntity = entity.replace(
          `<ChosenConnection>${connection}</ChosenConnection>`,
          `<ChosenConnection>${newConnection}</ChosenConnection>`
        );
        fixedRung = fixedRung.replace(entity, fixedEntity);
        fixCount++;
        console.log(`[smbp-xml-fixer] Fixed OR branch Row ${row} Col 0: "${connection}" -> "${newConnection}"`);
      }
    }

    if (fixedRung !== rung) {
      fixedXml = fixedXml.replace(rung, fixedRung);
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} OR branch Row 1+ connections`);
  }

  return fixedXml;
}

/**
 * Fix None elements at Column 9 when there's an output at Column 10 on the same row.
 * None elements don't carry signal - they need to be Line elements.
 *
 * This fixes rungs like Emergency_Stop where:
 * Row 0: Contact -> Line(8,DLR) -> Line(9,LR) -> ResetCoil(10,L)  OK
 * Row 1:            VL(8,UDR)   -> None(9,N)  -> ResetCoil(10,L)  BROKEN!
 * Row 2:            VL(8,UDR)   -> None(9,N)  -> ResetCoil(10,L)  BROKEN!
 * Row 3:            VL(8,UR)    -> None(9,N)  -> ResetCoil(10,L)  BROKEN!
 *
 * The None elements at Col 9 break the signal path. They need to be Line elements.
 *
 * FIXED: Now uses entity-based matching to avoid regex crossing LadderEntity boundaries.
 */
function fixNoneElementsBeforeOutputs(xml: string): string {
  const rungPattern = /(<RungEntity>[\s\S]*?<\/RungEntity>)/g;
  const rungs = xml.match(rungPattern);
  if (!rungs) return xml;

  let fixedXml = xml;
  let fixCount = 0;

  for (const rung of rungs) {
    // Match ALL LadderEntity elements in this rung (prevents cross-boundary matching)
    const entities = rung.match(/<LadderEntity>[\s\S]*?<\/LadderEntity>/g) || [];

    // Find all rows that have outputs at Column 10
    const outputRows = new Set<number>();
    for (const entity of entities) {
      if ((entity.includes('<ElementType>Coil</ElementType>') ||
           entity.includes('<ElementType>SetCoil</ElementType>') ||
           entity.includes('<ElementType>ResetCoil</ElementType>')) &&
          entity.includes('<Column>10</Column>')) {
        // Extract row number
        const rowMatch = entity.match(/<Row>(\d+)<\/Row>/);
        if (rowMatch) {
          outputRows.add(parseInt(rowMatch[1]));
        }
      }
    }

    if (outputRows.size === 0) continue;

    // Find None elements at Col 9 for these rows and replace with Line
    let fixedRung = rung;
    for (const entity of entities) {
      if (entity.includes('<ElementType>None</ElementType>') &&
          entity.includes('<Column>9</Column>')) {
        const rowMatch = entity.match(/<Row>(\d+)<\/Row>/);
        if (rowMatch && outputRows.has(parseInt(rowMatch[1]))) {
          const row = rowMatch[1];
          // Replace None element type with Line and None connection with Left, Right
          const lineEntity = entity
            .replace('<ElementType>None</ElementType>', '<ElementType>Line</ElementType>')
            .replace('<ChosenConnection>None</ChosenConnection>', '<ChosenConnection>Left, Right</ChosenConnection>');
          fixedRung = fixedRung.replace(entity, lineEntity);
          fixCount++;
          console.log(`[smbp-xml-fixer] Replaced None at Row ${row}, Col 9 with Line element`);
        }
      }
    }

    if (fixedRung !== rung) {
      fixedXml = fixedXml.replace(rung, fixedRung);
    }
  }

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} None elements before outputs`);
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
 * Fix invalid VerticalLine elements at Row 0.
 * Row 0 is the top row - VerticalLines cannot have "Up" connection at Row 0
 * because there's nothing above to connect to.
 * These invalid elements cause "file format is invalid" error.
 *
 * Strategy: Convert VerticalLine at Row 0 to Line (removing "Up" from connection)
 * or remove entirely if only "Up" connection remains.
 */
function fixInvalidVerticalLinesAtRow0(xml: string): string {
  let fixCount = 0;

  // Pattern: VerticalLine at Row 0 - convert to Line or remove
  // Match LadderEntity with ElementType VerticalLine and Row 0
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>VerticalLine<\/ElementType>\s*<Row>0<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>([^<]+)<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, col, conn) => {
      fixCount++;
      // Remove "Up" from connection
      let newConn = conn
        .replace(/Up,\s*/g, '')
        .replace(/,\s*Up/g, '')
        .replace(/^Up$/g, '')
        .trim();

      // Clean up any double commas or leading/trailing commas
      newConn = newConn.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');

      // If empty or ONLY "Down" - remove element entirely
      // Line elements MUST have "Left, Right" - "Down" alone is invalid
      if (!newConn || newConn === '' || newConn === 'Down') {
        console.log(`[smbp-xml-fixer] Removed invalid VerticalLine at Row 0, Column ${col} (connection was "${conn}")`);
        return '';
      }

      // Ensure connection has "Left" for valid power flow from previous element
      // Line elements MUST have "Left" to receive power
      if (!newConn.includes('Left')) {
        // Add "Left" to connection
        newConn = newConn ? `Left, ${newConn}` : 'Left, Right';
      }

      // Convert to Line element with remaining connection
      console.log(`[smbp-xml-fixer] Converted VerticalLine at Row 0, Column ${col} to Line ("${conn}" -> "${newConn}")`);
      return `<LadderEntity>
                <ElementType>Line</ElementType>
                <Row>0</Row>
                <Column>${col}</Column>
                <ChosenConnection>${newConn}</ChosenConnection>
              </LadderEntity>`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} invalid VerticalLine elements at Row 0`);
  }

  return xml;
}

/**
 * Fix elements with invalid connection patterns.
 * - Line elements MUST have "Left" to receive power flow
 * - Contact elements at Column 0 MUST have "Left" (power rail connection)
 * Working template has 0 elements with only "Right" connection.
 */
function fixInvalidRightOnlyConnections(xml: string): string {
  let fixCount = 0;

  // Fix Line elements with only "Right" -> "Left, Right"
  xml = xml.replace(
    /(<LadderEntity>\s*<ElementType>Line<\/ElementType>[\s\S]*?<ChosenConnection>)Right(<\/ChosenConnection>[\s\S]*?<\/LadderEntity>)/g,
    (match, before, after) => {
      fixCount++;
      return `${before}Left, Right${after}`;
    }
  );

  // Fix Contact elements (NormalContact/NegatedContact) at Column 0 with only "Right"
  // These are at the power rail and MUST have "Left" connection
  xml = xml.replace(
    /(<LadderEntity>\s*<ElementType>(NormalContact|NegatedContact)<\/ElementType>[\s\S]*?<Column>0<\/Column>\s*<ChosenConnection>)Right(<\/ChosenConnection>[\s\S]*?<\/LadderEntity>)/g,
    (match, before, elementType, after) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed ${elementType} at Column 0: "Right" -> "Left, Right"`);
      return `${before}Left, Right${after}`;
    }
  );

  // Fix ANY element at Column 1+ with only "Right" connection
  // All elements (except output coils at Column 10) need "Left" to connect to previous element
  xml = xml.replace(
    /(<LadderEntity>[\s\S]*?<Column>([1-9])<\/Column>\s*<ChosenConnection>)Right(<\/ChosenConnection>[\s\S]*?<\/LadderEntity>)/g,
    (match, before, column, after) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed element at Column ${column}: "Right" -> "Left, Right"`);
      return `${before}Left, Right${after}`;
    }
  );

  // Fix Line elements with only "Down" -> remove or convert
  xml = xml.replace(
    /<LadderEntity>\s*<ElementType>Line<\/ElementType>\s*<Row>(\d+)<\/Row>\s*<Column>(\d+)<\/Column>\s*<ChosenConnection>Down<\/ChosenConnection>\s*<\/LadderEntity>/g,
    (match, row, col) => {
      fixCount++;
      console.log(`[smbp-xml-fixer] Removed invalid Line element at Row ${row}, Column ${col} (connection was "Down")`);
      return '';
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} invalid connection patterns`);
  }

  return xml;
}

/**
 * Fix Timer preset format.
 * AI sometimes generates <Preset>t#3s</Preset> (IEC time literal)
 * but Machine Expert Basic requires <Preset>3</Preset> (just the number)
 */
function fixTimerPresetFormat(xml: string): string {
  let fixCount = 0;

  // Fix t#Xs format (seconds)
  xml = xml.replace(/<Preset>t#(\d+)s<\/Preset>/gi, (match, seconds) => {
    fixCount++;
    return `<Preset>${seconds}</Preset>`;
  });

  // Fix t#Xms format (milliseconds) - convert to seconds
  xml = xml.replace(/<Preset>t#(\d+)ms<\/Preset>/gi, (match, ms) => {
    fixCount++;
    const seconds = Math.max(1, Math.round(parseInt(ms) / 1000));
    return `<Preset>${seconds}</Preset>`;
  });

  // Fix T#Xm format (minutes) - convert to seconds
  xml = xml.replace(/<Preset>t#(\d+)m<\/Preset>/gi, (match, minutes) => {
    fixCount++;
    const seconds = parseInt(minutes) * 60;
    return `<Preset>${seconds}</Preset>`;
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} timer preset formats (t#Xs -> X)`);
  }

  return xml;
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
 *
 * CRITICAL: Only process content inside <Rungs>...</Rungs>
 * Do NOT modify hardware configuration sections like <Extensions>, <DigitalInputs>, etc.
 */
function fixExpansionAddresses(xml: string): string {
  let fixCount = 0;

  // CRITICAL: Only process content inside <Rungs>...</Rungs>
  // Do NOT modify hardware configuration sections!
  xml = xml.replace(/<Rungs>([\s\S]*?)<\/Rungs>/g, (match, rungsContent) => {
    let fixed = rungsContent;

    // Map expansion input addresses to memory bits (only in rungs)
    // %I1.0 -> %M10, %I1.1 -> %M11, etc.
    fixed = fixed.replace(
      /%I([1-9])\.(\d+)/g,
      (m, slot, bit) => {
        const memoryBit = 10 + (parseInt(slot) - 1) * 10 + parseInt(bit);
        fixCount++;
        console.log(`[smbp-xml-fixer] Fixed expansion address "${m}" -> "%M${memoryBit}" (in Rungs)`);
        return `%M${memoryBit}`;
      }
    );

    // Map expansion output addresses to memory bits (only in rungs)
    // %Q1.0 -> %M50, %Q1.1 -> %M51, etc.
    fixed = fixed.replace(
      /%Q([1-9])\.(\d+)/g,
      (m, slot, bit) => {
        const memoryBit = 50 + (parseInt(slot) - 1) * 10 + parseInt(bit);
        fixCount++;
        console.log(`[smbp-xml-fixer] Fixed expansion address "${m}" -> "%M${memoryBit}" (in Rungs)`);
        return `%M${memoryBit}`;
      }
    );

    return '<Rungs>' + fixed + '</Rungs>';
  });

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

  // CRITICAL: Only search for %IW addresses within the <Rungs> section,
  // NOT in the hardware configuration! The hardware config contains <Address>%IW1.x</Address>
  // for all channels, but we only want to configure types for addresses ACTUALLY USED in ladder logic.
  const rungsMatch = xml.match(/<Rungs>([\s\S]*?)<\/Rungs>/);
  if (!rungsMatch) {
    return xml;
  }
  const rungsContent = rungsMatch[1];

  // Find all %IWx.y addresses used in the actual program rungs
  const iwUsed = new Set<string>();
  const iwPattern = /%IW\d+\.\d+/g;
  let match;
  while ((match = iwPattern.exec(rungsContent)) !== null) {
    iwUsed.add(match[0]);
  }

  if (iwUsed.size === 0) {
    return xml;
  }

  console.log(`[smbp-xml-fixer] Found analog inputs used in program rungs: ${Array.from(iwUsed).join(', ')}`);

  // Fix Type_NotUsed (value 31) to Type_0_20mA (value 2) for each used channel
  // Also fix Scope_NotUsed (value 128) to Scope_Normal (value 0)
  for (const iwAddr of iwUsed) {
    // Pattern to match the AnalogIO block for this address with Type_NotUsed
    const typePattern = new RegExp(
      `(<AnalogIO>\\s*<Address>${escapeRegex(iwAddr)}<\\/Address>[\\s\\S]*?<Type>\\s*<Value>)31(<\\/Value>\\s*<Name>)Type_NotUsed(<\\/Name>\\s*<\\/Type>)`,
      'g'
    );

    const typeXml = xml.replace(typePattern, '$12$2Type_0_20mA$3');
    if (typeXml !== xml) {
      xml = typeXml;
      fixCount++;
      console.log(`[smbp-xml-fixer] Fixed ${iwAddr} analog input type: Type_NotUsed -> Type_0_20mA`);
    }

    // Also fix Scope_NotUsed (value 128) to Scope_Normal (value 0)
    const scopePattern = new RegExp(
      `(<AnalogIO>\\s*<Address>${escapeRegex(iwAddr)}<\\/Address>[\\s\\S]*?<Scope>\\s*<Value>)128(<\\/Value>\\s*<Name>)Scope_NotUsed(<\\/Name>\\s*<\\/Scope>)`,
      'g'
    );

    const scopeXml = xml.replace(scopePattern, '$10$2Scope_Normal$3');
    if (scopeXml !== xml) {
      xml = scopeXml;
      console.log(`[smbp-xml-fixer] Fixed ${iwAddr} analog input scope: Scope_NotUsed -> Scope_Normal`);
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
 * Remove empty <Descriptor></Descriptor> elements from Line elements.
 * Line elements should NOT have Descriptor tags at all.
 * Working templates have 0 empty Descriptor elements.
 * AI sometimes generates Line elements with empty Descriptor which causes
 * "file format is invalid" error in Machine Expert Basic.
 */
function removeEmptyDescriptorsFromLineElements(xml: string): string {
  let fixCount = 0;

  // Pattern 1: Line element with empty Descriptor immediately after ElementType
  // <LadderEntity><ElementType>Line</ElementType><Descriptor></Descriptor>...
  xml = xml.replace(
    /(<LadderEntity>\s*<ElementType>Line<\/ElementType>)\s*<Descriptor><\/Descriptor>/g,
    (match, prefix) => {
      fixCount++;
      return prefix;
    }
  );

  // Pattern 2: Also handle Line elements where Descriptor appears elsewhere in the element
  // This catches any remaining empty Descriptors in Line elements
  const lineElementPattern = /<LadderEntity>([\s\S]*?<ElementType>Line<\/ElementType>[\s\S]*?)<\/LadderEntity>/g;
  xml = xml.replace(lineElementPattern, (match, content) => {
    const hasEmptyDescriptor = /<Descriptor><\/Descriptor>/.test(content);
    if (hasEmptyDescriptor) {
      fixCount++;
      const cleanedContent = content.replace(/<Descriptor><\/Descriptor>\s*/g, '');
      return `<LadderEntity>${cleanedContent}</LadderEntity>`;
    }
    return match;
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Removed ${fixCount} empty Descriptor elements from Line elements`);
  }

  return xml;
}

/**
 * Split concatenated XML elements onto separate lines.
 * Container elements (LadderEntity, RungEntity, etc.) go on their own line.
 * Content elements (ElementType, Row, etc.) stay on one line with their value.
 */
function splitXmlElements(xml: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < xml.length) {
    // Skip whitespace
    while (i < xml.length && /\s/.test(xml[i])) {
      i++;
    }

    if (i >= xml.length) break;

    // Check if we're at the start of a tag
    if (xml[i] === '<') {
      // Find the complete element or tag
      const tagStart = i;

      // Check if it's a closing tag
      if (xml[i + 1] === '/') {
        // Closing tag: </TagName>
        const closeEnd = xml.indexOf('>', i);
        if (closeEnd !== -1) {
          result.push(xml.substring(tagStart, closeEnd + 1));
          i = closeEnd + 1;
          continue;
        }
      }

      // Opening tag: find the tag name
      const tagNameMatch = xml.substring(i).match(/^<([A-Za-z][A-Za-z0-9]*)/);
      if (!tagNameMatch) {
        // Not a valid tag, skip character
        i++;
        continue;
      }

      const tagName = tagNameMatch[1];

      // Check if this is a container element (should be on its own line)
      const containerTags = ['RungEntity', 'LadderElements', 'LadderEntity', 'InstructionLines', 'InstructionLineEntity'];
      const isContainer = containerTags.includes(tagName);

      // Find the end of the opening tag
      const openTagEnd = xml.indexOf('>', i);
      if (openTagEnd === -1) {
        i++;
        continue;
      }

      // Check if it's self-closing (<Tag />)
      if (xml[openTagEnd - 1] === '/') {
        result.push(xml.substring(tagStart, openTagEnd + 1));
        i = openTagEnd + 1;
        continue;
      }

      if (isContainer) {
        // Container tag - just output the opening tag
        result.push(xml.substring(tagStart, openTagEnd + 1));
        i = openTagEnd + 1;
      } else {
        // Content tag - find the matching closing tag and include everything
        const closingTag = `</${tagName}>`;
        const closeTagStart = xml.indexOf(closingTag, openTagEnd);
        if (closeTagStart !== -1) {
          const fullElement = xml.substring(tagStart, closeTagStart + closingTag.length);
          result.push(fullElement);
          i = closeTagStart + closingTag.length;
        } else {
          // No closing tag found, just output opening tag
          result.push(xml.substring(tagStart, openTagEnd + 1));
          i = openTagEnd + 1;
        }
      }
    } else {
      // Text content - skip
      i++;
    }
  }

  return result.join('\r\n');
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
    // Step 1: Split concatenated XML elements onto separate lines
    // Container tags go on their own line, content tags stay together
    // e.g., <LadderEntity> alone, but <ElementType>value</ElementType> stays as one

    // Approach: Find complete XML elements and put each on its own line
    const normalized = splitXmlElements(content);

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

    return '<Rungs>\r\n' + normalizedLines.join('\r\n') + '\r\n        </Rungs>';
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Normalized indentation for ${fixCount} lines inside <Rungs> sections`);
  }

  return xml;
}

/**
 * CRITICAL: Normalize indentation inside <HardwareConfiguration> section.
 *
 * The AI sometimes generates tags at column 0 (no indentation):
 * - </AnalogIO> after <IsInput>true</IsInput>
 * - <ModuleExtensionObject> after <Extensions>
 *
 * This causes "file format is invalid" error in Machine Expert Basic.
 *
 * Working template indentation levels:
 * - <HardwareConfiguration> = 2 spaces
 * - <Cpu>, <Extensions> = 6 spaces
 * - <ModuleExtensionObject>, <AnalogInputs> = 8 spaces
 * - <AnalogIO> = 10 spaces (opening)
 * - </AnalogIO> = 10 spaces (closing)
 * - Content inside AnalogIO = 12-14 spaces
 */
function normalizeHardwareConfigIndentation(xml: string): string {
  let fixCount = 0;

  // Fix </AnalogIO> at column 0 - should be 10 spaces
  xml = xml.replace(/^<\/AnalogIO>/gm, (match) => {
    fixCount++;
    return '          </AnalogIO>';
  });

  // Fix <ModuleExtensionObject> at column 0 - should be 8 spaces
  xml = xml.replace(/^<ModuleExtensionObject>/gm, (match) => {
    fixCount++;
    return '        <ModuleExtensionObject>';
  });

  // Fix </ModuleExtensionObject> at column 0 - should be 8 spaces
  xml = xml.replace(/^<\/ModuleExtensionObject>/gm, (match) => {
    fixCount++;
    return '        </ModuleExtensionObject>';
  });

  // Fix <AnalogIO> at column 0 - should be 10 spaces
  xml = xml.replace(/^<AnalogIO>/gm, (match) => {
    fixCount++;
    return '          <AnalogIO>';
  });

  // Fix any other common HardwareConfiguration elements at column 0
  // <Extensions> should be 6 spaces
  xml = xml.replace(/^<Extensions>/gm, (match) => {
    fixCount++;
    return '      <Extensions>';
  });
  xml = xml.replace(/^<\/Extensions>/gm, (match) => {
    fixCount++;
    return '      </Extensions>';
  });

  // <AnalogInputs> should be 8 spaces
  xml = xml.replace(/^<AnalogInputs>/gm, (match) => {
    fixCount++;
    return '        <AnalogInputs>';
  });
  xml = xml.replace(/^<\/AnalogInputs>/gm, (match) => {
    fixCount++;
    return '        </AnalogInputs>';
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} unindented tags in <HardwareConfiguration> section`);
  }

  return xml;
}

/**
 * CRITICAL: Normalize all line endings to CRLF (Windows format).
 * Machine Expert Basic requires consistent CRLF line endings.
 * Mixed line endings (LF and CRLF) cause "file format is invalid" error!
 */
function normalizeLineEndings(xml: string): string {
  // First convert all CRLF to LF, then convert all LF to CRLF
  // This ensures consistent CRLF throughout
  return xml
    .replace(/\r\n/g, '\n')  // CRLF -> LF
    .replace(/\r/g, '\n')    // Stray CR -> LF
    .replace(/\n/g, '\r\n'); // LF -> CRLF
}

/**
 * Convert empty element pairs like <Symbol></Symbol> to self-closing format <Symbol />
 * Machine Expert Basic requires self-closing format for empty elements.
 */
function convertEmptyElementsToSelfClosing(xml: string): string {
  let fixCount = 0;

  // Convert <ElementName></ElementName> to <ElementName />
  // Match any XML tag that has no content between open and close
  xml = xml.replace(/<(\w+)><\/\1>/g, (match, tagName) => {
    fixCount++;
    return `<${tagName} />`;
  });

  // Also handle tags with whitespace-only content
  xml = xml.replace(/<(\w+)>\s*<\/\1>/g, (match, tagName) => {
    fixCount++;
    return `<${tagName} />`;
  });

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Converted ${fixCount} empty elements to self-closing format`);
  }

  return xml;
}

/**
 * SAFETY NET: Fix unbalanced InstructionLineEntity tags.
 * If there are more opening than closing tags, find and fix the malformed ones.
 */
function fixUnbalancedInstructionLineEntity(xml: string): string {
  const openCount = (xml.match(/<InstructionLineEntity>/g) || []).length;
  const closeCount = (xml.match(/<\/InstructionLineEntity>/g) || []).length;

  if (openCount === closeCount) {
    return xml; // Already balanced
  }

  console.log(`[smbp-xml-fixer] Found unbalanced InstructionLineEntity: ${openCount} open, ${closeCount} close`);

  if (openCount > closeCount) {
    // More opening tags - find InstructionLineEntity without proper closing
    // Pattern: <InstructionLineEntity> followed by <InstructionLine>...</InstructionLine> but NOT followed by </InstructionLineEntity>
    let fixCount = 0;
    xml = xml.replace(
      /<InstructionLineEntity>\s*\r?\n\s*(<InstructionLine>[\s\S]*?<\/InstructionLine>)\s*\r?\n\s*(?!<Comment|<\/InstructionLineEntity>)/g,
      (match, instructionLine) => {
        fixCount++;
        // Use minimal indentation - normalizeRungIndentation will apply correct indentation
        return `<InstructionLineEntity>\r\n${instructionLine}\r\n<Comment />\r\n</InstructionLineEntity>\r\n`;
      }
    );

    if (fixCount > 0) {
      console.log(`[smbp-xml-fixer] Fixed ${fixCount} unclosed InstructionLineEntity tags`);
    }

    // Re-check and if still unbalanced, try a more aggressive fix
    const newOpenCount = (xml.match(/<InstructionLineEntity>/g) || []).length;
    const newCloseCount = (xml.match(/<\/InstructionLineEntity>/g) || []).length;

    if (newOpenCount > newCloseCount) {
      const diff = newOpenCount - newCloseCount;
      console.log(`[smbp-xml-fixer] Still ${diff} unbalanced InstructionLineEntity tags - attempting aggressive fix`);

      // Find InstructionLineEntity that opens but never closes before next InstructionLines closing
      // and add the missing </InstructionLineEntity>
      // Use minimal indentation - normalizeRungIndentation will apply correct indentation
      xml = xml.replace(
        /(<InstructionLineEntity>\s*\r?\n\s*<InstructionLine>[^<]*<\/InstructionLine>)(\s*\r?\n\s*<InstructionLineEntity>)/g,
        (match, firstBlock, secondOpen) => {
          return `${firstBlock}\r\n<Comment />\r\n</InstructionLineEntity>${secondOpen}`;
        }
      );
    }
  } else if (closeCount > openCount) {
    // More closing tags than opening - remove orphaned closing tags
    const extra = closeCount - openCount;
    console.log(`[smbp-xml-fixer] Found ${extra} extra </InstructionLineEntity> closing tags - removing orphans`);

    // Strategy: Find </InstructionLineEntity> that appear without a matching open tag
    // Pattern 1: Double closing tags </InstructionLineEntity></InstructionLineEntity>
    let removeCount = 0;
    xml = xml.replace(
      /(<\/InstructionLineEntity>)\s*(<\/InstructionLineEntity>)/g,
      (match, first, second) => {
        if (removeCount < extra) {
          removeCount++;
          return first; // Keep only one
        }
        return match;
      }
    );

    // Pattern 2: Closing tag right after </InstructionLines> (orphaned)
    xml = xml.replace(
      /(<\/InstructionLines>)\s*<\/InstructionLineEntity>/g,
      (match, closeInstrLines) => {
        removeCount++;
        console.log(`[smbp-xml-fixer] Removed orphaned </InstructionLineEntity> after </InstructionLines>`);
        return closeInstrLines;
      }
    );

    // Pattern 3: Closing tag that appears immediately after another element's closing without content
    // This is more aggressive - look for patterns like: </Comment></InstructionLineEntity></InstructionLineEntity>
    const currentOpen = (xml.match(/<InstructionLineEntity>/g) || []).length;
    const currentClose = (xml.match(/<\/InstructionLineEntity>/g) || []).length;
    if (currentClose > currentOpen) {
      const stillExtra = currentClose - currentOpen;
      console.log(`[smbp-xml-fixer] Still ${stillExtra} extra closing tags - aggressive removal`);

      // Remove closing tags that appear right after </Comment> followed by another closing
      let aggressiveRemoved = 0;
      xml = xml.replace(
        /(<\/Comment>\s*<\/InstructionLineEntity>)\s*<\/InstructionLineEntity>/g,
        (match, validPart) => {
          if (aggressiveRemoved < stillExtra) {
            aggressiveRemoved++;
            return validPart;
          }
          return match;
        }
      );
    }

    if (removeCount > 0) {
      console.log(`[smbp-xml-fixer] Removed ${removeCount} orphaned </InstructionLineEntity> tags`);
    }
  }

  // Final aggressive fix: If still unbalanced, do a count-based removal
  let finalOpenCount = (xml.match(/<InstructionLineEntity>/g) || []).length;
  let finalCloseCount = (xml.match(/<\/InstructionLineEntity>/g) || []).length;

  if (finalCloseCount > finalOpenCount) {
    const remaining = finalCloseCount - finalOpenCount;
    console.log(`[smbp-xml-fixer] Still ${remaining} extra closing tags - using count-based removal`);

    // Remove orphan closing tags that appear alone on a line or after certain patterns
    let removed = 0;

    // Pattern 4: Closing tag on its own whitespace-surrounded line (orphaned)
    xml = xml.replace(
      /(\s*)<\/InstructionLineEntity>(\s*\r?\n)/g,
      (match, before, after) => {
        // Check if this is an orphan (not preceded by </Comment> or </InstructionLine>)
        // We keep the match if we've removed enough
        if (removed >= remaining) {
          return match;
        }
        // Only remove if it looks like an orphan (preceded by newline/whitespace only)
        if (before.includes('\n') || before.trim() === '') {
          removed++;
          return after;
        }
        return match;
      }
    );

    console.log(`[smbp-xml-fixer] Removed ${removed} orphan closing tags (count-based)`);

    // If STILL unbalanced, do brute-force removal of excess closing tags
    finalOpenCount = (xml.match(/<InstructionLineEntity>/g) || []).length;
    finalCloseCount = (xml.match(/<\/InstructionLineEntity>/g) || []).length;

    if (finalCloseCount > finalOpenCount) {
      const stillRemaining = finalCloseCount - finalOpenCount;
      console.log(`[smbp-xml-fixer] Brute-force removing ${stillRemaining} excess closing tags`);

      // Find all closing tags and remove the last N ones (they're likely orphans)
      let closingTagCount = 0;
      let totalClosingTags = finalCloseCount;
      xml = xml.replace(/<\/InstructionLineEntity>/g, (match) => {
        closingTagCount++;
        // Remove tags beyond the required count
        if (closingTagCount > finalOpenCount) {
          return ''; // Remove this orphan tag
        }
        return match;
      });
    }
  }

  // Final verification
  finalOpenCount = (xml.match(/<InstructionLineEntity>/g) || []).length;
  finalCloseCount = (xml.match(/<\/InstructionLineEntity>/g) || []).length;
  if (finalOpenCount !== finalCloseCount) {
    console.error(`[smbp-xml-fixer] WARNING: Still unbalanced InstructionLineEntity tags: ${finalOpenCount} open, ${finalCloseCount} close`);
  } else {
    console.log(`[smbp-xml-fixer] InstructionLineEntity tags now balanced: ${finalOpenCount}`);
  }

  return xml;
}

/**
 * SAFETY NET: Fix unbalanced LadderEntity tags.
 * If there are more opening than closing tags, find and fix the malformed ones.
 * This handles AI-generated content that has unclosed LadderEntity tags.
 */
function fixUnbalancedLadderEntity(xml: string): string {
  const openCount = (xml.match(/<LadderEntity>/g) || []).length;
  const closeCount = (xml.match(/<\/LadderEntity>/g) || []).length;

  if (openCount === closeCount) {
    return xml; // Already balanced
  }

  console.log(`[smbp-xml-fixer] Found unbalanced LadderEntity: ${openCount} open, ${closeCount} close`);

  if (openCount > closeCount) {
    // More opening tags than closing - need to add missing closing tags
    const missing = openCount - closeCount;
    let fixCount = 0;

    // Strategy 1: Find LadderEntity elements that are not properly closed
    // Pattern: <LadderEntity>...(no </LadderEntity>)...<LadderEntity> or </LadderElements>
    xml = xml.replace(
      /(<LadderEntity>[\s\S]*?<\/ChosenConnection>)(\s*)(<LadderEntity>|<\/LadderElements>)/g,
      (match, ladderContent, whitespace, next) => {
        if (ladderContent.includes('</LadderEntity>')) {
          return match;
        }
        if (fixCount < missing) {
          fixCount++;
          console.log(`[smbp-xml-fixer] Added missing </LadderEntity> before ${next.substring(0, 20)}...`);
          return `${ladderContent}\r\n              </LadderEntity>${whitespace}${next}`;
        }
        return match;
      }
    );

    if (fixCount > 0) {
      console.log(`[smbp-xml-fixer] Fixed ${fixCount} unclosed LadderEntity tags`);
    }

    // Strategy 2: Stack-based tag matching to find unclosed tags
    let newOpenCount = (xml.match(/<LadderEntity>/g) || []).length;
    let newCloseCount = (xml.match(/<\/LadderEntity>/g) || []).length;

    if (newOpenCount > newCloseCount) {
      const stillMissing = newOpenCount - newCloseCount;
      console.log(`[smbp-xml-fixer] Still ${stillMissing} unbalanced - using stack-based fix`);

      // Parse through and find unclosed LadderEntity tags
      const openTagRegex = /<LadderEntity>/g;
      const closeTagRegex = /<\/LadderEntity>/g;

      let openPositions: number[] = [];
      let closePositions: number[] = [];

      let match;
      while ((match = openTagRegex.exec(xml)) !== null) {
        openPositions.push(match.index);
      }
      while ((match = closeTagRegex.exec(xml)) !== null) {
        closePositions.push(match.index);
      }

      // Find which opening tags don't have a matching close
      // Use stack-based matching: each close matches the most recent unmatched open
      let stack: number[] = [];
      let matched = new Set<number>();

      let allTags: {type: 'open' | 'close', pos: number}[] = [
        ...openPositions.map(p => ({type: 'open' as const, pos: p})),
        ...closePositions.map(p => ({type: 'close' as const, pos: p}))
      ].sort((a, b) => a.pos - b.pos);

      for (const tag of allTags) {
        if (tag.type === 'open') {
          stack.push(tag.pos);
        } else {
          if (stack.length > 0) {
            const openPos = stack.pop()!;
            matched.add(openPos);
          }
        }
      }

      // stack now contains positions of unmatched opening tags
      if (stack.length > 0) {
        console.log(`[smbp-xml-fixer] Found ${stack.length} unclosed LadderEntity at positions: ${stack.join(', ')}`);

        // Insert closing tags after each unclosed opening tag's content
        // We need to find where each LadderEntity's content ends
        let insertions: {pos: number, text: string}[] = [];

        for (const openPos of stack) {
          // Find where this LadderEntity should end
          // Look for the next LadderEntity open tag or </LadderElements>
          const searchStart = openPos + '<LadderEntity>'.length;
          const nextOpenIdx = xml.indexOf('<LadderEntity>', searchStart);
          const nextCloseElementsIdx = xml.indexOf('</LadderElements>', searchStart);

          let insertPos = -1;

          // Find the closest boundary
          if (nextOpenIdx > 0 && nextCloseElementsIdx > 0) {
            insertPos = Math.min(nextOpenIdx, nextCloseElementsIdx);
          } else if (nextOpenIdx > 0) {
            insertPos = nextOpenIdx;
          } else if (nextCloseElementsIdx > 0) {
            insertPos = nextCloseElementsIdx;
          }

          if (insertPos > 0) {
            // Find proper insertion point (before the next tag, with proper indentation)
            // Look backwards for whitespace/newline
            let actualInsertPos = insertPos;
            while (actualInsertPos > searchStart && /\s/.test(xml[actualInsertPos - 1])) {
              actualInsertPos--;
            }
            insertions.push({pos: actualInsertPos, text: '\r\n              </LadderEntity>'});
          }
        }

        // Apply insertions from end to start to preserve positions
        insertions.sort((a, b) => b.pos - a.pos);
        for (const ins of insertions) {
          xml = xml.substring(0, ins.pos) + ins.text + xml.substring(ins.pos);
          console.log(`[smbp-xml-fixer] Inserted </LadderEntity> at position ${ins.pos}`);
        }
      }
    }

    // Strategy 3: Last resort - insert closing tags before </LadderElements>
    newOpenCount = (xml.match(/<LadderEntity>/g) || []).length;
    newCloseCount = (xml.match(/<\/LadderEntity>/g) || []).length;

    if (newOpenCount > newCloseCount) {
      const stillMissing = newOpenCount - newCloseCount;
      console.log(`[smbp-xml-fixer] Still ${stillMissing} unbalanced - using brute force fix`);

      // Find all </LadderElements> and insert missing closing tags before them
      let bruteFixCount = 0;
      xml = xml.replace(
        /(<\/LadderElements>)/g,
        (match, closeElements) => {
          if (bruteFixCount < stillMissing) {
            bruteFixCount++;
            console.log(`[smbp-xml-fixer] Brute force: Added </LadderEntity> before </LadderElements>`);
            return `</LadderEntity>\r\n            ${closeElements}`;
          }
          return match;
        }
      );

      if (bruteFixCount > 0) {
        console.log(`[smbp-xml-fixer] Brute force added ${bruteFixCount} closing tags`);
      }
    }
  } else if (closeCount > openCount) {
    // More closing tags than opening - need to remove extra closing tags
    const extra = closeCount - openCount;
    console.log(`[smbp-xml-fixer] Found ${extra} extra </LadderEntity> closing tags`);

    // Remove orphaned closing tags - find double closing tags or orphans
    let removeCount = 0;

    // Pattern 1: Double closing tags
    xml = xml.replace(
      /<\/LadderEntity>\s*<\/LadderEntity>/g,
      (match) => {
        if (removeCount < extra) {
          removeCount++;
          console.log(`[smbp-xml-fixer] Removed duplicate </LadderEntity>`);
          return '</LadderEntity>';
        }
        return match;
      }
    );

    // Pattern 2: Orphan closing tag (</LadderEntity> not preceded by LadderEntity content)
    if (removeCount < extra) {
      const remaining = extra - removeCount;
      let orphanCount = 0;
      xml = xml.replace(
        /(<\/LadderElements>)\s*(<\/LadderEntity>)/g,
        (match, closeElements, closeEntity) => {
          if (orphanCount < remaining) {
            orphanCount++;
            console.log(`[smbp-xml-fixer] Removed orphan </LadderEntity> after </LadderElements>`);
            return closeElements;
          }
          return match;
        }
      );
      removeCount += orphanCount;
    }

    if (removeCount > 0) {
      console.log(`[smbp-xml-fixer] Removed ${removeCount} extra closing tags`);
    }
  }

  // Final count
  const finalOpenCount = (xml.match(/<LadderEntity>/g) || []).length;
  const finalCloseCount = (xml.match(/<\/LadderEntity>/g) || []).length;
  if (finalOpenCount !== finalCloseCount) {
    console.error(`[smbp-xml-fixer] WARNING: Still unbalanced LadderEntity tags: ${finalOpenCount} open, ${finalCloseCount} close`);
  } else {
    console.log(`[smbp-xml-fixer] LadderEntity tags now balanced: ${finalOpenCount} open, ${finalCloseCount} close`);
  }

  return xml;
}

/**
 * CRITICAL RULE v3.0/v3.11: NEVER use %IW directly in calculations!
 * Detects INT_TO_REAL(%IW*.*) and fixes by changing to INT_TO_REAL(%MW100+channel)
 *
 * The AI sometimes generates:
 *   <OperationExpression>%MF102 := INT_TO_REAL(%IW1.0)</OperationExpression>
 *
 * This MUST be fixed to:
 *   <OperationExpression>%MF102 := INT_TO_REAL(%MW100)</OperationExpression>
 *
 * Note: The copy operation %MW100 := %IW1.0 should be generated by the AI in a separate rung.
 * This fixer only handles the INT_TO_REAL part.
 */
function fixDirectIWUsage(xml: string): string {
  let fixCount = 0;

  // Pattern 1: Fix in OperationExpression tags
  // Matches: <OperationExpression>%MFxxx := INT_TO_REAL(%IWslot.channel)</OperationExpression>
  xml = xml.replace(
    /<OperationExpression>(%MF\d+)\s*:=\s*INT_TO_REAL\(%IW(\d+)\.(\d+)\)<\/OperationExpression>/g,
    (match, mfAddr, slot, channel) => {
      fixCount++;
      // Use %MW100 + channel as the intermediate address
      const mwAddr = `%MW${100 + parseInt(channel)}`;
      console.log(`[smbp-xml-fixer] CRITICAL FIX: Direct %IW usage detected in OperationExpression!`);
      console.log(`[smbp-xml-fixer]   Changing INT_TO_REAL(%IW${slot}.${channel}) to INT_TO_REAL(${mwAddr})`);
      return `<OperationExpression>${mfAddr} := INT_TO_REAL(${mwAddr})</OperationExpression>`;
    }
  );

  // Pattern 2: Fix in InstructionLine bracket notation
  // Matches: [ %MFxxx := INT_TO_REAL(%IWslot.channel) ]
  xml = xml.replace(
    /\[\s*(%MF\d+)\s*:=\s*INT_TO_REAL\(%IW(\d+)\.(\d+)\)\s*\]/g,
    (match, mfAddr, slot, channel) => {
      fixCount++;
      const mwAddr = `%MW${100 + parseInt(channel)}`;
      console.log(`[smbp-xml-fixer] CRITICAL FIX: Direct %IW usage detected in InstructionLine!`);
      console.log(`[smbp-xml-fixer]   Changing INT_TO_REAL(%IW${slot}.${channel}) to INT_TO_REAL(${mwAddr})`);
      return `[ ${mfAddr} := INT_TO_REAL(${mwAddr}) ]`;
    }
  );

  // Pattern 3: Fix in any other context (raw text)
  // Matches: INT_TO_REAL(%IWslot.channel) anywhere
  xml = xml.replace(
    /INT_TO_REAL\(%IW(\d+)\.(\d+)\)/g,
    (match, slot, channel) => {
      fixCount++;
      const mwAddr = `%MW${100 + parseInt(channel)}`;
      console.log(`[smbp-xml-fixer] CRITICAL FIX: Direct %IW usage detected!`);
      console.log(`[smbp-xml-fixer]   Changing INT_TO_REAL(%IW${slot}.${channel}) to INT_TO_REAL(${mwAddr})`);
      return `INT_TO_REAL(${mwAddr})`;
    }
  );

  if (fixCount > 0) {
    console.log(`[smbp-xml-fixer] Fixed ${fixCount} direct %IW usage violations (v3.0/v3.11 rule)`);
  }

  return xml;
}

/**
 * Clean up stray empty lines in XML
 * When modules are removed or substituted, empty lines are left behind.
 * Machine Expert Basic XML parser fails on these stray empty lines.
 *
 * Issues fixed:
 * 1. Multiple consecutive blank lines (2+ blank lines in a row)
 * 2. Blank lines immediately inside XML elements (after opening tag, before content)
 */
function cleanEmptyLines(xml: string): string {
  let cleanCount = 0;

  // Step 1: Remove multiple consecutive blank lines (keep max 1)
  // Match 2 or more consecutive lines that are empty or contain only whitespace
  const before1 = xml.length;
  xml = xml.replace(/(\r?\n[ \t]*){3,}/g, '\r\n\r\n');
  if (xml.length !== before1) {
    cleanCount++;
    console.log('[smbp-xml-fixer] Removed multiple consecutive blank lines');
  }

  // Step 2: Remove blank lines immediately after opening tags (inside elements)
  // Match: >CRLF BLANK_LINE BLANK_LINE... <
  // CRITICAL: Use [ \t]* in group 2 to preserve indentation! \s* would consume it.
  const before2 = xml.length;
  xml = xml.replace(/>(\r?\n[ \t]*){2,}([ \t]*<)/g, '>\r\n$2');
  if (xml.length !== before2) {
    cleanCount++;
    console.log('[smbp-xml-fixer] Removed blank lines inside XML elements');
  }

  // Step 3: Specifically clean Extensions section
  // Remove empty lines between <Extensions> and <ModuleExtensionObject>
  // CRITICAL: Use [ \t]* (horizontal whitespace) not \s* to preserve indentation!
  // \s* is greedy and consumes indentation spaces as part of blank lines
  const before3 = xml.length;
  xml = xml.replace(/<Extensions>([ \t]*\r?\n)+([ \t]*<ModuleExtensionObject>)/g, '<Extensions>\r\n$2');
  if (xml.length !== before3) {
    cleanCount++;
    console.log('[smbp-xml-fixer] Cleaned empty lines in Extensions section');
  }

  // Step 4: Clean AnalogIO sections - remove blank lines after <IsInput>true</IsInput>
  // CRITICAL: Use [ \t]* (horizontal whitespace) not \s* to preserve indentation!
  const before4 = xml.length;
  xml = xml.replace(/<IsInput>true<\/IsInput>([ \t]*\r?\n)+([ \t]*<\/AnalogIO>)/g, '<IsInput>true</IsInput>\r\n$2');
  xml = xml.replace(/<IsInput>false<\/IsInput>([ \t]*\r?\n)+([ \t]*<\/AnalogIO>)/g, '<IsInput>false</IsInput>\r\n$2');
  if (xml.length !== before4) {
    cleanCount++;
    console.log('[smbp-xml-fixer] Cleaned empty lines in AnalogIO sections');
  }

  if (cleanCount > 0) {
    console.log(`[smbp-xml-fixer] Cleaned ${cleanCount} types of stray empty lines`);
  }

  return xml;
}
