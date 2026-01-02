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
 * Draw block diagram style wiring schematic
 * Matches the clean visual style with labeled component blocks
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
  const startY = 35;

  // === LEFT SIDE: POWER SUPPLY ===

  // Draw 3-Phase Busbar (colored vertical lines)
  const busbarX = 25;
  const busbarTop = startY;
  const busbarBottom = startY + 100;

  // L1 - Red
  pdf.setDrawColor(255, 0, 0);
  pdf.setLineWidth(1.5);
  pdf.line(busbarX, busbarTop, busbarX, busbarBottom);

  // L2 - Yellow
  pdf.setDrawColor(255, 200, 0);
  pdf.line(busbarX + 4, busbarTop, busbarX + 4, busbarBottom);

  // L3 - Blue
  pdf.setDrawColor(0, 100, 255);
  pdf.line(busbarX + 8, busbarTop, busbarX + 8, busbarBottom);

  // N - Black
  pdf.setDrawColor(0, 0, 0);
  pdf.line(busbarX + 12, busbarTop, busbarX + 12, busbarBottom);

  // Busbar label
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Busbar', busbarX + 6, busbarBottom + 8, { align: 'center' });

  // 3 Phase Supply arrow and label
  pdf.setFillColor(255, 0, 0);
  drawArrowUp(pdf, busbarX + 6, busbarBottom + 20);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 0, 0);
  pdf.text('3 Phase', busbarX + 6, busbarBottom + 32, { align: 'center' });
  pdf.text('Incoming Supply', busbarX + 6, busbarBottom + 38, { align: 'center' });

  // === MAIN BREAKER SWITCH ===
  const breakerX = 50;
  const breakerY = startY + 20;
  drawComponentBlock(pdf, breakerX, breakerY, 35, 25, 'Main Breaker', 'Switch', [255, 200, 0]);

  // Wire from busbar to breaker
  pdf.setDrawColor(255, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.line(busbarX + 12, breakerY + 12, breakerX, breakerY + 12);

  // === CIRCUIT BREAKER ===
  const cbX = 50;
  const cbY = startY + 55;
  drawComponentBlock(pdf, cbX, cbY, 35, 20, 'Circuit', 'Breaker', [0, 0, 0]);

  // Wire from main breaker to circuit breaker
  pdf.setDrawColor(0, 0, 0);
  pdf.line(breakerX + 17, breakerY + 25, breakerX + 17, cbY);

  // === CONTACTOR ===
  const contactorX = 95;
  const contactorY = startY + 30;
  drawComponentBlock(pdf, contactorX, contactorY, 30, 30, 'Contactor', '', [100, 100, 255]);

  // Contactor terminals
  pdf.setFontSize(5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('L', contactorX + 8, contactorY + 10);
  pdf.text('N', contactorX + 22, contactorY + 10);

  // Wire from circuit breaker to contactor
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.8);
  pdf.line(cbX + 35, cbY + 10, contactorX, contactorY + 15);

  // Neutral note
  pdf.setFontSize(5);
  pdf.setTextColor(0, 0, 0);
  pdf.text('N (Take it from', contactorX + 32, contactorY + 10);
  pdf.text('Neutral)', contactorX + 32, contactorY + 15);

  // === SMPS (Power Supply) ===
  const smpsX = 95;
  const smpsY = startY + 70;
  drawComponentBlock(pdf, smpsX, smpsY, 30, 20, 'SMPS', '', [255, 50, 50]);

  // Wire from contactor to SMPS
  pdf.setDrawColor(0, 0, 0);
  pdf.line(contactorX + 15, contactorY + 30, contactorX + 15, smpsY);

  // DC Output label
  pdf.setFontSize(6);
  pdf.setTextColor(255, 0, 0);
  pdf.text('DC Output', smpsX + 15, smpsY + 28, { align: 'center' });

  // === PLC BLOCK ===
  const plcX = 160;
  const plcY = startY + 10;
  const plcWidth = 70;
  const plcHeight = 55;

  // PLC main block
  pdf.setFillColor(0, 128, 180);
  pdf.setDrawColor(0, 80, 120);
  pdf.setLineWidth(1);
  pdf.roundedRect(plcX, plcY, plcWidth, plcHeight, 3, 3, 'FD');

  // PLC label
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 0);
  pdf.text('PLC', plcX + plcWidth / 2, plcY + plcHeight / 2 + 5, { align: 'center' });

  // PLC model
  pdf.setFontSize(6);
  pdf.setTextColor(255, 255, 255);
  pdf.text(projectInfo.plcModel || 'TM221CE24T', plcX + plcWidth / 2, plcY + plcHeight - 5, { align: 'center' });

  // DI section (top left)
  pdf.setFillColor(200, 200, 200);
  pdf.rect(plcX + 5, plcY + 5, 15, 12, 'F');
  pdf.setFontSize(6);
  pdf.setTextColor(0, 0, 0);
  pdf.text('DI', plcX + 12, plcY + 12, { align: 'center' });

  // AI section (top right)
  pdf.setFillColor(200, 200, 200);
  pdf.rect(plcX + plcWidth - 20, plcY + 5, 15, 12, 'F');
  pdf.text('AI', plcX + plcWidth - 12, plcY + 12, { align: 'center' });

  // DO section (bottom left)
  pdf.setFillColor(200, 200, 200);
  pdf.rect(plcX + 5, plcY + plcHeight - 17, 15, 12, 'F');
  pdf.text('DO', plcX + 12, plcY + plcHeight - 10, { align: 'center' });

  // AO section (bottom right)
  pdf.setFillColor(200, 200, 200);
  pdf.rect(plcX + plcWidth - 20, plcY + plcHeight - 17, 15, 12, 'F');
  pdf.text('AO', plcX + plcWidth - 12, plcY + plcHeight - 10, { align: 'center' });

  // Com section
  pdf.setFillColor(200, 200, 200);
  pdf.rect(plcX + 5, plcY + 22, 15, 10, 'F');
  pdf.setFontSize(5);
  pdf.text('Com', plcX + 12, plcY + 28, { align: 'center' });

  // 24V DC and 0V DC lines to PLC
  pdf.setFontSize(6);
  pdf.setTextColor(0, 0, 0);
  pdf.text('0V DC', plcX + plcWidth + 5, plcY + 5);
  pdf.text('24V DC', plcX + plcWidth + 5, plcY + 15);

  // Horizontal lines from SMPS to PLC
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(smpsX + 30, smpsY + 5, plcX + plcWidth + 3, smpsY + 5);
  pdf.line(plcX + plcWidth + 3, smpsY + 5, plcX + plcWidth + 3, plcY + 5);
  pdf.line(smpsX + 30, smpsY + 15, plcX + plcWidth + 15, smpsY + 15);
  pdf.line(plcX + plcWidth + 15, smpsY + 15, plcX + plcWidth + 15, plcY + 15);

  // 0V line
  pdf.line(plcX + plcWidth, plcY + 22, plcX + plcWidth + 3, plcY + 22);
  pdf.line(plcX + plcWidth + 3, plcY + 5, plcX + plcWidth + 3, plcY + 22);

  // === RELAY BOARD ===
  const relayX = 160;
  const relayY = startY + 75;
  drawComponentBlock(pdf, relayX, relayY, 50, 22, 'Relay Board', '', [200, 100, 200]);

  // Note under relay
  pdf.setFontSize(5);
  pdf.setTextColor(0, 0, 0);
  pdf.text('(Take it from any phase)', relayX + 25, relayY + 30, { align: 'center' });

  // Wire from PLC DO to Relay Board
  pdf.setDrawColor(0, 0, 0);
  pdf.line(plcX + 12, plcY + plcHeight, plcX + 12, relayY);
  pdf.line(plcX + 12, relayY, relayX, relayY + 11);

  // === TERMINAL BLOCKS (Bottom) ===
  const tbY = startY + 115;
  const tbHeight = 18;
  const tbSpacing = 5;

  // TB FOR 3 PHASE OUTPUT
  let tbX = 80;
  drawTerminalBlockStyled(pdf, tbX, tbY, 45, tbHeight, 'TB FOR 3 PHASE', 'OUTPUT');

  // TB FOR ANALOG OUTPUT
  tbX += 50;
  drawTerminalBlockStyled(pdf, tbX, tbY, 35, tbHeight, 'TB FOR', 'ANALOG OUTPUT');

  // TB FOR ANALOG INPUT
  tbX += 40;
  drawTerminalBlockStyled(pdf, tbX, tbY, 35, tbHeight, 'TB FOR', 'ANALOG INPUT');

  // TB FOR DIGITAL INPUT
  tbX += 40;
  drawTerminalBlockStyled(pdf, tbX, tbY, 35, tbHeight, 'TB FOR', 'DIGITAL INPUT');

  // TB note
  pdf.setFontSize(5);
  pdf.setTextColor(100, 100, 100);
  pdf.text('TB = Terminal Block', tbX + 40, tbY + tbHeight + 5);

  // Wire from Relay to TB for 3 Phase
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(relayX + 25, relayY + 22, relayX + 25, tbY);

  // === EARTH CONNECTION ===
  const earthX = 130;
  const earthY = startY + 145;

  // Earth wire (green)
  pdf.setDrawColor(0, 150, 0);
  pdf.setLineWidth(1);
  pdf.line(busbarX + 12, busbarBottom, busbarX + 12, earthY);
  pdf.line(busbarX + 12, earthY, earthX, earthY);

  // Earth arrow
  pdf.setFillColor(0, 150, 0);
  drawArrowLeft(pdf, earthX + 20, earthY);

  // Earth label
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 150, 0);
  pdf.text('To Earth Pit', earthX + 35, earthY + 3);

  // === TB FOR EARTH (Right side) ===
  const earthTbX = 255;
  const earthTbY = startY + 40;
  pdf.setFillColor(200, 255, 200);
  pdf.setDrawColor(0, 150, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(earthTbX, earthTbY, 20, 60, 'FD');
  pdf.setFontSize(5);
  pdf.setTextColor(0, 100, 0);
  pdf.text('TB', earthTbX + 10, earthTbY + 20, { align: 'center' });
  pdf.text('FOR', earthTbX + 10, earthTbY + 27, { align: 'center' });
  pdf.text('EARTH', earthTbX + 10, earthTbY + 34, { align: 'center' });

  // Green earth wire to TB
  pdf.setDrawColor(0, 150, 0);
  pdf.setLineWidth(0.8);
  pdf.line(plcX + plcWidth, plcY + plcHeight / 2, earthTbX, earthTbY + 30);

  // === I/O SUMMARY (Right side) ===
  const summaryX = 240;
  const summaryY = startY + 110;

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('I/O SUMMARY', summaryX, summaryY);

  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  const usedInputs = digitalInputs.filter(i => i.symbol).length;
  const usedOutputs = digitalOutputs.filter(o => o.symbol).length;
  const usedAnalog = analogInputs.filter(a => a.symbol).length;

  pdf.text(`Digital Inputs: ${usedInputs}`, summaryX, summaryY + 8);
  pdf.text(`Digital Outputs: ${usedOutputs}`, summaryX, summaryY + 14);
  pdf.text(`Analog Inputs: ${usedAnalog}`, summaryX, summaryY + 20);
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
