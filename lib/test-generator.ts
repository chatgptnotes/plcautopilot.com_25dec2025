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
  // Machine-readable test data for automated execution
  expectedInputs?: Record<string, boolean | number>;
  expectedOutputs?: Record<string, boolean | number>;
  analogInputs?: Record<string, number>;
  timerWaitMs?: number;
  expectedOutputsAfterTimer?: Record<string, boolean | number>;
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
 * Also parses dedicated symbol sections (MemoryBits, MemoryWords, MemoryFloats) from full SMBP
 */
function extractMappings(rungsXml: string, fullSmbp?: string): { ios: IOMapping[], memories: MemoryMapping[] } {
  const ios: IOMapping[] = [];
  const memories: MemoryMapping[] = [];
  const seenAddresses = new Set<string>();

  // Build symbol lookup from dedicated sections if full SMBP provided
  const symbolLookup = new Map<string, { symbol: string; comment: string }>();

  if (fullSmbp) {
    // Parse MemoryBits section
    const memoryBitsSection = fullSmbp.match(/<MemoryBits>([\s\S]*?)<\/MemoryBits>/);
    if (memoryBitsSection) {
      const bitRegex = /<MemoryBit>[\s\S]*?<Address>([^<]+)<\/Address>[\s\S]*?<Symbol>([^<]*)<\/Symbol>[\s\S]*?<Comment>([^<]*)<\/Comment>[\s\S]*?<\/MemoryBit>/g;
      let m;
      while ((m = bitRegex.exec(memoryBitsSection[1])) !== null) {
        symbolLookup.set(m[1], { symbol: m[2], comment: m[3] });
      }
    }

    // Parse MemoryWords section
    const memoryWordsSection = fullSmbp.match(/<MemoryWords>([\s\S]*?)<\/MemoryWords>/);
    if (memoryWordsSection) {
      const wordRegex = /<MemoryWord>[\s\S]*?<Address>([^<]+)<\/Address>[\s\S]*?<Symbol>([^<]*)<\/Symbol>[\s\S]*?<Comment>([^<]*)<\/Comment>[\s\S]*?<\/MemoryWord>/g;
      let m;
      while ((m = wordRegex.exec(memoryWordsSection[1])) !== null) {
        symbolLookup.set(m[1], { symbol: m[2], comment: m[3] });
      }
    }

    // Parse MemoryFloats section
    const memoryFloatsSection = fullSmbp.match(/<MemoryFloats>([\s\S]*?)<\/MemoryFloats>/);
    if (memoryFloatsSection) {
      const floatRegex = /<MemoryFloat>[\s\S]*?<Address>([^<]+)<\/Address>[\s\S]*?<Symbol>([^<]*)<\/Symbol>[\s\S]*?<Comment>([^<]*)<\/Comment>[\s\S]*?<\/MemoryFloat>/g;
      let m;
      while ((m = floatRegex.exec(memoryFloatsSection[1])) !== null) {
        symbolLookup.set(m[1], { symbol: m[2], comment: m[3] });
      }
    }

    // Parse AnalogInputs from expansion modules for symbols
    const analogInputsRegex = /<AnalogIO>[\s\S]*?<Address>([^<]+)<\/Address>[\s\S]*?<Symbol>([^<]*)<\/Symbol>[\s\S]*?<\/AnalogIO>/g;
    let m;
    while ((m = analogInputsRegex.exec(fullSmbp)) !== null) {
      if (m[2] && m[2].trim()) {
        symbolLookup.set(m[1], { symbol: m[2], comment: 'Analog Input' });
      }
    }
  }

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

  // Extract analog inputs (%IW) - use symbol lookup
  const analogInputRegex = /%IW\d+\.\d+/g;
  while ((match = analogInputRegex.exec(rungsXml)) !== null) {
    const address = match[0];
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      const lookup = symbolLookup.get(address);
      ios.push({
        address,
        symbol: lookup?.symbol || '',
        description: lookup?.comment || 'Analog Input',
        type: 'analog_input'
      });
    }
  }

  // Extract memory bits (%M) - use symbol lookup
  const memoryBitRegex = /<Descriptor>(%M\d+)<\/Descriptor>[\s\S]*?<Symbol>([^<]*)<\/Symbol>/g;
  while ((match = memoryBitRegex.exec(rungsXml)) !== null) {
    const [, address, symbol] = match;
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      const lookup = symbolLookup.get(address);
      memories.push({
        address,
        symbol: lookup?.symbol || symbol || address,
        description: lookup?.comment || inferDescription(symbol, address),
        type: 'bit'
      });
    }
  }

  // Extract memory words (%MW) - use symbol lookup
  const memoryWordRegex = /%MW\d+/g;
  while ((match = memoryWordRegex.exec(rungsXml)) !== null) {
    const address = match[0];
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      const lookup = symbolLookup.get(address);
      memories.push({
        address,
        symbol: lookup?.symbol || '',
        description: lookup?.comment || 'Memory Word',
        type: 'word'
      });
    }
  }

  // Extract memory floats (%MF) - use symbol lookup
  const memoryFloatRegex = /%MF\d+/g;
  while ((match = memoryFloatRegex.exec(rungsXml)) !== null) {
    const address = match[0];
    if (!seenAddresses.has(address)) {
      seenAddresses.add(address);
      const lookup = symbolLookup.get(address);
      memories.push({
        address,
        symbol: lookup?.symbol || '',
        description: lookup?.comment || 'Memory Float (HMI)',
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
 * Extract symbol names from memory bit declarations
 * Returns array of uppercase symbol names
 */
function extractSymbols(rungsXml: string): string[] {
  const symbols: string[] = [];
  // Match <Symbol>SYMBOL_NAME</Symbol> patterns
  const symbolRegex = /<Symbol>([^<]+)<\/Symbol>/g;
  let match;
  while ((match = symbolRegex.exec(rungsXml)) !== null) {
    if (match[1] && match[1].trim()) {
      symbols.push(match[1].trim().toUpperCase());
    }
  }
  return [...new Set(symbols)]; // Remove duplicates
}

/**
 * Detect patterns in the ladder logic using SYMBOL-BASED detection
 * This is more accurate than address-based detection
 */
function detectPatterns(rungsXml: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const symbols = extractSymbols(rungsXml);
  const symbolsStr = symbols.join(' ');

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

  // SYMBOL-BASED Pattern Detection (checks actual symbol names, not just addresses)

  // Detect Traffic Light pattern (check FIRST - more specific than fill/drain)
  const hasGreenPhase = symbols.some(s => s.includes('GREEN'));
  const hasYellowPhase = symbols.some(s => s.includes('YELLOW') || s.includes('AMBER'));
  const hasRedPhase = symbols.some(s => s.includes('RED'));

  if (hasGreenPhase && hasYellowPhase && hasRedPhase) {
    patterns.push({
      type: 'traffic_light',
      confidence: 0.95,
      details: {
        phases: 'Green -> Yellow -> Red',
        description: 'Traffic light phase sequencing'
      }
    });
  }

  // Detect Fill/Drain Cycle pattern (ONLY if NOT a traffic light)
  // Check symbols, not just addresses
  const hasFillSymbol = symbols.some(s => s.includes('FILL') && !s.includes('TRAFFIC'));
  const hasDrainSymbol = symbols.some(s => s.includes('DRAIN') && !s.includes('TRAFFIC'));
  const hasWaitSymbol = symbols.some(s => s.includes('WAIT') && !s.includes('TRAFFIC'));

  if (hasFillSymbol && hasDrainSymbol && !hasGreenPhase) {
    patterns.push({
      type: 'fill_drain_cycle',
      confidence: hasWaitSymbol ? 0.95 : 0.8,
      details: {
        phases: hasWaitSymbol ? 'Fill -> Wait -> Drain' : 'Fill -> Drain',
        description: 'Tank fill/drain cycle control'
      }
    });
  }

  // Detect Motor Control pattern
  const hasMotorSymbol = symbols.some(s => s.includes('MOTOR') || s.includes('PUMP'));
  const hasStartStop = symbols.some(s => s.includes('START')) && symbols.some(s => s.includes('STOP'));

  if (hasMotorSymbol || hasStartStop) {
    patterns.push({
      type: 'motor_control',
      confidence: hasMotorSymbol && hasStartStop ? 0.95 : 0.85,
      details: {
        description: 'Motor or pump start/stop control'
      }
    });
  }

  // Detect Conveyor Control pattern
  const hasConveyor = symbols.some(s => s.includes('CONVEYOR') || s.includes('BELT'));
  if (hasConveyor) {
    patterns.push({
      type: 'conveyor_control',
      confidence: 0.9,
      details: {
        description: 'Conveyor belt control system'
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
  if (symbols.some(s => s.includes('TIMEOUT') || s.includes('ALARM'))) {
    patterns.push({
      type: 'timeout_protection',
      confidence: 0.9,
      details: {
        description: 'Timeout alarm for process protection'
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

  // Only add startup test if system_ready_timer pattern is detected
  const hasStartupTimer = patterns.some(p => p.type === 'system_ready_timer');

  if (hasStartupTimer) {
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
      ],
      // Machine-readable test data
      expectedInputs: { '%I0.0': true },  // E-STOP released (NC contact)
      expectedOutputs: { '%M0': false },   // System Ready initially OFF
      timerWaitMs: 3500,                   // Wait for 3-second startup timer + buffer
      expectedOutputsAfterTimer: { '%M0': true }  // System Ready ON after timer
    });
  }

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
          ],
          // Machine-readable: E-STOP pressed (NC contact = FALSE)
          expectedInputs: { '%I0.0': false },
          expectedOutputs: { '%M0': false },
          timerWaitMs: 5000,
          expectedOutputsAfterTimer: { '%M0': false }  // Should stay OFF with E-STOP pressed
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
          ],
          // Machine-readable: E-STOP pressed = all outputs OFF
          expectedInputs: { '%I0.0': false },
          expectedOutputs: { '%Q0.0': false, '%Q0.1': false, '%Q0.2': false }
        });
        break;

      case 'traffic_light':
        testCases.push({
          id: `TC${testId++}`,
          title: 'Traffic Light - Green Phase Start',
          description: 'Verify green phase activates on enable',
          category: 'operation',
          initialConditions: [
            'System Ready = 1',
            'Traffic Enable input active',
            'No phase currently active'
          ],
          steps: [
            { step: 1, action: 'Set enable input ON', expected: 'Green phase activates' },
            { step: 2, action: 'Check green output', expected: 'Green light ON' },
            { step: 3, action: 'Check other outputs', expected: 'Yellow and Red lights OFF' }
          ],
          passCriteria: [
            'Green phase starts when enabled',
            'Only green light is ON'
          ],
          expectedInputs: { '%I0.0': true, '%I0.1': true },
          expectedOutputs: { '%Q0.0': true, '%Q0.1': false, '%Q0.2': false }
        });

        testCases.push({
          id: `TC${testId++}`,
          title: 'Traffic Light - Green to Yellow Transition',
          description: 'Verify transition from green to yellow after timer',
          category: 'transition',
          initialConditions: [
            'Green phase active',
            'Green timer running'
          ],
          steps: [
            { step: 1, action: 'Wait for green timer', expected: 'Green timer expires' },
            { step: 2, action: 'Check phase transition', expected: 'Green phase ends, Yellow starts' },
            { step: 3, action: 'Check outputs', expected: 'Green OFF, Yellow ON, Red OFF' }
          ],
          passCriteria: [
            'Green to Yellow transition after timer',
            'Only yellow light is ON during yellow phase'
          ]
        });

        testCases.push({
          id: `TC${testId++}`,
          title: 'Traffic Light - Yellow to Red Transition',
          description: 'Verify transition from yellow to red after timer',
          category: 'transition',
          initialConditions: [
            'Yellow phase active',
            'Yellow timer running'
          ],
          steps: [
            { step: 1, action: 'Wait for yellow timer', expected: 'Yellow timer expires' },
            { step: 2, action: 'Check phase transition', expected: 'Yellow phase ends, Red starts' },
            { step: 3, action: 'Check outputs', expected: 'Green OFF, Yellow OFF, Red ON' }
          ],
          passCriteria: [
            'Yellow to Red transition after timer',
            'Only red light is ON during red phase'
          ]
        });

        testCases.push({
          id: `TC${testId++}`,
          title: 'Traffic Light - Full Cycle',
          description: 'Verify complete Green->Yellow->Red->Green cycle',
          category: 'operation',
          initialConditions: [
            'System Ready = 1',
            'Traffic enabled',
            'Starting from idle'
          ],
          steps: [
            { step: 1, action: 'Start sequence', expected: 'Green phase activates' },
            { step: 2, action: 'Wait for green timer', expected: 'Yellow phase activates' },
            { step: 3, action: 'Wait for yellow timer', expected: 'Red phase activates' },
            { step: 4, action: 'Wait for red timer', expected: 'Green phase activates (cycle repeats)' }
          ],
          passCriteria: [
            'Complete cycle executes in correct order',
            'Only one light ON at a time',
            'Cycle repeats continuously'
          ]
        });

        testCases.push({
          id: `TC${testId++}`,
          title: 'Traffic Light - Emergency All Red',
          description: 'Verify emergency input forces all lights to safe state',
          category: 'safety',
          initialConditions: [
            'Any phase active',
            'Traffic operating normally'
          ],
          steps: [
            { step: 1, action: 'Press emergency input', expected: 'All lights go to safe state' },
            { step: 2, action: 'Check outputs', expected: 'May go all RED or all OFF depending on design' },
            { step: 3, action: 'Release emergency', expected: 'Normal sequence resumes' }
          ],
          passCriteria: [
            'Emergency immediately affects outputs',
            'Safe state is maintained during emergency'
          ],
          expectedInputs: { '%I0.0': false },
          expectedOutputs: { '%Q0.0': false, '%Q0.1': false }
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
 * @param rungsXml - The <Rungs> section content
 * @param fullSmbp - Optional full SMBP content for symbol extraction from dedicated sections
 */
export function generateTests(rungsXml: string, fullSmbp?: string): TestGeneratorResult {
  // Extract I/O and memory mappings (with symbol lookup from full SMBP)
  const { ios, memories } = extractMappings(rungsXml, fullSmbp);

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
