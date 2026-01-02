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
 * Block diagram style with color-coded power lines
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

  // Detect components from I/O (with null safety)
  const detectedOutputs = (digitalOutputs || []).map(detectOutputComponent);
  const detectedInputs = (digitalInputs || []).map(detectInputComponent);
  const hasAnalog = (analogInputs?.length || 0) > 0 || (analogOutputs?.length || 0) > 0;

  // Draw clean white background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');

  // Draw title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('PLC WIRING DIAGRAM', PAGE_WIDTH / 2, 15, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${projectInfo.projectName || 'PLC Project'} - ${projectInfo.plcModel || 'M221'}`, PAGE_WIDTH / 2, 22, { align: 'center' });

  // Draw the clean block diagram style
  drawBlockDiagramStyle(pdf, projectInfo, digitalInputs || [], digitalOutputs || [], analogInputs || [], detectedOutputs, detectedInputs, hasAnalog);

  // Draw footer
  pdf.setFontSize(6);
  pdf.setTextColor(100, 100, 100);
  pdf.text(`Generated by PLCAutoPilot | ${projectInfo.createdDate || new Date().toISOString().split('T')[0]}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 5, { align: 'center' });
}

/**
 * Draw IEC 60617 compliant electrical schematic
 * Uses standard symbols for circuit breakers, contactors, motors, etc.
 */
function drawBlockDiagramStyle(
  pdf: jsPDF,
  projectInfo: AIDocumentation['projectInfo'],
  digitalInputs: IOEntry[],
  digitalOutputs: IOEntry[],
  analogInputs: IOEntry[],
  detectedOutputs: DetectedComponent[],
  detectedInputs: DetectedInput[],
  hasAnalog: boolean
): void {
  const startY = 30;

  // Get motor/pump outputs for power circuit
  const motorOutputs = detectedOutputs.filter(o => o.type === 'motor' || o.type === 'pump');
  const numMotors = Math.max(motorOutputs.length, 1);

  // ============================================================================
  // POWER CIRCUIT (Top Section) - IEC 60617 Style
  // ============================================================================

  // Power supply lines - horizontal at top
  const powerLineY = startY;
  const lineSpacing = 8;

  // L1, L2, L3, N, PE labels and lines
  const powerLabels = ['L1', 'L2', 'L3', 'N', 'PE'];
  const powerColors = [
    { r: 139, g: 69, b: 19 },   // L1 - Brown
    { r: 0, g: 0, b: 0 },       // L2 - Black
    { r: 128, g: 128, b: 128 }, // L3 - Gray
    { r: 0, g: 0, b: 200 },     // N - Blue
    { r: 0, g: 150, b: 0 }      // PE - Green/Yellow
  ];

  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');

  for (let i = 0; i < powerLabels.length; i++) {
    const y = powerLineY + i * lineSpacing;
    pdf.setTextColor(powerColors[i].r, powerColors[i].g, powerColors[i].b);
    pdf.text(powerLabels[i], MARGIN + 2, y + 2);

    pdf.setDrawColor(powerColors[i].r, powerColors[i].g, powerColors[i].b);
    pdf.setLineWidth(i === 4 ? 0.8 : 0.5); // PE line thicker
    pdf.line(MARGIN + 10, y, PAGE_WIDTH - MARGIN - 50, y);
  }

  // ============================================================================
  // MAIN DISCONNECT SWITCH (QS) - IEC Symbol
  // ============================================================================
  const qsX = MARGIN + 25;
  const qsY = powerLineY - 3;

  // Draw disconnect switch for each phase
  for (let i = 0; i < 3; i++) {
    const y = qsY + i * lineSpacing;
    drawIECDisconnectSwitch(pdf, qsX, y, i === 0 ? 'QS' : '');
  }

  // ============================================================================
  // MAIN CIRCUIT BREAKER (QF1) - IEC Symbol
  // ============================================================================
  const qfX = qsX + 25;
  const qfY = powerLineY - 3;

  for (let i = 0; i < 3; i++) {
    const y = qfY + i * lineSpacing;
    drawIECCircuitBreaker(pdf, qfX, y, i === 0 ? 'QF1' : '');
  }

  // ============================================================================
  // CONTROL TRANSFORMER - IEC Symbol
  // ============================================================================
  const txX = qfX + 30;
  const txY = powerLineY + lineSpacing; // Connect to L2/L3

  // Transformer symbol (two coils)
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.4);

  // Primary side connection from L2
  pdf.line(txX, powerLineY + lineSpacing, txX, powerLineY + lineSpacing + 5);

  // Primary coil (3 semicircles)
  for (let i = 0; i < 3; i++) {
    const cy = powerLineY + lineSpacing + 8 + i * 4;
    // Draw arc-like shape using lines
    pdf.line(txX - 3, cy, txX + 3, cy + 2);
    pdf.line(txX + 3, cy + 2, txX - 3, cy + 4);
  }

  // Secondary coil (3 semicircles) - offset right
  for (let i = 0; i < 3; i++) {
    const cy = powerLineY + lineSpacing + 8 + i * 4;
    pdf.line(txX + 7, cy, txX + 13, cy + 2);
    pdf.line(txX + 13, cy + 2, txX + 7, cy + 4);
  }

  // Core lines between coils
  pdf.setLineWidth(0.8);
  pdf.line(txX + 4, powerLineY + lineSpacing + 6, txX + 4, powerLineY + lineSpacing + 22);
  pdf.line(txX + 6, powerLineY + lineSpacing + 6, txX + 6, powerLineY + lineSpacing + 22);

  // Connection to N
  pdf.setLineWidth(0.4);
  pdf.line(txX, powerLineY + lineSpacing + 20, txX, powerLineY + 3 * lineSpacing);

  // Secondary outputs (24V DC)
  pdf.line(txX + 10, powerLineY + lineSpacing + 8, txX + 10, powerLineY + lineSpacing + 3);
  pdf.line(txX + 10, powerLineY + lineSpacing + 3, txX + 25, powerLineY + lineSpacing + 3);

  // Labels
  pdf.setFontSize(5);
  pdf.setTextColor(0, 0, 0);
  pdf.text('T1', txX + 5, powerLineY + lineSpacing + 28, { align: 'center' });
  pdf.text('24V', txX + 20, powerLineY + lineSpacing, { align: 'center' });

  // ============================================================================
  // CONTROL FUSES (F1, F2) - IEC Symbol
  // ============================================================================
  const fuseX = txX + 30;
  const fuseY = powerLineY + lineSpacing;

  // Fuse F1 (24V+)
  drawIECFuse(pdf, fuseX, fuseY, 'F1');

  // ============================================================================
  // MOTOR STARTER CIRCUITS - IEC Symbols
  // ============================================================================
  const motorStartX = qfX + 50;
  const motorSpacing = 40;

  for (let m = 0; m < numMotors && m < 3; m++) {
    const mx = motorStartX + m * motorSpacing;
    const motor = motorOutputs[m];
    const motorLabel = motor?.symbol || `M${m + 1}`;
    const kmLabel = `KM${m + 1}`;
    const frLabel = `FR${m + 1}`;

    // Vertical drop from L1 for this motor
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.4);
    pdf.line(mx, powerLineY, mx, powerLineY + 5);

    // Motor circuit breaker (QF)
    drawIECCircuitBreaker(pdf, mx - 3, powerLineY + 5, `QF${m + 2}`);

    // Contactor main contacts (3-pole) - KM
    const kmY = powerLineY + 25;
    for (let p = 0; p < 3; p++) {
      const px = mx - 5 + p * 5;
      drawIECNOContact(pdf, px, kmY, p === 1 ? kmLabel : '');
    }

    // Overload relay (FR)
    const frY = kmY + 18;
    drawIECOverloadRelay(pdf, mx - 3, frY, frLabel);

    // Motor symbol (circle with M)
    const motorY = frY + 25;
    drawIECMotor(pdf, mx, motorY, motorLabel);

    // Connection lines
    pdf.setLineWidth(0.3);
    // From breaker to contactor
    pdf.line(mx, powerLineY + 15, mx, kmY);
    // From contactor to overload
    pdf.line(mx, kmY + 10, mx, frY);
    // From overload to motor
    pdf.line(mx, frY + 15, mx, motorY - 8);

    // Wire numbers
    pdf.setFontSize(4);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${m * 3 + 1}`, mx + 2, powerLineY + 10);
    pdf.text(`${m * 3 + 2}`, mx + 2, kmY + 5);
    pdf.text(`${m * 3 + 3}`, mx + 2, frY + 10);
  }

  // ============================================================================
  // CONTROL CIRCUIT (Middle Section) - IEC 60617
  // ============================================================================
  const controlY = powerLineY + 90;

  // Control circuit power rails
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // +24V rail
  pdf.line(MARGIN + 15, controlY, PAGE_WIDTH - MARGIN - 60, controlY);
  pdf.setFontSize(5);
  pdf.setTextColor(0, 0, 0);
  pdf.text('+24V', MARGIN + 8, controlY + 1);

  // 0V rail
  const rail0V = controlY + 50;
  pdf.line(MARGIN + 15, rail0V, PAGE_WIDTH - MARGIN - 60, rail0V);
  pdf.text('0V', MARGIN + 8, rail0V + 1);

  // ============================================================================
  // EMERGENCY STOP CIRCUIT - IEC Symbol
  // ============================================================================
  const estopX = MARGIN + 30;

  // E-Stop (NC contact with mushroom head symbol)
  pdf.line(estopX, controlY, estopX, controlY + 5);
  drawIECEmergencyStop(pdf, estopX - 4, controlY + 5, 'S0');
  pdf.line(estopX, controlY + 18, estopX, rail0V);

  // ============================================================================
  // START/STOP BUTTONS - IEC Symbols
  // ============================================================================
  const buttonX = estopX + 25;

  // Stop button (NC)
  pdf.line(buttonX, controlY, buttonX, controlY + 8);
  drawIECPushbuttonNC(pdf, buttonX - 4, controlY + 8, 'S1');
  pdf.line(buttonX, controlY + 20, buttonX, controlY + 25);

  // Start button (NO) with seal-in contact
  pdf.line(buttonX, controlY + 25, buttonX, controlY + 28);
  drawIECPushbuttonNO(pdf, buttonX - 4, controlY + 28, 'S2');
  pdf.line(buttonX, controlY + 40, buttonX, rail0V);

  // Seal-in contact (KM1 aux) - parallel to start button
  const sealX = buttonX + 12;
  pdf.line(buttonX, controlY + 25, sealX, controlY + 25);
  pdf.line(sealX, controlY + 25, sealX, controlY + 28);
  drawIECNOContact(pdf, sealX - 3, controlY + 28, 'KM1');
  pdf.line(sealX, controlY + 38, sealX, controlY + 40);
  pdf.line(sealX, controlY + 40, buttonX, controlY + 40);

  // ============================================================================
  // CONTACTOR COILS - IEC Symbols
  // ============================================================================
  const coilX = buttonX + 35;

  for (let m = 0; m < numMotors && m < 3; m++) {
    const cx = coilX + m * 25;
    const kmLabel = `KM${m + 1}`;

    // Vertical connection from +24V
    pdf.line(cx, controlY, cx, controlY + 15);

    // Overload contact (NC) from FR
    drawIECNCContact(pdf, cx - 3, controlY + 15, `FR${m + 1}`);

    // Contactor coil
    pdf.line(cx, controlY + 27, cx, controlY + 32);
    drawIECCoil(pdf, cx - 5, controlY + 32, kmLabel);

    // Connection to 0V
    pdf.line(cx, controlY + 42, cx, rail0V);
  }

  // ============================================================================
  // PLC SECTION - IEC 60617 Terminal Representation
  // ============================================================================
  const plcX = PAGE_WIDTH - MARGIN - 55;
  const plcY = startY;
  const plcWidth = 45;
  const plcHeight = 100;

  // PLC outline
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.rect(plcX, plcY, plcWidth, plcHeight, 'S');

  // PLC label
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('PLC', plcX + plcWidth / 2, plcY + 8, { align: 'center' });
  pdf.setFontSize(5);
  pdf.text(projectInfo.plcModel || 'TM221CE24T', plcX + plcWidth / 2, plcY + 13, { align: 'center' });

  // Digital Inputs section
  pdf.setFontSize(5);
  pdf.text('DIGITAL INPUTS', plcX + 3, plcY + 20);

  const usedInputs = digitalInputs.filter(i => i.symbol);
  const inputStartY = plcY + 24;
  for (let i = 0; i < Math.min(usedInputs.length, 8); i++) {
    const iy = inputStartY + i * 5;
    const inp = usedInputs[i];

    // Terminal dot
    pdf.circle(plcX, iy, 1, 'F');
    // Address and symbol
    pdf.setFontSize(4);
    pdf.text(`${inp.address}`, plcX + 2, iy + 1);
    pdf.text(`${inp.symbol}`, plcX + 12, iy + 1);

    // Input wire
    pdf.setLineWidth(0.2);
    pdf.line(plcX - 10, iy, plcX, iy);
  }

  // Digital Outputs section
  const outputStartY = plcY + 65;
  pdf.setFontSize(5);
  pdf.text('DIGITAL OUTPUTS', plcX + 3, outputStartY - 3);

  const usedOutputs = digitalOutputs.filter(o => o.symbol);
  for (let i = 0; i < Math.min(usedOutputs.length, 6); i++) {
    const oy = outputStartY + i * 5;
    const outp = usedOutputs[i];

    // Terminal dot
    pdf.circle(plcX + plcWidth, oy, 1, 'F');
    // Address and symbol
    pdf.setFontSize(4);
    pdf.text(`${outp.address}`, plcX + plcWidth - 22, oy + 1);
    pdf.text(`${outp.symbol}`, plcX + plcWidth - 12, oy + 1);

    // Output wire
    pdf.setLineWidth(0.2);
    pdf.line(plcX + plcWidth, oy, plcX + plcWidth + 10, oy);
  }

  // Analog Inputs section (if present)
  if (analogInputs.length > 0) {
    const aiY = plcY + 45;
    pdf.setFontSize(5);
    pdf.text('ANALOG IN', plcX + 3, aiY);

    const usedAnalogs = analogInputs.filter(a => a.symbol);
    for (let i = 0; i < Math.min(usedAnalogs.length, 2); i++) {
      const ay = aiY + 4 + i * 5;
      const ai = usedAnalogs[i];

      pdf.circle(plcX, ay, 1, 'F');
      pdf.setFontSize(4);
      pdf.text(`${ai.address}`, plcX + 2, ay + 1);
      pdf.text(`${ai.symbol}`, plcX + 12, ay + 1);

      pdf.setLineWidth(0.2);
      pdf.line(plcX - 10, ay, plcX, ay);
    }
  }

  // Power connections to PLC
  pdf.setFontSize(4);
  pdf.text('+24V', plcX + plcWidth + 2, plcY + 3);
  pdf.text('0V', plcX + plcWidth + 2, plcY + 8);
  pdf.text('PE', plcX + plcWidth + 2, plcY + 13);

  // ============================================================================
  // LEGEND - IEC 60617 Symbols
  // ============================================================================
  drawIECLegend(pdf, MARGIN + 5, PAGE_HEIGHT - 45);

  // ============================================================================
  // I/O SUMMARY
  // ============================================================================
  const summaryX = PAGE_WIDTH - MARGIN - 45;
  const summaryY = PAGE_HEIGHT - 40;

  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('I/O SUMMARY', summaryX, summaryY);

  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`DI: ${usedInputs.length}`, summaryX, summaryY + 6);
  pdf.text(`DO: ${usedOutputs.length}`, summaryX, summaryY + 11);
  pdf.text(`AI: ${analogInputs.filter(a => a.symbol).length}`, summaryX, summaryY + 16);
  pdf.text(`Motors: ${motorOutputs.length}`, summaryX, summaryY + 21);
}

