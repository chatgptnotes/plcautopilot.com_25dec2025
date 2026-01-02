/**
 * IEEE/ANSI Standard Electrical Symbols Library
 * Compliant with IEEE 315 / ANSI Y32.2 / IEC 60617
 *
 * Used for generating professional electrical connection drawings
 */

import { jsPDF } from 'jspdf';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SymbolDimensions {
  width: number;
  height: number;
}

export interface ConnectionPoint {
  x: number;
  y: number;
  type: 'input' | 'output' | 'bidirectional';
}

export interface DrawnSymbol {
  bounds: { x: number; y: number; width: number; height: number };
  connections: ConnectionPoint[];
  label: string;
}

// Standard colors for electrical drawings
export const COLORS = {
  BLACK: { r: 0, g: 0, b: 0 },
  RED: { r: 200, g: 0, b: 0 },
  GREEN: { r: 0, g: 128, b: 0 },
  BLUE: { r: 0, g: 0, b: 200 },
  YELLOW: { r: 255, g: 200, b: 0 },
  ORANGE: { r: 255, g: 140, b: 0 },
  GRAY: { r: 128, g: 128, b: 128 },
  LIGHT_GRAY: { r: 200, g: 200, b: 200 },
  WHITE: { r: 255, g: 255, b: 255 },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function setColor(pdf: jsPDF, color: { r: number; g: number; b: number }) {
  pdf.setDrawColor(color.r, color.g, color.b);
  pdf.setFillColor(color.r, color.g, color.b);
}

function setLineWidth(pdf: jsPDF, width: number) {
  pdf.setLineWidth(width);
}

// ============================================================================
// CIRCUIT BREAKER (MCB/MCCB) - IEEE 315
// ============================================================================

/**
 * Draw a circuit breaker symbol (MCB/MCCB)
 * IEEE 315 standard: Rectangle with diagonal break line
 */
export function drawCircuitBreaker(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  rating?: string
): DrawnSymbol {
  const width = 10;
  const height = 20;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Main rectangle
  pdf.rect(x, y, width, height, 'S');

  // Diagonal break line (trip indicator)
  pdf.line(x + 2, y + height - 4, x + width - 2, y + 4);

  // Contact points
  const contactSize = 1.5;
  pdf.circle(x + width / 2, y - 1, contactSize, 'F');
  pdf.circle(x + width / 2, y + height + 1, contactSize, 'F');

  // Label below
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, x + width / 2, y + height + 5, { align: 'center' });

  // Rating if provided
  if (rating) {
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(rating, x + width / 2, y + height + 8, { align: 'center' });
  }

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x + width / 2, y: y - 1, type: 'input' },
      { x: x + width / 2, y: y + height + 1, type: 'output' }
    ],
    label
  };
}

// ============================================================================
// FUSE - IEEE 315
// ============================================================================

/**
 * Draw a fuse symbol
 * IEEE 315 standard: Rectangle with S-curve element
 */
export function drawFuse(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  rating?: string
): DrawnSymbol {
  const width = 8;
  const height = 16;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Main rectangle
  pdf.rect(x, y, width, height, 'S');

  // S-curve fuse element
  const midY = y + height / 2;
  pdf.line(x + 2, y + 3, x + width / 2, midY);
  pdf.line(x + width / 2, midY, x + width - 2, y + height - 3);

  // Connection points
  pdf.circle(x + width / 2, y - 1, 1, 'F');
  pdf.circle(x + width / 2, y + height + 1, 1, 'F');

  // Label
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, x + width / 2, y + height + 4, { align: 'center' });

  if (rating) {
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'normal');
    pdf.text(rating, x + width / 2, y + height + 7, { align: 'center' });
  }

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x + width / 2, y: y - 1, type: 'input' },
      { x: x + width / 2, y: y + height + 1, type: 'output' }
    ],
    label
  };
}

// ============================================================================
// CONTACTOR COIL - IEEE 315
// ============================================================================

