import React, { useState, useEffect, useCallback } from 'react';
import { callGoogleAIProxy } from '../../services/geminiService';
import { 
  Camera, 
  Calendar, 
  ShieldCheck, 
  Sunrise, 
  FileText, 
  MessageCircle, 
  ClipboardList, 
  Clock, 
  Sparkles, 
  Plus, 
  Send, 
  Check, 
  Compass, 
  BookOpen, 
  Users, 
  ArrowRight, 
  GraduationCap, 
  X, 
  ChevronRight, 
  ShieldAlert,
  Layers,
  HeartHandshake,
  Trash2,
  RefreshCw,
  FileSignature
} from 'lucide-react';

import StaffMonthlyFocusWidget from './StaffMonthlyFocusWidget';
import PedlederProgressionGuide from './PedlederProgressionGuide';
import DagensBildeModule from './DagensBildeModule';
import ManedsbrevModule from './ManedsbrevModule';
import VelkomstBrief from './VelkomstBrief';
import MorgenPulsen from './MorgenPulsen';
import DenSokratiskePlanleggeren from './DenSokratiskePlanleggeren';
import DidaktiskPlanlegger from '../DidaktiskPlanlegger';
import PPTVeileder from './PPTVeileder';
import TiltaksplanBygger from './TiltaksplanBygger';
import SamtaleMentor from './SamtaleMentor';
import Lederstotte from './Lederstotte';
import DagensDagsrytmeAvdeling from './DagensDagsrytmeAvdeling';
import Observasjoner from './Observasjoner';
import SpesialpedagogiskVeiviser from './SpesialpedagogiskVeiviser';
import { useRole } from '../../context/RoleContext';
import UserProfileModal from '../common/UserProfileModal';
import PortalFooter from '../common/PortalFooter';

interface WeeklyPlanItem {
  id: string;
  day: string;
  activity: string;
  fagomrade: string;
  responsible: string;
  notes: string;
}

export type Hovedfane = 'drift' | 'dokumentasjon' | 'planlegging' | 'lederstotte';

export interface PedledernAppProps {
  avdelingNavn?: string;
}

