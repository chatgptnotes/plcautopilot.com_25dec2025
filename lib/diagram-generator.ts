/**
 * Electrical Connection Diagram Generator
 * Generates professional electrical schematics with IEEE/ANSI standard symbols
 * Includes smart component detection and automatic switchgear assignment
 *
 * Standards: IEEE 315, ANSI Y32.2, IEC 60617, NFPA 79
 */

import jsPDF from 'jspdf';
import {
  drawCircuitBreaker,
  drawFuse,
  drawContactorCoil,
  drawOverloadRelay,
  drawMotor,
  drawTransformer,
  drawEmergencyStop,
  drawPushButtonNO,
  drawPushButtonNC,
  drawIndicatorLight,
  drawGround,
  drawTerminalBlock,
  drawDisconnectSwitch,
  drawSolenoidValve,
  drawWire,
  drawJunction,
  drawPLCBlock,
  drawLegend,
  drawTitleBlock,
  drawNOContact,
  drawNCContact,
  COLORS,
} from './electrical-symbols';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface IOEntry {
  address: string;
  symbol: string;
  comment?: string;
  used?: boolean;
  range?: string;
}

interface AIDocumentation {
  projectInfo: {
    projectName: string;
    plcModel: string;
    description?: string;
    author?: string;
    createdDate: string;
  };
  digitalInputs: IOEntry[];
  digitalOutputs: IOEntry[];
  analogInputs: IOEntry[];
  analogOutputs?: IOEntry[];
  memoryBits: IOEntry[];
  memoryWords: IOEntry[];
  memoryFloats?: IOEntry[];
  timers: unknown[];
  counters?: unknown[];
  rungs: unknown[];
  safetyFeatures?: string[];
  operationalNotes?: string[];
}

// Component types detected from I/O symbols
interface DetectedComponent {
  type: 'motor' | 'pump' | 'valve' | 'heater' | 'light' | 'fan' | 'generic';
  label: string;
  address: string;
  symbol: string;
  power?: string;
  contactorLabel?: string;
  overloadLabel?: string;
}

interface DetectedInput {
  type: 'estop' | 'start' | 'stop' | 'selector' | 'limit' | 'sensor' | 'generic';
  label: string;
  address: string;
  symbol: string;
  isNC: boolean;
}

// ============================================================================
// LAYOUT CONSTANTS (A4 Landscape - 297mm x 210mm)
// ============================================================================

const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const CONTENT_HEIGHT = PAGE_HEIGHT - 2 * MARGIN;

// Section positions
const POWER_SECTION_Y = MARGIN + 15;
const CONTROL_SECTION_Y = MARGIN + 50;
const PLC_SECTION_X = MARGIN + 80;
const PLC_SECTION_Y = MARGIN + 55;
const OUTPUT_SECTION_X = MARGIN + 180;
const OUTPUT_SECTION_Y = MARGIN + 50;

// Wire numbering
let wireCounter = 1;

// ============================================================================
// SMART COMPONENT DETECTION
// ============================================================================

/**
 * Detect component type from I/O symbol name
 */
