/**
 * Single Line Connection Diagram Generator
 * Generates electrical schematic-style wiring diagrams for M221 PLC programs
 * Includes safety switchgear (MCB, ESTOP, Fuses, etc.)
 */

import jsPDF from 'jspdf';

// Types matching the AI documentation structure
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

// Layout constants (in mm)
const PAGE_WIDTH = 210;
const MARGIN = 14;

// Column positions
const INPUT_COL_X = MARGIN;
const INPUT_COL_WIDTH = 42;
const PLC_COL_X = 88;
const PLC_COL_WIDTH = 34;
const OUTPUT_COL_X = 155;
const OUTPUT_COL_WIDTH = 42;

// Safety switchgear column
const SAFETY_COL_X = MARGIN;
const SAFETY_COL_WIDTH = 180;

// Terminal block dimensions
const TERMINAL_HEIGHT = 11;
const TERMINAL_SPACING = 13;

// Colors
const COLOR_BLACK = { r: 0, g: 0, b: 0 };
const COLOR_BLUE = { r: 0, g: 102, b: 204 };
const COLOR_GRAY = { r: 240, g: 240, b: 240 };
const COLOR_DARK_GRAY = { r: 100, g: 100, b: 100 };
const COLOR_GREEN = { r: 0, g: 128, b: 0 };
const COLOR_RED = { r: 200, g: 0, b: 0 };
const COLOR_YELLOW = { r: 255, g: 200, b: 0 };

/**
 * Draw MCB (Miniature Circuit Breaker) symbol
 */
function drawMCB(pdf: jsPDF, x: number, y: number, label: string): void {
  const width = 20;
  const height = 25;

  // MCB box
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.4);
  pdf.rect(x, y, width, height, 'FD');

  // Contact symbol (diagonal line with break)
  pdf.setLineWidth(0.5);
  pdf.line(x + 5, y + 5, x + 10, y + 12);
  pdf.line(x + 10, y + 13, x + 15, y + 20);

  // Label
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text(label, x + width / 2, y + height + 4, { align: 'center' });

  // Rating
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.text('16A', x + width / 2, y + height + 8, { align: 'center' });
}

/**
 * Draw Emergency Stop button symbol
 */
function drawESTOP(pdf: jsPDF, x: number, y: number): void {
  const radius = 10;

  // Outer circle (red)
  pdf.setFillColor(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.5);
  pdf.circle(x + radius, y + radius, radius, 'FD');

  // Inner circle (yellow)
  pdf.setFillColor(COLOR_YELLOW.r, COLOR_YELLOW.g, COLOR_YELLOW.b);
  pdf.circle(x + radius, y + radius, radius - 4, 'FD');

  // X symbol
  pdf.setLineWidth(0.8);
  pdf.setDrawColor(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
  pdf.line(x + radius - 3, y + radius - 3, x + radius + 3, y + radius + 3);
  pdf.line(x + radius - 3, y + radius + 3, x + radius + 3, y + radius - 3);

  // Label
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
  pdf.text('E-STOP', x + radius, y + radius * 2 + 5, { align: 'center' });

  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('NC Contact', x + radius, y + radius * 2 + 9, { align: 'center' });
}

/**
 * Draw Fuse symbol
 */
function drawFuse(pdf: jsPDF, x: number, y: number, label: string, rating: string): void {
  const width = 18;
  const height = 10;

  // Fuse body (rectangle with curved ends)
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.4);
  pdf.rect(x, y, width, height, 'FD');

  // Fuse element (S-curve inside)
  pdf.setLineWidth(0.3);
  const midY = y + height / 2;
  pdf.line(x + 3, midY, x + 6, midY - 2);
  pdf.line(x + 6, midY - 2, x + 9, midY + 2);
  pdf.line(x + 9, midY + 2, x + 12, midY - 2);
  pdf.line(x + 12, midY - 2, x + 15, midY);

  // Label
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text(label, x + width / 2, y + height + 4, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.text(rating, x + width / 2, y + height + 8, { align: 'center' });
}

/**
 * Draw Contactor symbol (for motor outputs)
 */
function drawContactor(pdf: jsPDF, x: number, y: number, label: string): void {
  const width = 20;
  const height = 15;

  // Contactor coil (rectangle)
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.4);
  pdf.rect(x, y, width, height, 'FD');

  // Coil symbol (two parallel lines inside)
  pdf.setLineWidth(0.3);
  pdf.line(x + 5, y + 3, x + 5, y + height - 3);
  pdf.line(x + 15, y + 3, x + 15, y + height - 3);

  // Label
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text(label, x + width / 2, y + height + 4, { align: 'center' });
}