// ============================================================================
// IEC 60617 SYMBOL DRAWING FUNCTIONS
// ============================================================================

/**
 * IEC 60617 Disconnect Switch Symbol
 */
function drawIECDisconnectSwitch(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // Fixed contact (bottom)
  pdf.circle(x, y + 8, 1, 'S');

  // Moving contact (diagonal line)
  pdf.line(x, y + 7, x + 4, y + 2);

  // Top contact point
  pdf.circle(x + 5, y, 1, 'S');

  if (label) {
    pdf.setFontSize(5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, x + 7, y + 5);
  }
}

/**
 * IEC 60617 Circuit Breaker Symbol
 */
function drawIECCircuitBreaker(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // Rectangle body
  pdf.rect(x, y, 6, 10, 'S');

  // Diagonal trip line
  pdf.line(x + 1, y + 8, x + 5, y + 2);

  // Cross mark (trip indicator)
  pdf.line(x + 2, y + 4, x + 4, y + 6);

  if (label) {
    pdf.setFontSize(5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, x + 7, y + 6);
  }
}

/**
 * IEC 60617 Fuse Symbol
 */
function drawIECFuse(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // Rectangle
  pdf.rect(x, y, 4, 10, 'S');

  // Fuse element line
  pdf.line(x + 2, y + 1, x + 2, y + 9);

  if (label) {
    pdf.setFontSize(5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, x + 6, y + 6);
  }
}

