import React, { useState } from 'react';
import { 
  BookOpen, 
  Terminal, 
  Sliders, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  ChevronRight, 
  Sparkles, 
  Bot, 
  FileText, 
  AlertTriangle, 
  Cpu, 
  Eye, 
  Info,
  ExternalLink,
  Lock,
  Layers,
  HeartHandshake,
  FolderArchive,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  ALL_BOT_CONFIGS, 
  GLOBAL_SAFETY_SYSTEM_INSTRUCTION, 
  PROGRESS_PLAN_STEPS, 
  RAG_DATA_MANAGEMENT_GUIDELINES, 
  STRESS_TEST_SUITE, 
  PROMPT_CHANGELOG,
  BotModelConfig 
} from '../config/promptLibrary';

export function PromptLibrary() {
  const [selectedBot, setSelectedBot] = useState<BotModelConfig>(ALL_BOT_CONFIGS[0]);
  const [activeTab, setActiveTab] = useState<'bots' | 'safety' | 'progress' | 'stresstest' | 'rag' | 'changelog'>('bots');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testResultFilter, setTestResultFilter] = useState<string>('all');
  const [showOlderChangelogs, setShowOlderChangelogs] = useState(false);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-8 md:p-10 rounded-3xl shadow-xl relative overflow-hidden border border-slate-700/50">
        <div className="absolute right-0 top-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
            <Cpu className="w-3.5 h-3.5" /> BLU-Hjelperen Prompt Library & Model Specs v3.5.4
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Prompt-bibliotek & Modell-innstillinger
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Strukturerte system-prompter, temperatur-innstillinger, kildehierarki og sikkerhetsprotokoller for alle spesialiserte KI-agenter i barnehagelærerutdanningen.
          </p>
        </div>

        {/* Quick Nav Bar inside Header */}
        <div className="flex flex-wrap gap-2 pt-6 mt-6 border-t border-slate-700/60 relative z-10">
          {[
            { id: 'bots', label: 'Bot-prompter & Modeller', icon: Bot },
            { id: 'safety', label: 'Personvern & Barnevern', icon: ShieldAlert },
            { id: 'progress', label: 'Fremdriftsplan (Trinn 1-6)', icon: CheckCircle2 },
            { id: 'stresstest', label: 'Stresstest-sjekkliste', icon: AlertTriangle },
            { id: 'rag', label: 'RAG & Kildehierarki', icon: Layers },
            { id: 'changelog', label: 'Versjonslogg', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: BOTS & MODEL SETTINGS */}
      {activeTab === 'bots' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Bot Selector List */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">Spesialiserte Boter</h3>
            {ALL_BOT_CONFIGS.map((bot) => {
              const isSelected = selectedBot.id === bot.id;
              return (
                <button
                  key={bot.id}
                  onClick={() => setSelectedBot(bot)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 relative ${
                    isSelected
                      ? 'bg-white border-primary shadow-md ring-2 ring-primary/10'
                      : 'bg-slate-50/70 hover:bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Bot className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                      {bot.name}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      bot.model.includes('pro') 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {bot.model}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{bot.roleTitle}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 font-mono">
                    <span>Temp: <strong>{bot.temperature}</strong></span>
                    <span>•</span>
                    <span>Maks: <strong>{bot.maxOutputTokens}t</strong></span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Bot Details View */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900">{selectedBot.name}</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                      {selectedBot.category}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-500 mt-1">{selectedBot.roleTitle}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedBot.systemInstruction, selectedBot.id)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm w-fit"
                >
                  {copiedId === selectedBot.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      Kopiert system-prompt!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-300" />
                      Kopier System Prompt
                    </>
                  )}
                </button>
              </div>

              {/* Model Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hovedmodell</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">{selectedBot.model}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Temperatur</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">{selectedBot.temperature}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Maks Tokens</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">{selectedBot.maxOutputTokens}</p>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Svarlengde</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedBot.targetResponseLength}</p>
                </div>
              </div>

              {/* Core Pedagogical Rules */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" /> Faglige & Metodiske Retningslinjer
                </h4>
                <div className="space-y-2">
                  {selectedBot.coreRules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RAG Knowledge Base Sources */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> Kunnskapskilder (RAG Context)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedBot.ragSources.map((src, idx) => (
                    <span key={idx} className="text-xs bg-indigo-50 text-indigo-700 font-medium px-3 py-1 rounded-lg border border-indigo-100">
                      {src}
                    </span>
                  ))}
                </div>
              </div>

              {/* Full System Instruction Prompt Preview */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-slate-600" /> Full System Instruction (Prompt)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {selectedBot.systemInstruction.length} tegn
                  </span>
                </div>
                <div className="bg-slate-950 text-slate-200 font-mono text-xs p-5 rounded-2xl overflow-x-auto max-h-80 leading-relaxed border border-slate-800 shadow-inner">
                  <pre className="whitespace-pre-wrap">{selectedBot.systemInstruction}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAFETY, GDPR & BARNEVERN */}
      {activeTab === 'safety' && (
        <div className="space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Global Sikkerhets- og Personvernregel</h2>
                <p className="text-xs text-slate-500">Innbakt i alle bot-systemer i BLU-Hjelperen for å overholde GDPR, Forvaltningsloven og Barnehageloven.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Taushetsplikt */}
              <div className="bg-amber-50/60 border border-amber-200/80 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Lock className="w-4 h-4 text-amber-700" />
                  1. Taushetsplikt & Anonymisering (Forvaltningsloven § 13)
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Dersom en student nevner fornavn, etternavn, barnehagens navn eller gjenkjennbare kjennetegn i en praksisfortelling, skal agenten <strong>stoppe og kreve anonymisering</strong> før tekstbehandling fortsetter.
                </p>
                <div className="text-[11px] bg-white p-3 rounded-xl border border-amber-200 font-mono text-amber-900">
                  Instruks: Erstatt &quot;Emma (3 år) på Maurtua&quot; med &quot;Barn A (3 år)&quot;.
                </div>
              </div>

              {/* Card 2: Barnevern og meldeplikt */}
              <div className="bg-red-50/60 border border-red-200/80 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-700" />
                  2. Opplysningsplikt til Barnevernet (Barnehageloven § 45)
                </div>
                <p className="text-xs text-red-800 leading-relaxed">
                  Ved bekymring for vold, overgrep eller alvorlig omsorgssvikt skal agenten <strong>ikke</strong> behandle saken som et teoretisk oppgave-dilemma, men instruere studenten om å ta saken direkte med styrer eller praksislærer snarest.
                </p>
                <div className="text-[11px] bg-white p-3 rounded-xl border border-red-200 font-mono text-red-900">
                  Varsel: Dette utløser lovpålagt meldeplikt og kan ikke løses i en KI-chat.
                </div>
              </div>
            </div>

            {/* Card 3: Lyttebot Krisehjelp */}
            <div className="bg-blue-50/60 border border-blue-200/80 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                <HeartHandshake className="w-4 h-4 text-blue-700" />
                3. Psykisk Helse & Krisestøtte (Lyttebotens Sikkerhetsventil)
              </div>
              <p className="text-xs text-blue-800 leading-relaxed">
                Lytteboten er en pedagogisk samtalepartner, ikke en psykolog. Hvis studenten uttrykker akutt krise, dyp depresjon eller selvskading, henvises det umiddelbart til:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold text-blue-950">
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 text-center">
                  Studenttelefonen: <strong>116 123</strong> (tast 2)
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 text-center">
                  Legevakt: <strong>116 117</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-blue-200 text-center">
                  Studentsamskipnadens helsetilbud
                </div>
              </div>
            </div>

            {/* Raw Global Instruction */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Global Sikkerhets-prompt</h4>
                <button
                  onClick={() => copyToClipboard(GLOBAL_SAFETY_SYSTEM_INSTRUCTION, 'global_safety')}
                  className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
                >
                  {copiedId === 'global_safety' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  Kopier
                </button>
              </div>
              <div className="bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-2xl whitespace-pre-wrap leading-relaxed">
                {GLOBAL_SAFETY_SYSTEM_INSTRUCTION}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROGRESS PLAN (STEPS 1-6) */}
      {activeTab === 'progress' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Fremdriftsplan for bot-utvikling</h2>
            <p className="text-xs text-slate-500">6-trinns implementeringsplan for kvalitetssikring, prompting og utrulling i BLU.</p>
          </div>

          <div className="space-y-4">
            {PROGRESS_PLAN_STEPS.map((step) => {
              const isCompleted = step.status === 'completed';
              return (
                <div 
                  key={step.step}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCompleted 
                      ? 'bg-slate-50/60 border-slate-200/80' 
                      : 'bg-indigo-50/40 border-indigo-200 ring-1 ring-indigo-200/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                        isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white'
                      }`}>
                        {step.step}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full w-fit ${
                      isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {isCompleted ? 'Fullført' : 'Pågår'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 ml-11">{step.description}</p>

                  <div className="mt-3 ml-11 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-200/50">
                    {step.deliverables.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: STRESS TEST SUITE */}
      {activeTab === 'stresstest' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Stresstest-sjekkliste for Prompt-sikkerhet</h2>
              <p className="text-xs text-slate-500">Validering mot ghostwriting, personvernbrudd, kildehallusinering og krisetilfeller.</p>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {['all', 'Akademisk integritet', 'GDPR / Taushetsplikt', 'Barnevern', 'Kildekritikk'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTestResultFilter(filter)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                    testResultFilter === filter
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter === 'all' ? 'Alle tester' : filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {STRESS_TEST_SUITE
              .filter(tc => testResultFilter === 'all' || tc.safetyCategory === testResultFilter)
              .map((tc) => (
                <div key={tc.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">{tc.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-md">
                        {tc.botTarget}
                      </span>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                        {tc.safetyCategory}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
                    <span className="text-slate-400 font-sans block text-[10px] font-black uppercase mb-1">Test-prompt som sendes inn:</span>
                    &quot;{tc.promptSample}&quot;
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl text-emerald-900 space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Forventet og tillatt adferd:
                      </span>
                      <p>{tc.expectedBehavior}</p>
                    </div>

                    <div className="bg-red-50/80 border border-red-200 p-3 rounded-xl text-red-900 space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-red-800">
                        <AlertTriangle className="w-3.5 h-3.5" /> Forbudt / Feilet respons:
                      </span>
                      <p>{tc.forbiddenBehavior}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 5: RAG & KILDEHIERARKI */}
      {activeTab === 'rag' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">RAG-arkitektur & Kildehierarki</h2>
            <p className="text-xs text-slate-500">Retningslinjer for hvordan systemet prioriterer opplastede dokumenter mot nasjonale lover og pensum.</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Kildenes Prioriteringsrekkefølge</h3>
            <div className="space-y-2.5">
              {RAG_DATA_MANAGEMENT_GUIDELINES.sourceHierarchy.map((item) => (
                <div key={item.level} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/60">
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {item.level}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{item.rule}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Håndtering av kunnskapshull
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {RAG_DATA_MANAGEMENT_GUIDELINES.handlingKnowledgeGaps}
            </p>
          </div>
        </div>
      )}

      {/* TAB 6: CHANGELOG */}
      {activeTab === 'changelog' && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Versjonslogg for Prompt-biblioteket</h2>
            <p className="text-xs text-slate-500">Historikk over prompt-oppdateringer og sikkerhetsjusteringer.</p>
          </div>

          <div className="space-y-4">
            {/* Siste gjeldende versjon */}
            {PROMPT_CHANGELOG.length > 0 && (
              <div className="p-5 rounded-2xl border-2 border-primary/20 bg-primary/5 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900">{PROMPT_CHANGELOG[0].title}</span>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Gjeldende versjon
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-primary text-white px-2.5 py-0.5 rounded-full">
                      {PROMPT_CHANGELOG[0].version}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{PROMPT_CHANGELOG[0].date}</span>
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700 pl-4 list-disc">
                  {PROMPT_CHANGELOG[0].changes.map((change, idx) => (
                    <li key={idx} className="leading-relaxed">{change}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mappe for eldre versjoner */}
            {PROMPT_CHANGELOG.length > 1 && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowOlderChangelogs(!showOlderChangelogs)}
                  className="w-full p-3.5 bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 rounded-2xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border border-slate-200"
                >
                  <span className="flex items-center gap-2.5">
                    <FolderArchive className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-slate-800">Tidligere versjoner ({PROMPT_CHANGELOG.slice(1).length})</span>
                    <span className="text-slate-400 font-normal hidden sm:inline">
                      ({PROMPT_CHANGELOG.slice(1).map(l => l.version).join(', ')})
                    </span>
                  </span>
                  {showOlderChangelogs ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {showOlderChangelogs && (
                  <div className="space-y-3 mt-3 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    {PROMPT_CHANGELOG.slice(1).map((entry) => (
                      <div key={entry.version} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-800">{entry.title}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold bg-slate-200/80 text-slate-700 px-2.5 py-0.5 rounded-full">
                              {entry.version}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{entry.date}</span>
                          </div>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                          {entry.changes.map((change, idx) => (
                            <li key={idx}>{change}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PromptLibrary;
