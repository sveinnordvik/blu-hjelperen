import React, { useState, useEffect } from 'react';
import StaffMonthlyFocusWidget from './StaffMonthlyFocusWidget';
import PedlederProgressionGuide from './PedlederProgressionGuide';
import DagensBildeModule from './DagensBildeModule';
import ManedsbrevModule from './ManedsbrevModule';
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Users, 
  FileEdit, 
  Sparkles, 
  CheckCircle2, 
  MessageSquare, 
  Send, 
  Plus, 
  Download, 
  Eye, 
  Share2, 
  Clock, 
  Heart, 
  Compass, 
  Smile, 
  Layers,
  ChevronRight,
  ClipboardCheck,
  CheckSquare,
  Camera
} from 'lucide-react';

interface WeeklyPlanItem {
  id: string;
  day: string;
  activity: string;
  fagomrade: string;
  responsible: string;
  notes: string;
}

interface ObservationEntry {
  id: string;
  title: string;
  date: string;
  context: string;
  description: string;
  pedagogicalReflection: string;
  fagomrade: string;
}

export default function PedledernApp() {
  const [activeTab, setActiveTab] = useState<'dagens-bilde' | 'avdeling' | 'ukeplan' | 'didaktikk' | 'observasjon' | 'veiledning' | 'pedleder-ai'>('dagens-bilde');

  // Ukeplan state
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanItem[]>(() => {
    const saved = localStorage.getItem('pedledern_weekly_plan');
    return saved ? JSON.parse(saved) : [
      { id: '1', day: 'Mandag', activity: 'Turdag i skogen: Småkryp og høstblader', fagomrade: 'Natur, miljø og teknologi', responsible: 'Fatima (fagarbeider)', notes: 'Ta med lupeglass og bøtter' },
      { id: '2', day: 'Tirsdag', activity: 'Samlingsstund: Bukkene Bruse og tallrekker', fagomrade: 'Antall, rom og form', responsible: 'Ingrid (pedleder)', notes: 'Fokus på begrepene stor, mellomstor, liten' },
      { id: '3', day: 'Onsdag', activity: 'Forming: Malesverksted med høstfarger', fagomrade: 'Kunst, kultur og kreativitet', responsible: 'Camilla (assistent)', notes: 'Blande primærfarger' },
      { id: '4', day: 'Torsdag', activity: 'Hinderløype i gymsal/ute: Balanse og koordinasjon', fagomrade: 'Kropp, bevegelse, mat og helse', responsible: 'Lars (fagarbeider)', notes: 'Grovmotorisk mestring' },
      { id: '5', day: 'Fredag', activity: 'Barnas eget valg & fellessamling', fagomrade: 'Etikk, religion og filosofi', responsible: 'Teamet', notes: 'Barns medvirkning i praksis' }
    ];
  });

  // Praksisfortellinger & observasjoner
  const [observations, setObservations] = useState<ObservationEntry[]>(() => {
    const saved = localStorage.getItem('pedledern_observations');
    return saved ? JSON.parse(saved) : [
      {
        id: 'obs-1',
        title: 'Samspill i sandkassa: Å forhandle om spaden',
        date: '2026-10-02',
        context: 'Fri lek ute i sandkassa',
        description: 'To treåringer ønsket den samme røde spaden. I stedet for konflikt observerte vi at det ene barnet tilbød en bøtte i bytte.',
        pedagogicalReflection: 'Dette viser gryende prososial kompetanse og forhandlingsevne. Som pedagoger må vi gi tid før vi griper inn.',
        fagomrade: 'Etikk, religion og filosofi'
      },
      {
        id: 'obs-2',
        title: 'Språkstimulering under måltidet: "Mer melk, takk"',
        date: '2026-09-30',
        context: 'Lunsj på Blåbærtua',
        description: 'Bordet med 4-åringer diskuterte hvor melken kommer fra. Barna delte erfaringer fra gårdsbesøk.',
        pedagogicalReflection: 'Måltidet er en uvurderlig arena for hverdagssamtaler og begrepslæring i trygge rammer.',
        fagomrade: 'Kommunikasjon, språk og tekst'
      }
    ];
  });

  // Didaktisk månedsbrev utkast
  const [monthlyLetter, setMonthlyLetter] = useState(() => {
    return localStorage.getItem('pedledern_month_letter') || `Kjære foreldre på Blåbærtua!

Velkommen til oktober! Denne måneden skal vi fordype oss i høstens magi gjennom fagområdet "Natur, miljø og teknologi". Barna viser stor nysgjerrighet for hvordan bladene skifter farge og hvorfor småkrypene gjemmer seg under steinene.

Viktige datoer:
- Torsdag 15. okt: Høstsuppe laget av barnas grønnsaker
- Uke 43: Foreldresamtaler starter

Hilsen Ingrid (ped.leder), Fatima og Camilla.`;
  });

  // AI chat state
  const [aiInput, setAiInput] = useState('');
  const [aiLog, setAiLog] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: 'Hei Pedleder! Jeg er din didaktiske assistent. Jeg kan hjelpe deg med å planlegge temasamlinger, formulere månedsbrev til foreldre, didaktiske refleksjoner forankret i Rammeplanen, og forberede avdelingsmøter. Hva ønsker du hjelp med i dag?' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('pedledern_weekly_plan', JSON.stringify(weeklyPlan));
    } catch {}
  }, [weeklyPlan]);

  useEffect(() => {
    try {
      localStorage.setItem('pedledern_observations', JSON.stringify(observations));
    } catch {}
  }, [observations]);

  useEffect(() => {
    try {
      localStorage.setItem('pedledern_month_letter', monthlyLetter);
    } catch {}
  }, [monthlyLetter]);

  const handleAskAi = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput.trim();
    setAiLog(prev => [...prev, { role: 'user', text: msg }]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const prompt = `Du er en faglig ekspert og didaktisk veileder for pedagogiske ledere (barnehagelærere) i norske barnehager.
Svar forankret i Rammeplan for barnehagen (de 7 fagområdene, barns medvirkning, omsorg, lek, læring og danning) og profesjonsetiske prinsipper.

Pedleder spør: "${msg}"

Gi et inspirerende, didaktisk strukturert og faglig solid svar. Ta med forslag til progresjon, tilrettelegging for ulike aldersgrupper og Rammeplan-forankring.`;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (res.ok) {
        const data = await res.json();
        setAiLog(prev => [...prev, { role: 'assistant', text: data.text || 'Kunne ikke generere svar.' }]);
      } else {
        setTimeout(() => {
          setAiLog(prev => [...prev, {
            role: 'assistant',
            text: `Didaktisk veiledning for Pedleder:\n\n1. **Rammeplanforankring**: Knytt aktiviteten til fagområdet med fokus på barns undring og medvirkning.\n2. **Progresjon**: Tilpass til både 3-åringene (sansemotorisk) og 5-åringene (refleksjon og hypotesetesting).\n3. **Rolle for personalet**: Vær støttende stillas og aktivt tilstede i barnas lekesoner.`
          }]);
        }, 600);
      }
    } catch {
      setAiLog(prev => [...prev, {
        role: 'assistant',
        text: `Didaktisk forslag: Husk at Rammeplanen understreker at barnehagen skal stimulere barnas nysgjerrighet, utforskertrang og lærelyst. Legg til rette for spontan lek med utgangspunkt i "${msg}".`
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-teal-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight">Pedleder'n</span>
                <span className="text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                  Pedagogisk Ledelse
                </span>
              </div>
              <p className="text-xs text-teal-200/80">Avdeling Blåbærtua (3-6 år) • Barnehagelærer</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-teal-950/60 p-1 rounded-xl border border-teal-800/60">
            <button 
              onClick={() => setActiveTab('dagens-bilde')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'dagens-bilde' 
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-extrabold' 
                  : 'text-amber-200 hover:text-white hover:bg-teal-800/40'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Dagens Bilde 📸</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-100 px-1.5 py-0.2 rounded-full border border-amber-300/30">Trinn 1</span>
            </button>
            <button 
              onClick={() => setActiveTab('avdeling')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'avdeling' ? 'bg-teal-600 text-white shadow' : 'text-teal-200 hover:text-white hover:bg-teal-800/40'}`}
            >
              Avdelingen i dag
            </button>
            <button 
              onClick={() => setActiveTab('ukeplan')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'ukeplan' ? 'bg-teal-600 text-white shadow' : 'text-teal-200 hover:text-white hover:bg-teal-800/40'}`}
            >
              Ukeplan & Rammeplan
            </button>
            <button 
              onClick={() => setActiveTab('didaktikk')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'didaktikk' 
                  ? 'bg-teal-600 text-white shadow font-bold' 
                  : 'text-teal-200 hover:text-white hover:bg-teal-800/40'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Månedsbrev 📖</span>
              <span className="text-[10px] bg-teal-900/80 text-teal-200 px-1.5 py-0.2 rounded-full border border-teal-500/30">Trinn 2</span>
            </button>
            <button 
              onClick={() => setActiveTab('observasjon')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'observasjon' ? 'bg-teal-600 text-white shadow' : 'text-teal-200 hover:text-white hover:bg-teal-800/40'}`}
            >
              Observasjon & Refleksjon
            </button>
            <button 
              onClick={() => setActiveTab('veiledning')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'veiledning' ? 'bg-teal-600 text-white shadow' : 'text-teal-200 hover:text-white hover:bg-teal-800/40'}`}
            >
              Lederstøtte & Brief
            </button>
            <button 
              onClick={() => setActiveTab('pedleder-ai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${activeTab === 'pedleder-ai' ? 'bg-teal-600 text-white shadow' : 'text-teal-200 hover:text-white hover:bg-teal-800/40'}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Pedleder-AI
            </button>
          </nav>
        </div>

        {/* Mobile menu */}
        <div className="flex md:hidden overflow-x-auto px-4 py-2 border-t border-teal-800 gap-2 bg-teal-950/95 scrollbar-none">
          {[
            { id: 'dagens-bilde', label: 'Dagens Bilde 📸' },
            { id: 'avdeling', label: 'Avdelingen' },
            { id: 'ukeplan', label: 'Ukeplan' },
            { id: 'didaktikk', label: 'Månedsbrev' },
            { id: 'observasjon', label: 'Observasjon' },
            { id: 'veiledning', label: 'Lederstøtte' },
            { id: 'pedleder-ai', label: 'Pedleder-AI' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${activeTab === t.id ? 'bg-teal-600 text-white font-bold' : 'text-teal-200 bg-teal-900/60'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 0: Dagens Bilde (Trinn 1 i To-trinnsraketten) */}
        {activeTab === 'dagens-bilde' && (
          <DagensBildeModule onNavigateToMonthlyLetter={() => setActiveTab('didaktikk')} />
        )}

        {/* Tab 1: Avdeling i dag */}
        {activeTab === 'avdeling' && (
          <div className="space-y-6">
            <StaffMonthlyFocusWidget />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Barnegruppe tilstede</span>
                <div className="text-2xl font-black text-slate-900 mt-1">21 / 22 barn</div>
                <p className="text-xs text-slate-500 mt-2">1 barn borte (sykdom meldt i Visma/MyKid)</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Avdelingsteam i dag</span>
                <div className="text-sm font-bold text-slate-900 mt-2 space-y-1">
                  <div>Ingrid (Ped.leder) • 08:00 - 15:30 (Mellomvakt)</div>
                  <div>Fatima (Fagarbeider) • 07:00 - 14:30 (Tidligvakt)</div>
                  <div>Camilla (Assistent) • 09:00 - 16:30 (Senvakt)</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Dagens Fagområde</span>
                <div className="text-lg font-black text-teal-800 mt-1">Natur, miljø og teknologi</div>
                <p className="text-xs text-slate-500 mt-2">Turdag i skogen kl. 10:00. Barna utforsker høsttegn.</p>
              </div>
            </div>

            {/* Dagsplan tidslinje for avdelingen */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                Dagens Dagsrytme på Blåbærtua
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs font-black text-teal-800 w-24 pt-0.5">07:00 - 08:30</div>
                  <div>
                    <strong className="text-xs text-slate-900 block font-bold">Mottak og rolig lek</strong>
                    <p className="text-xs text-slate-600">Trygg levering i garderoben, lesekrok og puslespill.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-3 rounded-xl bg-teal-50/60 border border-teal-100">
                  <div className="text-xs font-black text-teal-800 w-24 pt-0.5">08:30 - 09:15</div>
                  <div>
                    <strong className="text-xs text-teal-950 block font-bold">Felles frokost</strong>
                    <p className="text-xs text-slate-600">Selvsmøring, språklig samspill og rolig måltidsstemning.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs font-black text-teal-800 w-24 pt-0.5">09:30 - 10:00</div>
                  <div>
                    <strong className="text-xs text-slate-900 block font-bold">Kort samlingsstund før tur</strong>
                    <p className="text-xs text-slate-600">Hva skal vi se etter i skogen i dag? Sanger om høsten.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="text-xs font-black text-emerald-800 w-24 pt-0.5">10:00 - 13:30</div>
                  <div>
                    <strong className="text-xs text-emerald-950 block font-bold">Utedag & Tur med nistepakke</strong>
                    <p className="text-xs text-slate-600">Grovmotorisk lek i ulendt terreng, lunsj ved gapahuken, utforske maurtue.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-xs font-black text-teal-800 w-24 pt-0.5">14:00 - 14:30</div>
                  <div>
                    <strong className="text-xs text-slate-900 block font-bold">Fruktmåltid & Høytlesning</strong>
                    <p className="text-xs text-slate-600">Boklek og samtale om dagens opplevelser.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Ukeplan & Rammeplan */}
        {activeTab === 'ukeplan' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Ukeplan for Blåbærtua</h2>
                <p className="text-xs text-slate-500">Strukturert etter Rammeplanens fagområder og didaktiske mål.</p>
              </div>
              <button 
                onClick={() => {
                  const day = prompt('Dag (f.eks. Mandag):') || 'Ny dag';
                  const activity = prompt('Aktivitet:');
                  if (activity) {
                    setWeeklyPlan(prev => [...prev, {
                      id: Date.now().toString(),
                      day,
                      activity,
                      fagomrade: 'Kommunikasjon, språk og tekst',
                      responsible: 'Pedleder',
                      notes: 'Lagt til av pedleder'
                    }]);
                  }
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Legg til økt
              </button>
            </div>

            {/* Guiden fra Styrerens Progresjonsmodul */}
            <PedlederProgressionGuide 
              currentTheme="Natur, miljø og teknologi"
              targetGroup="Storbarn (3-5 år)"
              onInsertIntoWeeklyPlan={(text, theme) => {
                const newItem: WeeklyPlanItem = {
                  id: Date.now().toString(),
                  day: 'Torsdag (Progresjonsøkt)',
                  activity: text.length > 60 ? text.substring(0, 60) + '...' : text,
                  fagomrade: theme,
                  responsible: 'Ingrid (ped.leder)',
                  notes: `Progresjonsmål: "${text}"`
                };
                setWeeklyPlan(prev => [newItem, ...prev]);
              }}
            />

            <div className="space-y-3">
              {weeklyPlan.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-teal-900">{item.day}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          {item.fagomrade}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base mt-1">{item.activity}</h4>
                      <p className="text-xs text-slate-500 mt-1">Ansvarlig: <strong>{item.responsible}</strong> • Notat: {item.notes}</p>
                    </div>
                    <button 
                      onClick={() => setWeeklyPlan(prev => prev.filter(w => w.id !== item.id))}
                      className="text-xs text-rose-600 hover:underline self-end sm:self-center"
                    >
                      Fjern
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Månedsbrev & Didaktikk (Trinn 2 i To-trinnsraketten: Gullstandarden) */}
        {activeTab === 'didaktikk' && (
          <ManedsbrevModule />
        )}

        {/* Tab 4: Observasjon & Refleksjon */}
        {activeTab === 'observasjon' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Observasjoner & Praksisfortellinger</h2>
                <p className="text-xs text-slate-500">Pedagogisk dokumentasjon for avdelingsmøter og didaktisk vurdering.</p>
              </div>
              <button 
                onClick={() => {
                  const title = prompt('Tittel på praksisfortelling:');
                  const desc = prompt('Hva skjedde (beskrivelse):');
                  const ref = prompt('Pedagogisk refleksjon:') || '';
                  if (title && desc) {
                    setObservations(prev => [{
                      id: 'obs-' + Date.now(),
                      title,
                      date: new Date().toISOString().split('T')[0],
                      context: 'Fri lek / avdeling',
                      description: desc,
                      pedagogicalReflection: ref,
                      fagomrade: 'Kommunikasjon, språk og tekst'
                    }, ...prev]);
                  }
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Ny Praksisfortelling
              </button>
            </div>

            <div className="space-y-4">
              {observations.map(obs => (
                <div key={obs.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 text-base">{obs.title}</h4>
                      <p className="text-xs text-slate-500">{obs.date} • Kontekst: {obs.context}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                      {obs.fagomrade}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <strong className="text-slate-900 block font-bold mb-1">Hendelse / observasjon:</strong>
                    {obs.description}
                  </div>
                  <div className="text-xs text-teal-900 bg-teal-50/60 p-3 rounded-xl border border-teal-100">
                    <strong className="text-teal-950 block font-bold mb-1">Pedagogisk refleksjon & tiltak:</strong>
                    {obs.pedagogicalReflection}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Team-Veiledning */}
        {activeTab === 'veiledning' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Veiledning & Fagmøter på Avdelingen</h2>
              <p className="text-xs text-slate-500">Støtt og veiled fagarbeidere, assistenter og barnehagelærerstudenter.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-black text-slate-900 text-base">Veiledningsstruktur for avdelingsmøter</h3>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="p-3 bg-slate-50 rounded-xl">
                    <strong className="text-slate-900 block font-bold">1. Innsjekk & relasjon (10 min)</strong>
                    Hvordan har uken vært for hver enkelt? Hva har fungert spesielt godt?
                  </li>
                  <li className="p-3 bg-slate-50 rounded-xl">
                    <strong className="text-slate-900 block font-bold">2. Drøfting av praksisfortelling (25 min)</strong>
                    En ansatt legger fram en lekesituasjon eller utfordring. Kollektiv refleksjon uten forhåndsdømming.
                  </li>
                  <li className="p-3 bg-slate-50 rounded-xl">
                    <strong className="text-slate-900 block font-bold">3. Rammeplan & Didaktisk ukeplan (20 min)</strong>
                    Fordeling av roller, fagområder og tilrettelegging for enkeltbarn.
                  </li>
                  <li className="p-3 bg-slate-50 rounded-xl">
                    <strong className="text-slate-900 block font-bold">4. Oppsummering & avtaler (5 min)</strong>
                    Hvem gjør hva før neste fagmøte?
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-black text-slate-900 text-base">Pedlederens veileder-rolle</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Som pedagogisk leder har du ansvaret for å lede den pedagogiske virksomheten og veilede personalet. Dette innebærer å skape trygghet i teamet, gi konstruktiv anerkjennelse og utfordre til faglig undring.
                </p>
                <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl text-xs text-teal-900 space-y-2">
                  <strong className="font-bold block">Gode veiledningsspørsmål:</strong>
                  <div>• "Hva tror du barnet opplevde i akkurat det øyeblikket?"</div>
                  <div>• "Hvilke andre handlingsalternativer hadde vi hatt i situasjonen?"</div>
                  <div>• "Hvordan støttet vi barnets lek uten å ta over styringen?"</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Pedleder-AI */}
        {activeTab === 'pedleder-ai' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-[650px]">
              <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Pedleder-AI Didaktisk Assistent</h3>
                    <p className="text-xs text-slate-500">Planlegging av temasamlinger, tilrettelegging og Rammeplan-støtte.</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setAiInput("Lag et forslag til en 3-ukers temaplan om 'Høst og sansing' for 3-5 åringer forankret i Rammeplanen.")}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold"
                  >
                    Høsttema
                  </button>
                  <button 
                    onClick={() => setAiInput("Hvordan kan jeg legge til rette for et barn med språkvansker i samlingsstund uten at barnet føler seg annerledes?")}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold"
                  >
                    Språkstøtte
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {aiLog.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-teal-700 text-white rounded-br-none shadow' 
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-600 rounded-2xl rounded-bl-none p-4 text-xs flex items-center gap-2 border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping"></span>
                      Pedleder-AI utarbeider didaktisk opplegg...
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
                  placeholder="Skriv inn didaktisk tema, aldersgruppe eller veiledningsspørsmål..."
                  className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button 
                  onClick={handleAskAi}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-teal-950 text-teal-300/80 py-4 px-6 border-t border-teal-900 text-center text-xs">
        <p>Portalen: Pedleder'n • Verktøykasse for pedagogiske ledere • Forankret i Rammeplan for barnehagen</p>
      </footer>
    </div>
  );
}
