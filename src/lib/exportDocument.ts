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
  BorderStyle, 
  TabStopType, 
  LeaderType, 
  Packer
} from 'docx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

export type CoverTheme = 'classic' | 'modern' | 'formal' | 'practice';

export interface DocumentExportMetadata {
  title: string;
  subtitle?: string; // problemstilling eller undertittel
  assignmentType: string; // f.eks. "Bacheloroppgave", "Refleksjonsnotat", "Praksisfortelling" etc.
  authorName: string;
  candidateNumber?: string;
  institution: string; // f.eks. "Dronning Mauds Minne Høgskole" / "Høgskolen i Innlandet"
  courseCode?: string; // f.eks. "BLU3001"
  semester?: string; // f.eks. "Høst 2026" / "Vår 2026"
  date?: string;
  wordCount?: number;
  supervisor?: string;
  practicePlace?: string; // Spesifikt for didaktisk/praksis
  targetGroup?: string; // Spesifikt for didaktisk/praksis (f.eks. "Småbarnsavdeling 1-3 år")
}

export interface HeaderFooterOptions {
  includeHeader: boolean;
  headerText: string;
  headerAlignment: 'left' | 'right' | 'center';
  includeFooter: boolean;
  footerText: string;
  includePageNumber: boolean;
  pageNumberFormat: 'page_of_total' | 'page_only' | 'number_only';
  pageNumberPosition: 'right' | 'center' | 'left';
  firstPageNumberExcluded: boolean;
}

export interface TableOfContentsOptions {
  includeToC: boolean;
  title: string;
  showSubchapters: boolean;
  showPageNumbers: boolean;
}

export interface OutlineItem {
  id?: number | string;
  title: string;
  subItems?: string[];
}

export interface ExportConfig {
  format: 'docx' | 'pdf';
  includeCoverPage: boolean;
  coverTheme: CoverTheme;
  metadata: DocumentExportMetadata;
  headerFooter: HeaderFooterOptions;
  toc: TableOfContentsOptions;
  content: string; // Markdown / raw text
  outline?: OutlineItem[];
  fontFamily?: 'Times New Roman' | 'Arial' | 'Calibri';
  lineSpacing?: number; // standard 1.5
}

export interface TocEntry {
  title: string;
  level: number; // 1 = Hovedkapittel, 2 = Underkapittel, 3 = Underpunkt
  numbering: string; // f.eks. "1.", "1.1", "1.1.1"
  pageEstimate?: number;
}

// Hjelpefunksjon for å sjekke om en overskrift er en litteraturliste
function isReferenceListHeading(text: string): boolean {
  const clean = text.toLowerCase().trim();
  return (
    clean.includes('litteratur') ||
    clean.includes('referanse') ||
    clean.includes('kilde') ||
    clean.includes('bibliografi')
  );
}

// Hjelpefunksjon for å rense anførselstegn fra blokksitat
function cleanBlockquoteQuotes(text: string): string {
  let cleaned = text.trim();
  // Fjern anførselstegn i starten og slutten («...», "...", “...”, ”...”)
  cleaned = cleaned.replace(/^["«“](.*)["»”]$/s, '$1').trim();
  cleaned = cleaned.replace(/^"(.*)"$/s, '$1').trim();
  cleaned = cleaned.replace(/^'(.*)'$/s, '$1').trim();
  return cleaned;
}

/**
 * Tolker markdown og struktur til overskrifter og innhold
 */
export function extractTocEntries(markdown: string, outline?: OutlineItem[]): TocEntry[] {
  const entries: TocEntry[] = [];
  const lines = markdown.split('\n');

  let h1Count = 0;
  let h2Count = 0;
  let h3Count = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('# ')) {
      h1Count++;
      h2Count = 0;
      h3Count = 0;
      entries.push({
        title: line.replace(/^#\s+/, '').trim(),
        level: 1,
        numbering: `${h1Count}.`
      });
    } else if (line.startsWith('## ')) {
      h2Count++;
      h3Count = 0;
      const num = h1Count > 0 ? `${h1Count}.${h2Count}` : `${h2Count}.`;
      entries.push({
        title: line.replace(/^##\s+/, '').trim(),
        level: 2,
        numbering: num
      });
    } else if (line.startsWith('### ')) {
      h3Count++;
      const num = h1Count > 0 
        ? (h2Count > 0 ? `${h1Count}.${h2Count}.${h3Count}` : `${h1Count}.1.${h3Count}`)
        : `${h3Count}.`;
      entries.push({
        title: line.replace(/^###\s+/, '').trim(),
        level: 3,
        numbering: num
      });
    }
  }

  // Hvis teksten ikke hadde markdown-overskrifter, bruk outline hvis tilgjengelig
  if (entries.length === 0 && outline && outline.length > 0) {
    outline.forEach((item, idx) => {
      entries.push({
        title: item.title,
        level: 1,
        numbering: `${idx + 1}.`
      });
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach((sub, sIdx) => {
          entries.push({
            title: sub,
            level: 2,
            numbering: `${idx + 1}.${sIdx + 1}`
          });
        });
      }
    });
  }

  return entries;
}

// -------------------------------------------------------------
// WORD (.DOCX) EKSPORTMOTOR
// -------------------------------------------------------------

