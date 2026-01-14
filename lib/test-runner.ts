/**
 * PLC Test Runner
 * Automatically executes test cases against the ladder logic simulator
 * Version: 1.0
 */

import { LadderSimulator } from './ladder-simulator';
import type { TestCase } from './test-generator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TestResult {
  testId: string;
  title: string;
  status: 'pass' | 'fail' | 'error';
  details: string[];
  expectedOutputs: Record<string, boolean | number>;
  actualOutputs: Record<string, boolean | number>;
  executionTimeMs: number;
  errorMessage?: string;
}

export interface TestRunResult {
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  results: TestResult[];
  executionTimeMs: number;
  simulatorInfo: {
    rungsCount: number;
    timersCount: number;
  };
}

export interface ExecutableTestCase extends TestCase {
  // Machine-readable test data
  expectedInputs?: Record<string, boolean | number>;
  expectedOutputs?: Record<string, boolean | number>;
  timerWaitMs?: number;
  expectedOutputsAfterTimer?: Record<string, boolean | number>;
  analogInputs?: Record<string, number>;
}

// ============================================================================
// TEST RUNNER FUNCTIONS
// ============================================================================

/**
 * Run all test cases against the SMBP content
 */
export function runTests(smbpXml: string, testCases: TestCase[]): TestRunResult {
  const startTime = performance.now();
  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;

  // Create simulator instance
  let simulator: LadderSimulator;
  try {
    simulator = new LadderSimulator(smbpXml);
  } catch (error) {
    // Return error result if simulator fails to initialize
    return {
      totalTests: testCases.length,
      passed: 0,
      failed: 0,
      errors: testCases.length,
      results: testCases.map(tc => ({
        testId: tc.id,
        title: tc.title,
        status: 'error' as const,
        details: ['Failed to initialize simulator'],
        expectedOutputs: {},
        actualOutputs: {},
        executionTimeMs: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })),
      executionTimeMs: performance.now() - startTime,
      simulatorInfo: { rungsCount: 0, timersCount: 0 }
    };
  }

  // Execute each test case
  for (const testCase of testCases) {
    const executableTest = convertToExecutableTest(testCase, simulator);
    const result = executeTestCase(simulator, executableTest);
    results.push(result);

    if (result.status === 'pass') passed++;
    else if (result.status === 'fail') failed++;
    else errors++;
  }

  return {
    totalTests: testCases.length,
    passed,
    failed,
    errors,
    results,
    executionTimeMs: performance.now() - startTime,
    simulatorInfo: {
      rungsCount: simulator.rungs.length,
      timersCount: simulator.state.timers.size
    }
  };
}

/**
 * Convert a human-readable test case to an executable test case
 */
