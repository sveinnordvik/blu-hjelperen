import React, { useState, useEffect } from 'react';
import { callGoogleAIProxy } from '../../services/geminiService';
import StaffMonthlyFocusWidget from './StaffMonthlyFocusWidget';
import { 
  HeartHandshake, 
  HelpCircle, 
  Shirt, 
  Smile, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Send, 
  CloudSun, 
  AlertCircle, 
  BookHeart, 
  Compass,
  Plus
} from 'lucide-react';

interface EmergencySituation {
  id: string;
  situation: string;
  solution: string;
  reminder: string;
}

export default function AssistentnApp() {
  const [activeTab, setActiveTab] = useState<'handbok' | 'garderobe' | 'leker' | 'dagsplan' | 'ai-venn'>('handbok');

  const [situations, setSituations] = useState<EmergencySituation[]>([
    {
      id: 's1',
      situation: 'Barnet gråter og vil ikke slippe mamma/pappa ved levering',
      solution: 'Møt barnet i øyenhøyde. Sett ord på følelsen: "Jeg ser du er lei deg og gjerne vil være med pappa. Det er helt greit å være lei seg. Kom, så vinker vi sammen ved vinduet." Hold barnet inntil deg hvis det tillater det. Vær en trygg base.',
      reminder: 'Ikke avvis følelsene eller si "det går bra" med en gang. Anerkjenn savnet først.'
    },
    {
      id: 's2',
      situation: 'To barn krangler kraftig om den samme lekebilen',
      solution: 'Gå rolig bort. Sitt ned mellom dem. Beskriv hva du ser: "Dere har begge lyst på den blå bilen akkurat nå!" Hør på begge. Hjelp dem å finne en løsning: "Kan vi sette en alarm på telefonen på 2 minutter for bytte, eller kan vi bygge en garasje sammen imens?"',
      reminder: 'Du er mekler og hjelper, ikke dommer. Læringen ligger i å finne kompromiss.'
    },
    {
      id: 's3',
      situation: 'Et barn biter eller dytter et annet barn i leken',
      solution: 'Prioriter først barnet som ble skadet – gi trøst, omsorg og kald klut. Deretter vender du deg til barnet som bet med rolig stemme: "Jeg kan ikke la deg bite, biting gjør vondt. Hvis du er sint eller vil ha leken, kan du si stopp eller hente meg."',
      reminder: 'Små barn biter ofte pga manglende ord eller overstimulering, ikke ondskap.'
    },
    {
      id: 's4',
      situation: 'Barnet nekter å ta på seg støvler eller utedress i garderoben',
      solution: 'Gjør det til en lek eller gi avgrensede valg: "Vil du ta på høyre eller venstre støvel først?" eller "Skal vi se om støvelen spiser foten din som en krokodille?". Anerkjenn hvis det er varmt eller trangt.',
      reminder: 'Barn søker ofte kontroll når de føler seg overveldet. Små valg gir mestring.'
    }
  ]);

  const [games, setGames] = useState([
    { title: 'Troll, troll kom frem!', desc: 'Ett barn (eller den voksne) er troll bak et tre/kasse. De andre barna roper: "Troll, troll kom frem!". Trollet svarer med morsom stemme før det hopper frem og kiler.' },
    { title: 'Rødt lys, grønt lys (stopplek)', desc: 'Den voksne står med ryggen til og roper "Grønt lys!". Barna sniker seg fram. Når den voksne snur seg og roper "Rødt lys!", må alle fryse til is.' },
    { title: 'Hvilket dyr er jeg?', desc: 'Den voksne etterligner lyden og bevegelsene til et dyr (f.eks. frosk, elefant, katt). Barna gjetter og gjør bevegelsen sammen.' },
    { title: 'Kongen befaler', desc: 'Glimrende for garderoben eller samling: "Kongen befaler: ta hendene på hodet", "Kongen befaler: lag trutmunn".' }
  ]);

  const [aiInput, setAiInput] = useState('');
  const [aiLog, setAiLog] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: 'Hei! Jeg er Assistent-AI, din trygge veileder. Du gjør en utrolig viktig jobb i barnehagen for barna. Står du i en vanskelig situasjon, eller lurer du på hvordan du kan roe en konflikt eller skape god stemning? Spør meg!' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAskAi = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput.trim();
    setAiLog(prev => [...prev, { role: 'user', text: msg }]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const prompt = `Du er en varm, omsorgsfull og erfaren mentor for barnehageassistenter i Norge.
Brukeren spør: "${msg}"
Svar enkelt, varmt og pedagogisk jordnært. Gi konkrete formuleringer assistenten kan si til barnet, og gi trøst og trygghet i rollen. Ingen akademisk overlast, bare hjertevarme og god praksis forankret i barns trygghet og relasjoner.`;

      const data = await callGoogleAIProxy({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      if (data?.text) {
        setAiLog(prev => [...prev, { role: 'assistant', text: data.text }]);
      } else {
        setTimeout(() => {
          setAiLog(prev => [...prev, {
            role: 'assistant',
            text: `Råd til assistenten:\n\n1. **Pust med magen**: Barn speiler din ro. Hvis du er rolig, smitter det.\n2. **Gå ned i øyenhøyde**: Sett deg på huk eller på gulvet sammen med barna.\n3. **Gi omsorg og nærhet**: Ditt varme blikk og tilstedeværelse er barnets viktigste trygghet i dag!`
          }]);
        }, 500);
      }
    } catch {
      setAiLog(prev => [...prev, { role: 'assistant', text: `Husk: Du gjør en fantastisk jobb. Når en situasjon er vanskelig, søk alltid støtte hos pedleder eller fagarbeider på avdelingen.` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-sky-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight">Assistent'n</span>
                <span className="text-[11px] font-bold bg-sky-500/20 text-sky-200 border border-sky-500/30 px-2 py-0.5 rounded-full">
                  Trygghet & Omsorg
                </span>
              </div>
              <p className="text-xs text-sky-200/80">Barnehageassistentens håndbok og støtte i hverdagen</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-sky-950/60 p-1 rounded-xl border border-sky-800/60">
            <button 
              onClick={() => setActiveTab('handbok')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'handbok' ? 'bg-sky-600 text-white shadow' : 'text-sky-200 hover:text-white hover:bg-sky-800/40'}`}
            >
              Hva gjør jeg hvis...?
            </button>
            <button 
              onClick={() => setActiveTab('garderobe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'garderobe' ? 'bg-sky-600 text-white shadow' : 'text-sky-200 hover:text-white hover:bg-sky-800/40'}`}
            >
              Garderobe & Vær
            </button>
            <button 
              onClick={() => setActiveTab('leker')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'leker' ? 'bg-sky-600 text-white shadow' : 'text-sky-200 hover:text-white hover:bg-sky-800/40'}`}
            >
              Lekehvelvet
            </button>
            <button 
              onClick={() => setActiveTab('dagsplan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'dagsplan' ? 'bg-sky-600 text-white shadow' : 'text-sky-200 hover:text-white hover:bg-sky-800/40'}`}
            >
              Dagens Sjekkliste
            </button>
            <button 
              onClick={() => setActiveTab('ai-venn')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${activeTab === 'ai-venn' ? 'bg-sky-600 text-white shadow' : 'text-sky-200 hover:text-white hover:bg-sky-800/40'}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Assistent-AI
            </button>
          </nav>
        </div>

        <div className="flex md:hidden overflow-x-auto px-4 py-2 border-t border-sky-800 gap-2 bg-sky-950/95 scrollbar-none">
          {['handbok', 'garderobe', 'leker', 'dagsplan', 'ai-venn'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${activeTab === t ? 'bg-sky-600 text-white' : 'text-sky-200 bg-sky-900/60'}`}
            >
              {t === 'ai-venn' ? 'Assistent-AI' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 1: Håndbok & Situasjoner */}
        {activeTab === 'handbok' && (
          <div className="space-y-6">
            <StaffMonthlyFocusWidget />
            <div>
              <h2 className="text-xl font-black text-slate-900">"Hva gjør jeg hvis...?" Trygghetsguiden</h2>
              <p className="text-xs text-slate-500">Konkrete råd og gode ord når utfordrende situasjoner oppstår på avdelingen.</p>
            </div>

            <div className="space-y-4">
              {situations.map(s => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <h3 className="text-slate-900 font-black text-base">{s.situation}</h3>
                  </div>
                  <div className="p-4 bg-sky-50/60 rounded-xl border border-sky-100 text-xs text-slate-700 leading-relaxed">
                    <strong className="text-sky-950 font-bold block mb-1">Slik kan du handle:</strong>
                    {s.solution}
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-900 font-medium">
                    <strong className="block font-bold mb-0.5">Viktig huskeregel:</strong>
                    {s.reminder}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Garderobe & Vær */}
        {activeTab === 'garderobe' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Garderobeguiden & Lag-på-Lag i Norsk Vær</h2>
              <p className="text-xs text-slate-500">Hold barna varme, tørre og glade uansett høstregn eller vinterkulde.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <span className="text-xs font-bold text-sky-600 uppercase">Lag 1: Innerst</span>
                <h3 className="font-black text-slate-900 text-base">Ull eller Superundertøy</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tynt ullag rett mot huden transporterer fuktighet vekk. Unngå ren bomull i kulde, da bomull blir kald og klam når barnet svetter i leken.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <span className="text-xs font-bold text-sky-600 uppercase">Lag 2: Mellomlag</span>
                <h3 className="font-black text-slate-900 text-base">Fleece eller Tykkere Ull</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Isolerer luften. På kalde dager er en god ullfleece eller strikkagenser gull verdt. Husk at plagget ikke må være for trangt!
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <span className="text-xs font-bold text-sky-600 uppercase">Lag 3: Ytterst</span>
                <h3 className="font-black text-slate-900 text-base">Vind- & Vanntett Dress</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sjekk alltid at fotstrikkene er trukket godt under støvlene/vinterskoene så det ikke kommer vann eller snø inn. Hals og lue som dekker ørene.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Lekehvelvet */}
        {activeTab === 'leker' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Lekehvelvet: Leker uten rekvisitter</h2>
              <p className="text-xs text-slate-500">Redningsplanker når du venter i garderoben eller har fri lek ute.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {games.map((g, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2 shadow-sm">
                  <h3 className="font-black text-slate-900 text-base">{g.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Dagsplan & Sjekkliste */}
        {activeTab === 'dagsplan' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Dagens Rutinesjekkliste for Assistenten</h2>
              <p className="text-xs text-slate-500">Gjør dagen oversiktlig og trygg for både deg og barna.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
              {[
                { task: 'Motta barn i garderoben med et smil og si barnets navn høyt', time: '07:30 - 08:30' },
                { task: 'Sette frem frokost og sørge for ro rundt bordet', time: '08:30' },
                { task: 'Hjelpe til i garderoben, veilede barna til å prøve selv', time: '10:00' },
                { task: 'Være en tilgjengelig og lekende voksen ute i sandkassa/klatrestativet', time: '10:30 - 11:30' },
                { task: 'Måltid og do/bleierunder sammen med teamet', time: '11:45' },
                { task: 'Være sovevakt eller ha rolig lesestund for de våkne barna', time: '12:30 - 13:30' },
                { task: 'Fruktservering og hyggelig ettermiddagsmottak for foreldre', time: '14:30 - 16:30' }
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                  <span className="text-xs text-slate-800 font-medium">{item.task}</span>
                  <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Assistent-AI */}
        {activeTab === 'ai-venn' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-[650px]">
              <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Assistent-AI Veileder</h3>
                    <p className="text-xs text-slate-500">Få omsorgsfulle og konkrete råd for hverdagssituasjoner.</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {aiLog.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-sky-600 text-white rounded-br-none shadow' 
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-600 rounded-2xl rounded-bl-none p-4 text-xs flex items-center gap-2 border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping"></span>
                      Assistent-AI tenker...
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <input 
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                  placeholder="Spør om råd for en situasjon med barna..."
                  className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button 
                  onClick={handleAskAi}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-sky-950 text-sky-200/80 py-4 px-6 border-t border-sky-900 text-center text-xs">
        <p>Portalen: Assistent'n • Støtte for hverdagsheltene i barnehagen</p>
      </footer>
    </div>
  );
}