function buildDocxCoverPage(theme: CoverTheme, metadata: DocumentExportMetadata, font: string = 'Times New Roman'): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  const nowFormatted = metadata.date || new Date().toLocaleDateString('nb-NO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  if (theme === 'classic') {
    // TEMA 1: KLASSISK AKADEMISK
    paragraphs.push(new Paragraph({ text: '', spacing: { before: 2400 } }));

    if (metadata.institution) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: metadata.institution.toUpperCase(),
            font,
            size: 24, // 12pt
            bold: true,
            color: '334155'
          })
        ]
      }));
    }

    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: (metadata.assignmentType || 'FAGOPPGAVE').toUpperCase(),
          font,
          size: 24, // 12pt
          color: '475569'
        })
      ]
    }));

    // Tittel (14pt fet)
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: metadata.title || 'Uten tittel',
          font,
          size: 32, // 16pt for tittelblad
          bold: true,
          color: '000000'
        })
      ],
      border: {
        bottom: {
          style: BorderStyle.DOUBLE,
          size: 8,
          color: '1E3A8A',
          space: 12
        }
      }
    }));

    // Undertittel / Problemstilling
    if (metadata.subtitle) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 2200 },
        children: [
          new TextRun({
            text: metadata.subtitle,
            font,
            size: 24, // 12pt
            italics: true,
            color: '334155'
          })
        ]
      }));
    } else {
      paragraphs.push(new Paragraph({ text: '', spacing: { before: 2200 } }));
    }

    // Forfatter- og innleveringsblokk
    const details = [
      metadata.authorName ? `Forfatter: ${metadata.authorName}` : '',
      metadata.candidateNumber ? `Kandidatnummer: ${metadata.candidateNumber}` : '',
      metadata.courseCode ? `Emnekode: ${metadata.courseCode}` : '',
      metadata.semester ? `Semester: ${metadata.semester}` : '',
      metadata.supervisor ? `Veileder: ${metadata.supervisor}` : '',
      metadata.wordCount ? `Ordtelling: ca. ${metadata.wordCount.toLocaleString('nb-NO')} ord` : '',
      `Innleveringsdato: ${nowFormatted}`
    ].filter(Boolean);

    details.forEach(item => {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: 360, after: 100 },
        children: [
          new TextRun({
            text: item,
            font,
            size: 24, // 12pt
            color: '334155'
          })
        ]
      }));
    });

  } else if (theme === 'modern') {
    // TEMA 2: MODERNE NORDISK
    paragraphs.push(new Paragraph({ text: '', spacing: { before: 1800 } }));

    // Aksentlinje øverst
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: (metadata.institution || 'HØGSKOLE').toUpperCase(),
          font,
          size: 24,
          bold: true,
          color: '1E3A8A'
        })
      ]
    }));

    // Oppgavetype
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: metadata.assignmentType || 'Akademisk oppgave',
          font,
          size: 24,
          color: '475569'
        })
      ]
    }));

    // Tittel
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: metadata.title || 'Uten tittel',
          font,
          size: 36,
          bold: true,
          color: '000000'
        })
      ],
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 16,
          color: '1E3A8A',
          space: 10
        }
      }
    }));

    // Undertittel
    if (metadata.subtitle) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 250, after: 2400 },
        children: [
          new TextRun({
            text: metadata.subtitle,
            font,
            size: 24,
            color: '334155'
          })
        ]
      }));
    } else {
      paragraphs.push(new Paragraph({ text: '', spacing: { before: 2400 } }));
    }

    // Metadata i strukturert oppsett
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120, line: 360 },
      children: [
        new TextRun({ text: 'STUDENT / KANDIDAT:  ', bold: true, size: 24, color: '334155', font }),
        new TextRun({ text: `${metadata.authorName || 'Navn'} ${metadata.candidateNumber ? `(Kand. ${metadata.candidateNumber})` : ''}`, size: 24, color: '000000', font })
      ]
    }));

    if (metadata.courseCode || metadata.semester) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120, line: 360 },
        children: [
          new TextRun({ text: 'EMNE & SEMESTER:     ', bold: true, size: 24, color: '334155', font }),
          new TextRun({ text: `${metadata.courseCode || ''} ${metadata.semester ? `• ${metadata.semester}` : ''}`.trim(), size: 24, color: '000000', font })
        ]
      }));
    }

    if (metadata.supervisor) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120, line: 360 },
        children: [
          new TextRun({ text: 'FAGLIG VEILEDER:    ', bold: true, size: 24, color: '334155', font }),
          new TextRun({ text: metadata.supervisor, size: 24, color: '000000', font })
        ]
      }));
    }

    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120, line: 360 },
      children: [
        new TextRun({ text: 'DATO & ORDANTALL:   ', bold: true, size: 24, color: '334155', font }),
        new TextRun({ text: `${nowFormatted} ${metadata.wordCount ? `• ${metadata.wordCount.toLocaleString('nb-NO')} ord` : ''}`, size: 24, color: '000000', font })
      ]
    }));

  } else if (theme === 'formal') {
    // TEMA 3: FORMELL EKSAMEN & RAPPORT
    paragraphs.push(new Paragraph({ text: '', spacing: { before: 1200 } }));

    // Formell topp-boks
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'EKSAMENSBESVARELSE / FORMELT ARBEIDSKRAV',
          font,
          size: 24,
          bold: true,
          color: '000000'
        })
      ],
      border: {
        top: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 6 },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 6 }
      }
    }));

    paragraphs.push(new Paragraph({ text: '', spacing: { before: 1000 } }));

    // Tittel
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: metadata.title || 'Oppgavetittel',
          font,
          size: 32,
          bold: true,
          color: '000000'
        })
      ]
    }));

    if (metadata.subtitle) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 1800 },
        children: [
          new TextRun({
            text: metadata.subtitle,
            font,
            size: 24,
            italics: true,
            color: '334155'
          })
        ]
      }));
    } else {
      paragraphs.push(new Paragraph({ text: '', spacing: { before: 1800 } }));
    }

    // Formell detaljtabell
    const rows = [
      ['Kandidat / Student: ', `${metadata.authorName || 'Navn'} ${metadata.candidateNumber ? `(Kandidatnr: ${metadata.candidateNumber})` : ''}`],
      ['Emnekode og tittel: ', `${metadata.courseCode || 'Ikke spesifisert'} — ${metadata.assignmentType || ''}`],
      ['Utdanningsinstitusjon: ', metadata.institution || 'Høgskole'],
      ['Innleveringsdato: ', nowFormatted],
      ...(metadata.wordCount ? [['Totalt ordantall: ', `${metadata.wordCount.toLocaleString('nb-NO')} ord`]] : [])
    ];

    rows.forEach(r => {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120, line: 360 },
        children: [
          new TextRun({ text: r[0], bold: true, size: 24, font }),
          new TextRun({ text: r[1], size: 24, font })
        ]
      }));
    });

    // Akademisk erklæring
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 400, line: 360 },
      children: [
        new TextRun({
          text: 'Erklæring: Jeg bekrefter herved at besvarelsen er mitt eget selvstendige arbeid, og at alle kilder, sitater og referanser er oppgitt i henhold til gjeldende retningslinjer for akademisk redelighet (APA 7).',
          font,
          size: 20, // 10pt
          italics: true,
          color: '475569'
        })
      ],
      border: {
        top: { style: BorderStyle.DASHED, size: 4, color: 'CBD5E1', space: 6 }
      }
    }));

  } else {
    // TEMA 4: PEDAGOGISK & PRAKSIS
    paragraphs.push(new Paragraph({ text: '', spacing: { before: 1400 } }));

    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: 'BARNEHAGELÆRERUTDANNINGEN',
          font,
          size: 24,
          bold: true,
          color: '0D9488'
        }),
        new TextRun({
          text: ` • ${metadata.institution || 'HØGSKOLE'}`,
          font,
          size: 24,
          color: '475569'
        })
      ]
    }));

    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: (metadata.assignmentType || 'PRAKSISOPPGAVE / DIDAKTISK DOKUMENTASJON').toUpperCase(),
          font,
          size: 24,
          bold: true,
          color: '000000'
        })
      ]
    }));

    // Tittel
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: metadata.title || 'Uten tittel',
          font,
          size: 32,
          bold: true,
          color: '000000'
        })
      ],
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 12,
          color: '0D9488',
          space: 8
        }
      }
    }));

    // Problemstilling / Refleksjonsfokus
    if (metadata.subtitle) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 200, after: 1800 },
        children: [
          new TextRun({
            text: `Pedagogisk fokus / problemstilling:\n${metadata.subtitle}`,
            font,
            size: 24,
            italics: true,
            color: '334155'
          })
        ]
      }));
    } else {
      paragraphs.push(new Paragraph({ text: '', spacing: { before: 1800 } }));
    }

    // Praksis-spesifikke detaljer
    const practiceDetails = [
      { label: 'Student / Forfatter:', value: `${metadata.authorName || 'Navn'} ${metadata.candidateNumber ? `(Kand. ${metadata.candidateNumber})` : ''}` },
      { label: 'Praksisbarnehage:', value: metadata.practicePlace || 'Ikke angitt' },
      { label: 'Barnegruppe / Alder:', value: metadata.targetGroup || 'Småbarn / Storbarn' },
      { label: 'Praksislærer / Veileder:', value: metadata.supervisor || 'Ikke oppgitt' },
      { label: 'Fagområde / Rammeplan:', value: metadata.courseCode || 'Barns medvirkning og lek' },
      { label: 'Innleveringsdato:', value: `${nowFormatted} ${metadata.wordCount ? `(${metadata.wordCount.toLocaleString('nb-NO')} ord)` : ''}` }
    ];

    practiceDetails.forEach(row => {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120, line: 360 },
        children: [
          new TextRun({ text: `${row.label.padEnd(26, ' ')} `, bold: true, size: 24, color: '0D9488', font }),
          new TextRun({ text: row.value, size: 24, color: '000000', font })
        ]
      }));
    });
  }

  // Avslutt forside med sideskift
  paragraphs.push(new Paragraph({
    children: [new PageBreak()]
  }));

  return paragraphs;
}

