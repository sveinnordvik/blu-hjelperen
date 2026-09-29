import pptxgen from 'pptxgenjs';
import { PresentationSlide, SlideLayout } from '../services/geminiService';
import { SlideThemeId } from '../components/presentation/SlideCanvas';
import { PresentationBrandingSettings, DEFAULT_BRANDING_SETTINGS } from './presentationSettings';

export interface PptxExportOptions {
  title: string;
  slides: PresentationSlide[];
  themeId?: SlideThemeId;
  globalBackground?: string;
  brandingSettings?: PresentationBrandingSettings;
}

// Fargekonfigurasjoner for pptxgen (hex uten #)
interface ThemeColors {
  bgColor: string;
  titleColor: string;
  subtitleColor: string;
  textColor: string;
  accentColor: string;
  cardBg: string;
  cardBorder: string;
  footerColor: string;
  isDark: boolean;
}

const PPTX_THEME_COLORS: Record<SlideThemeId, ThemeColors> = {
  'pedagogisk-varme': {
    bgColor: 'FDFBF7',
    titleColor: '1C1917',
    subtitleColor: '57534E',
    textColor: '292524',
    accentColor: 'D97706',
    cardBg: 'FFFFFF',
    cardBorder: 'FDE68A',
    footerColor: '78716C',
    isDark: false
  },
  'akademisk-ren': {
    bgColor: 'F8FAFC',
    titleColor: '0F172A',
    subtitleColor: '475569',
    textColor: '1E293B',
    accentColor: '4F46E5',
    cardBg: 'FFFFFF',
    cardBorder: 'E2E8F0',
    footerColor: '64748B',
    isDark: false
  },
  'natur-lek': {
    bgColor: 'F6FAF7',
    titleColor: '14261C',
    subtitleColor: '3D5A45',
    textColor: '1C3325',
    accentColor: '059669',
    cardBg: 'FFFFFF',
    cardBorder: 'A7F3D0',
    footerColor: '47624F',
    isDark: false
  },
  'nordisk-lys': {
    bgColor: 'F0F7FF',
    titleColor: '0C2340',
    subtitleColor: '3E5C76',
    textColor: '1D3557',
    accentColor: '0284C7',
    cardBg: 'FFFFFF',
    cardBorder: 'BAE6FD',
    footerColor: '5B7083',
    isDark: false
  },
  'moderne-mork': {
    bgColor: '0F172A',
    titleColor: 'FFFFFF',
    subtitleColor: '94A3B8',
    textColor: 'E2E8F0',
    accentColor: '818CF8',
    cardBg: '1E293B',
    cardBorder: '334155',
    footerColor: '64748B',
    isDark: true
  }
};

/**
 * Genererer og laster ned en ekte Microsoft PowerPoint (.pptx) presentasjon.
 * Bruker 'LAYOUT_WIDE' (13.333 x 7.5 tommer) for 100% kompatibilitet med MS PowerPoint,
 * Google Slides, Keynote og LibreOffice.
 */
