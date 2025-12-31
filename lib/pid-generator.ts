/**
 * P&ID (Piping & Instrumentation Diagram) Generator
 * Generates ISA-standard process diagrams from PLC I/O configuration
 * Auto-infers equipment and instruments from I/O symbols
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
  };
  digitalInputs: IOEntry[];
  digitalOutputs: IOEntry[];
  analogInputs: IOEntry[];
  analogOutputs?: IOEntry[];
  writtenLogic?: {
    overview?: string;
  };
}

// P&ID specific types
interface ProcessEquipment {
  id: string;
  type: 'tank' | 'pump' | 'motor' | 'valve' | 'heater' | 'fan' | 'generic';
  name: string;
  symbol: string;
  plcAddress?: string;
  x: number;
  y: number;
}

interface Instrument {
  tag: string;
  type: 'LI' | 'TI' | 'PI' | 'FI' | 'LV' | 'FCV' | 'SV' | 'SC' | 'AI' | 'AO';
  plcAddress: string;
  symbol: string;
  comment?: string;
  range?: string;
  x: number;
  y: number;
}

// Layout constants
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

// Colors
const COLOR_BLACK = { r: 0, g: 0, b: 0 };
const COLOR_BLUE = { r: 0, g: 102, b: 204 };
const COLOR_GRAY = { r: 200, g: 200, b: 200 };
const COLOR_LIGHT_GRAY = { r: 240, g: 240, b: 240 };
const COLOR_GREEN = { r: 0, g: 128, b: 0 };
const COLOR_RED = { r: 200, g: 0, b: 0 };

/**
 * Infer ISA instrument type from symbol name
 */
function inferInstrumentType(symbol: string, comment?: string): 'LI' | 'TI' | 'PI' | 'FI' | 'AI' {
  const text = `${symbol} ${comment || ''}`.toUpperCase();

  if (text.includes('LEVEL') || text.includes('LVL') || text.includes('TANK') || text.includes('HEIGHT')) {
    return 'LI';
  }
  if (text.includes('TEMP') || text.includes('TEMPERATURE') || text.includes('RTD') || text.includes('THERMO')) {
    return 'TI';
  }
  if (text.includes('PRESS') || text.includes('PRESSURE') || text.includes('PSI') || text.includes('BAR')) {
    return 'PI';
  }
  if (text.includes('FLOW') || text.includes('RATE') || text.includes('GPM') || text.includes('LPM')) {
    return 'FI';
  }
  return 'AI'; // Generic analog input
}

/**
 * Infer actuator type from symbol name
 */
function inferActuatorType(symbol: string, comment?: string): 'LV' | 'FCV' | 'SV' | 'SC' | 'AO' {
  const text = `${symbol} ${comment || ''}`.toUpperCase();

  if (text.includes('VALVE') || text.includes('VLV') || text.includes('CONTROL')) {
    if (text.includes('FLOW')) return 'FCV';
    return 'LV';
  }
  if (text.includes('SOLENOID') || text.includes('SOL')) {
    return 'SV';
  }
  if (text.includes('SPEED') || text.includes('VFD') || text.includes('DRIVE') || text.includes('FREQ')) {
    return 'SC';
  }
  return 'AO'; // Generic analog output
}

/**
 * Infer equipment type from digital output symbol
 */
function inferEquipmentType(symbol: string, comment?: string): ProcessEquipment['type'] {
  const text = `${symbol} ${comment || ''}`.toUpperCase();

  if (text.includes('PUMP') || text.includes('PMP')) return 'pump';
  if (text.includes('MOTOR') || text.includes('MTR') || text.includes('DRIVE')) return 'motor';
  if (text.includes('VALVE') || text.includes('VLV') || text.includes('SOL')) return 'valve';
  if (text.includes('HEAT') || text.includes('HTR')) return 'heater';
  if (text.includes('FAN') || text.includes('BLOW')) return 'fan';
  return 'generic';
}

/**
 * Detect if this is a tank/level control application
 */
function detectProcessType(doc: AIDocumentation): 'tank' | 'pump' | 'motor' | 'generic' {
  const allSymbols = [
    ...doc.analogInputs.map(i => `${i.symbol} ${i.comment || ''}`),
    ...doc.digitalOutputs.map(i => `${i.symbol} ${i.comment || ''}`),
    ...(doc.analogOutputs || []).map(i => `${i.symbol} ${i.comment || ''}`)
  ].join(' ').toUpperCase();

  if (allSymbols.includes('TANK') || allSymbols.includes('LEVEL') || allSymbols.includes('LVL')) {
    return 'tank';
  }
  if (allSymbols.includes('PUMP') || allSymbols.includes('PMP')) {
    return 'pump';
  }
  if (allSymbols.includes('MOTOR') || allSymbols.includes('MTR')) {
    return 'motor';
  }
  return 'generic';
}