/**
 * Bygger Innholdsfortegnelse for Word med tab stops og prikket lederlinje
 */
function buildDocxTableOfContents(tocEntries: TocEntry[], title: string, font: string = 'Times New Roman', showSubchapters: boolean): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Tittel for Innholdsfortegnelse - Overskrift 1 (14pt, fet, venstrestilt, 18 pkt avstand etter)
  paragraphs.push(new Paragraph({
    text: title || 'Innholdsfortegnelse',
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.LEFT,
    spacing: { before: 240, after: 360 } // 18 pkt avstand etter = 360 twips
  }));

  const filteredEntries = showSubchapters ? tocEntries : tocEntries.filter(e => e.level === 1);

  filteredEntries.forEach((entry, idx) => {
    const isHoved = entry.level === 1;
    const isSub = entry.level === 2;

    const indentLeft = isHoved ? 0 : isSub ? 360 : 720;
    const fontSize = isHoved ? 24 : 24; // 12pt for ToC entries

    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { line: 360, after: isHoved ? 120 : 60, before: isHoved ? 80 : 0 },
      indent: { left: indentLeft },
      tabStops: [
        {
          type: TabStopType.RIGHT,
          position: 9000,
          leader: LeaderType.DOT
        }
      ],
      children: [
        new TextRun({
          text: `${entry.numbering}  ${entry.title}`,
          font,
          size: fontSize,
          bold: isHoved,
          color: '000000'
        }),
        new TextRun({
          text: '\t',
          font
        }),
        new TextRun({
          text: `${(entry.pageEstimate || idx + 3)}`,
          font,
          size: fontSize,
          bold: isHoved,
          color: '000000'
        })
      ]
    }));
  });

  // Sideskift etter innholdsfortegnelse
  paragraphs.push(new Paragraph({
    children: [new PageBreak()]
  }));

  return paragraphs;
}

/**
 * Konverterer Markdown brødtekst til Word-avsnitt med nøyaktig formatering:
 * - Overskrift 1: 14pt, venstrestilt, fet, 18 pkt etter, ALLTID ny side (pageBreakBefore: true)
 * - Overskrift 2: 12pt, venstrestilt, fet, 12 pkt etter
 * - Overskrift 3: 12pt, venstrestilt, fet og kursiv, 6 pkt etter
 * - Hovedtekst: 12pt, linjeavstand 1,5, venstrejustert (frynsete høyrekant)
 * - Lange sitater (>= 40 ord eller blokksitat): Rykket inn 1,27 cm (720 twips), linjeavstand 2.0 (480 twips), 12pt, uten anførselstegn
 * - Litteraturliste: Hengende innrykk (hanging indent) på 1,27 cm (720 twips)
 */
