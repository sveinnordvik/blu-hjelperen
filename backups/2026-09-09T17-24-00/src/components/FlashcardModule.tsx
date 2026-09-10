import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, RefreshCw, CheckCircle2, XCircle, Loader2, Sparkles, RotateCw, Volume2 } from 'lucide-react';
import { generateFlashcards, playAudio, stopAudio } from '../services/geminiService';

export interface FlashcardItem {
  term: string;
  definition: string;
  category?: string;
  example?: string;
}

interface FlashcardModuleProps {
  sharedRagContext?: string;
  onCardsGenerated?: (cards: FlashcardItem[]) => void;
}

export function FlashcardModule({ sharedRagContext = '', onCardsGenerated }: FlashcardModuleProps) {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState<{ known: number; unknown: number }>({ known: 0, unknown: 0 });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const handleGenerate = async () => {
    if (!sharedRagContext || sharedRagContext.trim().length < 20) {
      alert("Fellesnotatene er for korte. Skriv eller lim inn litt mer felles kontekst i kunnskapsbasen først!");
      return;
    }
    
    setIsLoading(true);
    setCards([]);
    setCurrentIndex(0);
    setScore({ known: 0, unknown: 0 });
    setIsFlipped(false);

    try {
      const generatedCards = await generateFlashcards(sharedRagContext);
      setCards(generatedCards);
      if (onCardsGenerated) {
        onCardsGenerated(generatedCards);
      }
    } catch (error: any) {
      console.error("Feil ved generering av flashcards:", error);
      // Fallback data
      const fallbackCards: FlashcardItem[] = [
        { term: "Danning", definition: "En livslang prosess der barnet utvikler evne til å reflektere over egne handlinger og holdninger. Går lenger enn ren sosialisering." },
        { term: "Progresjon", definition: "Å tilrettelegge for at barn opplever mestring samtidig som de får nye utfordringer, i tråd med Rammeplanens kapittel 3." },
        { term: "Risikofylt lek (Sandseter)", definition: "Spennende lek som innebærer fare for fysisk skade. Avgjørende for barns risikomestring og kroppslige trygghet." },
        { term: "Barns medvirkning (Barnehageloven § 3)", definition: "Barn har rett til å gi uttrykk for sitt syn på barnehagens daglige virksomhet etter alder og modenhet." }
      ];
      setCards(fallbackCards);
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
        <p className="text-slate-500 font-bold animate-pulse text-sm">Tråler fellesnotatene for pensum og lager eksamensdrill...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-12 px-4 max-w-md mx-auto">
        <div className="bg-primary-light/30 p-6 rounded-full text-primary">
          <Brain className="w-12 h-12" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Klar for eksamensdrill?</h3>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            Jeg genererer skreddersydde spørsmål basert på det gruppen har skrevet i fellesnotatene og Rammeplanen.
          </p>
        </div>
        <button 
          onClick={handleGenerate}
          className="bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary-hover shadow-lg shadow-primary-light transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" /> Generer Flashcards
        </button>
      </div>
    );
  }

  if (currentIndex >= cards.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 text-center py-12 px-4">
        <h3 className="text-2xl font-black text-slate-900">Økt fullført! 🎉</h3>
        <div className="flex gap-8">
          <div className="text-emerald-600">
            <p className="text-4xl font-black">{score.known}</p>
            <p className="text-sm font-bold uppercase tracking-wider">Kunne godt</p>
          </div>
          <div className="text-amber-600">
            <p className="text-4xl font-black">{score.unknown}</p>
            <p className="text-sm font-bold uppercase tracking-wider">Må repeteres</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setCurrentIndex(0);
              setIsFlipped(false);
              setScore({ known: 0, unknown: 0 });
            }}
            className="mt-4 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all"
          >
            Start samme kortstokk på nytt
          </button>
          <button 
            onClick={handleGenerate}
            className="mt-4 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
          >
            Lag ny kortstokk
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-4">
      <div className="w-full flex justify-between items-center mb-6 px-4">
        <span className="text-sm font-bold text-slate-400">Kort {currentIndex + 1} av {cards.length}</span>
        <div className="flex gap-3 text-sm font-bold">
          <span className="text-emerald-500">{score.known} ✓</span>
          <span className="text-amber-500">{score.unknown} ✗</span>
        </div>
      </div>

      {/* Selve kortet med 3D-flip effekt */}
      <div 
        className="w-full h-80 relative perspective-1000 cursor-pointer group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {/* Forside (Term) */}
          <div className="absolute inset-0 backface-hidden bg-white border-2 border-slate-100 rounded-3xl shadow-md flex items-center justify-center p-8 text-center hover:border-primary-light transition-colors">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-snug">{currentCard.term}</h2>
            <p className="absolute bottom-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest group-hover:text-primary transition-colors flex items-center gap-1">
              <RotateCw className="w-3 h-3" /> Trykk for å snu
            </p>
          </div>

          {/* Bakside (Definisjon) */}
          <div 
            className="absolute inset-0 backface-hidden bg-primary text-white rounded-3xl shadow-lg flex flex-col items-center justify-center p-8 text-center"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <p className="text-base md:text-lg font-medium leading-relaxed overflow-y-auto max-h-[200px] pr-1">
              {currentCard.definition}
            </p>
            <div className="absolute bottom-4 flex items-center gap-2">
              <button
                onClick={(e) => handlePlayCardAudio(currentCard.definition, e)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
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
          <motion.div key="ap-auto-121-1" 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex gap-4 mt-8 w-full"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); handleNextCard(false); }}
              className="flex-1 py-4 bg-amber-50 text-amber-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-all border border-amber-200 shadow-sm"
            >
              <XCircle className="w-5 h-5" /> Repeteres
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleNextCard(true); }}
              className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200 shadow-sm"
            >
              <CheckCircle2 className="w-5 h-5" /> Satt den!
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