/**
 * Draw a contactor/relay coil symbol
 * IEEE 315 standard: Circle or parentheses
 */
export function drawContactorCoil(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string
): DrawnSymbol {
  const width = 14;
  const height = 10;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Draw coil as rectangle with parentheses style
  pdf.rect(x, y, width, height, 'S');

  // Internal coil lines (parallel lines)
  pdf.line(x + 3, y + 2, x + 3, y + height - 2);
  pdf.line(x + width - 3, y + 2, x + width - 3, y + height - 2);

  // Connection points on sides
  pdf.circle(x - 1, y + height / 2, 1, 'F');
  pdf.circle(x + width + 1, y + height / 2, 1, 'F');

  // Label inside or below
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, x + width / 2, y + height / 2 + 1.5, { align: 'center' });

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x - 1, y: y + height / 2, type: 'input' },
      { x: x + width + 1, y: y + height / 2, type: 'output' }
    ],
    label
  };
}

// ============================================================================
// NORMALLY OPEN CONTACT - IEEE 315
// ============================================================================

/**
 * Draw a normally open (NO) contact
 * IEEE 315 standard: Two parallel lines with gap
 */
export function drawNOContact(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string
): DrawnSymbol {
  const width = 12;
  const height = 8;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Left line
  pdf.line(x, y + height / 2, x + 3, y + height / 2);
  pdf.line(x + 3, y + 1, x + 3, y + height - 1);

  // Right line (with gap - open position)
  pdf.line(x + width - 3, y + 1, x + width - 3, y + height - 1);
  pdf.line(x + width - 3, y + height / 2, x + width, y + height / 2);

  // Moving contact (diagonal line showing open)
  pdf.line(x + 3, y + height - 1, x + width - 3, y + 2);

  // Label
  pdf.setFontSize(5);
  pdf.text(label, x + width / 2, y - 1, { align: 'center' });

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x, y: y + height / 2, type: 'input' },
      { x: x + width, y: y + height / 2, type: 'output' }
    ],
    label
  };
}

// ============================================================================
// NORMALLY CLOSED CONTACT - IEEE 315
// ============================================================================

/**
 * Draw a normally closed (NC) contact
 * IEEE 315 standard: Two parallel lines with diagonal bar
 */
export function drawNCContact(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string
): DrawnSymbol {
  const width = 12;
  const height = 8;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Left line
  pdf.line(x, y + height / 2, x + 3, y + height / 2);
  pdf.line(x + 3, y + 1, x + 3, y + height - 1);

  // Right line
  pdf.line(x + width - 3, y + 1, x + width - 3, y + height - 1);
  pdf.line(x + width - 3, y + height / 2, x + width, y + height / 2);

  // Closed contact (horizontal line)
  pdf.line(x + 3, y + height / 2, x + width - 3, y + height / 2);

  // NC indicator diagonal
  pdf.line(x + width / 2 - 2, y + 1, x + width / 2 + 2, y + height - 1);

  // Label
  pdf.setFontSize(5);
  pdf.text(label, x + width / 2, y - 1, { align: 'center' });

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x, y: y + height / 2, type: 'input' },
      { x: x + width, y: y + height / 2, type: 'output' }
    ],
    label
  };
}

// ============================================================================
// OVERLOAD RELAY - IEEE 315
// ============================================================================

/**
 * Draw a thermal overload relay symbol
 * IEEE 315 standard: Rectangle with zigzag heater element
 */