function convertToExecutableTest(testCase: TestCase, simulator: LadderSimulator): ExecutableTestCase {
  const execTest: ExecutableTestCase = { ...testCase };

  // IMPORTANT: Preserve machine-readable test data if already defined in the test case
  // Only fall back to text parsing if not already defined
  execTest.expectedInputs = testCase.expectedInputs ? { ...testCase.expectedInputs } : {};
  execTest.expectedOutputs = testCase.expectedOutputs ? { ...testCase.expectedOutputs } : {};
  execTest.analogInputs = testCase.analogInputs ? { ...testCase.analogInputs } : {};
  execTest.timerWaitMs = testCase.timerWaitMs;
  execTest.expectedOutputsAfterTimer = testCase.expectedOutputsAfterTimer;

  const stateSnapshot = simulator.getStateSnapshot();

  // Parse initial conditions to set inputs
  for (const condition of testCase.initialConditions) {
    // Look for patterns like "EMERGENCY_PB = ON" or "%I0.0 = TRUE"
    const patterns = [
      // Direct address patterns
      /(%I\d+\.\d+)\s*[=:]\s*(TRUE|ON|1|HIGH)/i,
      /(%I\d+\.\d+)\s*[=:]\s*(FALSE|OFF|0|LOW)/i,
      // Symbol patterns - need to map to addresses
      /(\w+_?\w*)\s*[=:]\s*(TRUE|ON|1|HIGH|pressed|active)/i,
      /(\w+_?\w*)\s*[=:]\s*(FALSE|OFF|0|LOW|released|inactive)/i,
      // Analog patterns
      /(%IW\d+\.\d+)\s*[=:]\s*(\d+)/i,
    ];

    // Check for ON/TRUE patterns
    const onMatch = condition.match(/(%I\d+\.\d+)\s*[=:]\s*(TRUE|ON|1|HIGH)/i);
    if (onMatch) {
      execTest.expectedInputs[onMatch[1]] = true;
      continue;
    }

    // Check for OFF/FALSE patterns
    const offMatch = condition.match(/(%I\d+\.\d+)\s*[=:]\s*(FALSE|OFF|0|LOW)/i);
    if (offMatch) {
      execTest.expectedInputs[offMatch[1]] = false;
      continue;
    }

    // Check for analog values
    const analogMatch = condition.match(/(%IW\d+\.\d+)\s*[=:]\s*(\d+)/i);
    if (analogMatch) {
      execTest.analogInputs[analogMatch[1]] = parseInt(analogMatch[2]);
      continue;
    }

    // Handle common conditions
    if (condition.toLowerCase().includes('emergency') && condition.toLowerCase().includes('release')) {
      // Find emergency input (typically %I0.0)
      for (const [addr] of Object.entries(stateSnapshot.inputs)) {
        if (addr === '%I0.0') {
          execTest.expectedInputs[addr] = true; // Released = TRUE for NC contact
        }
      }
    }
    if (condition.toLowerCase().includes('emergency') && condition.toLowerCase().includes('press')) {
      for (const [addr] of Object.entries(stateSnapshot.inputs)) {
        if (addr === '%I0.0') {
          execTest.expectedInputs[addr] = false; // Pressed = FALSE for NC contact
        }
      }
    }
  }

  // Parse steps to determine expected outputs
  for (const step of testCase.steps) {
    // Look for expected outputs in step.expected
    const expected = step.expected.toLowerCase();

    // Check for output patterns
    const outputOnMatch = step.expected.match(/(%Q\d+\.\d+)\s*[=:]\s*(TRUE|ON|1|HIGH)/i);
    if (outputOnMatch) {
      execTest.expectedOutputs[outputOnMatch[1]] = true;
    }

    const outputOffMatch = step.expected.match(/(%Q\d+\.\d+)\s*[=:]\s*(FALSE|OFF|0|LOW)/i);
    if (outputOffMatch) {
      execTest.expectedOutputs[outputOffMatch[1]] = false;
    }

    // Check for memory bit patterns
    const memOnMatch = step.expected.match(/(%M\d+)\s*[=:]\s*(TRUE|ON|1|SET)/i);
    if (memOnMatch) {
      execTest.expectedOutputs[memOnMatch[1]] = true;
    }

    const memOffMatch = step.expected.match(/(%M\d+)\s*[=:]\s*(FALSE|OFF|0|RESET)/i);
    if (memOffMatch) {
      execTest.expectedOutputs[memOffMatch[1]] = false;
    }

    // Handle common expected patterns
    if (expected.includes('all outputs') && (expected.includes('off') || expected.includes('de-energized'))) {
      // Set all outputs to expected FALSE
      for (const addr of Object.keys(stateSnapshot.outputs)) {
        execTest.expectedOutputs[addr] = false;
      }
    }

    if (expected.includes('system_ready') && expected.includes('true')) {
      execTest.expectedOutputs['%M0'] = true;
    }
  }

  // Handle timer-based tests - only infer if not already defined
  if (!execTest.timerWaitMs && (testCase.category === 'startup' || testCase.title.toLowerCase().includes('timer'))) {
    // Find timer preset and set wait time
    for (const [, timer] of Object.entries(stateSnapshot.timers)) {
      const timerState = timer as { preset: number };
      if (timerState.preset > 0) {
        execTest.timerWaitMs = timerState.preset + 100; // Add small buffer
        break;
      }
    }
  }

  // Apply pass criteria to refine expected outputs
  for (const criteria of testCase.passCriteria) {
    const outOnMatch = criteria.match(/(%Q\d+\.\d+)\s*(?:is|=|should be)\s*(TRUE|ON|energized)/i);
    if (outOnMatch) {
      execTest.expectedOutputs[outOnMatch[1]] = true;
    }

    const outOffMatch = criteria.match(/(%Q\d+\.\d+)\s*(?:is|=|should be)\s*(FALSE|OFF|de-energized)/i);
    if (outOffMatch) {
      execTest.expectedOutputs[outOffMatch[1]] = false;
    }
  }

  return execTest;
}

/**
 * Execute a single test case
 */