function detectOutputComponent(io: IOEntry): DetectedComponent {
  const symbol = (io.symbol || '').toUpperCase();
  const comment = (io.comment || '').toUpperCase();
  const combined = symbol + ' ' + comment;

  // Motor detection
  if (combined.includes('MOTOR') || combined.includes('MTR') || combined.includes('DRIVE') || combined.includes('M1') || combined.includes('M2')) {
    return {
      type: 'motor',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
      contactorLabel: `KM${io.address.replace(/[^0-9]/g, '')}`,
      overloadLabel: `FR${io.address.replace(/[^0-9]/g, '')}`,
    };
  }

  // Pump detection
  if (combined.includes('PUMP') || combined.includes('PMP') || combined.includes('P1') || combined.includes('P2')) {
    return {
      type: 'pump',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
      contactorLabel: `KM${io.address.replace(/[^0-9]/g, '')}`,
      overloadLabel: `FR${io.address.replace(/[^0-9]/g, '')}`,
    };
  }

  // Valve detection
  if (combined.includes('VALVE') || combined.includes('VLV') || combined.includes('SOL') || combined.includes('SV')) {
    return {
      type: 'valve',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
    };
  }

  // Heater detection
  if (combined.includes('HEATER') || combined.includes('HTR') || combined.includes('HEAT')) {
    return {
      type: 'heater',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
      contactorLabel: `KM${io.address.replace(/[^0-9]/g, '')}`,
    };
  }

  // Light/Indicator detection
  if (combined.includes('LIGHT') || combined.includes('LAMP') || combined.includes('LED') ||
      combined.includes('INDICATOR') || combined.includes('PILOT') || combined.includes('_H') ||
      combined.includes('RUN') || combined.includes('FAULT') || combined.includes('ALARM')) {
    return {
      type: 'light',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
    };
  }

  // Fan detection
  if (combined.includes('FAN') || combined.includes('BLOWER') || combined.includes('VENT')) {
    return {
      type: 'fan',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
      contactorLabel: `KM${io.address.replace(/[^0-9]/g, '')}`,
      overloadLabel: `FR${io.address.replace(/[^0-9]/g, '')}`,
    };
  }

  // Generic output
  return {
    type: 'generic',
    label: io.symbol || io.address,
    address: io.address,
    symbol: io.symbol,
  };
}

/**
 * Detect input type from I/O symbol name
 */
function detectInputComponent(io: IOEntry): DetectedInput {
  const symbol = (io.symbol || '').toUpperCase();
  const comment = (io.comment || '').toUpperCase();
  const combined = symbol + ' ' + comment;

  // Emergency Stop detection (typically NC)
  if (combined.includes('ESTOP') || combined.includes('E-STOP') || combined.includes('EMERGENCY') || combined.includes('EMG')) {
    return {
      type: 'estop',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
      isNC: true,
    };
  }

  // Start button detection (typically NO)
  if (combined.includes('START') || combined.includes('ON') || combined.includes('RUN') || combined.includes('_S1')) {
    return {
      type: 'start',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
      isNC: false,
    };
  }

  // Stop button detection (typically NC)
  if (combined.includes('STOP') || combined.includes('OFF') || combined.includes('_S2')) {
    return {
      type: 'stop',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
      isNC: true,
    };
  }

  // Selector switch detection
  if (combined.includes('SELECT') || combined.includes('MODE') || combined.includes('AUTO') || combined.includes('MANUAL')) {
    return {
      type: 'selector',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
      isNC: false,
    };
  }

  // Limit switch detection
  if (combined.includes('LIMIT') || combined.includes('LS') || combined.includes('PROX') || combined.includes('SENSOR')) {
    return {
      type: 'limit',
      label: io.symbol || io.address,
      address: io.address,
      symbol: io.symbol,
      isNC: false,
    };
  }

  // Generic input
  return {
    type: 'generic',
    label: io.symbol || io.address,
    address: io.address,
    symbol: io.symbol,
    isNC: false,
  };
}

/**
 * Get wire number and increment counter
 */
function getWireNumber(): string {
  return String(wireCounter++);
}

// ============================================================================
// MAIN DIAGRAM GENERATOR
// ============================================================================

/**
 * Generate a professional electrical connection diagram
 * Returns a new page to be added to the PDF
 */
