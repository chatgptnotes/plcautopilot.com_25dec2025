/**
 * PDF Document Generator for M221 PLC Programs
 * Generates professional documentation from .smbp ladder logic files
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Variable {
  address: string;
  symbol: string;
  type: string;
  comment?: string;
}

interface Rung {
  name: string;
  comment?: string;
  elements: string[];
  instructions: string[];
}

interface PLCProgramData {
  projectName: string;
  plcModel: string;
  manufacturer: string;
  author?: string;
  createdDate: string;
  description?: string;
  variables: Variable[];
  rungs: Rung[];
  timers?: { address: string; preset: string; base: string }[];
  counters?: { address: string; preset: string }[];
}

/**
 * Parse SMBP XML content and extract program data
 */
export function parseSMBPContent(xmlContent: string): PLCProgramData {
  const variables: Variable[] = [];
  const rungs: Rung[] = [];
  const timers: { address: string; preset: string; base: string }[] = [];
  const counters: { address: string; preset: string }[] = [];

  // Extract project name
  const projectNameMatch = xmlContent.match(/<ProjectName>([^<]+)<\/ProjectName>/);
  const projectName = projectNameMatch ? projectNameMatch[1] : 'Untitled Project';

  // Extract PLC model
  const plcModelMatch = xmlContent.match(/<Reference>([^<]+)<\/Reference>/);
  const plcModel = plcModelMatch ? plcModelMatch[1] : 'Unknown';

  // Extract variables (Digital Inputs)
  const diRegex = /<DigitalIO>\s*<Address>([^<]+)<\/Address>[\s\S]*?<Symbol>([^<]*)<\/Symbol>[\s\S]*?<Comment>([^<]*)<\/Comment>[\s\S]*?<\/DigitalIO>/g;
  let diMatch;
  while ((diMatch = diRegex.exec(xmlContent)) !== null) {
    variables.push({
      address: diMatch[1],
      symbol: diMatch[2] || diMatch[1],
      type: diMatch[1].includes('%I') ? 'Digital Input' : diMatch[1].includes('%Q') ? 'Digital Output' : 'Digital I/O',
      comment: diMatch[3] || ''
    });
  }

  // Extract memory variables
  const memRegex = /<SimpleVar>\s*<Address>([^<]+)<\/Address>[\s\S]*?<Symbol>([^<]*)<\/Symbol>[\s\S]*?<Comment>([^<]*)<\/Comment>[\s\S]*?<\/SimpleVar>/g;
  let memMatch;
  while ((memMatch = memRegex.exec(xmlContent)) !== null) {
    const addr = memMatch[1];
    let type = 'Memory';
    if (addr.includes('%M')) type = 'Memory Bit';
    else if (addr.includes('%MW')) type = 'Memory Word';
    else if (addr.includes('%MF')) type = 'Memory Float';

    variables.push({
      address: addr,
      symbol: memMatch[2] || addr,
      type: type,
      comment: memMatch[3] || ''
    });
  }

  // Extract timers
  const timerRegex = /<TimerTM>\s*<Address>([^<]+)<\/Address>[\s\S]*?<Preset>([^<]+)<\/Preset>[\s\S]*?<Base>([^<]+)<\/Base>[\s\S]*?<\/TimerTM>/g;
  let timerMatch;
  while ((timerMatch = timerRegex.exec(xmlContent)) !== null) {
    timers.push({
      address: timerMatch[1],
      preset: timerMatch[2],
      base: timerMatch[3]
    });
  }

  // Extract rungs
  const rungRegex = /<RungEntity>[\s\S]*?<Name>([^<]*)<\/Name>[\s\S]*?<MainComment>([^<]*)<\/MainComment>[\s\S]*?<InstructionLines>([\s\S]*?)<\/InstructionLines>[\s\S]*?<\/RungEntity>/g;
  let rungMatch;
  while ((rungMatch = rungRegex.exec(xmlContent)) !== null) {
    const instructions: string[] = [];
    const instrRegex = /<InstructionLine>([^<]+)<\/InstructionLine>/g;
    let instrMatch;
    while ((instrMatch = instrRegex.exec(rungMatch[3])) !== null) {
      instructions.push(instrMatch[1]);
    }

    rungs.push({
      name: rungMatch[1] || 'Unnamed Rung',
      comment: rungMatch[2] || '',
      elements: [],
      instructions: instructions
    });
  }

  return {
    projectName,
    plcModel,
    manufacturer: 'Schneider Electric',
    createdDate: new Date().toISOString().split('T')[0],
    variables,
    rungs,
    timers,
    counters
  };
}

/**
 * Generate PDF document from PLC program data
 */
