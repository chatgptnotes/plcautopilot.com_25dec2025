/**
 * Requirement Parser
 * Parses user's natural language logic requirements into structured data
 * Version: 1.0
 */

export interface ParsedRequirement {
  id: string;
  type: 'fill_control' | 'drain_control' | 'level_alarm' | 'timer' | 'interlock' | 'motor_control' | 'analog_scaling' | 'unknown';
  rawText: string;
  condition?: {
    variable: string;
    operator: '<' | '>' | '<=' | '>=' | '=' | '!=';
    threshold: number;
    unit: string;
  };
  action?: {
    type: 'open_valve' | 'close_valve' | 'start_motor' | 'stop_motor' | 'set_alarm' | 'reset_alarm';
    target: string;
  };
  timer?: {
    duration: number;
    unit: 'seconds' | 'minutes' | 'hours';
    purpose: string;
  };
  interlock?: {
    input: string;
    blocks: string[];
  };
}

export interface RequirementParserResult {
  requirements: ParsedRequirement[];
  thresholds: Array<{ variable: string; value: number; unit: string; context: string }>;
  timers: Array<{ duration: number; unit: string; purpose: string }>;
  interlocks: string[];
  valves: string[];
  motors: string[];
  sensors: string[];
}

/**
 * Parse threshold values from text
 * Matches patterns like: "400mm", "100 liters", "> 50", "< 1400.5"
 */
function extractThresholds(text: string): Array<{ value: number; unit: string; operator?: string; context: string }> {
  const thresholds: Array<{ value: number; unit: string; operator?: string; context: string }> = [];

  // Pattern: number with unit (e.g., "400mm", "100 liters", "25.5C")
  const numberUnitRegex = /(\d+\.?\d*)\s*(mm|cm|m|liters?|l|gallons?|gal|psi|bar|kpa|mpa|degrees?|c|f|%|percent)/gi;
  let match;
  while ((match = numberUnitRegex.exec(text)) !== null) {
    const value = parseFloat(match[1]);
    const unit = normalizeUnit(match[2]);
    // Get surrounding context (30 chars before and after)
    const start = Math.max(0, match.index - 30);
    const end = Math.min(text.length, match.index + match[0].length + 30);
    const context = text.substring(start, end);
    thresholds.push({ value, unit, context });
  }

  // Pattern: operator + number (e.g., "> 50", "< 100", "<= 400")
  const operatorNumberRegex = /([<>=!]+)\s*(\d+\.?\d*)/g;
  while ((match = operatorNumberRegex.exec(text)) !== null) {
    const operator = match[1];
    const value = parseFloat(match[2]);
    const start = Math.max(0, match.index - 30);
    const end = Math.min(text.length, match.index + match[0].length + 30);
    const context = text.substring(start, end);
    thresholds.push({ value, unit: '', operator, context });
  }

  return thresholds;
}

/**
 * Normalize unit strings
 */
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase();
  if (['mm', 'millimeter', 'millimeters'].includes(normalized)) return 'mm';
  if (['cm', 'centimeter', 'centimeters'].includes(normalized)) return 'cm';
  if (['m', 'meter', 'meters'].includes(normalized)) return 'm';
  if (['l', 'liter', 'liters'].includes(normalized)) return 'liters';
  if (['gal', 'gallon', 'gallons'].includes(normalized)) return 'gallons';
  if (['psi'].includes(normalized)) return 'psi';
  if (['bar'].includes(normalized)) return 'bar';
  if (['kpa'].includes(normalized)) return 'kPa';
  if (['mpa'].includes(normalized)) return 'MPa';
  if (['c', 'celsius', 'degree', 'degrees'].includes(normalized)) return 'C';
  if (['f', 'fahrenheit'].includes(normalized)) return 'F';
  if (['%', 'percent'].includes(normalized)) return '%';
  return normalized;
}

/**
 * Extract timer durations from text
 * Matches patterns like: "30 seconds", "5 minutes", "3s timeout"
 */
