/**
 * PLC Program Test Generator
 * Automatically generates test cases based on detected patterns in ladder logic
 * Version: 1.0
 */

export interface IOMapping {
  address: string;
  symbol: string;
  description: string;
  type: 'input' | 'output' | 'analog_input' | 'analog_output';
}

export interface MemoryMapping {
  address: string;
  symbol: string;
  description: string;
  type: 'bit' | 'word' | 'float' | 'timer' | 'counter';
}

export interface TestStep {
  step: number;
  action: string;
  expected: string;
}

export interface TestCase {
  id: string;
  title: string;
  description: string;
  category: 'startup' | 'safety' | 'operation' | 'transition' | 'fault' | 'manual';
  initialConditions: string[];
  steps: TestStep[];
  passCriteria: string[];
  result?: 'pass' | 'fail' | 'pending';
}

export interface DetectedPattern {
  type: string;
  confidence: number;
  details: Record<string, string>;
}

export interface TestGeneratorResult {
  ioMappings: IOMapping[];
  memoryMappings: MemoryMapping[];
  testCases: TestCase[];
  detectedPatterns: DetectedPattern[];
  summary: {
    totalTests: number;
    categories: Record<string, number>;
  };
}

/**
 * Parse rungs XML to extract I/O and memory mappings
 */
function extractMappings(rungsXml: string): { ios: IOMapping[], memories: MemoryMapping[] } {
  const ios: IOMapping[] = [];
  const memories: MemoryMapping[] = [];
  const seenAddresses = new Set<string>();

  // Extract digital inputs (%I)
  const inputRegex = /<Descriptor>(%I\d+\.\d+)<\/Descriptor>[\s\S]*?<Symbol>([^<]*)<\/Symbol>/g;
  let match;
  while ((match = inputRegex.exec(rungsXml)) !== null) {
    const [, address, symbol] = match;
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      ios.push({
        address,
        symbol: symbol || address,
        description: inferDescription(symbol, address),
        type: 'input'
      });
    }
  }

  // Extract digital outputs (%Q)
  const outputRegex = /<Descriptor>(%Q\d+\.\d+)<\/Descriptor>[\s\S]*?<Symbol>([^<]*)<\/Symbol>/g;
  while ((match = outputRegex.exec(rungsXml)) !== null) {
    const [, address, symbol] = match;
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      ios.push({
        address,
        symbol: symbol || address,
        description: inferDescription(symbol, address),
        type: 'output'
      });
    }
  }

  // Extract analog inputs (%IW)
  const analogInputRegex = /%IW\d+\.\d+/g;
  while ((match = analogInputRegex.exec(rungsXml)) !== null) {
    const address = match[0];
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      ios.push({
        address,
        symbol: '',
        description: 'Analog Input',
        type: 'analog_input'
      });
    }
  }

  // Extract memory bits (%M)
  const memoryBitRegex = /<Descriptor>(%M\d+)<\/Descriptor>[\s\S]*?<Symbol>([^<]*)<\/Symbol>/g;
  while ((match = memoryBitRegex.exec(rungsXml)) !== null) {
    const [, address, symbol] = match;
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      memories.push({
        address,
        symbol: symbol || address,
        description: inferDescription(symbol, address),
        type: 'bit'
      });
    }
  }

  // Extract memory words (%MW)
  const memoryWordRegex = /%MW\d+/g;
  while ((match = memoryWordRegex.exec(rungsXml)) !== null) {
    const address = match[0];
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      memories.push({
        address,
        symbol: '',
        description: 'Memory Word',
        type: 'word'
      });
    }
  }

  // Extract memory floats (%MF)
  const memoryFloatRegex = /%MF\d+/g;
  while ((match = memoryFloatRegex.exec(rungsXml)) !== null) {
    const address = match[0];
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      memories.push({
        address,
        symbol: '',
        description: 'Memory Float (HMI)',
        type: 'float'
      });
    }
  }

  // Extract timers (%TM)
  const timerRegex = /<Descriptor>(%TM\d+)<\/Descriptor>/g;
  while ((match = timerRegex.exec(rungsXml)) !== null) {
    const address = match[1];
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      memories.push({
        address,
        symbol: '',
        description: 'Timer',
        type: 'timer'
      });
    }
  }

  return { ios, memories };
}