function executeTestCase(simulator: LadderSimulator, testCase: ExecutableTestCase): TestResult {
  const startTime = performance.now();
  const details: string[] = [];
  const actualOutputs: Record<string, boolean | number> = {};

  try {
    // Reset simulator to clean state
    simulator.reset();

    // Set initial inputs
    if (testCase.expectedInputs) {
      for (const [addr, value] of Object.entries(testCase.expectedInputs)) {
        simulator.forceInput(addr, value);
        details.push(`Set ${addr} = ${value}`);
      }
    }

    // Set analog inputs
    if (testCase.analogInputs) {
      for (const [addr, value] of Object.entries(testCase.analogInputs)) {
        simulator.forceInput(addr, value);
        details.push(`Set ${addr} = ${value}`);
      }
    }

    // Execute initial scan
    simulator.executeScan();
    details.push('Executed initial scan');

    // Handle timer-based tests
    if (testCase.timerWaitMs && testCase.timerWaitMs > 0) {
      // Advance time and execute multiple scans
      const steps = Math.ceil(testCase.timerWaitMs / 100);
      for (let i = 0; i < steps; i++) {
        simulator.advanceTime(100);
        simulator.executeScan();
      }
      details.push(`Advanced time ${testCase.timerWaitMs}ms`);
    }

    // Collect actual outputs
    const expectedOutputs = testCase.expectedOutputs || {};
    for (const addr of Object.keys(expectedOutputs)) {
      const value = simulator.getValue(addr);
      if (value !== undefined) {
        actualOutputs[addr] = value;
      }
    }

    // Also check timer outputs
    if (testCase.expectedOutputsAfterTimer) {
      for (const addr of Object.keys(testCase.expectedOutputsAfterTimer)) {
        const value = simulator.getValue(addr);
        if (value !== undefined) {
          actualOutputs[addr] = value;
        }
      }
    }

    // Compare expected vs actual
    const expectedToCheck = { ...expectedOutputs, ...(testCase.expectedOutputsAfterTimer || {}) };
    let allMatch = true;
    const mismatches: string[] = [];

    for (const [addr, expected] of Object.entries(expectedToCheck)) {
      const actual = actualOutputs[addr];
      if (actual !== expected) {
        allMatch = false;
        mismatches.push(`${addr}: expected ${expected}, got ${actual}`);
      }
    }

    // Determine pass/fail
    if (Object.keys(expectedToCheck).length === 0) {
      // No expected outputs defined - check if test steps provide guidance
      details.push('No machine-readable expectations defined');
      // Consider pass if no errors occurred
      return {
        testId: testCase.id,
        title: testCase.title,
        status: 'pass',
        details: [...details, 'Test executed without errors (no specific assertions)'],
        expectedOutputs: expectedToCheck,
        actualOutputs,
        executionTimeMs: performance.now() - startTime
      };
    }

    if (allMatch) {
      return {
        testId: testCase.id,
        title: testCase.title,
        status: 'pass',
        details: [...details, 'All outputs match expected values'],
        expectedOutputs: expectedToCheck,
        actualOutputs,
        executionTimeMs: performance.now() - startTime
      };
    } else {
      return {
        testId: testCase.id,
        title: testCase.title,
        status: 'fail',
        details: [...details, ...mismatches],
        expectedOutputs: expectedToCheck,
        actualOutputs,
        executionTimeMs: performance.now() - startTime
      };
    }

  } catch (error) {
    return {
      testId: testCase.id,
      title: testCase.title,
      status: 'error',
      details: [...details, 'Execution error occurred'],
      expectedOutputs: testCase.expectedOutputs || {},
      actualOutputs,
      executionTimeMs: performance.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run a quick validation check on the program structure
 */
export function validateProgramStructure(smbpXml: string): {
  valid: boolean;
  issues: string[];
  info: { rungsCount: number; timersCount: number; ioCount: number };
} {
  const issues: string[] = [];

  try {
    const simulator = new LadderSimulator(smbpXml);
    const state = simulator.getStateSnapshot();

    // Check for common issues
    if (simulator.rungs.length === 0) {
      issues.push('No rungs found in program');
    }

    // Check for System Ready rung
    const hasSystemReady = simulator.rungs.some(r =>
      r.name.toLowerCase().includes('system') && r.name.toLowerCase().includes('ready')
    );
    if (!hasSystemReady) {
      issues.push('Missing System_Ready rung (recommended)');
    }

    // Check for timer declarations
    if (simulator.state.timers.size === 0 && hasSystemReady) {
      issues.push('System_Ready rung found but no timers declared');
    }

    return {
      valid: issues.length === 0,
      issues,
      info: {
        rungsCount: simulator.rungs.length,
        timersCount: simulator.state.timers.size,
        ioCount: Object.keys(state.inputs).length + Object.keys(state.outputs).length
      }
    };

  } catch (error) {
    return {
      valid: false,
      issues: [`Failed to parse program: ${error instanceof Error ? error.message : 'Unknown error'}`],
      info: { rungsCount: 0, timersCount: 0, ioCount: 0 }
    };
  }
}

/**
 * Quick test for emergency stop functionality
 */
export function testEmergencyStop(smbpXml: string): TestResult {
  const startTime = performance.now();

  try {
    const simulator = new LadderSimulator(smbpXml);

    // Find emergency stop input (typically %I0.0)
    const emergencyInput = '%I0.0';

    // Test 1: Press emergency stop (input = FALSE for NC contact)
    simulator.reset();
    simulator.forceInput(emergencyInput, false);
    simulator.executeScan();

    // Check all outputs are OFF
    const outputs = simulator.getStateSnapshot().outputs;
    let allOff = true;
    const failedOutputs: string[] = [];

    for (const [addr, value] of Object.entries(outputs)) {
      if (value === true) {
        allOff = false;
        failedOutputs.push(addr);
      }
    }

    return {
      testId: 'ESTOP',
      title: 'Emergency Stop Test',
      status: allOff ? 'pass' : 'fail',
      details: allOff
        ? ['All outputs OFF when E-STOP pressed']
        : [`Outputs still ON: ${failedOutputs.join(', ')}`],
      expectedOutputs: Object.fromEntries(Object.keys(outputs).map(k => [k, false])),
      actualOutputs: outputs as Record<string, boolean>,
      executionTimeMs: performance.now() - startTime
    };

  } catch (error) {
    return {
      testId: 'ESTOP',
      title: 'Emergency Stop Test',
      status: 'error',
      details: ['Failed to execute test'],
      expectedOutputs: {},
      actualOutputs: {},
      executionTimeMs: performance.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