function convertMarkdownToDocx(markdown: string, font: string = 'Times New Roman'): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = markdown.split('\n');

  let isFirstHeading1 = true;
  let inReferenceList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    // OVERSKRIFT 1: 14pt, venstrestilt, fet, 18 pkt etter (360 twips). Starter ALLTID på ny side!
    if (line.startsWith('# ')) {
      const text = line.replace(/^#\s+/, '').trim();
      inReferenceList = isReferenceListHeading(text);

      paragraphs.push(new Paragraph({
        text,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.LEFT,
        pageBreakBefore: true, // Overskrift 1 starter ALLTID på ny side
        spacing: { 
          before: 240, 
          after: 360, // 18 pkt avstand etter = 360 twips
          line: 360   // 1.5 linjeavstand
        },
        children: [
          new TextRun({
            text,
            font,
            size: 28, // 14pt
            bold: true,
            color: '000000'
          })
        ]
      }));
      isFirstHeading1 = false;
      continue;
    }

    // OVERSKRIFT 2: 12pt, venstrestilt, fet, 12 pkt etter (240 twips)
    if (line.startsWith('## ')) {
      const text = line.replace(/^##\s+/, '').trim();
      inReferenceList = isReferenceListHeading(text);

      paragraphs.push(new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.LEFT,
        spacing: { 
          before: 240, 
          after: 240, // 12 pkt avstand etter = 240 twips
          line: 360
        },
        children: [
          new TextRun({
            text,
            font,
            size: 24, // 12pt
            bold: true,
            color: '000000'
          })
        ]
      }));
      continue;
    }

    // OVERSKRIFT 3: 12pt, venstrestilt, fet og kursiv, 6 pkt etter (120 twips)
    if (line.startsWith('### ')) {
      const text = line.replace(/^###\s+/, '').trim();
      paragraphs.push(new Paragraph({
        text,
        heading: HeadingLevel.HEADING_3,
        alignment: AlignmentType.LEFT,
        spacing: { 
          before: 180, 
          after: 120, // 6 pkt avstand etter = 120 twips
          line: 360
        },
        children: [
          new TextRun({
            text,
            font,
            size: 24, // 12pt
            bold: true,
            italics: true,
            color: '000000'
          })
        ]
      }));
      continue;
    }

    // LANGE SITATER (BLOKKSITAT):
    // Når et sitat er på 40 ord eller mer, eller markert med '>', skal det skilles ut:
    // - Fjern anførselstegnene
    // - Rykk inn hele sitatet 1,27 cm (720 twips) fra venstremargen
    // - Skriftstørrelse 12pt, linjeavstand 2,0 (480 twips)
    // - Venstrejustert
    const wordCountInLine = trimmed.split(/\s+/).length;
    const isMarkdownQuote = line.startsWith('> ');
    const isLongDirectQuote = (wordCountInLine >= 40 && (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('«') && trimmed.endsWith('»')) ||
      (trimmed.startsWith('“') && trimmed.endsWith('”'))
    ));

    if (isMarkdownQuote || isLongDirectQuote) {
      let rawQuote = isMarkdownQuote ? line.replace(/^>\s+/, '').trim() : trimmed;
      // Fjern anførselstegn
      rawQuote = cleanBlockquoteQuotes(rawQuote);

      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT, // Venstrejustert
        indent: { left: 720 }, // 1,27 cm innrykk fra venstremargen
        spacing: { 
          before: 240, 
          after: 240, 
          line: 480 // Linjeavstand 2,0 = 480 twips
        },
        children: parseInlineFormatting(rawQuote, font, 24) // 12pt
      }));
      continue;
    }

    // HENGANDE INNRYKK I LITTERATURLISTEN (1,27 cm = 720 twips)
    // Første linje starter inntil venstremargen, mens linje to, tre og utover rykkes inn.
    if (inReferenceList) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT, // Venstrejustert
        indent: { 
          left: 720,    // 1,27 cm
          hanging: 720  // Hengende innrykk 1,27 cm (Word spesial)
        },
        spacing: { 
          line: 360, // 1,5 linjeavstand
          after: 200 // Avstand mellom referansene
        },
        children: parseInlineFormatting(trimmed, font, 24) // 12pt
      }));
      continue;
    }

    // Punktliste
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const listText = line.replace(/^[-*]\s+/, '').trim();
      paragraphs.push(new Paragraph({
        bullet: { level: 0 },
        alignment: AlignmentType.LEFT,
        spacing: { line: 360, after: 80 },
        children: parseInlineFormatting(listText, font, 24)
      }));
      continue;
    }

    // Nummerert liste
    if (/^\d+\.\s+/.test(line)) {
      const listText = line.replace(/^\d+\.\s+/, '').trim();
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { line: 360, after: 80 },
        indent: { left: 360 },
        children: [
          new TextRun({ text: line.match(/^\d+\./)![0] + '  ', bold: true, font, size: 24 }),
          ...parseInlineFormatting(listText, font, 24)
        ]
      }));
      continue;
    }

    // VANLIG BRØDTEKST:
    // - Skriftstørrelse 12pt (size: 24)
    // - Linjeavstand 1,5 (line: 360)
    // - ALLTID venstrejustert (AlignmentType.LEFT), ujevn ("frynsete") høyrekant
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.LEFT, // Venstrejustert (ikke justified)
      spacing: { 
        line: 360, // 1,5 linjeavstand
        after: 140 
      },
      children: parseInlineFormatting(trimmed, font, 24)
    }));
  }

  return paragraphs;
}

/**
 * Tolker inline **bold** og *kursiv*
 */
function parseInlineFormatting(text: string, font: string = 'Times New Roman', size: number = 24): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({
        text: text.substring(lastIndex, match.index),
        font,
        size,
        color: '000000'
      }));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      runs.push(new TextRun({
        text: token.slice(2, -2),
        font,
        size,
        bold: true,
        color: '000000'
      }));
    } else if (token.startsWith('*') && token.endsWith('*')) {
      runs.push(new TextRun({
        text: token.slice(1, -1),
        font,
        size,
        italics: true,
        color: '000000'
      }));
    } else if (token.startsWith('`') && token.endsWith('`')) {
      runs.push(new TextRun({
        text: token.slice(1, -1),
        font: 'Courier New',
        size: Math.max(20, size - 2),
        color: '000000'
      }));
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push(new TextRun({
      text: text.substring(lastIndex),
      font,
      size,
      color: '000000'
    }));
  }

  return runs.length > 0 ? runs : [new TextRun({ text, font, size, color: '000000' })];
}

/**
 * Hovedfunksjon for eksport til Word (.docx)
 * Inkluderer 2,54 cm (1440 twips) marger på alle 4 sider
 */
