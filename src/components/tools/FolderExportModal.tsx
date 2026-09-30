import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  Folder, 
  Archive, 
  Check, 
  FileCheck, 
  Layers, 
  Loader2, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  BookOpen,
  FileType
} from 'lucide-react';
import { 
  Document, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType, 
  Header, 
  Footer, 
  PageNumber, 
  PageBreak, 
  Packer 
} from 'docx';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { exportToDocx, exportToPdf } from '../../lib/exportDocument';

export interface ExportableFolderItem {
  id: string;
  title: string;
  subtitle?: string;
  content?: string;
  template?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface FolderExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  items: ExportableFolderItem[];
  userProfile?: {
    name?: string;
    institution?: string;
    studyProgram?: string;
  };
}

export function FolderExportModal({
  isOpen,
  onClose,
  folderName,
  items,
  userProfile = {}
}: FolderExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<
    'compendium-pdf' | 'compendium-docx' | 'zip-pdf' | 'zip-docx' | 'zip-md' | 'compendium-md'
  >('compendium-pdf');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => items.map(it => it.id));
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedItemIds(items.map(it => it.id));
  const deselectAll = () => setSelectedItemIds([]);

  const activeItems = items.filter(it => selectedItemIds.includes(it.id));

  // Beregn totalt ordantall
  const totalWordCount = activeItems.reduce((sum, it) => {
    const text = it.content || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return sum + words;
  }, 0);

  // Generer samlet PDF kompendium
  const generateCompendiumPdf = async (): Promise<Blob> => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 25.4;
    const contentWidth = pageWidth - margin * 2;
    const marginTop = 25.4;
    const marginBottom = 25.4;

    // FORSIDE
    doc.setFont('times', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(24, 30, 48); // Slate 900
    const titleLines = doc.splitTextToSize(folderName, contentWidth);
    doc.text(titleLines, pageWidth / 2, 90, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105); // Slate 600
    doc.text(`Samlet kompendium • ${activeItems.length} dokumenter`, pageWidth / 2, 115, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generert fra BLU-verktøykasse: ${new Date().toLocaleDateString('nb-NO')}`, pageWidth / 2, 130, { align: 'center' });

    if (userProfile.name || userProfile.institution) {
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text(`${userProfile.name || ''} ${userProfile.institution ? `• ${userProfile.institution}` : ''}`, pageWidth / 2, 220, { align: 'center' });
    }

    // INNHOLDSFORTEGNELSE (Side 2)
    doc.addPage();
    let cursorY = marginTop + 10;

    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text('Innhold i denne mappen', margin, cursorY);
    cursorY += 12;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);

    activeItems.forEach((item, index) => {
      const words = item.content ? item.content.trim().split(/\s+/).length : 0;
      doc.setFont('times', 'bold');
      doc.text(`${index + 1}.  ${item.title}`, margin, cursorY);
      doc.setFont('times', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text(`(${item.template || 'Notat'}, ${words} ord)`, margin + 100, cursorY);
      doc.setTextColor(51, 65, 85);
      cursorY += 7;

      if (cursorY > pageHeight - marginBottom - 20) {
        doc.addPage();
        cursorY = marginTop;
      }
    });

    // DOKUMENTINNHOLD
    activeItems.forEach((item, itemIdx) => {
      doc.addPage();
      cursorY = marginTop;

      // Dokumenttittel
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      const headingLines = doc.splitTextToSize(`${itemIdx + 1}. ${item.title}`, contentWidth);
      doc.text(headingLines, margin, cursorY);
      cursorY += (headingLines.length * 7) + 3;

      // Metadata-bjelke
      doc.setFont('times', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Mal/Kategori: ${item.template || 'Generelt'}  |  Sist endret: ${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('nb-NO') : 'Nylig'}`, margin, cursorY);
      cursorY += 8;

      // Skillelinje
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 8;

      // Innholdslinjer
      const lines = (item.content || '').split('\n');
      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line) {
          cursorY += 4;
          continue;
        }

        if (cursorY > pageHeight - marginBottom - 15) {
          doc.addPage();
          cursorY = marginTop;
        }

        if (line.startsWith('# ')) {
          doc.setFont('times', 'bold');
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42);
          const t = line.replace(/^#\s+/, '');
          const splitH1 = doc.splitTextToSize(t, contentWidth);
          doc.text(splitH1, margin, cursorY);
          cursorY += (splitH1.length * 6) + 4;
        } else if (line.startsWith('## ')) {
          doc.setFont('times', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(30, 41, 59);
          const t = line.replace(/^##\s+/, '');
          const splitH2 = doc.splitTextToSize(t, contentWidth);
          doc.text(splitH2, margin, cursorY);
          cursorY += (splitH2.length * 5.5) + 3;
        } else if (line.startsWith('### ')) {
          doc.setFont('times', 'bolditalic');
          doc.setFontSize(11);
          doc.setTextColor(51, 65, 85);
          const t = line.replace(/^###\s+/, '');
          const splitH3 = doc.splitTextToSize(t, contentWidth);
          doc.text(splitH3, margin, cursorY);
          cursorY += (splitH3.length * 5) + 2.5;
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          doc.setFont('times', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(51, 65, 85);
          const bulletText = `•  ${line.substring(2)}`;
          const splitB = doc.splitTextToSize(bulletText, contentWidth - 4);
          doc.text(splitB, margin + 4, cursorY);
          cursorY += (splitB.length * 5.5) + 1.5;
        } else {
          doc.setFont('times', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(30, 41, 59);
          const splitP = doc.splitTextToSize(line, contentWidth);
          doc.text(splitP, margin, cursorY);
          cursorY += (splitP.length * 5.5) + 2;
        }
      }
    });

    // Legg til topp- og bunntekst på alle sider fra side 2
    const totalPages = doc.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // Slate 400

      // Topptekst
      doc.text(`Mappe: ${folderName}`, pageWidth - margin, 15, { align: 'right' });

      // Bunntekst (Sidetall)
      doc.text(`Side ${i} av ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
    }

    return doc.output('blob');
  };

  const handleExport = async () => {
    if (activeItems.length === 0) return;
    setIsExporting(true);
    setExportSuccess(null);

    try {
      const safeFolderName = folderName.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '_');

      // 1. SAMLET PDF-KOMPENDIUM (.pdf)
      if (selectedFormat === 'compendium-pdf') {
        const pdfBlob = await generateCompendiumPdf();
        saveAs(pdfBlob, `${safeFolderName}_samlet_kompendium.pdf`);
        setExportSuccess(`«${safeFolderName}_samlet_kompendium.pdf» ble lastet ned!`);
      }

      // 2. SAMLET WORD-KOMPENDIUM (.docx)
      else if (selectedFormat === 'compendium-docx') {
        const docChildren: Paragraph[] = [];

        // FORSIDE / TITTELSIDE
        docChildren.push(
          new Paragraph({
            text: folderName,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 1800, after: 300 }
          }),
          new Paragraph({
            text: `Samlet kompendium • ${activeItems.length} dokumenter`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 }
          }),
          new Paragraph({
            text: `Generert fra BLU-verktøykasse: ${new Date().toLocaleDateString('nb-NO')}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 1200 }
          })
        );

        if (userProfile.name || userProfile.institution) {
          docChildren.push(
            new Paragraph({
              text: `${userProfile.name || ''} ${userProfile.institution ? `• ${userProfile.institution}` : ''}`,
              alignment: AlignmentType.CENTER,
              spacing: { after: 800 }
            })
          );
        }

        // INNHOLDSFORTEGNELSE
        docChildren.push(
          new Paragraph({
            children: [new PageBreak()]
          }),
          new Paragraph({
            text: 'Innhold i denne mappen',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 400 }
          })
        );

        activeItems.forEach((item, index) => {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${index + 1}.  ${item.title}`, bold: true }),
                new TextRun({ text: `   (${item.template || 'Notat'}, ${item.content ? item.content.trim().split(/\s+/).length : 0} ord)`, italics: true, color: '666666' })
              ],
              spacing: { after: 180 }
            })
          );
        });

        // DOKUMENTINNHOLD
        activeItems.forEach((item, index) => {
          docChildren.push(
            new Paragraph({
              children: [new PageBreak()]
            }),
            new Paragraph({
              text: `${index + 1}. ${item.title}`,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Mal/Kategori: ${item.template || 'Generelt'}  |  Sist endret: ${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('nb-NO') : 'Nylig'}`, italics: true, color: '777777', size: 18 })
              ],
              spacing: { after: 400 }
            })
          );

          const lines = (item.content || '').split('\n');
          lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) {
              docChildren.push(new Paragraph({ spacing: { after: 120 } }));
            } else if (trimmed.startsWith('# ')) {
              docChildren.push(new Paragraph({ text: trimmed.replace(/^#\s+/, ''), heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }));
            } else if (trimmed.startsWith('## ')) {
              docChildren.push(new Paragraph({ text: trimmed.replace(/^##\s+/, ''), heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
            } else if (trimmed.startsWith('### ')) {
              docChildren.push(new Paragraph({ text: trimmed.replace(/^###\s+/, ''), heading: HeadingLevel.HEADING_4, spacing: { before: 160, after: 80 } }));
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              docChildren.push(new Paragraph({ text: `• ${trimmed.substring(2)}`, spacing: { after: 100 } }));
            } else {
              docChildren.push(new Paragraph({ text: trimmed, spacing: { after: 140 } }));
            }
          });
        });

        const docxBlob = await Packer.toBlob(
          new Document({
            sections: [
              {
                headers: {
                  default: new Header({
                    children: [
                      new Paragraph({
                        text: `Mappe: ${folderName}`,
                        alignment: AlignmentType.RIGHT
                      })
                    ]
                  })
                },
                footers: {
                  default: new Footer({
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'Side ' }),
                          new TextRun({ children: [PageNumber.CURRENT] }),
                          new TextRun({ text: ' av ' }),
                          new TextRun({ children: [PageNumber.TOTAL_PAGES] })
                        ]
                      })
                    ]
                  })
                },
                children: docChildren
              }
            ]
          })
        );

        saveAs(docxBlob, `${safeFolderName}_samlet_kompendium.docx`);
        setExportSuccess(`«${safeFolderName}_samlet_kompendium.docx» ble lastet ned!`);
      }

      // 3. ZIP MED INDIVIDUELLE PDF-FILER (.zip)
      else if (selectedFormat === 'zip-pdf') {
        const zip = new JSZip();
        const folderZip = zip.folder(safeFolderName) || zip;

        for (const item of activeItems) {
          const itemBlob = await exportToPdf({
            format: 'pdf',
            includeCoverPage: false,
            coverTheme: 'modern',
            metadata: {
              title: item.title,
              assignmentType: item.template || 'Notat',
              authorName: userProfile.name || 'Barnehagelærerstudent',
              institution: userProfile.institution || 'Barnehagelærerutdanningen'
            },
            headerFooter: {
              includeHeader: true,
              headerText: item.title,
              headerAlignment: 'left',
              includeFooter: true,
              footerText: userProfile.institution || '',
              includePageNumber: true,
              pageNumberFormat: 'page_of_total',
              pageNumberPosition: 'right',
              firstPageNumberExcluded: false
            },
            toc: {
              includeToC: false,
              title: 'Innholdsfortegnelse',
              showSubchapters: true,
              showPageNumbers: true
            },
            content: item.content || ''
          });
          const safeItemTitle = item.title.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '_').substring(0, 40);
          folderZip.file(`${safeItemTitle}.pdf`, itemBlob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${safeFolderName}_pdf_arkiv.zip`);
        setExportSuccess(`«${safeFolderName}_pdf_arkiv.zip» ble lastet ned!`);
      }

      // 4. ZIP MED INDIVIDUELLE WORD-FILER (.zip)
      else if (selectedFormat === 'zip-docx') {
        const zip = new JSZip();
        const folderZip = zip.folder(safeFolderName) || zip;

        for (const item of activeItems) {
          const itemBlob = await exportToDocx({
            format: 'docx',
            includeCoverPage: false,
            coverTheme: 'modern',
            metadata: {
              title: item.title,
              assignmentType: item.template || 'Notat',
              authorName: userProfile.name || 'Barnehagelærerstudent',
              institution: userProfile.institution || 'Barnehagelærerutdanningen'
            },
            headerFooter: {
              includeHeader: true,
              headerText: item.title,
              headerAlignment: 'left',
              includeFooter: true,
              footerText: userProfile.institution || '',
              includePageNumber: true,
              pageNumberFormat: 'page_of_total',
              pageNumberPosition: 'right',
              firstPageNumberExcluded: false
            },
            toc: {
              includeToC: false,
              title: 'Innholdsfortegnelse',
              showSubchapters: true,
              showPageNumbers: true
            },
            content: item.content || ''
          });
          const safeItemTitle = item.title.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '_').substring(0, 40);
          folderZip.file(`${safeItemTitle}.docx`, itemBlob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${safeFolderName}_word_dokumenter.zip`);
        setExportSuccess(`«${safeFolderName}_word_dokumenter.zip» ble lastet ned!`);
      }

      // 5. SAMLET MARKDOWN-FIL (.md)
      else if (selectedFormat === 'compendium-md') {
        let combinedMd = `# ${folderName}\n\n*Samlet kompendium med ${activeItems.length} dokumenter (${totalWordCount} ord)*\n\n---\n\n## Innholdsfortegnelse\n\n`;
        activeItems.forEach((item, idx) => {
          combinedMd += `${idx + 1}. [${item.title}](#${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')})\n`;
        });
        combinedMd += `\n---\n\n`;

        activeItems.forEach((item, idx) => {
          combinedMd += `# ${idx + 1}. ${item.title}\n\n*Kategori: ${item.template || 'Generelt'}*\n\n${item.content || ''}\n\n---\n\n`;
        });

        const blob = new Blob([combinedMd], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, `${safeFolderName}_samlet.md`);
        setExportSuccess(`«${safeFolderName}_samlet.md» ble lastet ned!`);
      }

      // 6. ZIP MED MARKDOWN-FILER (.zip)
      else if (selectedFormat === 'zip-md') {
        const zip = new JSZip();
        const folderZip = zip.folder(safeFolderName) || zip;

        activeItems.forEach(item => {
          const safeItemTitle = item.title.replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '_').substring(0, 40);
          const mdContent = `# ${item.title}\n\n*Mal: ${item.template || 'Notat'} | Sist endret: ${item.updatedAt || 'Nylig'}*\n\n${item.content || ''}`;
          folderZip.file(`${safeItemTitle}.md`, mdContent);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${safeFolderName}_markdown.zip`);
        setExportSuccess(`«${safeFolderName}_markdown.zip» ble lastet ned!`);
      }
    } catch (err) {
      console.error('Feil ved mappeeksport:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">
                Eksporter mappe «{folderName}»
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Last ned alt innhold samlet som PDF, Word eller ZIP-arkiv
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* INNHOLD */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* FORMATVALG */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
              1. Velg eksportformat
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* SAMLET PDF */}
              <button
                type="button"
                onClick={() => setSelectedFormat('compendium-pdf')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedFormat === 'compendium-pdf'
                    ? 'border-rose-600 bg-rose-50/50 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileType className="w-4 h-4 text-rose-600" />
                    <span>Samlet PDF (.pdf)</span>
                  </span>
                  {selectedFormat === 'compendium-pdf' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Ett felles PDF-kompendium med forside, innholdsoversikt og sidetall.
                </p>
              </button>

              {/* SAMLET WORD */}
              <button
                type="button"
                onClick={() => setSelectedFormat('compendium-docx')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedFormat === 'compendium-docx'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Samlet Word (.docx)</span>
                  </span>
                  {selectedFormat === 'compendium-docx' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Ett felles Word-dokument som kan redigeres videre.
                </p>
              </button>

              {/* ZIP MED PDF-FILER */}
              <button
                type="button"
                onClick={() => setSelectedFormat('zip-pdf')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedFormat === 'zip-pdf'
                    ? 'border-rose-600 bg-rose-50/50 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-rose-600" />
                    <span>ZIP med PDF-filer</span>
                  </span>
                  {selectedFormat === 'zip-pdf' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Hvert notat som sin egen PDF i en pakket ZIP-fil.
                </p>
              </button>

              {/* ZIP MED WORD-FILER */}
              <button
                type="button"
                onClick={() => setSelectedFormat('zip-docx')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedFormat === 'zip-docx'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-indigo-600" />
                    <span>ZIP med Word-filer</span>
                  </span>
                  {selectedFormat === 'zip-docx' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Hvert notat som sin egen Word-fil i en ZIP-fil.
                </p>
              </button>

              {/* SAMLET MARKDOWN */}
              <button
                type="button"
                onClick={() => setSelectedFormat('compendium-md')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedFormat === 'compendium-md'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Samlet Markdown (.md)</span>
                  </span>
                  {selectedFormat === 'compendium-md' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  For Notion, Obsidian eller Canvas.
                </p>
              </button>

              {/* ZIP MED MARKDOWN */}
              <button
                type="button"
                onClick={() => setSelectedFormat('zip-md')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedFormat === 'zip-md'
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-indigo-600" />
                    <span>ZIP med Markdown</span>
                  </span>
                  {selectedFormat === 'zip-md' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Separate .md-filer pakket inn i en zip-fil.
                </p>
              </button>

            </div>
          </div>

          {/* DOKUMENTVELGER */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                2. Inkluderte dokumenter ({activeItems.length} av {items.length})
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                >
                  Velg alle
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-slate-500 hover:underline font-medium cursor-pointer"
                >
                  Fjern alle
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-56 overflow-y-auto custom-scrollbar">
              {items.length === 0 ? (
                <p className="p-4 text-xs text-slate-500 italic text-center">
                  Mappen inneholder ingen dokumenter.
                </p>
              ) : (
                items.map(item => {
                  const isChecked = selectedItemIds.includes(item.id);
                  const wordCount = item.content ? item.content.trim().split(/\s+/).length : 0;
                  return (
                    <label 
                      key={item.id}
                      className={`flex items-center gap-3 p-3 transition-colors cursor-pointer ${
                        isChecked ? 'bg-indigo-50/30' : 'hover:bg-slate-50'
                      }`}
                    >
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(item.id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {item.template || 'Notat'} • ca. {wordCount} ord
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* TOTAL INFO */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              Totalt valgt: <strong className="text-slate-800 font-bold">{activeItems.length} dokumenter</strong>
            </span>
            <span className="text-slate-600 font-medium">
              Estimert: <strong className="text-slate-800 font-bold">{totalWordCount} ord</strong>
            </span>
          </div>

          {exportSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-white transition-all cursor-pointer"
          >
            Lukk
          </button>
          
          <button
            type="button"
            onClick={handleExport}
            disabled={activeItems.length === 0 || isExporting}
            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Genererer eksport...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Last ned ({activeItems.length})</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
export default FolderExportModal;
