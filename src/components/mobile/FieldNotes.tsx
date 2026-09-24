import React, { useState, useEffect, useId } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  MessageSquare, 
  BookOpen, 
  Tag, 
  Clock, 
  Sparkles,
  AlertCircle,
  FileText,
  ChevronDown,
  X,
  Send,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export type NoteCategory = 
  | 'Observasjon' 
  | 'Didaktisk idé' 
  | 'Rammeplanen' 
  | 'Barna sa/gjorde' 
  | 'Praksisveileder' 
  | 'Annet';

export interface FieldNote {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_COLORS: Record<NoteCategory, { bg: string; text: string; border: string }> = {
  'Observasjon': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Didaktisk idé': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Rammeplanen': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'Barna sa/gjorde': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'Praksisveileder': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'Annet': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
};

const CATEGORIES: NoteCategory[] = [
  'Observasjon', 
  'Didaktisk idé', 
  'Rammeplanen', 
  'Barna sa/gjorde', 
  'Praksisveileder', 
  'Annet'
];

interface FieldNotesProps {
  onSendToProcessLog?: (note: FieldNote) => void;
  onAskFieldAssistant?: (prompt: string) => void;
  user?: any;
}

export const FieldNotes: React.FC<FieldNotesProps> = ({
  onSendToProcessLog,
  onAskFieldAssistant,
  user
}) => {
  const [notes, setNotes] = useState<FieldNote[]>(() => {
    try {
      const saved = localStorage.getItem('blu_field_notes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Kunne ikke laste feltnotater:', e);
    }
    return [
      {
        id: 'initial-sample-1',
        title: 'Samling om sanser (3-4 år)',
        content: 'Barna gjettet lukter fra lukkede bokser (kanel, appelsin, furu). Oliver (3) sa: "Det lukter jul hos bestemor!". Viser tydelig sanselig erindring og begrepsdanning.',
        category: 'Observasjon',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
      },
      {
        id: 'initial-sample-2',
        title: 'Hinderløype i ulendt terreng',
        content: 'Bruke stubber og røtter i skogkanten. Didaktisk mål: utfordre motorisk mestring og risikomestring iht. Rammeplanen kap. 9.',
        category: 'Didaktisk idé',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 48).toISOString()
      }
    ];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Form inputs with live drafting failsafe in localStorage
  const [draftTitle, setDraftTitle] = useState(() => {
    return localStorage.getItem('blu_fieldnotes_draft_title') || '';
  });
  const [draftContent, setDraftContent] = useState(() => {
    return localStorage.getItem('blu_fieldnotes_draft_content') || '';
  });
  const [draftCategory, setDraftCategory] = useState<NoteCategory>(() => {
    return (localStorage.getItem('blu_fieldnotes_draft_category') as NoteCategory) || 'Observasjon';
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Sync draft to localStorage in real time
  useEffect(() => {
    localStorage.setItem('blu_fieldnotes_draft_title', draftTitle);
    localStorage.setItem('blu_fieldnotes_draft_content', draftContent);
    localStorage.setItem('blu_fieldnotes_draft_category', draftCategory);
  }, [draftTitle, draftContent, draftCategory]);

  // Sync notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('blu_field_notes', JSON.stringify(notes));
    } catch (e) {
      console.error('Feil ved lagring av feltnotater:', e);
    }
  }, [notes]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSaveNote = () => {
    if (!draftTitle.trim() && !draftContent.trim()) {
      showToast('Skriv minst en tittel eller et notat');
      return;
    }

    const titleToSave = draftTitle.trim() || 'Feltnotat ' + new Date().toLocaleDateString('no-NO');

    if (editingNoteId) {
      setNotes(prev => prev.map(n => n.id === editingNoteId ? {
        ...n,
        title: titleToSave,
        content: draftContent.trim(),
        category: draftCategory,
        updatedAt: new Date().toISOString()
      } : n));
      showToast('Notat oppdatert!');
    } else {
      const newNote: FieldNote = {
        id: `fn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: titleToSave,
        content: draftContent.trim(),
        category: draftCategory,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setNotes(prev => [newNote, ...prev]);
      showToast('Feltnotat lagret trygt!');
    }

    // Reset draft
    setDraftTitle('');
    setDraftContent('');
    setDraftCategory('Observasjon');
    localStorage.removeItem('blu_fieldnotes_draft_title');
    localStorage.removeItem('blu_fieldnotes_draft_content');
    setIsCreating(false);
    setEditingNoteId(null);
  };

  const handleStartEdit = (note: FieldNote) => {
    setEditingNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftCategory(note.category);
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNote = (id: string) => {
    if (window.confirm('Vil du slette dette feltnotatet?')) {
      setNotes(prev => prev.filter(n => n.id !== id));
      showToast('Notat slettet.');
    }
  };

  const handleCopyNote = (note: FieldNote) => {
    const text = `${note.title} [${note.category}]\n\n${note.content}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('Kopiert til utklippstavlen!');
    });
  };

  const handleSendToLog = (note: FieldNote) => {
    if (onSendToProcessLog) {
      onSendToProcessLog(note);
      showToast('Sendt videre til Prosessloggen!');
    } else {
      // Fallback: save to process logs localStorage directly
      try {
        const savedLogs = localStorage.getItem('blu_process_logs');
        const logs = savedLogs ? JSON.parse(savedLogs) : [];
        const newLog = {
          id: `log-${Date.now()}`,
          title: `[Fra felt] ${note.title}`,
          content: note.content,
          date: new Date().toISOString().split('T')[0],
          category: note.category,
          source: 'Feltnotat'
        };
        localStorage.setItem('blu_process_logs', JSON.stringify([newLog, ...logs]));
        showToast('Kopiert til Prosessloggen!');
      } catch (err) {
        showToast('Notatet er klart for prosessloggen!');
      }
    }
  };

  const handleAskAssistant = (note: FieldNote) => {
    const prompt = `Jeg har gjort denne observasjonen/notatet i barnehagepraksis:\n"${note.title}: ${note.content}"\n\nHvordan kan jeg knytte dette til Rammeplanen og relevant pedagogisk teori? Har du forslag til didaktisk oppfølging?`;
    if (onAskFieldAssistant) {
      onAskFieldAssistant(prompt);
    }
  };

  const filteredNotes = notes.filter(n => {
    const matchesCat = selectedCategory === 'Alle' || n.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="w-full max-w-xl mx-auto pb-24 px-3 sm:px-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-18 left-4 right-4 z-[150] max-w-sm mx-auto bg-slate-900 text-white text-xs font-bold py-3 px-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-slate-700"
          >
            <span>{feedbackMsg}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-5 sm:p-6 shadow-md mb-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-white tracking-wide">
              <BookOpen className="w-3.5 h-3.5" /> Kladdebok i felt
            </span>
            <span className="text-[11px] font-semibold text-emerald-100 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Auto-lagres lokalt
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">Dine observasjoner</h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-xs leading-relaxed">
            Skriv ned situasjoner, sitater og didaktiske ideer i farten. Notatene er trygge selv uten nettdekning.
          </p>
        </div>
      </div>

      {/* Action Bar: Nytt notat-knapp */}
      <div className="mb-4">
        {!isCreating ? (
          <button
            onClick={() => {
              setEditingNoteId(null);
              setIsCreating(true);
            }}
            className="w-full py-3.5 px-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Nytt feltnotat</span>
          </button>
        ) : (
          <div className="bg-white border-2 border-emerald-500 rounded-3xl p-4 shadow-xl mb-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                {editingNoteId ? 'Rediger feltnotat' : 'Nytt feltnotat'}
              </h3>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingNoteId(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Selector */}
            <div className="mb-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Kategori
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setDraftCategory(cat)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-xl font-bold border transition-all",
                      draftCategory === cat
                        ? `${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} ${CATEGORY_COLORS[cat].border} ring-2 ring-emerald-500/20`
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Tittel / situasjon (f.eks. 'Samling om sanser')"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>

            {/* Content */}
            <div className="mb-3">
              <textarea
                rows={4}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Hva observerte du? Hva sa eller gjorde barna? Hvilken didaktisk respons hadde du?"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none leading-relaxed"
              />
            </div>

            {/* Save & Cancel */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSaveNote}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs sm:text-sm hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>{editingNoteId ? 'Oppdater notat' : 'Lagre notat'}</span>
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setEditingNoteId(null);
                }}
                className="py-2.5 px-4 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-200 transition-all"
              >
                Avbryt
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søk i notater og observasjoner..."
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('Alle')}
            className={cn(
              "px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
              selectedCategory === 'Alle'
                ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            Alle ({notes.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = notes.filter(n => n.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={`cat-filter-${cat}`}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                  selectedCategory === cat
                    ? `${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} ${CATEGORY_COLORS[cat].border} shadow-xs`
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-700">Ingen feltnotater funnet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {searchQuery || selectedCategory !== 'Alle'
                ? 'Prøv å endre søkeordet eller tilbakestill kategorifilteret.'
                : 'Trykk på «Nytt feltnotat» over for å notere en observasjon fra hverdagen i barnehagen.'}
            </p>
          </div>
        ) : (
          filteredNotes.map(note => {
            const catStyle = CATEGORY_COLORS[note.category] || CATEGORY_COLORS['Annet'];
            const formattedDate = (() => {
              try {
                const d = new Date(note.createdAt);
                return isNaN(d.getTime()) ? '' : d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
              } catch {
                return '';
              }
            })();

            return (
              <motion.div
                key={note.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-emerald-300 transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-lg border", catStyle.bg, catStyle.text, catStyle.border)}>
                      {note.category}
                    </span>
                    {formattedDate && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formattedDate}
                      </span>
                    )}
                  </div>
                  
                  {/* Actions Menu */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopyNote(note)}
                      title="Kopier tekst"
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleStartEdit(note)}
                      title="Rediger"
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors text-[11px] font-bold"
                    >
                      Rediger
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      title="Slett"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-sm text-slate-900 mb-1.5">
                  {note.title}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>

                {/* Quick actions for pedagogical workflow */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleAskAssistant(note)}
                    className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Spør Feltveilederen</span>
                  </button>

                  <button
                    onClick={() => handleSendToLog(note)}
                    className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200/60"
                  >
                    <BookOpen className="w-3 h-3 text-slate-500" />
                    <span>Send til logg</span>
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};