/**
 * Draw Overload Relay symbol
 */
function drawOverloadRelay(pdf: jsPDF, x: number, y: number, label: string): void {
  const width = 20;
  const height = 15;

  // OL relay box
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.4);
  pdf.rect(x, y, width, height, 'FD');

  // OL symbol (wavy line - heater element)
  pdf.setLineWidth(0.3);
  let px = x + 4;
  const py = y + height / 2;
  while (px < x + width - 4) {
    pdf.line(px, py - 2, px + 2, py + 2);
    px += 3;
  }

  // Label
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text(label, x + width / 2, y + height + 4, { align: 'center' });

  pdf.setFont('helvetica', 'normal');
  pdf.text('OL Relay', x + width / 2, y + height + 8, { align: 'center' });
}

/**
 * Draw safety switchgear section
 */
function drawSafetySwitchgear(pdf: jsPDF, startY: number): number {
  let y = startY;

  // Section title
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
  pdf.text('SAFETY SWITCHGEAR', SAFETY_COL_X, y);
  y += 6;

  // Draw horizontal power bus
  pdf.setDrawColor(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
  pdf.setLineWidth(0.8);
  pdf.line(SAFETY_COL_X, y, SAFETY_COL_X + SAFETY_COL_WIDTH, y);

  // Labels for power lines
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
  pdf.text('L', SAFETY_COL_X - 3, y + 1);
  pdf.text('N', SAFETY_COL_X - 3, y + 8);

  y += 2;
  pdf.setDrawColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.line(SAFETY_COL_X, y + 5, SAFETY_COL_X + SAFETY_COL_WIDTH, y + 5);

  // Component positions
  const compY = y + 12;
  let compX = SAFETY_COL_X + 5;

  // Main MCB (QF1)
  drawMCB(pdf, compX, compY, 'QF1');
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.3);
  pdf.line(compX + 10, y, compX + 10, compY); // Line from bus to MCB
  compX += 35;

  // Emergency Stop
  drawESTOP(pdf, compX, compY);
  pdf.setDrawColor(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
  pdf.setLineWidth(0.3);
  pdf.line(compX + 10, compY, compX + 10, compY - 10);
  compX += 35;

  // Control Fuse (F1)
  drawFuse(pdf, compX, compY + 5, 'F1', '2A');
  compX += 30;

  // 24VDC PSU indicator
  pdf.setFillColor(COLOR_GRAY.r, COLOR_GRAY.g, COLOR_GRAY.b);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.4);
  pdf.rect(compX, compY, 25, 20, 'FD');
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('PSU', compX + 12.5, compY + 8, { align: 'center' });
  pdf.setFontSize(5);
  pdf.text('24VDC', compX + 12.5, compY + 14, { align: 'center' });
  compX += 35;

  // Output protection (Motor contactor + OL)
  drawContactor(pdf, compX, compY, 'K1');
  compX += 28;
  drawOverloadRelay(pdf, compX, compY, 'F2');

  return compY + 45; // Return Y position after safety section
}

/**
 * Draw a terminal block symbol for digital I/O
 */
function drawTerminalBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  address: string,
  symbol: string,
  isInput: boolean
): void {
  // Draw terminal box
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.4);
  pdf.rect(x, y, width, TERMINAL_HEIGHT, 'FD');

  // Draw connection point (small filled circle)
  const connX = isInput ? x + width : x;
  const connY = y + TERMINAL_HEIGHT / 2;
  pdf.setFillColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.circle(connX, connY, 1.5, 'F');

  // Address text (top)
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text(address, x + width / 2, y + 4, { align: 'center' });

  // Symbol text (bottom)
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLOR_DARK_GRAY.r, COLOR_DARK_GRAY.g, COLOR_DARK_GRAY.b);
  const truncatedSymbol = symbol.length > 10 ? symbol.substring(0, 9) + '..' : symbol;
  pdf.text(truncatedSymbol, x + width / 2, y + 9, { align: 'center' });
}

/**
 * Draw an analog terminal symbol (with circle indicator)
 */
function drawAnalogTerminal(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  address: string,
  symbol: string,
  isInput: boolean,
  range?: string
): void {
  // Draw terminal box with blue border for analog
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.setLineWidth(0.5);
  pdf.rect(x, y, width, TERMINAL_HEIGHT, 'FD');

  // Draw analog indicator circle
  const circleX = isInput ? x + width - 3 : x + 3;
  const circleY = y + TERMINAL_HEIGHT / 2;
  pdf.setFillColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.circle(circleX, circleY, 2, 'F');

  // Draw connection point
  const connX = isInput ? x + width : x;
  const connY = y + TERMINAL_HEIGHT / 2;
  pdf.setFillColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.circle(connX, connY, 1.5, 'F');

  // Address text (top)
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.text(address, x + width / 2, y + 4, { align: 'center' });

  // Symbol + range text (bottom)
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLOR_DARK_GRAY.r, COLOR_DARK_GRAY.g, COLOR_DARK_GRAY.b);
  const labelText = range ? `${symbol}` : symbol;
  const truncatedLabel = labelText.length > 10 ? labelText.substring(0, 9) + '..' : labelText;
  pdf.text(truncatedLabel, x + width / 2, y + 9, { align: 'center' });
}

/**
 * Draw the central PLC block
 */
function drawPLCBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  model: string,
  diCount: number,
  doCount: number,
  aiCount: number,
  aoCount: number
): void {
  // Main PLC box
  pdf.setFillColor(COLOR_GRAY.r, COLOR_GRAY.g, COLOR_GRAY.b);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.8);
  pdf.rect(x, y, width, height, 'FD');

  // Inner logo box
  const logoBoxX = x + 3;
  const logoBoxY = y + 4;
  const logoBoxW = width - 6;
  const logoBoxH = 18;
  pdf.setFillColor(255, 255, 255);
  pdf.setLineWidth(0.3);
  pdf.rect(logoBoxX, logoBoxY, logoBoxW, logoBoxH, 'FD');

  // Schneider Electric / MODICON text
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLOR_GREEN.r, COLOR_GREEN.g, COLOR_GREEN.b);
  pdf.text('SCHNEIDER', x + width / 2, logoBoxY + 5, { align: 'center' });
  pdf.text('ELECTRIC', x + width / 2, logoBoxY + 9, { align: 'center' });

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('M221', x + width / 2, logoBoxY + 15, { align: 'center' });

  // Model number
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text(model, x + width / 2, y + 28, { align: 'center' });

  // I/O counts
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLOR_DARK_GRAY.r, COLOR_DARK_GRAY.g, COLOR_DARK_GRAY.b);
  let infoY = y + 35;
  pdf.text(`DI:${diCount} DO:${doCount}`, x + width / 2, infoY, { align: 'center' });
  infoY += 5;
  pdf.text(`AI:${aiCount} AO:${aoCount}`, x + width / 2, infoY, { align: 'center' });

  // 24VDC power indicator
  infoY += 7;
  pdf.setFontSize(5);
  pdf.setTextColor(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
  pdf.text('24VDC', x + width / 2, infoY, { align: 'center' });
}

/**
 * Draw a connection line between terminal and PLC
 */