export function drawOverloadRelay(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  rating?: string
): DrawnSymbol {
  const width = 14;
  const height = 18;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Main rectangle
  pdf.rect(x, y, width, height, 'S');

  // Zigzag heater element
  const zigzagY = y + 4;
  const zigzagHeight = 10;
  const segments = 4;
  const segmentHeight = zigzagHeight / segments;

  for (let i = 0; i < segments; i++) {
    const startY = zigzagY + i * segmentHeight;
    const endY = startY + segmentHeight;
    if (i % 2 === 0) {
      pdf.line(x + 3, startY, x + width - 3, endY);
    } else {
      pdf.line(x + width - 3, startY, x + 3, endY);
    }
  }

  // Connection points
  pdf.circle(x + width / 2, y - 1, 1, 'F');
  pdf.circle(x + width / 2, y + height + 1, 1, 'F');

  // Label
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, x + width / 2, y + height + 4, { align: 'center' });

  if (rating) {
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'normal');
    pdf.text(rating, x + width / 2, y + height + 7, { align: 'center' });
  }

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x + width / 2, y: y - 1, type: 'input' },
      { x: x + width / 2, y: y + height + 1, type: 'output' }
    ],
    label
  };
}

// ============================================================================
// MOTOR - IEEE 315
// ============================================================================

/**
 * Draw a motor symbol
 * IEEE 315 standard: Circle with M
 */
export function drawMotor(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  power?: string
): DrawnSymbol {
  const diameter = 14;
  const radius = diameter / 2;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Main circle
  pdf.circle(x + radius, y + radius, radius, 'S');

  // M letter inside
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('M', x + radius, y + radius + 2, { align: 'center' });

  // Three connection points for 3-phase (top)
  const spacing = 3;
  pdf.circle(x + radius - spacing, y - 1, 1, 'F');
  pdf.circle(x + radius, y - 1, 1, 'F');
  pdf.circle(x + radius + spacing, y - 1, 1, 'F');

  // Label below
  pdf.setFontSize(5);
  pdf.text(label, x + radius, y + diameter + 3, { align: 'center' });

  if (power) {
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'normal');
    pdf.text(power, x + radius, y + diameter + 6, { align: 'center' });
  }

  return {
    bounds: { x, y, width: diameter, height: diameter },
    connections: [
      { x: x + radius - spacing, y: y - 1, type: 'input' },
      { x: x + radius, y: y - 1, type: 'input' },
      { x: x + radius + spacing, y: y - 1, type: 'input' }
    ],
    label
  };
}

// ============================================================================
// TRANSFORMER - IEEE 315
// ============================================================================

/**
 * Draw a transformer symbol
 * IEEE 315 standard: Two coils with core lines
 */
export function drawTransformer(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  voltages?: { primary: string; secondary: string }
): DrawnSymbol {
  const width = 20;
  const height = 24;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Primary winding (left coil - semicircles drawn as bumps)
  const coilRadius = 3;
  const coilCount = 3;
  const coilSpacing = height / (coilCount + 1);

  // Helper to draw a semicircle using line segments (jsPDF doesn't have arc)
  const drawSemicircle = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const segments = 12;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const step = (endRad - startRad) / segments;

    for (let j = 0; j < segments; j++) {
      const a1 = startRad + j * step;
      const a2 = startRad + (j + 1) * step;
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const x2 = cx + r * Math.cos(a2);
      const y2 = cy + r * Math.sin(a2);
      pdf.line(x1, y1, x2, y2);
    }
  };

  for (let i = 1; i <= coilCount; i++) {
    const cy = y + i * coilSpacing;
    // Draw left semicircle (facing left, 90 to 270 degrees)
    drawSemicircle(x + 5, cy, coilRadius, 90, 270);
  }

  // Core lines (two vertical lines in middle)
  pdf.line(x + width / 2 - 1, y + 2, x + width / 2 - 1, y + height - 2);
  pdf.line(x + width / 2 + 1, y + 2, x + width / 2 + 1, y + height - 2);

  // Secondary winding (right coil - semicircles facing right)
  for (let i = 1; i <= coilCount; i++) {
    const cy = y + i * coilSpacing;
    // Draw right semicircle (facing right, 270 to 450 degrees = 270 to 90)
    drawSemicircle(x + width - 5, cy, coilRadius, -90, 90);
  }

  // Connection points
  pdf.circle(x, y + 3, 1, 'F');
  pdf.circle(x, y + height - 3, 1, 'F');
  pdf.circle(x + width, y + 3, 1, 'F');
  pdf.circle(x + width, y + height - 3, 1, 'F');

  // Label
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, x + width / 2, y + height + 3, { align: 'center' });

  // Voltage labels
  if (voltages) {
    pdf.setFontSize(4);
    pdf.setFont('helvetica', 'normal');
    pdf.text(voltages.primary, x + 2, y - 2, { align: 'center' });
    pdf.text(voltages.secondary, x + width - 2, y - 2, { align: 'center' });
  }

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x, y: y + 3, type: 'input' },
      { x: x, y: y + height - 3, type: 'input' },
      { x: x + width, y: y + 3, type: 'output' },
      { x: x + width, y: y + height - 3, type: 'output' }
    ],
    label
  };
}