function extractTimers(text: string): Array<{ duration: number; unit: string; purpose: string }> {
  const timers: Array<{ duration: number; unit: string; purpose: string }> = [];

  // Pattern: number + time unit
  const timerRegex = /(\d+\.?\d*)\s*(seconds?|s|minutes?|min|m|hours?|hr|h)\s*(?:timeout|delay|wait|timer)?/gi;
  let match;
  while ((match = timerRegex.exec(text)) !== null) {
    const duration = parseFloat(match[1]);
    const rawUnit = match[2].toLowerCase();

    let unit: string;
    if (['s', 'second', 'seconds'].includes(rawUnit)) unit = 'seconds';
    else if (['m', 'min', 'minute', 'minutes'].includes(rawUnit)) unit = 'minutes';
    else if (['h', 'hr', 'hour', 'hours'].includes(rawUnit)) unit = 'hours';
    else unit = 'seconds';

    // Infer purpose from context
    const start = Math.max(0, match.index - 50);
    const end = Math.min(text.length, match.index + match[0].length + 20);
    const context = text.substring(start, end).toLowerCase();

    let purpose = 'general';
    if (context.includes('timeout')) purpose = 'timeout';
    else if (context.includes('startup') || context.includes('start')) purpose = 'startup';
    else if (context.includes('delay')) purpose = 'delay';
    else if (context.includes('wait')) purpose = 'wait';
    else if (context.includes('fill')) purpose = 'fill_timeout';
    else if (context.includes('drain')) purpose = 'drain_timeout';

    timers.push({ duration, unit, purpose });
  }

  return timers;
}

/**
 * Detect interlock requirements
 */
function extractInterlocks(text: string): string[] {
  const interlocks: string[] = [];
  const textLower = text.toLowerCase();

  if (textLower.includes('emergency stop') || textLower.includes('estop') || textLower.includes('e-stop')) {
    interlocks.push('emergency_stop');
  }
  if (textLower.includes('safety') && textLower.includes('interlock')) {
    interlocks.push('safety_interlock');
  }
  if (textLower.includes('overload')) {
    interlocks.push('overload_protection');
  }
  if (textLower.includes('limit switch')) {
    interlocks.push('limit_switch');
  }

  return interlocks;
}

/**
 * Extract valve references
 */
function extractValves(text: string): string[] {
  const valves: string[] = [];
  const textLower = text.toLowerCase();

  if (textLower.includes('inlet') || textLower.includes('fill valve')) {
    valves.push('inlet_valve');
  }
  if (textLower.includes('outlet') || textLower.includes('drain valve')) {
    valves.push('outlet_valve');
  }
  if (textLower.includes('valve') && !valves.length) {
    // Generic valve mention
    const valveMatch = textLower.match(/(\w+)\s+valve/g);
    if (valveMatch) {
      valveMatch.forEach(v => valves.push(v.replace(/\s+/g, '_')));
    }
  }

  return [...new Set(valves)];
}

/**
 * Extract motor references
 */
function extractMotors(text: string): string[] {
  const motors: string[] = [];
  const textLower = text.toLowerCase();

  if (textLower.includes('pump')) {
    motors.push('pump');
  }
  if (textLower.includes('motor')) {
    motors.push('motor');
  }
  if (textLower.includes('fan')) {
    motors.push('fan');
  }
  if (textLower.includes('compressor')) {
    motors.push('compressor');
  }

  return [...new Set(motors)];
}

/**
 * Extract sensor references
 */
function extractSensors(text: string): string[] {
  const sensors: string[] = [];
  const textLower = text.toLowerCase();

  if (textLower.includes('level sensor') || textLower.includes('level')) {
    sensors.push('level_sensor');
  }
  if (textLower.includes('temperature') || textLower.includes('temp sensor')) {
    sensors.push('temperature_sensor');
  }
  if (textLower.includes('pressure')) {
    sensors.push('pressure_sensor');
  }
  if (textLower.includes('flow')) {
    sensors.push('flow_sensor');
  }
  if (textLower.includes('4-20ma') || textLower.includes('analog')) {
    sensors.push('analog_input');
  }

  return [...new Set(sensors)];
}

