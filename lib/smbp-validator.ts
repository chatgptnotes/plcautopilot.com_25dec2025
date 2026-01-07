/**
 * SMBP Validator - Post-processor to validate generated files
 * Checks for all known issues that cause "file format is invalid" error in Machine Expert Basic
 */

export interface ValidationError {
  code: string;
  message: string;
  count?: number;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate SMBP XML content for known issues
 * Returns validation result with errors and warnings
 */
export function validateSmbpXml(xml: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!xml || xml.trim() === '') {
    errors.push({
      code: 'EMPTY_CONTENT',
      message: 'Generated content is empty',
      suggestion: 'Check generation process'
    });
    return { valid: false, errors, warnings };
  }

  // 1. Check for "undefined" values in XML
  const undefinedMatches = xml.match(/>undefined</g);
  if (undefinedMatches) {
    errors.push({
      code: 'UNDEFINED_VALUE',
      message: `Found "undefined" values in XML content`,
      count: undefinedMatches.length,
      suggestion: 'Check timer presets, addresses, and other generated values'
    });
  }

  // 2. Check for empty Address in TimerTM
  const emptyTimerAddresses = xml.match(/<TimerTM>[\s\S]*?<Address><\/Address>[\s\S]*?<\/TimerTM>/g);
  if (emptyTimerAddresses) {
    errors.push({
      code: 'EMPTY_TIMER_ADDRESS',
      message: 'Timer(s) have empty Address field',
      count: emptyTimerAddresses.length,
      suggestion: 'Ensure all timers have valid %TM addresses'
    });
  }

  // 3. Check for duplicate timer addresses
  const timerMatches = xml.match(/<Address>%TM\d+<\/Address>/g);
  if (timerMatches) {
    const addresses = timerMatches.map(m => m.match(/%TM\d+/)?.[0]).filter(Boolean);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const addr of addresses) {
      if (addr && seen.has(addr)) {
        duplicates.add(addr);
      }
      if (addr) seen.add(addr);
    }
    if (duplicates.size > 0) {
      errors.push({
        code: 'DUPLICATE_TIMER',
        message: `Duplicate timer addresses: ${[...duplicates].join(', ')}`,
        count: duplicates.size,
        suggestion: 'Each timer must have a unique address'
      });
    }
  }

  // 4. Check for invalid XML tags (common AI typos)
  const invalidTags = [
    { pattern: /<LadderElement>/g, name: 'LadderElement', correct: 'LadderEntity' },
    { pattern: /<LladderEntity>/g, name: 'LladderEntity', correct: 'LadderEntity' },
    { pattern: /<LadlerEntity>/g, name: 'LadlerEntity', correct: 'LadderEntity' },
    { pattern: /<LadderEnity>/g, name: 'LadderEnity', correct: 'LadderEntity' },
    { pattern: /<LadderEntiy>/g, name: 'LadderEntiy', correct: 'LadderEntity' },
    { pattern: /<RungEnity>/g, name: 'RungEnity', correct: 'RungEntity' },
    { pattern: /<RunEntity>/g, name: 'RunEntity', correct: 'RungEntity' },
    { pattern: /<InstructionLineEnity>/g, name: 'InstructionLineEnity', correct: 'InstructionLineEntity' },
  ];
  for (const tag of invalidTags) {
    const matches = xml.match(tag.pattern);
    if (matches) {
      errors.push({
        code: 'INVALID_TAG',
        message: `Invalid XML tag <${tag.name}> (should be <${tag.correct}>)`,
        count: matches.length,
        suggestion: `Replace all <${tag.name}> with <${tag.correct}>`
      });
    }
  }

  // 5. Check for mismatched LadderEntity open/close tags
  const ladderOpen = (xml.match(/<LadderEntity>/g) || []).length;
  const ladderClose = (xml.match(/<\/LadderEntity>/g) || []).length;
  if (ladderOpen !== ladderClose) {
    errors.push({
      code: 'UNBALANCED_LADDER_TAGS',
      message: `Unbalanced LadderEntity tags: ${ladderOpen} opening, ${ladderClose} closing`,
      suggestion: 'Check for unclosed or extra closing tags'
    });
  }

  // 6. Check for mismatched RungEntity open/close tags
  const rungOpen = (xml.match(/<RungEntity>/g) || []).length;
  const rungClose = (xml.match(/<\/RungEntity>/g) || []).length;
  if (rungOpen !== rungClose) {
    errors.push({
      code: 'UNBALANCED_RUNG_TAGS',
      message: `Unbalanced RungEntity tags: ${rungOpen} opening, ${rungClose} closing`,
      suggestion: 'Check for unclosed or extra closing rungs'
    });
  }

  // 6.5. Check for mismatched InstructionLineEntity open/close tags
  const instrOpen = (xml.match(/<InstructionLineEntity>/g) || []).length;
  const instrClose = (xml.match(/<\/InstructionLineEntity>/g) || []).length;
  if (instrOpen !== instrClose) {
    errors.push({
      code: 'UNBALANCED_INSTRUCTION_TAGS',
      message: `Unbalanced InstructionLineEntity tags: ${instrOpen} opening, ${instrClose} closing`,
      suggestion: 'Check for unclosed instruction line entities'
    });
  }

  // 7. Check for empty required elements (warnings)
  const emptyElementChecks = [
    { pattern: /<Descriptor><\/Descriptor>/g, name: 'Descriptor' },
    { pattern: /<ElementType><\/ElementType>/g, name: 'ElementType' },
    { pattern: /<Symbol><\/Symbol>/g, name: 'Symbol' },
  ];
  for (const elem of emptyElementChecks) {
    const matches = xml.match(elem.pattern);
    if (matches && matches.length > 5) { // Only warn if many empty elements
      warnings.push({
        code: 'EMPTY_ELEMENT',
        message: `Many empty ${elem.name} elements found`,
        count: matches.length,
        suggestion: 'This may cause issues in Machine Expert Basic'
      });
    }
  }

  // 8. Check XML is well-formed (basic structure check)
  if (!xml.includes('<?xml')) {
    errors.push({
      code: 'MISSING_XML_DECLARATION',
      message: 'Missing XML declaration',
      suggestion: 'File should start with <?xml version="1.0"?>'
    });
  }

  if (!xml.includes('<ProjectDescriptor')) {
    errors.push({
      code: 'MISSING_ROOT',
      message: 'Missing ProjectDescriptor root element',
      suggestion: 'File structure is corrupted'
    });
  }

  // 9. Check for NaN values
  const nanMatches = xml.match(/>NaN</g);
  if (nanMatches) {
    errors.push({
      code: 'NAN_VALUE',
      message: 'Found NaN (Not a Number) values',
      count: nanMatches.length,
      suggestion: 'Check numeric calculations in generation'
    });
  }

  // 10. Check for null values
  const nullMatches = xml.match(/>null</g);
  if (nullMatches) {
    errors.push({
      code: 'NULL_VALUE',
      message: 'Found null values',
      count: nullMatches.length,
      suggestion: 'Check for missing data in generation'
    });
  }

  // 11. Check for [object Object] (common JS serialization error)
  if (xml.includes('[object Object]')) {
    errors.push({
      code: 'OBJECT_SERIALIZATION',
      message: 'Found [object Object] string (improper serialization)',
      suggestion: 'Check object-to-string conversions'
    });
  }

  // Log validation summary
  console.log(`[smbp-validator] Validation complete: ${errors.length} errors, ${warnings.length} warnings`);

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