// ============================================================================
// EMERGENCY STOP - IEC 60417
// ============================================================================

/**
 * Draw an emergency stop button symbol
 * IEC 60417 standard: Mushroom head with red color
 */
export function drawEmergencyStop(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string
): DrawnSymbol {
  const width = 16;
  const height = 14;

  // Red mushroom head
  setColor(pdf, COLORS.RED);
  setLineWidth(pdf, 0.3);
  pdf.circle(x + width / 2, y + 5, 6, 'FD');

  // Yellow background ring
  setColor(pdf, COLORS.YELLOW);
  pdf.setLineWidth(2);
  pdf.circle(x + width / 2, y + 5, 7, 'S');

  // Black outline
  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);
  pdf.circle(x + width / 2, y + 5, 7, 'S');

  // X symbol inside
  setColor(pdf, COLORS.WHITE);
  setLineWidth(pdf, 0.5);
  pdf.line(x + width / 2 - 3, y + 2, x + width / 2 + 3, y + 8);
  pdf.line(x + width / 2 + 3, y + 2, x + width / 2 - 3, y + 8);

  // Connection points
  setColor(pdf, COLORS.BLACK);
  pdf.circle(x + width / 2, y + height, 1, 'F');

  // Label
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, x + width / 2, y + height + 4, { align: 'center' });
  pdf.setFontSize(4);
  pdf.text('E-STOP', x + width / 2, y + height + 7, { align: 'center' });

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x + width / 2, y: y + height, type: 'output' }
    ],
    label
  };
}

// ============================================================================
// PUSH BUTTON NO - IEEE 315
// ============================================================================

/**
 * Draw a normally open push button
 */
export function drawPushButtonNO(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  color?: string
): DrawnSymbol {
  const width = 12;
  const height = 14;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Button actuator (circle on top)
  const buttonColor = color === 'green' ? COLORS.GREEN :
                      color === 'red' ? COLORS.RED : COLORS.BLACK;
  setColor(pdf, buttonColor);
  pdf.circle(x + width / 2, y + 3, 3, 'FD');

  setColor(pdf, COLORS.BLACK);

  // Stem
  pdf.line(x + width / 2, y + 6, x + width / 2, y + 9);

  // NO contact (gap)
  pdf.line(x + 2, y + 9, x + width / 2 - 1, y + 9);
  pdf.line(x + width / 2 + 1, y + 9, x + width - 2, y + 9);

  // Connection points
  pdf.circle(x + 2, y + height, 1, 'F');
  pdf.circle(x + width - 2, y + height, 1, 'F');

  // Label
  pdf.setFontSize(5);
  pdf.text(label, x + width / 2, y - 1, { align: 'center' });

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x + 2, y: y + height, type: 'bidirectional' },
      { x: x + width - 2, y: y + height, type: 'bidirectional' }
    ],
    label
  };
}

// ============================================================================
// PUSH BUTTON NC - IEEE 315
// ============================================================================

/**
 * Draw a normally closed push button
 */