export function generateElectricalConnectionDiagram(
  pdf: jsPDF,
  documentation: AIDocumentation
): void {
  // Reset wire counter for each diagram
  wireCounter = 1;

  // Add new page in landscape orientation
  pdf.addPage([297, 210], 'landscape');

  const { projectInfo, digitalInputs, digitalOutputs, analogInputs, analogOutputs } = documentation;

  // Detect components from I/O
  const detectedOutputs = digitalOutputs.map(detectOutputComponent);
  const detectedInputs = digitalInputs.map(detectInputComponent);

  // Count component types for sizing
  const motorCount = detectedOutputs.filter(c => ['motor', 'pump', 'fan'].includes(c.type)).length;
  const valveCount = detectedOutputs.filter(c => c.type === 'valve').length;
  const lightCount = detectedOutputs.filter(c => c.type === 'light').length;
  const hasEStop = detectedInputs.some(i => i.type === 'estop');
  const hasAnalog = (analogInputs?.length || 0) > 0 || (analogOutputs?.length || 0) > 0;

  // Draw border
  drawBorder(pdf);

  // Draw title block
  drawTitleBlock(pdf, PAGE_WIDTH - MARGIN - 100, PAGE_HEIGHT - MARGIN - 30, {
    title: 'ELECTRICAL CONNECTION DIAGRAM',
    projectName: projectInfo.projectName || 'PLC Project',
    drawingNumber: `ECD-${projectInfo.plcModel?.replace(/[^A-Z0-9]/gi, '') || '001'}`,
    revision: 'A',
    date: projectInfo.createdDate || new Date().toISOString().split('T')[0],
    drawnBy: 'PLCAutoPilot',
    sheet: '1 of 1',
  });

  // Draw sections
  drawPowerDistribution(pdf, MARGIN + 5, POWER_SECTION_Y, projectInfo.plcModel);
  drawControlCircuit(pdf, MARGIN + 5, CONTROL_SECTION_Y, detectedInputs, hasEStop);
  drawPLCSection(pdf, PLC_SECTION_X, PLC_SECTION_Y, projectInfo.plcModel, digitalInputs, digitalOutputs, analogInputs);
  drawMotorStarterSection(pdf, OUTPUT_SECTION_X, OUTPUT_SECTION_Y, detectedOutputs);

  // Draw interconnection wires
  drawInterconnections(pdf, detectedInputs, detectedOutputs);

  // Draw legend
  drawDiagramLegend(pdf, MARGIN + 5, PAGE_HEIGHT - MARGIN - 45, detectedOutputs);

  // Draw notes
  drawNotes(pdf, MARGIN + 90, PAGE_HEIGHT - MARGIN - 45, documentation.safetyFeatures || []);
}

// ============================================================================
// DRAWING SECTIONS
// ============================================================================

/**
 * Draw page border with grid
 */
function drawBorder(pdf: jsPDF): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(MARGIN, MARGIN, CONTENT_WIDTH, CONTENT_HEIGHT, 'S');

  // Inner border
  pdf.setLineWidth(0.2);
  pdf.rect(MARGIN + 2, MARGIN + 2, CONTENT_WIDTH - 4, CONTENT_HEIGHT - 4, 'S');
}

/**
 * Draw power distribution section
 */
function drawPowerDistribution(pdf: jsPDF, x: number, y: number, plcModel: string): void {
  // Section title
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('POWER DISTRIBUTION', x, y - 3);

  pdf.setLineWidth(0.3);
  pdf.setDrawColor(0, 0, 0);

  // 3-Phase power entry lines
  const lineSpacing = 8;
  const lineLength = 250;

  // L1, L2, L3, N, PE labels
  const phases = ['L1', 'L2', 'L3', 'N', 'PE'];
  phases.forEach((phase, index) => {
    const lineY = y + 5 + index * lineSpacing;

    // Phase label
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(phase, x, lineY + 1);

    // Main power line (partial, to disconnect switch)
    if (index < 3) {
      // L1, L2, L3 - go through disconnect and MCB
      pdf.line(x + 8, lineY, x + 15, lineY);
    } else if (index === 3) {
      // Neutral
      pdf.setDrawColor(0, 0, 200); // Blue for neutral
      pdf.line(x + 8, lineY, x + 60, lineY);
      pdf.setDrawColor(0, 0, 0);
    } else {
      // PE (ground)
      pdf.setDrawColor(0, 128, 0); // Green for PE
      pdf.line(x + 8, lineY, x + 60, lineY);
      // Draw ground symbol
      drawGround(pdf, x + 65, lineY - 4);
      pdf.setDrawColor(0, 0, 0);
    }
  });

  // Draw main disconnect switch (QS)
  drawDisconnectSwitch(pdf, x + 18, y + 2, 'QS');

  // Draw main circuit breaker (QF1)
  drawCircuitBreaker(pdf, x + 35, y, 'QF1', '32A');

  // Junction after MCB
  const junctionX = x + 50;
  drawJunction(pdf, junctionX, y + 5);
  drawJunction(pdf, junctionX, y + 13);
  drawJunction(pdf, junctionX, y + 21);

  // Vertical bus bars after MCB
  pdf.line(junctionX, y + 5, junctionX, y + 21);

  // Lines to transformer
  pdf.line(junctionX, y + 5, x + 55, y + 5);
  pdf.line(junctionX, y + 13, x + 55, y + 13);

  // Draw control transformer
  drawTransformer(pdf, x + 55, y + 2, 'T1', { primary: '400V', secondary: '24V' });

  // 24VDC output from transformer
  pdf.setFontSize(5);
  pdf.text('24VDC', x + 80, y + 8);

  // Draw control fuses
  drawFuse(pdf, x + 85, y + 2, 'F1', '2A');
  drawFuse(pdf, x + 98, y + 2, 'F2', '2A');

  // Wire labels
  pdf.setFontSize(4);
  pdf.text('+24V', x + 92, y + 25);
  pdf.text('0V', x + 105, y + 25);
}