/**
 * IEC 60617 NO Contact Symbol
 */
function drawIECNOContact(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // Two parallel lines with gap (normally open)
  pdf.line(x, y, x + 3, y);
  pdf.line(x + 3, y, x + 5, y - 3);
  pdf.line(x + 5, y, x + 8, y);

  if (label) {
    pdf.setFontSize(4);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, x + 4, y + 5, { align: 'center' });
  }
}

/**
 * IEC 60617 NC Contact Symbol
 */
function drawIECNCContact(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // Two parallel lines with diagonal (normally closed)
  pdf.line(x, y, x + 3, y);
  pdf.line(x + 3, y - 2, x + 5, y + 2);
  pdf.line(x + 5, y, x + 8, y);

  // Bar across (indicates NC)
  pdf.line(x + 3, y - 3, x + 5, y - 3);

  if (label) {
    pdf.setFontSize(4);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, x + 4, y + 5, { align: 'center' });
  }
}

/**
 * IEC 60617 Coil Symbol
 */
function drawIECCoil(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // Rectangle or circle for coil
  pdf.rect(x, y, 10, 8, 'S');

  // Coil lines inside
  pdf.line(x + 2, y + 2, x + 2, y + 6);
  pdf.line(x + 8, y + 2, x + 8, y + 6);

  if (label) {
    pdf.setFontSize(5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, x + 5, y + 5.5, { align: 'center' });
  }
}

