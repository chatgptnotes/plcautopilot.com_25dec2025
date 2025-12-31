/**
 * PDF Document Generator for M221 PLC Programs
 * Generates professional documentation from .smbp ladder logic files
 * Uses AI for comprehensive analysis
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateSingleLineDiagram } from './diagram-generator';

// Types for AI-generated documentation
interface IOEntry {
  address: string;
  symbol: string;
  comment?: string;
  used?: boolean;
  range?: string;
}

interface TimerEntry {
  address: string;
  symbol?: string;
  preset: string;
  timeBase: string;
  comment?: string;
}

interface CounterEntry {
  address: string;
  symbol?: string;
  preset: string;
  comment?: string;
}

interface RungEntry {
  number: number;
  name: string;
  comment?: string;
  logic?: string;
  safetyNotes?: string;
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
  analogOutputs: IOEntry[];
  memoryBits: IOEntry[];
  memoryWords: IOEntry[];
  memoryFloats: IOEntry[];
  timers: TimerEntry[];
  counters: CounterEntry[];
  rungs: RungEntry[];
  safetyFeatures?: string[];
  operationalNotes?: string[];
}

/**
 * Generate PDF using AI-analyzed documentation
 */
export function generatePDFFromAIDocumentation(doc: AIDocumentation): jsPDF {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPos = 20;

  // Helper function to add page if needed
  const checkPageBreak = (height: number) => {
    if (yPos + height > 280) {
      pdf.addPage();
      yPos = 20;
    }
  };

  // Title
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PLC Program Documentation', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Project Info Box
  pdf.setFillColor(240, 248, 255);
  pdf.rect(14, yPos, pageWidth - 28, 48, 'F');
  pdf.setDrawColor(70, 130, 180);
  pdf.setLineWidth(0.5);
  pdf.rect(14, yPos, pageWidth - 28, 48, 'S');

  yPos += 10;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Project Name:', 20, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doc.projectInfo.projectName || 'Untitled', 65, yPos);

  yPos += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.text('PLC Model:', 20, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doc.projectInfo.plcModel || 'M221', 65, yPos);

  yPos += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Author:', 20, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doc.projectInfo.author || 'PLCAutoPilot', 65, yPos);

  yPos += 7;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Generated:', 20, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.text(doc.projectInfo.createdDate || new Date().toISOString().split('T')[0], 65, yPos);

  yPos += 7;
  if (doc.projectInfo.description) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    const descLines = pdf.splitTextToSize(doc.projectInfo.description, pageWidth - 85);
    pdf.text(descLines, 65, yPos);
    yPos += descLines.length * 5;
  }

  yPos += 18;

  // I/O Summary
  checkPageBreak(30);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 80, 150);
  pdf.text('I/O Summary', 14, yPos);
  pdf.setTextColor(0, 0, 0);
  yPos += 2;
  pdf.setDrawColor(0, 100, 200);
  pdf.setLineWidth(0.8);
  pdf.line(14, yPos, 70, yPos);
  yPos += 8;

  const usedDI = doc.digitalInputs.filter(i => i.used !== false && i.symbol).length;
  const usedDO = doc.digitalOutputs.filter(i => i.used !== false && i.symbol).length;
  const usedAI = doc.analogInputs.filter(i => i.used !== false && i.symbol).length;
  const usedAO = doc.analogOutputs?.filter(i => i.used !== false && i.symbol).length || 0;
  const usedMB = doc.memoryBits.filter(i => i.used !== false && i.symbol).length;
  const usedMW = doc.memoryWords.filter(i => i.used !== false && i.symbol).length;
  const usedMF = doc.memoryFloats?.filter(i => i.used !== false && i.symbol).length || 0;
  const timerCount = doc.timers.length;
  const counterCount = doc.counters?.length || 0;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Digital Inputs: ${usedDI}   Digital Outputs: ${usedDO}   Analog Inputs: ${usedAI}   Analog Outputs: ${usedAO}`, 14, yPos);
  yPos += 6;
  pdf.text(`Memory Bits: ${usedMB}   Memory Words: ${usedMW}   Memory Floats: ${usedMF}   Timers: ${timerCount}   Counters: ${counterCount}`, 14, yPos);
  yPos += 12;

  // Digital Inputs Table
  const usedDigitalInputs = doc.digitalInputs.filter(i => i.used !== false && i.symbol);
  if (usedDigitalInputs.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 100, 50);
    pdf.text('Digital Inputs', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(pdf, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Description']],
      body: usedDigitalInputs.map(i => [i.address, i.symbol, i.comment || '']),
      theme: 'striped',
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' } }
    });
    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Digital Outputs Table
  const usedDigitalOutputs = doc.digitalOutputs.filter(i => i.used !== false && i.symbol);
  if (usedDigitalOutputs.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(200, 100, 0);
    pdf.text('Digital Outputs', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(pdf, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Description']],
      body: usedDigitalOutputs.map(i => [i.address, i.symbol, i.comment || '']),
      theme: 'striped',
      headStyles: { fillColor: [255, 140, 0], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' } }
    });
    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Analog Inputs Table
  const usedAnalogInputs = doc.analogInputs.filter(i => i.used !== false && i.symbol);
  if (usedAnalogInputs.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(128, 0, 128);
    pdf.text('Analog Inputs', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(pdf, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Range', 'Description']],
      body: usedAnalogInputs.map(i => [i.address, i.symbol, i.range || '0-10000', i.comment || '']),
      theme: 'striped',
      headStyles: { fillColor: [128, 0, 128], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: 'auto' } }
    });
    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Analog Outputs Table
  const usedAnalogOutputs = doc.analogOutputs?.filter(i => i.used !== false && i.symbol) || [];
  if (usedAnalogOutputs.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 128, 128);
    pdf.text('Analog Outputs', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(pdf, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Description']],
      body: usedAnalogOutputs.map(i => [i.address, i.symbol, i.comment || '']),
      theme: 'striped',
      headStyles: { fillColor: [0, 128, 128], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' } }
    });
    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Memory Bits Table
  const usedMemoryBits = doc.memoryBits.filter(i => i.used !== false && i.symbol);
  if (usedMemoryBits.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(70, 70, 70);
    pdf.text('Memory Bits (%M)', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(pdf, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Description']],
      body: usedMemoryBits.map(i => [i.address, i.symbol, i.comment || '']),
      theme: 'striped',
      headStyles: { fillColor: [70, 70, 70], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' } }
    });
    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Memory Words Table
  const usedMemoryWords = doc.memoryWords.filter(i => i.used !== false && i.symbol);
  if (usedMemoryWords.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 70, 140);
    pdf.text('Memory Words (%MW)', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(pdf, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Description']],
      body: usedMemoryWords.map(i => [i.address, i.symbol, i.comment || '']),
      theme: 'striped',
      headStyles: { fillColor: [0, 70, 140], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' } }
    });
    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Memory Floats Table
  const usedMemoryFloats = doc.memoryFloats?.filter(i => i.used !== false && i.symbol) || [];
  if (usedMemoryFloats.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(180, 80, 0);
    pdf.text('Memory Floats (%MF)', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(pdf, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Description']],
      body: usedMemoryFloats.map(i => [i.address, i.symbol, i.comment || '']),
      theme: 'striped',
      headStyles: { fillColor: [180, 80, 0], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' } }
    });
    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Timers Table
  if (doc.timers.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 128, 0);
    pdf.text('Timers (%TM)', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(pdf, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Preset', 'Time Base', 'Description']],
      body: doc.timers.map(t => [t.address, t.symbol || '', t.preset, t.timeBase, t.comment || '']),
      theme: 'striped',
      headStyles: { fillColor: [0, 128, 0], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 30 }, 2: { cellWidth: 18 }, 3: { cellWidth: 22 }, 4: { cellWidth: 'auto' } }
    });
    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Counters Table
  if (doc.counters && doc.counters.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 0, 100);
    pdf.text('Counters (%C)', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 5;

    autoTable(pdf, {
      startY: yPos,
      head: [['Address', 'Symbol', 'Preset', 'Description']],
      body: doc.counters.map(c => [c.address, c.symbol || '', c.preset, c.comment || '']),
      theme: 'striped',
      headStyles: { fillColor: [100, 0, 100], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 35 }, 2: { cellWidth: 20 }, 3: { cellWidth: 'auto' } }
    });
    yPos = (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Ladder Logic Rungs
  if (doc.rungs.length > 0) {
    checkPageBreak(30);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 80, 150);
    pdf.text('Ladder Logic - Program Structure', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 2;
    pdf.setDrawColor(0, 100, 200);
    pdf.line(14, yPos, 130, yPos);
    yPos += 10;

    doc.rungs.forEach((rung) => {
      checkPageBreak(35);

      // Rung header
      pdf.setFillColor(230, 240, 250);
      pdf.rect(14, yPos - 5, pageWidth - 28, 12, 'F');
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Rung ${rung.number}: ${rung.name}`, 16, yPos + 2);
      yPos += 12;

      // Comment
      if (rung.comment) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(80, 80, 80);
        const commentLines = pdf.splitTextToSize(rung.comment, pageWidth - 40);
        pdf.text(commentLines, 20, yPos);
        yPos += commentLines.length * 4 + 2;
        pdf.setTextColor(0, 0, 0);
      }

      // Logic description
      if (rung.logic) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const logicLines = pdf.splitTextToSize(`Logic: ${rung.logic}`, pageWidth - 40);
        pdf.text(logicLines, 20, yPos);
        yPos += logicLines.length * 4 + 2;
      }

      // Safety notes
      if (rung.safetyNotes) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(200, 0, 0);
        pdf.text(`Safety: ${rung.safetyNotes}`, 20, yPos);
        pdf.setTextColor(0, 0, 0);
        yPos += 6;
      }

      yPos += 5;
    });
  }

  // Safety Features
  if (doc.safetyFeatures && doc.safetyFeatures.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(200, 0, 0);
    pdf.text('Safety Features', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 6;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    doc.safetyFeatures.forEach(feature => {
      checkPageBreak(8);
      pdf.text(`  - ${feature}`, 16, yPos);
      yPos += 5;
    });
    yPos += 5;
  }

  // Operational Notes
  if (doc.operationalNotes && doc.operationalNotes.length > 0) {
    checkPageBreak(40);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 100, 150);
    pdf.text('Operational Notes', 14, yPos);
    pdf.setTextColor(0, 0, 0);
    yPos += 6;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    doc.operationalNotes.forEach(note => {
      checkPageBreak(8);
      const noteLines = pdf.splitTextToSize(`  - ${note}`, pageWidth - 30);
      pdf.text(noteLines, 16, yPos);
      yPos += noteLines.length * 4 + 2;
    });
  }

  // Generate Single Line Connection Diagram on new page
  generateSingleLineDiagram(pdf, doc);

  // Footer on each page (after diagram is added)
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Generated by PLCAutoPilot (AI-Powered) | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
    pdf.text(
      `github.com/chatgptnotes/plcautopilot.com`,
      pageWidth / 2,
      295,
      { align: 'center' }
    );
  }

  return pdf;
}