export async function exportToDocx(config: ExportConfig): Promise<Blob> {
  const font = 'Times New Roman'; // Standard Times New Roman

  const tocEntries = extractTocEntries(config.content, config.outline);

  // Bygg brødtekst
  const bodyParagraphs = convertMarkdownToDocx(config.content, font);

  // Bygg innholdsfortegnelse hvis aktivert
  const tocParagraphs = config.toc.includeToC 
    ? buildDocxTableOfContents(tocEntries, config.toc.title, font, config.toc.showSubchapters)
    : [];

  const mainChildren: Paragraph[] = [
    ...tocParagraphs,
    ...bodyParagraphs
  ];

  // Header oppsett
  const header = config.headerFooter.includeHeader ? new Header({
    children: [
      new Paragraph({
        alignment: config.headerFooter.headerAlignment === 'right' 
          ? AlignmentType.RIGHT 
          : config.headerFooter.headerAlignment === 'center' 
            ? AlignmentType.CENTER 
            : AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: config.headerFooter.headerText || `${config.metadata.title} | ${config.metadata.assignmentType}`,
            font,
            size: 20, // 10pt
            italics: true,
            color: '475569'
          })
        ],
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 4,
            color: 'CBD5E1',
            space: 4
          }
        }
      })
    ]
  }) : undefined;

  // Footer oppsett
  const footerChildren: Paragraph[] = [];
  if (config.headerFooter.includeFooter || config.headerFooter.includePageNumber) {
    const textRuns: TextRun[] = [];

    if (config.headerFooter.includeFooter && config.headerFooter.footerText) {
      textRuns.push(new TextRun({
        text: config.headerFooter.footerText + (config.headerFooter.includePageNumber ? '   |   ' : ''),
        font,
        size: 20,
        color: '475569'
      }));
    }

    if (config.headerFooter.includePageNumber) {
      if (config.headerFooter.pageNumberFormat === 'page_of_total') {
        textRuns.push(new TextRun({ text: 'Side ', font, size: 20, color: '475569' }));
        textRuns.push(new TextRun({ children: [PageNumber.CURRENT], font, size: 20, color: '475569' }));
        textRuns.push(new TextRun({ text: ' av ', font, size: 20, color: '475569' }));
        textRuns.push(new TextRun({ children: [PageNumber.TOTAL_PAGES], font, size: 20, color: '475569' }));
      } else if (config.headerFooter.pageNumberFormat === 'page_only') {
        textRuns.push(new TextRun({ text: 'Side ', font, size: 20, color: '475569' }));
        textRuns.push(new TextRun({ children: [PageNumber.CURRENT], font, size: 20, color: '475569' }));
      } else {
        textRuns.push(new TextRun({ children: [PageNumber.CURRENT], font, size: 20, color: '475569' }));
      }
    }

    footerChildren.push(new Paragraph({
      alignment: config.headerFooter.pageNumberPosition === 'center' 
        ? AlignmentType.CENTER 
        : config.headerFooter.pageNumberPosition === 'right' 
          ? AlignmentType.RIGHT 
          : AlignmentType.LEFT,
      spacing: { before: 120 },
      children: textRuns,
      border: {
        top: {
          style: BorderStyle.SINGLE,
          size: 4,
          color: 'CBD5E1',
          space: 4
        }
      }
    }));
  }

  const footer = footerChildren.length > 0 ? new Footer({ children: footerChildren }) : undefined;

  // MARGER: Nøyaktig 2,54 cm (1 tomme = 1440 twips) på alle fire sider
  const standardPageMargin = {
    top: 1440,
    bottom: 1440,
    left: 1440,
    right: 1440
  };

  // Seksjoner: Forside i egen seksjon uten header/footer hvis aktivert
  const sections = [];

  if (config.includeCoverPage) {
    const coverParagraphs = buildDocxCoverPage(config.coverTheme, config.metadata, font);
    sections.push({
      properties: {
        page: {
          margin: standardPageMargin,
          pageNumbers: { start: 1 }
        }
      },
      children: coverParagraphs
    });
  }

  sections.push({
    properties: {
      page: {
        margin: standardPageMargin,
        pageNumbers: {
          start: config.includeCoverPage ? 2 : 1
        }
      }
    },
    headers: header ? { default: header } : undefined,
    footers: footer ? { default: footer } : undefined,
    children: mainChildren
  });

  const doc = new Document({
    styles: {
      default: {
        heading1: {
          run: { size: 28, bold: true, font, color: '000000' }, // 14pt fet
          paragraph: { 
            alignment: AlignmentType.LEFT,
            spacing: { before: 240, after: 360, line: 360 }, // 18 pkt etter = 360 twips
            pageBreakBefore: true // ALLTID ny side for Overskrift 1
          }
        },
        heading2: {
          run: { size: 24, bold: true, font, color: '000000' }, // 12pt fet
          paragraph: { 
            alignment: AlignmentType.LEFT,
            spacing: { before: 240, after: 240, line: 360 } // 12 pkt etter = 240 twips
          }
        },
        heading3: {
          run: { size: 24, bold: true, italics: true, font, color: '000000' }, // 12pt fet og kursiv
          paragraph: { 
            alignment: AlignmentType.LEFT,
            spacing: { before: 180, after: 120, line: 360 } // 6 pkt etter = 120 twips
          }
        },
        document: {
          run: { font, size: 24, color: '000000' }, // 12pt
          paragraph: { 
            alignment: AlignmentType.LEFT, // Venstrejustert med frynsete høyrekant
            spacing: { line: 360, after: 140 } // 1,5 linjeavstand
          }
        }
      }
    },
    sections
  });

  return await Packer.toBlob(doc);
}


// -------------------------------------------------------------
// PDF (.PDF) EKSPORTMOTOR
// -------------------------------------------------------------

/**
 * Hovedfunksjon for eksport til PDF med nøyaktig samme formateringskrav:
 * - Marger: 25,4 mm (2,54 cm / 1 tomme) på alle sider
 * - Font: Times New Roman ('times')
 * - Overskrift 1: 14pt fet venstrestilt, 18 pkt etter, ALLTID ny side
 * - Overskrift 2: 12pt fet venstrestilt, 12 pkt etter
 * - Overskrift 3: 12pt fet og kursiv venstrestilt, 6 pkt etter
 * - Hovedtekst: 12pt, 1,5 linjeavstand, venstrejustert
 * - Lange sitater: Rykket inn 12,7 mm (1,27 cm), linjeavstand 2,0, 12pt, uten anførselstegn
 * - Referanseliste: Hengende innrykk 12,7 mm (1,27 cm)
 */