/**
 * Parse individual requirements from bullet points or sentences
 */
function parseRequirementLine(line: string, index: number): ParsedRequirement | null {
  const lineLower = line.toLowerCase().trim();
  if (!lineLower || lineLower.length < 5) return null;

  const req: ParsedRequirement = {
    id: `REQ${index + 1}`,
    type: 'unknown',
    rawText: line.trim()
  };

  // Detect fill control
  if (lineLower.includes('fill') && (lineLower.includes('when') || lineLower.includes('if') || lineLower.includes('below'))) {
    req.type = 'fill_control';
    const thresholds = extractThresholds(line);
    if (thresholds.length > 0) {
      req.condition = {
        variable: 'level',
        operator: lineLower.includes('below') || lineLower.includes('drops') || lineLower.includes('<') ? '<' : '<=',
        threshold: thresholds[0].value,
        unit: thresholds[0].unit || 'mm'
      };
    }
    req.action = { type: 'open_valve', target: 'inlet' };
  }

  // Detect drain control
  else if (lineLower.includes('drain') && (lineLower.includes('when') || lineLower.includes('if') || lineLower.includes('above') || lineLower.includes('exceeds'))) {
    req.type = 'drain_control';
    const thresholds = extractThresholds(line);
    if (thresholds.length > 0) {
      req.condition = {
        variable: 'level',
        operator: lineLower.includes('above') || lineLower.includes('exceeds') || lineLower.includes('>') ? '>' : '>=',
        threshold: thresholds[0].value,
        unit: thresholds[0].unit || 'mm'
      };
    }
    req.action = { type: 'open_valve', target: 'outlet' };
  }

  // Detect stop filling/draining
  else if (lineLower.includes('stop') && (lineLower.includes('fill') || lineLower.includes('drain'))) {
    req.type = lineLower.includes('fill') ? 'fill_control' : 'drain_control';
    const thresholds = extractThresholds(line);
    if (thresholds.length > 0) {
      req.condition = {
        variable: 'level',
        operator: lineLower.includes('reaches') || lineLower.includes('at') ? '>=' : '>',
        threshold: thresholds[0].value,
        unit: thresholds[0].unit || 'mm'
      };
    }
    req.action = { type: 'close_valve', target: lineLower.includes('fill') ? 'inlet' : 'outlet' };
  }

  // Detect alarm/timeout
  else if (lineLower.includes('alarm') || lineLower.includes('timeout')) {
    req.type = 'timer';
    const timers = extractTimers(line);
    if (timers.length > 0) {
      req.timer = {
        duration: timers[0].duration,
        unit: timers[0].unit as 'seconds' | 'minutes' | 'hours',
        purpose: lineLower.includes('fill') ? 'fill_timeout' : lineLower.includes('drain') ? 'drain_timeout' : 'timeout'
      };
    }
    req.action = { type: 'set_alarm', target: 'timeout_alarm' };
  }

  // Detect interlock/emergency stop
  else if (lineLower.includes('emergency') || lineLower.includes('estop') || lineLower.includes('e-stop')) {
    req.type = 'interlock';
    req.interlock = {
      input: 'emergency_stop',
      blocks: ['all_outputs']
    };
    if (lineLower.includes('valve')) {
      req.interlock.blocks = ['inlet_valve', 'outlet_valve'];
    }
    if (lineLower.includes('motor') || lineLower.includes('pump')) {
      req.interlock.blocks.push('motor');
    }
  }

  // Detect motor control
  else if (lineLower.includes('motor') || lineLower.includes('pump')) {
    req.type = 'motor_control';
    if (lineLower.includes('start')) {
      req.action = { type: 'start_motor', target: lineLower.includes('pump') ? 'pump' : 'motor' };
    } else if (lineLower.includes('stop')) {
      req.action = { type: 'stop_motor', target: lineLower.includes('pump') ? 'pump' : 'motor' };
    }
  }

  // Detect analog scaling
  else if (lineLower.includes('scale') || lineLower.includes('4-20ma') || lineLower.includes('analog')) {
    req.type = 'analog_scaling';
    const thresholds = extractThresholds(line);
    // Extract range if mentioned
  }

  // Detect level alarm
  else if ((lineLower.includes('high') || lineLower.includes('low')) && lineLower.includes('level')) {
    req.type = 'level_alarm';
    const thresholds = extractThresholds(line);
    if (thresholds.length > 0) {
      req.condition = {
        variable: 'level',
        operator: lineLower.includes('high') ? '>' : '<',
        threshold: thresholds[0].value,
        unit: thresholds[0].unit || 'mm'
      };
    }
    req.action = { type: 'set_alarm', target: lineLower.includes('high') ? 'high_level_alarm' : 'low_level_alarm' };
  }

  return req.type !== 'unknown' || req.condition || req.action ? req : null;
}

