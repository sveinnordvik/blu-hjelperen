import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, RefreshCw, CheckCircle2, XCircle, Loader2, Sparkles, RotateCw, Volume2, BookOpen, Layers } from 'lucide-react';
import { generateFlashcards, playAudio, stopAudio } from '../services/geminiService';

export interface FlashcardItem {
  term: string;
  definition: string;
  category?: string;
  example?: string;
}

const PRESET_DECKS: Record<string, { title: string; subtitle: string; cards: FlashcardItem[] }> = {
  rammeplan: {
    title: 'Rammeplan & Barnehagelov',
    subtitle: 'Nasjonale føringer, barns rettigheter og verdigrunnlag',
    cards: [
      { term: 'Barns medvirkning (Barnehageloven § 3)', definition: 'Barn i barnehagen har rett til å gi uttrykk for sitt syn på barnehagens daglige virksomhet. De skal jevnlig få mulighet til aktiv deltakelse i planlegging og vurdering, tilpasset alder og forutsetninger.' },
      { term: 'Danning i barnehagen', definition: 'En helhetlig, livslang prosess der barnet utvikler evne til å tenke selv, handle etisk, vise empati og reflektere over egne handlinger i samspill med andre. Danning overskrider ren sosialisering.' },
      { term: 'Progresjon (Rammeplanen kap. 3)', definition: 'Barnehagen skal tilrettelegge for at alle barn opplever mestring og samtidig møter nye, stimulerende utfordringer etter hvert som de utvikler seg og modnes.' },
      { term: 'Pedagogisk dokumentasjon', definition: 'Et verktøy for felles refleksjon over pedagogisk praksis. Synliggjør barnas læringsprosesser og personalets arbeid for barn, foreldre og kolleger.' },
      { term: 'Inkludering og fellesskap', definition: 'Alle barn skal erfare å høre til og være betydningsfulle deltakere i barnegruppen, uavhengig av funksjonsnivå, bakgrunn og forutsetninger.' }
    ]
  },
  teoretikere: {
    title: 'Sentrale Teoretikere',
    subtitle: 'Berit Bae, Lev Vygotskij, William Corsaro, John Dewey',
    cards: [
      { term: 'Anerkjennende relasjoner (Berit Bae)', definition: 'Personalets evne til å lytte med et "tredje øre", ta barnets perspektiv på alvor og skape likeverdige subjekt-til-subjekt-møter i hverdagen.' },
      { term: 'Den proksimale utviklingssonen (Vygotskij)', definition: 'Avstanden mellom hva et barn kan mestre på egen hånd, og hva barnet kan klare med veiledning og støtte ("scaffolding") fra en mer kompetent person.' },
      { term: 'Jevnalderkultur & Peer Culture (William Corsaro)', definition: 'De faste aktivitetene, rutinene, verdiene og interessene som barn skaper og deler i samspill med hverandre i barnehagen.' },
      { term: 'Erfaringsbasert læring / "Learning by doing" (John Dewey)', definition: 'Læring skjer gjennom aktiv handling koblet til refleksjon. Barnet lærer best ved å undersøke, erfare og bearbeide inntrykk i praksis.' },
      { term: 'Kroppslig væren (Gunvor Løkken)', definition: 'De yngste barnas primære måte å erfare, kommunisere og uttrykke seg på i barnehagen – gjennom bevegelse, berøring, blikk og romlig tilstedeværelse.' }
    ]
  },
  didaktikk: {
    title: 'Didaktikk & Metode',
    subtitle: 'Didaktisk relasjonsmodell, observasjon og profesjonsfaglig skjønn',
    cards: [
      { term: 'Didaktisk relasjonsmodell (Bjørndal & Løw)', definition: 'Seks gjensidig avhengige faktorer: Mål, Innhold, Arbeidsmåter, Rammefaktorer, Vurdering og Læringsforutsetninger/Barnas forutsetninger.' },
      { term: 'Løpende protokoll (Observasjon)', definition: 'Systematisk, narrativ nedtegning av alt som skjer i en avgrenset tidsperiode eller situasjon, med skille mellom beskrivelse og tolkning.' },
      { term: 'Profesjonsfaglig skjønn', definition: 'Barnehagelærerens evne til å handle etisk og faglig forsvarlig i uforutsigbare, unike situasjoner i barnehagehverdagen.' },
      { term: 'Risikofylt lek (Ellen Beate H. Sandseter)', definition: 'Spennende og utfordrende lek som innebærer risiko for mindre fysisk skade. Gir barn uvurderlig mestringsfølelse og risikovurderingskompetanse.' }
    ]
  }
};

interface FlashcardModuleProps {
  sharedRagContext?: string;
  onCardsGenerated?: (cards: FlashcardItem[]) => void;
}

