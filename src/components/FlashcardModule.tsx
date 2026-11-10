import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  RotateCw, 
  Volume2, 
  BookOpen, 
  Layers, 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  RefreshCcw,
  Library,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { generateFlashcards, playAudio, stopAudio } from '../services/geminiService';
import { usePensumHub } from '../context/PensumHubContext';
import { cn } from '../lib/utils';

export interface FlashcardItem {
  term: string;
  definition: string;
  category?: string;
  example?: string;
}

const PRESET_DECKS: Record<string, { title: string; subtitle: string; cards: FlashcardItem[] }> = {
  risikolek: {
    title: 'Risikofylt lek & Lekemiljø',
    subtitle: 'Sandseter, Kleppe, Sando, affordance og tumlearealer',
    cards: [
      { term: 'Risikofylt lek (Ellen Beate H. Sandseter)', definition: 'Spennende og utfordrende lek som innebærer risiko for mindre fysisk skade. Gir barn uvurderlig mestringsfølelse, sansemotorisk stimulering og risikovurderingskompetanse.', category: 'Leketeori' },
      { term: 'Kategori 1: Store høyder (Sandseter)', definition: 'Lek i klatrestativer, trær eller på skrenter der barna opplever spenning, utforsker høydefølelse og lærer å vurdere fallhøyde og balanse.', category: 'Risikokategori' },
      { term: 'Kategori 2: Høy fart (Sandseter)', definition: 'Lek med ukontrollert hastighet, som aking på kjelke, løping i bratt terreng, husking eller rask sykling.', category: 'Risikokategori' },
      { term: 'Kategori 3: Farlige redskaper (Sandseter)', definition: 'Meningsfull opplæring og lek med ekte verktøy som kniv, sag, hammer og tau i barnehagehverdagen.', category: 'Risikokategori' },
      { term: 'Kategori 4: Farlige elementer (Sandseter)', definition: 'Lek i nærheten av eller med naturkrefter som vann, snø, is, bratte skrenter, stup eller levende bål.', category: 'Risikokategori' },
      { term: 'Kategori 5: Herjelek og brytekamp (Rough-and-tumble play)', definition: 'Fysisk kamplek med latter, jakt og bryting der barna tester egen styrke, kroppskontroll og lærer sosiale grenser i trygge rammer.', category: 'Risikokategori' },
      { term: 'Kategori 6: Forsvinne og gjemme seg (Sandseter)', definition: 'Å få leke ute av syne eller gjemme seg i busker og kroker for å oppleve hemmelighold, autonomi og selvstendighet.', category: 'Risikokategori' },
      { term: 'Affordance i lekemiljøet (James J. Gibson)', definition: 'De handlings- og lekemulighetene som det fysiske miljøet innbyr og inviterer barnet til å utforske.', category: 'Miljøpsykologi' },
      { term: 'Integrerte tumlearealer (Kleppe, Sando & Sandseter)', definition: 'Bevisst utforming av innendørsarealer med myke moduler og nivåforskjeller for trygg risikomestring og grovmotorisk utfoldelse.', category: 'Fysisk miljø' },
      { term: 'Risikomestring og mestringstro (Bandura)', definition: 'Barnets erfarte tro på at det klarer å mestre krevende motoriske utfordringer gjennom egen kroppslig utprøving.', category: 'Psykologi' }
    ]
  },
  rammeplan: {
    title: 'Rammeplan & Barnehagelov',
    subtitle: 'Nasjonale føringer, barns rettigheter og verdigrunnlag',
    cards: [
      { term: 'Barns medvirkning (Barnehageloven § 3)', definition: 'Barn i barnehagen har rett til å gi uttrykk for sitt syn på barnehagens daglige virksomhet. De skal jevnlig få mulighet til aktiv deltakelse i planlegging og vurdering, tilpasset alder og forutsetninger.', category: 'Lovverk' },
      { term: 'Danning i barnehagen', definition: 'En helhetlig, livslang prosess der barnet utvikler evne til å tenke selv, handle etisk, vise empati og reflektere over egne handlinger i samspill med andre. Danning overskrider ren sosialisering.', category: 'Rammeplanen' },
      { term: 'Progresjon (Rammeplanen kap. 3)', definition: 'Barnehagen skal tilrettelegge for at alle barn opplever mestring og samtidig møter nye, stimulerende utfordringer etter hvert som de utvikler seg og modnes.', category: 'Didaktikk' },
      { term: 'Pedagogisk dokumentasjon', definition: 'Et verktøy for felles refleksjon over pedagogisk praksis. Synliggjør barnas læringsprosesser og personalets arbeid for barn, foreldre og kolleger.', category: 'Metode' },
      { term: 'Inkludering og fellesskap', definition: 'Alle barn skal erfare å høre til og være betydningsfulle deltakere i barnegruppen, uavhengig av funksjonsnivå, bakgrunn og forutsetninger.', category: 'Verdigrunnlag' }
    ]
  },
  teoretikere: {
    title: 'Sentrale Teoretikere',
    subtitle: 'Berit Bae, Lev Vygotskij, William Corsaro, John Dewey',
    cards: [
      { term: 'Anerkjennende relasjoner (Berit Bae)', definition: 'Personalets evne til å lytte med et "tredje øre", ta barnets perspektiv på alvor og skape likeverdige subjekt-til-subjekt-møter i hverdagen.', category: 'Relasjonsarbeid' },
      { term: 'Den proksimale utviklingssonen (Vygotskij)', definition: 'Avstanden mellom hva et barn kan mestre på egen hånd, og hva barnet kan klare med veiledning og støtte ("scaffolding") fra en mer kompetent person.', category: 'Utviklingspsykologi' },
      { term: 'Jevnalderkultur & Peer Culture (William Corsaro)', definition: 'De faste aktivitetene, rutinene, verdiene og interessene som barn skaper og deler i samspill med hverandre i barnehagen.', category: 'Lek & Samspill' },
      { term: 'Erfaringsbasert læring / "Learning by doing" (John Dewey)', definition: 'Læring skjer gjennom aktiv handling koblet til refleksjon. Barnet lærer best ved å undersøke, erfare og bearbeide inntrykk i praksis.', category: 'Pedagogikk' },
      { term: 'Kroppslig væren (Gunvor Løkken)', definition: 'De yngste barnas primære måte å erfare, kommunisere og uttrykke seg på i barnehagen – gjennom bevegelse, berøring, blikk og romlig tilstedeværelse.', category: 'Småbarnspedagogikk' }
    ]
  },
  didaktikk: {
    title: 'Didaktikk & Metode',
    subtitle: 'Didaktisk relasjonsmodell, observasjon og profesjonsfaglig skjønn',
    cards: [
      { term: 'Didaktisk relasjonsmodell (Bjørndal & Løw)', definition: 'Seks gjensidig avhengige faktorer: Mål, Innhold, Arbeidsmåter, Rammefaktorer, Vurdering og Læringsforutsetninger/Barnas forutsetninger.', category: 'Didaktikk' },
      { term: 'Løpende protokoll (Observasjon)', definition: 'Systematisk, narrativ nedtegning av alt som skjer i en avgrenset tidsperiode eller situasjon, med skille mellom beskrivelse og tolkning.', category: 'Observasjon' },
      { term: 'Profesjonsfaglig skjønn', definition: 'Barnehagelærerens evne til å handle etisk og faglig forsvarlig i uforutsigbare, unike situasjoner i barnehagehverdagen.', category: 'Etikk' },
      { term: 'Risikofylt lek (Ellen Beate H. Sandseter)', definition: 'Spennende og utfordrende lek som innebærer risiko for mindre fysisk skade. Gir barn uvurderlig mestringsfølelse og risikovurderingskompetanse.', category: 'Leketeori' }
    ]
  }
};

