import React, { useState, useEffect } from 'react';
import StaffMonthlyFocusWidget from './StaffMonthlyFocusWidget';
import { 
  Smile, 
  Palette, 
  Music, 
  Heart, 
  Utensils, 
  Shirt, 
  Sparkles, 
  Plus, 
  Send, 
  CheckCircle2, 
  Flame, 
  BookOpen, 
  MessageCircle, 
  Lightbulb,
  Clock,
  Compass,
  FileText
} from 'lucide-react';

interface ActivityIdea {
  id: string;
  title: string;
  category: 'forming' | 'lek' | 'musikk' | 'natur' | 'mat';
  ageGroup: '1-2 år' | '3-4 år' | '5-6 år' | 'Alle';
  materials: string;
  description: string;
  pedagogicalTip: string;
}

interface RoutineTip {
  title: string;
  category: string;
  tip: string;
}

export default function FagarbeidernApp() {
  const [activeTab, setActiveTab] = useState<'aktiviteter' | 'rutiner' | 'observasjon' | 'fagbrev' | 'ai-assistent'>('aktiviteter');

  const [activities, setActivities] = useState<ActivityIdea[]>(() => {
    const saved = localStorage.getItem('fagarbeidern_activities');
    return saved ? JSON.parse(saved) : [
      {
        id: 'act-1',
        title: 'Trolldeig med høstkrydder (kanel & kardemomme)',
        category: 'forming',
        ageGroup: 'Alle',
        materials: 'Mel, salt, vann, matolje, kanel/kardemomme, kongler og pinner',
        description: 'Barna elter og former deig som lukter høst. Kongler brukes som stempler.',
        pedagogicalTip: 'Sansemotorisk stimulering og begreper som seig, myk, hard, varm og duftende.'
      },
      {
        id: 'act-2',
        title: 'Sanseløype med naturmaterialer i barnehagen',
        category: 'natur',
        ageGroup: '1-2 år',
        materials: 'Kasser med mose, kongler, glatte steiner, høstløv, bark',
        description: 'Barna kan ta av seg skoene eller kjenne med hendene i ulike kasser.',
        pedagogicalTip: 'Stimulerer taktil sans og gir trygge sanseopplevelser for de minste barna.'
      },
      {
        id: 'act-3',
        title: 'Kims lek med ekte gjenstander fra skogen',
        category: 'lek',
        ageGroup: '3-4 år',
        materials: 'Klut, kongle, pinne, stein, blad, soppmodell',
        description: 'Legg 4-5 ting under et tørkle. Fjern én ting mens barna lukker øynene.',
        pedagogicalTip: 'Hukommelse, konsentrasjon og turtaking i liten gruppe.'
      },
      {
        id: 'act-4',
        title: 'Fruktsalat med fargeinndeling',
        category: 'mat',
        ageGroup: '5-6 år',
        materials: 'Bananer, epler, druer, trygge barnekniver, skjærebrett',
        description: 'Barna kutter opp frukt selv og sorterer etter farger før de blander.',
        pedagogicalTip: 'Mestring i kjøkkenaktivitet, finmotorikk og begreper om mengde og form.'
      }
    ];
  });

  const [quickNotes, setQuickNotes] = useState<{ id: string; text: string; date: string }[]>(() => {
    const saved = localStorage.getItem('fagarbeidern_notes');
    return saved ? JSON.parse(saved) : [
      { id: 'n1', text: 'Liam (2 år) sa sitt første 3-ords uttrykk i dag ved måltidet: "Mer eple, takk!" Fortell til foreldrene ved henting.', date: '2026-10-04' },
      { id: 'n2', text: 'Konstruksjonsleken med treklosser fanget 4 barn i over 45 minutter. Ta med dette til fagmøtet med Ingrid.', date: '2026-10-03' }
    ];
  });

  const [aiInput, setAiInput] = useState('');
  const [aiLog, setAiLog] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: 'Hei Fagarbeider! Jeg er din sparringspartner i hverdagen. Trenger du en rask lek, tips til sansestimulering, idé til samlingsstund eller hvordan du kan inkludere et barn i leken? Spør meg!' }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('fagarbeidern_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('fagarbeidern_notes', JSON.stringify(quickNotes));
  }, [quickNotes]);

  const handleAskAi = async () => {
    if (!aiInput.trim()) return;
    const msg = aiInput.trim();
    setAiLog(prev => [...prev, { role: 'user', text: msg }]);
    setAiInput('');
    setIsAiLoading(true);

    try {
      const prompt = `Du er en erfaren og engasjerende veileder for barne- og ungdomsarbeidere (fagarbeidere) i norske barnehager.
Svar praktisk, kreativt og med høy yrkesstolthet.
Spørsmål: "${msg}"
Gi konkrete ideer med materialer man som regel har i barnehagen, hvordan aktiviteten kan tilpasses ulike barn, og hvilke læringsmomenter som ligger i situasjonen.`;

      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (res.ok) {
        const data = await res.json();
        setAiLog(prev => [...prev, { role: 'assistant', text: data.text || 'Beklager, kunne ikke hente forslag akkurat nå.' }]);
      } else {
        setTimeout(() => {
          setAiLog(prev => [...prev, {
            role: 'assistant',
            text: `Her er et forslag tilpasset fagarbeideren for "${msg}":\n\n1. **Aktivitet**: Bruk gjenbruksmaterialer eller naturmaterialer.\n2. **Gjennomføring**: Start i liten gruppe (3-4 barn) for å sikre ro og trygghet.\n3. **Faglig refleksjon**: Anerkjenn barnas egne innspill og la prosessen være viktigere enn det ferdige produktet.`
          }]);
        }, 500);
      }
    } catch {
      setAiLog(prev => [...prev, { role: 'assistant', text: `Forslag for fagarbeideren: Ha alltid en sang eller fingerlek i bakhånd for overganger. Barn elsker gjentakelser og forutsigbarhet!` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-amber-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight">Fagarbeider'n</span>
                <span className="text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Barne- og ungdomsarbeider
                </span>
              </div>
              <p className="text-xs text-amber-200/80">Praksisnær pedagogikk • Fagbrev & Yrkesstolthet</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-amber-950/60 p-1 rounded-xl border border-amber-800/60">
            <button 
              onClick={() => setActiveTab('aktiviteter')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'aktiviteter' ? 'bg-amber-600 text-white shadow' : 'text-amber-200 hover:text-white hover:bg-amber-800/40'}`}
            >
              Idébank & Aktiviteter
            </button>
            <button 
              onClick={() => setActiveTab('rutiner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'rutiner' ? 'bg-amber-600 text-white shadow' : 'text-amber-200 hover:text-white hover:bg-amber-800/40'}`}
            >
              Gylne Rutinestunder
            </button>
            <button 
              onClick={() => setActiveTab('observasjon')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'observasjon' ? 'bg-amber-600 text-white shadow' : 'text-amber-200 hover:text-white hover:bg-amber-800/40'}`}
            >
              Mine Observasjoner
            </button>
            <button 
              onClick={() => setActiveTab('fagbrev')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeTab === 'fagbrev' ? 'bg-amber-600 text-white shadow' : 'text-amber-200 hover:text-white hover:bg-amber-800/40'}`}
            >
              Fagbrev i Praksis
            </button>
            <button 
              onClick={() => setActiveTab('ai-assistent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${activeTab === 'ai-assistent' ? 'bg-amber-600 text-white shadow' : 'text-amber-200 hover:text-white hover:bg-amber-800/40'}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Fagarbeider-AI
            </button>
          </nav>
        </div>

        <div className="flex md:hidden overflow-x-auto px-4 py-2 border-t border-amber-800 gap-2 bg-amber-950/95 scrollbar-none">
          {['aktiviteter', 'rutiner', 'observasjon', 'fagbrev', 'ai-assistent'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t as any)}
              className={`px-3 py-1 rounded-md text-xs whitespace-nowrap font-medium ${activeTab === t ? 'bg-amber-600 text-white' : 'text-amber-200 bg-amber-900/60'}`}
            >
              {t === 'ai-assistent' ? 'Fagarbeider-AI' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab: Idébank & Aktiviteter */}
        {activeTab === 'aktiviteter' && (
          <div className="space-y-6">
            <StaffMonthlyFocusWidget />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Praktisk Idébank for Barnegruppa</h2>
                <p className="text-xs text-slate-500">Prøvde og testede opplegg som engasjerer barna uten behov for dyrt utstyr.</p>
              </div>
              <button 
                onClick={() => {
                  const title = prompt('Navn på aktivitet:');
                  const desc = prompt('Kort beskrivelse:');
                  if (title && desc) {
                    setActivities(prev => [{
                      id: 'act-' + Date.now(),
                      title,
                      category: 'lek',
                      ageGroup: 'Alle',
                      materials: 'Enkle ting fra avdelingen',
                      description: desc,
                      pedagogicalTip: 'Støtt barnas medvirkning og nysgjerrighet.'
                    }, ...prev]);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Legg til idé
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activities.map(act => (
                <div key={act.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {act.category} • {act.ageGroup}
                    </span>
                    <button 
                      onClick={() => setActivities(prev => prev.filter(a => a.id !== act.id))}
                      className="text-xs text-slate-400 hover:text-rose-600"
                    >
                      Slett
                    </button>
                  </div>
                  <h3 className="font-black text-slate-900 text-base">{act.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                  
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                    <strong className="text-slate-900 font-bold block mb-0.5">Materialer som trengs:</strong>
                    {act.materials}
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-xs text-amber-950">
                    <strong className="text-amber-900 font-bold block mb-0.5">Pedagogisk tips / Hva lærer barna?</strong>
                    {act.pedagogicalTip}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Gylne Rutinestunder */}
        {activeTab === 'rutiner' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">De Gylne Hverdagsøyeblikkene</h2>
              <p className="text-xs text-slate-500">Måltid, garderobe og stellesituasjon som lærings- og mestringsarenaer.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                  <Utensils className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-base">Måltidet som læringsarena</h3>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li>• La barna smøre maten selv så langt de klarer – mestringsfølelse!</li>
                  <li>• Prat om hvor maten kommer fra, smaker (søt, sur, salt) og farger.</li>
                  <li>• Bruk tålmodighet ved søl; det er en naturlig del av å lære.</li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Shirt className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-base">Garderoben: Rom for mestring</h3>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li>• Ikke kle på barnet i stillhet – sett ord på hvert plagg og kroppsdel.</li>
                  <li>• "Tærne inn i ermet? Nei, armen i ermet!" – humor skaper trygghet.</li>
                  <li>• Del barna i små puljer for å unngå stress og støy.</li>
                </ul>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Heart className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 text-base">Stellet: 1-til-1 samspill</h3>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li>• Øyenkontakt, rolig stemmeleie og sanger gjør stellet til et hyggelig møte.</li>
                  <li>• Fortell alltid barnet hva du skal gjøre før du gjør det.</li>
                  <li>• Bygger grunnleggende tillit og trygg tilknytning.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Observasjoner */}
        {activeTab === 'observasjon' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Raske observasjonsnotater</h2>
                <p className="text-xs text-slate-500">Noter situasjoner og magiske øyeblikk som kan deles med pedleder på avdelingsmøtet.</p>
              </div>
              <button 
                onClick={() => {
                  const text = prompt('Skriv notat:');
                  if (text) {
                    setQuickNotes(prev => [{
                      id: 'n-' + Date.now(),
                      text,
                      date: new Date().toISOString().split('T')[0]
                    }, ...prev]);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Nytt notat
              </button>
            </div>

            <div className="space-y-3">
              {quickNotes.map(n => (
                <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-3 shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-1">{n.date}</span>
                    <p className="text-xs text-slate-800 leading-relaxed">{n.text}</p>
                  </div>
                  <button 
                    onClick={() => setQuickNotes(prev => prev.filter(item => item.id !== n.id))}
                    className="text-xs text-slate-400 hover:text-rose-600 shrink-0"
                  >
                    Fjern
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Fagbrev i Praksis */}
        {activeTab === 'fagbrev' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Fagbrevet i Barnehagehverdagen</h2>
              <p className="text-xs text-slate-500">Kompetansemålene fra læreplanen for barne- og ungdomsarbeiderfaget.</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <h3 className="font-black text-slate-900 text-base">Hovedområder for fagarbeideren</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <strong className="text-slate-900 font-bold block mb-1">1. Helsefremmende arbeid</strong>
                  Ernæring, fysisk aktivitet, hvile, hygiene, smittevern og forebygging av mobbing og utenforskap.
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <strong className="text-slate-900 font-bold block mb-1">2. Kommunikasjon og samhandling</strong>
                  Aktiv lytting, empatisk kommunikasjon, anerkjennende væremåte, relasjonsbygging og konflikthåndtering.
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <strong className="text-slate-900 font-bold block mb-1">3. Yrkesutøvelse & Etikk</strong>
                  Taushetsplikt, etiske retningslinjer, samarbeid med pedleder og foresatte, og lojalitet til vedtak.
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <strong className="text-slate-900 font-bold block mb-1">4. Lek og læring</strong>
                  Tilrettelegging for allsidig lek, rollelek, konstruksjonslek og formingsglede på barnas premisser.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: AI Assistent */}
        {activeTab === 'ai-assistent' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-[650px]">
              <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">Fagarbeider-AI Idébank</h3>
                    <p className="text-xs text-slate-500">Spør om kreative formingsideer, sanger og løsninger for barnegruppa.</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setAiInput("Gi meg 3 morsomme sang- og bevegelsesleker for samlingsstund med 2-3 åringer.")}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold"
                  >
                    Sangleker
                  </button>
                  <button 
                    onClick={() => setAiInput("Hvordan kan jeg engasjere et barn som trekker seg unna i rolleleken?")}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold"
                  >
                    Inkludering
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {aiLog.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-amber-600 text-white rounded-br-none shadow' 
                        : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 text-slate-600 rounded-2xl rounded-bl-none p-4 text-xs flex items-center gap-2 border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
                      Fagarbeider-AI finner fram de beste tipsene...
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
                  placeholder="Hva trenger du idé eller råd om i dag?"
                  className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button 
                  onClick={handleAskAi}
                  disabled={isAiLoading || !aiInput.trim()}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-md"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-amber-950 text-amber-200/80 py-4 px-6 border-t border-amber-900 text-center text-xs">
        <p>Portalen: Fagarbeider'n • Bygger på fagbrevkompetanse i barne- og ungdomsarbeiderfaget</p>
      </footer>
    </div>
  );
}