/**
 * Draw control circuit section with push buttons and E-Stop
 */
function drawControlCircuit(
  pdf: jsPDF,
  x: number,
  y: number,
  inputs: DetectedInput[],
  hasEStop: boolean
): void {
  // Section title
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CONTROL CIRCUIT', x, y - 3);

  let currentX = x;
  let currentY = y + 5;

  // Always draw E-Stop first (if exists or add default)
  if (hasEStop) {
    const estopInput = inputs.find(i => i.type === 'estop');
    if (estopInput) {
      drawEmergencyStop(pdf, currentX, currentY, estopInput.label);
      // Wire number
      pdf.setFontSize(4);
      pdf.text(getWireNumber(), currentX + 8, currentY + 20);
      currentX += 25;
    }
  } else {
    // Add default E-Stop
    drawEmergencyStop(pdf, currentX, currentY, 'ESTOP');
    pdf.setFontSize(4);
    pdf.text(getWireNumber(), currentX + 8, currentY + 20);
    currentX += 25;
  }

  // Draw Stop button (NC)
  const stopInputs = inputs.filter(i => i.type === 'stop');
  if (stopInputs.length > 0) {
    stopInputs.forEach((input, idx) => {
      drawPushButtonNC(pdf, currentX, currentY, input.label || `S${idx + 1}`, 'red');
      pdf.setFontSize(4);
      pdf.text(getWireNumber(), currentX + 6, currentY + 20);
      currentX += 18;
    });
  } else {
    // Default stop button
    drawPushButtonNC(pdf, currentX, currentY, 'STOP', 'red');
    pdf.setFontSize(4);
    pdf.text(getWireNumber(), currentX + 6, currentY + 20);
    currentX += 18;
  }

  // Draw Start button (NO)
  const startInputs = inputs.filter(i => i.type === 'start');
  if (startInputs.length > 0) {
    startInputs.forEach((input, idx) => {
      drawPushButtonNO(pdf, currentX, currentY, input.label || `S${idx + 2}`, 'green');
      pdf.setFontSize(4);
      pdf.text(getWireNumber(), currentX + 6, currentY + 20);
      currentX += 18;
    });
  } else {
    // Default start button
    drawPushButtonNO(pdf, currentX, currentY, 'START', 'green');
    pdf.setFontSize(4);
    pdf.text(getWireNumber(), currentX + 6, currentY + 20);
    currentX += 18;
  }

  // Draw selector switches
  const selectorInputs = inputs.filter(i => i.type === 'selector');
  selectorInputs.forEach((input) => {
    drawPushButtonNO(pdf, currentX, currentY, input.label);
    pdf.setFontSize(4);
    pdf.text(getWireNumber(), currentX + 6, currentY + 20);
    currentX += 18;
  });

  // Draw remaining digital inputs as terminal block
  const otherInputs = inputs.filter(i => !['estop', 'start', 'stop', 'selector'].includes(i.type));
  if (otherInputs.length > 0) {
    currentX += 5;
    drawTerminalBlock(
      pdf,
      currentX,
      currentY,
      otherInputs.slice(0, 6).map((input, idx) => ({
        number: String(idx + 1),
        label: input.label,
      })),
      'INPUTS'
    );
  }
}

/**
 * Draw PLC section with terminals
 */
