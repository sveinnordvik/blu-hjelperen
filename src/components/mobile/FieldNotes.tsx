import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Copy, 
  Check, 
  BookOpen, 
  Sparkles,
  FileText,
  X,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { 
  FieldNote, 
  NoteCategory, 
  subscribeFieldNotes, 
  saveFieldNote, 
  deleteFieldNote 
} from '../../services/fieldNotesService';

export type { NoteCategory, FieldNote };

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
  const [notes, setNotes] = useState<FieldNote[]>([]);
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

  // Sync with fieldNotesService (both localStorage and Firestore)
  useEffect(() => {
    const unsubscribe = subscribeFieldNotes((updatedNotes) => {
      setNotes(updatedNotes);
    });
    return () => unsubscribe();
  }, []);

  // Sync draft to localStorage in real time
  useEffect(() => {
    localStorage.setItem('blu_fieldnotes_draft_title', draftTitle);
    localStorage.setItem('blu_fieldnotes_draft_content', draftContent);
    localStorage.setItem('blu_fieldnotes_draft_category', draftCategory);
  }, [draftTitle, draftContent, draftCategory]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSaveNote = async () => {
    if (!draftTitle.trim() && !draftContent.trim()) {
      showToast('Skriv minst en tittel eller et notat');
      return;
    }

    const titleToSave = draftTitle.trim() || 'Feltnotat ' + new Date().toLocaleDateString('no-NO');

    if (editingNoteId) {
      const existing = notes.find(n => n.id === editingNoteId);
      const updated: FieldNote = {
        id: editingNoteId,
        userId: existing?.userId,
        title: titleToSave,
        content: draftContent.trim(),
        category: draftCategory,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveFieldNote(updated);
      showToast('Notat oppdatert i skyen og lokalt!');
    } else {
      const newNote: FieldNote = {
        id: `fn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: titleToSave,
        content: draftContent.trim(),
        category: draftCategory,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveFieldNote(newNote);
      showToast('Feltnotat lagret og synkronisert!');
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

  const handleDeleteNote = async (id: string) => {
    if (window.confirm('Vil du slette dette feltnotatet?')) {
      await deleteFieldNote(id);
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
        const savedLogs = localStorage.getItem('blu_process_logs_v2') || localStorage.getItem('blu_process_logs');
        const logs = savedLogs ? JSON.parse(savedLogs) : [];
        const newLog = {
          id: `log-${Date.now()}`,
          title: `[Fra felt] ${note.title}`,
          situation: note.content,
          reflection: '',
          theoryLinks: `Kategori: ${note.category}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          category: 'Praksisfortelling'
        };
        localStorage.setItem('blu_process_logs_v2', JSON.stringify([newLog, ...logs]));
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
    <div className="w-full max-w-xl md:max-w-5xl mx-auto pb-24 px-3 sm:px-6">
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
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl p-5 sm:p-7 shadow-md mb-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-bold text-white tracking-wide">
                <BookOpen className="w-3.5 h-3.5" /> Kladdeblokk i felt
              </span>
              <span className="text-[11px] font-semibold text-emerald-100 flex items-center gap-1 bg-emerald-800/40 px-2.5 py-1 rounded-full">
                {user ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    Sky-synkronisert ({notes.length} notater)
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3 h-3" />
                    Lokal buffer ({notes.length} notater)
                  </>
                )}
              </span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black mt-2 tracking-tight">Dine observasjoner & feltnotater</h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl leading-relaxed">
              Skriv ned situasjoner, sitater og didaktiske ideer i farten. Notatene er tilgjengelige her, i sidepanelet og i Filarkivet på desktop.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingNoteId(null);
              setIsCreating(true);
            }}
            className="self-start sm:self-auto px-5 py-3 bg-white text-emerald-800 hover:bg-emerald-50 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>Nytt feltnotat</span>
          </button>
        </div>
      </div>

      {/* Action Bar: Nytt notat-skjema */}
      {isCreating && (
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              {editingNoteId ? 'Rediger feltnotat' : 'Nytt feltnotat'}
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingNoteId(null);
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Overskrift / Emne
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="F.eks: Samling om sanser, Utedag med 3-åringer..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Kategori
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setDraftCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border",
                      draftCategory === cat
                        ? `${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} ${CATEGORY_COLORS[cat].border} shadow-xs scale-102`
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Notatinnhold
              </label>
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Beskriv hva som skjedde, hva barna sa, dine didaktiske refleksjoner..."
                rows={5}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingNoteId(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {editingNoteId ? 'Oppdater notat' : 'Lagre feltnotat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-3 mb-6">
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
        <div className="flex flex-wrap items-center gap-1.5 py-1">
          <button
            onClick={() => setSelectedCategory('Alle')}
            className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
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
                  "px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
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

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
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
                className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
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

                  <h4 className="font-bold text-sm sm:text-base text-slate-900 mb-1.5">
                    {note.title}
                  </h4>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                </div>

                {/* Quick actions for pedagogical workflow */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleAskAssistant(note)}
                    className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Spør Feltveilederen</span>
                  </button>

                  <button
                    onClick={() => handleSendToLog(note)}
                    className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-200/60 cursor-pointer"
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