export async function exportToPdf(config: ExportConfig): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  // Marger: Nøyaktig 2,54 cm (25,4 mm) på alle sider
  const margin = 25.4;
  const marginTop = 25.4;
  const marginBottom = 25.4;
  const contentWidth = pageWidth - margin * 2; // 159.2 mm

  const tocEntries = extractTocEntries(config.content, config.outline);
  const nowFormatted = config.metadata.date || new Date().toLocaleDateString('nb-NO', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let currentPage = 1;

  // 1. FORSIDE
  if (config.includeCoverPage) {
    renderPdfCoverPage(doc, config.coverTheme, config.metadata, nowFormatted, pageWidth, pageHeight, margin, contentWidth);
    doc.addPage();
    currentPage++;
  }

  // Funksjon for topp- og bunntekst på vanlige sider
  const renderHeaderAndFooter = (pageIdx: number) => {
    // Header
    if (config.headerFooter.includeHeader) {
      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);

      const headerText = config.headerFooter.headerText || `${config.metadata.title} | ${config.metadata.assignmentType}`;
      if (config.headerFooter.headerAlignment === 'right') {
        doc.text(headerText, pageWidth - margin, marginTop - 10, { align: 'right' });
      } else if (config.headerFooter.headerAlignment === 'center') {
        doc.text(headerText, pageWidth / 2, marginTop - 10, { align: 'center' });
      } else {
        doc.text(headerText, margin, marginTop - 10, { align: 'left' });
      }

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, marginTop - 7, pageWidth - margin, marginTop - 7);
    }

    // Footer
    if (config.headerFooter.includeFooter || config.headerFooter.includePageNumber) {
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - marginBottom + 7, pageWidth - margin, pageHeight - marginBottom + 7);

      const footerText = config.headerFooter.includeFooter ? config.headerFooter.footerText : '';
      if (footerText) {
        doc.text(footerText, margin, pageHeight - marginBottom + 13);
      }

      if (config.headerFooter.includePageNumber) {
        let pageStr = `${pageIdx}`;
        if (config.headerFooter.pageNumberFormat === 'page_of_total') {
          pageStr = `Side ${pageIdx}`;
        } else if (config.headerFooter.pageNumberFormat === 'page_only') {
          pageStr = `Side ${pageIdx}`;
        }

        const posX = config.headerFooter.pageNumberPosition === 'center' 
          ? pageWidth / 2 
          : config.headerFooter.pageNumberPosition === 'left' 
            ? margin 
            : pageWidth - margin;
        const align = config.headerFooter.pageNumberPosition === 'center' 
          ? 'center' 
          : config.headerFooter.pageNumberPosition === 'left' 
            ? 'left' 
            : 'right';

        doc.text(pageStr, posX, pageHeight - marginBottom + 13, { align });
      }
    }
  };

  let cursorY = marginTop;

  // 2. INNHOLDSFORTEGNELSE
  if (config.toc.includeToC) {
    renderHeaderAndFooter(currentPage);

    // Innholdsfortegnelse tittel: 14pt fet, venstrestilt
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(config.toc.title || 'Innholdsfortegnelse', margin, cursorY);
    cursorY += 12; // 18 pkt avstand etter

    const filteredToc = config.toc.showSubchapters ? tocEntries : tocEntries.filter(e => e.level === 1);

    filteredToc.forEach((entry, idx) => {
      if (cursorY > pageHeight - marginBottom - 15) {
        doc.addPage();
        currentPage++;
        renderHeaderAndFooter(currentPage);
        cursorY = marginTop;
      }

      const isHoved = entry.level === 1;
      const isSub = entry.level === 2;
      const indent = isHoved ? 0 : isSub ? 8 : 14;

      doc.setFont('times', isHoved ? 'bold' : 'normal');
      doc.setFontSize(12); // 12pt
      doc.setTextColor(0, 0, 0);

      const entryLabel = `${entry.numbering}  ${entry.title}`;
      doc.text(entryLabel, margin + indent, cursorY);

      const pageNumStr = `${entry.pageEstimate || idx + 3}`;
      doc.text(pageNumStr, pageWidth - margin, cursorY, { align: 'right' });

      // Dotted leader
      const textWidth = doc.getTextWidth(entryLabel);
      const numWidth = doc.getTextWidth(pageNumStr);
      const dotStartX = margin + indent + textWidth + 3;
      const dotEndX = pageWidth - margin - numWidth - 3;

      if (dotEndX > dotStartX) {
        doc.setFont('times', 'normal');
        doc.setTextColor(148, 163, 184);
        const dots = '. '.repeat(Math.floor((dotEndX - dotStartX) / 3));
        doc.text(dots, dotStartX, cursorY);
      }

      cursorY += isHoved ? 7.5 : 6.5;
    });

    // Ny side for brødtekst
    doc.addPage();
    currentPage++;
    cursorY = marginTop;
  }

  // 3. BRØDTEKST
  renderHeaderAndFooter(currentPage);

  const lines = config.content.split('\n');
  let inReferenceList = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      cursorY += 3;
      continue;
    }

    // OVERSKRIFT 1: 14pt, venstrestilt og fet, 18 pkt avstand etter. Starter ALLTID på ny side!
    if (trimmed.startsWith('# ')) {
      const heading = trimmed.replace(/^#\s+/, '').trim();
      inReferenceList = isReferenceListHeading(heading);

      // Overskrift 1 starter ALLTID på ny side hvis vi ikke allerede er helt på toppen av en tom side
      if (cursorY > marginTop + 5) {
        doc.addPage();
        currentPage++;
        renderHeaderAndFooter(currentPage);
        cursorY = marginTop;
      }

      doc.setFont('times', 'bold');
      doc.setFontSize(14); // 14pt
      doc.setTextColor(0, 0, 0);
      doc.text(heading, margin, cursorY);
      cursorY += 6.35; // 18 pkt avstand etter = 6.35 mm
      continue;
    }

    // OVERSKRIFT 2: 12pt, venstrestilt og fet, 12 pkt avstand etter
    if (trimmed.startsWith('## ')) {
      const heading = trimmed.replace(/^##\s+/, '').trim();
      inReferenceList = isReferenceListHeading(heading);

      if (cursorY > pageHeight - marginBottom - 20) {
        doc.addPage();
        currentPage++;
        renderHeaderAndFooter(currentPage);
        cursorY = marginTop;
      }

      cursorY += 3;
      doc.setFont('times', 'bold');
      doc.setFontSize(12); // 12pt
      doc.setTextColor(0, 0, 0);
      doc.text(heading, margin, cursorY);
      cursorY += 4.23; // 12 pkt avstand etter = 4.23 mm
      continue;
    }

    // OVERSKRIFT 3: 12pt, venstrestilt, fet og kursiv, 6 pkt avstand etter
    if (trimmed.startsWith('### ')) {
      const heading = trimmed.replace(/^###\s+/, '').trim();

      if (cursorY > pageHeight - marginBottom - 18) {
        doc.addPage();
        currentPage++;
        renderHeaderAndFooter(currentPage);
        cursorY = marginTop;
      }

      cursorY += 2;
      // jsPDF times bolditalic
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(12); // 12pt
      doc.setTextColor(0, 0, 0);
      doc.text(heading, margin, cursorY);
      cursorY += 2.12; // 6 pkt avstand etter = 2.12 mm
      continue;
    }

    // LANGE SITATER (BLOKKSITAT):
    // 40 ord eller mer, eller '>':
    // - Fjern anførselstegnene
    // - Rykk inn hele sitatet 1,27 cm (12,7 mm) fra venstremargen
    // - Skriftstørrelse 12pt, linjeavstand 2,0
    const wordCountInLine = trimmed.split(/\s+/).length;
    const isMarkdownQuote = trimmed.startsWith('> ');
    const isLongDirectQuote = (wordCountInLine >= 40 && (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith('«') && trimmed.endsWith('»')) ||
      (trimmed.startsWith('“') && trimmed.endsWith('”'))
    ));

    if (isMarkdownQuote || isLongDirectQuote) {
      let quote = isMarkdownQuote ? trimmed.replace(/^>\s+/, '').trim() : trimmed;
      quote = cleanBlockquoteQuotes(quote);

      doc.setFont('times', 'normal');
      doc.setFontSize(12); // 12pt
      doc.setTextColor(0, 0, 0);

      const quoteIndent = 12.7; // 1,27 cm innrykk
      const quoteWidth = contentWidth - quoteIndent;
      const splitQuote = doc.splitTextToSize(quote, quoteWidth);

      cursorY += 2;
      splitQuote.forEach((qLine: string) => {
        if (cursorY > pageHeight - marginBottom - 10) {
          doc.addPage();
          currentPage++;
          renderHeaderAndFooter(currentPage);
          cursorY = marginTop;
        }
        doc.text(qLine, margin + quoteIndent, cursorY);
        cursorY += 8.47; // Linjeavstand 2,0 ved 12pt (24pt = 8.47 mm)
      });
      cursorY += 3;
      continue;
    }

    // HENGANDE INNRYKK I LITTERATURLISTEN (1,27 cm = 12,7 mm)
    // Første linje starter inntil venstremargen, etterfølgende linjer rykkes inn.
    if (inReferenceList) {
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);

      // Rens markdown
      const cleanRef = trimmed
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');

      const hangingIndent = 12.7; // 1,27 cm
      const splitRef = doc.splitTextToSize(cleanRef, contentWidth);

      if (cursorY > pageHeight - marginBottom - 15) {
        doc.addPage();
        currentPage++;
        renderHeaderAndFooter(currentPage);
        cursorY = marginTop;
      }

      splitRef.forEach((refLine: string, lineIdx: number) => {
        if (cursorY > pageHeight - marginBottom - 10) {
          doc.addPage();
          currentPage++;
          renderHeaderAndFooter(currentPage);
          cursorY = marginTop;
        }
        // Første linje ved venstremarg, resterende linjer rykket inn 1,27 cm
        const lineX = lineIdx === 0 ? margin : margin + hangingIndent;
        doc.text(refLine, lineX, cursorY);
        cursorY += 6.35; // 1,5 linjeavstand
      });
      cursorY += 3; // Avstand mellom referansene
      continue;
    }

    // Punktliste
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.replace(/^[-*]\s+/, '').trim();
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);

      const splitItem = doc.splitTextToSize(itemText, contentWidth - 8);
      doc.circle(margin + 2, cursorY - 1, 0.7, 'F');

      splitItem.forEach((pLine: string) => {
        if (cursorY > pageHeight - marginBottom - 10) {
          doc.addPage();
          currentPage++;
          renderHeaderAndFooter(currentPage);
          cursorY = marginTop;
        }
        doc.text(pLine, margin + 6, cursorY);
        cursorY += 6.35; // 1,5 linjeavstand
      });
      continue;
    }

    // VANLIG BRØDTEKST:
    // - 12pt skriftstørrelse
    // - Linjeavstand 1,5 (6,35 mm ved 12pt)
    // - ALLTID venstrejustert (frynsete høyrekant)
    doc.setFont('times', 'normal');
    doc.setFontSize(12); // 12pt
    doc.setTextColor(0, 0, 0);

    const cleanText = trimmed
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1');

    const splitText = doc.splitTextToSize(cleanText, contentWidth);
    splitText.forEach((pLine: string) => {
      if (cursorY > pageHeight - marginBottom - 10) {
        doc.addPage();
        currentPage++;
        renderHeaderAndFooter(currentPage);
        cursorY = marginTop;
      }
      // Venstrejustert (ikke justify)
      doc.text(pLine, margin, cursorY);
      cursorY += 6.35; // 1,5 linjeavstand (18 pt = 6.35 mm)
    });
    cursorY += 2.5; // Avsnittsavstand
  }

  return doc.output('blob');
}