/**
 * Draw a tank/vessel symbol
 */
function drawTank(pdf: jsPDF, x: number, y: number, width: number, height: number, label: string): void {
  // Tank body
  pdf.setFillColor(COLOR_LIGHT_GRAY.r, COLOR_LIGHT_GRAY.g, COLOR_LIGHT_GRAY.b);
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.5);
  pdf.rect(x, y, width, height, 'FD');

  // Roof (dome top)
  pdf.setFillColor(COLOR_LIGHT_GRAY.r, COLOR_LIGHT_GRAY.g, COLOR_LIGHT_GRAY.b);
  pdf.ellipse(x + width / 2, y, width / 2, 5, 'FD');

  // Label
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text(label, x + width / 2, y + height / 2, { align: 'center' });
}

/**
 * Draw a control valve symbol (bowtie)
 */
function drawControlValve(pdf: jsPDF, x: number, y: number, label: string, plcAddress?: string): void {
  const size = 10;

  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setFillColor(255, 255, 255);
  pdf.setLineWidth(0.4);

  // Top triangle
  pdf.triangle(x, y, x + size, y, x + size / 2, y + size / 2, 'FD');
  // Bottom triangle
  pdf.triangle(x, y + size, x + size, y + size, x + size / 2, y + size / 2, 'FD');

  // Label below
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, x + size / 2, y + size + 5, { align: 'center' });

  // PLC address
  if (plcAddress) {
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
    pdf.text(plcAddress, x + size / 2, y + size + 9, { align: 'center' });
    pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  }
}

/**
 * Draw a pump symbol (circle with arrow)
 */
function drawPump(pdf: jsPDF, x: number, y: number, label: string, plcAddress?: string): void {
  const radius = 8;

  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setFillColor(255, 255, 255);
  pdf.setLineWidth(0.4);

  // Circle
  pdf.circle(x + radius, y + radius, radius, 'FD');

  // Arrow inside (triangle pointing right)
  pdf.setFillColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.triangle(
    x + radius - 3, y + radius - 4,
    x + radius - 3, y + radius + 4,
    x + radius + 5, y + radius,
    'F'
  );

  // Label below
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text(label, x + radius, y + radius * 2 + 5, { align: 'center' });

  // PLC address
  if (plcAddress) {
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
    pdf.text(plcAddress, x + radius, y + radius * 2 + 9, { align: 'center' });
    pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  }
}

/**
 * Draw a motor symbol (circle with M)
 */
function drawMotor(pdf: jsPDF, x: number, y: number, label: string, plcAddress?: string): void {
  const radius = 8;

  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setFillColor(255, 255, 255);
  pdf.setLineWidth(0.4);

  // Circle
  pdf.circle(x + radius, y + radius, radius, 'FD');

  // M inside
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('M', x + radius, y + radius + 3, { align: 'center' });

  // Label below
  pdf.setFontSize(6);
  pdf.text(label, x + radius, y + radius * 2 + 5, { align: 'center' });

  // PLC address
  if (plcAddress) {
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
    pdf.text(plcAddress, x + radius, y + radius * 2 + 9, { align: 'center' });
    pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  }
}

/**
 * Draw an instrument circle (ISA standard)
 */
function drawInstrument(
  pdf: jsPDF,
  x: number,
  y: number,
  tag: string,
  instrumentType: string,
  plcAddress: string,
  range?: string
): void {
  const radius = 8;

  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setFillColor(255, 255, 255);
  pdf.setLineWidth(0.4);

  // Circle
  pdf.circle(x, y, radius, 'FD');

  // Horizontal line through middle (ISA standard for field-mounted)
  pdf.line(x - radius, y, x + radius, y);

  // Instrument type (top half)
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text(instrumentType, x, y - 2, { align: 'center' });

  // Tag number (bottom half)
  pdf.setFontSize(5);
  pdf.text(tag, x, y + 4, { align: 'center' });

  // PLC address to the right
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.text(plcAddress, x + radius + 2, y, { align: 'left' });

  // Range below
  if (range) {
    pdf.setFontSize(4);
    pdf.setTextColor(COLOR_GRAY.r, COLOR_GRAY.g, COLOR_GRAY.b);
    pdf.text(range, x, y + radius + 3, { align: 'center' });
  }

  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
}