function drawConnectionLine(
  pdf: jsPDF,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  isAnalog: boolean
): void {
  if (isAnalog) {
    pdf.setDrawColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
    pdf.setLineWidth(0.3);
    // Dashed line for analog
    const dashLength = 2;
    const gapLength = 1;
    let currentX = startX;
    while (currentX < endX - dashLength) {
      pdf.line(currentX, startY, Math.min(currentX + dashLength, endX), startY);
      currentX += dashLength + gapLength;
    }
  } else {
    pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
    pdf.setLineWidth(0.3);
    pdf.line(startX, startY, endX, endY);
  }
}

/**
 * Draw the legend explaining symbols
 */
function drawLegend(pdf: jsPDF, x: number, y: number): void {
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('LEGEND', x, y);

  let legendY = y + 5;
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');

  // Digital I/O symbol
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.3);
  pdf.rect(x, legendY - 2, 6, 4, 'S');
  pdf.setFillColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.circle(x + 6, legendY, 0.8, 'F');
  pdf.text('Digital I/O Terminal', x + 9, legendY + 1);
  legendY += 6;

  // Analog I/O symbol
  pdf.setDrawColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.rect(x, legendY - 2, 6, 4, 'S');
  pdf.setFillColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.circle(x + 6, legendY, 0.8, 'F');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('Analog I/O (4-20mA)', x + 9, legendY + 1);
  legendY += 6;

  // MCB
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.rect(x, legendY - 2, 6, 4, 'S');
  pdf.line(x + 1, legendY - 1, x + 5, legendY + 1);
  pdf.text('MCB (Circuit Breaker)', x + 9, legendY + 1);
  legendY += 6;

  // E-Stop
  pdf.setFillColor(COLOR_RED.r, COLOR_RED.g, COLOR_RED.b);
  pdf.circle(x + 3, legendY, 2, 'F');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('Emergency Stop (NC)', x + 9, legendY + 1);
  legendY += 6;

  // Contactor
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.rect(x, legendY - 2, 6, 4, 'S');
  pdf.text('K', x + 3, legendY + 1, { align: 'center' });
  pdf.text('Contactor Coil', x + 9, legendY + 1);
  legendY += 6;

  // OL Relay
  pdf.rect(x, legendY - 2, 6, 4, 'S');
  pdf.text('OL', x + 3, legendY + 1, { align: 'center' });
  pdf.text('Overload Relay', x + 9, legendY + 1);
}

/**
 * Generate the complete single line connection diagram
 */
