import pptxgen from 'pptxgenjs';
import { PresentationSlide, SlideLayout } from '../services/geminiService';
import { SlideThemeId, SLIDE_THEMES } from '../components/presentation/SlideCanvas';
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
 * Kompatibel med Microsoft PowerPoint, Google Slides, Keynote og LibreOffice.
 * Alle talemanus legges automatisk inn som «Presenter Notes» (foredragsholdernotater).
 */
export async function exportToPowerPoint(options: PptxExportOptions): Promise<string> {
  const { title, slides, themeId = 'pedagogisk-varme', globalBackground, brandingSettings } = options;
  const branding = brandingSettings || DEFAULT_BRANDING_SETTINGS;

  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
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

    // 1. Sett bakgrunn
    const bgImage = slideData.backgroundImage || globalBackground;
    if (bgImage && bgImage.startsWith('data:image')) {
      slide.background = { data: bgImage };
    } else if (bgImage && (bgImage.startsWith('http://') || bgImage.startsWith('https://'))) {
      slide.background = { path: bgImage };
    } else {
      slide.background = { color: themeColors.bgColor };
    }

    // 2. LEGG TIL MUNTLIG TALEMANUS SOM FOREDRAGSHOLDERNOTATER
    if (slideData.script && slideData.script.trim()) {
      const notesHeader = `TALEMANUS (Slide ${slideNum} - ${slideData.title}):\n`;
      slide.addNotes(notesHeader + slideData.script.trim());
    }

    // 3. TOPP-METADATA: ELEMENT 1 (Topp-merke / Badge)
    if (branding.showTopBadge && branding.topBadgeText) {
      slide.addText(branding.topBadgeText.toUpperCase(), {
        x: 0.8,
        y: 0.4,
        w: 5.5,
        h: 0.35,
        fontSize: 9,
        bold: true,
        color: themeColors.accentColor,
        charSpacing: 1.5
      });
    }

    slide.addText(`${slideNum} / ${total}`, {
      x: 10.0,
      y: 0.4,
      w: 2.5,
      h: 0.35,
      fontSize: 9,
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
          y: 1.25,
          w: 6.0,
          h: 0.4,
          fontSize: 11,
          bold: true,
          color: themeColors.accentColor
        });
      }

      slide.addText(slideData.title, {
        x: 0.8,
        y: branding.showCategoryBadge ? 1.7 : 1.5,
        w: 11.5,
        h: 1.6,
        fontSize: 34,
        bold: true,
        color: themeColors.titleColor,
        valign: 'middle',
        lineSpacing: 40
      });

      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 0.8,
          y: 3.5,
          w: 11.5,
          h: 0.8,
          fontSize: 18,
          color: themeColors.subtitleColor
        });
      }

      if (slideData.bullets && slideData.bullets.length > 0) {
        const bulletObjects = slideData.bullets.map(b => ({
          text: b,
          options: {
            bullet: true,
            color: themeColors.textColor,
            fontSize: 14,
            breakLine: true
          }
        }));

        slide.addText(bulletObjects, {
          x: 0.8,
          y: 4.5,
          w: 11.0,
          h: 1.8,
          lineSpacing: 24
        });
      }

    } else if (activeLayout === 'two-column') {
      // TO KOLONNER
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.85,
        w: 11.5,
        h: 0.9,
        fontSize: 26,
        bold: true,
        color: themeColors.titleColor
      });

      const leftBullets = slideData.bullets || [];
      const rightBullets = slideData.bulletsRight && slideData.bulletsRight.length > 0
        ? slideData.bulletsRight
        : leftBullets.slice(Math.ceil(leftBullets.length / 2));
      const displayLeft = slideData.bulletsRight ? leftBullets : leftBullets.slice(0, Math.ceil(leftBullets.length / 2));

      // Venstre boks
      slide.addShape('rect' as any, {
        x: 0.8,
        y: 1.9,
        w: 5.4,
        h: 4.4,
        fill: { color: themeColors.cardBg },
        line: { color: themeColors.cardBorder, width: 1 }
      });

      slide.addText('TEORETISK PERSPEKTIV / RAMMEVERK', {
        x: 1.1,
        y: 2.1,
        w: 4.8,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: themeColors.accentColor
      });

      const leftTextRuns = displayLeft.map(b => ({
        text: b,
        options: {
          bullet: true,
          color: themeColors.textColor,
          fontSize: 14,
          breakLine: true
        }
      }));

      slide.addText(leftTextRuns, {
        x: 1.1,
        y: 2.6,
        w: 4.8,
        h: 3.4,
        lineSpacing: 22
      });

      // Høyre boks
      slide.addShape('rect' as any, {
        x: 6.6,
        y: 1.9,
        w: 5.4,
        h: 4.4,
        fill: { color: themeColors.cardBg },
        line: { color: themeColors.cardBorder, width: 1 }
      });

      slide.addText('DIDAKTISK PRAKSIS / REFLEKSJON', {
        x: 6.9,
        y: 2.1,
        w: 4.8,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: themeColors.accentColor
      });

      const rightTextRuns = rightBullets.map(b => ({
        text: b,
        options: {
          bullet: true,
          color: themeColors.textColor,
          fontSize: 14,
          breakLine: true
        }
      }));

      slide.addText(rightTextRuns, {
        x: 6.9,
        y: 2.6,
        w: 4.8,
        h: 3.4,
        lineSpacing: 22
      });

    } else if (activeLayout === 'quote') {
      // SITAT / TEORI
      const quoteText = slideData.highlightText || slideData.bullets[0] || slideData.title;
      const author = slideData.quoteAuthor || 'Rammeplanen for barnehagen / Fagteori';

      slide.addShape('rect' as any, {
        x: 1.5,
        y: 1.8,
        w: 10.3,
        h: 4.2,
        fill: { color: themeColors.cardBg },
        line: { color: themeColors.cardBorder, width: 1.5 }
      });

      slide.addText(`«${quoteText}»`, {
        x: 2.0,
        y: 2.2,
        w: 9.3,
        h: 2.4,
        fontSize: 22,
        bold: true,
        italic: true,
        align: 'center',
        valign: 'middle',
        color: themeColors.titleColor,
        lineSpacing: 32
      });

      slide.addText(`— ${author}`, {
        x: 2.0,
        y: 4.7,
        w: 9.3,
        h: 0.5,
        fontSize: 13,
        bold: true,
        align: 'center',
        color: themeColors.accentColor
      });

      if (slideData.bullets && slideData.bullets.length > 1) {
        slide.addText(`Refleksjon: ${slideData.bullets[1]}`, {
          x: 2.0,
          y: 5.2,
          w: 9.3,
          h: 0.5,
          fontSize: 11,
          align: 'center',
          color: themeColors.subtitleColor
        });
      }

    } else if (activeLayout === 'highlight') {
      // KJERNEFREMHEVING
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.85,
        w: 11.5,
        h: 0.9,
        fontSize: 26,
        bold: true,
        color: themeColors.titleColor
      });

      slide.addShape('rect' as any, {
        x: 1.5,
        y: 2.0,
        w: 10.3,
        h: 2.4,
        fill: { color: themeColors.cardBg },
        line: { color: themeColors.accentColor, width: 2 }
      });

      slide.addText('KJERNEBUDSKAP / DIDAKTISK KONSEKVENS', {
        x: 1.8,
        y: 2.2,
        w: 9.7,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: themeColors.accentColor
      });

      const hlText = slideData.highlightText || slideData.bullets[0] || 'Viktig pedagogisk innsikt';
      slide.addText(hlText, {
        x: 1.8,
        y: 2.6,
        w: 9.7,
        h: 1.5,
        fontSize: 20,
        bold: true,
        color: themeColors.titleColor,
        valign: 'middle'
      });

      if (slideData.bullets && slideData.bullets.length > 1) {
        const subBullets = slideData.bullets.slice(1).map(b => ({
          text: b,
          options: {
            bullet: true,
            color: themeColors.textColor,
            fontSize: 14,
            breakLine: true
          }
        }));

        slide.addText(subBullets, {
          x: 1.5,
          y: 4.7,
          w: 10.3,
          h: 1.7,
          lineSpacing: 22
        });
      }

    } else {
      // STANDARD KULEPUNKTER (BULLETS)
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.85,
        w: 11.5,
        h: 0.9,
        fontSize: 26,
        bold: true,
        color: themeColors.titleColor
      });

      const bulletObjects = (slideData.bullets || []).map(b => ({
        text: b,
        options: {
          bullet: true,
          color: themeColors.textColor,
          fontSize: 16,
          breakLine: true
        }
      }));

      slide.addText(bulletObjects, {
        x: 0.8,
        y: 2.0,
        w: 11.5,
        h: 4.4,
        lineSpacing: 30
      });
    }

    // 5. FOOTER BUNNTEKST & LAYOUT-TAG
    if (branding.showFooter) {
      const footerContent = branding.showSlideTitleInFooter && title
        ? `${branding.footerText} • ${slideData.title}`
        : branding.footerText;

      slide.addText(footerContent, {
        x: 0.8,
        y: 6.8,
        w: 8.0,
        h: 0.3,
        fontSize: 9,
        color: themeColors.footerColor
      });
    }

    if (branding.showLayoutTag) {
      const layoutTagText = branding.layoutTagCustomText || `${activeLayout.toUpperCase()} • Slide ${slideNum}`;
      slide.addText(layoutTagText, {
        x: 9.0,
        y: 6.8,
        w: 3.5,
        h: 0.3,
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