export function PedlederenLayout({ avdelingNavn: defaultAvdelingNavn = 'Blåbærtua' }: PedledernAppProps) {
  const { setRole, canSwitch, isSvein, isPortalBeta, currentUserEmail } = useRole();
  const isHavard = currentUserEmail?.toLowerCase() === 'havard.hovin@melhus.kommune.no' || isPortalBeta;
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Les inn de faktiske avdelingene styreren har definert
  const [baserList] = useState<{ id: number; navn: string }[]>(() => {
    try {
      const saved = localStorage.getItem('styrern_kontrollpanel_baser');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [aktivAvdelingNavn, setAktivAvdelingNavn] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('styrern_kontrollpanel_baser');
      const parsed = saved ? JSON.parse(saved) : [];
      if (parsed.length > 0) return parsed[0].navn;
    } catch {}
    return defaultAvdelingNavn;
  });

  const avdelingNavn = baserList.length > 0 ? aktivAvdelingNavn : 'Ingen avdeling';

  // Hovednavigasjon: 'drift', 'dokumentasjon', 'planlegging', 'lederstotte'
  const [aktivHovedfane, setAktivHovedfane] = useState<Hovedfane>('drift');

  // Sub-faner for hver hovedkategori
  const [dokumentasjonSubTab, setDokumentasjonSubTab] = useState<'bilde' | 'manedsbrev'>('bilde');
  const [planleggingSubTab, setPlanleggingSubTab] = useState<'ukeplan' | 'sokratisk' | 'ai'>('ukeplan');
  const [driftSubTab, setDriftSubTab] = useState<'avdeling' | 'morgenpuls' | 'brief' | 'fagmoter'>('avdeling');
  const [lederstotteSubTab, setLederstotteSubTab] = useState<'observasjoner' | 'ppt' | 'tiltaksplan' | 'sparring' | 'spesped'>('observasjoner');

  // Visning inni Ukeplan (rutenett vs liste)
  const [ukeplanVisning, setUkeplanVisning] = useState<'didaktisk' | 'oversikt'>('didaktisk');

  // PPT preload overføring
  const [pptPreloadObservasjon, setPptPreloadObservasjon] = useState<string>('');

  // Morgenpuls modal
  const [visMorgenPulsModal, setVisMorgenPulsModal] = useState<boolean>(false);

  // Fagområde detektert fra dagsrytme
  const [dagensFagomrade, setDagensFagomrade] = useState<{ fag: string; detalj: string }>({
    fag: 'Natur, miljø og teknologi',
    detalj: 'Turdag i skogen kl. 10:00. Barna utforsker høsttegn.'
  });

  const handleFagomradeDetected = useCallback((fag: string, detalj: string) => {
    setDagensFagomrade(prev => {
      if (prev.fag === fag && prev.detalj === detalj) return prev;
      return { fag, detalj };
    });
  }, []);

  const DEFAULT_WEEKLY_PLAN: WeeklyPlanItem[] = [
    { id: '1', day: 'Mandag', activity: 'Eventyrsamling: Bukkene Bruse med konkreter', fagomrade: 'Kommunikasjon, språk og tekst', responsible: 'Ingrid (ped.leder)', notes: 'Fokus på preposisjoner (over, under, på)' },
    { id: '2', day: 'Tirsdag', activity: 'Turdag til Blåbærskogen: Insektjakt & lupe', fagomrade: 'Natur, miljø og teknologi', responsible: 'Fatima (fagarbeider)', notes: 'Ta med oppslagsbøker og samleglass' },
    { id: '3', day: 'Onsdag', activity: 'Matteverksted: Sortering etter farge og form', fagomrade: 'Antall, rom og form', responsible: 'Ingrid & Camilla', notes: 'Smågrupper på 5 barn' },
    { id: '4', day: 'Torsdag', activity: 'Bevegelsesløype i gymrommet / hinderløype ute', fagomrade: 'Kropp, bevegelse, mat og helse', responsible: 'Camilla (assistent)', notes: 'Grovmotoriske utfordringer og balanse' },
    { id: '5', day: 'Fredag', activity: 'Fellesdans & ukens refleksjonssamling', fagomrade: 'Kunst, kultur og kreativitet', responsible: 'Hele teamet', notes: 'Barna velger favorittsanger' }
  ];

  const [hasUserAddedPlan, setHasUserAddedPlan] = useState<boolean>(() => {
    return localStorage.getItem('pedledern_has_user_added_plan') === 'true';
  });

  // Standard ukeplan-liste
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanItem[]>(() => {
    const saved = localStorage.getItem('pedledern_weekly_plan');
    return saved ? JSON.parse(saved) : DEFAULT_WEEKLY_PLAN;
  });

  useEffect(() => {
    try {
      localStorage.setItem('pedledern_weekly_plan', JSON.stringify(weeklyPlan));
    } catch {}
  }, [weeklyPlan]);

  // AI assistent chat state for Pedleder-AI
  const [aiInput, setAiInput] = useState('');
  const [aiLog, setAiLog] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { 
      role: 'assistant', 
      text: 'Hei Pedleder! Jeg er din didaktiske assistent. Jeg kan hjelpe deg med å planlegge temasamlinger, formulere månedsbrev, didaktiske refleksjoner forankret i Rammeplanen og forberede avdelingsmøter. Hva ønsker du hjelp med i dag?' 
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

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
            text: `Didaktisk veiledning for Pedleder:\n\n1. **Rammeplanforankring**: Knytt aktiviteten til fagområdet med fokus på barns undring og medvirkning.\n2. **Progresjon**: Tilpass til både 3-åringene (sansemotorisk) og 5-åringene (refleksjon og hypotesetesting).\n3. **Rolle for personalet**: Vær støttende stillas og aktivt tilstede i barnas lekesoner.`
          }]);
        }, 500);
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

  const handleResetAiChat = () => {
    setAiLog([
      { 
        role: 'assistant', 
        text: 'Hei Pedleder! Jeg er din didaktiske assistent. Jeg kan hjelpe deg med å planlegge temasamlinger, formulere månedsbrev, didaktiske refleksjoner forankret i Rammeplanen og forberede avdelingsmøter. Hva ønsker du hjelp med i dag?' 
      }
    ]);
    setAiInput('');
  };

  const handleClearAiChat = () => {
    setAiLog([]);
    setAiInput('');
  };

  // Hjelpefunksjon for å rendre riktig hovedkomponent
  const renderInnhold = () => {
    switch (aktivHovedfane) {
      /* ========================================================= */
      /* 1. DOKUMENTASJON & INNHOLD (To-trinnsraketten)            */
      /* ========================================================= */
      case 'dokumentasjon':
        return (
          <div className="w-full space-y-6">
            {/* Header / Intro for modulen */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-6 h-6 text-emerald-600" />
                  Dokumentasjon & Innhold
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  To-trinnsraketten: Trinn 1 (Dagens Bilde & hurtigdokumentasjon) ➔ Trinn 2 (Didaktisk Månedsbrev forankret i Rammeplanen).
                </p>
              </div>

              {/* Sub-navigasjon */}
              <div className="flex bg-slate-200/80 p-1 rounded-xl">
                <button
                  onClick={() => setDokumentasjonSubTab('bilde')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    dokumentasjonSubTab === 'bilde'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dagens Bilde 📸</span>
                </button>
                <button
                  onClick={() => setDokumentasjonSubTab('manedsbrev')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    dokumentasjonSubTab === 'manedsbrev'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Månedsbrev 📖</span>
                </button>
              </div>
            </div>

            {/* Innhold i Dokumentasjon */}
            {dokumentasjonSubTab === 'bilde' ? (
              <DagensBildeModule 
                onNavigateToMonthlyLetter={() => setDokumentasjonSubTab('manedsbrev')} 
              />
            ) : (
              <ManedsbrevModule 
                onNavigateToDagensBilde={() => setDokumentasjonSubTab('bilde')}
              />
            )}
          </div>
        );

      /* ========================================================= */
      /* 2. DIDAKTISK PLANLEGGING (Ukeplan, Sokratisk & Kildebank)  */
      /* ========================================================= */
      case 'planlegging':
        return (
          <div className="w-full space-y-6">
            {/* Header / Intro for modulen */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-emerald-600" />
                  Didaktisk Planlegger
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Sokratisk didaktisk planlegger, kildebanken og helhetlig ukeplan-rutenett forankret i Rammeplanens 7 fagområder.
                </p>
              </div>

              {/* Sub-navigasjon */}
              <div className="flex bg-slate-200/80 p-1 rounded-xl">
                <button
                  onClick={() => setPlanleggingSubTab('ukeplan')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    planleggingSubTab === 'ukeplan'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ukeplan & Rammeplan</span>
                </button>
                <button
                  onClick={() => setPlanleggingSubTab('sokratisk')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    planleggingSubTab === 'sokratisk'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sokratisk Planlegger ✨</span>
                </button>
                <button
                  onClick={() => setPlanleggingSubTab('ai')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    planleggingSubTab === 'ai'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Pedleder-AI Assistent</span>
                </button>
              </div>
            </div>

            {/* Innhold i Planlegging */}
            {planleggingSubTab === 'ukeplan' && (
              <div className="space-y-6">
                {/* Switcher mellom Didaktisk Rutenett og Fagområde-liste */}
                <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUkeplanVisning('didaktisk')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        ukeplanVisning === 'didaktisk'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Didaktisk Ukeplan (Rutenett & Kilder)</span>
                    </button>
                    <button
                      onClick={() => setUkeplanVisning('oversikt')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                        ukeplanVisning === 'oversikt'
                          ? 'bg-teal-700 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Fagområde-liste ({weeklyPlan.length} økter)</span>
                    </button>
                  </div>

                  {ukeplanVisning === 'oversikt' && (
                    <div className="flex items-center gap-2">
                      {hasUserAddedPlan ? (
                        <button 
                          onClick={() => {
                            if (window.confirm('Vil du gjenopprette standard ukeplan-eksempler?')) {
                              setWeeklyPlan(DEFAULT_WEEKLY_PLAN);
                              setHasUserAddedPlan(false);
                              localStorage.setItem('pedledern_has_user_added_plan', 'false');
                            }
                          }}
                          className="text-xs text-slate-600 hover:text-teal-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-semibold transition cursor-pointer"
                        >
                          Gjenopprett eksempler
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            if (window.confirm('Vil du tømme eksempel-øktene og starte med blank ukeplan?')) {
                              setWeeklyPlan([]);
                              setHasUserAddedPlan(true);
                              localStorage.setItem('pedledern_has_user_added_plan', 'true');
                            }
                          }}
                          className="text-xs text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl font-semibold transition cursor-pointer"
                        >
                          Tøm eksempler
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          const day = prompt('Dag (f.eks. Mandag):') || 'Ny dag';
                          const activity = prompt('Aktivitet:');
                          if (activity) {
                            const newPlanItem: WeeklyPlanItem = {
                              id: Date.now().toString(),
                              day,
                              activity,
                              fagomrade: 'Kommunikasjon, språk og tekst',
                              responsible: 'Pedleder',
                              notes: 'Lagt til av pedleder'
                            };
                            if (!hasUserAddedPlan) {
                              setWeeklyPlan([newPlanItem]);
                              setHasUserAddedPlan(true);
                              localStorage.setItem('pedledern_has_user_added_plan', 'true');
                            } else {
                              setWeeklyPlan(prev => [...prev, newPlanItem]);
                            }
                          }
                        }}
                        className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Legg til økt
                      </button>
                    </div>
                  )}
                </div>

                {ukeplanVisning === 'didaktisk' ? (
                  <DidaktiskPlanlegger avdelingNavn={avdelingNavn} />
                ) : (
                  <div className="space-y-4">
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

                    {weeklyPlan.length === 0 ? (
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
                        <p className="font-bold text-slate-800 text-sm">Ingen planlagte økter i ukeplanen ennå</p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Trykk «Legg til økt» for å legge inn din første didaktiske samling, eller «Gjenopprett eksempler» for å se et forslag.
                        </p>
                        <button
                          onClick={() => {
                            setWeeklyPlan(DEFAULT_WEEKLY_PLAN);
                            setHasUserAddedPlan(false);
                            localStorage.setItem('pedledern_has_user_added_plan', 'false');
                          }}
                          className="bg-teal-100 text-teal-900 text-xs font-bold px-4 py-2 rounded-xl hover:bg-teal-200 transition cursor-pointer"
                        >
                          Hent eksempler
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {weeklyPlan.map((item, idx) => (
                          <div key={`weekly-item-${item.id}-${idx}`} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-xs transition">
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
                                className="text-xs text-rose-600 hover:underline self-end sm:self-center cursor-pointer"
                              >
                                Fjern
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {planleggingSubTab === 'sokratisk' && (
              <DenSokratiskePlanleggeren 
                avdelingNavn={avdelingNavn}
                onSyncToWeeklyPlan={(items) => {
                  setWeeklyPlan(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newItems = items.map((it, i) => ({
                      ...it,
                      id: existingIds.has(it.id) ? `sync-${it.id}-${i}-${Date.now().toString(36)}` : it.id
                    }));
                    return [...newItems, ...prev];
                  });
                }}
              />
            )}

            {planleggingSubTab === 'ai' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col h-[650px]">
                  <div className="border-b border-slate-100 pb-4 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
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
                            ? 'bg-teal-700 text-white rounded-br-none shadow-xs' 
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
                      className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition shadow-xs"
                    >
                      <Send className="w-4 h-4" /> Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      /* ========================================================= */
      /* 3. DAGLIG DRIFT (På gulvet, Dagsrytme, Morgenpuls & Vikar)  */
      /* ========================================================= */
      case 'drift':
        return (
          <div className="w-full space-y-6">
            {/* Header / Intro for modulen */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Sunrise className="w-6 h-6 text-emerald-600" />
                  Daglig Drift (På gulvet)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Morgen-pulsen, dagsrytme tilpasset ukeplanen, velkomst-brief for vikarer og veiledningsstruktur.
                </p>
              </div>

              {/* Sub-navigasjon */}
              <div className="flex bg-slate-200/80 p-1 rounded-xl">
                <button
                  onClick={() => setDriftSubTab('avdeling')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    driftSubTab === 'avdeling'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Avdelingen i dag & Dagsrytme</span>
                </button>
                <button
                  onClick={() => setDriftSubTab('morgenpuls')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    driftSubTab === 'morgenpuls'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sunrise className="w-3.5 h-3.5 text-amber-500" />
                  <span>Morgen-pulsen ☀️</span>
                </button>
                <button
                  onClick={() => setDriftSubTab('brief')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    driftSubTab === 'brief'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5 text-sky-600" />
                  <span>Vikar-brief 📱</span>
                </button>
                <button
                  onClick={() => setDriftSubTab('fagmoter')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    driftSubTab === 'fagmoter'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <span>Fagmøter & Veiledning 🤝</span>
                </button>
              </div>
            </div>

            {/* Innhold i Daglig Drift */}
            {driftSubTab === 'avdeling' && (
              <div className="space-y-6">
                <StaffMonthlyFocusWidget />
                
                {/* 3 Statuskort for avdelingen */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Barnegruppe tilstede</span>
                      <div className="text-2xl font-black text-slate-900 mt-1">21 / 22 barn</div>
                      <p className="text-xs text-slate-500 mt-2">1 barn borte (sykdom meldt inn i Visma/MyKid)</p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Morgen-puls:</span>
                      <button
                        onClick={() => setDriftSubTab('morgenpuls')}
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Sunrise className="w-3.5 h-3.5 text-amber-500" />
                        <span>Rapporter puls</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-xs font-bold text-slate-500 uppercase">Avdelingsteam i dag</span>
                    <div className="text-sm font-bold text-slate-900 mt-2 space-y-1">
                      <div>Ingrid (Ped.leder) • 08:00 - 15:30 (Mellomvakt)</div>
                      <div>Fatima (Fagarbeider) • 07:00 - 14:30 (Tidligvakt)</div>
                      <div>Camilla (Assistent) • 09:00 - 16:30 (Senvakt)</div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Tilkallingsvikar på basen?</span>
                      <button
                        onClick={() => setDriftSubTab('brief')}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition flex items-center gap-1"
                      >
                        <span>Send Base-Brief</span>
                        <span>📱</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase">Dagens Fagområde</span>
                      <div className="text-base font-black text-teal-800 mt-1">{dagensFagomrade.fag}</div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{dagensFagomrade.detalj}</p>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Koblet til Ukeplan</span>
                      <button 
                        onClick={() => {
                          setAktivHovedfane('planlegging');
                          setPlanleggingSubTab('ukeplan');
                        }}
                        className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                      >
                        <span>Se Ukeplan</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fullstendig Dagsrytme basert på Ukeplanen */}
                <DagensDagsrytmeAvdeling 
                  avdelingNavn={avdelingNavn}
                  onNavigateToUkeplan={() => {
                    setAktivHovedfane('planlegging');
                    setPlanleggingSubTab('ukeplan');
                  }}
                  onFagomradeDetected={handleFagomradeDetected}
                />
              </div>
            )}

            {driftSubTab === 'morgenpuls' && (
              <div className="max-w-2xl mx-auto">
                <MorgenPulsen 
                  embedded={true} 
                  defaultBase={avdelingNavn} 
                  onSendSuccess={() => {
                    setTimeout(() => setDriftSubTab('avdeling'), 1800);
                  }}
                />
              </div>
            )}

            {driftSubTab === 'brief' && (
              <VelkomstBrief avdelingNavn={avdelingNavn} />
            )}

            {driftSubTab === 'fagmoter' && (
              <div className="space-y-6">
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
                      <div>• &quot;Hva tror du barnet opplevde i akkurat det øyeblikket?&quot;</div>
                      <div>• &quot;Hvilke andre handlingsalternativer hadde vi hatt i situasjonen?&quot;</div>
                      <div>• &quot;Hvordan støttet vi barnets lek uten å ta over styringen?&quot;</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      /* ========================================================= */
      /* 4. LEDERSTØTTE & OBSERVASJONER                            */
      /* ========================================================= */
      case 'lederstotte':
        return (
          <div className="w-full space-y-6">
            {/* Header / Intro for modulen */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  Lederstøtte & Observasjoner
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Observasjonsarkivet (Aktive & Arkiv), PPT-skjoldet (Bekymringsruten) og Sokratisk sparring for utfordrende samtaler.
                </p>
              </div>

              {/* Sub-navigasjon */}
              <div className="flex bg-slate-200/80 p-1 rounded-xl">
                <button
                  onClick={() => setLederstotteSubTab('observasjoner')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    lederstotteSubTab === 'observasjoner'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Observasjoner 📝</span>
                </button>
                <button
                  onClick={() => setLederstotteSubTab('ppt')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    lederstotteSubTab === 'ppt'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                  <span>PPT-Skjold (Bekymringsruten) 🛡️</span>
                </button>
                <button
                  onClick={() => setLederstotteSubTab('tiltaksplan')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    lederstotteSubTab === 'tiltaksplan'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSignature className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tiltaksplan (ITP) 📋</span>
                </button>
                <button
                  onClick={() => setLederstotteSubTab('sparring')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    lederstotteSubTab === 'sparring'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5 text-sky-600" />
                  <span>Sokratisk Sparring 🗣️</span>
                </button>
                <button
                  onClick={() => setLederstotteSubTab('spesped')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    lederstotteSubTab === 'spesped'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Spesped-Veiviser 🛡️</span>
                </button>
              </div>
            </div>

            {/* Innhold i Lederstøtte */}
            {lederstotteSubTab === 'observasjoner' && (
              <div className="space-y-6">
                {/* Banner: PPT-veiledning */}
                <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-emerald-700/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold shrink-0">
                      <ShieldCheck className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Trenger du spesialpedagogisk sparring på en observasjon?</h3>
                      <p className="text-xs text-emerald-200/90">Bruk PPT-veilederen med anonymiserings-skjold for veiledning og tiltak etter Barnehageloven § 31.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPptPreloadObservasjon('');
                      setLederstotteSubTab('ppt');
                    }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm"
                  >
                    <span>Åpne PPT-Veileder</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Selve observasjonsmodulen med Aktive/Arkiv og sletting/gjenoppretting */}
                <Observasjoner 
                  avdelingNavn={avdelingNavn}
                  onNavigateToPPT={(tekst) => {
                    setPptPreloadObservasjon(tekst);
                    setLederstotteSubTab('ppt');
                  }}
                />
              </div>
            )}

            {lederstotteSubTab === 'ppt' && (
              <PPTVeileder 
                avdelingNavn={avdelingNavn} 
                initialObservasjon={pptPreloadObservasjon}
                onNavigateToObservasjoner={() => setLederstotteSubTab('observasjoner')}
              />
            )}

            {lederstotteSubTab === 'tiltaksplan' && (
              <TiltaksplanBygger 
                onNavigateToPPT={() => setLederstotteSubTab('ppt')}
              />
            )}

            {lederstotteSubTab === 'sparring' && (
              <Lederstotte initialFane="sparring" avdelingNavn={avdelingNavn} />
            )}
            
            {lederstotteSubTab === 'spesped' && (
              <SpesialpedagogiskVeiviser />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    // Pass på at vi bruker justify-start for å unngå "hopping" midt på skjermen
    <div className="min-h-screen bg-slate-50 flex flex-col justify-start items-center font-sans text-slate-800">
      
      {/* TOPPBAR (Styrern-design: Mørkegrønn bg-emerald-900, full bredde, sentrert innhold) */}
      <header className="w-full bg-emerald-900 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          
          {/* Logo & Rolle */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 p-2 rounded-lg text-white shadow-sm flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="font-bold text-lg leading-tight">Pedledern</h1>
              {baserList.length > 1 ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">Avdeling:</span>
                  <select 
                    value={aktivAvdelingNavn} 
                    onChange={(e) => setAktivAvdelingNavn(e.target.value)}
                    className="text-[11px] bg-emerald-800 text-emerald-100 border border-emerald-700 rounded px-1.5 py-0.5 font-bold focus:outline-none cursor-pointer"
                  >
                    {baserList.map(b => (
                      <option key={b.id} value={b.navn} className="bg-emerald-900 text-white">
                        {b.navn}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-[10px] text-emerald-200 uppercase tracking-wider font-semibold">
                  {baserList.length === 1 ? `Avdeling ${baserList[0].navn}` : 'Ingen avdelinger registrert'}
                </p>
              )}
            </div>
          </div>

          {/* Hovednavigasjon (Sentrert) - Daglig Drift først til venstre */}
          <nav className="flex items-center gap-1 md:gap-2 bg-black/10 p-1 rounded-xl">
            <NavKnapp 
              tittel="Daglig Drift" 
              ikon={<Sunrise className="w-4 h-4" />} 
              aktiv={aktivHovedfane === 'drift'} 
              onClick={() => setAktivHovedfane('drift')} 
            />
            <NavKnapp 
              tittel="Dokumentasjon" 
              ikon={<Camera className="w-4 h-4" />} 
              aktiv={aktivHovedfane === 'dokumentasjon'} 
              onClick={() => setAktivHovedfane('dokumentasjon')} 
            />
            <NavKnapp 
              tittel="Planlegging" 
              ikon={<Calendar className="w-4 h-4" />} 
              aktiv={aktivHovedfane === 'planlegging'} 
              onClick={() => setAktivHovedfane('planlegging')} 
            />
            <NavKnapp 
              tittel="Lederstøtte" 
              ikon={<ShieldCheck className="w-4 h-4" />} 
              aktiv={aktivHovedfane === 'lederstotte'} 
              onClick={() => setAktivHovedfane('lederstotte')} 
            />
          </nav>

          {/* Profil / Ekstravalg høyre side */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              type="button"
              onClick={() => setIsProfileOpen(true)}
              title="Min profil og rollebytte"
              className="w-9 h-9 shrink-0 rounded-full bg-emerald-600 border-2 border-emerald-400 flex items-center justify-center text-xs font-bold text-white shadow-sm transition transform hover:scale-105 cursor-pointer hover:bg-emerald-500 ring-2 ring-emerald-300/50"
            >
              {isSvein ? 'SN' : isHavard ? 'HH' : 'KH'}
            </button>
          </div>
          
        </div>
      </header>

      {/* HOVEDINNHOLD (Lyst, luftig "Kreativt Verksted", full bredde opp til 1600px) */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-8 pt-8">
        {renderInnhold()}
      </main>

      <PortalFooter theme="dark" className="bg-emerald-950 border-emerald-900 text-emerald-300/80" />

      {/* MODAL: Morgen-pulsen innsending ved hurtigknapp */}
      {visMorgenPulsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg my-8">
            <button
              onClick={() => setVisMorgenPulsModal(false)}
              className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition cursor-pointer"
              title="Lukk"
            >
              <X size={20} />
            </button>
            <MorgenPulsen 
              embedded={true}
              defaultBase={avdelingNavn}
              onSendSuccess={() => {
                setTimeout(() => setVisMorgenPulsModal(false), 2000);
              }}
            />
          </div>
        </div>
      )}

      {/* Brukerprofil og Modusvelger */}
      <UserProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />

    </div>
  );
}

// Hjelpekomponent for navigasjonsknappene for å holde koden ryddig
function NavKnapp({ 
  tittel, 
  ikon, 
  aktiv, 
  onClick 
}: { 
  tittel: string; 
  ikon: React.ReactNode; 
  aktiv: boolean; 
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
        aktiv 
          ? 'bg-emerald-500 text-white shadow-sm' 
          : 'text-slate-300 hover:text-white hover:bg-white/10'
      }`}
    >
      {ikon}
      <span className="hidden lg:inline">{tittel}</span>
    </button>
  );
}

export default PedlederenLayout;