/**
 * Infer description from symbol name
 */
function inferDescription(symbol: string, address: string): string {
  if (!symbol) return address;

  const symbolLower = symbol.toLowerCase();

  if (symbolLower.includes('emergency') || symbolLower.includes('estop')) {
    return 'Emergency Stop (NC)';
  }
  if (symbolLower.includes('inlet') || symbolLower.includes('fill')) {
    return 'Fill/Inlet Valve';
  }
  if (symbolLower.includes('outlet') || symbolLower.includes('drain')) {
    return 'Drain/Outlet Valve';
  }
  if (symbolLower.includes('ready')) {
    return 'System Ready Status';
  }
  if (symbolLower.includes('phase') || symbolLower.includes('stage')) {
    return 'Process Phase Indicator';
  }
  if (symbolLower.includes('timeout') || symbolLower.includes('alarm')) {
    return 'Alarm/Timeout Flag';
  }
  if (symbolLower.includes('motor') || symbolLower.includes('pump')) {
    return 'Motor/Pump Control';
  }
  if (symbolLower.includes('level')) {
    return 'Level Sensor/Value';
  }
  if (symbolLower.includes('temp')) {
    return 'Temperature Sensor/Value';
  }

  return symbol.replace(/_/g, ' ');
}

/**
 * Detect patterns in the ladder logic
 */
function detectPatterns(rungsXml: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Detect System Ready Timer pattern
  if (rungsXml.includes('%TM0') && (rungsXml.includes('SYSTEM_READY') || rungsXml.includes('%M0'))) {
    patterns.push({
      type: 'system_ready_timer',
      confidence: 0.95,
      details: {
        timer: '%TM0',
        output: '%M0',
        description: 'System startup delay timer'
      }
    });
  }

  // Detect Emergency Stop pattern
  if (rungsXml.includes('%I0.0') && (rungsXml.includes('EMERGENCY') || rungsXml.includes('ESTOP'))) {
    patterns.push({
      type: 'emergency_stop',
      confidence: 0.95,
      details: {
        input: '%I0.0',
        type: 'NC contact',
        description: 'Emergency stop interlock'
      }
    });
  }

  // Detect Fill/Drain Cycle pattern
  const hasFillPhase = rungsXml.includes('FILL') || rungsXml.includes('Fill') || rungsXml.includes('%M1');
  const hasDrainPhase = rungsXml.includes('DRAIN') || rungsXml.includes('Drain') || rungsXml.includes('%M3');
  const hasWaitPhase = rungsXml.includes('WAIT') || rungsXml.includes('Wait') || rungsXml.includes('%M2');

  if (hasFillPhase && hasDrainPhase) {
    patterns.push({
      type: 'fill_drain_cycle',
      confidence: hasWaitPhase ? 0.95 : 0.8,
      details: {
        phases: hasWaitPhase ? 'Fill -> Wait -> Drain' : 'Fill -> Drain',
        fillPhase: '%M1',
        waitPhase: hasWaitPhase ? '%M2' : 'none',
        drainPhase: '%M3'
      }
    });
  }

  // Detect Analog Scaling pattern
  if (rungsXml.includes('%IW') && rungsXml.includes('%MF')) {
    patterns.push({
      type: 'analog_scaling',
      confidence: 0.9,
      details: {
        source: '%IW (raw)',
        destination: '%MF (scaled)',
        description: '4-20mA to engineering units'
      }
    });
  }

  // Detect Timer Timeout pattern
  if (rungsXml.includes('TIMEOUT') || rungsXml.includes('Timeout')) {
    patterns.push({
      type: 'timeout_protection',
      confidence: 0.9,
      details: {
        description: 'Timeout alarm for process protection'
      }
    });
  }

  // Detect Motor Control pattern
  if (rungsXml.includes('MOTOR') || rungsXml.includes('PUMP')) {
    patterns.push({
      type: 'motor_control',
      confidence: 0.85,
      details: {
        description: 'Motor or pump control logic'
      }
    });
  }

  // Detect Level Threshold pattern
  if (rungsXml.includes('CompareBlock') || rungsXml.includes('Comparison')) {
    const thresholdMatch = rungsXml.match(/%MF\d+\s*[<>=]+\s*(\d+\.?\d*)/);
    if (thresholdMatch) {
      patterns.push({
        type: 'level_threshold',
        confidence: 0.9,
        details: {
          threshold: thresholdMatch[1],
          description: 'Level comparison for process control'
        }
      });
    }
  }

  return patterns;
}

