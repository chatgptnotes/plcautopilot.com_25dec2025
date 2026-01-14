/**
 * Ladder Logic Simulator for SMBP Files
 * Simulates Schneider M221 PLC ladder logic execution
 * Version: 1.0
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TimerState {
  address: string;
  enabled: boolean;
  elapsed: number;      // milliseconds
  preset: number;       // milliseconds (from Base * Preset value)
  done: boolean;        // true when elapsed >= preset
  base: string;         // OneSecond, HundredMilliseconds, etc.
}

export interface PLCState {
  inputs: Map<string, boolean>;       // %I0.0 -> true/false
  outputs: Map<string, boolean>;      // %Q0.0 -> true/false
  memoryBits: Map<string, boolean>;   // %M0 -> true/false
  memoryWords: Map<string, number>;   // %MW100 -> integer value
  memoryFloats: Map<string, number>;  // %MF102 -> float value
  analogInputs: Map<string, number>;  // %IW1.0 -> raw analog value
  systemBits: Map<string, boolean>;   // %S0, %S1 -> system bits
  timers: Map<string, TimerState>;    // %TM0 -> timer state
}

export interface LadderElement {
  type: string;           // NormalContact, NegatedContact, Coil, etc.
  address: string;        // %I0.0, %Q0.0, %M0, etc.
  symbol?: string;        // EMERGENCY_PB, PUMP_OUTPUT, etc.
  row: number;
  column: number;
  connection: string;     // Left, Right, Up, Down combinations
  expression?: string;    // For Operation/CompareBlock
}

export interface ParsedRung {
  name: string;
  index: number;
  elements: LadderElement[];
  maxRow: number;
  maxColumn: number;
  instructionLines: string[];
}

export interface SimulationResult {
  scanTime: number;
  rungsExecuted: number;
  outputsChanged: string[];
  memoryChanged: string[];
  timersActive: string[];
}

// ============================================================================
// LADDER SIMULATOR CLASS
// ============================================================================

export class LadderSimulator {
  state: PLCState;
  rungs: ParsedRung[];
  timerPresets: Map<string, { preset: number; base: string }>;
  private smbpXml: string;

  constructor(smbpXml: string) {
    this.smbpXml = smbpXml;
    this.rungs = [];
    this.timerPresets = new Map();

    // Initialize state
    this.state = {
      inputs: new Map(),
      outputs: new Map(),
      memoryBits: new Map(),
      memoryWords: new Map(),
      memoryFloats: new Map(),
      analogInputs: new Map(),
      systemBits: new Map(),
      timers: new Map()
    };

    // Parse the SMBP XML
    this.parseTimers();
    this.parseRungs();
    this.initializeState();
  }

  // ==========================================================================
  // PARSING METHODS
  // ==========================================================================

  private parseTimers(): void {
    // Extract timer declarations from <Timers> section
    const timerRegex = /<TimerTM>([\s\S]*?)<\/TimerTM>/g;
    let match;

    while ((match = timerRegex.exec(this.smbpXml)) !== null) {
      const timerContent = match[1];

      const addressMatch = timerContent.match(/<Address>(%TM\d+)<\/Address>/);
      const presetMatch = timerContent.match(/<Preset>(\d+)<\/Preset>/);
      const baseMatch = timerContent.match(/<Base>(\w+)<\/Base>/);

      if (addressMatch && presetMatch) {
        const address = addressMatch[1];
        const preset = parseInt(presetMatch[1]);
        const base = baseMatch?.[1] || 'OneSecond';

        this.timerPresets.set(address, { preset, base });

        // Calculate preset in milliseconds
        const presetMs = this.calculateTimerPresetMs(preset, base);

        this.state.timers.set(address, {
          address,
          enabled: false,
          elapsed: 0,
          preset: presetMs,
          done: false,
          base
        });
      }
    }
  }

  private calculateTimerPresetMs(preset: number, base: string): number {
    switch (base) {
      case 'OneMillisecond': return preset * 1;
      case 'TenMilliseconds': return preset * 10;
      case 'HundredMilliseconds': return preset * 100;
      case 'OneSecond': return preset * 1000;
      case 'OneMinute': return preset * 60000;
      default: return preset * 1000; // Default to seconds
    }
  }

  private parseRungs(): void {
    const rungRegex = /<RungEntity>([\s\S]*?)<\/RungEntity>/g;
    let match;
    let rungIndex = 0;

    while ((match = rungRegex.exec(this.smbpXml)) !== null) {
      const rungContent = match[1];

      // Get rung name
      const nameMatch = rungContent.match(/<Name>([^<]*)<\/Name>/);
      const rungName = nameMatch ? nameMatch[1] : `Rung_${rungIndex}`;

      // Parse ladder elements
      const elements = this.parseLadderElements(rungContent);

      // Parse instruction lines
      const instructionLines = this.parseInstructionLines(rungContent);

      // Calculate max row and column
      let maxRow = 0;
      let maxColumn = 0;
      for (const elem of elements) {
        if (elem.row > maxRow) maxRow = elem.row;
        if (elem.column > maxColumn) maxColumn = elem.column;
      }

      this.rungs.push({
        name: rungName,
        index: rungIndex,
        elements,
        maxRow,
        maxColumn,
        instructionLines
      });

      rungIndex++;
    }
  }

  private parseLadderElements(rungContent: string): LadderElement[] {
    const elements: LadderElement[] = [];
    const elementRegex = /<LadderEntity>([\s\S]*?)<\/LadderEntity>/g;
    let match;

    while ((match = elementRegex.exec(rungContent)) !== null) {
      const elemContent = match[1];

      const typeMatch = elemContent.match(/<ElementType>([^<]+)<\/ElementType>/);
      const rowMatch = elemContent.match(/<Row>(\d+)<\/Row>/);
      const colMatch = elemContent.match(/<Column>(\d+)<\/Column>/);
      const connMatch = elemContent.match(/<ChosenConnection>([^<]*)<\/ChosenConnection>/);
      const descMatch = elemContent.match(/<Descriptor>([^<]*)<\/Descriptor>/);
      const symbolMatch = elemContent.match(/<Symbol>([^<]*)<\/Symbol>/);
      const opExprMatch = elemContent.match(/<OperationExpression>([^<]*)<\/OperationExpression>/);
      const compExprMatch = elemContent.match(/<CompareExpression>([^<]*)<\/CompareExpression>/);

      if (typeMatch && rowMatch && colMatch) {
        const element: LadderElement = {
          type: typeMatch[1],
          address: descMatch?.[1] || '',
          symbol: symbolMatch?.[1],
          row: parseInt(rowMatch[1]),
          column: parseInt(colMatch[1]),
          connection: connMatch?.[1] || 'None',
          expression: opExprMatch?.[1] || compExprMatch?.[1]
        };

        elements.push(element);
      }
    }

    // Sort by row then column for proper evaluation order
    elements.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.column - b.column;
    });

    return elements;
  }

  private parseInstructionLines(rungContent: string): string[] {
    const lines: string[] = [];
    const lineRegex = /<InstructionLine>([^<]+)<\/InstructionLine>/g;
    let match;

    while ((match = lineRegex.exec(rungContent)) !== null) {
      lines.push(match[1].trim());
    }

    return lines;
  }

  private initializeState(): void {
    // Initialize all addresses found in rungs to default values
    for (const rung of this.rungs) {
      for (const elem of rung.elements) {
        const addr = elem.address;
        if (!addr) continue;

        if (addr.match(/^%I\d+\.\d+$/)) {
          this.state.inputs.set(addr, false);
        } else if (addr.match(/^%Q\d+\.\d+$/)) {
          this.state.outputs.set(addr, false);
        } else if (addr.match(/^%M\d+$/)) {
          this.state.memoryBits.set(addr, false);
        } else if (addr.match(/^%MW\d+$/)) {
          this.state.memoryWords.set(addr, 0);
        } else if (addr.match(/^%MF\d+$/)) {
          this.state.memoryFloats.set(addr, 0.0);
        } else if (addr.match(/^%IW\d+\.\d+$/)) {
          this.state.analogInputs.set(addr, 0);
        } else if (addr.match(/^%S\d+$/)) {
          // %S0 = cold start, %S1 = warm start - initially false
          this.state.systemBits.set(addr, false);
        }
      }
    }

    // Initialize system time base bits to TRUE for simulation purposes
    // These bits pulse at their respective intervals in a real PLC
    // For simulation, we set them true so time-gated rungs can execute
    this.state.systemBits.set('%S4', true);   // 10ms time base
    this.state.systemBits.set('%S5', true);   // 100ms time base
    this.state.systemBits.set('%S6', true);   // 1s time base
    this.state.systemBits.set('%S7', true);   // 1min time base (if used)
  }

  // ==========================================================================
  // STATE MANIPULATION METHODS
  // ==========================================================================

  /**
   * Force an input or memory value for testing
   */
  forceInput(address: string, value: boolean | number): void {
    if (address.match(/^%I\d+\.\d+$/)) {
      this.state.inputs.set(address, value as boolean);
    } else if (address.match(/^%Q\d+\.\d+$/)) {
      this.state.outputs.set(address, value as boolean);
    } else if (address.match(/^%M\d+$/)) {
      this.state.memoryBits.set(address, value as boolean);
    } else if (address.match(/^%MW\d+$/)) {
      this.state.memoryWords.set(address, value as number);
    } else if (address.match(/^%MF\d+$/)) {
      this.state.memoryFloats.set(address, value as number);
    } else if (address.match(/^%IW\d+\.\d+$/)) {
      this.state.analogInputs.set(address, value as number);
    } else if (address.match(/^%S\d+$/)) {
      this.state.systemBits.set(address, value as boolean);
    }
  }

  /**
   * Get current value of any address
   */
  getValue(address: string): boolean | number | undefined {
    if (address.match(/^%I\d+\.\d+$/)) {
      return this.state.inputs.get(address);
    } else if (address.match(/^%Q\d+\.\d+$/)) {
      return this.state.outputs.get(address);
    } else if (address.match(/^%M\d+$/)) {
      return this.state.memoryBits.get(address);
    } else if (address.match(/^%MW\d+$/)) {
      return this.state.memoryWords.get(address);
    } else if (address.match(/^%MF\d+$/)) {
      return this.state.memoryFloats.get(address);
    } else if (address.match(/^%IW\d+\.\d+$/)) {
      return this.state.analogInputs.get(address);
    } else if (address.match(/^%S\d+$/)) {
      return this.state.systemBits.get(address);
    } else if (address.match(/^%TM\d+$/)) {
      const timer = this.state.timers.get(address);
      return timer?.done || false;
    }
    return undefined;
  }

  /**
   * Get timer done bit (Q output)
   */
  getTimerDone(address: string): boolean {
    const timer = this.state.timers.get(address);
    return timer?.done || false;
  }

  /**
   * Advance simulated time (for timer testing)
   */
  advanceTime(milliseconds: number): void {
    Array.from(this.state.timers.values()).forEach(timer => {
      if (timer.enabled) {
        timer.elapsed += milliseconds;
        if (timer.elapsed >= timer.preset) {
          timer.done = true;
        }
      }
    });
  }

  /**
   * Reset all state to initial values
   */
  reset(): void {
    // Reset all I/O and memory
    Array.from(this.state.inputs.keys()).forEach(key => {
      this.state.inputs.set(key, false);
    });
    Array.from(this.state.outputs.keys()).forEach(key => {
      this.state.outputs.set(key, false);
    });
    Array.from(this.state.memoryBits.keys()).forEach(key => {
      this.state.memoryBits.set(key, false);
    });
    Array.from(this.state.memoryWords.keys()).forEach(key => {
      this.state.memoryWords.set(key, 0);
    });
    Array.from(this.state.memoryFloats.keys()).forEach(key => {
      this.state.memoryFloats.set(key, 0.0);
    });
    Array.from(this.state.analogInputs.keys()).forEach(key => {
      this.state.analogInputs.set(key, 0);
    });
    Array.from(this.state.systemBits.keys()).forEach(key => {
      this.state.systemBits.set(key, false);
    });

    // Reset timers
    Array.from(this.state.timers.values()).forEach(timer => {
      timer.enabled = false;
      timer.elapsed = 0;
      timer.done = false;
    });
  }

  // ==========================================================================
  // EXECUTION METHODS
  // ==========================================================================

  /**
   * Execute one complete scan cycle (all rungs)
   */
  executeScan(): SimulationResult {
    const startTime = performance.now();
    const outputsChanged: string[] = [];
    const memoryChanged: string[] = [];
    const timersActive: string[] = [];

    // Store previous output states for change detection
    const prevOutputs = new Map(this.state.outputs);
    const prevMemory = new Map(this.state.memoryBits);

    // Execute each rung in order
    for (const rung of this.rungs) {
      this.executeRung(rung);
    }

    // Detect changes
    Array.from(this.state.outputs.entries()).forEach(([addr, value]) => {
      if (prevOutputs.get(addr) !== value) {
        outputsChanged.push(addr);
      }
    });
    Array.from(this.state.memoryBits.entries()).forEach(([addr, value]) => {
      if (prevMemory.get(addr) !== value) {
        memoryChanged.push(addr);
      }
    });
    Array.from(this.state.timers.entries()).forEach(([addr, timer]) => {
      if (timer.enabled) {
        timersActive.push(addr);
      }
    });

    return {
      scanTime: performance.now() - startTime,
      rungsExecuted: this.rungs.length,
      outputsChanged,
      memoryChanged,
      timersActive
    };
  }

  /**
   * Execute a single rung
   */
  private executeRung(rung: ParsedRung): void {
    // Build power flow grid
    const powerGrid: boolean[][] = [];
    for (let r = 0; r <= rung.maxRow; r++) {
      powerGrid[r] = [];
      for (let c = 0; c <= rung.maxColumn + 1; c++) {
        powerGrid[r][c] = false;
      }
    }

    // Power rail is always energized at column 0
    for (let r = 0; r <= rung.maxRow; r++) {
      powerGrid[r][0] = true;
    }

    // Group elements by column for left-to-right evaluation
    const elementsByColumn: Map<number, LadderElement[]> = new Map();
    for (const elem of rung.elements) {
      if (!elementsByColumn.has(elem.column)) {
        elementsByColumn.set(elem.column, []);
      }
      elementsByColumn.get(elem.column)!.push(elem);
    }

    // Evaluate column by column
    const sortedColumns = Array.from(elementsByColumn.keys()).sort((a, b) => a - b);

    for (const col of sortedColumns) {
      const elements = elementsByColumn.get(col)!;

      // First pass: evaluate elements and propagate power
      for (const elem of elements) {
        const powerIn = this.getPowerIn(powerGrid, elem, rung.maxRow);
        const result = this.evaluateElement(elem, powerIn);

        // Set power output for this element
        // Timer and Comparison elements span 2 columns, so output goes to col+2
        if (elem.connection.includes('Right')) {
          const outputCol = (elem.type === 'Timer' || elem.type === 'Comparison' || elem.type === 'CompareBlock')
            ? col + 2
            : col + 1;
          powerGrid[elem.row][outputCol] = result.powerOut;
        }
      }

      // Second pass: handle vertical connections (OR branches)
      for (const elem of elements) {
        // Handle Down connections (start of OR branch)
        if (elem.connection.includes('Down') && elem.row < rung.maxRow) {
          // Check if this row has power, propagate down
          const currentPower = powerGrid[elem.row][col + 1] || powerGrid[elem.row][col];
          if (currentPower) {
            powerGrid[elem.row + 1][col] = true;
          }
        }

        // Handle Up connections (end of OR branch)
        if (elem.connection.includes('Up') && elem.row > 0) {
          // Merge power from lower row to upper row
          const lowerPower = powerGrid[elem.row][col + 1];
          if (lowerPower) {
            powerGrid[elem.row - 1][col + 1] = true;
          }
        }
      }
    }
  }

  /**
   * Get power input for an element considering its connections
   */
  private getPowerIn(powerGrid: boolean[][], elem: LadderElement, maxRow: number): boolean {
    // Power comes from the left
    if (elem.connection.includes('Left')) {
      return powerGrid[elem.row][elem.column] || false;
    }
    return false;
  }

  /**
   * Evaluate a single ladder element
   */
  private evaluateElement(elem: LadderElement, powerIn: boolean): { powerOut: boolean } {
    switch (elem.type) {
      case 'NormalContact': {
        // NO contact - passes power if address is TRUE
        const value = this.getBooleanValue(elem.address);
        return { powerOut: powerIn && value };
      }

      case 'NegatedContact': {
        // NC contact - passes power if address is FALSE
        const value = this.getBooleanValue(elem.address);
        return { powerOut: powerIn && !value };
      }

      case 'Coil': {
        // Standard coil - sets address to power state
        this.setBooleanValue(elem.address, powerIn);
        return { powerOut: powerIn };
      }

      case 'SetCoil': {
        // Set (latch) coil - sets address TRUE if powered
        if (powerIn) {
          this.setBooleanValue(elem.address, true);
        }
        return { powerOut: powerIn };
      }

      case 'ResetCoil': {
        // Reset (unlatch) coil - sets address FALSE if powered
        if (powerIn) {
          this.setBooleanValue(elem.address, false);
        }
        return { powerOut: powerIn };
      }

      case 'Timer': {
        // Timer block - handles TON (on-delay) timer
        const timer = this.state.timers.get(elem.address);
        if (timer) {
          if (powerIn && !timer.enabled) {
            // Rising edge - start timer
            timer.enabled = true;
            timer.elapsed = 0;
            timer.done = false;
          } else if (!powerIn && timer.enabled) {
            // Falling edge - reset timer
            timer.enabled = false;
            timer.elapsed = 0;
            timer.done = false;
          }
          // Output is timer done bit
          return { powerOut: timer.done };
        }
        return { powerOut: false };
      }

      case 'CompareBlock':
      case 'Comparison': {
        // Comparison element - evaluates expression and passes/blocks power
        if (!elem.expression) return { powerOut: false };
        const result = this.evaluateComparison(elem.expression);
        return { powerOut: powerIn && result };
      }

      case 'Operation': {
        // Operation block - executes assignment when powered
        if (powerIn && elem.expression) {
          this.executeOperation(elem.expression);
        }
        return { powerOut: powerIn };
      }

      case 'Line': {
        // Horizontal line - just passes power through
        return { powerOut: powerIn };
      }

      case 'VerticalLine': {
        // Vertical line - handled in OR branch logic
        return { powerOut: powerIn };
      }

      case 'None': {
        // Empty cell
        return { powerOut: false };
      }

      default:
        return { powerOut: powerIn };
    }
  }

  /**
   * Get boolean value for an address (handles timers, contacts, etc.)
   */
  private getBooleanValue(address: string): boolean {
    if (!address) return false;

    // Timer done bit
    if (address.match(/^%TM\d+$/)) {
      const timer = this.state.timers.get(address);
      return timer?.done || false;
    }

    // Input
    if (address.match(/^%I\d+\.\d+$/)) {
      return this.state.inputs.get(address) || false;
    }

    // Output
    if (address.match(/^%Q\d+\.\d+$/)) {
      return this.state.outputs.get(address) || false;
    }

    // Memory bit
    if (address.match(/^%M\d+$/)) {
      return this.state.memoryBits.get(address) || false;
    }

    // System bit
    if (address.match(/^%S\d+$/)) {
      return this.state.systemBits.get(address) || false;
    }

    return false;
  }

  /**
   * Set boolean value for an address
   */
  private setBooleanValue(address: string, value: boolean): void {
    if (!address) return;

    // Output
    if (address.match(/^%Q\d+\.\d+$/)) {
      this.state.outputs.set(address, value);
    }

    // Memory bit
    if (address.match(/^%M\d+$/)) {
      this.state.memoryBits.set(address, value);
    }
  }

  /**
   * Evaluate a comparison expression (e.g., "%MF104 > 400.0")
   */
  private evaluateComparison(expression: string): boolean {
    // Parse expression: %MF104 > 400.0
    const match = expression.match(/(%\w+\d+\.?\d*)\s*([<>=!]+)\s*(-?\d+\.?\d*)/);
    if (!match) return false;

    const [, address, operator, valueStr] = match;
    const compareValue = parseFloat(valueStr);

    // Get current value of address
    let currentValue = 0;
    if (address.match(/^%MF\d+$/)) {
      currentValue = this.state.memoryFloats.get(address) || 0;
    } else if (address.match(/^%MW\d+$/)) {
      currentValue = this.state.memoryWords.get(address) || 0;
    } else if (address.match(/^%IW\d+\.\d+$/)) {
      currentValue = this.state.analogInputs.get(address) || 0;
    }

    // Evaluate comparison
    switch (operator) {
      case '>': return currentValue > compareValue;
      case '<': return currentValue < compareValue;
      case '>=': return currentValue >= compareValue;
      case '<=': return currentValue <= compareValue;
      case '=':
      case '==': return Math.abs(currentValue - compareValue) < 0.001;
      case '<>':
      case '!=': return Math.abs(currentValue - compareValue) >= 0.001;
      default: return false;
    }
  }

  /**
   * Execute an operation expression (e.g., "%MW100 := %IW1.0")
   */
  private executeOperation(expression: string): void {
    // Parse assignment: %MW100 := %IW1.0
    const assignMatch = expression.match(/(%\w+\d+\.?\d*)\s*:=\s*(.+)/);
    if (!assignMatch) return;

    const [, destAddr, sourceExpr] = assignMatch;

    // Evaluate the source expression
    const value = this.evaluateExpression(sourceExpr.trim());

    // Store the result
    if (destAddr.match(/^%MW\d+$/)) {
      this.state.memoryWords.set(destAddr, Math.round(value));
    } else if (destAddr.match(/^%MF\d+$/)) {
      this.state.memoryFloats.set(destAddr, value);
    } else if (destAddr.match(/^%M\d+$/)) {
      this.state.memoryBits.set(destAddr, value !== 0);
    }
  }

  /**
   * Evaluate a mathematical expression
   */
  private evaluateExpression(expr: string): number {
    // Handle INT_TO_REAL function
    let processedExpr = expr.replace(/INT_TO_REAL\(([^)]+)\)/g, (_, inner) => {
      const innerValue = this.evaluateExpression(inner);
      return innerValue.toString();
    });

    // Replace addresses with their values
    processedExpr = processedExpr.replace(/%MF\d+/g, (addr) => {
      const value = this.state.memoryFloats.get(addr) || 0;
      return value.toString();
    });
    processedExpr = processedExpr.replace(/%MW\d+/g, (addr) => {
      const value = this.state.memoryWords.get(addr) || 0;
      return value.toString();
    });
    processedExpr = processedExpr.replace(/%IW\d+\.\d+/g, (addr) => {
      const value = this.state.analogInputs.get(addr) || 0;
      return value.toString();
    });

    // Simple expression evaluator (handles +, -, *, /, parentheses)
    try {
      // Safely evaluate mathematical expression
      return this.safeEval(processedExpr);
    } catch {
      return 0;
    }
  }

  /**
   * Safely evaluate a mathematical expression
   */
  private safeEval(expr: string): number {
    // Remove whitespace
    expr = expr.trim();

    // Handle parentheses recursively
    while (expr.includes('(')) {
      expr = expr.replace(/\(([^()]+)\)/g, (_, inner) => {
        return this.safeEval(inner).toString();
      });
    }

    // Handle addition/subtraction (lowest precedence)
    const addSubMatch = expr.match(/^(.+?)([+-])([^+-]+)$/);
    if (addSubMatch) {
      const [, left, op, right] = addSubMatch;
      const leftVal = this.safeEval(left);
      const rightVal = this.safeEval(right);
      return op === '+' ? leftVal + rightVal : leftVal - rightVal;
    }

    // Handle multiplication/division (higher precedence)
    const mulDivMatch = expr.match(/^(.+?)([*/])([^*/]+)$/);
    if (mulDivMatch) {
      const [, left, op, right] = mulDivMatch;
      const leftVal = this.safeEval(left);
      const rightVal = this.safeEval(right);
      if (op === '*') return leftVal * rightVal;
      if (op === '/' && rightVal !== 0) return leftVal / rightVal;
      return 0;
    }

    // Parse as number
    return parseFloat(expr) || 0;
  }

  // ==========================================================================
  // DEBUG / INSPECTION METHODS
  // ==========================================================================

  /**
   * Get all current state as a snapshot
   */
  getStateSnapshot(): Record<string, any> {
    return {
      inputs: Object.fromEntries(this.state.inputs),
      outputs: Object.fromEntries(this.state.outputs),
      memoryBits: Object.fromEntries(this.state.memoryBits),
      memoryWords: Object.fromEntries(this.state.memoryWords),
      memoryFloats: Object.fromEntries(this.state.memoryFloats),
      analogInputs: Object.fromEntries(this.state.analogInputs),
      systemBits: Object.fromEntries(this.state.systemBits),
      timers: Object.fromEntries(
        Array.from(this.state.timers.entries()).map(([k, v]) => [k, {
          enabled: v.enabled,
          elapsed: v.elapsed,
          preset: v.preset,
          done: v.done
        }])
      )
    };
  }

  /**
   * Get list of all rungs with their names
   */
  getRungList(): Array<{ name: string; index: number; elementCount: number }> {
    return this.rungs.map(r => ({
      name: r.name,
      index: r.index,
      elementCount: r.elements.length
    }));
  }
}
