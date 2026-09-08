import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  Volume2, 
  RefreshCw, 
  Share2, 
  Download, 
  BookOpen, 
  Send, 
  Trees, 
  Flame, 
  BookMarked, 
  Waves,
  HeartHandshake
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateParentUpdate, ParentUpdateResult, playAudio, stopAudio } from '../services/geminiService';

export function VisualContentGenerator() {
  const [activity, setActivity] = useState('Skogstur til Trolldalen med kongledyr, undring over meitemark og klatring på steiner');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ParentUpdateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const presetActivities = [
    {
      title: 'Skogstur & Kongledyr',
      icon: <Trees className="w-4 h-4 text-emerald-600" />,
      text: 'Tur til skogen der barna samlet kongler og mose for å lage egne kongledyr, og klatret på store steiner i ulendt terreng.'
    },
    {
      title: 'Sølelek & Vanndammer',
      icon: <Waves className="w-4 h-4 text-cyan-600" />,
      text: 'Vann- og sølelek etter høstregnet med bøtter, spader og flytende bladbåter i store vanndammer.'
    },
    {
      title: 'Bukkene Bruse med konkreter',
      icon: <BookMarked className="w-4 h-4 text-purple-600" />,
      text: 'Dramatisering av eventyret om De tre bukkene Bruse med trefigurer og hjemmelaget trebro i samlingsstund.'
    },
    {
      title: 'Spikking & Bålhygge',
      icon: <Flame className="w-4 h-4 text-amber-600" />,
      text: 'Friluftsdag i lavvoen med bål, trygg spikking av grillpinner og steking av havre-pinnebrød.'
    },
    {
      title: 'Bake grove rundstykker',
      icon: <HeartHandshake className="w-4 h-4 text-rose-600" />,
      text: 'Matlaging der barna målte opp mel, eltet deig og trillet egne grove rundstykker til ettermiddagsmåltidet.'
    }
  ];

  const handleGenerate = async (customText?: string) => {
    const targetActivity = customText || activity;
    if (!targetActivity.trim() || isGenerating) return;

    setIsGenerating(true);
    setCopied(false);
    stopAudio();
    setIsPlayingAudio(false);

    try {
      const data = await generateParentUpdate(targetActivity);
      setResult(data);
    } catch (err) {
      console.error("Feil ved generering:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleToggleAudio = () => {
    if (!result?.text) return;
    if (isPlayingAudio) {
      stopAudio();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      playAudio(result.text, {
        onEnd: () => setIsPlayingAudio(false),
        onError: () => setIsPlayingAudio(false)
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
            <ImageIcon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full">
                Visuell Innholdsgenerator & Imagen 3
              </span>
              <span className="text-xs text-slate-400 font-bold">• MyKid, Vigilo & Månedsbrev</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">Dagens Bilde & Foreldreoppdatering</h2>
            <p className="text-sm text-slate-600 mt-1">
              Generer en sjarmerende bildeillustrasjon og et profesjonelt, pedagogisk forankret tekstutkast klart til deling med hjemmet.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Activity Chips */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Hurtigvalg: Hva har barna opplevd i dag?
          </h3>
          <span className="text-xs text-slate-400">Velg en mal eller skriv eget under</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
          {presetActivities.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setActivity(item.text);
                handleGenerate(item.text);
              }}
              className="p-3 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-200 rounded-2xl text-left transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="p-1.5 bg-white rounded-lg shadow-2xs group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-900">{item.title}</span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {item.text}
              </p>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="pt-2 flex gap-2">
          <input
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate(); }}
            placeholder="Beskriv dagens aktivitet, lek eller turmål..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all font-medium"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={!activity.trim() || isGenerating}
            className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-700/20 shrink-0"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Skaper innhold...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generer innlegg</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result Display: Split Window (Image on Top, Text Draft Below) */}
      {isGenerating ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4 text-center">
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 animate-spin">
            <RefreshCw className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Genererer illustrasjon og pedagogisk tekst...</h3>
          <p className="text-xs text-slate-500 max-w-md">
            Gemini formulerer en hjertevarm oppdatering med forankring i Rammeplanen, mens bilde-motoren lager en sjarmerende barnehageillustrasjon.
          </p>
        </div>
      ) : result ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
        >
          {/* Top Section: Generated Image with Controls */}
          <div className="relative group bg-slate-900 overflow-hidden max-h-[420px] flex items-center justify-center">
            <img
              src={result.imageUrl}
              alt="Dagens barnehagebilde"
              className="w-full h-full object-cover max-h-[420px] transition-transform duration-700 group-hover:scale-102"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none"></div>

            {/* Overlay Info & Download */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white font-bold text-xs rounded-full border border-white/20 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                Dagens Illustrasjon (Imagen 3)
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
              <p className="text-xs text-white/90 font-medium line-clamp-1 max-w-lg drop-shadow-md">
                «{activity}»
              </p>
              <a
                href={result.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Åpne bilde
              </a>
            </div>
          </div>

          {/* Bottom Section: Ready-to-copy Parent Update */}
          <div className="p-6 md:p-8 space-y-6 bg-white">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-900">Tekstutkast til foreldrene</h3>
                <p className="text-xs text-slate-500 font-medium">Klart til å limes inn i MyKid, Vigilo eller barnehagens månedsbrev</p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleToggleAudio}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                  title="Lytt til teksten"
                >
                  <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse text-amber-500' : ''}`} />
                  {isPlayingAudio ? 'Stopp opplesing' : 'Lytt til utkast'}
                </button>

                <button
                  onClick={handleCopyText}
                  className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                    copied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-900 hover:bg-black text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Kopiert til utklippstavle!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Kopier tekst
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Formatted Content */}
            <div className="p-6 bg-slate-50/70 rounded-2xl border border-slate-200/80 prose prose-slate max-w-none text-slate-800 leading-relaxed text-sm md:text-base">
              <ReactMarkdown>{result.text}</ReactMarkdown>
            </div>

            {/* Rammeplan Tag Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> Forankring:
              </span>
              {result.rammeplanTags.map((tag, idx) => (
                <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-100">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
