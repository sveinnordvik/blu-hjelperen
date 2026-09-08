import React, { useState, useRef, useEffect } from 'react';
import { WorkspaceLayout, HistoryItem } from './WorkspaceLayout';
import { 
  PlayCircle, 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  UserCog, 
  Settings,
  Bot,
  User,
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Volume2,
  RotateCcw,
  BookOpen,
  Lightbulb,
  GraduationCap,
  Send,
  Loader2,
  ArrowLeft,
  Check,
  Copy,
  Briefcase
} from 'lucide-react';
import { 
  runRoleplay, 
  evaluateRoleplaySession, 
  RoleplayMessage, 
  playAudio, 
  stopAudio 
} from '../services/geminiService';

interface SimulationSession {
  id: string;
  title: string;
  subtitle: string;
  situation: string;
  role: string;
  opponentTone: string;
  opponentCharacter: string;
  messages: RoleplayMessage[];
  evaluation?: {
    score: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    rammeplanLinks?: string[];
  };
}

const SCENARIOS = [
  { 
    id: 'forelder', 
    label: 'Kritisk forelder', 
    character: 'Far til Jonas (4 år)',
    context: 'Far er bekymret/kritisk fordi Jonas ofte har skitne klær og han mener dere er for mye ute i dårlig vær.',
    text: 'Motpart: Far til Jonas (4 år). Han er bekymret/kritisk fordi Jonas ofte har skitne klær og han mener dere er for mye ute i dårlig vær.',
    opening: 'Hei! Jeg må ta opp noe jeg har reagert på den siste tiden. Jonas kommer hjem med klissvåte og skitne klær nesten hver dag, og jeg synes dere er altfor mye ute når det er dårlig vær!'
  },
  { 
    id: 'kollega', 
    label: 'Uenig kollega', 
    character: 'Erfaren fagarbeider',
    context: 'Vedkommende er uenig i din nye didaktiske plan og mener rutinene er for stivbente.',
    text: 'Motpart: Erfaren fagarbeider. Vedkommende er uenig i din nye didaktiske plan og mener rutinene er for stivbente.',
    opening: 'Jeg må bare si det rett ut: Den nye didaktiske planen din fungerer dårlig i praksis. Rutinene har blitt altfor stivbente, og vi mister spontaniteten og flyten med barna på avdelingen.'
  },
  { 
    id: 'sensor', 
    label: 'Muntlig eksamen', 
    character: 'Sensor',
    context: 'Muntlig eksamen i pedagogikk og praksis. Du blir bedt om å forsvare dine didaktiske valg i et prosjektarbeid, og koble det mot Rammeplanen.',
    text: 'Motpart: Sensor. Du blir bedt om å forsvare dine didaktiske valg i et prosjektarbeid, og koble det mot Rammeplanen.',
    opening: 'Velkommen til muntlig eksamen. Kan du redegjøre for dine didaktiske valg i dette prosjektarbeidet, og hvordan du forankrer dem i Rammeplanens føringer for barns medvirkning kontra pedagogisk ledelse?'
  },
  { 
    id: 'egen', 
    label: '+ Egendefinert', 
    character: 'Motpart',
    context: 'Egendefinert situasjon fra barnehagepraksis eller pedagogisk ledelse.',
    text: '',
    opening: 'Hei. Fint at vi kan snakke sammen nå. Hva vil du vi skal ta opp først?'
  }
];