export function generatePLCDocumentPDF(data: PLCProgramData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Helper function to add page if needed
  const checkPageBreak = (height: number) => {
    if (yPos + height > 280) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PLC Program Documentation', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Project Info Box
  doc.setFillColor(240, 240, 240);
  doc.rect(14, yPos, pageWidth - 28, 45, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(14, yPos, pageWidth - 28, 45, 'S');

  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Name:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.projectName, 60, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('PLC Model:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.plcModel, 60, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Manufacturer:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.manufacturer, 60, yPos);

  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Generated:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(data.createdDate, 60, yPos);

  yPos += 20;

  // I/O Summary Section
  checkPageBreak(40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('I/O Summary', 14, yPos);
  yPos += 2;
  doc.setDrawColor(0, 100, 200);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, 80, yPos);
  yPos += 10;

  // Count I/O types
  const diCount = data.variables.filter(v => v.type === 'Digital Input').length;
  const doCount = data.variables.filter(v => v.type === 'Digital Output').length;
  const memCount = data.variables.filter(v => v.type.includes('Memory')).length;
  const timerCount = data.timers?.length || 0;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Digital Inputs: ${diCount}    Digital Outputs: ${doCount}    Memory Bits: ${memCount}    Timers: ${timerCount}`, 14, yPos);
  yPos += 15;

  // Variables Table
  if (data.variables.length > 0) {
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Variable List', 14, yPos);
    yPos += 2;
    doc.setDrawColor(0, 100, 200);
    doc.line(14, yPos, 70, yPos);
    yPos += 5;

    const varTableData = data.variables.map(v => [
      v.address,
      v.symbol,
      v.type,
      v.comment || ''
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Type', 'Comment']],
      body: varTableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 100, 200], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 40 },
        2: { cellWidth: 35 },
        3: { cellWidth: 'auto' }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Timers Table
  if (data.timers && data.timers.length > 0) {
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Timer Configuration', 14, yPos);
    yPos += 2;
    doc.setDrawColor(0, 100, 200);
    doc.line(14, yPos, 85, yPos);
    yPos += 5;

    const timerTableData = data.timers.map(t => [
      t.address,
      t.preset,
      t.base,
      `${t.preset} ${t.base === 'OneSecond' ? 'seconds' : t.base === 'HundredMs' ? 'x100ms' : t.base}`
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Address', 'Preset', 'Time Base', 'Duration']],
      body: timerTableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 150, 100], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Ladder Logic Section
  if (data.rungs.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ladder Logic - Rung Descriptions', 14, yPos);
    yPos += 2;
    doc.setDrawColor(0, 100, 200);
    doc.line(14, yPos, 120, yPos);
    yPos += 10;

    data.rungs.forEach((rung, index) => {
      checkPageBreak(40);

      // Rung header
      doc.setFillColor(230, 240, 250);
      doc.rect(14, yPos - 5, pageWidth - 28, 12, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Rung ${index + 1}: ${rung.name}`, 16, yPos + 2);
      yPos += 12;

      // Rung comment
      if (rung.comment) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        const commentLines = doc.splitTextToSize(rung.comment, pageWidth - 40);
        doc.text(commentLines, 20, yPos);
        yPos += commentLines.length * 5 + 3;
        doc.setTextColor(0, 0, 0);
      }

      // Instruction list
      if (rung.instructions.length > 0) {
        doc.setFontSize(9);
        doc.setFont('courier', 'normal');
        doc.setTextColor(50, 50, 50);

        const instrText = rung.instructions.join('  |  ');
        const instrLines = doc.splitTextToSize(instrText, pageWidth - 40);
        doc.text(instrLines, 20, yPos);
        yPos += instrLines.length * 4 + 8;
        doc.setTextColor(0, 0, 0);
      }

      yPos += 5;
    });
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by PLCAutoPilot | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
    doc.text(
      `github.com/chatgptnotes/plcautopilot.com`,
      pageWidth / 2,
      295,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Generate PDF from SMBP content string
 */
export function generatePDFFromSMBP(smbpContent: string, projectName?: string): Blob {
  const programData = parseSMBPContent(smbpContent);
  if (projectName) {
    programData.projectName = projectName;
  }

  const doc = generatePLCDocumentPDF(programData);
  return doc.output('blob');
}

/**
 * Generate PDF and trigger download
 */
export function downloadPDFDocument(smbpContent: string, filename: string): void {
  const programData = parseSMBPContent(smbpContent);
  programData.projectName = filename.replace('.smbp', '');

  const doc = generatePLCDocumentPDF(programData);
  doc.save(`${programData.projectName}_Documentation.pdf`);
}