/**
 * Main parsing function
 */
export function parseRequirements(userLogic: string): RequirementParserResult {
  // Split into lines/bullet points
  const lines = userLogic
    .split(/[\n\r]+|(?<=[.!?])\s+/)
    .map(line => line.replace(/^[-*\d.)\]]+\s*/, '').trim())
    .filter(line => line.length > 0);

  const requirements: ParsedRequirement[] = [];

  lines.forEach((line, index) => {
    const req = parseRequirementLine(line, index);
    if (req) {
      requirements.push(req);
    }
  });

  // Extract additional metadata
  const allThresholds = extractThresholds(userLogic);
  const allTimers = extractTimers(userLogic);
  const interlocks = extractInterlocks(userLogic);
  const valves = extractValves(userLogic);
  const motors = extractMotors(userLogic);
  const sensors = extractSensors(userLogic);

  return {
    requirements,
    thresholds: allThresholds.map(t => ({
      variable: inferVariable(t.context),
      value: t.value,
      unit: t.unit,
      context: t.context
    })),
    timers: allTimers,
    interlocks,
    valves,
    motors,
    sensors
  };
}

/**
 * Infer variable name from context
 */
function inferVariable(context: string): string {
  const contextLower = context.toLowerCase();
  if (contextLower.includes('level') || contextLower.includes('tank')) return 'level';
  if (contextLower.includes('temp')) return 'temperature';
  if (contextLower.includes('pressure')) return 'pressure';
  if (contextLower.includes('flow')) return 'flow';
  return 'value';
}

/**
 * Get summary of parsed requirements
 */
export function getRequirementsSummary(result: RequirementParserResult): string {
  const lines: string[] = [];
  lines.push(`Parsed ${result.requirements.length} requirements:`);

  result.requirements.forEach(req => {
    let desc = `- [${req.type}] `;
    if (req.condition) {
      desc += `${req.condition.variable} ${req.condition.operator} ${req.condition.threshold}${req.condition.unit}`;
    }
    if (req.action) {
      desc += ` -> ${req.action.type}(${req.action.target})`;
    }
    if (req.timer) {
      desc += `Timer: ${req.timer.duration} ${req.timer.unit} (${req.timer.purpose})`;
    }
    lines.push(desc);
  });

  if (result.thresholds.length > 0) {
    lines.push(`\nThresholds found: ${result.thresholds.map(t => `${t.value}${t.unit}`).join(', ')}`);
  }
  if (result.timers.length > 0) {
    lines.push(`Timers found: ${result.timers.map(t => `${t.duration}${t.unit}`).join(', ')}`);
  }
  if (result.interlocks.length > 0) {
    lines.push(`Interlocks: ${result.interlocks.join(', ')}`);
  }

  return lines.join('\n');
}