/**
 * Draw a process pipe line
 */
function drawPipe(pdf: jsPDF, x1: number, y1: number, x2: number, y2: number, withArrow: boolean = false): void {
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.8);
  pdf.line(x1, y1, x2, y2);

  // Arrow at end
  if (withArrow) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 3;
    const arrowAngle = Math.PI / 6;

    pdf.line(
      x2, y2,
      x2 - arrowLength * Math.cos(angle - arrowAngle),
      y2 - arrowLength * Math.sin(angle - arrowAngle)
    );
    pdf.line(
      x2, y2,
      x2 - arrowLength * Math.cos(angle + arrowAngle),
      y2 - arrowLength * Math.sin(angle + arrowAngle)
    );
  }
}

/**
 * Draw a signal/control line (dashed)
 */
function drawSignalLine(pdf: jsPDF, x1: number, y1: number, x2: number, y2: number): void {
  pdf.setDrawColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.setLineWidth(0.3);

  // Draw dashed line
  const dashLength = 2;
  const gapLength = 1;
  const totalLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const angle = Math.atan2(y2 - y1, x2 - x1);

  let currentLength = 0;
  while (currentLength < totalLength) {
    const startX = x1 + currentLength * Math.cos(angle);
    const startY = y1 + currentLength * Math.sin(angle);
    const endLength = Math.min(currentLength + dashLength, totalLength);
    const endX = x1 + endLength * Math.cos(angle);
    const endY = y1 + endLength * Math.sin(angle);

    pdf.line(startX, startY, endX, endY);
    currentLength += dashLength + gapLength;
  }
}

/**
 * Draw the P&ID legend
 */
function drawLegend(pdf: jsPDF, x: number, y: number): void {
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('LEGEND', x, y);

  let legendY = y + 6;
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');

  // Tank symbol
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.3);
  pdf.rect(x, legendY - 3, 8, 6, 'S');
  pdf.text('Process Vessel/Tank', x + 12, legendY);
  legendY += 8;

  // Control valve
  pdf.triangle(x, legendY - 3, x + 6, legendY - 3, x + 3, legendY, 'S');
  pdf.triangle(x, legendY + 3, x + 6, legendY + 3, x + 3, legendY, 'S');
  pdf.text('Control Valve', x + 12, legendY);
  legendY += 8;

  // Pump
  pdf.circle(x + 4, legendY, 4, 'S');
  pdf.text('Pump', x + 12, legendY);
  legendY += 8;

  // Motor
  pdf.circle(x + 4, legendY, 4, 'S');
  pdf.setFontSize(4);
  pdf.text('M', x + 4, legendY + 1, { align: 'center' });
  pdf.setFontSize(5);
  pdf.text('Motor', x + 12, legendY);
  legendY += 8;

  // Instrument
  pdf.circle(x + 4, legendY, 4, 'S');
  pdf.line(x, legendY, x + 8, legendY);
  pdf.text('Field Instrument (LI, TI, PI, FI)', x + 12, legendY);
  legendY += 8;

  // Process pipe
  pdf.setLineWidth(0.8);
  pdf.line(x, legendY, x + 10, legendY);
  pdf.setLineWidth(0.3);
  pdf.text('Process Piping', x + 12, legendY);
  legendY += 8;

  // Signal line (dashed - draw manually)
  pdf.setDrawColor(COLOR_BLUE.r, COLOR_BLUE.g, COLOR_BLUE.b);
  pdf.setLineWidth(0.3);
  // Draw dashed line manually
  for (let dx = 0; dx < 10; dx += 3) {
    pdf.line(x + dx, legendY, x + dx + 2, legendY);
  }
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('Control Signal (4-20mA)', x + 12, legendY);
}

/**
 * Generate tank-centered P&ID layout
 */
