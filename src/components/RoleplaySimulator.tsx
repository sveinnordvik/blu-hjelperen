import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Drama, 
  Send, 
  Bot, 
  User, 
  RotateCcw, 
  Award, 
  Volume2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  BookOpen, 
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  Users,
  Smile,
  Lightbulb
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { 
  runRoleplay, 
  evaluateRoleplaySession, 
  RoleplayMessage, 
  RoleplayScenario, 
  PRESET_ROLEPLAY_SCENARIOS,
  playAudio, 
  stopAudio 
} from '../services/geminiService';

export function RoleplaySimulator() {
  const [selectedScenario, setSelectedScenario] = useState<RoleplayScenario>(PRESET_ROLEPLAY_SCENARIOS[0]);
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialiser samtale når scenario velges
  useEffect(() => {
    startNewDrill(selectedScenario);
  }, [selectedScenario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startNewDrill = (scenario: RoleplayScenario) => {
    stopAudio();
    setPlayingIdx(null);
    setEvaluation(null);
    setUserInput('');
    setMessages([
      {
        role: 'model',
        senderName: scenario.character,
        content: scenario.initialMessage,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSend = async () => {
    const text = userInput.trim();
    if (!text || isLoading) return;

    const userMsg: RoleplayMessage = {
      role: 'user',
      senderName: 'Deg (Student)',
      content: text,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setUserInput('');
    setIsLoading(true);

    try {
      const reply = await runRoleplay(
        `${selectedScenario.title} - Karakter: ${selectedScenario.character}. Kontekst: ${selectedScenario.description}`,
        text,
        newHistory
      );

      const botMsg: RoleplayMessage = {
        role: 'model',
        senderName: selectedScenario.character,
        content: reply,
        timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([...newHistory, botMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (messages.length < 2) return;
    setIsEvaluating(true);
    stopAudio();
    try {
      const evalResult = await evaluateRoleplaySession(selectedScenario.title, messages);
      setEvaluation(evalResult);
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

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'eksamen': return <GraduationCap className="w-4 h-4 text-purple-600" />;
      case 'foreldre': return <Users className="w-4 h-4 text-amber-600" />;
      case 'kollega': return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      default: return <Drama className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100">
            <Drama className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-800 rounded-full">
                Pedagogisk Simulator
              </span>
              <span className="text-xs text-slate-400 font-bold">• Muntlig Eksamen & Foreldresamtaler</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mt-1">Muntlig Drill & Krevende Situasjoner</h2>
            <p className="text-sm text-slate-600 mt-1">
              Gemini inntar en streng rolle (sensor, kritisk forelder eller kollega). Øv på faglig argumentasjon og profesjonell ro.
            </p>
          </div>
        </div>

        <button
          onClick={() => startNewDrill(selectedScenario)}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors self-end md:self-auto"
        >
          <RotateCcw className="w-4 h-4" /> Start på nytt
        </button>
      </div>

      {/* Scenarios Grid Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {PRESET_ROLEPLAY_SCENARIOS.map((sc) => {
          const isSelected = selectedScenario.id === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => setSelectedScenario(sc)}
              className={`p-4 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                isSelected 
                  ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-300' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-purple-200 hover:bg-purple-50/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                    isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {getCategoryIcon(sc.category)}
                    {sc.category === 'eksamen' ? 'Eksamen' : sc.category === 'foreldre' ? 'Forelder' : 'Kollega'}
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    sc.difficulty === 'Krevende' 
                      ? (isSelected ? 'bg-red-500/30 text-red-200' : 'bg-red-50 text-red-700')
                      : (isSelected ? 'bg-amber-500/30 text-amber-200' : 'bg-amber-50 text-amber-700')
                  }`}>
                    {sc.difficulty}
                  </span>
                </div>
                <h4 className="font-bold text-xs line-clamp-2 leading-snug">{sc.title}</h4>
              </div>
              <p className={`text-[11px] mt-2 font-medium ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                Rolle: {sc.character}
              </p>
            </button>
          );
        })}
      </div>

      {/* Main Simulation Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Chat Simulator */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Active Scenario Banner */}
          <div className="p-4 md:p-5 bg-gradient-to-r from-purple-50 via-white to-purple-50/30 border-b border-purple-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-purple-950 text-sm md:text-base">{selectedScenario.title}</span>
                <span className="text-xs bg-purple-200/60 text-purple-900 font-bold px-2 py-0.5 rounded-lg">
                  {selectedScenario.character}
                </span>
              </div>
              <p className="text-xs text-purple-800/80 mt-0.5 line-clamp-1">{selectedScenario.learningGoal}</p>
            </div>
            <button
              onClick={handleEvaluate}
              disabled={messages.length < 2 || isEvaluating}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Award className="w-4 h-4" />
              {isEvaluating ? 'Evaluerer...' : 'Få Sensor-vurdering'}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
            {messages.map((msg, idx) => {
              const isStudent = msg.role === 'user';
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${isStudent ? 'text-slate-500' : 'text-purple-700'}`}>
                      {isStudent ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5 text-purple-600" />}
                      {msg.senderName}
                    </span>
                    {msg.timestamp && (
                      <span className="text-[10px] text-slate-400 font-normal">• {msg.timestamp}</span>
                    )}
                  </div>

                  <div className={`max-w-[85%] md:max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                    isStudent
                      ? 'bg-slate-800 text-white rounded-br-sm shadow-md'
                      : 'bg-white border border-purple-200/70 text-slate-800 rounded-bl-sm shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                    
                    {!isStudent && (
                      <div className="mt-2.5 pt-2 border-t border-purple-100 flex items-center justify-between">
                        <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Krever ditt faglige svar
                        </span>
                        <button
                          onClick={() => handleToggleAudio(idx, msg.content)}
                          className="p-1 px-2 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-800 transition-colors flex items-center gap-1 font-bold text-[10px]"
                          title="Lytt til replikk"
                        >
                          <Volume2 className={`w-3 h-3 ${playingIdx === idx ? 'animate-pulse text-amber-500' : ''}`} />
                          {playingIdx === idx ? 'Stopp' : 'Lytt'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {isLoading && (
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-purple-700 mb-1 ml-1">{selectedScenario.character}</span>
                <div className="bg-white border border-purple-200 p-4 rounded-2xl rounded-bl-sm flex items-center gap-2 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce delay-100"></div>
                  <div className="w-2 h-2 rounded-full bg-purple-600 animate-bounce delay-200"></div>
                  <span className="text-xs text-purple-800 font-bold ml-1">Reagerer i rollen...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Guidance Chips */}
          <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1 font-bold text-purple-700 shrink-0">
              <Lightbulb className="w-3.5 h-3.5" /> Tips:
            </span>
            <button 
              onClick={() => setUserInput(prev => `${prev} Jeg forstår godt at du reagerer på dette, og la meg forklare hvordan vi tenker... `)}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg shrink-0 transition-colors"
            >
              Anerkjenn følelsen først
            </button>
            <button 
              onClick={() => setUserInput(prev => `${prev} I Rammeplanen for barnehagen kapittel 3 står det at lekens egenverdi skal anerkjennes... `)}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg shrink-0 transition-colors"
            >
              Referer til Rammeplanen
            </button>
            <button 
              onClick={() => setUserInput(prev => `${prev} Berit Bae understreker at anerkjennende relasjoner handler om å lytte til barnets opplevelsesverden... `)}
              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg shrink-0 transition-colors"
            >
              Trekk inn Berit Bae
            </button>
          </div>

          {/* Input controls */}
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
                placeholder="Ditt faglige svar til rollen (trykk Enter for å svare)..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-medium"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isLoading}
                className="px-6 py-3 bg-purple-800 text-white rounded-xl font-bold hover:bg-purple-900 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md"
              >
                <Send className="w-4 h-4" /> Svar
              </button>
            </form>
          </div>
        </div>

        {/* Right: Sensor Evaluation & Scenario Details */}
        <div className="lg:col-span-4 space-y-4 flex flex-col">
          {/* Scenario Details Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-900 text-base mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              Om situasjonen
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium mb-4">
              {selectedScenario.description}
            </p>

            <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 mb-4">
              <span className="text-[10px] font-black uppercase text-purple-800 tracking-wider block mb-1">
                Læringsmål for drillen:
              </span>
              <p className="text-xs text-purple-950 font-bold leading-relaxed">
                {selectedScenario.learningGoal}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedScenario.tags.map((t, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          {/* Sensor Feedback Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                Sensors Vurdering
              </h3>
              {evaluation && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black text-xs rounded-xl">
                  Score: {evaluation.score}/10
                </span>
              )}
            </div>

            {evaluation ? (
              <div className="space-y-4 text-xs">
                <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {evaluation.summary}
                </p>

                <div>
                  <h4 className="font-black text-emerald-700 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hva du mestret godt:
                  </h4>
                  <ul className="space-y-1 pl-1">
                    {evaluation.strengths?.map((s: string, i: number) => (
                      <li key={i} className="text-slate-600 font-medium list-disc list-inside">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-black text-amber-700 uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Tips til neste gang:
                  </h4>
                  <ul className="space-y-1 pl-1">
                    {evaluation.improvements?.map((imp: string, i: number) => (
                      <li key={i} className="text-slate-600 font-medium list-disc list-inside">
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>

                {evaluation.rammeplanLinks && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                      Faglig forankring:
                    </span>
                    <div className="space-y-1">
                      {evaluation.rammeplanLinks.map((link: string, i: number) => (
                        <span key={i} className="block text-[11px] font-bold text-purple-700 bg-purple-50/60 p-1.5 rounded-lg">
                          • {link}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 px-4 text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium max-w-xs mx-auto">
                  Gjennomfør minst én svarveksling med rollen, og trykk deretter på <strong>«Få Sensor-vurdering»</strong> for å motta pedagogisk coaching.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