/**
 * IEC 60617 Overload Relay Symbol
 */
function drawIECOverloadRelay(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // Rectangle
  pdf.rect(x, y, 8, 12, 'S');

  // Heater element (zigzag)
  pdf.line(x + 2, y + 2, x + 6, y + 4);
  pdf.line(x + 6, y + 4, x + 2, y + 6);
  pdf.line(x + 2, y + 6, x + 6, y + 8);
  pdf.line(x + 6, y + 8, x + 4, y + 10);

  if (label) {
    pdf.setFontSize(5);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, x + 4, y + 16, { align: 'center' });
  }
}

/**
 * IEC 60617 Motor Symbol
 */
function drawIECMotor(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.4);

  // Circle
  pdf.circle(x, y, 7, 'S');

  // M inside
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('M', x, y + 2.5, { align: 'center' });

  // 3~ for 3-phase (optional)
  pdf.setFontSize(4);
  pdf.text('3~', x, y + 6, { align: 'center' });

  if (label) {
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(label, x, y + 12, { align: 'center' });
  }
}

/**
 * IEC 60617 Emergency Stop Symbol
 */
function drawIECEmergencyStop(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(200, 0, 0);
  pdf.setLineWidth(0.3);

  // Mushroom head (arc on top)
  pdf.line(x, y, x + 8, y);
  pdf.line(x, y, x + 2, y - 3);
  pdf.line(x + 8, y, x + 6, y - 3);
  pdf.line(x + 2, y - 3, x + 6, y - 3);

  // NC contact below
  pdf.setDrawColor(0, 0, 0);
  pdf.line(x + 4, y, x + 4, y + 2);
  pdf.line(x + 2, y + 2, x + 4, y + 2);
  pdf.line(x + 4, y + 4, x + 6, y + 4);
  pdf.line(x + 2, y + 2, x + 6, y + 6);
  pdf.line(x + 4, y + 6, x + 4, y + 10);

  if (label) {
    pdf.setFontSize(5);
    pdf.setTextColor(200, 0, 0);
    pdf.text(label, x + 10, y + 5);
  }
}