export function drawPushButtonNC(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  color?: string
): DrawnSymbol {
  const width = 12;
  const height = 14;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Button actuator (circle on top)
  const buttonColor = color === 'red' ? COLORS.RED : COLORS.BLACK;
  setColor(pdf, buttonColor);
  pdf.circle(x + width / 2, y + 3, 3, 'FD');

  setColor(pdf, COLORS.BLACK);

  // Stem
  pdf.line(x + width / 2, y + 6, x + width / 2, y + 9);

  // NC contact (connected)
  pdf.line(x + 2, y + 9, x + width - 2, y + 9);

  // NC indicator (diagonal line)
  pdf.line(x + width / 2 - 2, y + 7, x + width / 2 + 2, y + 11);

  // Connection points
  pdf.circle(x + 2, y + height, 1, 'F');
  pdf.circle(x + width - 2, y + height, 1, 'F');

  // Label
  pdf.setFontSize(5);
  pdf.text(label, x + width / 2, y - 1, { align: 'center' });

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x + 2, y: y + height, type: 'bidirectional' },
      { x: x + width - 2, y: y + height, type: 'bidirectional' }
    ],
    label
  };
}

// ============================================================================
// INDICATOR LIGHT - IEEE 315
// ============================================================================

/**
 * Draw an indicator/pilot light symbol
 */
export function drawIndicatorLight(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  color: 'red' | 'green' | 'yellow' | 'white' | 'blue' = 'green'
): DrawnSymbol {
  const diameter = 10;
  const radius = diameter / 2;

  // Color mapping
  const colorMap: Record<string, { r: number; g: number; b: number }> = {
    red: COLORS.RED,
    green: COLORS.GREEN,
    yellow: COLORS.YELLOW,
    white: COLORS.WHITE,
    blue: COLORS.BLUE,
  };

  const fillColor = colorMap[color] || COLORS.GREEN;

  setColor(pdf, fillColor);
  setLineWidth(pdf, 0.3);
  pdf.circle(x + radius, y + radius, radius, 'FD');

  // Black outline
  setColor(pdf, COLORS.BLACK);
  pdf.circle(x + radius, y + radius, radius, 'S');

  // Light rays (cross inside)
  setLineWidth(pdf, 0.2);
  pdf.line(x + radius - 2, y + radius, x + radius + 2, y + radius);
  pdf.line(x + radius, y + radius - 2, x + radius, y + radius + 2);

  // Connection points
  pdf.circle(x + radius, y + diameter + 1, 1, 'F');

  // Label
  pdf.setFontSize(5);
  pdf.text(label, x + radius, y + diameter + 5, { align: 'center' });

  return {
    bounds: { x, y, width: diameter, height: diameter },
    connections: [
      { x: x + radius, y: y + diameter + 1, type: 'input' }
    ],
    label
  };
}

// ============================================================================
// GROUND SYMBOL - IEEE 315
// ============================================================================

/**
 * Draw a ground/earth symbol
 */
export function drawGround(
  pdf: jsPDF,
  x: number,
  y: number
): DrawnSymbol {
  const width = 12;
  const height = 10;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Vertical stem
  pdf.line(x + width / 2, y, x + width / 2, y + 3);

  // Three horizontal lines (decreasing size)
  pdf.line(x, y + 3, x + width, y + 3);
  pdf.line(x + 2, y + 5, x + width - 2, y + 5);
  pdf.line(x + 4, y + 7, x + width - 4, y + 7);

  // Connection point at top
  pdf.circle(x + width / 2, y - 1, 1, 'F');

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x + width / 2, y: y - 1, type: 'input' }
    ],
    label: 'PE'
  };
}

// ============================================================================
// TERMINAL BLOCK - IEEE 315
// ============================================================================

/**
 * Draw a terminal block with multiple terminals
 */
