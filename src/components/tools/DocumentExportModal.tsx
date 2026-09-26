import React, { useState, useMemo } from 'react';
import { 
  Download, 
  FileText, 
  Check, 
  X, 
  BookOpen, 
  Eye, 
  Sliders, 
  School, 
  User, 
  Calendar, 
  Hash, 
  FileCheck, 
  Info, 
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlertCircle,
  ShieldCheck,
  Quote,
  HelpCircle,
  ArrowRight,
  Edit3,
  ChevronRight
} from 'lucide-react';
import { 
  exportToDocx, 
  exportToPdf, 
  downloadFile, 
  CoverTheme, 
  DocumentExportMetadata, 
  HeaderFooterOptions, 
  TableOfContentsOptions, 
  extractTocEntries,
  OutlineItem
} from '../../lib/exportDocument';
import { 
  evaluateSubmissionChecklist, 
  SubmissionChecklistEvaluation 
} from '../../lib/submissionChecklist';
import { saveDocumentSnapshot } from '../../lib/documentBackup';

export interface DocumentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  documentContent: string;
  documentType: string;
  taskPrompt?: string;
  targetWords?: number;
  outline?: OutlineItem[];
  userProfile?: {
    name?: string;
    candidateId?: string;
    studentId?: string;
    institution?: string;
    college?: string;
    studiested?: string;
    studyProgram?: string;
  };
  onUpdateDocument?: (fields: { title?: string; content?: string; candidateNumber?: string }) => void;
}

