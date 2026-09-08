import React, { useState, useEffect } from 'react';
import { 
  Presentation, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  FileText, 
  RotateCcw,
  BookOpen,
  Edit3
} from 'lucide-react';
import { generatePresentationOutline, PresentationSlide } from '../services/geminiService';

interface PresentationGeneratorProps {
  documentText?: string;
  documentTitle?: string;
}

export function PresentationGenerator({ documentText = '', documentTitle }: PresentationGeneratorProps) {
  const [inputText, setInputText] = useState(documentText);
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync inputText if documentText prop changes
  useEffect(() => {
    if (documentText && documentText.trim().length > 0) {
      setInputText(documentText);
    }
  }, [documentText]);

  // Stop speech when component unmounts or slide changes
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentIndex]);

  const handleGenerate = async () => {
    const textToUse = inputText || documentText;
    if (!textToUse || textToUse.trim().length < 40) {
      setErrorMessage("Dokumentet eller teksten er for kort. Vennligst skriv eller lim inn minst et par avsnitt.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const outline = await generatePresentationOutline(textToUse);
      if (outline && outline.length > 0) {
        setSlides(outline);
        setCurrentIndex(0);
      } else {
        throw new Error("Ingen lysbilder ble generert. Prøv igjen med en annen tekst.");
      }
    } catch (error: any) {
      console.error("Presentation error:", error);
      setErrorMessage(error.message || "Kunne ikke generere presentasjon. Vennligst prøv igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  const playScript = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Nettleseren din støtter dessverre ikke tekst-til-tale.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'no-NO';
    utterance.rate = 0.95; // Behagelig eksamenstempo

    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const copyCurrentScript = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const copyAllSlides = () => {
    if (slides.length === 0) return;
    const fullText = slides.map(s => `--- LYSBILDE ${s.slide}: ${s.title} ---\nSTIKKORD:\n${s.bullets.map(b => `• ${b}`).join('\n')}\n\nTALEMANUS:\n${s.script}\n`).join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 shadow-sm border border-slate-200 flex flex-col items-center justify-center py-24 space-y-4 max-w-4xl mx-auto w-full text-center">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Bygger presentasjon & talemanus...</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Gemini analyserer teksten, strukturerer 5–7 kjerne-lysbilder og formulerer et overbevisende muntlig manus for deg.
          </p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 max-w-3xl mx-auto w-full space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
            <Presentation className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">Presentasjons-generator</h2>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">NotebookLM-stil</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Omdann teksten din til en ferdig strukturert presentasjon med eksamensmanus og stikkord.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {documentTitle ? `Tekstgrunnlag: ${documentTitle}` : 'Lim inn eller rediger tekstgrunnlaget:'}
            </label>
            <span className="text-[10px] text-slate-400 font-medium">
              {inputText.length} tegn (anbefalt: minst 200 tegn)
            </span>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Lim inn utdrag fra bacheloroppgaven, refleksjonsnotatet eller fellesnotatene fra kollokviegruppen..."
            rows={8}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs md:text-sm text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none leading-relaxed resize-y font-normal"
          />
        </div>

        <button 
          onClick={handleGenerate}
          disabled={!inputText.trim() || inputText.trim().length < 30}
          className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-2xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
        >
          <Sparkles className="w-5 h-5 text-primary" /> Generer lysbilder og muntlig manus
        </button>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 max-w-4xl mx-auto w-full p-6 md:p-8 flex flex-col gap-6">
      {/* Header og Handlinger */}
      <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
            <Presentation className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Lysbilde {currentIndex + 1} av {slides.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={copyAllSlides}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Kopier hele presentasjonen og alle talemanus"
          >
            {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedScript ? 'Kopiert!' : 'Kopier alt'}
          </button>
          <button 
            onClick={() => setSlides([])} 
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" /> Endre tekst
          </button>
          <button 
            onClick={handleGenerate} 
            className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Generer på nytt
          </button>
        </div>
      </div>

      {/* Rask slide-indikator / velger */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {slides.map((s, idx) => (
          <button
            key={idx}
            onClick={() => {
              setCurrentIndex(idx);
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              setIsSpeaking(false);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              currentIndex === idx
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Slide {s.slide}</span>
          </button>
        ))}
      </div>

      {/* Visuell "Lysbilde"-boks (Mørkt elegant kort) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 md:p-10 rounded-2xl min-h-[240px] flex flex-col justify-between shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-bl-full pointer-events-none" />
        
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/20 px-2.5 py-1 rounded-full border border-primary/30">
              Lysbilde {currentSlide.slide}
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-black tracking-tight text-white mb-6">
            {currentSlide.title}
          </h3>
          <ul className="space-y-3">
            {currentSlide.bullets.map((bullet, i) => (
              <li key={i} className="flex items-start gap-3 text-xs md:text-sm text-slate-200 leading-relaxed font-medium">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0 shadow-sm" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Talemanus (Hva du skal si) */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 relative shadow-inner">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-slate-700" />
            Talemanus (Muntlig fremføring)
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => copyCurrentScript(currentSlide.script)}
              className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1 text-xs font-bold"
              title="Kopier talemanus"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => playScript(currentSlide.script)}
              className={`px-3 py-1.5 rounded-xl shadow-sm border transition-all flex items-center gap-1.5 text-xs font-bold ${
                isSpeaking 
                  ? 'bg-primary text-white border-primary animate-pulse' 
                  : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-primary" />}
              <span>{isSpeaking ? 'Stopp opplesing' : 'Les opp manus'}</span>
            </button>
          </div>
        </div>
        <p className="text-xs md:text-sm text-slate-800 leading-relaxed italic bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          "{currentSlide.script}"
        </p>
      </div>

      {/* Navigasjon mellom lysbilder */}
      <div className="flex justify-between items-center pt-2">
        <button 
          onClick={() => {
            setCurrentIndex(prev => Math.max(0, prev - 1));
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            setIsSpeaking(false);
          }}
          disabled={currentIndex === 0}
          className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 disabled:opacity-30 flex items-center gap-1.5 transition-all"
        >
          <ChevronLeft className="w-4 h-4" /> Forrige lysbilde
        </button>
        <div className="text-xs font-bold text-slate-400">
          {currentIndex + 1} / {slides.length}
        </div>
        <button 
          onClick={() => {
            setCurrentIndex(prev => Math.min(slides.length - 1, prev + 1));
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            setIsSpeaking(false);
          }}
          disabled={currentIndex === slides.length - 1}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 disabled:opacity-30 flex items-center gap-1.5 transition-all shadow-sm"
        >
          Neste lysbilde <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
