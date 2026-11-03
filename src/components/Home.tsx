import React from 'react';
import { 
  ArrowRight, 
  Plus, 
  ShieldCheck, 
  Calendar, 
  Trash2, 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  Library, 
  BookOpen, 
  ExternalLink, 
  ShieldAlert, 
  ChevronDown, 
  FileText,
  ChevronRight,
  Clock,
  HelpCircle,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

interface AppDocument {
  id: string;
  title: string;
  content: Record<string, string>;
  outline: any[];
  folderId: string | null;
  updatedAt: string;
}

interface HomeProps {
  user: any;
  isGuest: boolean;
  appName: string;
  setActiveTab: (tab: any) => void;
  createNewDocument: (title?: string, folderId?: string | null) => void;
  setShowAuthModal: (show: boolean) => void;
  lowStressMode: boolean;
  milestones: Milestone[];
  updateMilestoneDate: (id: string, date: string) => void;
  deleteMilestone: (id: string) => void;
  toggleMilestone: (id: string) => void;
  activeTips: string[];
  currentTipIndex: number;
  checklist: any[];
  calculateWordCount: () => number;
  faqData: { q: string; a: string }[];
  openFaqIndex: number | null;
  setOpenFaqIndex: (index: number | null) => void;
  documents: AppDocument[];
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string) => void;
  onGenerateOutlineFromChat?: () => Promise<void>;
  isGeneratingOutline?: boolean;
}

const ContextualHelp = ({ title, content }: { title: string, content: string }) => (
  <div className="group relative inline-block ml-1">
    <HelpCircle className="w-3.5 h-3.5 text-slate-300 hover:text-primary cursor-help transition-colors" />
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
      <p className="font-bold mb-1">{title}</p>
      <p className="leading-relaxed opacity-90">{content}</p>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-slate-800"></div>
    </div>
  </div>
);

