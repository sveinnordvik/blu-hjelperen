import React, { useState, useRef, useEffect } from 'react';
import { 
  PlayCircle, 
  StopCircle, 
  Send, 
  Loader2, 
  User, 
  UserX, 
  Sparkles, 
  MessageSquare, 
  AlertCircle,
  PlusCircle,
  BookOpen,
  Users,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  Layers,
  ChevronRight,
  Flame
} from 'lucide-react';
import { runRoleplay } from '../services/geminiService';

export interface OralSimulatorMessage {
  role: 'system' | 'actor' | 'user';
  content: string;
}

interface PresetScenario {
  id: string;
  category: string;
  title: string;
  roleName: string;
  prompt: string;
  initialMessage: string;
  icon: React.ElementType;
  colorBadge: string;
}

export function OralSimulator() {
  const [isActive, setIsActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset');
  
  // Preset scenario selection
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('eksamen-medvirkning');
  
  // Custom scenario fields
  const [customRole, setCustomRole] = useState('Sensor / Eksaminator');
  const [customTopic, setCustomTopic] = useState('');
  const [customTone, setCustomTone] = useState('Krevende & presis (stresstest)');
  const [customOpening, setCustomOpening] = useState('');

  const [activeScenarioDescription, setActiveScenarioDescription] = useState('');
  const [messages, setMessages] = useState<OralSimulatorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const presetScenarios: PresetScenario[] = [
    {
      id: 'eksamen-medvirkning',
      category: 'Muntlig eksamen',
      title: 'Barns medvirkning vs. voksenstyring',
      roleName: 'Sensor (Muntlig eksamen)',
      prompt: 'Muntlig eksamen i pedagogikk: Sensor griller studenten på spenningsforholdet mellom barns medvirkning og rammeplanens krav til pedagogisk ledelse og voksenstyring.',
      initialMessage: 'Velkommen til muntlig eksamen. La oss begynne: Hvordan balanserer du barns rett til medvirkning med ditt ansvar for struktur og voksenstyring i en barnehagehverdag?',
      icon: GraduationCap,
      colorBadge: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    {
      id: 'forelder-utevaer',
      category: 'Foreldresamtale',
      title: 'Uenighet om utetid i dårlig vær',
      roleName: 'Kritisk foresatt',
      prompt: 'Foreldresamtale: En frustrert far kommer inn og klager kraftig over at barnet er for mye ute i vått og kaldt vær, og krever at barnet holdes innendørs.',
      initialMessage: 'Hei. Jeg forventer et skikkelig svar nå: Hver dag henter jeg en gjennomvåt og kald unge. Hvorfor kan dere ikke bare la dem være inne når det regner?',
      icon: Users,
      colorBadge: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    {
      id: 'personal-ledelse',
      category: 'Pedagogisk ledelse',
      title: 'Assistent motsetter seg didaktisk plan',
      roleName: 'Ufaglært assistent (Kollega)',
      prompt: 'Personalmøte/avdelingsmøte: En erfaren, ufaglært assistent mener de nye didaktiske planene dine er unødvendig akademisering og nekter å gjennomføre dem i praksis.',
      initialMessage: 'Jeg har jobbet her i 15 år uten alle disse fancy skjemaene og teoriene dine. Barna har det helt fint. Hvorfor skal vi kaste bort tid på dette opplegget ditt?',
      icon: Briefcase,
      colorBadge: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      id: 'praksis-didaktikk',
      category: 'Praksisveiledning',
      title: 'Kritisk faglærer på praksisbesøk',
      roleName: 'Faglærer / Praksislærer',
      prompt: 'Praksisbesøk: Faglærer observerte samlingsstunden din og utfordrer deg på hvorfor flere barn falt ut og mistet konsentrasjonen underveis.',
      initialMessage: 'Jeg observerte samlingsstunden din i dag. Tre av barna i utkanten mistet helt interessen etter fem minutter. Hvilke didaktiske vurderinger gjorde du underveis da du så dette?',
      icon: BookOpen,
      colorBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
    },
    {
      id: 'tverrfaglig-bekymring',
      category: 'Tverrfaglig samarbeid',
      title: 'Møte med PPT om språkvansker',
      roleName: 'Spesialpedagog (PPT)',
      prompt: 'Tverrfaglig drøftingsmøte: Spesialpedagog fra PPT krever grundig observasjonsgrunnlag og faglige refleksjoner før de vurderer videre sak.',
      initialMessage: 'Før vi eventuelt går videre med sakkyndig vurdering: Hvilke systematiske observasjoner og pedagogiske tiltak har avdelingen deres iverksatt det siste halve året?',
      icon: ShieldAlert,
      colorBadge: 'bg-rose-100 text-rose-800 border-rose-200'
    }
  ];

  const handleStart = () => {
    let scenarioPrompt = '';
    let actorIntro = '';
    let roleTitle = 'Motpart';

    if (activeTab === 'preset') {
      const preset = presetScenarios.find(s => s.id === selectedScenarioId);
      if (!preset) return;
      scenarioPrompt = preset.prompt;
      actorIntro = preset.initialMessage;
      roleTitle = preset.roleName;
    } else {
      if (!customTopic.trim()) return;
      roleTitle = customRole.trim() || 'Motpart';
      scenarioPrompt = `Scenario: ${customTopic.trim()}. Motpartens rolle: ${roleTitle}. Tone/stil: ${customTone}.`;
      actorIntro = customOpening.trim() || `Hei. Vi må snakke om dette: ${customTopic.trim().slice(0, 100)}... Hva er din faglige vurdering?`;
    }

    setActiveScenarioDescription(scenarioPrompt);
    setIsActive(true);
    setMessages([
      { role: 'system', content: `Simulering aktiv: ${roleTitle}` },
      { role: 'actor', content: actorIntro }
    ]);
  };

  const handleStop = () => {
    setIsActive(false);
    setMessages([]);
    setActiveScenarioDescription('');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userText = input.trim();
    const newHistory: OralSimulatorMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await runRoleplay(activeScenarioDescription, newHistory);
      setMessages(prev => [...prev, { role: 'actor', content: responseText }]);
    } catch (error) {
      console.error("Simulator feil:", error);
      setMessages(prev => [...prev, { role: 'system', content: 'Feil: Kunne ikke hente svar fra simulatoren. Prøv igjen.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col h-[780px] max-w-4xl mx-auto w-full overflow-hidden">
      {/* Header */}
      <div className="p-5 md:p-6 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg md:text-xl font-black">Rollespill & Simulator</h2>
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-400/30">
              Muntlig drill
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-400 font-medium mt-0.5">
            Stresstest din faglige argumentasjon i realistiske, krevende situasjoner.
          </p>
        </div>
        {isActive && (
          <button 
            onClick={handleStop} 
            className="px-3.5 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs"
          >
            <StopCircle className="w-4 h-4" /> Avslutt
          </button>
        )}
      </div>

      {!isActive ? (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 flex flex-col items-center">
          <div className="w-full max-w-2xl bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            
            {/* Mode switch tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('preset')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'preset'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Forhåndsdefinerte situasjoner
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('custom')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'custom'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-purple-600" />
                Egenprodusert situasjon
              </button>
            </div>

            {/* TAB 1: PRESET SCENARIOS */}
            {activeTab === 'preset' && (
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Velg en situasjon å stressteste:
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {presetScenarios.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedScenarioId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedScenarioId(item.id)}
                        className={`text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                          isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isSelected ? 'bg-white/20 text-white border-white/30' : item.colorBadge
                            }`}>
                              {item.category}
                            </span>
                            <span className={`text-[11px] font-semibold ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                              • {item.roleName}
                            </span>
                          </div>
                          <h4 className="text-xs md:text-sm font-bold truncate">
                            {item.title}
                          </h4>
                          <p className={`text-xs mt-1 leading-relaxed ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            {item.prompt}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: CUSTOM / EGENPRODUSERT SCENARIO */}
            {activeTab === 'custom' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-900">Definer ditt eget rollespill</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Lag en skreddersydd case fra praksis, et aktuelt tema fra pensum eller en situasjon du frykter.
                  </p>
                </div>

                {/* Valg av Motpart */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    1. Hvem skal AI spille? (Motpart)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      'Sensor / Eksaminator',
                      'Kritisk forelder',
                      'Uenig kollega',
                      'Styrer / Leder',
                      'PPT / Spesialpedagog',
                      'Praksisveileder'
                    ].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setCustomRole(role)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center border ${
                          customRole === role
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Eller skriv inn egen rolle..."
                    className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                {/* Situasjonsbeskrivelse */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      2. Hva handler situasjonen om? (Tema / Dilemma) *
                    </label>
                    <span className="text-[10px] text-slate-400">Påkrevd</span>
                  </div>
                  <textarea
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="F.eks: En forelder krever at barnet deres ikke skal delta på feiring av samenes nasjonaldag, eller en kollega nekter å bruke digitale verktøy i samlingsstund..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs md:text-sm text-slate-800 focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none leading-relaxed"
                  />
                </div>

                {/* Tone & Intensitet */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    3. Motpartens holdning / tone
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      'Krevende & presis (stresstest)',
                      'Frustrert & skeptisk',
                      'Konstruktiv, men pirkete',
                      'Akademisk & teorifokusert'
                    ].map((tone) => (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => setCustomTone(tone)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left border ${
                          customTone === tone
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Valgfri åpningsreplikk */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    4. Første replikk fra motparten (Valgfritt)
                  </label>
                  <input
                    type="text"
                    value={customOpening}
                    onChange={(e) => setCustomOpening(e.target.value)}
                    placeholder="La stå tom for at AI genererer åpningen selv..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>
              </div>
            )}

            {/* START BUTTON */}
            <button 
              onClick={handleStart}
              disabled={activeTab === 'custom' && !customTopic.trim()}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm"
            >
              <PlayCircle className="w-5 h-5 text-primary" /> Start Simulering
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* CHAT VIEW */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => {
              if (msg.role === 'system') {
                return (
                  <div key={idx} className="text-center my-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-200/70 px-3 py-1 rounded-full border border-slate-300/40">
                      {msg.content}
                    </span>
                  </div>
                );
              }
              const isUser = msg.role === 'user';
              return (
                <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col gap-1 max-w-[88%] md:max-w-[78%]`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isUser ? 'text-right text-slate-400' : 'text-slate-900 ml-2 flex items-center gap-1'
                    }`}>
                      {!isUser && <UserX className="w-3 h-3 text-red-500" />} {isUser ? 'Deg (Student)' : 'Motpart'}
                    </span>
                    <div className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed ${
                      isUser 
                        ? 'bg-slate-900 text-white rounded-br-sm shadow-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm font-medium'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-500">Motparten tenker og forbereder motargument...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* INPUT BAR */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Skriv ditt pedagogiske svar eller forsvar (forankre i Rammeplan/teori)..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-6 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-bold">Svar</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