/**
 * Rendrer forsiden for PDF med standard Times New Roman og 2,54 cm marger
 */
function renderPdfCoverPage(
  doc: jsPDF, 
  theme: CoverTheme, 
  meta: DocumentExportMetadata, 
  dateStr: string,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
) {
  if (theme === 'classic') {
    // 1. KLASSISK AKADEMISK
    let y = 65;

    if (meta.institution) {
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(51, 65, 85);
      doc.text(meta.institution.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 10;
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text((meta.assignmentType || 'FAGOPPGAVE').toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 24;

    // Tittel (16pt bold)
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    const splitTitle = doc.splitTextToSize(meta.title || 'Uten tittel', contentWidth);
    splitTitle.forEach((line: string) => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 8;
    });

    // Dobbel linje
    y += 3;
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.6);
    doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
    doc.line(pageWidth / 2 - 40, y + 1.2, pageWidth / 2 + 40, y + 1.2);
    y += 10;

    // Problemstilling / Undertittel
    if (meta.subtitle) {
      doc.setFont('times', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      const splitSub = doc.splitTextToSize(meta.subtitle, contentWidth - 20);
      splitSub.forEach((line: string) => {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 6.5;
      });
    }

    // Bunnblokk
    let bottomY = 220;
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);

    const linesToPrint = [
      meta.authorName ? `Forfatter: ${meta.authorName}` : '',
      meta.candidateNumber ? `Kandidatnummer: ${meta.candidateNumber}` : '',
      meta.courseCode ? `Emnekode: ${meta.courseCode}` : '',
      meta.semester ? `Semester: ${meta.semester}` : '',
      meta.supervisor ? `Veileder: ${meta.supervisor}` : '',
      meta.wordCount ? `Ordtelling: ca. ${meta.wordCount.toLocaleString('nb-NO')} ord` : '',
      `Innleveringsdato: ${dateStr}`
    ].filter(Boolean);

    linesToPrint.forEach(l => {
      doc.text(l, pageWidth / 2, bottomY, { align: 'center' });
      bottomY += 6.5;
    });

  } else if (theme === 'modern') {
    // 2. MODERNE NORDISK
    doc.setFillColor(30, 58, 138);
    doc.rect(margin, 40, 3, 20, 'F');

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138);
    doc.text((meta.institution || 'HØGSKOLE').toUpperCase(), margin + 8, 46);

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text(meta.assignmentType || 'Akademisk oppgave', margin + 8, 54);

    let y = 80;
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const splitTitle = doc.splitTextToSize(meta.title || 'Uten tittel', contentWidth);
    splitTitle.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 9;
    });

    // Aksent skillelinje
    y += 2;
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + 45, y);
    y += 12;

    if (meta.subtitle) {
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      const splitSub = doc.splitTextToSize(meta.subtitle, contentWidth);
      splitSub.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 7;
      });
    }

    // Metadata-blokk
    let bottomY = 215;
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, bottomY - 6, contentWidth, 54, 3, 3, 'FD');

    const printMetaRow = (label: string, val: string, currY: number) => {
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text(label.toUpperCase(), margin + 6, currY);

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(val, margin + 55, currY);
    };

    printMetaRow('Student:', `${meta.authorName || 'Navn'} ${meta.candidateNumber ? `(Kandidat: ${meta.candidateNumber})` : ''}`, bottomY);
    bottomY += 8.5;
    printMetaRow('Emne / Kode:', `${meta.courseCode || 'Ikke oppgitt'} ${meta.semester ? `• ${meta.semester}` : ''}`, bottomY);
    bottomY += 8.5;
    if (meta.supervisor) {
      printMetaRow('Veileder:', meta.supervisor, bottomY);
      bottomY += 8.5;
    }
    printMetaRow('Dato & Omfang:', `${dateStr} ${meta.wordCount ? `• ${meta.wordCount.toLocaleString('nb-NO')} ord` : ''}`, bottomY);

  } else if (theme === 'formal') {
    // 3. FORMELL EKSAMEN & RAPPORT
    let y = 35;
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, contentWidth, 12, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('EKSAMENSBESVARELSE / FORMELT ARBEIDSKRAV', pageWidth / 2, y + 8, { align: 'center' });

    y = 80;
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const splitTitle = doc.splitTextToSize(meta.title || 'Oppgavetittel', contentWidth);
    splitTitle.forEach((line: string) => {
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 9;
    });

    if (meta.subtitle) {
      y += 2;
      doc.setFont('times', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      const splitSub = doc.splitTextToSize(meta.subtitle, contentWidth - 20);
      splitSub.forEach((line: string) => {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 6;
      });
    }

    // Detaljert tabell-ramme
    let tableY = 160;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.rect(margin, tableY, contentWidth, 60);

    const rows = [
      ['Kandidat / Student:', `${meta.authorName || 'Navn'} ${meta.candidateNumber ? `(Kandidatnr: ${meta.candidateNumber})` : ''}`],
      ['Emnekode og tittel:', `${meta.courseCode || 'BLU'} — ${meta.assignmentType || ''}`],
      ['Institusjon:', meta.institution || 'Høgskole'],
      ['Innleveringsdato:', dateStr],
      ['Beregnet ordantall:', meta.wordCount ? `${meta.wordCount.toLocaleString('nb-NO')} ord` : 'Ikke oppgitt']
    ];

    rows.forEach((r, idx) => {
      const rowY = tableY + 8 + idx * 10;
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text(r[0], margin + 6, rowY);

      doc.setFont('times', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(r[1], margin + 55, rowY);

      if (idx < rows.length - 1) {
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, rowY + 3.5, pageWidth - margin, rowY + 3.5);
      }
    });

    // Erklæring
    let declY = 240;
    doc.setFont('times', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    const declText = 'Erklæring: Jeg bekrefter at besvarelsen er mitt eget selvstendige arbeid, og at alle kilder, sitater og referanser er oppgitt i henhold til gjeldende retningslinjer for akademisk redelighet (APA 7).';
    const splitDecl = doc.splitTextToSize(declText, contentWidth);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, declY - 4, pageWidth - margin, declY - 4);
    splitDecl.forEach((line: string) => {
      doc.text(line, margin, declY);
      declY += 5;
    });

  } else {
    // 4. PEDAGOGISK & PRAKSIS
    let y = 45;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(13, 148, 136);
    doc.text('BARNEHAGELÆRERUTDANNINGEN', margin, y);

    doc.setFont('times', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(` • ${meta.institution || 'HØGSKOLE'}`, margin + doc.getTextWidth('BARNEHAGELÆRERUTDANNINGEN'), y);
    y += 8;

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text((meta.assignmentType || 'PRAKSISOPPGAVE / DIDAKTISK DOKUMENTASJON').toUpperCase(), margin, y);

    y = 80;
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const splitTitle = doc.splitTextToSize(meta.title || 'Uten tittel', contentWidth);
    splitTitle.forEach((line: string) => {
      doc.text(line, margin, y);
      y += 9;
    });

    y += 2;
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + 45, y);
    y += 12;

    if (meta.subtitle) {
      doc.setFont('times', 'italic');
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      const splitSub = doc.splitTextToSize(`Pedagogisk fokus:\n${meta.subtitle}`, contentWidth);
      splitSub.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 6.5;
      });
    }

    // Praksis infoboks
    let bottomY = 190;
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(204, 251, 241);
    doc.roundedRect(margin, bottomY - 5, contentWidth, 75, 3, 3, 'FD');

    const praksisRows = [
      ['Student / Forfatter:', `${meta.authorName || 'Navn'} ${meta.candidateNumber ? `(Kand. ${meta.candidateNumber})` : ''}`],
      ['Praksisbarnehage:', meta.practicePlace || 'Ikke angitt'],
      ['Barnegruppe / Alder:', meta.targetGroup || 'Småbarn / Storbarn'],
      ['Praksislærer / Veileder:', meta.supervisor || 'Ikke oppgitt'],
      ['Fagområde / Rammeplan:', meta.courseCode || 'Barns medvirkning og lek'],
      ['Dato & Ordtelling:', `${dateStr} ${meta.wordCount ? `(${meta.wordCount.toLocaleString('nb-NO')} ord)` : ''}`]
    ];

    praksisRows.forEach((r, idx) => {
      const rowY = bottomY + 6 + idx * 11;
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(13, 148, 136);
      doc.text(r[0], margin + 6, rowY);

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(r[1], margin + 55, rowY);
    });
  }
}

/**
 * Laste ned Blob med filnavn
 */
export function downloadFile(blob: Blob, filename: string): void {
  saveAs(blob, filename);
}