/**
 * IEC 60617 Pushbutton NO Symbol
 */
function drawIECPushbuttonNO(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // Circle (button head)
  pdf.circle(x + 4, y, 2, 'S');

  // NO contact
  pdf.line(x + 4, y + 2, x + 4, y + 4);
  pdf.line(x + 2, y + 4, x + 4, y + 4);
  pdf.line(x + 4, y + 6, x + 6, y + 6);
  pdf.line(x + 2, y + 4, x + 4, y + 7);
  pdf.line(x + 4, y + 8, x + 4, y + 10);

  if (label) {
    pdf.setFontSize(5);
    pdf.setTextColor(0, 128, 0);
    pdf.text(label, x + 10, y + 5);
  }
}

/**
 * IEC 60617 Pushbutton NC Symbol
 */
function drawIECPushbuttonNC(pdf: jsPDF, x: number, y: number, label: string): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);

  // Circle (button head)
  pdf.circle(x + 4, y, 2, 'S');

  // NC contact (closed)
  pdf.line(x + 4, y + 2, x + 4, y + 4);
  pdf.line(x + 2, y + 4, x + 6, y + 4);
  pdf.line(x + 2, y + 6, x + 6, y + 6);
  pdf.line(x + 4, y + 6, x + 4, y + 10);

  // Bar (NC indicator)
  pdf.line(x + 1, y + 3, x + 7, y + 3);

  if (label) {
    pdf.setFontSize(5);
    pdf.setTextColor(200, 0, 0);
    pdf.text(label, x + 10, y + 5);
  }
}