export function drawTerminalBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  terminals: Array<{ number: string; label?: string }>,
  title?: string
): DrawnSymbol {
  const terminalWidth = 12;
  const terminalHeight = 8;
  const spacing = 2;
  const totalHeight = terminals.length * (terminalHeight + spacing);

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Title
  if (title) {
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, x + terminalWidth / 2, y - 3, { align: 'center' });
  }

  const connections: ConnectionPoint[] = [];

  terminals.forEach((terminal, index) => {
    const ty = y + index * (terminalHeight + spacing);

    // Terminal rectangle
    pdf.rect(x, ty, terminalWidth, terminalHeight, 'S');

    // Terminal number
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(terminal.number, x + terminalWidth / 2, ty + terminalHeight / 2 + 1.5, { align: 'center' });

    // Label if provided
    if (terminal.label) {
      pdf.setFontSize(4);
      pdf.setFont('helvetica', 'normal');
      pdf.text(terminal.label, x + terminalWidth + 2, ty + terminalHeight / 2 + 1, { align: 'left' });
    }

    // Connection points on both sides
    connections.push(
      { x: x - 1, y: ty + terminalHeight / 2, type: 'bidirectional' },
      { x: x + terminalWidth + 1, y: ty + terminalHeight / 2, type: 'bidirectional' }
    );
  });

  return {
    bounds: { x, y, width: terminalWidth, height: totalHeight },
    connections,
    label: title || 'TB'
  };
}

// ============================================================================
// DISCONNECT SWITCH - IEEE 315
// ============================================================================

/**
 * Draw a disconnect/isolator switch symbol
 */
export function drawDisconnectSwitch(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string
): DrawnSymbol {
  const width = 10;
  const height = 18;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Fixed contact (bottom)
  pdf.circle(x + width / 2, y + height - 3, 1.5, 'S');
  pdf.line(x + width / 2, y + height - 1.5, x + width / 2, y + height + 2);

  // Moving contact (diagonal blade)
  pdf.line(x + width / 2, y + height - 3, x + width / 2 + 4, y + 4);

  // Fixed contact (top)
  pdf.circle(x + width / 2, y + 3, 1.5, 'S');
  pdf.line(x + width / 2, y + 1.5, x + width / 2, y - 2);

  // Connection points
  pdf.circle(x + width / 2, y - 2, 1, 'F');
  pdf.circle(x + width / 2, y + height + 2, 1, 'F');

  // Label
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(label, x + width / 2, y + height + 6, { align: 'center' });

  return {
    bounds: { x, y, width, height },
    connections: [
      { x: x + width / 2, y: y - 2, type: 'input' },
      { x: x + width / 2, y: y + height + 2, type: 'output' }
    ],
    label
  };
}

// ============================================================================
// SOLENOID VALVE - IEEE 315
// ============================================================================

/**
 * Draw a solenoid valve symbol
 */
export function drawSolenoidValve(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string
): DrawnSymbol {
  const width = 16;
  const height = 12;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Valve body (bowtie shape)
  pdf.triangle(x, y + height / 2, x + width / 2, y, x + width / 2, y + height, 'S');
  pdf.triangle(x + width, y + height / 2, x + width / 2, y, x + width / 2, y + height, 'S');

  // Solenoid coil (rectangle on top)
  pdf.rect(x + width / 2 - 4, y - 6, 8, 5, 'S');
  pdf.line(x + width / 2, y - 1, x + width / 2, y);

  // Connection points
  pdf.circle(x - 1, y + height / 2, 1, 'F');
  pdf.circle(x + width + 1, y + height / 2, 1, 'F');
  pdf.circle(x + width / 2, y - 7, 1, 'F');

  // Label
  pdf.setFontSize(5);
  pdf.text(label, x + width / 2, y + height + 3, { align: 'center' });

  return {
    bounds: { x, y: y - 6, width, height: height + 6 },
    connections: [
      { x: x - 1, y: y + height / 2, type: 'bidirectional' },
      { x: x + width + 1, y: y + height / 2, type: 'bidirectional' },
      { x: x + width / 2, y: y - 7, type: 'input' }
    ],
    label
  };
}

// ============================================================================
// WIRE / CONNECTION LINE
// ============================================================================

/**
 * Draw a wire/connection line
 */