function generateTankLayout(
  pdf: jsPDF,
  doc: AIDocumentation,
  startY: number
): number {
  const centerX = PAGE_WIDTH / 2;
  const tankWidth = 40;
  const tankHeight = 50;
  const tankX = centerX - tankWidth / 2;
  const tankY = startY + 30;

  // Draw tank
  drawTank(pdf, tankX, tankY, tankWidth, tankHeight, 'T-100');

  // Find inlet/outlet valves from analog outputs
  const analogOutputs = (doc.analogOutputs || []).filter(o => o.used !== false && o.symbol);
  let valveIndex = 1;

  // Inlet valve (top)
  if (analogOutputs.length > 0) {
    const inletValve = analogOutputs[0];
    const valveX = centerX - 5;
    const valveY = tankY - 25;

    // Pipe from top
    drawPipe(pdf, centerX, startY + 5, centerX, valveY, true);
    pdf.setFontSize(6);
    pdf.text('SUPPLY', centerX, startY + 3, { align: 'center' });

    // Valve
    drawControlValve(pdf, valveX, valveY, `V-${valveIndex}`, inletValve.address);

    // Pipe to tank
    drawPipe(pdf, centerX, valveY + 15, centerX, tankY);

    // Signal line to valve
    drawSignalLine(pdf, centerX + 40, valveY + 5, valveX + 12, valveY + 5);

    valveIndex++;
  }

  // Outlet valve (bottom)
  if (analogOutputs.length > 1) {
    const outletValve = analogOutputs[1];
    const valveX = centerX - 5;
    const valveY = tankY + tankHeight + 10;

    // Pipe from tank
    drawPipe(pdf, centerX, tankY + tankHeight, centerX, valveY);

    // Valve
    drawControlValve(pdf, valveX, valveY, `V-${valveIndex}`, outletValve.address);

    // Pipe to drain
    drawPipe(pdf, centerX, valveY + 15, centerX, valveY + 30, true);
    pdf.setFontSize(6);
    pdf.text('DRAIN', centerX, valveY + 35, { align: 'center' });

    valveIndex++;
  }

  // Draw sensors from analog inputs
  const analogInputs = doc.analogInputs.filter(i => i.used !== false && i.symbol);
  let sensorY = tankY + 10;
  let sensorIndex = 101;

  analogInputs.forEach((sensor, index) => {
    const instrumentType = inferInstrumentType(sensor.symbol, sensor.comment);
    const instrumentX = tankX + tankWidth + 25;

    // Draw instrument
    drawInstrument(
      pdf,
      instrumentX,
      sensorY,
      String(sensorIndex),
      instrumentType,
      sensor.address,
      sensor.range || '4-20mA'
    );

    // Connection line to tank
    drawSignalLine(pdf, tankX + tankWidth, sensorY, instrumentX - 10, sensorY);

    sensorY += 20;
    sensorIndex++;
  });

  // Draw pumps from digital outputs
  const digitalOutputs = doc.digitalOutputs.filter(o => o.used !== false && o.symbol);
  const pumps = digitalOutputs.filter(o => {
    const type = inferEquipmentType(o.symbol, o.comment);
    return type === 'pump';
  });

  if (pumps.length > 0) {
    const pumpX = MARGIN + 20;
    let pumpY = tankY + 20;
    let pumpIndex = 101;

    pumps.forEach((pump) => {
      drawPump(pdf, pumpX, pumpY, `P-${pumpIndex}`, pump.address);

      // Pipe from pump to tank area
      drawPipe(pdf, pumpX + 16, pumpY + 8, tankX, pumpY + 8);

      pumpY += 30;
      pumpIndex++;
    });
  }

  // Draw motors from digital outputs
  const motors = digitalOutputs.filter(o => {
    const type = inferEquipmentType(o.symbol, o.comment);
    return type === 'motor' || type === 'generic';
  });

  if (motors.length > 0) {
    let motorX = PAGE_WIDTH - MARGIN - 40;
    let motorY = tankY + tankHeight + 30;
    let motorIndex = 101;

    motors.slice(0, 3).forEach((motor) => {
      drawMotor(pdf, motorX, motorY, `M-${motorIndex}`, motor.address);
      motorX -= 30;
      motorIndex++;
    });
  }

  return tankY + tankHeight + 80;
}

/**
 * Generate generic equipment layout
 */