export const Home: React.FC<HomeProps> = ({
  user,
  isGuest,
  appName,
  setActiveTab,
  createNewDocument,
  setShowAuthModal,
  lowStressMode,
  milestones,
  updateMilestoneDate,
  deleteMilestone,
  toggleMilestone,
  activeTips,
  currentTipIndex,
  checklist,
  calculateWordCount,
  faqData,
  openFaqIndex,
  setOpenFaqIndex,
  documents,
  activeDocumentId,
  setActiveDocumentId,
  onGenerateOutlineFromChat,
  isGeneratingOutline
}) => {
  // Sort documents by updatedAt and take top 3
  const recentDocuments = [...documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <motion.div 
      key="home"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col gap-6 lg:gap-8 max-w-7xl mx-auto py-4 w-full"
    >
      <div className="w-full flex flex-col gap-6 lg:gap-8">
        {/* VELKOMMEN-BOKS */}
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 w-full flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {user?.displayName
                ? `Klar for å skrive, ${user.displayName.split(' ')[0]}?`
                : 'Klar for å skrive?'}
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-1.5 md:mt-2">
              Hva vil du fokusere på i dag? Fortsett der du slapp, eller start på noe nytt.
            </p>
          </div>
          {/* Skjult på mobil for en ren forside, synlig på md+ */}
          <div className="hidden md:flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <button 
              onClick={() => setActiveTab('assistant')} 
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all w-full sm:w-auto cursor-pointer"
              style={{ height: '46.575px' }}
            >
              <Sparkles className="w-5 h-5 text-indigo-400" /> <span>Superveilederen Chat</span>
            </button>
            <button 
              onClick={() => createNewDocument()} 
              className="bg-slate-50 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 border border-slate-200 transition-all w-full sm:w-auto"
              style={{ width: '206.625px', height: '46px' }}
            >
              <Plus className="w-5 h-5" /> <span>Nytt dokument</span>
            </button>
          </div>
        </div>

        {/* MOBIL STARTRAMPE FOR FELT (Kun på mobil, skjult på md og desktop) */}
        <div className="md:hidden grid grid-cols-2 gap-2.5 w-full">
          <button
            onClick={() => setActiveTab('field-notes')}
            className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 border border-emerald-200/90 rounded-2xl flex flex-col items-start gap-1.5 shadow-2xs hover:shadow-xs transition-all text-left active:scale-[0.98] cursor-pointer"
          >
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 leading-tight">Kladdebok i felt</p>
              <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Egne observasjoner</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('field-assistant')}
            className="p-3.5 bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-100/50 border border-indigo-200/90 rounded-2xl flex flex-col items-start gap-1.5 shadow-2xs hover:shadow-xs transition-all text-left active:scale-[0.98] cursor-pointer"
          >
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 leading-tight">Feltveileder</p>
              <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">Rammeplan & didaktikk</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('collaboration')}
            className="p-3.5 bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100/50 border border-blue-200/90 rounded-2xl flex flex-col items-start gap-1.5 shadow-2xs hover:shadow-xs transition-all text-left active:scale-[0.98] cursor-pointer"
          >
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-2xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 leading-tight">Basen</p>
              <p className="text-[10px] text-blue-700 font-semibold mt-0.5">Kollokvie & grupper</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('process-log')}
            className="p-3.5 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/50 border border-amber-200/90 rounded-2xl flex flex-col items-start gap-1.5 shadow-2xs hover:shadow-xs transition-all text-left active:scale-[0.98] cursor-pointer"
          >
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-900 leading-tight">Prosesslogg</p>
              <p className="text-[10px] text-amber-800 font-semibold mt-0.5">Strukturert refleksjon</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 w-full">
          
          {/* ================================================================= */}
          {/* VENSTRE KOLONNE - Arbeidsområdet (Skjult på mobil, synlig på md+)  */}
          {/* ================================================================= */}
          <div className="hidden md:flex xl:col-span-8 flex-col gap-6 lg:gap-8 w-full">
            
            {/* 1. SUPERVEILEDEREN (Kun desktop) */}
            <div className="bg-indigo-50/50 p-8 rounded-3xl border border-indigo-100 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-5">
                <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200 shrink-0">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>Superveilederen</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                      KI-veiledning
                    </span>
                  </h2>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Din smarte assistent for oppgaveskriving. Få hjelp med <strong>RAG-oppslag</strong> (<em>Retrieval-Augmented Generation</em> – der KI-en søker og henter presise fakta direkte fra dine opplastede pensumtekster og rammeplanen), automatisk APA-referering, og sokratisk refleksjon.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('assistant')} 
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold whitespace-nowrap hover:bg-indigo-700 transition-all shadow-md w-full sm:w-auto flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                Åpne Superveilederen <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 2. BASEN (Kollokvie) (Kun desktop) */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-5">
                <div className="bg-slate-100 p-4 rounded-2xl shrink-0">
                  <Users className="w-8 h-8 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Basen (Kollokvie)</h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    Digitalt kollokvierom der Praksis-agenten deltar. Del fellesnotater og kjør eksamensdrill med interaktive flashcards.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('collaboration')} 
                className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold whitespace-nowrap hover:bg-slate-200 transition-all w-full sm:w-auto flex items-center justify-center gap-2 shrink-0"
              >
                Åpne Basen <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 3. SISTE DOKUMENTER (Skjult på mobil for et ryddig Hjem, synlig på md+) */}
            <div className="hidden md:block bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-slate-400" /> Siste dokumenter
                </h3>
                {documents.length > 0 && (
                  <button onClick={() => setActiveTab('writing-workshop')} className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                    Se alle <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {documents.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-500 font-medium">Du har ingen aktive dokumenter enda.</p>
                  <button 
                    onClick={() => !user ? setShowAuthModal(true) : createNewDocument()}
                    className="mt-2 text-xs font-bold text-primary hover:underline"
                  >
                    {!user ? 'Logg inn nå' : 'Opprett ditt første dokument'}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documents.slice(0, 4).map(doc => (
                    <div 
                      key={doc.id} 
                      onClick={() => { setActiveDocumentId(doc.id); setActiveTab('writing-workshop'); }} 
                      className={cn(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 group",
                        activeDocumentId === doc.id ? "bg-primary-light/20 border-primary/30" : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/30 hover:shadow-xs"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-xl transition-colors shrink-0",
                        activeDocumentId === doc.id ? "bg-primary text-white" : "bg-white text-slate-500 group-hover:text-primary shadow-xs"
                      )}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 truncate text-sm">{doc.title}</p>
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          Sist endret: {(() => {
                            try {
                              const d = new Date(doc.updatedAt);
                              return isNaN(d.getTime()) ? 'Ukjent dato' : d.toLocaleDateString('no-NO');
                            } catch (e) {
                              return 'Ukjent dato';
                            }
                          })()}
                        </p>
                      </div>
                      <ChevronRight className={cn("w-4 h-4 transition-all shrink-0", activeDocumentId === doc.id ? "text-primary translate-x-1" : "text-slate-300 group-hover:text-primary")} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. MILEPÆLER OG FRISTER (Skjult på mobil, synlig på md+) */}
            {!lowStressMode && (
              <div className="hidden md:block bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="mb-6">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-slate-400" /> Milepæler og frister
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">Hold oversikt over viktige datoer i skriveprosessen.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {milestones.length > 0 ? (
                    milestones.slice(0, 3).map((m) => (
                      <div key={`home-milestone-${m.id}`} className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col gap-3 group relative">
                        <div className="flex items-center justify-between">
                          <h4 className={cn("font-bold text-slate-900 text-sm truncate", m.completed && "line-through text-slate-400")}>
                            {m.title}
                          </h4>
                          <button 
                            onClick={() => deleteMilestone(m.id)}
                            disabled={isGuest}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all disabled:hidden"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Frist</label>
                            <input 
                              type="date" 
                              disabled={isGuest}
                              value={m.date || ''}
                              onChange={(e) => updateMilestoneDate(m.id, e.target.value)}
                              className={cn(
                                "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                                isGuest && "opacity-50 cursor-not-allowed"
                              )}
                            />
                          </div>
                          <button 
                            onClick={() => isGuest ? setShowAuthModal(true) : toggleMilestone(m.id)}
                            disabled={isGuest && m.completed}
                            className={cn(
                              "w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              m.completed ? "bg-emerald-100 text-emerald-700" : "bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/10",
                              isGuest && !m.completed && "bg-slate-200 text-slate-500 shadow-none"
                            )}
                          >
                            {isGuest ? '🔒 Logg inn' : m.completed ? 'Fullført' : 'Marker som ferdig'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-sm text-slate-400">Ingen milepæler enda</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. OFTE STILTE SPØRSMÅL (FAQ) (Skjult på mobil, synlig på md+) */}
            <div className="hidden md:block bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-slate-400" /> Ofte stilte spørsmål
              </h3>
              <div className="space-y-3">
                {faqData.map((item, i) => (
                  <div key={`home-faq-${i}`} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden transition-all hover:border-primary/20">
                    <button 
                      onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white transition-colors"
                    >
                      <span className="font-bold text-slate-800 pr-4 text-sm">{item.q}</span>
                      <ChevronDown className={cn(
                        "w-4 h-4 text-slate-400 transition-transform duration-300",
                        openFaqIndex === i && "rotate-180 text-primary"
                      )} />
                    </button>
                    <AnimatePresence>
                      {openFaqIndex === i && (
                        <motion.div key="ap-auto-123-1"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                          <div className="px-6 pb-5 text-xs text-slate-600 leading-relaxed border-t border-white pt-4">
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* HØYRE KOLONNE - Dashbord & Info (4 av 12)    */}
          {/* ========================================== */}
          <div className="xl:col-span-4 flex flex-col gap-6 lg:gap-8 w-full">
            
            {/* 1. KI-ADVARSEL (Flyttet hit for å rydde opp arbeidsflyten) */}
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4 shadow-sm">
              <div className="bg-amber-100 p-3 rounded-2xl shrink-0">
                <ShieldAlert className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-bold text-amber-900 mb-1">Viktig om KI-bruk</h4>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Dette verktøyet bruker KI og kan gjøre feil. Sørg for å verifisere informasjon, og unngå å dele personsensitiv data (SIKT).
                </p>
              </div>
            </div>

            {/* MENTOR TIPS */}
            {!lowStressMode && (
              <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-tl-full -mb-8 -mr-8 italic"></div>
                <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                    <GraduationCap className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="font-serif font-bold text-lg !text-white">Mentor-tips</h3>
                </div>
                <p className="text-slate-300 text-sm font-medium leading-relaxed italic relative z-10 opacity-95">
                  "{activeTips[currentTipIndex]}"
                </p>
              </div>
            )}

            {/* 2. DIN FREMDRIFT */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-400" /> Din fremdrift
              </h3>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total fremdrift</span>
                    <span className="text-lg font-black text-primary">{Math.round((checklist.filter(c => c.checked).length / checklist.length) * 100)}%</span>
                  </div>
                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(checklist.filter(c => c.checked).length / checklist.length) * 100}%` }}
                      className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Oppgaver</span>
                    <span className="text-xl font-black text-slate-900">{checklist.filter(c => c.checked).length} / {checklist.length}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Ord</span>
                    <span className="text-xl font-black text-slate-900">{calculateWordCount()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. VIKTIGE RESSURSER (Slanket og elegant mobilkort) */}
            <div className="bg-white p-4 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
                  <Link className="w-4 h-4 md:w-5 md:h-5 text-slate-400" /> Viktige ressurser
                </h3>
                <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Ekstern</span>
              </div>
              <div className="space-y-2 md:space-y-3">
                {[
                  { title: 'SIKT Meldeskjema', subtitle: 'Personvern & samtykke', url: 'https://sikt.no/logg-inn', icon: ShieldCheck },
                  { title: 'Kildekompasset', subtitle: 'APA 7 referansestil', url: 'https://kildekompasset.no/referansestiler/apa-7/', icon: Library },
                  { title: 'DMMH Biblioteket', subtitle: 'Pensum & databaser', url: 'https://dmmh.no/bibliotek', icon: BookOpen }
                ].map((link, idx) => (
                  <a 
                    key={`home-resource-${link.title}-${idx}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3 md:p-4 bg-slate-50/80 hover:bg-white rounded-xl md:rounded-2xl border border-slate-100 hover:border-primary/30 hover:shadow-xs transition-all group min-h-[44px] cursor-pointer"
                  >
                    <div className="p-1.5 sm:p-2 md:p-2.5 bg-white rounded-lg md:rounded-xl border border-slate-200/80 group-hover:border-primary/20 transition-colors shrink-0">
                      <link.icon className="w-4 h-4 md:w-5 md:h-5 text-slate-500 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs md:text-sm font-bold text-slate-800 block group-hover:text-primary transition-colors truncate">{link.title}</span>
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{link.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-primary transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