/**
 * Fetch AI documentation and generate PDF
 */
export async function generateAIPDFDocument(smbpContent: string, projectName: string): Promise<Blob> {
  // Call the API to get AI-generated documentation
  const response = await fetch('/api/generate-pdf-documentation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ smbpContent, projectName })
  });

  if (!response.ok) {
    throw new Error('Failed to generate AI documentation');
  }

  const data = await response.json();

  if (!data.success || !data.documentation) {
    throw new Error(data.error || 'Invalid documentation response');
  }

  const pdf = generatePDFFromAIDocumentation(data.documentation);
  return pdf.output('blob');
}

/**
 * Download PDF document using AI analysis
 */
export async function downloadAIPDFDocument(smbpContent: string, filename: string): Promise<void> {
  const projectName = filename.replace('.smbp', '');

  // Call the API to get AI-generated documentation
  const response = await fetch('/api/generate-pdf-documentation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ smbpContent, projectName })
  });

  if (!response.ok) {
    throw new Error('Failed to generate AI documentation');
  }

  const data = await response.json();

  if (!data.success || !data.documentation) {
    throw new Error(data.error || 'Invalid documentation response');
  }

  const pdf = generatePDFFromAIDocumentation(data.documentation);
  pdf.save(`${projectName}_Documentation.pdf`);
}

// Keep the old function for backwards compatibility but mark as deprecated
/**
 * @deprecated Use downloadAIPDFDocument instead
 */
export function downloadPDFDocument(smbpContent: string, filename: string): void {
  // For backwards compatibility, redirect to AI version
  downloadAIPDFDocument(smbpContent, filename).catch(err => {
    console.error('AI PDF generation failed, falling back to basic:', err);
    // Basic fallback - just save project name
    const pdf = new jsPDF();
    pdf.setFontSize(20);
    pdf.text('PLC Program Documentation', 105, 30, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Project: ${filename.replace('.smbp', '')}`, 20, 50);
    pdf.text('AI documentation generation failed. Please try again.', 20, 70);
    pdf.save(`${filename.replace('.smbp', '')}_Documentation.pdf`);
  });
}
