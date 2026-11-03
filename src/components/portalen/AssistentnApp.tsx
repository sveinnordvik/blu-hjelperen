import React, { useState, useEffect } from 'react';
import { callGoogleAIProxy } from '../../services/geminiService';
import UserProfileModal from '../common/UserProfileModal';
import PortalFooter from '../common/PortalFooter';
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
import { useRole } from '../../context/RoleContext';

interface EmergencySituation {
  id: string;
  situation: string;
  solution: string;
  reminder: string;
}

const DEFAULT_SITUATIONS: EmergencySituation[] = [
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
];

export default function AssistentnApp() {
  const { setRole, canSwitch, isSvein, isPortalBeta, currentUserEmail } = useRole();
  const isHavard = currentUserEmail?.toLowerCase() === 'havard.hovin@melhus.kommune.no' || isPortalBeta;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'handbok' | 'garderobe' | 'leker' | 'dagsplan' | 'ai-venn'>('handbok');

  const [hasUserAddedSituations, setHasUserAddedSituations] = useState<boolean>(() => {
    return localStorage.getItem('assistentn_has_user_added_situations') === 'true';
  });

  const [situations, setSituations] = useState<EmergencySituation[]>(() => {
    const saved = localStorage.getItem('assistentn_situations');
    return saved ? JSON.parse(saved) : DEFAULT_SITUATIONS;
  });

  useEffect(() => {
    localStorage.setItem('assistentn_situations', JSON.stringify(situations));
  }, [situations]);

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
      {/* Header (Styrern-design: Mørk Blå bg-[#0c4a6e]) */}
      <header className="w-full bg-[#0c4a6e] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Rolle (Klikk for å gå til hovedside) */}
          <div 
            onClick={() => setActiveTab('handbok')}
            className="flex items-center gap-3 shrink-0 mr-4 cursor-pointer hover:opacity-90 transition-opacity"
            title="Gå til hovedsiden (Trygghetsguiden: Hva gjør jeg hvis...)"
          >
            <div className="bg-sky-600 p-2 rounded-lg text-white shadow-sm flex items-center justify-center shrink-0">
              <HeartHandshake className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-wide">Assistentn</span>
              <span className="text-[11px] text-sky-200 uppercase tracking-wider font-semibold">Eventyrskogen Barnehage</span>
            </div>
          </div>

          {/* Hovednavigasjon (Sentrert på stor skjerm) */}
          <nav className="hidden xl:flex space-x-2 flex-1 justify-center">
            {[
              { id: 'handbok', label: 'Hva gjør jeg hvis...?' },
              { id: 'garderobe', label: 'Garderobe & Vær' },
              { id: 'leker', label: 'Lekehvelvet' },
              { id: 'dagsplan', label: 'Dagens Sjekkliste' },
              { id: 'ai-venn', label: 'Assistent-AI' }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive 
                      ? 'bg-sky-600 text-white shadow-md transform scale-105' 
                      : 'text-sky-100 hover:bg-[#075985] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Profil / Modusvelger høyre side */}
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="h-8 w-px bg-sky-800/80 hidden sm:block"></div>

            <button 
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center space-x-3 cursor-pointer hover:bg-sky-900/80 p-1.5 rounded-lg transition-colors text-left"
              title="Klikk for å åpne Min profil og modusvelger"
            >
              <div className="bg-sky-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-sky-400 ring-offset-2 ring-offset-[#0c4a6e] shrink-0">
                {isSvein ? 'SN' : isHavard ? 'HH' : 'KH'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-sm font-medium leading-none text-slate-100">
                  {isSvein ? 'Svein Nordvik' : isHavard ? 'Håvard Hovin' : 'Karoline Haug'}
                </span>
                <span className="text-xs text-sky-300 mt-1">
                  {isHavard ? 'Betabruker • Melhus' : 'Assistent'}
                </span>
              </div>
            </button>
            <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          </div>

        </div>

        {/* Mobil/nettbrett navigasjonsstripe */}
        <div className="xl:hidden flex overflow-x-auto px-4 py-2 border-t border-sky-800/60 gap-2 bg-[#082f49] scrollbar-none">
          {[
            { id: 'handbok', label: 'Hva gjør jeg hvis...?' },
            { id: 'garderobe', label: 'Garderobe & Vær' },
            { id: 'leker', label: 'Lekehvelvet' },
            { id: 'dagsplan', label: 'Dagens Sjekkliste' },
            { id: 'ai-venn', label: 'Assistent-AI' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition cursor-pointer ${
                activeTab === t.id ? 'bg-sky-600 text-white shadow-sm font-semibold' : 'text-sky-100 hover:bg-[#075985] hover:text-white'
              }`}
            >
              {t.label}
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">"Hva gjør jeg hvis...?" Trygghetsguiden</h2>
                <p className="text-xs text-slate-500">Konkrete råd og gode ord når utfordrende situasjoner oppstår på avdelingen.</p>
              </div>
              <div className="flex items-center gap-2">
                {hasUserAddedSituations ? (
                  <button 
                    onClick={() => {
                      if (window.confirm('Vil du gjenopprette standard eksempelsituasjoner?')) {
                        setSituations(DEFAULT_SITUATIONS);
                        setHasUserAddedSituations(false);
                        localStorage.setItem('assistentn_has_user_added_situations', 'false');
                      }
                    }}
                    className="text-xs text-slate-600 hover:text-sky-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-semibold transition cursor-pointer"
                  >
                    Gjenopprett eksempler
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      if (window.confirm('Vil du tømme alle eksempelsituasjoner og starte med blanke ark?')) {
                        setSituations([]);
                        setHasUserAddedSituations(true);
                        localStorage.setItem('assistentn_has_user_added_situations', 'true');
                      }
                    }}
                    className="text-xs text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-semibold transition cursor-pointer"
                  >
                    Tøm eksempler
                  </button>
                )}
                <button 
                  onClick={() => {
                    const sit = prompt('Hva oppstår? (f.eks: "Barnet vil ikke sove i vognen"):');
                    const sol = prompt('Slik kan du handle (konkret løsning):');
                    const rem = prompt('Viktig huskeregel:') || 'Vær rolig, nær og tålmodig.';
                    if (sit && sol) {
                      const newSit: EmergencySituation = {
                        id: 's-' + Date.now(),
                        situation: sit,
                        solution: sol,
                        reminder: rem
                      };
                      if (!hasUserAddedSituations) {
                        setSituations([newSit]);
                        setHasUserAddedSituations(true);
                        localStorage.setItem('assistentn_has_user_added_situations', 'true');
                      } else {
                        setSituations(prev => [newSit, ...prev]);
                      }
                    }
                  }}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Legg til situasjon
                </button>
              </div>
            </div>

            {situations.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <p className="font-bold text-slate-800 text-sm">Ingen situasjoner registrert ennå</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Legg til en situasjon du opplever i hverdagen, eller hent standard råd ved å trykke på knappen under.
                </p>
                <button
                  onClick={() => {
                    setSituations(DEFAULT_SITUATIONS);
                    setHasUserAddedSituations(false);
                    localStorage.setItem('assistentn_has_user_added_situations', 'false');
                  }}
                  className="bg-sky-100 text-sky-900 text-xs font-bold px-4 py-2 rounded-xl hover:bg-sky-200 transition cursor-pointer"
                >
                  Hent eksempler
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {situations.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <h3 className="text-slate-900 font-black text-base">{s.situation}</h3>
                      </div>
                      <button
                        onClick={() => setSituations(prev => prev.filter(it => it.id !== s.id))}
                        className="text-xs text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        Slett
                      </button>
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
            )}
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

      <PortalFooter theme="dark" className="bg-sky-950 border-sky-900 text-sky-200/80" />
    </div>
  );
}
