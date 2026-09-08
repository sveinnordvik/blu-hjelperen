import React, { useState, useEffect } from 'react';
import { WorkspaceLayout, HistoryItem } from './WorkspaceLayout';
import { 
  Presentation, 
  Mic, 
  FileText, 
  Layers, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  RotateCcw, 
  Edit3, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { generatePresentationOutline, PresentationSlide } from '../services/geminiService';

interface PresentationGeneratorProps {
  documentText?: string;
  documentTitle?: string;
}

interface SavedPresentationRecord {
  id: string;
  title: string;
  subtitle: string;
  sourceText: string;
  targetAudience: string;
  slideCountOption: string;
  slides: PresentationSlide[];
}

export function PresentationGenerator({ documentText = '', documentTitle }: PresentationGeneratorProps) {
  const [presentations, setPresentations] = useState<HistoryItem[]>([
    { id: '1', title: 'Muntlig høring - Medvirkning', subtitle: '7 lysbilder • Lagret i går' },
    { id: '2', title: 'Foreldremøte: Lekens egenverdi', subtitle: '5 lysbilder • 3 dager siden' }
  ]);

  const [savedRecords, setSavedRecords] = useState<Record<string, SavedPresentationRecord>>({
    '1': {
      id: '1',
      title: 'Muntlig høring - Medvirkning',
      subtitle: '7 lysbilder • Lagret i går',
      sourceText: 'Bacheloroppgave om barns rett til medvirkning i barnehagens dagsrytme.',
      targetAudience: 'Medstudenter og Sensor (Akademisk)',
      slideCountOption: 'Medium (10 lysbilder)',
      slides: [
        {
          slide: 1,
          title: 'Barns medvirkning i hverdagens overganger',
          bullets: [
            'Problemstilling: Hvordan opplever 3-5 åringer medvirkning i garderobesituasjonen?',
            'Teoretisk rammeverk: Berit Bae og anerkjennende relasjoner',
            'Forankring i Rammeplanen kapittel 1 og 3'
          ],
          script: 'Kjære sensor og tilhørere. I denne presentasjonen vil jeg belyse hvordan barns rett til medvirkning realiseres i barnehagens mest krevende overgangssituasjoner, med særlig fokus på garderoben.'
        },
        {
          slide: 2,
          title: 'Det teoretiske fundamentet: Anerkjennelse',
          bullets: [
            'Berit Baes relasjonsforståelse: Åpenhet kontra kontroll',
            'Spenningen mellom institusjonelle rutiner og barnets tempo',
            'FNs barnekonvensjon artikkel 12: Barnets stemme'
          ],
          script: 'Når vi snakker om medvirkning, må vi skille mellom overflatisk valgfrihet og genuin medvirkning. Bae understreker at pedagogen må tåle barnets motstand som et gyldig meningsuttrykk.'
        },
        {
          slide: 3,
          title: 'Funn fra observasjonene',
          bullets: [
            'Funn 1: Voksnes tidspress innsnevrer barnas initiativ',
            'Funn 2: Humor og lek i påkledningen skaper mestring',
            'Pedagogens holdning som avgjørende faktor'
          ],
          script: 'Mine observasjoner viste tydelig at når de voksne brukte humor og lot barna hjelpe hverandre, sank konfliktnivået drastisk og barna opplevde reell autonomi.'
        },
        {
          slide: 4,
          title: 'Didaktiske konsekvenser for lederrollen',
          bullets: [
            'Veiledning av personalgruppen mot en felles relasjonsforståelse',
            'Endring av dagsrytmen: Mer fleksible tidsrammer',
            'Oppsummering og konklusjon'
          ],
          script: 'Avslutningsvis: Som pedagogisk leder er min viktigste oppgave å skape en avdelingskultur der overganger ikke bare er logistikk, men verdifulle pedagogiske arenaer.'
        }
      ]
    },
    '2': {
      id: '2',
      title: 'Foreldremøte: Lekens egenverdi',
      subtitle: '5 lysbilder • 3 dager siden',
      sourceText: 'Presentasjon til høstens foreldremøte om hvorfor frilek er den viktigste læringsarenaen.',
      targetAudience: 'Foreldregruppe (Lettfattelig)',
      slideCountOption: 'Kort (5 lysbilder)',
      slides: [
        {
          slide: 1,
          title: 'Velkommen! Hvorfor leker barna i barnehagen?',
          bullets: [
            'Velkommen til nytt barnehageår',
            'Lek er ikke en pause fra læring – lek ER læring',
            'Hva skjer egentlig når barna leker i sandkassen?'
          ],
          script: 'Hei og velkommen til foreldremøte! I kveld vil vi i personalet fortelle litt om hva som ligger bak hverdagen her på avdelingen, og hvorfor vi verner så sterkt om barnas frie lek.'
        },
        {
          slide: 2,
          title: 'Sosial kompetanse og vennskap',
          bullets: [
            'Å forhandle roller og regler',
            'Empati: Å forstå den andres perspektiv',
            'Mestring av gleder og skuffelser sammen'
          ],
          script: 'I leken lærer barna å lese sosiale koder, løse konflikter og føle tilhørighet. Dette er ferdigheter de har med seg resten av livet.'
        }
      ]
    }
  });

  const [activePresId, setActivePresId] = useState('');
  const [sourceText, setSourceText] = useState(documentText);
  const [targetAudience, setTargetAudience] = useState('Medstudenter og Sensor (Akademisk)');
  const [slideCountOption, setSlideCountOption] = useState('Medium (10 lysbilder)');

  // Visning av genererte lysbilder
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synkroniser når documentText endres
  useEffect(() => {
    if (documentText && documentText.trim().length > 0 && !sourceText) {
      setSourceText(documentText);
    }
  }, [documentText]);

  // Stopp tale når lysbilde endres eller komponent unmountes
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentSlideIndex]);

  const handleNewPresentation = () => {
    setActivePresId('');
    setSlides([]);
    setCurrentSlideIndex(0);
    setErrorMessage(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleSelectPresentation = (id: string) => {
    setActivePresId(id);
    setErrorMessage(null);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    const record = savedRecords[id];
    if (record) {
      setSlides(record.slides);
      setCurrentSlideIndex(0);
      setSourceText(record.sourceText);
      setTargetAudience(record.targetAudience);
      setSlideCountOption(record.slideCountOption);
    }
  };

  const handleGenerate = async () => {
    const textToUse = sourceText || documentText;
    if (!textToUse || textToUse.trim().length < 30) {
      setErrorMessage("Tekstgrunnlaget er for kort. Lim inn minst et par avsnitt med tekst for å bygge presentasjonen.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const enrichedContext = `Målgruppe for presentasjonen: ${targetAudience}.
Ønsket omfang: ${slideCountOption}.
Tekstgrunnlag:
${textToUse}`;

      const outline = await generatePresentationOutline(enrichedContext);
      if (outline && outline.length > 0) {
        setSlides(outline);
        setCurrentSlideIndex(0);

        // Lagre i historikk
        const newId = `pres-${Date.now()}`;
        const autoTitle = outline[0]?.title || (documentTitle ? `Presentasjon: ${documentTitle}` : 'Generert presentasjon');
        const newHistoryItem: HistoryItem = {
          id: newId,
          title: autoTitle.length > 35 ? autoTitle.substring(0, 32) + '...' : autoTitle,
          subtitle: `${outline.length} lysbilder • Nettopp laget`
        };

        setPresentations(prev => [newHistoryItem, ...prev]);
        setSavedRecords(prev => ({
          ...prev,
          [newId]: {
            id: newId,
            title: autoTitle,
            subtitle: newHistoryItem.subtitle,
            sourceText: textToUse,
            targetAudience,
            slideCountOption,
            slides: outline
          }
        }));
        setActivePresId(newId);
      } else {
        throw new Error("Ingen lysbilder ble returnert fra KI-modellen. Vennligst prøv igjen.");
      }
    } catch (err: any) {
      console.error("Presentation generation error:", err);
      setErrorMessage(err.message || "Kunne ikke generere presentasjon. Vennligst prøv igjen.");
    } finally {
      setIsLoading(false);
    }
  };

  const playScript = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Nettleseren din støtter ikke tekst-til-tale direkte.");
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

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

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
    const fullText = slides
      .map(s => `--- LYSBILDE ${s.slide}: ${s.title} ---\nSTIKKORD:\n${s.bullets.map(b => `• ${b}`).join('\n')}\n\nMUNTLIG MANUS:\n${s.script}\n`)
      .join('\n\n');
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <WorkspaceLayout
      title="Presentasjoner"
      subtitle="Fra tekst til fremføring"
      icon={<Presentation className="w-6 h-6" />}
      actionButtonLabel="Ny presentasjon"
      onActionClick={handleNewPresentation}
      historyItems={presentations}
      activeItemId={activePresId}
      onItemClick={handleSelectPresentation}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 flex justify-center">
        <div className="max-w-4xl w-full space-y-6 pb-12">
          
          {/* GENERERINGSSKJEMA (NÅR INGEN LYSBILDER VISES) */}
          {slides.length === 0 ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                <div className="bg-emerald-50 p-3.5 rounded-2xl shrink-0">
                  <Layers className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Generer lysbilder og manus</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Gjør om oppgaven eller fellesnotatene dine til en strukturert presentasjon med talemanus.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" /> Kildegrunnlag
                    </label>
                    <span className="text-xs text-slate-400 font-medium">
                      {sourceText.length} tegn
                    </span>
                  </div>
                  <textarea 
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    rows={8}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary focus:bg-white outline-none resize-y leading-relaxed font-normal text-slate-800"
                    placeholder="Lim inn teksten du vil presentere, eller hent fra et dokument i arkivet..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Målgruppe
                    </label>
                    <select 
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-slate-800"
                    >
                      <option value="Medstudenter og Sensor (Akademisk)">Medstudenter og Sensor (Akademisk)</option>
                      <option value="Foreldregruppe (Lettfattelig)">Foreldregruppe (Lettfattelig)</option>
                      <option value="Personalmøte (Praksisnært)">Personalmøte (Praksisnært)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Antall lysbilder
                    </label>
                    <select 
                      value={slideCountOption}
                      onChange={(e) => setSlideCountOption(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium text-slate-800"
                    >
                      <option value="Kort (5 lysbilder)">Kort (5 lysbilder)</option>
                      <option value="Medium (10 lysbilder)">Medium (10 lysbilder)</option>
                      <option value="Lang (15+ lysbilder)">Lang (15+ lysbilder)</option>
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isLoading || !sourceText.trim() || sourceText.trim().length < 30}
                  className="w-full mt-4 py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 text-sm"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Bygger lysbilder og talemanus...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      <span>Generer lysbilder og muntlig manus</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* LYSBILDEVISER & TALEMANUS */
            <div className="space-y-6">
              {/* Toppkontroller for lysbildevisning */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-lg">
                    Lysbilde {currentSlideIndex + 1} av {slides.length}
                  </span>
                  <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                    • Målgruppe: {targetAudience.split('(')[0]}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={copyAllSlides}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                    title="Kopier hele presentasjonen med alle stikkord og manus"
                  >
                    {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedAll ? 'Kopiert!' : 'Kopier alt'}
                  </button>
                  <button 
                    onClick={handleNewPresentation} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Ny / Endre tekst
                  </button>
                  <button 
                    onClick={handleGenerate} 
                    className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Generer på nytt
                  </button>
                </div>
              </div>

              {/* Rask slidevelger */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {slides.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentSlideIndex(idx);
                      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      currentSlideIndex === idx
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>Slide {s.slide}</span>
                  </button>
                ))}
              </div>

              {/* Hovedvisning: Venstre lysbilde, høyre talemanus */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Venstre: Selve lysbildet */}
                <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between min-h-[380px]">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        Lysbilde {currentSlide.slide}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        Stikkordsvisning for tilhørerne
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-6 leading-tight">
                      {currentSlide.title}
                    </h3>

                    <ul className="space-y-3.5">
                      {currentSlide.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Navigasjonsknapper for slides */}
                  <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
                      }}
                      disabled={currentSlideIndex === 0}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Forrige
                    </button>
                    <span className="text-xs font-bold text-slate-400">
                      {currentSlideIndex + 1} / {slides.length}
                    </span>
                    <button
                      onClick={() => {
                        if (currentSlideIndex < slides.length - 1) setCurrentSlideIndex(currentSlideIndex + 1);
                      }}
                      disabled={currentSlideIndex === slides.length - 1}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1"
                    >
                      Neste <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Høyre: Muntlig talemanus */}
                <div className="md:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                          Muntlig manus
                        </h4>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md">
                        Hva du sier høyt
                      </span>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-sm text-slate-200 leading-relaxed font-normal italic">
                      «{currentSlide.script}»
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={() => playScript(currentSlide.script)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                        isSpeaking 
                          ? 'bg-amber-500 text-slate-950 shadow-md animate-pulse' 
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-4 h-4" /> Stopp opplesing
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-emerald-400" /> Lytt til manus
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => copyCurrentScript(currentSlide.script)}
                      className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Kopier manus for dette lysbildet"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'Kopiert' : 'Kopier'}</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </WorkspaceLayout>
  );
}
