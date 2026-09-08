import React, { useState, useRef } from 'react';
import { WorkspaceLayout, HistoryItem } from './WorkspaceLayout';
import { 
  FileSearch, 
  UploadCloud, 
  GraduationCap, 
  AlertCircle, 
  FileOutput, 
  Search, 
  Loader2, 
  Copy, 
  Check, 
  FileText,
  Sparkles,
  RefreshCw,
  Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { extractTextFromDocx } from '../lib/docxUtils';
import { generateAcademicResponse } from '../services/geminiService';

interface AnalyzedDocument extends HistoryItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'sensor' | 'summary';
  content: string;
  result?: string;
  createdAt: string;
}

export function DocumentAnalysis() {
  const [documents, setDocuments] = useState<AnalyzedDocument[]>([
    { 
      id: '1', 
      title: 'Barnehagens rom.pdf', 
      subtitle: 'Oppsummert • 5. sept 2026',
      type: 'summary',
      content: 'Utdrag fra faglitteratur om barnehagens fysiske miljø og rommets betydning som den tredje pedagog.',
      result: '### Sammendrag av Barnehagens rom\n\n**Hovedtemaer:**\n- Det fysiske miljøets innvirkning på barns lek og medvirkning.\n- Rommet som «den tredje pedagog» (Reggio Emilia-inspirert).\n- Fleksibilitet i soner for ro, grovmotorisk lek og estetiske prosesser.\n\n**Relevante teoretiske perspektiver:**\n- Loris Malaguzzi om rommets pedagogiske kraft.\n- Rammeplanens føringer om inkluderende lekemiljø.',
      createdAt: '5. sept 2026'
    },
    { 
      id: '2', 
      title: 'Utkast Praksisfortelling', 
      subtitle: 'Fiktiv sensur • 2. sept 2026',
      type: 'sensor',
      content: 'Praksisfortelling fra småbarnsavdelingen om toåringen som utforsker vanndammer i høstregnet.',
      result: '### Sensorvurdering og faglig tilbakemelding\n\n**Helhetsinntrykk:**\nTeksten viser godt blikk for barns sansemotoriske utforskning i uterommet. God observasjonsevne.\n\n**Styrker:**\n- Nær og levende skildring av situasjonen.\n- Viser respekt for barnets tempo.\n\n**Forbedringsområder for eksamen/bachelor:**\n- Knytt observasjonen tettere til Rammeplanens kapittel om «Natur, miljø og teknologi».\n- Drøft personalets rolle: Var den voksne støttende stillas eller passiv tilskuer? Bruk gjerne Vygotskijs teori om den proksimale utviklingssonen.',
      createdAt: '2. sept 2026'
    }
  ]);
  
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [activeTool, setActiveTool] = useState<'sensor' | 'summary'>('sensor'); // 'sensor' eller 'summary'
  const [inputText, setInputText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<string | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNewAnalysis = () => {
    setActiveDocId('');
    setInputText('');
    setUploadedFileName(null);
    setCurrentAnalysisResult(null);
    setErrorMessage(null);
  };

  const handleSelectDoc = (id: string) => {
    setActiveDocId(id);
    const doc = documents.find(d => d.id === id);
    if (doc) {
      setActiveTool(doc.type);
      setInputText(doc.content || '');
      setCurrentAnalysisResult(doc.result || null);
      setUploadedFileName(doc.title);
      setErrorMessage(null);
    }
  };

  const handleDeleteItem = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (activeDocId === id) {
      handleNewAnalysis();
    }
  };

  const handleRenameItem = (id: string, newTitle: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
  };

  // Håndter filopplasting (både klikk og drag & drop)
  const processFile = async (file: File) => {
    setIsProcessingFile(true);
    setErrorMessage(null);
    try {
      let extracted = '';
      const name = file.name.toLowerCase();

      if (name.endsWith('.pdf')) {
        extracted = await extractTextFromPdf(file);
      } else if (name.endsWith('.docx')) {
        extracted = await extractTextFromDocx(file);
      } else {
        // Ren tekstfil
        extracted = await file.text();
      }

      if (!extracted.trim()) {
        throw new Error('Kunne ikke hente ut tekst fra filen. Prøv å lime inn teksten manuelt.');
      }

      setInputText(extracted);
      setUploadedFileName(file.name);
      setCurrentAnalysisResult(null);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err.message || 'Feil under lesing av dokumentet.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRunAnalysis = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Vennligst last opp et dokument eller lim inn tekst først.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    const docTitle = uploadedFileName || (inputText.slice(0, 30).trim() + '...');
    const today = new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'short', year: 'numeric' });

    let prompt = '';
    if (activeTool === 'sensor') {
      prompt = `Du er en sensor og veileder i barnehagelærerutdanningen (BLU). Gjennomfør en grundig, formativ sensor-vurdering av følgende studentutkast. 
Strukturer tilbakemeldingen med:
1. Helhetsvurdering og estimert karakternivå (A-F med begrunnelse)
2. Sterke faglige kvaliteter
3. Kritiske forbedringspunkter (problemstilling, rød tråd, kildebruk iht. APA 7, forankring i Rammeplanen for barnehagen)
4. Konkrete råd for videre bearbeiding

Tekst til sensur:
"""
${inputText.slice(0, 8000)}
"""`;
    } else {
      prompt = `Du er en akademisk lese- og forskningspartner for barnehagelærerstudenter. Gjennomfør en dypanalyse og oppsummering av følgende fagtekst.
Strukturer analysen med:
1. Kort sammendrag (hovedbudskap på 3-4 setninger)
2. Sentrale begreper og teoretiske nøkkelpunkter
3. Relevans for barnehagepedagogisk praksis og Rammeplanen
4. Relevante problemstillinger eller drøftingsspørsmål teksten åpner for

Tekst:
"""
${inputText.slice(0, 8000)}
"""`;
    }

    try {
      const response = await generateAcademicResponse(
        prompt,
        [],
        'balanced',
        { 
          frameworkFocus: activeTool === 'sensor' 
            ? 'Format: Sensorverktøy og vurdering for BLU' 
            : 'Format: Fagtekstanalyse og oppsummering for BLU' 
        }
      );

      setCurrentAnalysisResult(response);

      const newId = String(Date.now());
      const newDoc: AnalyzedDocument = {
        id: newId,
        title: docTitle,
        subtitle: `${activeTool === 'sensor' ? 'Fiktiv sensur' : 'Oppsummert'} • ${today}`,
        type: activeTool,
        content: inputText,
        result: response,
        createdAt: today
      };

      setDocuments(prev => [newDoc, ...prev]);
      setActiveDocId(newId);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setErrorMessage(err.message || 'Kunne ikke gjennomføre analysen. Prøv igjen.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (!currentAnalysisResult) return;
    navigator.clipboard.writeText(currentAnalysisResult);
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  const activeDoc = documents.find(d => d.id === activeDocId);

  return (
    <WorkspaceLayout
      title="Dokumentanalyse"
      subtitle="Få tilbakemelding eller oppsummering"
      icon={<FileSearch className="w-6 h-6" />}
      actionButtonLabel="Ny analyse"
      onActionClick={handleNewAnalysis}
      historyItems={documents}
      activeItemId={activeDocId}
      onItemClick={handleSelectDoc}
      onDeleteItem={handleDeleteItem}
      onRenameItem={handleRenameItem}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* VERKTØY-VELGER (Sensur vs. Oppsummering) */}
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex gap-2">
            <button 
              onClick={() => setActiveTool('sensor')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTool === 'sensor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <GraduationCap className="w-5 h-5" /> Sensorverktøy (Tilbakemelding)
            </button>
            <button 
              onClick={() => setActiveTool('summary')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTool === 'summary' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Search className="w-5 h-5" /> Dypanalyse & Oppsummering
            </button>
          </div>

          {/* INPUT-OMRÅDE (Opplasting eller tekst) */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" /> 
              {activeTool === 'sensor' ? 'Hva vil du ha tilbakemelding på?' : 'Hvilket dokument vil du analysere?'}
            </h2>

            {/* Skjult filvelger */}
            <input 
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Drag & Drop Boks */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 hover:border-primary transition-all cursor-pointer mb-6 group text-center"
            >
              <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                {isProcessingFile ? (
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                ) : (
                  <FileOutput className="w-8 h-8 text-slate-400 group-hover:text-primary" />
                )}
              </div>
              <p className="font-bold text-slate-700">
                {uploadedFileName ? `Valgt fil: ${uploadedFileName}` : 'Last opp PDF eller Word-dokument'}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {isProcessingFile 
                  ? 'Leser og trekker ut tekst...' 
                  : 'Dra og slipp filen her, eller klikk for å bla gjennom maskinen (PDF, Word, TXT).'}
              </p>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-xs font-bold text-slate-400 uppercase">Eller lim inn tekst</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* Tekst-input */}
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm h-48 focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder="Lim inn oppgaveteksten, notatene eller artikkelen din her..."
            />

            {/* Feilmelding */}
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Handlingsknapp basert på aktivt verktøy */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
              {inputText.length > 0 && (
                <span className="text-xs text-slate-400">
                  {inputText.length.toLocaleString()} tegn registrert
                </span>
              )}
              <div className="ml-auto">
                <button 
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing || isProcessingFile}
                  className={`px-8 py-4 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeTool === 'sensor' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyserer med Gemini...</span>
                    </>
                  ) : (
                    <>
                      <FileSearch className="w-5 h-5" /> 
                      <span>{activeTool === 'sensor' ? 'Kjør fiktiv sensur (Gemini Pro)' : 'Analyser dokument (Gemini Pro)'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RESULTAT-VISNING (hvis tilgjengelig) */}
          {currentAnalysisResult && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${activeTool === 'sensor' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {activeTool === 'sensor' ? <GraduationCap className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {activeTool === 'sensor' ? 'Sensorrapport og tilbakemelding' : 'Oppsummering & Dypanalyse'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {activeDoc?.title || uploadedFileName || 'Analysert dokument'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-all"
                  >
                    {copiedResult ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Kopiert</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopier</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed pt-2">
                <ReactMarkdown>{currentAnalysisResult}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* KI-Advarsel */}
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm mb-1">Viktig om personvern (SIKT)</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Husk å anonymisere alle dokumenter for ekte navn på barn, foreldre eller kollegaer før du laster dem opp til analyse.
              </p>
            </div>
          </div>

        </div>
      </div>
    </WorkspaceLayout>
  );
}