function generateGenericLayout(
  pdf: jsPDF,
  doc: AIDocumentation,
  startY: number
): number {
  let currentY = startY + 10;
  let currentX = MARGIN + 20;

  // Draw all analog inputs as instruments
  const analogInputs = doc.analogInputs.filter(i => i.used !== false && i.symbol);

  if (analogInputs.length > 0) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SENSORS / TRANSMITTERS', MARGIN, currentY);
    currentY += 10;

    let sensorIndex = 101;
    analogInputs.forEach((sensor) => {
      const instrumentType = inferInstrumentType(sensor.symbol, sensor.comment);

      drawInstrument(
        pdf,
        currentX,
        currentY,
        String(sensorIndex),
        instrumentType,
        sensor.address,
        sensor.range || '4-20mA'
      );

      // Symbol name
      pdf.setFontSize(5);
      pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
      pdf.text(sensor.symbol, currentX, currentY + 15, { align: 'center' });

      currentX += 40;
      if (currentX > PAGE_WIDTH - MARGIN - 30) {
        currentX = MARGIN + 20;
        currentY += 30;
      }
      sensorIndex++;
    });

    currentY += 25;
  }

  // Draw analog outputs as control valves
  const analogOutputs = (doc.analogOutputs || []).filter(o => o.used !== false && o.symbol);

  if (analogOutputs.length > 0) {
    currentX = MARGIN + 20;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CONTROL VALVES / ACTUATORS', MARGIN, currentY);
    currentY += 10;

    let valveIndex = 1;
    analogOutputs.forEach((valve) => {
      drawControlValve(pdf, currentX, currentY, `V-${valveIndex}`, valve.address);

      // Symbol name
      pdf.setFontSize(5);
      pdf.text(valve.symbol, currentX + 5, currentY + 18, { align: 'center' });

      currentX += 35;
      if (currentX > PAGE_WIDTH - MARGIN - 30) {
        currentX = MARGIN + 20;
        currentY += 30;
      }
      valveIndex++;
    });

    currentY += 25;
  }

  // Draw digital outputs as equipment
  const digitalOutputs = doc.digitalOutputs.filter(o => o.used !== false && o.symbol);

  if (digitalOutputs.length > 0) {
    currentX = MARGIN + 20;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('EQUIPMENT', MARGIN, currentY);
    currentY += 10;

    let equipIndex = 101;
    digitalOutputs.forEach((equip) => {
      const equipType = inferEquipmentType(equip.symbol, equip.comment);

      if (equipType === 'pump') {
        drawPump(pdf, currentX, currentY, `P-${equipIndex}`, equip.address);
      } else if (equipType === 'motor') {
        drawMotor(pdf, currentX, currentY, `M-${equipIndex}`, equip.address);
      } else {
        // Generic equipment as rectangle
        pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
        pdf.setFillColor(255, 255, 255);
        pdf.rect(currentX, currentY, 16, 16, 'FD');
        pdf.setFontSize(5);
        pdf.text(equip.symbol.substring(0, 6), currentX + 8, currentY + 10, { align: 'center' });
        pdf.text(equip.address, currentX + 8, currentY + 22, { align: 'center' });
      }

      currentX += 35;
      if (currentX > PAGE_WIDTH - MARGIN - 30) {
        currentX = MARGIN + 20;
        currentY += 30;
      }
      equipIndex++;
    });

    currentY += 25;
  }

  return currentY;
}

/**
 * Main function: Generate P&ID diagram on new page
 */
export function generatePIDDiagram(pdf: jsPDF, doc: AIDocumentation): void {
  // Check if there's any analog I/O (P&ID is most useful for analog processes)
  const hasAnalogIO = doc.analogInputs.some(i => i.used !== false && i.symbol) ||
                      (doc.analogOutputs || []).some(o => o.used !== false && o.symbol);

  const hasDigitalOutputs = doc.digitalOutputs.some(o => o.used !== false && o.symbol);

  // Only generate P&ID if there's process I/O
  if (!hasAnalogIO && !hasDigitalOutputs) {
    return;
  }

  // Add new page
  pdf.addPage();

  let yPos = 18;

  // Title
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.text('PROCESS & INSTRUMENTATION DIAGRAM (P&ID)', PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 6;

  // Project info
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Project: ${doc.projectInfo.projectName}`, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 4;
  pdf.setFontSize(7);
  pdf.text(`PLC Model: ${doc.projectInfo.plcModel}`, PAGE_WIDTH / 2, yPos, { align: 'center' });
  yPos += 8;

  // Border
  pdf.setDrawColor(COLOR_BLACK.r, COLOR_BLACK.g, COLOR_BLACK.b);
  pdf.setLineWidth(0.5);
  pdf.rect(MARGIN, yPos, CONTENT_WIDTH, 180, 'S');

  // Detect process type and generate appropriate layout
  const processType = detectProcessType(doc);
  let endY: number;

  if (processType === 'tank' && hasAnalogIO) {
    endY = generateTankLayout(pdf, doc, yPos);
  } else {
    endY = generateGenericLayout(pdf, doc, yPos + 5);
  }

  // Draw legend
  drawLegend(pdf, MARGIN, Math.max(endY, yPos + 185));

  // Note about AI generation
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(COLOR_GRAY.r, COLOR_GRAY.g, COLOR_GRAY.b);
  pdf.text(
    'Note: This P&ID is auto-generated from PLC I/O configuration. Verify against actual installation.',
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 15,
    { align: 'center' }
  );
}