export function FlashcardModule({ sharedRagContext = '', onCardsGenerated }: FlashcardModuleProps) {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [score, setScore] = useState<{ known: number; unknown: number }>({ known: 0, unknown: 0 });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentDeckName, setCurrentDeckName] = useState<string>('Rammeplan & Barnehagelov');

  const handleSelectPresetDeck = (deckKey: string) => {
    const deck = PRESET_DECKS[deckKey];
    if (!deck) return;
    setErrorMessage(null);
    setCards(deck.cards);
    setCurrentDeckName(deck.title);
    setCurrentIndex(0);
    setScore({ known: 0, unknown: 0 });
    setIsFlipped(false);
    if (onCardsGenerated) {
      onCardsGenerated(deck.cards);
    }
  };

  const handleGenerateFromNotes = async () => {
    if (!sharedRagContext || sharedRagContext.trim().length < 20) {
      setErrorMessage("Fellesnotatene har for lite tekst. Velg en av de ferdige kortstokkene nedenfor, eller skriv litt i fellesnotatene først.");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    setCards([]);
    setCurrentIndex(0);
    setScore({ known: 0, unknown: 0 });
    setIsFlipped(false);
    setCurrentDeckName('Fra fellesnotater & pensum');

    try {
      const generatedCards = await generateFlashcards(sharedRagContext);
      if (generatedCards && generatedCards.length > 0) {
        setCards(generatedCards);
        if (onCardsGenerated) {
          onCardsGenerated(generatedCards);
        }
      } else {
        setCards(PRESET_DECKS.rammeplan.cards);
      }
    } catch (error: any) {
      console.error("Feil ved generering av flashcards:", error);
      setCards(PRESET_DECKS.rammeplan.cards);
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
      setCurrentIndex(prev => prev + 1);
    }, 150);
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
      <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-16">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-600 font-bold animate-pulse text-sm">Tråler pensum og fellesnotater for eksamensdrill...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8 px-4 max-w-lg mx-auto w-full">
        <div className="bg-primary/10 p-5 rounded-2xl text-primary">
          <Brain className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Klar for eksamensdrill?</h3>
          <p className="text-slate-600 mt-2 text-sm leading-relaxed">
            Test deg selv på pedagogiske kjernebegreper, Rammeplanen og teoretikere. Velg et fagområde eller la KI generere fra fellesnotatene.
          </p>
        </div>

        {errorMessage && (
          <div className="w-full p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs text-left leading-relaxed">
            {errorMessage}
          </div>
        )}

        {/* Utvalgte ferdige kortstokker */}
        <div className="w-full space-y-2.5 text-left">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ferdige kortstokker</p>
          <div className="grid grid-cols-1 gap-2.5">
            {Object.entries(PRESET_DECKS).map(([key, deck]) => (
              <button
                key={key}
                onClick={() => handleSelectPresetDeck(key)}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary/40 rounded-2xl transition-all flex items-center justify-between text-left group cursor-pointer shadow-xs"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" /> {deck.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{deck.subtitle}</p>
                </div>
                <span className="text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                  Start drill →
                </span>
              </button>
            ))}
          </div>
        </div>

        {sharedRagContext && sharedRagContext.trim().length >= 20 && (
          <button 
            onClick={handleGenerateFromNotes}
            className="w-full bg-slate-900 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-slate-800 shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400" /> Generer fra egne fellesnotater
          </button>
        )}
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center py-12 px-4 max-w-md mx-auto">
        <h3 className="text-2xl font-black text-slate-900">Kortstokk fullført! 🎉</h3>
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
            className="flex-1 px-5 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all text-sm cursor-pointer shadow-sm"
          >
            Start på nytt
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
    <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-4">
      <div className="w-full flex justify-between items-center mb-4 px-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">{currentDeckName}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">Kort {currentIndex + 1} av {cards.length}</span>
        </div>
        <div className="flex items-center gap-3 font-semibold">
          <span className="text-emerald-700 tabular-nums">{score.known} ✓</span>
          <span className="text-amber-700 tabular-nums">{score.unknown} ✗</span>
        </div>
      </div>

      {/* Selve kortet med 3D-flip effekt */}
      <div 
        className="w-full min-h-[320px] relative perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="w-full h-full min-h-[320px] relative preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* Forside (Term) */}
          <div className="absolute inset-0 backface-hidden bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col items-center justify-center p-8 text-center hover:border-primary/40 transition-colors">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-900 leading-snug">{currentCard.term}</h2>
            <p className="absolute bottom-6 text-xs text-slate-400 font-medium group-hover:text-primary transition-colors flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" /> Trykk for å snu kortet
            </p>
          </div>

          {/* Bakside (Definisjon) */}
          <div 
            className="absolute inset-0 backface-hidden bg-slate-900 text-white rounded-3xl shadow-lg flex flex-col items-center justify-center p-8 text-center"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <p className="text-sm md:text-base font-normal leading-relaxed overflow-y-auto max-h-[220px] pr-1 text-slate-100">
              {currentCard.definition}
            </p>
            <div className="absolute bottom-4 flex items-center gap-2">
              <button
                onClick={(e) => handlePlayCardAudio(currentCard.definition, e)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? 'animate-pulse text-amber-300' : ''}`} />
                {isPlayingAudio ? 'Stopp' : 'Lytt'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Kontroller (vises kun når kortet er snudd) */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div 
            key="flashcard-controls" 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-3 mt-6 w-full"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); handleNextCard(false); }}
              className="flex-1 py-3.5 bg-amber-50 text-amber-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-all border border-amber-200 cursor-pointer text-sm"
            >
              <XCircle className="w-4 h-4" /> Må repeteres
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleNextCard(true); }}
              className="flex-1 py-3.5 bg-emerald-50 text-emerald-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200 cursor-pointer text-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Satt den!
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