/**
 * Generate test cases based on detected patterns
 */
function generateTestCases(patterns: DetectedPattern[], ios: IOMapping[], memories: MemoryMapping[]): TestCase[] {
  const testCases: TestCase[] = [];
  let testId = 1;

  // Always add basic startup test
  testCases.push({
    id: `TC${testId++}`,
    title: 'System Startup Sequence',
    description: 'Verify system initializes correctly after power-on',
    category: 'startup',
    initialConditions: [
      'PLC just powered on',
      'All outputs OFF',
      'Emergency stop not pressed'
    ],
    steps: [
      { step: 1, action: 'Power on PLC', expected: 'All outputs remain OFF' },
      { step: 2, action: 'Wait 1 second', expected: 'System still initializing' },
      { step: 3, action: 'Wait for startup timer', expected: 'System Ready activates' },
      { step: 4, action: 'Verify outputs', expected: 'No outputs activate during startup' }
    ],
    passCriteria: [
      'System Ready bit transitions from 0 to 1 after timer expires',
      'No outputs activate during startup delay'
    ]
  });

  // Generate pattern-specific tests
  for (const pattern of patterns) {
    switch (pattern.type) {
      case 'emergency_stop':
        testCases.push({
          id: `TC${testId++}`,
          title: 'Emergency Stop Blocks System Ready',
          description: 'Verify ESTOP prevents system from becoming ready',
          category: 'safety',
          initialConditions: [
            'PLC powered on',
            `${pattern.details.input} = 1 (ESTOP pressed)`
          ],
          steps: [
            { step: 1, action: 'Power on with ESTOP pressed', expected: 'Startup timer does NOT start' },
            { step: 2, action: 'Wait 5 seconds', expected: 'System Ready stays OFF' },
            { step: 3, action: 'Release ESTOP', expected: 'Startup timer begins counting' },
            { step: 4, action: 'Wait for timer', expected: 'System Ready turns ON' }
          ],
          passCriteria: [
            'System cannot become ready while ESTOP active',
            'Timer starts only after ESTOP released'
          ]
        });

        testCases.push({
          id: `TC${testId++}`,
          title: 'Emergency Stop During Operation',
          description: 'Verify ESTOP immediately stops all outputs',
          category: 'safety',
          initialConditions: [
            'System running normally',
            'One or more outputs active'
          ],
          steps: [
            { step: 1, action: 'Press ESTOP', expected: 'All outputs turn OFF immediately' },
            { step: 2, action: 'Verify process state', expected: 'Process phase remains latched' },
            { step: 3, action: 'Release ESTOP', expected: 'Outputs may resume if safe conditions met' }
          ],
          passCriteria: [
            'ESTOP immediately de-energizes all outputs',
            'Process state is preserved for safe restart'
          ]
        });
        break;

      case 'fill_drain_cycle':
        testCases.push({
          id: `TC${testId++}`,
          title: 'Start Fill Phase',
          description: 'Verify fill phase starts under correct conditions',
          category: 'operation',
          initialConditions: [
            'System Ready = 1',
            'Auto Mode = 1',
            'Run Command = 1',
            'Level below threshold'
          ],
          steps: [
            { step: 1, action: 'Verify initial state', expected: 'Fill Phase = 0' },
            { step: 2, action: 'Execute one scan', expected: 'Fill Phase = 1' },
            { step: 3, action: 'Check inlet valve', expected: 'Inlet valve OPENS' },
            { step: 4, action: 'Check outlet valve', expected: 'Outlet valve stays CLOSED' }
          ],
          passCriteria: [
            'Fill phase starts when all conditions met',
            'Only inlet valve opens during fill'
          ]
        });

        testCases.push({
          id: `TC${testId++}`,
          title: 'Fill Phase Level Control',
          description: 'Verify valve control based on level',
          category: 'operation',
          initialConditions: [
            'Fill Phase active',
            'ESTOP not pressed'
          ],
          steps: [
            { step: 1, action: 'Set level to 200 (below threshold)', expected: 'Inlet valve OPEN' },
            { step: 2, action: 'Set level to threshold - 1', expected: 'Inlet valve OPEN' },
            { step: 3, action: 'Set level to threshold', expected: 'Inlet valve OPEN' },
            { step: 4, action: 'Set level above threshold', expected: 'Inlet valve CLOSES' }
          ],
          passCriteria: [
            'Valve opens when level at or below threshold',
            'Valve closes when level exceeds threshold'
          ]
        });

        testCases.push({
          id: `TC${testId++}`,
          title: 'Fill Phase Ends at High Level',
          description: 'Verify fill phase terminates correctly',
          category: 'transition',
          initialConditions: [
            'Fill Phase = 1',
            'Level approaching threshold'
          ],
          steps: [
            { step: 1, action: 'Set level at threshold', expected: 'Fill Phase still active' },
            { step: 2, action: 'Set level above threshold', expected: 'Fill Phase RESETS to 0' },
            { step: 3, action: 'Check inlet valve', expected: 'Inlet valve CLOSES' }
          ],
          passCriteria: [
            'Fill phase resets when level exceeds threshold',
            'Inlet valve closes when fill ends'
          ]
        });

        if (pattern.details.waitPhase !== 'none') {
          testCases.push({
            id: `TC${testId++}`,
            title: 'Wait Phase Transition',
            description: 'Verify wait phase starts after fill completes',
            category: 'transition',
            initialConditions: [
              'Fill Phase just completed',
              'Wait Phase = 0',
              'Run command active'
            ],
            steps: [
              { step: 1, action: 'Fill phase ends', expected: 'Wait Phase = 1' },
              { step: 2, action: 'Check all valves', expected: 'Both valves CLOSED' },
              { step: 3, action: 'Wait for timer', expected: 'Timer counts down' },
              { step: 4, action: 'Timer expires', expected: 'Wait Phase = 0' }
            ],
            passCriteria: [
              'Wait phase activates after fill',
              'Both valves remain closed during wait',
              'Wait ends after timer expires'
            ]
          });
        }

        testCases.push({
          id: `TC${testId++}`,
          title: 'Drain Phase',
          description: 'Verify drain phase operation',
          category: 'operation',
          initialConditions: [
            'Previous phase complete',
            'Drain Phase = 0',
            'Run command active'
          ],
          steps: [
            { step: 1, action: 'Previous phase ends', expected: 'Drain Phase = 1' },
            { step: 2, action: 'Check outlet valve', expected: 'Outlet valve OPENS' },
            { step: 3, action: 'Check inlet valve', expected: 'Inlet valve stays CLOSED' },
            { step: 4, action: 'Simulate level drop', expected: 'Drain continues' },
            { step: 5, action: 'Level reaches low threshold', expected: 'Drain Phase = 0' }
          ],
          passCriteria: [
            'Only outlet valve opens during drain',
            'Drain ends at low level threshold'
          ]
        });

        testCases.push({
          id: `TC${testId++}`,
          title: 'Full Automatic Cycle',
          description: 'Verify complete cycle executes correctly',
          category: 'operation',
          initialConditions: [
            'System Ready = 1',
            'Auto Mode = 1',
            'Run Command = 1',
            'Level low'
          ],
          steps: [
            { step: 1, action: 'Start cycle', expected: 'Fill Phase active, inlet opens' },
            { step: 2, action: 'Simulate fill to high level', expected: 'Fill ends, Wait starts' },
            { step: 3, action: 'Wait timer expires', expected: 'Wait ends, Drain starts' },
            { step: 4, action: 'Simulate drain to low level', expected: 'Drain ends, cycle complete' },
            { step: 5, action: 'If continuous mode', expected: 'New fill cycle starts' }
          ],
          passCriteria: [
            'Complete FILL -> WAIT -> DRAIN cycle executes',
            'Only one phase active at a time',
            'Cycle repeats if run command active'
          ]
        });
        break;

      case 'timeout_protection':
        testCases.push({
          id: `TC${testId++}`,
          title: 'Timeout Protection',
          description: 'Verify timeout alarm activates if phase takes too long',
          category: 'fault',
          initialConditions: [
            'Process phase active',
            'Level not reaching target'
          ],
          steps: [
            { step: 1, action: 'Start phase (e.g., fill)', expected: 'Timeout timer starts' },
            { step: 2, action: 'Do NOT simulate level change', expected: 'Timer counts up' },
            { step: 3, action: 'Wait for timeout', expected: 'Timeout flag = 1' },
            { step: 4, action: 'Check phase status', expected: 'Phase RESETS (aborted)' },
            { step: 5, action: 'Check outputs', expected: 'Outputs turn OFF' }
          ],
          passCriteria: [
            'Timeout occurs if phase exceeds time limit',
            'Phase aborts on timeout',
            'Timeout flag set for alarm indication'
          ]
        });
        break;

      case 'analog_scaling':
        testCases.push({
          id: `TC${testId++}`,
          title: 'Analog Input Scaling',
          description: 'Verify 4-20mA input scales correctly',
          category: 'operation',
          initialConditions: [
            'Analog input connected',
            'Signal within range'
          ],
          steps: [
            { step: 1, action: 'Set raw input to 2000 (4mA)', expected: 'Scaled value = 0 (minimum)' },
            { step: 2, action: 'Set raw input to 6000 (12mA)', expected: 'Scaled value = 50% of range' },
            { step: 3, action: 'Set raw input to 10000 (20mA)', expected: 'Scaled value = 100% (maximum)' },
            { step: 4, action: 'Verify HMI display', expected: 'Value shown in engineering units' }
          ],
          passCriteria: [
            'Raw 2000 = minimum engineering value',
            'Raw 10000 = maximum engineering value',
            'Linear scaling between min and max'
          ]
        });
        break;
    }
  }

  // Add manual mode test
  testCases.push({
    id: `TC${testId++}`,
    title: 'Manual Mode - No Automatic Operation',
    description: 'Verify automatic phases do not start in manual mode',
    category: 'manual',
    initialConditions: [
      'System Ready = 1',
      'Auto Mode = 0 (Manual)',
      'Run Command = 1'
    ],
    steps: [
      { step: 1, action: 'Verify auto mode OFF', expected: 'Auto Mode = 0' },
      { step: 2, action: 'Check fill phase', expected: 'Fill Phase does NOT start' },
      { step: 3, action: 'Check all outputs', expected: 'All outputs remain OFF' }
    ],
    passCriteria: [
      'No automatic phases start in manual mode',
      'Outputs only respond to manual commands'
    ]
  });

  // Add stop command test
  testCases.push({
    id: `TC${testId++}`,
    title: 'Stop Command During Operation',
    description: 'Verify behavior when stop command issued during operation',
    category: 'operation',
    initialConditions: [
      'Process running (phase active)',
      'Run Command = 1',
      'One or more outputs active'
    ],
    steps: [
      { step: 1, action: 'Set Run Command = 0 (Stop)', expected: 'Note output behavior' },
      { step: 2, action: 'Observe next scan', expected: 'Check if valves close immediately' },
      { step: 3, action: 'Check phase status', expected: 'Phase may stay latched or reset' }
    ],
    passCriteria: [
      'Define expected behavior: immediate stop or cycle completion',
      'Document actual behavior for operator training'
    ]
  });

  return testCases;
}

