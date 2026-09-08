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
  HelpCircle
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
  groupMessages: any[];
  faqData: { q: string; a: string }[];
  openFaqIndex: number | null;
  setOpenFaqIndex: (index: number | null) => void;
  documents: AppDocument[];
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string) => void;
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
  groupMessages,
  faqData,
  openFaqIndex,
  setOpenFaqIndex,
  documents,
  activeDocumentId,
  setActiveDocumentId
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
      className="flex-1 flex flex-col gap-8 max-w-7xl mx-auto py-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column (Left/Center) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-primary-light/20 rounded-full blur-3xl"></div>
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
                {user ? (
                  <>Klar for å skrive, <span className="text-primary">{user.displayName?.split(' ')[0] || 'Bruker'}?</span></>
                ) : (
                  <>Velkommen til <span className="text-primary">{appName}!</span></>
                )}
              </h1>
              <p className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed font-medium">
                {user ? (
                  "Hva vil du fokusere på i dag? Fortsett der du slapp, eller start på noe nytt. Skriv bedre, stress mindre."
                ) : (
                  "Din personlige skriveassistent for barnehagelærerstudenter. Vi hjelper deg å oversette gode praksisopplevelser til sterk akademisk tekst."
                )}
              </p>
              <div className="flex flex-wrap gap-4">
                {user ? (
                  <>
                    <button 
                      onClick={() => setActiveTab('assistant')}
                      className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg shadow-primary-light"
                    >
                      Fortsett samtale <ArrowRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => createNewDocument()}
                      className="px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Nytt dokument
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setShowAuthModal(true)}
                    className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-lg hover:bg-primary-hover transition-all shadow-xl shadow-primary-light flex items-center justify-center gap-3 group"
                  >
                    Bli med i fellesskapet <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Warning Block (Moved here) */}
          <motion.div 
            whileHover={{ scale: 1.005 }}
            className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4 transition-all"
          >
            <div className="bg-amber-100 p-2 rounded-xl shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm mb-1">Viktig informasjon om KI-bruk</h4>
              <p className="text-xs text-amber-800 leading-relaxed opacity-90">
                Dette verktøyet er basert på kunstig intelligens (KI) og er ment som en støtte i skriveprosessen. Du er selv ansvarlig for innholdet i dine tekster og må kontrollere alle påstander og referanser mot offisielle kilder.
              </p>
            </div>
          </motion.div>

          {/* Siste dokumenter (Compact Quick Access) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Library className="w-5 h-5 text-primary" /> Siste dokumenter
              </h3>
              <button 
                onClick={() => setActiveTab('writing-workshop')}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Se alle <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {recentDocuments.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center bg-white">
                  <FileText className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400">Ingen dokumenter enda</p>
                  <button 
                    onClick={() => createNewDocument()}
                    className="mt-2 text-xs font-bold text-primary hover:underline"
                  >
                    Opprett ditt første dokument
                  </button>
                </div>
              ) : (
                recentDocuments.map(doc => (
                  <div 
                    key={doc.id} 
                    onClick={() => {
                      setActiveDocumentId(doc.id);
                      setActiveTab('writing-workshop');
                    }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                      activeDocumentId === doc.id ? "bg-primary-light/20 border-primary/30" : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        activeDocumentId === doc.id ? "bg-primary text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                      )}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {(() => {
                              try {
                                const d = new Date(doc.updatedAt);
                                return isNaN(d.getTime()) ? 'Ukjent dato' : d.toLocaleDateString();
                              } catch (e) {
                                return 'Ukjent dato';
                              }
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className={cn("w-4 h-4 transition-all", activeDocumentId === doc.id ? "text-primary translate-x-1" : "text-slate-300")} />
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Milepæler og Frister (Fixed) */}
          {!lowStressMode && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-light p-2 rounded-lg">
                    <Calendar className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-slate-900">Milepæler og frister</h2>
                    <p className="text-sm text-slate-500">Hold oversikt over viktige datoer i skriveprosessen.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {milestones.length > 0 ? (
                  milestones.map((milestone) => (
                    <div key={milestone.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 group relative flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h3 className={cn("font-bold text-slate-900 text-sm", milestone.completed && "line-through text-slate-400")}>
                          {milestone.title}
                        </h3>
                        <button 
                          onClick={() => deleteMilestone(milestone.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Frist</label>
                          <input 
                            type="date" 
                            value={milestone.date || ''}
                            onChange={(e) => updateMilestoneDate(milestone.id, e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <button 
                          onClick={() => toggleMilestone(milestone.id)}
                          className={cn(
                            "w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            milestone.completed ? "bg-emerald-100 text-emerald-700" : "bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/10"
                          )}
                        >
                          {milestone.completed ? 'Fullført' : 'Marker som ferdig'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">Ingen milepæler enda</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FAQ Section (Accordion) - Moved here and updated content */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-primary-light p-2 rounded-lg">
                <HelpCircle className="text-primary w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-slate-900">Ofte stilte spørsmål</h2>
                <p className="text-sm text-slate-500">Alt du trenger å vite om BLU-Hjelperen.</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {faqData.map((item, i) => (
                <div key={item.q} className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden transition-all hover:border-primary/20">
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
                      <motion.div
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

        {/* Sidebar Column (Right) */}
        <div className="lg:col-span-1 space-y-8">
          {/* Mentor Tips */}
          {!lowStressMode && (
            <div className="bg-primary p-8 rounded-[2.5rem] text-white shadow-xl shadow-primary/20 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-tl-full -mb-8 -mr-8"></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="bg-white/20 p-2 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg">Mentor-tips</h3>
              </div>
              <p className="text-base font-medium leading-relaxed italic relative z-10 opacity-95">
                "{activeTips[currentTipIndex]}"
              </p>
            </div>
          )}

          {/* Progress Summary */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-8 -mt-8"></div>
            <h3 className="font-bold text-lg flex items-center gap-3 mb-8 relative z-10">
              <div className="bg-primary-light p-2 rounded-xl">
                <LayoutDashboard className="w-5 h-5 text-primary" />
              </div>
              Din fremdrift
            </h3>
            <div className="space-y-8 relative z-10">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total fremdrift</span>
                  <span className="text-lg font-black text-primary">{Math.round((checklist.filter(c => c.checked).length / checklist.length) * 100)}%</span>
                </div>
                <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(checklist.filter(c => c.checked).length / checklist.length) * 100}%` }}
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Oppgaver</span>
                  <span className="text-2xl font-black text-slate-900">{checklist.filter(c => c.checked).length} / {checklist.length}</span>
                </div>
                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Ord</span>
                  <span className="text-2xl font-black text-slate-900">{calculateWordCount()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Collaboration Preview */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col transition-all">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="font-bold text-lg flex items-center gap-3">
                <div className="bg-primary-light p-2 rounded-xl">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                Samarbeid
              </h3>
              <button 
                onClick={() => setActiveTab('collaboration')}
                className="text-xs font-bold text-primary hover:underline"
              >
                Åpne
              </button>
            </div>
            <div className="flex-1 space-y-4">
              <div className="space-y-3">
                {groupMessages.slice(-2).map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm", 
                      msg.color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500')}>
                      {msg.user}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">{msg.content}</p>
                      <span className="text-[9px] text-slate-400 font-bold mt-1 block uppercase tracking-wider">{msg.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Viktige ressurser */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col transition-all">
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="bg-primary-light p-2 rounded-xl">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Viktige ressurser</h3>
              <ContextualHelp title="Ressurser" content="Hurtiglenker til eksterne tjenester du ofte trenger i skriveprosessen." />
            </div>
            <div className="grid grid-cols-1 gap-4 flex-1">
              {[
                { title: 'SIKT Meldeskjema', url: 'https://sikt.no/logg-inn', icon: ShieldCheck },
                { title: 'Kildekompasset (APA 7)', url: 'https://kildekompasset.no/referansestiler/apa-7/', icon: Library },
                { title: 'Biblioteket', url: 'https://dmmh.no/bibliotek', icon: BookOpen }
              ].map((link) => (
                <a 
                  key={link.title}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div className="p-3 bg-white rounded-xl border border-slate-200 group-hover:border-primary/20 transition-colors">
                    <link.icon className="w-6 h-6 text-slate-400 group-hover:text-primary" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-bold text-slate-700 block group-hover:text-primary transition-colors">{link.title}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Åpne ekstern side</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