function drawPLCSection(
  pdf: jsPDF,
  x: number,
  y: number,
  plcModel: string,
  digitalInputs: IOEntry[],
  digitalOutputs: IOEntry[],
  analogInputs: IOEntry[]
): void {
  // Section title
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PLC CONTROLLER', x + 25, y - 3);

  // Prepare I/O lists for PLC block
  const inputs = digitalInputs.slice(0, 14).map(io => ({
    address: io.address,
    symbol: io.symbol,
  }));

  const outputs = digitalOutputs.slice(0, 10).map(io => ({
    address: io.address,
    symbol: io.symbol,
  }));

  // Draw PLC block
  drawPLCBlock(pdf, x, y, plcModel || 'TM221CE24T', inputs, outputs);

  // Draw analog I/O section if exists
  if (analogInputs && analogInputs.length > 0) {
    const analogY = y + 90;
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANALOG I/O', x + 25, analogY);

    drawTerminalBlock(
      pdf,
      x + 10,
      analogY + 5,
      analogInputs.slice(0, 4).map((io, idx) => ({
        number: io.address.replace('%IW', 'AI'),
        label: io.symbol || `4-20mA`,
      })),
      'ANALOG IN'
    );
  }

  // Power supply connections
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.text('+24VDC', x - 10, y + 5);
  pdf.text('0V', x - 10, y + 12);

  // Draw power connection points
  pdf.setDrawColor(0, 0, 0);
  pdf.circle(x - 2, y + 3, 1, 'F');
  pdf.circle(x - 2, y + 10, 1, 'F');
}

/**
 * Draw motor starter section with contactors and overloads
 */
function drawMotorStarterSection(
  pdf: jsPDF,
  x: number,
  y: number,
  outputs: DetectedComponent[]
): void {
  // Section title
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MOTOR STARTERS & OUTPUTS', x, y - 3);

  let currentY = y + 5;
  let motorIndex = 1;
  let lightIndex = 1;

  outputs.forEach((output) => {
    if (['motor', 'pump', 'fan'].includes(output.type)) {
      // Draw contactor
      const kmLabel = output.contactorLabel || `KM${motorIndex}`;
      drawContactorCoil(pdf, x, currentY, kmLabel);

      // Draw overload relay
      const frLabel = output.overloadLabel || `FR${motorIndex}`;
      drawOverloadRelay(pdf, x + 25, currentY - 4, frLabel, '2.5A');

      // Draw motor
      const motorLabel = output.label || `M${motorIndex}`;
      drawMotor(pdf, x + 50, currentY - 2, motorLabel, '0.75kW');

      // Wire connections
      drawWire(pdf, x + 15, currentY + 5, x + 25, currentY + 5);
      drawWire(pdf, x + 32, currentY + 14, x + 50, currentY + 5);

      // Wire numbers
      pdf.setFontSize(4);
      pdf.text(getWireNumber(), x + 20, currentY + 3);
      pdf.text(getWireNumber(), x + 42, currentY + 8);

      // Cross-reference to PLC output
      pdf.setFontSize(4);
      pdf.text(`(${output.address})`, x + 65, currentY + 16);

      currentY += 35;
      motorIndex++;
    } else if (output.type === 'valve') {
      // Draw solenoid valve
      drawSolenoidValve(pdf, x + 10, currentY, output.label);

      // Cross-reference
      pdf.setFontSize(4);
      pdf.text(`(${output.address})`, x + 30, currentY + 15);

      currentY += 25;
    } else if (output.type === 'light') {
      // Draw indicator light
      const color = output.symbol?.toUpperCase().includes('FAULT') || output.symbol?.toUpperCase().includes('ALARM')
        ? 'red'
        : output.symbol?.toUpperCase().includes('RUN')
          ? 'green'
          : 'yellow';

      drawIndicatorLight(pdf, x + 10, currentY, `H${lightIndex}`, color as 'red' | 'green' | 'yellow');

      // Cross-reference
      pdf.setFontSize(4);
      pdf.text(`(${output.address})`, x + 30, currentY + 8);
      pdf.text(output.label, x + 30, currentY + 12);

      currentY += 20;
      lightIndex++;
    } else {
      // Generic output - draw as terminal
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.3);
      pdf.rect(x + 5, currentY, 20, 10, 'S');
      pdf.setFontSize(5);
      pdf.text(output.label, x + 15, currentY + 6, { align: 'center' });
      pdf.setFontSize(4);
      pdf.text(`(${output.address})`, x + 30, currentY + 6);

      currentY += 15;
    }
  });
}

