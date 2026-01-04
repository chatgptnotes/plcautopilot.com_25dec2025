/**
 * Logic Comparator
 * Compares parsed requirements against extracted program logic
 * Uses hybrid approach: Pattern matching + AI verification
 * Version: 1.0
 */

import { parseRequirements, type RequirementParserResult, type ParsedRequirement } from './requirement-parser';
import { parseProgram, type ProgramParserResult, type ExtractedComparison, type ExtractedTimer } from './program-parser';

export interface VerificationMatch {
  requirementId: string;
  requirementText: string;
  implementationDetails: string;
  status: 'verified';
  confidence: number;
}

export interface VerificationMismatch {
  requirementId: string;
  requirementText: string;
  expected: string;
  found: string;
  issue: 'wrong_threshold' | 'wrong_operator' | 'wrong_timer' | 'missing_feature' | 'logic_error';
  severity: 'critical' | 'warning' | 'info';
  suggestion: string;
}

export interface VerificationMissing {
  requirementId: string;
  requirementText: string;
  description: string;
}

export interface VerificationExtra {
  description: string;
  details: string;
}

export interface VerificationResult {
  status: 'pass' | 'fail' | 'warning';
  score: number; // 0-100 percentage
  matches: VerificationMatch[];
  mismatches: VerificationMismatch[];
  missing: VerificationMissing[];
  extras: VerificationExtra[];
  summary: string;
  timestamp: string;
}

/**
 * Compare threshold values with tolerance
 */
function compareThresholds(expected: number, found: number, tolerance: number = 0.1): boolean {
  if (expected === found) return true;
  const diff = Math.abs(expected - found);
  const percentDiff = diff / Math.max(Math.abs(expected), 1);
  return percentDiff <= tolerance;
}

/**
 * Compare operators considering equivalent forms
 */
function compareOperators(expected: string, found: string): boolean {
  // Normalize operators
  const normalize = (op: string): string => {
    if (op === '==' || op === '=') return '=';
    if (op === '!=' || op === '<>') return '!=';
    return op;
  };

  return normalize(expected) === normalize(found);
}

/**
 * Find matching comparison in program for a requirement
 */
function findMatchingComparison(
  req: ParsedRequirement,
  comparisons: ExtractedComparison[]
): { match: ExtractedComparison | null; issue?: VerificationMismatch['issue']; details?: string } {
  if (!req.condition) return { match: null };

  const expectedThreshold = req.condition.threshold;
  const expectedOp = req.condition.operator;

  // Look for comparisons with similar thresholds
  for (const comp of comparisons) {
    // Check if threshold matches
    if (compareThresholds(expectedThreshold, comp.value)) {
      // Check operator
      if (compareOperators(expectedOp, comp.operator)) {
        return { match: comp };
      } else {
        return {
          match: comp,
          issue: 'wrong_operator',
          details: `Expected operator "${expectedOp}", found "${comp.operator}"`
        };
      }
    }
  }

  // Check if there's a close match with wrong threshold
  for (const comp of comparisons) {
    const diff = Math.abs(expectedThreshold - comp.value);
    if (diff < expectedThreshold * 0.5) { // Within 50%
      return {
        match: comp,
        issue: 'wrong_threshold',
        details: `Expected ${expectedThreshold}, found ${comp.value}`
      };
    }
  }

  return { match: null };
}

/**
 * Find matching timer in program for a requirement
 */
function findMatchingTimer(
  req: ParsedRequirement,
  timers: ExtractedTimer[]
): { match: ExtractedTimer | null; issue?: VerificationMismatch['issue']; details?: string } {
  if (!req.timer) return { match: null };

  const expectedDuration = req.timer.duration;
  const expectedPurpose = req.timer.purpose;

  // Look for timers with matching purpose
  for (const timer of timers) {
    const purposeMatch =
      timer.purpose.toLowerCase().includes(expectedPurpose.toLowerCase()) ||
      expectedPurpose.toLowerCase().includes(timer.purpose.toLowerCase());

    if (purposeMatch || timers.length === 1) {
      // Convert timer preset to seconds for comparison
      let timerSeconds = timer.preset;
      if (timer.base === 'TenMillisecond') timerSeconds = timer.preset * 0.01;
      else if (timer.base === 'HundredMillisecond') timerSeconds = timer.preset * 0.1;
      else if (timer.base === 'OneMinute') timerSeconds = timer.preset * 60;

      // Convert expected to seconds
      let expectedSeconds = expectedDuration;
      if (req.timer.unit === 'minutes') expectedSeconds = expectedDuration * 60;
      else if (req.timer.unit === 'hours') expectedSeconds = expectedDuration * 3600;

      if (compareThresholds(expectedSeconds, timerSeconds)) {
        return { match: timer };
      } else {
        return {
          match: timer,
          issue: 'wrong_timer',
          details: `Expected ${expectedSeconds}s, found ${timerSeconds}s (${timer.preset} ${timer.base})`
        };
      }
    }
  }

  return { match: null };
}