export function drawWire(
  pdf: jsPDF,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  wireNumber?: string,
  dashed: boolean = false
): void {
  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  if (dashed) {
    // Dashed line for signal/control wires
    const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const dashLength = 2;
    const gapLength = 1;
    const segments = Math.floor(length / (dashLength + gapLength));

    const dx = (x2 - x1) / length;
    const dy = (y2 - y1) / length;

    for (let i = 0; i < segments; i++) {
      const startX = x1 + i * (dashLength + gapLength) * dx;
      const startY = y1 + i * (dashLength + gapLength) * dy;
      const endX = startX + dashLength * dx;
      const endY = startY + dashLength * dy;
      pdf.line(startX, startY, endX, endY);
    }
  } else {
    pdf.line(x1, y1, x2, y2);
  }

  // Wire number label at midpoint
  if (wireNumber) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Small white background for readability
    setColor(pdf, COLORS.WHITE);
    pdf.rect(midX - 3, midY - 2, 6, 4, 'F');

    setColor(pdf, COLORS.BLACK);
    pdf.setFontSize(4);
    pdf.text(wireNumber, midX, midY + 1, { align: 'center' });
  }
}

// ============================================================================
// JUNCTION / NODE
// ============================================================================

/**
 * Draw a wire junction/node (filled circle)
 */
export function drawJunction(
  pdf: jsPDF,
  x: number,
  y: number
): void {
  setColor(pdf, COLORS.BLACK);
  pdf.circle(x, y, 1, 'F');
}

// ============================================================================
// PLC BLOCK
// ============================================================================

/**
 * Draw a PLC block with I/O terminals
 */
export function drawPLCBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  model: string,
  inputs: Array<{ address: string; symbol?: string }>,
  outputs: Array<{ address: string; symbol?: string }>
): DrawnSymbol {
  const width = 50;
  const terminalSpacing = 8;
  const maxTerminals = Math.max(inputs.length, outputs.length);
  const height = Math.max(60, maxTerminals * terminalSpacing + 20);

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.4);

  // Main PLC body
  pdf.rect(x, y, width, height, 'S');

  // Header
  setColor(pdf, COLORS.GRAY);
  pdf.rect(x, y, width, 10, 'F');

  setColor(pdf, COLORS.BLACK);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PLC', x + width / 2, y + 4, { align: 'center' });
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(model, x + width / 2, y + 8, { align: 'center' });

  const connections: ConnectionPoint[] = [];

  // Draw input terminals (left side)
  pdf.setFontSize(4);
  inputs.forEach((input, index) => {
    const ty = y + 15 + index * terminalSpacing;

    // Terminal point
    pdf.circle(x, ty, 1, 'F');

    // Address label
    pdf.text(input.address, x + 2, ty + 1, { align: 'left' });

    // Symbol if provided
    if (input.symbol) {
      pdf.setFont('helvetica', 'italic');
      pdf.text(input.symbol, x + 15, ty + 1, { align: 'left' });
      pdf.setFont('helvetica', 'normal');
    }

    connections.push({ x: x - 1, y: ty, type: 'input' });
  });

  // Draw output terminals (right side)
  outputs.forEach((output, index) => {
    const ty = y + 15 + index * terminalSpacing;

    // Terminal point
    pdf.circle(x + width, ty, 1, 'F');

    // Address label
    pdf.text(output.address, x + width - 2, ty + 1, { align: 'right' });

    // Symbol if provided
    if (output.symbol) {
      pdf.setFont('helvetica', 'italic');
      pdf.text(output.symbol, x + width - 15, ty + 1, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
    }

    connections.push({ x: x + width + 1, y: ty, type: 'output' });
  });

  return {
    bounds: { x, y, width, height },
    connections,
    label: model
  };
}

// ============================================================================
// LEGEND DRAWING
// ============================================================================

/**
 * Draw a complete legend with all symbols used
 */