/**
 * Draw interconnection wires between sections
 */
function drawInterconnections(
  pdf: jsPDF,
  inputs: DetectedInput[],
  outputs: DetectedComponent[]
): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.2);

  // Draw main control bus (horizontal line from control to PLC)
  const busY = CONTROL_SECTION_Y + 35;
  pdf.line(MARGIN + 70, busY, PLC_SECTION_X - 5, busY);

  // Draw vertical drops to PLC inputs
  const plcInputStartY = PLC_SECTION_Y + 15;
  for (let i = 0; i < Math.min(inputs.length, 8); i++) {
    const dropX = MARGIN + 75 + i * 5;
    pdf.line(dropX, busY, dropX, busY + 5);
    drawJunction(pdf, dropX, busY);
  }

  // Draw output bus (horizontal line from PLC to outputs)
  const outputBusY = PLC_SECTION_Y + 40;
  pdf.line(PLC_SECTION_X + 52, outputBusY, OUTPUT_SECTION_X - 5, outputBusY);

  // Wire number labels on buses
  pdf.setFontSize(4);
  pdf.text('CTRL BUS', MARGIN + 72, busY - 2);
  pdf.text('OUT BUS', PLC_SECTION_X + 60, outputBusY - 2);
}

/**
 * Draw diagram legend
 */
function drawDiagramLegend(
  pdf: jsPDF,
  x: number,
  y: number,
  outputs: DetectedComponent[]
): void {
  // Determine which symbols to include based on detected components
  const symbols: Array<{ name: string; description: string; type: string }> = [
    { name: 'QS', description: 'Disconnect Switch', type: 'disconnect' },
    { name: 'QF', description: 'Circuit Breaker', type: 'circuit-breaker' },
    { name: 'F', description: 'Fuse', type: 'fuse' },
    { name: 'T', description: 'Transformer', type: 'transformer' },
  ];

  // Add motor-related symbols if motors detected
  if (outputs.some(o => ['motor', 'pump', 'fan'].includes(o.type))) {
    symbols.push(
      { name: 'KM', description: 'Contactor', type: 'contactor' },
      { name: 'FR', description: 'Overload Relay', type: 'overload' },
      { name: 'M', description: 'Motor', type: 'motor' }
    );
  }

  // Add valve symbol if valves detected
  if (outputs.some(o => o.type === 'valve')) {
    symbols.push({ name: 'SV', description: 'Solenoid Valve', type: 'valve' });
  }

  // Add light symbol if lights detected
  if (outputs.some(o => o.type === 'light')) {
    symbols.push({ name: 'H', description: 'Indicator Light', type: 'light' });
  }

  drawLegend(pdf, x, y, symbols);
}

/**
 * Draw notes section
 */
function drawNotes(
  pdf: jsPDF,
  x: number,
  y: number,
  safetyFeatures: string[]
): void {
  const width = 70;
  const height = 40;

  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, width, height, 'S');

  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text('NOTES:', x + 2, y + 5);

  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');

  const defaultNotes = [
    '1. All wiring per NEC/IEC standards',
    '2. E-STOP circuit is fail-safe (NC)',
    '3. Verify all connections before power-on',
    '4. Motor overloads set per nameplate FLA',
    '5. 24VDC control circuit protected by F1, F2',
  ];

  const notes = safetyFeatures.length > 0
    ? safetyFeatures.slice(0, 5).map((note, i) => `${i + 1}. ${note}`)
    : defaultNotes;

  notes.forEach((note, index) => {
    pdf.text(note, x + 2, y + 10 + index * 6);
  });
}

// ============================================================================
// LEGACY FUNCTION (for backward compatibility)
// ============================================================================

/**
 * Generate single line diagram (legacy - now calls electrical connection diagram)
 * Kept for backward compatibility with existing code
 */
export function generateSingleLineDiagram(
  pdf: jsPDF,
  documentation: AIDocumentation
): void {
  // Call the new electrical connection diagram
  generateElectricalConnectionDiagram(pdf, documentation);
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  generateElectricalConnectionDiagram,
  generateSingleLineDiagram,
};