export async function exportToPowerPoint(options: PptxExportOptions): Promise<string> {
  const { title, slides, themeId = 'pedagogisk-varme', globalBackground, brandingSettings } = options;
  const branding = brandingSettings || DEFAULT_BRANDING_SETTINGS;

  const pptx = new pptxgen();

  // Bruk den innbygde 16:9 Widescreen-størrelsen i PowerPoint (13.333 x 7.5 tommer)
  pptx.layout = 'LAYOUT_WIDE';

  pptx.author = branding.footerText || 'BLU-Hjelperen (Barnehagelærerutdanningen)';
  pptx.company = 'BLU-Hjelperen';
  pptx.title = title || 'Akademisk Presentasjon';
  pptx.subject = 'BLU Presentasjon med talemanus';

  const themeColors = PPTX_THEME_COLORS[themeId] || PPTX_THEME_COLORS['pedagogisk-varme'];

  slides.forEach((slideData, idx) => {
    const slide = pptx.addSlide();
    const slideNum = idx + 1;
    const total = slides.length;
    const activeLayout: SlideLayout = slideData.layout || (slideNum === 1 ? 'title' : 'bullets');

    // 1. SETT BAKGRUNN
    const bgImage = slideData.backgroundImage || globalBackground;
    if (bgImage && bgImage.startsWith('data:image')) {
      slide.background = { data: bgImage };
    } else if (bgImage && (bgImage.startsWith('http://') || bgImage.startsWith('https://'))) {
      slide.background = { path: bgImage };
    } else {
      slide.background = { color: themeColors.bgColor };
    }

    // Garanter at tekst på bakgrunnsbilder har 100% kontrast med en halvtransparent overflate
    if (bgImage) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.333,
        h: 7.5,
        fill: { 
          color: themeColors.isDark ? '0F172A' : 'FFFFFF', 
          transparency: themeColors.isDark ? 25 : 30 
        }
      });
    }

    // 2. LEGG TIL MUNTLIG TALEMANUS SOM FOREDRAGSHOLDERNOTATER
    if (slideData.script && slideData.script.trim()) {
      const notesHeader = `TALEMANUS (Slide ${slideNum} - ${slideData.title}):\n`;
      slide.addNotes(notesHeader + slideData.script.trim());
    }

    // 3. TOPP-METADATA: TOPP-MERKE OG SLIDE-TELLER
    if (branding.showTopBadge && branding.topBadgeText) {
      slide.addText(branding.topBadgeText.toUpperCase(), {
        x: 0.8,
        y: 0.4,
        w: 6.0,
        h: 0.35,
        fontSize: 10,
        bold: true,
        color: themeColors.accentColor,
        charSpacing: 1.5
      });
    }

    slide.addText(`${slideNum} / ${total}`, {
      x: 10.033,
      y: 0.4,
      w: 2.5,
      h: 0.35,
      fontSize: 10,
      bold: true,
      align: 'right',
      color: themeColors.footerColor
    });

    // 4. INNHOLD ETTER LAYOUT
    if (activeLayout === 'title') {
      // TITTELSLIDE (ÅPNING)
      if (branding.showCategoryBadge && branding.categoryBadgeText) {
        slide.addText(branding.categoryBadgeText, {
          x: 0.8,
          y: 1.3,
          w: 7.0,
          h: 0.45,
          fontSize: 12,
          bold: true,
          color: themeColors.accentColor,
          fill: { color: themeColors.cardBg, transparency: 10 },
          line: { color: themeColors.cardBorder, width: 1 },
          margin: 8
        });
      }

      slide.addText(slideData.title, {
        x: 0.8,
        y: branding.showCategoryBadge ? 1.9 : 1.6,
        w: 11.733,
        h: 1.8,
        fontSize: slideData.title.length > 50 ? 30 : 36,
        bold: true,
        color: themeColors.titleColor,
        valign: 'middle',
        fit: 'shrink',
        lineSpacing: 38
      });

      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 0.8,
          y: 3.8,
          w: 11.733,
          h: 1.0,
          fontSize: 18,
          color: themeColors.subtitleColor,
          fit: 'shrink'
        });
      }

      if (slideData.bullets && slideData.bullets.length > 0) {
        const tagWidth = Math.min(11.733 / Math.max(1, slideData.bullets.length), 3.6);
        slideData.bullets.forEach((bulletText, bIdx) => {
          slide.addText(`• ${bulletText}`, {
            x: 0.8 + bIdx * (tagWidth + 0.2),
            y: 5.0,
            w: tagWidth,
            h: 0.7,
            fontSize: 12,
            bold: true,
            color: themeColors.textColor,
            fill: { color: themeColors.cardBg, transparency: 10 },
            line: { color: themeColors.cardBorder, width: 1 },
            margin: 8,
            fit: 'shrink',
            valign: 'middle'
          });
        });
      }

    } else if (activeLayout === 'two-column') {
      // TO KOLONNER
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.85,
        w: 11.733,
        h: 0.8,
        fontSize: slideData.title.length > 50 ? 24 : 28,
        bold: true,
        color: themeColors.titleColor,
        fit: 'shrink',
        valign: 'middle'
      });

      const leftBullets = slideData.bullets || [];
      const rightBullets = slideData.bulletsRight && slideData.bulletsRight.length > 0
        ? slideData.bulletsRight
        : (leftBullets.length > 2 ? leftBullets.slice(Math.ceil(leftBullets.length / 2)) : ['Drøfting og didaktiske konsekvenser', 'Forankring i praksis']);
      const displayLeft = slideData.bulletsRight ? leftBullets : (leftBullets.length > 2 ? leftBullets.slice(0, Math.ceil(leftBullets.length / 2)) : leftBullets);

      // Venstre kolonne
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8,
        y: 1.8,
        w: 5.7,
        h: 4.8,
        fill: { color: themeColors.cardBg, transparency: 5 },
        line: { color: themeColors.cardBorder, width: 1 }
      });

      slide.addText('TEORETISK PERSPEKTIV / RAMMEVERK', {
        x: 1.1,
        y: 2.0,
        w: 5.1,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: themeColors.accentColor,
        fit: 'shrink'
      });

      const leftTextRuns = displayLeft.map(b => ({
        text: b,
        options: {
          bullet: true,
          color: themeColors.textColor,
          fontSize: 13,
          breakLine: true
        }
      }));

      slide.addText(leftTextRuns, {
        x: 1.1,
        y: 2.5,
        w: 5.1,
        h: 3.9,
        lineSpacing: 22,
        fit: 'shrink',
        valign: 'top'
      });

      // Høyre kolonne
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.833,
        y: 1.8,
        w: 5.7,
        h: 4.8,
        fill: { color: themeColors.cardBg, transparency: 5 },
        line: { color: themeColors.cardBorder, width: 1 }
      });

      slide.addText('DIDAKTISK PRAKSIS / REFLEKSJON', {
        x: 7.133,
        y: 2.0,
        w: 5.1,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: themeColors.accentColor,
        fit: 'shrink'
      });

      const rightTextRuns = rightBullets.map(b => ({
        text: b,
        options: {
          bullet: true,
          color: themeColors.textColor,
          fontSize: 13,
          breakLine: true
        }
      }));

      slide.addText(rightTextRuns, {
        x: 7.133,
        y: 2.5,
        w: 5.1,
        h: 3.9,
        lineSpacing: 22,
        fit: 'shrink',
        valign: 'top'
      });

    } else if (activeLayout === 'quote') {
      // SITAT / TEORI
      const quoteText = slideData.highlightText || (slideData.bullets && slideData.bullets[0]) || slideData.title;
      const author = slideData.quoteAuthor || 'Rammeplanen for barnehagen / Fagteori';

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.5,
        y: 1.6,
        w: 10.333,
        h: 5.0,
        fill: { color: themeColors.cardBg, transparency: 5 },
        line: { color: themeColors.cardBorder, width: 1.5 }
      });

      slide.addText(`«${quoteText}»`, {
        x: 2.0,
        y: 2.0,
        w: 9.333,
        h: 2.8,
        fontSize: quoteText.length > 120 ? 20 : 24,
        bold: true,
        italic: true,
        align: 'center',
        valign: 'middle',
        color: themeColors.titleColor,
        lineSpacing: 34,
        fit: 'shrink'
      });

      slide.addText(`— ${author}`, {
        x: 2.0,
        y: 5.0,
        w: 9.333,
        h: 0.5,
        fontSize: 13,
        bold: true,
        align: 'center',
        color: themeColors.accentColor
      });

      if (slideData.bullets && slideData.bullets.length > 1) {
        slide.addText(`Refleksjon: ${slideData.bullets[1]}`, {
          x: 2.0,
          y: 5.6,
          w: 9.333,
          h: 0.7,
          fontSize: 12,
          align: 'center',
          color: themeColors.subtitleColor,
          fit: 'shrink'
        });
      }

    } else if (activeLayout === 'highlight') {
      // KJERNEFREMHEVING
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.85,
        w: 11.733,
        h: 0.8,
        fontSize: slideData.title.length > 50 ? 24 : 28,
        bold: true,
        color: themeColors.titleColor,
        fit: 'shrink',
        valign: 'middle'
      });

      const hlText = slideData.highlightText || (slideData.bullets && slideData.bullets[0]) || 'Viktig pedagogisk innsikt';

      slide.addText(hlText, {
        x: 1.2,
        y: 1.8,
        w: 10.933,
        h: 2.4,
        fontSize: hlText.length > 100 ? 18 : 22,
        bold: true,
        align: 'center',
        valign: 'middle',
        color: themeColors.titleColor,
        fill: { color: themeColors.cardBg, transparency: 5 },
        line: { color: themeColors.accentColor, width: 2 },
        margin: 16,
        fit: 'shrink'
      });

      if (slideData.bullets && slideData.bullets.length > 1) {
        const subBullets = slideData.bullets.slice(1).map(b => ({
          text: b,
          options: {
            bullet: true,
            color: themeColors.textColor,
            fontSize: 13,
            breakLine: true
          }
        }));

        slide.addText(subBullets, {
          x: 1.2,
          y: 4.5,
          w: 10.933,
          h: 2.1,
          lineSpacing: 22,
          fit: 'shrink',
          valign: 'top'
        });
      }

    } else {
      // STANDARD KULEPUNKTER MED KORTDESIGN (BULLETS)
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.85,
        w: 11.733,
        h: 0.8,
        fontSize: slideData.title.length > 50 ? 24 : 28,
        bold: true,
        color: themeColors.titleColor,
        fit: 'shrink',
        valign: 'middle'
      });

      const bullets = slideData.bullets || [];
      const totalBullets = bullets.length;

      if (totalBullets > 0) {
        const availableH = 4.8;
        const startY = 1.8;
        const gap = 0.15;
        const cardH = Math.min(1.3, (availableH - (totalBullets - 1) * gap) / totalBullets);

        bullets.forEach((bullet, bIdx) => {
          const cardY = startY + bIdx * (cardH + gap);

          slide.addText(`✓  ${bullet}`, {
            x: 0.8,
            y: cardY,
            w: 11.733,
            h: cardH,
            fontSize: totalBullets > 4 ? 13 : 15,
            bold: true,
            color: themeColors.textColor,
            fill: { color: themeColors.cardBg, transparency: 5 },
            line: { color: themeColors.cardBorder, width: 1 },
            margin: 12,
            fit: 'shrink',
            valign: 'middle'
          });
        });
      }
    }

    // 5. FOOTER BUNNTEKST & LAYOUT-TAG
    if (branding.showFooter) {
      const footerContent = branding.showSlideTitleInFooter && title
        ? `${branding.footerText} • ${slideData.title}`
        : branding.footerText;

      slide.addText(footerContent, {
        x: 0.8,
        y: 6.9,
        w: 8.0,
        h: 0.35,
        fontSize: 9,
        color: themeColors.footerColor,
        fit: 'shrink'
      });
    }

    if (branding.showLayoutTag) {
      const layoutTagText = branding.layoutTagCustomText || `${activeLayout.toUpperCase()} • Slide ${slideNum}`;
      slide.addText(layoutTagText, {
        x: 9.033,
        y: 6.9,
        w: 3.5,
        h: 0.35,
        fontSize: 9,
        align: 'right',
        color: themeColors.footerColor
      });
    }
  });

  // Generer filnavn
  const sanitizedTitle = (title || 'BLU-presentasjon')
    .replace(/[^a-zA-Z0-9æøåÆØÅ\-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const fileName = `${sanitizedTitle}.pptx`;

  // Start direkte nedlasting i nettleseren
  await pptx.writeFile({ fileName });
  return fileName;
}