/**
 * Main function to generate test cases from rungs XML
 */
export function generateTests(rungsXml: string): TestGeneratorResult {
  // Extract I/O and memory mappings
  const { ios, memories } = extractMappings(rungsXml);

  // Detect patterns in the logic
  const patterns = detectPatterns(rungsXml);

  // Generate test cases based on patterns
  const testCases = generateTestCases(patterns, ios, memories);

  // Calculate summary
  const categories: Record<string, number> = {};
  for (const tc of testCases) {
    categories[tc.category] = (categories[tc.category] || 0) + 1;
  }

  return {
    ioMappings: ios,
    memoryMappings: memories,
    testCases,
    detectedPatterns: patterns,
    summary: {
      totalTests: testCases.length,
      categories
    }
  };
}

/**
 * Format test results as markdown for display
 */
export function formatTestResultsMarkdown(result: TestGeneratorResult): string {
  let md = '# PLC Program Test Cases\n\n';

  // I/O Mapping Table
  if (result.ioMappings.length > 0) {
    md += '## I/O Mapping\n\n';
    md += '| Address | Symbol | Description | Type |\n';
    md += '|---------|--------|-------------|------|\n';
    for (const io of result.ioMappings) {
      md += `| ${io.address} | ${io.symbol} | ${io.description} | ${io.type} |\n`;
    }
    md += '\n';
  }

  // Memory Mapping Table
  if (result.memoryMappings.length > 0) {
    md += '## Memory Mapping\n\n';
    md += '| Address | Symbol | Description | Type |\n';
    md += '|---------|--------|-------------|------|\n';
    for (const mem of result.memoryMappings) {
      md += `| ${mem.address} | ${mem.symbol} | ${mem.description} | ${mem.type} |\n`;
    }
    md += '\n';
  }

  // Detected Patterns
  if (result.detectedPatterns.length > 0) {
    md += '## Detected Patterns\n\n';
    for (const pattern of result.detectedPatterns) {
      md += `- **${pattern.type}** (${Math.round(pattern.confidence * 100)}% confidence)\n`;
      if (pattern.details.description) {
        md += `  - ${pattern.details.description}\n`;
      }
    }
    md += '\n';
  }

  // Test Cases
  md += '## Test Scenarios\n\n';
  for (const tc of result.testCases) {
    md += `### ${tc.id}: ${tc.title}\n\n`;
    md += `**Category:** ${tc.category}\n\n`;
    md += `${tc.description}\n\n`;

    md += '**Initial Conditions:**\n';
    for (const cond of tc.initialConditions) {
      md += `- ${cond}\n`;
    }
    md += '\n';

    md += '**Steps:**\n\n';
    md += '| Step | Action | Expected Result |\n';
    md += '|------|--------|----------------|\n';
    for (const step of tc.steps) {
      md += `| ${step.step} | ${step.action} | ${step.expected} |\n`;
    }
    md += '\n';

    md += '**Pass Criteria:**\n';
    for (const crit of tc.passCriteria) {
      md += `- ${crit}\n`;
    }
    md += '\n---\n\n';
  }

  // Summary
  md += '## Test Summary\n\n';
  md += `**Total Tests:** ${result.summary.totalTests}\n\n`;
  md += '**By Category:**\n';
  for (const [cat, count] of Object.entries(result.summary.categories)) {
    md += `- ${cat}: ${count}\n`;
  }

  return md;
}