/**
 * Pattern-based comparison (Layer 1)
 */
function patternBasedComparison(
  requirements: RequirementParserResult,
  program: ProgramParserResult
): { matches: VerificationMatch[]; mismatches: VerificationMismatch[]; missing: VerificationMissing[] } {
  const matches: VerificationMatch[] = [];
  const mismatches: VerificationMismatch[] = [];
  const missing: VerificationMissing[] = [];

  for (const req of requirements.requirements) {
    switch (req.type) {
      case 'fill_control':
      case 'drain_control':
      case 'level_alarm': {
        const result = findMatchingComparison(req, program.comparisons);

        if (result.match && !result.issue) {
          matches.push({
            requirementId: req.id,
            requirementText: req.rawText,
            implementationDetails: `${result.match.address} ${result.match.operator} ${result.match.value} in "${result.match.rungName}"`,
            status: 'verified',
            confidence: 0.95
          });
        } else if (result.match && result.issue) {
          mismatches.push({
            requirementId: req.id,
            requirementText: req.rawText,
            expected: req.condition ? `${req.condition.variable} ${req.condition.operator} ${req.condition.threshold}${req.condition.unit}` : 'condition',
            found: `${result.match.address} ${result.match.operator} ${result.match.value}`,
            issue: result.issue,
            severity: result.issue === 'wrong_threshold' ? 'critical' : 'warning',
            suggestion: result.details || 'Check comparison logic'
          });
        } else {
          missing.push({
            requirementId: req.id,
            requirementText: req.rawText,
            description: `No matching comparison found for ${req.condition?.variable} ${req.condition?.operator} ${req.condition?.threshold}${req.condition?.unit}`
          });
        }
        break;
      }

      case 'timer': {
        const result = findMatchingTimer(req, program.timers);

        if (result.match && !result.issue) {
          matches.push({
            requirementId: req.id,
            requirementText: req.rawText,
            implementationDetails: `${result.match.address}: ${result.match.preset} ${result.match.base} (${result.match.purpose})`,
            status: 'verified',
            confidence: 0.9
          });
        } else if (result.match && result.issue) {
          mismatches.push({
            requirementId: req.id,
            requirementText: req.rawText,
            expected: `${req.timer?.duration} ${req.timer?.unit}`,
            found: `${result.match.preset} ${result.match.base}`,
            issue: result.issue,
            severity: 'warning',
            suggestion: result.details || 'Adjust timer preset'
          });
        } else if (req.timer) {
          missing.push({
            requirementId: req.id,
            requirementText: req.rawText,
            description: `No matching timer found for ${req.timer.duration} ${req.timer.unit} ${req.timer.purpose}`
          });
        }
        break;
      }

      case 'interlock': {
        // Check if emergency stop is implemented
        const hasInterlock = program.interlocks.some(i =>
          i.inputSymbol.toLowerCase().includes('emergency') ||
          i.inputSymbol.toLowerCase().includes('estop')
        );

        if (hasInterlock) {
          const interlock = program.interlocks.find(i =>
            i.inputSymbol.toLowerCase().includes('emergency') ||
            i.inputSymbol.toLowerCase().includes('estop')
          );
          matches.push({
            requirementId: req.id,
            requirementText: req.rawText,
            implementationDetails: `${interlock?.inputSymbol} (${interlock?.inputAddress}) blocks ${interlock?.blocksOutputs.join(', ')}`,
            status: 'verified',
            confidence: 0.95
          });
        } else {
          missing.push({
            requirementId: req.id,
            requirementText: req.rawText,
            description: 'Emergency stop interlock not found in program'
          });
        }
        break;
      }

      default:
        // For unknown types, mark as not verified
        if (req.condition || req.action) {
          missing.push({
            requirementId: req.id,
            requirementText: req.rawText,
            description: `Could not automatically verify requirement of type "${req.type}"`
          });
        }
    }
  }

  return { matches, mismatches, missing };
}

/**
 * Check for extra features in program not in requirements
 */