export function drawLegend(
  pdf: jsPDF,
  x: number,
  y: number,
  symbols: Array<{ name: string; description: string; type: string }>
): void {
  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.3);

  // Legend border
  const width = 80;
  const rowHeight = 12;
  const height = symbols.length * rowHeight + 10;

  pdf.rect(x, y, width, height, 'S');

  // Title
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('LEGEND', x + width / 2, y + 5, { align: 'center' });

  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');

  symbols.forEach((symbol, index) => {
    const rowY = y + 10 + index * rowHeight;

    // Draw mini symbol based on type
    const symbolX = x + 5;
    const symbolY = rowY + 2;

    switch (symbol.type) {
      case 'circuit-breaker':
        pdf.rect(symbolX, symbolY, 5, 8, 'S');
        pdf.line(symbolX + 1, symbolY + 6, symbolX + 4, symbolY + 2);
        break;
      case 'fuse':
        pdf.rect(symbolX, symbolY, 4, 8, 'S');
        pdf.line(symbolX + 1, symbolY + 2, symbolX + 3, symbolY + 6);
        break;
      case 'contactor':
        pdf.rect(symbolX, symbolY + 2, 6, 4, 'S');
        break;
      case 'motor':
        pdf.circle(symbolX + 4, symbolY + 4, 4, 'S');
        pdf.text('M', symbolX + 4, symbolY + 5, { align: 'center' });
        break;
      case 'overload':
        pdf.rect(symbolX, symbolY, 5, 8, 'S');
        // Zigzag
        pdf.line(symbolX + 1, symbolY + 2, symbolX + 4, symbolY + 4);
        pdf.line(symbolX + 4, symbolY + 4, symbolX + 1, symbolY + 6);
        break;
      default:
        pdf.rect(symbolX, symbolY + 2, 6, 4, 'S');
    }

    // Symbol name and description
    pdf.setFont('helvetica', 'bold');
    pdf.text(symbol.name, x + 18, rowY + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.text('- ' + symbol.description, x + 35, rowY + 6);
  });
}

// ============================================================================
// TITLE BLOCK
// ============================================================================

/**
 * Draw a standard title block
 */
export function drawTitleBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  info: {
    title: string;
    projectName: string;
    drawingNumber: string;
    revision: string;
    date: string;
    drawnBy: string;
    sheet: string;
  }
): void {
  const width = 100;
  const height = 30;

  setColor(pdf, COLORS.BLACK);
  setLineWidth(pdf, 0.4);

  // Main border
  pdf.rect(x, y, width, height, 'S');

  // Vertical dividers
  pdf.line(x + 60, y, x + 60, y + height);
  pdf.line(x + 80, y, x + 80, y + height);

  // Horizontal dividers
  pdf.line(x, y + 10, x + width, y + 10);
  pdf.line(x, y + 20, x + 60, y + 20);
  pdf.line(x + 60, y + 15, x + width, y + 15);
  pdf.line(x + 60, y + 22.5, x + width, y + 22.5);

  // Labels and values
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(info.title, x + 30, y + 7, { align: 'center' });

  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'normal');

  // Project name
  pdf.text('PROJECT:', x + 2, y + 15);
  pdf.text(info.projectName, x + 2, y + 19);

  // Drawing number
  pdf.text('DWG NO:', x + 62, y + 5);
  pdf.text(info.drawingNumber, x + 62, y + 9);

  // Revision
  pdf.text('REV:', x + 82, y + 5);
  pdf.text(info.revision, x + 82, y + 9);

  // Date
  pdf.text('DATE:', x + 62, y + 14);
  pdf.text(info.date, x + 62, y + 18);

  // Drawn by
  pdf.text('BY:', x + 82, y + 14);
  pdf.text(info.drawnBy, x + 82, y + 18);

  // Sheet
  pdf.text('SHEET:', x + 62, y + 21.5);
  pdf.text(info.sheet, x + 62, y + 26);

  // Scale
  pdf.text('SCALE:', x + 82, y + 21.5);
  pdf.text('NTS', x + 82, y + 26);
}
