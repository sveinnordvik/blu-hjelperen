import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportMessage {
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp?: string;
}

/**
 * Eksporterer hele samtalen til et strukturert og vakkert formatert PDF-dokument.
 */
export async function exportChatToPdf(
  title: string,
  messages: ExportMessage[],
  elementToCapture?: HTMLElement | null
): Promise<void> {
  if (messages.length === 0) return;

  try {
    // Hvis vi har et DOM-element og vil ta et screenshot, prøver vi html2canvas først
    if (elementToCapture) {
      const canvas = await html2canvas(elementToCapture, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const safeFileName = `${title.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '_').slice(0, 30)}_veiledning.pdf`;
      pdf.save(safeFileName);
      return;
    }
  } catch (canvasErr) {
    console.warn('html2canvas feilet, faller tilbake til ren tekst PDF:', canvasErr);
  }

  // Fallback: Direkte generering av ren typografi PDF via jsPDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const margin = 40;
  const pageWidth = 595.28;
  const maxLineWidth = pageWidth - margin * 2;
  let y = 50;

  // Tittel / Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // Blue 900
  doc.text('BLU-hjelperen — Veiledningsnotat', margin, y);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emne: ${title} | Dato: ${new Date().toLocaleDateString('nb-NO')}`, margin, y);
  y += 20;

  // Skillelinje
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 25;

  // Meldinger
  for (const msg of messages) {
    const isUser = msg.role === 'user';
    const senderTitle = isUser ? 'Student:' : 'BLU-hjelperen (KI-veileder):';

    if (y > 750) {
      doc.addPage();
      y = 50;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(isUser ? 37 : 14, isUser ? 99 : 116, isUser ? 235 : 144);
    doc.text(senderTitle, margin, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    // Rens opp markdown for ren tekst PDF
    const cleanText = msg.text
      .replace(/###?\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1');

    const splitText = doc.splitTextToSize(cleanText, maxLineWidth);
    
    for (const line of splitText) {
      if (y > 780) {
        doc.addPage();
        y = 50;
      }
      doc.text(line, margin, y);
      y += 14;
    }

    y += 18;
  }

  const safeFileName = `${title.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '_').slice(0, 30)}_veiledning.pdf`;
  doc.save(safeFileName);
}

/**
 * Kopierer hele samtalen formatert som Markdown til utklippstavlen.
 */
export async function copyFullChat(messages: ExportMessage[]): Promise<boolean> {
  if (messages.length === 0) return false;

  const markdownContent = messages
    .map((msg) => {
      const author = msg.role === 'user' ? '### 👤 Student' : '### 💡 BLU-hjelperen';
      return `${author}\n\n${msg.text}\n\n---`;
    })
    .join('\n\n');

  try {
    await navigator.clipboard.writeText(markdownContent);
    return true;
  } catch (err) {
    console.error('Kunne ikke kopiere samtalen:', err);
    return false;
  }
}