function findExtraFeatures(
  requirements: RequirementParserResult,
  program: ProgramParserResult
): VerificationExtra[] {
  const extras: VerificationExtra[] = [];

  // Check for comparisons not covered by requirements
  for (const comp of program.comparisons) {
    const isRequested = requirements.thresholds.some(t =>
      compareThresholds(t.value, comp.value, 0.2)
    );

    if (!isRequested) {
      extras.push({
        description: 'Additional comparison found',
        details: `${comp.address} ${comp.operator} ${comp.value} in "${comp.rungName}" (not in requirements)`
      });
    }
  }

  // Check for extra timers
  for (const timer of program.timers) {
    const isRequested = requirements.timers.some(t => {
      let expectedSeconds = t.duration;
      if (t.unit === 'minutes') expectedSeconds *= 60;
      return compareThresholds(expectedSeconds, timer.preset, 0.2);
    });

    if (!isRequested && timer.purpose !== 'startup_delay') {
      extras.push({
        description: 'Additional timer found',
        details: `${timer.address}: ${timer.preset} ${timer.base} in "${timer.rungName}" (not in requirements)`
      });
    }
  }

  return extras;
}

/**
 * Main verification function
 */
export function verifyProgram(userLogic: string, smbpContent: string): VerificationResult {
  // Parse both inputs
  const requirements = parseRequirements(userLogic);
  const program = parseProgram(smbpContent);

  // Pattern-based comparison
  const { matches, mismatches, missing } = patternBasedComparison(requirements, program);

  // Find extra features
  const extras = findExtraFeatures(requirements, program);

  // Calculate score
  const totalRequirements = requirements.requirements.length || 1;
  const matchedCount = matches.length;
  const mismatchCount = mismatches.filter(m => m.severity === 'critical').length;
  const score = Math.max(0, Math.round(((matchedCount - mismatchCount) / totalRequirements) * 100));

  // Determine status
  let status: VerificationResult['status'] = 'pass';
  if (mismatchCount > 0 || missing.length > 0) {
    status = mismatches.some(m => m.severity === 'critical') ? 'fail' : 'warning';
  }

  // Generate summary
  const summaryParts: string[] = [];
  if (matches.length > 0) {
    summaryParts.push(`${matches.length} requirement(s) verified`);
  }
  if (mismatches.length > 0) {
    summaryParts.push(`${mismatches.length} mismatch(es) found`);
  }
  if (missing.length > 0) {
    summaryParts.push(`${missing.length} requirement(s) not implemented`);
  }
  if (extras.length > 0) {
    summaryParts.push(`${extras.length} extra feature(s) detected`);
  }

  return {
    status,
    score,
    matches,
    mismatches,
    missing,
    extras,
    summary: summaryParts.join(', ') || 'No requirements to verify',
    timestamp: new Date().toISOString()
  };
}

/**
 * Format verification result for display
 */
export function formatVerificationResult(result: VerificationResult): string {
  const lines: string[] = [];

  // Header
  const statusEmoji = result.status === 'pass' ? '[PASS]' : result.status === 'fail' ? '[FAIL]' : '[WARN]';
  lines.push(`${statusEmoji} Verification Score: ${result.score}%`);
  lines.push(`Status: ${result.status.toUpperCase()}`);
  lines.push('');

  // Matches
  if (result.matches.length > 0) {
    lines.push('VERIFIED REQUIREMENTS:');
    result.matches.forEach(m => {
      lines.push(`  [OK] ${m.requirementText}`);
      lines.push(`       -> ${m.implementationDetails}`);
    });
    lines.push('');
  }

  // Mismatches
  if (result.mismatches.length > 0) {
    lines.push('MISMATCHES:');
    result.mismatches.forEach(m => {
      const severity = m.severity === 'critical' ? '[CRITICAL]' : '[WARNING]';
      lines.push(`  ${severity} ${m.requirementText}`);
      lines.push(`       Expected: ${m.expected}`);
      lines.push(`       Found: ${m.found}`);
      lines.push(`       Suggestion: ${m.suggestion}`);
    });
    lines.push('');
  }

  // Missing
  if (result.missing.length > 0) {
    lines.push('MISSING IMPLEMENTATIONS:');
    result.missing.forEach(m => {
      lines.push(`  [MISSING] ${m.requirementText}`);
      lines.push(`            ${m.description}`);
    });
    lines.push('');
  }

  // Extras
  if (result.extras.length > 0) {
    lines.push('ADDITIONAL FEATURES (not in requirements):');
    result.extras.forEach(e => {
      lines.push(`  [INFO] ${e.description}`);
      lines.push(`         ${e.details}`);
    });
    lines.push('');
  }

  lines.push(`Summary: ${result.summary}`);
  lines.push(`Verified at: ${result.timestamp}`);

  return lines.join('\n');
}