/**
 * Draw IEC 60617 Legend
 */
function drawIECLegend(pdf: jsPDF, x: number, y: number): void {
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('LEGEND (IEC 60617)', x, y);

  pdf.setFontSize(4);
  pdf.setFont('helvetica', 'normal');

  const legendItems = [
    { symbol: 'QS', desc: 'Disconnect Switch' },
    { symbol: 'QF', desc: 'Circuit Breaker' },
    { symbol: 'F', desc: 'Fuse' },
    { symbol: 'KM', desc: 'Contactor' },
    { symbol: 'FR', desc: 'Overload Relay' },
    { symbol: 'M', desc: 'Motor' },
    { symbol: 'S0', desc: 'Emergency Stop' },
    { symbol: 'S1/S2', desc: 'Push Buttons' },
  ];

  for (let i = 0; i < legendItems.length; i++) {
    const ly = y + 5 + i * 4;
    pdf.text(`${legendItems[i].symbol} - ${legendItems[i].desc}`, x, ly);
  }
}

/**
 * Draw a colored component block with label
 */
function drawComponentBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label1: string,
  label2: string,
  color: number[]
): void {
  pdf.setFillColor(color[0], color[1], color[2]);
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(x, y, width, height, 2, 2, 'FD');

  // White text for dark backgrounds, black for light
  const brightness = (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000;
  if (brightness < 128) {
    pdf.setTextColor(255, 255, 255);
  } else {
    pdf.setTextColor(0, 0, 0);
  }

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label1, x + width / 2, y + height / 2 - (label2 ? 2 : 0), { align: 'center' });
  if (label2) {
    pdf.text(label2, x + width / 2, y + height / 2 + 5, { align: 'center' });
  }
}

/**
 * Draw terminal block with styled appearance
 */
function drawTerminalBlockStyled(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label1: string,
  label2: string
): void {
  // Draw multiple terminal squares
  const termCount = Math.floor(width / 6);
  pdf.setFillColor(80, 60, 40);
  pdf.setDrawColor(0, 0, 0);

  for (let i = 0; i < termCount; i++) {
    pdf.rect(x + i * 6 + 2, y, 5, height, 'FD');
  }

  // Label below
  pdf.setFontSize(5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(label1, x + width / 2, y + height + 5, { align: 'center' });
  pdf.text(label2, x + width / 2, y + height + 10, { align: 'center' });
}

/**
 * Draw upward pointing arrow
 */
function drawArrowUp(pdf: jsPDF, x: number, y: number): void {
  pdf.setFillColor(255, 0, 0);
  pdf.triangle(x, y - 5, x - 4, y + 2, x + 4, y + 2, 'F');
}

/**
 * Draw leftward pointing arrow
 */
function drawArrowLeft(pdf: jsPDF, x: number, y: number): void {
  pdf.triangle(x - 5, y, x + 2, y - 4, x + 2, y + 4, 'F');
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