export function DocumentExportModal({
  isOpen,
  onClose,
  documentTitle,
  documentContent,
  documentType,
  taskPrompt = '',
  targetWords = 1500,
  outline = [],
  userProfile = {},
  onUpdateDocument
}: DocumentExportModalProps) {
  // Formatvalg
  const [selectedFormat, setSelectedFormat] = useState<'docx' | 'pdf'>('docx');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Mål for ordantall (kan justeres i sjekklisten)
  const [customTargetWords, setCustomTargetWords] = useState<number>(targetWords || 1500);

  // Aktiv fane i innstillingspanelet - standard på sjekklisten for maksimal trygghet før eksport!
  const [activeTab, setActiveTab] = useState<'checklist' | 'cover' | 'toc' | 'headerFooter'>('checklist');
  const [quoteConvertNotice, setQuoteConvertNotice] = useState<string | null>(null);

  // Forside-innstillinger
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [coverTheme, setCoverTheme] = useState<CoverTheme>(() => {
    const typeLower = (documentType || '').toLowerCase();
    if (typeLower.includes('bachelor') || typeLower.includes('diskusjon')) return 'classic';
    if (typeLower.includes('praksis') || typeLower.includes('didaktisk') || typeLower.includes('observasjon')) return 'practice';
    if (typeLower.includes('arbeidskrav') || typeLower.includes('eksamen')) return 'formal';
    return 'modern';
  });

  // Metadata for forsiden
  const [metadata, setMetadata] = useState<DocumentExportMetadata>(() => {
    const calculatedWords = (documentContent || '').trim() 
      ? documentContent.trim().split(/\s+/).length 
      : targetWords;

    return {
      title: documentTitle || 'Uten tittel',
      subtitle: taskPrompt ? taskPrompt.slice(0, 140) : '',
      assignmentType: documentType || 'Refleksjonsnotat',
      authorName: userProfile.name || 'Barnehagelærerstudent',
      candidateNumber: userProfile.candidateId || userProfile.studentId || '',
      institution: userProfile.institution || userProfile.college || userProfile.studiested || 'Høgskolen i Innlandet',
      courseCode: 'BLU-oppgave',
      semester: 'Høst 2026',
      date: new Date().toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' }),
      wordCount: calculatedWords,
      supervisor: '',
      practicePlace: 'Solkroken barnehage',
      targetGroup: 'Småbarnsgruppe (1-3 år)'
    };
  });

  // Innholdsfortegnelse-innstillinger
  const [tocOptions, setTocOptions] = useState<TableOfContentsOptions>({
    includeToC: true,
    title: 'Innholdsfortegnelse',
    showSubchapters: true,
    showPageNumbers: true
  });

  // Topp- og bunntekst innstillinger
  const [headerFooterOptions, setHeaderFooterOptions] = useState<HeaderFooterOptions>({
    includeHeader: true,
    headerText: `${documentTitle || 'Oppgave'} • ${documentType || 'BLU'}`,
    headerAlignment: 'right',
    includeFooter: true,
    footerText: userProfile.institution || userProfile.college || 'BLU-Hjelperen',
    includePageNumber: true,
    pageNumberFormat: 'page_of_total',
    pageNumberPosition: 'right',
    firstPageNumberExcluded: true
  });

  // Generer utdrag av innholdsfortegnelse for forhåndsvisning
  const tocEntries = useMemo(() => {
    return extractTocEntries(documentContent, outline);
  }, [documentContent, outline]);

  // Beregn 3-punkts sjekkliste før innlevering (Punkt 4)
  const checklistEvaluation: SubmissionChecklistEvaluation = useMemo(() => {
    return evaluateSubmissionChecklist(
      metadata.title,
      metadata.candidateNumber || '',
      documentContent,
      customTargetWords
    );
  }, [metadata.title, metadata.candidateNumber, documentContent, customTargetWords]);

  // Håndter 1-klikks konvertering av lange sitater (> 40 ord) til blokksitat
  const handleConvertQuoteToBlockQuote = (quoteText: string) => {
    if (!quoteText || !onUpdateDocument) return;

    const patterns = [
      `«${quoteText}»`,
      `"${quoteText}"`,
      `“${quoteText}”`
    ];

    let newContent = documentContent;
    let replaced = false;

    for (const p of patterns) {
      if (newContent.includes(p)) {
        newContent = newContent.replace(p, `\n\n> ${quoteText}\n\n`);
        replaced = true;
        break;
      }
    }

    if (!replaced && newContent.includes(quoteText)) {
      newContent = newContent.replace(quoteText, `\n\n> ${quoteText}\n\n`);
      replaced = true;
    }

    if (replaced) {
      onUpdateDocument({ content: newContent });
      setQuoteConvertNotice('Sitatet er automatisk omgjort til et formelt innrykket blokksitat!');
      setTimeout(() => setQuoteConvertNotice(null), 3000);
    }
  };

  if (!isOpen) return null;

  const handleRunExport = async (formatOverride?: 'docx' | 'pdf') => {
    const format = formatOverride || selectedFormat;
    setIsExporting(true);
    setExportSuccess(null);

    // Automatisk sikkerhetskopi i historikken før eksport (Punkt 5)
    saveDocumentSnapshot(metadata.title || 'oppgave', metadata.title, documentContent, 'pre_export');

    try {
      const config = {
        format,
        includeCoverPage,
        coverTheme,
        metadata,
        headerFooter: headerFooterOptions,
        toc: tocOptions,
        content: documentContent,
        outline,
        fontFamily: 'Times New Roman' as const,
        lineSpacing: 1.5
      };

      const cleanFileName = (metadata.title || 'oppgave')
        .replace(/[^a-zA-Z0-9æøåÆØÅ_-]/g, '_')
        .slice(0, 35);

      if (format === 'docx') {
        const blob = await exportToDocx(config);
        downloadFile(blob, `${cleanFileName}.docx`);
        setExportSuccess('Word-dokument (.docx) er lastet ned! Kan åpnes i Word og Google Dokumenter.');
      } else {
        const blob = await exportToPdf(config);
        downloadFile(blob, `${cleanFileName}.pdf`);
        setExportSuccess('PDF-dokument (.pdf) er lastet ned med profesjonelt oppsett.');
      }

      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err: any) {
      console.error('Eksport feilet:', err);
      alert('Kunne ikke eksportere dokumentet: ' + (err?.message || 'Ukjent feil'));
    } finally {
      setIsExporting(false);
    }
  };

  const themeList: { id: CoverTheme; title: string; subtitle: string; tag: string; bgTone: string }[] = [
    {
      id: 'classic',
      title: 'Klassisk Akademisk',
      subtitle: 'Sentrert eleganse, dobbel skillelinje og institusjonsblokk.',
      tag: 'Bachelor & Eksamen',
      bgTone: 'border-blue-200 hover:border-blue-500'
    },
    {
      id: 'modern',
      title: 'Moderne Nordisk',
      subtitle: 'Venstrestilt, indigo aksentlinje og strukturert metadata.',
      tag: 'Fagtekst & Notat',
      bgTone: 'border-indigo-200 hover:border-indigo-500'
    },
    {
      id: 'formal',
      title: 'Formell Eksamensrapport',
      subtitle: 'Tittelbånd, innrammet sensurtabell og redelighetserklæring.',
      tag: 'Formelt Arbeidskrav',
      bgTone: 'border-slate-300 hover:border-slate-600'
    },
    {
      id: 'practice',
      title: 'Pedagogisk & Praksis',
      subtitle: 'Spisset for BLU med praksisbarnehage, aldersgruppe og Rammeplan.',
      tag: 'Praksis & Didaktikk',
      bgTone: 'border-teal-200 hover:border-teal-500'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* TOPPBAR */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Eksporter dokument
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Høyskolenivå
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Word (.docx) • Google Dokumenter • Profesjonell PDF (.pdf)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* HOVEDINNHOLD: 2 KOLONNER */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* VENSTRE: KONTROLLER OG INNSTILLINGER (7 kolonner) */}
          <div className="lg:col-span-7 border-r border-slate-100 flex flex-col min-h-0 overflow-y-auto p-6 space-y-6 bg-white">
            
            {/* 1. FORMATVALG */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                1. Velg filformat
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('docx')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex items-start gap-3 ${
                    selectedFormat === 'docx' 
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${selectedFormat === 'docx' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">Word (.docx)</span>
                      {selectedFormat === 'docx' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      For Word og Google Dokumenter med ekte overskrifter og stiler.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('pdf')}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex items-start gap-3 ${
                    selectedFormat === 'pdf' 
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs' 
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${selectedFormat === 'pdf' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">PDF (.pdf)</span>
                      {selectedFormat === 'pdf' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Klar for utskrift og digital eksamensinnlevering.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* 3-PUNKTS FORMELL SJEKKLISTE-BANNER (PUNKT 4) */}
            <div 
              onClick={() => setActiveTab('checklist')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                checklistEvaluation.isReadyForSubmission 
                  ? 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-50 text-emerald-950 shadow-2xs' 
                  : 'bg-amber-50/70 border-amber-200 hover:bg-amber-50 text-amber-950 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${
                    checklistEvaluation.isReadyForSubmission ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {checklistEvaluation.isReadyForSubmission ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black">Sjekkliste før innlevering</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        checklistEvaluation.isReadyForSubmission 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {checklistEvaluation.totalPassed}/3 formelle krav oppfylt
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {checklistEvaluation.isReadyForSubmission 
                        ? 'Tittel, anonymt kandidatnummer, ordantall og APA 7 sitatregler er kvalitetssikret.'
                        : 'Noen formelle krav bør ses over før du laster ned. Klikk her for å se sjekklisten.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 pl-2">
                  <span>{activeTab === 'checklist' ? 'Valgt' : 'Åpne'}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* FANER FOR TILPASNING */}
            <div className="border-b border-slate-200 flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('checklist')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'checklist' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> 
                <span>Sjekkliste før innlevering</span>
                <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                  checklistEvaluation.isReadyForSubmission ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {checklistEvaluation.totalPassed}/3
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('cover')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'cover' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <School className="w-3.5 h-3.5" /> Forside & Tema
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('toc')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'toc' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> Innholdsfortegnelse
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('headerFooter')}
                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'headerFooter' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" /> Topp, bunn & sidetall
              </button>
            </div>

            {/* FANE 0: SJEKKLISTE FØR INNLEVERING (PUNKT 4) */}
            {activeTab === 'checklist' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      De 3 formelle høgskolekravene
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Automatisert sjekk for å fjerne eksamensstress og sikre at formelle krav er ivaretatt før eksport.
                    </p>
                  </div>
                </div>

                {quoteConvertNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{quoteConvertNotice}</span>
                  </div>
                )}

                {/* SJEKKPUNKT 1: TITTEL OG KANDIDATNUMMER */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  checklistEvaluation.titleCheck.passed
                    ? 'bg-white border-emerald-200 shadow-2xs'
                    : 'bg-white border-amber-200 shadow-2xs'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                        checklistEvaluation.titleCheck.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {checklistEvaluation.titleCheck.passed ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">1. Tittel og kandidatnummer</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            checklistEvaluation.titleCheck.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {checklistEvaluation.titleCheck.passed ? 'Oppfylt' : 'Mangler data'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {checklistEvaluation.titleCheck.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Inline justering */}
                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Oppgavetittel</label>
                      <input
                        type="text"
                        value={metadata.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMetadata({ ...metadata, title: val });
                          if (onUpdateDocument) onUpdateDocument({ title: val });
                        }}
                        placeholder="Skriv tittel her..."
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Kandidatnummer (for anonym sensur)
                      </label>
                      <input
                        type="text"
                        value={metadata.candidateNumber || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMetadata({ ...metadata, candidateNumber: val });
                          if (onUpdateDocument) onUpdateDocument({ candidateNumber: val });
                        }}
                        placeholder="F.eks. 104"
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* SJEKKPUNKT 2: ORDANTALL (MÅL ± 10%) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  checklistEvaluation.wordCountCheck.passed
                    ? 'bg-white border-emerald-200 shadow-2xs'
                    : 'bg-white border-amber-200 shadow-2xs'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                        checklistEvaluation.wordCountCheck.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {checklistEvaluation.wordCountCheck.passed ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">2. Ordantall innenfor rammen (± 10 %)</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            checklistEvaluation.wordCountCheck.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {checklistEvaluation.wordCountCheck.actualWords.toLocaleString('nb-NO')} ord ({checklistEvaluation.wordCountCheck.deviationPercentage > 0 ? `+${checklistEvaluation.wordCountCheck.deviationPercentage}` : checklistEvaluation.wordCountCheck.deviationPercentage}%)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {checklistEvaluation.wordCountCheck.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hurtigvalg for oppgavens målord */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Oppgavens krav til omfang:</span>
                      <span className="font-bold text-slate-800">
                        Tillatt ramme: {checklistEvaluation.wordCountCheck.minAllowed.toLocaleString('nb-NO')} – {checklistEvaluation.wordCountCheck.maxAllowed.toLocaleString('nb-NO')} ord
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[1000, 1200, 1500, 2000, 2500, 3000, 4000].map(cnt => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setCustomTargetWords(cnt)}
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                            customTargetWords === cnt
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {cnt.toLocaleString('nb-NO')} ord
                        </button>
                      ))}
                    </div>

                    {/* Visuell meter */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative mt-1">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          checklistEvaluation.wordCountCheck.passed ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ 
                          width: `${Math.min(100, Math.round((checklistEvaluation.wordCountCheck.actualWords / (checklistEvaluation.wordCountCheck.maxAllowed * 1.05)) * 100))}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* SJEKKPUNKT 3: BLOKKSITAT-SJEKK (SITATER OVER 40 ORD / APA 7) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  checklistEvaluation.blockQuoteCheck.passed
                    ? 'bg-white border-emerald-200 shadow-2xs'
                    : 'bg-white border-amber-200 shadow-2xs'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                        checklistEvaluation.blockQuoteCheck.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {checklistEvaluation.blockQuoteCheck.passed ? <CheckCircle2 className="w-5 h-5" /> : <Quote className="w-5 h-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">3. Sitater over 40 ord (Blokksitat etter APA 7)</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            checklistEvaluation.blockQuoteCheck.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {checklistEvaluation.blockQuoteCheck.passed ? 'Korrekt formatert' : `${checklistEvaluation.blockQuoteCheck.longInlineQuotes.length} sitat bør rettes`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {checklistEvaluation.blockQuoteCheck.message}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Hvis det er funnet inline sitater på over 40 ord */}
                  {checklistEvaluation.blockQuoteCheck.longInlineQuotes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="text-[11px] font-bold text-amber-900">
                        Følgende sitat er på 40+ ord og står i løpende tekst med hermetegn:
                      </div>
                      {checklistEvaluation.blockQuoteCheck.longInlineQuotes.map((issue, i) => (
                        <div key={i} className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-amber-950">Sitat #{i + 1} ({issue.wordCount} ord)</span>
                            <span className="text-[10px] text-amber-800 font-medium">Krav: Skal være blokksitat uten hermetegn</span>
                          </div>
                          <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-amber-200">
                            «{issue.snippet}»
                          </p>
                          {onUpdateDocument && (
                            <button
                              type="button"
                              onClick={() => handleConvertQuoteToBlockQuote(issue.quoteText)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Gjør automatisk om til blokksitat med innrykk</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Informasjon om blokksitatregler i APA 7 */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
                    <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                    <span>APA 7-regelen: Sitater under 40 ord skrives i løpende tekst med «...». Sitater på 40 ord eller mer skilles ut som eget innrykket avsnitt uten hermetegn.</span>
                  </div>
                </div>

                {/* BONUS: LITTERATURLISTE */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {checklistEvaluation.bibliographyCheck.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="font-semibold text-slate-800">Litteraturliste / Kildeavsnitt</span>
                  </div>
                  <span className={`text-[11px] font-bold ${checklistEvaluation.bibliographyCheck.passed ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {checklistEvaluation.bibliographyCheck.passed ? 'Funnet på slutten av teksten' : 'Ikke registrert ennå'}
                  </span>
                </div>
              </div>
            )}

            {/* FANE 1: FORSIDE & DE 4 TEMAENE */}
            {activeTab === 'cover' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Inkluder akademisk forside</span>
                    <p className="text-[11px] text-slate-500">Lager en separat tittel- og forsideseksjon før oppgaven starter.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeCoverPage}
                    onChange={(e) => setIncludeCoverPage(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {includeCoverPage && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        Velg forhåndsdefinert tema (4 høyskolenivåer)
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {themeList.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => setCoverTheme(t.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${
                              coverTheme === t.id 
                                ? 'bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-500/20' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-slate-900">{t.title}</span>
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                {t.tag}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">{t.subtitle}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Metadatafelter */}
                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Forsideopplysninger & metadata
                      </label>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Oppgavetittel</label>
                          <input
                            type="text"
                            value={metadata.title}
                            onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Oppgavetype</label>
                          <input
                            type="text"
                            value={metadata.assignmentType}
                            onChange={(e) => setMetadata({ ...metadata, assignmentType: e.target.value })}
                            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Undertittel / Problemstilling</label>
                        <input
                          type="text"
                          value={metadata.subtitle || ''}
                          onChange={(e) => setMetadata({ ...metadata, subtitle: e.target.value })}
                          placeholder="F.eks. Drøfting av medvirkning i lys av rammeplanen..."
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Student / Forfatter</label>
                          <input
                            type="text"
                            value={metadata.authorName}
                            onChange={(e) => setMetadata({ ...metadata, authorName: e.target.value })}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kandidatnummer</label>
                          <input
                            type="text"
                            value={metadata.candidateNumber || ''}
                            onChange={(e) => setMetadata({ ...metadata, candidateNumber: e.target.value })}
                            placeholder="F.eks. 142"
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Institusjon</label>
                          <input
                            type="text"
                            value={metadata.institution}
                            onChange={(e) => setMetadata({ ...metadata, institution: e.target.value })}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Emnekode</label>
                          <input
                            type="text"
                            value={metadata.courseCode || ''}
                            onChange={(e) => setMetadata({ ...metadata, courseCode: e.target.value })}
                            placeholder="F.eks. BLU1002"
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Veileder</label>
                          <input
                            type="text"
                            value={metadata.supervisor || ''}
                            onChange={(e) => setMetadata({ ...metadata, supervisor: e.target.value })}
                            placeholder="F.eks. Kari Nordmann"
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ordtelling</label>
                          <input
                            type="number"
                            value={metadata.wordCount || 0}
                            onChange={(e) => setMetadata({ ...metadata, wordCount: parseInt(e.target.value) || 0 })}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Spesifikke felter for didaktisk/praksis tema */}
                      {coverTheme === 'practice' && (
                        <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-2">
                          <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-teal-600" /> Praksis- og didaktikkspesifikke felter
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-teal-700 mb-0.5">Praksisbarnehage</label>
                              <input
                                type="text"
                                value={metadata.practicePlace || ''}
                                onChange={(e) => setMetadata({ ...metadata, practicePlace: e.target.value })}
                                placeholder="F.eks. Solkroken barnehage"
                                className="w-full text-xs p-2 bg-white border border-teal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-teal-700 mb-0.5">Barnegruppe / Alder</label>
                              <input
                                type="text"
                                value={metadata.targetGroup || ''}
                                onChange={(e) => setMetadata({ ...metadata, targetGroup: e.target.value })}
                                placeholder="F.eks. Småbarn 1-3 år"
                                className="w-full text-xs p-2 bg-white border border-teal-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* FANE 2: INNHOLDSFORTEGNELSE */}
            {activeTab === 'toc' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800">Inkluder innholdsfortegnelse</span>
                    <p className="text-[11px] text-slate-500">
                      Legges til automatisk under oppgavestrukturen, umiddelbart etter forsiden.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={tocOptions.includeToC}
                    onChange={(e) => setTocOptions({ ...tocOptions, includeToC: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {tocOptions.includeToC && (
                  <div className="space-y-4 pl-1">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-slate-800">
                          Skille på hovedkapittel og underkapittel
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Viser underkapitler med innrykk og eget nummereringsnivå (slik som i Word).
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={tocOptions.showSubchapters}
                        onChange={(e) => setTocOptions({ ...tocOptions, showSubchapters: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Tittel på innholdsfortegnelsen
                      </label>
                      <input
                        type="text"
                        value={tocOptions.title}
                        onChange={(e) => setTocOptions({ ...tocOptions, title: e.target.value })}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Struktur oppdaget ({tocEntries.length} elementer):
                      </span>
                      {tocEntries.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">
                          Ingen overskrifter funnet ennå. Bruk #, ##, ### eller oppgavestruktur i editoren.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {tocEntries.map((e, idx) => (
                            <div 
                              key={idx} 
                              className={`text-xs flex items-center justify-between py-1 border-b border-slate-100 last:border-0 ${
                                e.level === 1 ? 'font-bold text-slate-800 pl-0' : e.level === 2 ? 'font-medium text-slate-600 pl-4' : 'text-slate-500 pl-8'
                              }`}
                            >
                              <span>{e.numbering} {e.title}</span>
                              <span className="text-[10px] text-slate-400">Side {idx + 3}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FANE 3: TOPP-, BUNNTEKST OG SIDENUMMERERING */}
            {activeTab === 'headerFooter' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Topptekst */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800">Topptekst (Header)</span>
                      <p className="text-[11px] text-slate-500">Viser tittel/emne øverst på hver side (skjult på forside).</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={headerFooterOptions.includeHeader}
                      onChange={(e) => setHeaderFooterOptions({ ...headerFooterOptions, includeHeader: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {headerFooterOptions.includeHeader && (
                    <div className="space-y-2 pt-1">
                      <input
                        type="text"
                        value={headerFooterOptions.headerText}
                        onChange={(e) => setHeaderFooterOptions({ ...headerFooterOptions, headerText: e.target.value })}
                        placeholder="Tekst i topptekst..."
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="text-[11px] font-medium mr-2">Plassering:</span>
                        {[
                          { id: 'left', icon: AlignLeft, label: 'Venstre' },
                          { id: 'center', icon: AlignCenter, label: 'Midtstilt' },
                          { id: 'right', icon: AlignRight, label: 'Høyre' }
                        ].map(pos => {
                          const Icon = pos.icon;
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => setHeaderFooterOptions({ ...headerFooterOptions, headerAlignment: pos.id as any })}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                                headerFooterOptions.headerAlignment === pos.id 
                                  ? 'bg-indigo-600 text-white border-indigo-600' 
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <Icon className="w-3 h-3" /> {pos.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidenummerering og Bunntekst */}
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800">Sidenummerering & Bunntekst</span>
                      <p className="text-[11px] text-slate-500">Nummererer oppgaven i henhold til høyskolestandard.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={headerFooterOptions.includePageNumber}
                      onChange={(e) => setHeaderFooterOptions({ ...headerFooterOptions, includePageNumber: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {headerFooterOptions.includePageNumber && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Format på sidenummer</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'page_of_total', label: 'Side X av Y' },
                            { id: 'page_only', label: 'Side X' },
                            { id: 'number_only', label: 'Kun tall (X)' }
                          ].map(fmt => (
                            <button
                              key={fmt.id}
                              type="button"
                              onClick={() => setHeaderFooterOptions({ ...headerFooterOptions, pageNumberFormat: fmt.id as any })}
                              className={`p-2 rounded-xl border text-xs font-bold text-center ${
                                headerFooterOptions.pageNumberFormat === fmt.id 
                                  ? 'bg-indigo-600 text-white border-indigo-600' 
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {fmt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Posisjon for sidetall</label>
                          <select
                            value={headerFooterOptions.pageNumberPosition}
                            onChange={(e) => setHeaderFooterOptions({ ...headerFooterOptions, pageNumberPosition: e.target.value as any })}
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                          >
                            <option value="right">Høyrejustert</option>
                            <option value="center">Sentrert</option>
                            <option value="left">Venstrejustert</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Valgfri bunntekst</label>
                          <input
                            type="text"
                            value={headerFooterOptions.footerText}
                            onChange={(e) => setHeaderFooterOptions({ ...headerFooterOptions, footerText: e.target.value })}
                            placeholder="F.eks. institusjon..."
                            className="w-full text-xs p-2 bg-white border border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span>Akademisk norm: Forsiden er automatisk unummerert og teller ikke som side 1.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* HØYRE: LEVENDE FORHÅNDSVISNING (5 kolonner) */}
          <div className="lg:col-span-5 bg-slate-100/60 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  Forhåndsvisning av oppsett
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  A4-format
                </span>
              </div>

              {/* Visuell gjengivelse av A4-forside */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200/90 aspect-[1/1.414] p-5 flex flex-col justify-between text-slate-800 text-[9px] select-none transition-all">
                {/* Topp på arket */}
                <div>
                  {/* Dekorstripe / topplinje */}
                  {coverTheme === 'modern' && (
                    <div className="w-8 h-1 bg-indigo-600 rounded-full mb-3" />
                  )}
                  {coverTheme === 'practice' && (
                    <div className="w-8 h-1 bg-teal-600 rounded-full mb-3" />
                  )}
                  {coverTheme === 'formal' && (
                    <div className="w-full py-1 bg-slate-900 text-white font-bold text-[7px] text-center tracking-widest uppercase mb-4 rounded-xs">
                      Eksamensbesvarelse
                    </div>
                  )}

                  <p className={`font-bold tracking-wider text-[8px] mb-1 ${
                    coverTheme === 'classic' ? 'text-center text-slate-500 uppercase' : 
                    coverTheme === 'practice' ? 'text-teal-700 font-bold' : 
                    coverTheme === 'modern' ? 'text-indigo-600 font-bold' : 'text-slate-700'
                  }`}>
                    {metadata.institution ? metadata.institution.toUpperCase() : 'HØGSKOLE'}
                  </p>

                  <p className={`text-[8.5px] text-slate-500 mb-4 ${coverTheme === 'classic' ? 'text-center' : ''}`}>
                    {metadata.assignmentType}
                  </p>

                  <div className={`mt-4 ${coverTheme === 'classic' ? 'text-center' : ''}`}>
                    <h3 className="font-black text-slate-900 text-sm leading-tight line-clamp-2">
                      {metadata.title || 'Oppgavetittel...'}
                    </h3>
                    
                    {coverTheme === 'classic' && (
                      <div className="w-20 h-0.5 bg-blue-900 mx-auto my-2" />
                    )}
                    {coverTheme === 'modern' && (
                      <div className="w-12 h-0.5 bg-indigo-600 my-2" />
                    )}
                    {coverTheme === 'practice' && (
                      <div className="w-12 h-0.5 bg-teal-600 my-2" />
                    )}

                    {metadata.subtitle && (
                      <p className="text-slate-600 italic text-[8px] line-clamp-2 mt-1">
                        {metadata.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bunn på arket */}
                <div className={`border-t border-slate-100 pt-3 space-y-1 ${
                  coverTheme === 'classic' ? 'text-center' : 
                  coverTheme === 'practice' ? 'bg-teal-50/50 p-2 rounded-lg border-teal-100' :
                  coverTheme === 'formal' ? 'border border-slate-200 p-2 rounded' : ''
                }`}>
                  <p className="font-semibold text-slate-800">
                    {metadata.authorName || 'Navn'} {metadata.candidateNumber ? `(Kand. ${metadata.candidateNumber})` : ''}
                  </p>
                  <p className="text-slate-500">
                    {metadata.courseCode || 'BLU'} • {metadata.semester || '2026'}
                  </p>
                  {coverTheme === 'practice' && metadata.practicePlace && (
                    <p className="text-teal-800 font-medium">
                      Praksis: {metadata.practicePlace}
                    </p>
                  )}
                  <p className="text-[7.5px] text-slate-400">
                    {metadata.date || new Date().toLocaleDateString('nb-NO')} {metadata.wordCount ? `• ca. ${metadata.wordCount} ord` : ''}
                  </p>
                </div>
              </div>

              {/* Informasjonsboks for Akademisk formatering iht. retningslinjer */}
              <div className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-2 text-slate-700 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Automatisk akademisk formatering</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-slate-600">
                  <div>• <strong>Font:</strong> Times New Roman (12 pt)</div>
                  <div>• <strong>Marger:</strong> 2,54 cm (1 tomme) alle sider</div>
                  <div>• <strong>Linjeavstand:</strong> 1,5 (venstrestilt kant)</div>
                  <div>• <strong>Overskrift 1:</strong> 14 pt fet (starter på ny side)</div>
                  <div>• <strong>Overskrift 2:</strong> 12 pt fet (12 pkt etter)</div>
                  <div>• <strong>Overskrift 3:</strong> 12 pt fet/kursiv (6 pkt)</div>
                  <div className="col-span-2">• <strong>Blokksitat (&ge; 40 ord):</strong> 1,27 cm innrykk, 2,0 linjeavstand</div>
                  <div className="col-span-2">• <strong>Litteraturliste:</strong> 1,27 cm hengende innrykk (Word-spesial)</div>
                </div>
              </div>

              {/* Informasjonsboks for Google Dokumenter */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Tips for Google Dokumenter:</strong> Last ned som Word (.docx). Filen kan dras direkte inn i Google Disk eller åpnes i Google Dokumenter med intakt forside og topp-/bunntekst.
                </div>
              </div>
            </div>

            {/* STATUSMELDING VED NEDLASTING */}
            {exportSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in my-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{exportSuccess}</span>
              </div>
            )}
          </div>
        </div>

        {/* BUNNBAR MED HANDLINGSKNAPPER */}
        <div className="p-4 px-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{documentTitle || 'Oppgavedokument'}</span>
            <span>•</span>
            <span>{documentType}</span>
            <span>•</span>
            <span>{metadata.wordCount} ord</span>

            {/* STATUSPILLE FOR SJEKKLISTE */}
            <div 
              onClick={() => setActiveTab('checklist')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all ${
                checklistEvaluation.isReadyForSubmission
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
              }`}
              title="Klikk for å åpne sjekklisten"
            >
              {checklistEvaluation.isReadyForSubmission ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span>
                {checklistEvaluation.isReadyForSubmission 
                  ? '3/3 krav godkjent' 
                  : `${3 - checklistEvaluation.totalPassed} krav gjenstår`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-all"
            >
              Avbryt
            </button>

            {/* Hurtigknapper for direkte eksport til begge formater */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleRunExport('pdf')}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <FileCheck className="w-4 h-4 text-rose-600" />
              Last ned PDF (.pdf)
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleRunExport('docx')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Last ned Word (.docx)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default DocumentExportModal;
