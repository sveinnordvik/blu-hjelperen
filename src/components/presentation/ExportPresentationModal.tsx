import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Check, 
  FileText, 
  ExternalLink, 
  Sparkles, 
  Monitor, 
  Copy, 
  Printer, 
  HelpCircle,
  FolderDown,
  Layers
} from 'lucide-react';
import { exportToPowerPoint } from '../../lib/pptxExport';
import { PresentationSlide } from '../../services/geminiService';
import { SlideThemeId } from './SlideCanvas';
import { PresentationBrandingSettings } from '../../lib/presentationSettings';

interface ExportPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: PresentationSlide[];
  title: string;
  themeId: SlideThemeId;
  globalBackground?: string;
  brandingSettings?: PresentationBrandingSettings;
  onCopyAll: () => void;
  copiedAll: boolean;
}

export const ExportPresentationModal: React.FC<ExportPresentationModalProps> = ({
  isOpen,
  onClose,
  slides,
  title,
  themeId,
  globalBackground,
  brandingSettings,
  onCopyAll,
  copiedAll
}) => {
  if (!isOpen) return null;

  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localCopied, setLocalCopied] = useState(false);

  const handleDownloadPptx = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    setDownloadSuccess(null);
    try {
      const fileName = await exportToPowerPoint({
        title,
        slides,
        themeId,
        globalBackground,
        brandingSettings
      });
      setDownloadSuccess(fileName);
    } catch (err: any) {
      console.error('Feil under eksport til PowerPoint:', err);
      setErrorMsg('Kunne ikke eksportere til PowerPoint. Prøv igjen.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLocalCopyAll = async () => {
    if (!slides || slides.length === 0) return;
    const fullText = slides
      .map((s, idx) => 
        `========================================\n` +
        `LYSBILDE ${idx + 1}: ${s.title.toUpperCase()}\n` +
        `========================================\n` +
        (s.subtitle ? `UNDERTEKST: ${s.subtitle}\n\n` : '\n') +
        `STIKKORD / INNHOLD:\n${(s.bullets || []).map(b => `• ${b}`).join('\n')}\n\n` +
        `MUNTLIG TALEMANUS:\n${s.script || '(Ingen manus skrevet)'}\n`
      )
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(fullText);
      setLocalCopied(true);
      if (onCopyAll) onCopyAll();
      setTimeout(() => setLocalCopied(false), 2500);
    } catch (err) {
      console.error('Kopiering feilet:', err);
    }
  };

  const handlePrintPDF = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const slidesHtml = slides.map((s, idx) => `
      <div class="slide-page">
        <div class="slide-header">
          <span class="slide-num">Lysbilde ${idx + 1} av ${slides.length}</span>
          <span class="slide-tag">${s.layout ? s.layout.toUpperCase() : 'STANDARD'}</span>
        </div>
        <h2 class="slide-title">${s.title}</h2>
        ${s.subtitle ? `<p class="slide-subtitle">${s.subtitle}</p>` : ''}
        
        <div class="bullets-box">
          <h3 class="section-title">Stikkord / Lysbildeinnhold:</h3>
          <ul>
            ${(s.bullets || []).map(b => `<li>${b}</li>`).join('')}
          </ul>
        </div>

        ${s.script ? `
          <div class="script-box">
            <h3 class="section-title">Muntlig talemanus / Foredragsholdernotater:</h3>
            <p class="script-text">${s.script.replace(/\n/g, '<br/>')}</p>
          </div>
        ` : ''}
      </div>
    `).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title || 'BLU-Presentasjon'} - Utskrift & PDF</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; line-height: 1.5; background: #fff; }
          .doc-header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .doc-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0; }
          .doc-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
          .doc-brand { font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; }
          .slide-page { page-break-inside: avoid; break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
          .slide-header { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: #4f46e5; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
          .slide-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; }
          .slide-subtitle { font-size: 13px; font-weight: 600; color: #475569; margin: 0 0 14px 0; }
          .bullets-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; }
          .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 0 0 6px 0; }
          ul { margin: 0; padding-left: 18px; }
          li { font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px; }
          .script-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; }
          .script-text { font-size: 13px; color: #166534; margin: 0; white-space: pre-wrap; font-style: italic; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="doc-header">
          <div>
            <h1 class="doc-title">${title || 'Akademisk Presentasjon'}</h1>
            <div class="doc-sub">Klar for utskrift og PDF • Totalt ${slides.length} lysbilder med talemanus</div>
          </div>
          <div class="doc-brand">BLU-Hjelperen</div>
        </div>
        ${slidesHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/80 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                Eksporter presentasjon (.pptx)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Klar for Microsoft PowerPoint og Google Presentasjoner med automatiske talenotater
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
            title="Lukk"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* HOVEDKORT: LAST NED POWERPOINT */}
          <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-3xl text-white shadow-md space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 bg-white/20 backdrop-blur-xs text-[10px] font-black uppercase tracking-wider rounded-lg text-indigo-100">
                  Ekte .pptx-fil
                </span>
                <h4 className="text-xl font-black mt-2 leading-tight">
                  Last ned komplett PowerPoint-fil
                </h4>
                <p className="text-xs text-indigo-100/90 mt-1 leading-relaxed max-w-md">
                  Inkluderer alle {slides.length} lysbilder i 16:9 widescreen, formaterte layouts og <strong>det muntlige talemanuset lagt inn som foredragsholdernotater</strong> under hvert lysbilde.
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <FolderDown className="w-8 h-8 text-white" />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownloadPptx}
                disabled={isExporting}
                className="px-6 py-3 bg-white hover:bg-indigo-50 text-indigo-950 font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span>Lager PowerPoint-fil...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-indigo-600 stroke-[3]" />
                    <span>Last ned PowerPoint (.pptx)</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-indigo-200 font-medium">
                Kompatibel med PC, Mac, iPad og Google Disk
              </span>
            </div>

            {downloadSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-100 flex items-center gap-2 animate-in fade-in duration-150">
                <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>Filen <strong>{downloadSuccess}</strong> ble lastet ned til din datamaskin!</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-500/20 border border-rose-400/40 rounded-xl text-xs text-rose-100">
                {errorMsg}
              </div>
            )}
          </div>

          {/* VEILEDNING: HVORDAN BRUKE FILEN I GOOGLE PRESENTASJONER OG POWERPOINT */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Slik åpner og bruker du presentasjonen</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Google Slides */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center">
                    G
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Google Presentasjoner (Google Slides)
                  </span>
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Last ned <strong>.pptx-filen</strong> over.</li>
                  <li>Gå til <strong>Google Disk</strong> (drive.google.com).</li>
                  <li>Dra filen inn i Google Disk.</li>
                  <li>Dobbeltklikk på filen for å åpne. Talenotatene vises automatisk under hvert lysbilde!</li>
                </ol>
              </div>

              {/* Microsoft PowerPoint */}
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-800 text-xs font-black flex items-center justify-center">
                    P
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Microsoft PowerPoint
                  </span>
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Dobbeltklikk på den nedlastede <strong>.pptx-filen</strong>.</li>
                  <li>Trykk <strong>F5</strong> eller <strong>Alt+F5</strong> for å starte Foredragsholdervisning.</li>
                  <li>Du ser da lysbildet på storskjermen og talemanuset ditt på din egen PC-skjerm!</li>
                </ol>
              </div>
            </div>
          </div>

          {/* EKSTRA EKSPORTVALG: KOPIER OG UTSKRIFT */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLocalCopyAll}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              {localCopied || copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{localCopied || copiedAll ? 'Kopiert til utklippstavle!' : 'Kopier all tekst og manus'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPDF}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              title="Skriv ut eller lagre som PDF via utskriftsdialogen"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Skriv ut / PDF</span>
            </button>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/70">
          <span className="text-xs text-slate-500 font-medium">
            BLU-Hjelperen Eksportmotor v3
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Lukk
          </button>
        </div>

      </div>
    </div>
  );
};