export function RoleplaySimulator() {
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: '1', title: 'Kritisk forelder (Jonas)', subtitle: 'Gjennomført • 4. sept 2026' },
    { id: '2', title: 'Uenig kollega (Rutiner)', subtitle: 'Avbrutt • 1. sept 2026' },
    { id: '3', title: 'Muntlig eksamen: Rammeplanen', subtitle: 'Score 9/10 • 28. aug 2026' }
  ]);

  const [savedSessions, setSavedSessions] = useState<Record<string, SimulationSession>>({
    '1': {
      id: '1',
      title: 'Kritisk forelder (Jonas)',
      subtitle: 'Gjennomført • 4. sept 2026',
      situation: 'Motpart: Far til Jonas (4 år). Han er bekymret/kritisk fordi Jonas ofte har skitne klær og han mener dere er for mye ute i dårlig vær.',
      role: 'Pedagogisk leder',
      opponentTone: 'Krevende og emosjonell (Høy motstand)',
      opponentCharacter: 'Far til Jonas (4 år)',
      messages: [
        { role: 'model', senderName: 'Far til Jonas (4 år)', content: 'Hei. Jeg må ta opp noe jeg har reagert på den siste tiden. Jonas kommer hjem med klissvåte og skitne klær nesten hver dag, og jeg synes dere er altfor mye ute når det er dårlig vær!' },
        { role: 'user', senderName: 'Deg (Pedagogisk leder)', content: 'Hei og takk for at du tar dette opp direkte med meg. Jeg forstår godt at det er frustrerende å hente et barn med våte og skitne klær, spesielt på travle ettermiddager. Samtidig er uteliv og sansemotorisk lek en sentral del av barnehagens pedagogikk. Kan vi snakke om hvordan vi kan sikre at skiftetøyet holder ham varm og tørr?' },
        { role: 'model', senderName: 'Far til Jonas (4 år)', content: 'Men må dere absolutt være ute i øspøs regn når det blåser surt? Er det ikke bedre å være inne og tegne eller lese?' }
      ],
      evaluation: {
        score: 8,
        summary: 'God og anerkjennende åpning. Du bekrefter fars opplevelse før du forklarer barnehagens faglige begrunnelse.',
        strengths: [
          'Anerkjennende relasjonskompetanse i tråd med Berit Bae',
          'Tydelig fokus på samarbeid fremfor konfrontasjon'
        ],
        improvements: [
          'Vær enda mer konkret om barnehagens rutiner for sjekk av temperatur og tøyskift'
        ],
        rammeplanLinks: ['Rammeplanen kap. 5: Barnehagens samarbeid med barnas hjem']
      }
    },
    '3': {
      id: '3',
      title: 'Muntlig eksamen: Rammeplanen',
      subtitle: 'Score 9/10 • 28. aug 2026',
      situation: 'Motpart: Sensor. Du blir bedt om å forsvare dine didaktiske valg i et prosjektarbeid, og koble det mot Rammeplanen.',
      role: 'Student i praksis',
      opponentTone: 'Konstruktiv, men kritisk (Medium motstand)',
      opponentCharacter: 'Sensor',
      messages: [
        { role: 'model', senderName: 'Sensor', content: 'Redegjør for spenningen mellom barns medvirkning og pedagogens ansvar for fellesskapet i dette prosjektet.' },
        { role: 'user', senderName: 'Deg (Student)', content: 'I tråd med Rammeplanens kapittel 1 skal barn ha rett til medvirkning tilpasset alder og forutsetninger, men dette må ikke forveksles med at barn overlates til seg selv. Som pedagog må jeg sette trygge rammer og ivareta fellesskapet.' }
      ],
      evaluation: {
        score: 9,
        summary: 'Presis teoretisk forankring. Du skiller forbilledlig mellom reell medvirkning og ansvarsfraskrivelse.',
        strengths: ['Tydelig henvisning til Rammeplanen', 'God profesjonsfaglig modenhet'],
        improvements: ['Kunne gjerne trukket inn FN-konvensjonen om barnets rettigheter artikkel 12 for å toppe besvarelsen'],
        rammeplanLinks: ['Rammeplanen kap. 1: Barns medvirkning', 'FNs barnekonvensjon art. 12']
      }
    }
  });

  const [activeSimId, setActiveSimId] = useState('');
  
  // Konfigurasjon for nytt rollespill
  const [situationText, setSituationText] = useState(SCENARIOS[0].text);
  const [selectedRole, setSelectedRole] = useState('Pedagogisk leder');
  const [selectedTone, setSelectedTone] = useState('Krevende og emosjonell (Høy motstand)');
  const [opponentCharacter, setOpponentCharacter] = useState(SCENARIOS[0].character);
  
  // Aktiv simulering
  const [isSimulating, setIsSimulating] = useState(false);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, isLoading]);

  const handleNewSimulation = () => {
    setActiveSimId('');
    setIsSimulating(false);
    setMessages([]);
    setUserInput('');
    setEvaluation(null);
    stopAudio();
    setPlayingIdx(null);
  };

  const handleStartSimulation = () => {
    stopAudio();
    setPlayingIdx(null);
    setEvaluation(null);
    setUserInput('');

    const matched = SCENARIOS.find(s => s.text && situationText.trim() === s.text.trim());
    let character = 'Motpart';
    let opening = 'Hei. Fint at vi kan snakke sammen om dette nå. Hva tenker du?';

    if (matched) {
      character = matched.character;
      opening = matched.opening;
    } else if (situationText.startsWith('Motpart:')) {
      const match = situationText.match(/Motpart:\s*([^.]+)\./);
      if (match && match[1]) {
        character = match[1].trim();
      }
      opening = `Hei. Fint at vi kan ta denne praten nå. Hvordan tenker du vi bør løse dette?`;
    } else if (situationText.trim()) {
      opening = `Hei. Fint at vi setter oss ned sammen. Hva vil du vi skal ta opp først?`;
    }

    setOpponentCharacter(character);

    const initialMessages: RoleplayMessage[] = [
      {
        role: 'model',
        senderName: character,
        content: opening,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(initialMessages);
    setIsSimulating(true);
    setActiveSimId('current');
  };

  const handleSelectHistoryItem = (id: string) => {
    setActiveSimId(id);
    stopAudio();
    setPlayingIdx(null);

    const saved = savedSessions[id];
    if (saved) {
      setSituationText(saved.situation);
      setSelectedRole(saved.role);
      setSelectedTone(saved.opponentTone);
      setOpponentCharacter(saved.opponentCharacter || 'Motpart');
      setMessages(saved.messages);
      setEvaluation(saved.evaluation || null);
      setIsSimulating(true);
    } else {
      setIsSimulating(false);
    }
  };

  const handleSend = async () => {
    const text = userInput.trim();
    if (!text || isLoading) return;

    const userMsg: RoleplayMessage = {
      role: 'user',
      senderName: `Deg (${selectedRole})`,
      content: text,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setUserInput('');
    setIsLoading(true);

    try {
      const scenarioPrompt = `Situasjon og kontekst: ${situationText || 'Rollespill i barnehage'}.
Brukerens rolle: ${selectedRole}.
Din motparts-karakter: ${opponentCharacter}.
Din holdning og motstandsnivå: ${selectedTone}.
Vær naturtro, faglig utfordrende og svar konsist i rollen (2-4 setninger).`;

      const reply = await runRoleplay(
        scenarioPrompt,
        text,
        newHistory
      );

      const botMsg: RoleplayMessage = {
        role: 'model',
        senderName: opponentCharacter,
        content: reply,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([...newHistory, botMsg]);
    } catch (err) {
      console.error('Roleplay error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (messages.length < 2) return;
    setIsEvaluating(true);
    stopAudio();
    try {
      const evalResult = await evaluateRoleplaySession(situationText || 'Rollespill', messages);
      setEvaluation(evalResult);

      // Lagre automatisk i historikk
      const newId = `sim-${Date.now()}`;
      const titleShort = situationText.startsWith('Motpart:')
        ? situationText.replace('Motpart:', '').split('.')[0].trim()
        : situationText.slice(0, 30).trim() || 'Rollespill';

      const newHistoryItem: HistoryItem = {
        id: newId,
        title: titleShort.length > 32 ? titleShort.substring(0, 30) + '...' : titleShort,
        subtitle: `Score ${evalResult.score || 8}/10 • ${new Date().toLocaleDateString('no-NO', { day: 'numeric', month: 'short' })}`
      };

      setHistory(prev => [newHistoryItem, ...prev]);
      setSavedSessions(prev => ({
        ...prev,
        [newId]: {
          id: newId,
          title: newHistoryItem.title,
          subtitle: newHistoryItem.subtitle,
          situation: situationText,
          role: selectedRole,
          opponentTone: selectedTone,
          opponentCharacter,
          messages,
          evaluation: evalResult
        }
      }));
      setActiveSimId(newId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleToggleAudio = (idx: number, text: string) => {
    if (playingIdx === idx) {
      stopAudio();
      setPlayingIdx(null);
    } else {
      setPlayingIdx(idx);
      playAudio(text, {
        onEnd: () => setPlayingIdx(null),
        onError: () => setPlayingIdx(null)
      });
    }
  };

  const displayTitle = situationText.startsWith('Motpart:')
    ? situationText.replace('Motpart:', '').split('.')[0].trim()
    : (situationText.slice(0, 30).trim() || 'Rollespill');

  return (
    <WorkspaceLayout
      title="Simulator"
      subtitle="Tren på krevende situasjoner"
      icon={<PlayCircle className="w-6 h-6" />}
      actionButtonLabel="Nytt rollespill"
      onActionClick={handleNewSimulation}
      historyItems={history}
      activeItemId={activeSimId}
      onItemClick={handleSelectHistoryItem}
    >
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 flex justify-center">
        <div className="max-w-4xl w-full space-y-6 pb-12">
          
          {/* OPPSETT-SKJERM NÅR INGEN SIMULERING ER AKTIV */}
          {!isSimulating ? (
            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Sett opp rollespill</h2>
              <p className="text-slate-500 mb-8 text-sm">
                Velg en situasjon, din rolle og KI-ens motstandsnivå for å starte treningen.
              </p>
              
              <div className="space-y-6">
                {/* Hurtigvalg og Situasjonsbeskrivelse */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" /> 1. Velg situasjon (Hurtigvalg)
                  </label>
                  
                  {/* Scenario-knapper */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { id: 'forelder', label: 'Kritisk forelder', text: 'Motpart: Far til Jonas (4 år). Han er bekymret/kritisk fordi Jonas ofte har skitne klær og han mener dere er for mye ute i dårlig vær.' },
                      { id: 'kollega', label: 'Uenig kollega', text: 'Motpart: Erfaren fagarbeider. Vedkommende er uenig i din nye didaktiske plan og mener rutinene er for stivbente.' },
                      { id: 'sensor', label: 'Muntlig eksamen', text: 'Motpart: Sensor. Du blir bedt om å forsvare dine didaktiske valg i et prosjektarbeid, og koble det mot Rammeplanen.' },
                      { id: 'egen', label: '+ Egendefinert', text: '' }
                    ].map(scenario => (
                      <button 
                        key={scenario.id}
                        type="button"
                        onClick={(e) => {
                          // Her bytter vi tekst i tekstfeltet basert på knappen som trykkes
                          const textarea = e.currentTarget.parentElement?.nextElementSibling as HTMLTextAreaElement | null;
                          if (textarea) {
                            textarea.value = scenario.text;
                            textarea.focus();
                          }
                          setSituationText(scenario.text);
                        }}
                        className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl text-sm hover:border-primary hover:text-primary transition-all shadow-sm"
                      >
                        {scenario.label}
                      </button>
                    ))}
                  </div>

                  {/* Tekstfeltet der situasjonen faktisk defineres */}
                  <textarea 
                    id="situation-text"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-medium h-24 resize-none leading-relaxed"
                    value={situationText}
                    onChange={(e) => setSituationText(e.target.value)}
                    placeholder="Beskriv situasjonen her, eller velg et hurtigvalg over..."
                  />
                </div>

                {/* Din Rolle */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                    <UserCog className="w-4 h-4" /> 2. Hvilken rolle spiller du?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Pedagogisk leder', 'Styrer', 'Student i praksis', 'Fagarbeider'].map((role) => (
                      <button 
                        key={role}
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        className={`p-3 font-bold rounded-xl text-sm transition-all ${
                          selectedRole === role
                            ? 'border-2 border-primary bg-primary/5 text-primary'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* KI-Motstand */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-2">
                    <Settings className="w-4 h-4" /> 3. Motstand og tone (KI)
                  </label>
                  <select 
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none font-medium text-slate-700"
                  >
                    <option value="Krevende og emosjonell (Høy motstand)">Krevende og emosjonell (Høy motstand)</option>
                    <option value="Konstruktiv, men kritisk (Medium motstand)">Konstruktiv, men kritisk (Medium motstand)</option>
                    <option value="Avvisende og stille (Høy motstand)">Avvisende og stille (Høy motstand)</option>
                  </select>
                </div>

                <button 
                  type="button"
                  onClick={handleStartSimulation}
                  className="w-full mt-4 py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md"
                >
                  <PlayCircle className="w-5 h-5" /> Start simulering
                </button>
              </div>
            </div>
          ) : (
            /* AKTIV SIMULERINGSARENA */
            <div className="space-y-6">
              {/* Topp-informasjon og handlingsknapper */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleNewSimulation}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                    title="Tilbake til oppsett"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <span>{displayTitle}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {selectedRole}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Motpart: <strong>{opponentCharacter}</strong> • {selectedTone.split('(')[0]}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEvaluate}
                    disabled={messages.length < 2 || isEvaluating}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Vurderer...</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4" />
                        <span>Få Sensor-vurdering</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleNewSimulation}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Nytt oppsett</span>
                  </button>
                </div>
              </div>

              {/* Hovedgrid: Samtale og Sensor-tilbakemelding */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Venstre: Chat-samtale */}
                <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[580px] overflow-hidden">
                  <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
                    {messages.map((msg, idx) => {
                      const isStudent = msg.role === 'user';
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${isStudent ? 'text-slate-500' : 'text-indigo-700'}`}>
                              {isStudent ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-indigo-600" />}
                              {msg.senderName}
                            </span>
                            {msg.timestamp && (
                              <span className="text-[10px] text-slate-400 font-normal">• {msg.timestamp}</span>
                            )}
                          </div>

                          <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                            isStudent
                              ? 'bg-slate-900 text-white rounded-br-sm shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                          }`}>
                            <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                            
                            {!isStudent && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-amber-500" /> Krever svar
                                </span>
                                <button
                                  onClick={() => handleToggleAudio(idx, msg.content)}
                                  className="p-1 px-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors flex items-center gap-1 font-bold text-[10px]"
                                  title="Lytt til replikk"
                                >
                                  <Volume2 className={`w-3 h-3 ${playingIdx === idx ? 'animate-pulse text-amber-500' : ''}`} />
                                  {playingIdx === idx ? 'Stopp' : 'Lytt'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {isLoading && (
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-bold text-indigo-700 mb-1 ml-1">{opponentCharacter}</span>
                        <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-sm flex items-center gap-2 shadow-sm">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-xs text-slate-600 font-medium">Formulerer svar i rollen...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hurtigtips / Hjelpefraser */}
                  <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1 font-bold text-indigo-700 shrink-0">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Tips:
                    </span>
                    <button 
                      onClick={() => setUserInput(prev => `${prev} Jeg forstår godt bekymringen din, og la meg forklare hvordan vi tenker... `)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg shrink-0 transition-colors"
                    >
                      Anerkjenn følelsen først
                    </button>
                    <button 
                      onClick={() => setUserInput(prev => `${prev} I Rammeplanen for barnehagen kapittel 1 står det at... `)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg shrink-0 transition-colors"
                    >
                      Referer til Rammeplanen
                    </button>
                    <button 
                      onClick={() => setUserInput(prev => `${prev} Berit Bae understreker at anerkjennende relasjoner handler om å lytte... `)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg shrink-0 transition-colors"
                    >
                      Trekk inn Berit Bae
                    </button>
                  </div>

                  {/* Input-felt */}
                  <div className="p-4 bg-white border-t border-slate-200">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Ditt faglige svar i rollen (trykk Enter for å sende)..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all font-medium"
                      />
                      <button
                        type="submit"
                        disabled={!userInput.trim() || isLoading}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm text-sm"
                      >
                        <Send className="w-4 h-4" /> Send
                      </button>
                    </form>
                  </div>
                </div>

                {/* Høyre: Sensor-tilbakemelding & Kontekst */}
                <div className="lg:col-span-4 space-y-4 flex flex-col">
                  {/* Bakgrunnsinfo */}
                  <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                    <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600" /> Om situasjonen
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {situationText || 'Egendefinert situasjon.'}
                    </p>
                  </div>

                  {/* Sensorvurdering */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <Award className="w-4 h-4 text-amber-500" /> Sensor-vurdering
                      </h4>
                      {evaluation?.score && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-black text-xs rounded-full">
                          Score: {evaluation.score}/10
                        </span>
                      )}
                    </div>

                    {evaluation ? (
                      <div className="space-y-4 text-xs">
                        <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          {evaluation.summary}
                        </p>

                        <div>
                          <h5 className="font-bold text-emerald-700 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hva du mestret godt:
                          </h5>
                          <ul className="space-y-1 pl-1">
                            {evaluation.strengths?.map((s: string, i: number) => (
                              <li key={i} className="text-slate-600 font-medium list-disc list-inside">
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="font-bold text-amber-700 uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Tips til forbedring:
                          </h5>
                          <ul className="space-y-1 pl-1">
                            {evaluation.improvements?.map((imp: string, i: number) => (
                              <li key={i} className="text-slate-600 font-medium list-disc list-inside">
                                {imp}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {evaluation.rammeplanLinks && evaluation.rammeplanLinks.length > 0 && (
                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                              Faglig forankring:
                            </span>
                            <div className="space-y-1">
                              {evaluation.rammeplanLinks.map((link: string, i: number) => (
                                <span key={i} className="block text-[11px] font-bold text-indigo-700 bg-indigo-50/60 p-1.5 rounded-lg">
                                  • {link}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 px-2 text-slate-400 space-y-2">
                        <GraduationCap className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-medium">
                          Svar på motpartens utspill og trykk <strong>«Få Sensor-vurdering»</strong> for å få coaching på argumentasjon og Rammeplan-forankring.
                        </p>
                      </div>
                    )}
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