interface FlashcardModuleProps {
  sharedRagContext?: string;
  onCardsGenerated?: (cards: FlashcardItem[]) => void;
  onBackToTools?: () => void;
  onNavigateToResources?: () => void;
}

export function FlashcardModule({ 
  sharedRagContext = '', 
  onCardsGenerated,
  onBackToTools,
  onNavigateToResources
}: FlashcardModuleProps) {
  const { activePensumFiles, requestedCardCount, setRequestedCardCount } = usePensumHub();
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [score, setScore] = useState<{ known: number; unknown: number }>({ known: 0, unknown: 0 });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentDeckName, setCurrentDeckName] = useState<string>('Rammeplan & Barnehagelov');

  // Custom card count state (5, 10, 15, 20, 25, 30)
  const [cardCount, setCardCount] = useState<number>(() => requestedCardCount || 10);

  // Custom pasted notes for files with no text content
  const [pastedNotesText, setPastedNotesText] = useState('');
  const [showEmptyContentWarning, setShowEmptyContentWarning] = useState(false);
  const [emptySourceNames, setEmptySourceNames] = useState<string[]>([]);

  useEffect(() => {
    if (requestedCardCount && requestedCardCount !== cardCount) {
      setCardCount(requestedCardCount);
    }
  }, [requestedCardCount]);

  const selectedFileIdsKey = activePensumFiles ? activePensumFiles.map(f => `${f.id}_${f.title}`).sort().join(',') : '';

  // Auto-generate cards from Pensum-Hub active files if present
  useEffect(() => {
    console.log("FlashcardModule: useEffect running with files:", activePensumFiles);
    const targetCount = requestedCardCount || cardCount || 10;

    if (!selectedFileIdsKey) {
      if (sharedRagContext && sharedRagContext.trim().length >= 20) {
        console.log("FlashcardModule: Generating from sharedRagContext");
        handleGenerateFromText(sharedRagContext, 'Fra fellesnotater & pensum', targetCount);
      }
      return;
    }

    if (activePensumFiles && activePensumFiles.length > 0) {
      console.log("FlashcardModule: Generating from activePensumFiles:", activePensumFiles);
      setShowEmptyContentWarning(false);

      const combinedText = activePensumFiles.map(f => {
        const textContent = (f.content && f.content.trim().length > 0) ? f.content : f.title;
        return `DOKUMENT / PENSUMKILDE: ${f.title}\nKATEGORI: ${f.category || 'Pensum'}\nINNHOLD / TEMA / TEKST:\n${textContent}`;
      }).join('\n\n---\n\n');

      const sourceLabel = activePensumFiles.length === 1 
        ? activePensumFiles[0].title 
        : `${activePensumFiles.length} valgte pensumkilder`;

      handleGenerateFromText(combinedText, sourceLabel, targetCount);
    }
  }, [selectedFileIdsKey, sharedRagContext, requestedCardCount]);

  const handleGenerateFromText = async (textInnhold: string, sourceLabel: string, targetCount?: number) => {
    const countToUse = targetCount || cardCount || requestedCardCount || 10;
    setIsLoading(true);
    setErrorMessage(null);
    setCards([]);
    setCurrentIndex(0);
    setScore({ known: 0, unknown: 0 });
    setIsFlipped(false);
    setCurrentDeckName(sourceLabel);

    try {
      const generatedCards = await generateFlashcards(textInnhold, countToUse);
      if (generatedCards && generatedCards.length > 0) {
        setCards(generatedCards);
        if (onCardsGenerated) {
          onCardsGenerated(generatedCards);
        }
      } else {
        const fallbackCards = await generateFlashcards(textInnhold, countToUse);
        setCards(fallbackCards);
      }
    } catch (error: any) {
      console.warn("Feil ved generering av flashcards:", error);
      const fallbackCards = await generateFlashcards(textInnhold, countToUse);
      setCards(fallbackCards);
      setErrorMessage("Kunne ikke nå AI-tjenesten akkurat nå, viser garanterte fagkort for barnehagepedagogikk.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardCountChange = (newCount: number) => {
    setCardCount(newCount);
    setRequestedCardCount(newCount);

    if (activePensumFiles && activePensumFiles.length > 0) {
      const combinedText = activePensumFiles.map(f => {
        const textContent = (f.content && f.content.trim().length > 0) ? f.content : f.title;
        return `DOKUMENT / PENSUMKILDE: ${f.title}\nKATEGORI: ${f.category || 'Pensum'}\nINNHOLD / TEMA / TEKST:\n${textContent}`;
      }).join('\n\n---\n\n');

      const sourceLabel = activePensumFiles.length === 1 
        ? activePensumFiles[0].title 
        : `${activePensumFiles.length} valgte pensumkilder`;

      handleGenerateFromText(combinedText, sourceLabel, newCount);
    } else if (sharedRagContext && sharedRagContext.trim().length >= 20) {
      handleGenerateFromText(sharedRagContext, 'Fra fellesnotater & pensum', newCount);
    } else if (pastedNotesText && pastedNotesText.trim().length >= 15) {
      handleGenerateFromText(
        `KILDE: ${emptySourceNames.join(', ')}\n\nINNLIMT PENSUMTEKST:\n${pastedNotesText}`,
        emptySourceNames[0] || 'Innlimte notater',
        newCount
      );
    } else {
      handleGenerateFromText(currentDeckName || 'Barnehagepedagogikk & Rammeplanen', currentDeckName || 'Barnehagepedagogikk', newCount);
    }
  };

  const handleSelectPresetDeck = async (deckKey: string) => {
    const deck = PRESET_DECKS[deckKey];
    if (!deck) return;
    setErrorMessage(null);
    setShowEmptyContentWarning(false);
    
    // Generer eller tilpass kortstokken til den valgte antall-innstillingen
    const countToUse = cardCount || requestedCardCount || 10;
    try {
      setIsLoading(true);
      const generatedCards = await generateFlashcards(deck.title + " " + deck.subtitle, countToUse);
      setCards(generatedCards);
      setCurrentDeckName(deck.title);
      setCurrentIndex(0);
      setScore({ known: 0, unknown: 0 });
      setIsFlipped(false);
      if (onCardsGenerated) {
        onCardsGenerated(generatedCards);
      }
    } catch {
      let fallbackDeck = [...deck.cards];
      while (fallbackDeck.length < countToUse) {
        fallbackDeck.push(...deck.cards.map((c, i) => ({
          ...c,
          term: `${c.term} (${i + 1})`
        })));
      }
      setCards(fallbackDeck.slice(0, countToUse));
      setCurrentDeckName(deck.title);
      setCurrentIndex(0);
      setScore({ known: 0, unknown: 0 });
      setIsFlipped(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextCard = (knewIt: boolean) => {
    stopAudio();
    setIsPlayingAudio(false);
    setScore(prev => ({
      ...prev,
      [knewIt ? 'known' : 'unknown']: prev[knewIt ? 'known' : 'unknown'] + 1
    }));
    setIsFlipped(false);
    
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, cards.length));
    }, 150);
  };

  const handlePrevCardNav = () => {
    stopAudio();
    setIsPlayingAudio(false);
    setIsFlipped(false);
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNextCardNav = () => {
    stopAudio();
    setIsPlayingAudio(false);
    setIsFlipped(false);
    setCurrentIndex(prev => Math.min(cards.length - 1, prev + 1));
  };

  const handlePlayCardAudio = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingAudio) {
      stopAudio();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      playAudio(text, {
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false)
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-5 py-20 px-4 text-center max-w-md mx-auto">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-md">
            <Layers className="w-8 h-8 animate-pulse text-blue-600" />
          </div>
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin absolute -top-2 -right-2" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Genererer puggekort ({cardCount} kort)</h3>
          <p className="text-slate-600 font-semibold text-sm mt-1 animate-pulse">
            AI-en studerer pensumet ditt og lager {cardCount} puggekort...
          </p>
        </div>
      </div>
    );
  }

  // Warning screen when selected file has no text in DB
  if (showEmptyContentWarning) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8 px-4 max-w-xl mx-auto w-full">
        {/* Navigasjonslinje på toppen */}
        <div className="w-full flex items-center justify-between mb-2 text-xs">
          {onBackToTools && (
            <button
              onClick={onBackToTools}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tilbake til verktøykassen</span>
            </button>
          )}
          {onNavigateToResources && (
            <button
              onClick={onNavigateToResources}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition-colors cursor-pointer"
            >
              <Library className="w-3.5 h-3.5" />
              <span>Endre kilder i Filarkivet</span>
            </button>
          )}
        </div>

        <div className="w-full p-6 bg-amber-50/90 border border-amber-200/90 rounded-3xl text-left space-y-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-amber-100 rounded-2xl text-amber-800 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-950">
                Mangler registrert fulltekst for kilden
              </h3>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed font-medium">
                Følgende valgte kilde inneholder kun en tittel/referanse uten tilhørende fulltekst i arkivet:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {emptySourceNames.map((name, i) => (
                  <span key={i} className="text-[11px] font-bold bg-amber-200/70 text-amber-950 px-2.5 py-1 rounded-lg border border-amber-300">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-amber-200/60 space-y-3">
            <p className="text-xs text-amber-900 font-semibold">
              Lim inn notater, utdrag eller faglige begreper fra kapittelet under for at AI-en skal generere tilpassede puggekort:
            </p>
            <textarea
              value={pastedNotesText}
              onChange={(e) => setPastedNotesText(e.target.value)}
              rows={5}
              placeholder={`Lim inn utdrag, sammendrag eller notater fra ${emptySourceNames[0] || 'kilden'} her...`}
              className="w-full p-3.5 bg-white border border-amber-300 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-sans leading-relaxed"
            />

            {errorMessage && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {errorMessage}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={() => {
                  if (pastedNotesText.trim().length < 15) {
                    setErrorMessage("Vennligst lim inn litt mer tekst (minst et par setninger) for at AI-en skal kunne generere kort.");
                    return;
                  }
                  setShowEmptyContentWarning(false);
                  handleGenerateFromText(
                    `KILDE: ${emptySourceNames.join(', ')}\n\nINNLIMT PENSUMTEKST:\n${pastedNotesText}`,
                    emptySourceNames[0] || 'Innlimte notater',
                    cardCount
                  );
                }}
                disabled={pastedNotesText.trim().length < 15}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generer fra innlimt tekst</span>
              </button>

              {onNavigateToResources && (
                <button
                  onClick={onNavigateToResources}
                  className="py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Library className="w-4 h-4 text-blue-600" />
                  <span>Velg andre kilder i Filarkivet</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8 px-4 max-w-lg mx-auto w-full">
        <div className="w-full flex items-center justify-between mb-2">
          {onBackToTools && (
            <button
              onClick={onBackToTools}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Tilbake til verktøykassen</span>
            </button>
          )}
          {onNavigateToResources && (
            <button
              onClick={onNavigateToResources}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors cursor-pointer"
            >
              <Library className="w-3.5 h-3.5" />
              <span>Velg kilder i Filarkivet</span>
            </button>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl text-blue-600 shadow-2xs">
          <Brain className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Teori-Flashcards & Eksamensdrill</h3>
          <p className="text-slate-600 mt-2 text-sm leading-relaxed">
            Test deg selv på pedagogiske kjernebegreper, Rammeplanen og teoretikere. Velg et fagområde eller hent kilder fra Filarkivet.
          </p>
        </div>

        {activePensumFiles.length > 0 && (
          <div className="w-full p-4 bg-blue-50/80 border border-blue-200 rounded-2xl text-left flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900">{activePensumFiles.length} kilder valgt fra Filarkivet</p>
                <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                  {activePensumFiles.map(f => f.title).join(', ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const combined = activePensumFiles.map(f => `${f.title}:\n${f.content || ''}`).join('\n\n');
                handleGenerateFromText(combined, `${activePensumFiles.length} valgte pensumkilder`, cardCount);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generer fra kilder</span>
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="w-full p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs text-left leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* Utvalgte ferdige kortstokker */}
        <div className="w-full space-y-2.5 text-left">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ferdige kortstokker (Standard)</p>
          <div className="grid grid-cols-1 gap-2.5">
            {Object.entries(PRESET_DECKS).map(([key, deck]) => (
              <button
                key={key}
                onClick={() => handleSelectPresetDeck(key)}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-2xl transition-all flex items-center justify-between text-left group cursor-pointer shadow-2xs"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" /> {deck.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{deck.subtitle}</p>
                </div>
                <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  Start drill →
                </span>
              </button>
            ))}
          </div>
        </div>

        {onNavigateToResources && (
          <button 
            onClick={onNavigateToResources}
            className="w-full bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Library className="w-4 h-4 text-amber-400" /> Velg kilder fra Filarkivet
          </button>
        )}
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center py-12 px-4 max-w-md mx-auto">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Kortstokk fullført! 🎉</h3>
        <p className="text-sm text-slate-500 font-medium">{currentDeckName}</p>
        <div className="flex justify-center gap-8 py-2">
          <div className="text-emerald-700">
            <p className="text-4xl font-black tabular-nums">{score.known}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">Satt den</p>
          </div>
          <div className="text-amber-700">
            <p className="text-4xl font-black tabular-nums">{score.unknown}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">Må repeteres</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button 
            onClick={() => {
              setCurrentIndex(0);
              setIsFlipped(false);
              setScore({ known: 0, unknown: 0 });
            }}
            className="flex-1 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Start på nytt
          </button>
          <button 
            onClick={() => setCards([])}
            className="flex-1 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm cursor-pointer"
          >
            Velg ny kortstokk
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-4 px-2">
      {/* Topp-header med navigasjon, kortvelger og status */}
      <div className="w-full flex items-center justify-between mb-4 text-xs text-slate-500 border-b border-slate-100 pb-3 gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 min-w-0">
          {onBackToTools && (
            <button
              onClick={onBackToTools}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer mr-0.5 shrink-0"
              title="Tilbake til verktøykassen"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          {onNavigateToResources && (
            <button
              onClick={onNavigateToResources}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-bold transition-colors cursor-pointer text-[11px] shrink-0"
              title="Endre valgte kilder i Filarkivet"
            >
              <Library className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Bytt kilder</span>
            </button>
          )}
          <span className="font-extrabold text-slate-800 truncate max-w-[120px] sm:max-w-[180px]">
            {currentDeckName}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 text-[11px] shrink-0">
            Kort {currentIndex + 1} av {cards.length}
          </span>
        </div>

        {/* Antall kortvelger i toppen */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 px-1 hidden sm:inline">Antall:</span>
            {[5, 10, 15, 20, 25, 30].map(cnt => (
              <button
                key={cnt}
                type="button"
                onClick={() => handleCardCountChange(cnt)}
                className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer",
                  cardCount === cnt 
                    ? "bg-blue-600 text-white shadow-2xs" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                )}
                title={`Generer ${cnt} kort`}
              >
                {cnt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 font-semibold">
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg tabular-nums text-[11px]">
              {score.known} ✓
            </span>
            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg tabular-nums text-[11px]">
              {score.unknown} ✗
            </span>
          </div>
        </div>
      </div>

      {/* Selve 3D flipp-kortet */}
      <div 
        className="w-full min-h-[340px] sm:min-h-[360px] relative cursor-pointer group"
        style={{ perspective: '1000px' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="w-full h-full min-h-[340px] sm:min-h-[360px] relative"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* Forside (Term) */}
          <div 
            className="absolute inset-0 bg-white border border-slate-200/90 rounded-3xl shadow-sm flex flex-col items-center justify-between p-7 text-center hover:border-blue-400/80 transition-colors"
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden' 
            }}
          >
            <div className="w-full flex justify-between items-center text-xs">
              {currentCard.category ? (
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-100 text-[11px]">
                  {currentCard.category}
                </span>
              ) : <span />}
              <span className="text-[11px] font-semibold text-slate-400">Forside</span>
            </div>

            <div className="my-auto px-2">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 leading-snug">
                {currentCard.term}
              </h2>
            </div>

            <p className="text-xs text-slate-400 font-medium group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" /> Trykk for å snu kortet
            </p>
          </div>

          {/* Bakside (Definisjon) */}
          <div 
            className="absolute inset-0 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col items-center justify-between p-7 text-center"
            style={{ 
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <div className="w-full flex justify-between items-center text-xs">
              {currentCard.category ? (
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-amber-300 font-bold text-[11px]">
                  {currentCard.category}
                </span>
              ) : <span />}
              <span className="text-[11px] font-semibold text-slate-400">Bakside (Forklaring)</span>
            </div>

            <div className="my-auto overflow-y-auto max-h-[220px] px-2">
              <p className="text-sm sm:text-base font-normal leading-relaxed text-slate-100">
                {currentCard.definition}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handlePlayCardAudio(currentCard.definition, e)}
                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-slate-200"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-pulse text-amber-300' : ''}`} />
                {isPlayingAudio ? 'Stopp lyd' : 'Les opp forklaring'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigasjons- og snukontroller under kortet */}
      <div className="w-full space-y-3 mt-4">
        {/* Hovedknapp for å snu kortet */}
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs border border-slate-200"
        >
          <RotateCw className="w-3.5 h-3.5 text-blue-600" />
          <span>{isFlipped ? 'Vis forside' : 'Snu kortet for å se forklaring'}</span>
        </button>

        {/* Forrige / Neste navigasjon */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handlePrevCardNav}
            disabled={currentIndex === 0}
            className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl font-bold text-xs border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Forrige</span>
          </button>

          <span className="text-xs font-bold text-slate-500 tabular-nums px-2">
            {currentIndex + 1} / {cards.length}
          </span>

          <button
            onClick={handleNextCardNav}
            disabled={currentIndex === cards.length - 1}
            className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl font-bold text-xs border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
          >
            <span>Neste</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Vurderingskontroller ("Må repeteres" / "Satt den!") */}
        <AnimatePresence>
          {isFlipped && (
            <motion.div 
              key="flashcard-controls" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex gap-2.5 pt-1"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); handleNextCard(false); }}
                className="flex-1 py-3 bg-amber-50 text-amber-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-all border border-amber-200 cursor-pointer text-xs"
              >
                <XCircle className="w-4 h-4 text-amber-600" />
                <span>Må repeteres</span>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleNextCard(true); }}
                className="flex-1 py-3 bg-emerald-50 text-emerald-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200 cursor-pointer text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Satt den!</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <button
          onClick={() => setCards([])}
          className="hover:text-slate-700 transition-colors cursor-pointer"
        >
          Bytt kortstokk
        </button>
      </div>
    </div>
  );
}