export function generateSingleLineDiagram(pdf: jsPDF, doc: AIDocumentation): void {
  // Add new page for diagram
  pdf.addPage();

  // Filter to get only used I/O (those with symbols)
  const usedDI = doc.digitalInputs.filter(i => i.used !== false && i.symbol);
  const usedDO = doc.digitalOutputs.filter(i => i.used !== false && i.symbol);
  const usedAI = doc.analogInputs.filter(i => i.used !== false && i.symbol);
  const usedAO = (doc.analogOutputs || []).filter(i => i.used !== false && i.symbol);

  const totalInputs = usedDI.length + usedAI.length;
  const totalOutputs = usedDO.length + usedAO.length;
  const maxItems = Math.max(totalInputs, totalOutputs, 4);

  // Calculate PLC block height based on I/O count
  const plcHeight = Math.max(55, maxItems * TERMINAL_SPACING);

  // Title
  let yPos = 18;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('SINGLE LINE CONNECTION DIAGRAM', PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 6;

  // Project info
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Project: ${doc.projectInfo.projectName}`, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 4;
  pdf.setFontSize(7);
  pdf.text(`PLC Model: ${doc.projectInfo.plcModel}`, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 8;

  // Draw safety switchgear section
  yPos = drawSafetySwitchgear(pdf, yPos);

  // Section headers
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('INPUTS', INPUT_COL_X + INPUT_COL_WIDTH / 2, yPos, { align: 'center' });
  pdf.text('PLC', PLC_COL_X + PLC_COL_WIDTH / 2, yPos, { align: 'center' });
  pdf.text('OUTPUTS', OUTPUT_COL_X + OUTPUT_COL_WIDTH / 2, yPos, { align: 'center' });
  yPos += 6;

  const startY = yPos;
  const plcStartY = yPos;

  // Draw PLC block
  drawPLCBlock(
    pdf,
    PLC_COL_X,
    plcStartY,
    PLC_COL_WIDTH,
    plcHeight,
    doc.projectInfo.plcModel,
    usedDI.length,
    usedDO.length,
    usedAI.length,
    usedAO.length
  );

  // Draw digital inputs
  let inputY = startY;
  usedDI.forEach((input) => {
    drawTerminalBlock(pdf, INPUT_COL_X, inputY, INPUT_COL_WIDTH, input.address, input.symbol, true);
    // Draw connection line
    const lineStartX = INPUT_COL_X + INPUT_COL_WIDTH;
    const lineEndX = PLC_COL_X;
    const lineY = inputY + TERMINAL_HEIGHT / 2;
    drawConnectionLine(pdf, lineStartX, lineY, lineEndX, lineY, false);
    inputY += TERMINAL_SPACING;
  });

  // Draw analog inputs (after digital)
  if (usedAI.length > 0) {
    inputY += 3; // Small gap between digital and analog
    usedAI.forEach((input) => {
      drawAnalogTerminal(pdf, INPUT_COL_X, inputY, INPUT_COL_WIDTH, input.address, input.symbol, true, '4-20mA');
      // Draw connection line
      const lineStartX = INPUT_COL_X + INPUT_COL_WIDTH;
      const lineEndX = PLC_COL_X;
      const lineY = inputY + TERMINAL_HEIGHT / 2;
      drawConnectionLine(pdf, lineStartX, lineY, lineEndX, lineY, true);
      inputY += TERMINAL_SPACING;
    });
  }

  // Draw digital outputs
  let outputY = startY;
  usedDO.forEach((output) => {
    drawTerminalBlock(pdf, OUTPUT_COL_X, outputY, OUTPUT_COL_WIDTH, output.address, output.symbol, false);
    // Draw connection line
    const lineStartX = PLC_COL_X + PLC_COL_WIDTH;
    const lineEndX = OUTPUT_COL_X;
    const lineY = outputY + TERMINAL_HEIGHT / 2;
    drawConnectionLine(pdf, lineStartX, lineY, lineEndX, lineY, false);
    outputY += TERMINAL_SPACING;
  });

  // Draw analog outputs (after digital)
  if (usedAO.length > 0) {
    outputY += 3; // Small gap between digital and analog
    usedAO.forEach((output) => {
      drawAnalogTerminal(pdf, OUTPUT_COL_X, outputY, OUTPUT_COL_WIDTH, output.address, output.symbol, false, '0-10V');
      // Draw connection line
      const lineStartX = PLC_COL_X + PLC_COL_WIDTH;
      const lineEndX = OUTPUT_COL_X;
      const lineY = outputY + TERMINAL_HEIGHT / 2;
      drawConnectionLine(pdf, lineStartX, lineY, lineEndX, lineY, true);
      outputY += TERMINAL_SPACING;
    });
  }

  // Draw legend at bottom
  const legendY = Math.max(inputY, outputY, plcStartY + plcHeight) + 10;
  drawLegend(pdf, MARGIN, legendY);

  // Add diagram notes
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(COLOR_DARK_GRAY.r, COLOR_DARK_GRAY.g, COLOR_DARK_GRAY.b);
  pdf.text('Notes:', MARGIN, legendY + 42);
  pdf.text('1. Only I/O with defined symbols (used in program) are shown.', MARGIN + 2, legendY + 46);
  pdf.text('2. Safety switchgear ratings are indicative. Verify with actual installation requirements.', MARGIN + 2, legendY + 50);
  pdf.text('3. Emergency Stop must be hardwired (not PLC controlled) for safety compliance.', MARGIN + 2, legendY + 54);
}
