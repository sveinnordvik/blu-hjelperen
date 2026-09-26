import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  MessageSquare, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Sparkles, 
  Send, 
  Share2, 
  BookOpen, 
  ChevronLeft, 
  User, 
  Tag, 
  Lock, 
  ExternalLink, 
  ThumbsUp, 
  Quote,
  X,
  Clock,
  Eye,
  Edit3
} from 'lucide-react';
import { doc, getDoc, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ReactMarkdown from 'react-markdown';

export interface MarginComment {
  id: string;
  authorName: string;
  authorId?: string;
  text: string;
  selectedText?: string;
  paragraphIndex?: number;
  createdAt: string;
  resolved?: boolean;
  tag?: 'rammeplan' | 'teori' | 'didaktikk' | 'kilde' | 'ros' | 'generelt';
}

export interface SharedReviewData {
  id: string;
  docId?: string;
  authorId: string;
  authorName: string;
  title: string;
  template?: string;
  taskPrompt?: string;
  content: string;
  allowComments?: boolean;
  isClosed?: boolean;
  comments?: MarginComment[];
  createdAt: string;
  updatedAt?: string;
}

interface PeerReviewReaderProps {
  reviewId: string;
  currentUser?: any;
  onBack?: () => void;
  onOpenInWorkshop?: (content: string, title: string) => void;
}

const BLU_COMMENT_PRESETS = [
  { label: 'Rammeplan-kobling', tag: 'rammeplan', text: 'Her bør du drøfte tydeligere opp mot Rammeplanen for barnehagen (formål, verdigrunnlag eller fagområder).' },
  { label: 'Teoriforankring', tag: 'teori', text: 'Hvilken barnehagepedagogisk teori eller forsker kan støtte opp om dette poenget (f.eks. Bae, Sandseter, Vygotskij)?' },
  { label: 'Husk APA 7', tag: 'kilde', text: 'Husk nøyaktig kildehenvisning etter APA 7-standarden her.' },
  { label: 'Didaktisk refleksjon', tag: 'didaktikk', text: 'God observasjon! Hvordan reflekterer du over barnehagelærerens rolle og barnas medvirkning her?' },
  { label: 'Veldig godt formulert', tag: 'ros', text: 'Kjempegodt poeng og tydelig rød tråd i dette avsnittet! ⭐' }
] as const;

export const PeerReviewReader: React.FC<PeerReviewReaderProps> = ({
  reviewId,
  currentUser,
  onBack,
  onOpenInWorkshop
}) => {
  const [reviewData, setReviewData] = useState<SharedReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reviewer info
  const [reviewerName, setReviewerName] = useState(() => {
    return currentUser?.displayName || currentUser?.email?.split('@')[0] || localStorage.getItem('blu_reviewer_name') || '';
  });

  // UI state
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<string>('');
  const [commentText, setCommentText] = useState('');
  const [selectedTag, setSelectedTag] = useState<'rammeplan' | 'teori' | 'didaktikk' | 'kilde' | 'ros' | 'generelt'>('rammeplan');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [filterTag, setFilterTag] = useState<string>('alle');
  const [copiedLink, setCopiedLink] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const paragraphRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Sync reviewer name
  const handleNameChange = (name: string) => {
    setReviewerName(name);
    try {
      localStorage.setItem('blu_reviewer_name', name);
    } catch {}
  };

  // Real-time listener for the shared review
  useEffect(() => {
    if (!reviewId) {
      setError('Ugyldig eller manglende leselenke.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const docRef = doc(db, 'shared_reviews', reviewId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = { id: snapshot.id, ...snapshot.data() } as SharedReviewData;
          setReviewData(data);
        } else {
          // Check local fallback
          const localKey = `blu_shared_review_${reviewId}`;
          const cached = localStorage.getItem(localKey);
          if (cached) {
            try {
              setReviewData(JSON.parse(cached));
            } catch {
              setError('Fant ikke dokumentet for hverandrevurdering. Det kan ha blitt slettet av forfatteren.');
            }
          } else {
            setError('Fant ikke dokumentet for hverandrevurdering. Det kan ha blitt slettet av forfatteren.');
          }
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Kunne ikke koble til skytjeneste for leselenke:', err);
        const localKey = `blu_shared_review_${reviewId}`;
        const cached = localStorage.getItem(localKey);
        if (cached) {
          try {
            setReviewData(JSON.parse(cached));
          } catch {
            setError('Kunne ikke laste dokumentet. Sjekk internettilkoblingen din.');
          }
        } else {
          setError('Kunne ikke laste dokumentet. Sjekk internettilkoblingen din.');
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [reviewId]);

  // Handle text selection inside reader
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 3) {
      setSelectedQuote(selection.toString().trim());
    }
  };

  // Post a new margin comment
  const handleAddComment = async (paragraphIdx?: number) => {
    if (!reviewData) return;
    const finalAuthor = reviewerName.trim() || 'Medstudent';
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);

    const newComment: MarginComment = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      authorName: finalAuthor,
      authorId: currentUser?.uid,
      text: commentText.trim(),
      selectedText: selectedQuote || undefined,
      paragraphIndex: paragraphIdx !== undefined ? paragraphIdx : activeParagraphIndex ?? undefined,
      createdAt: new Date().toISOString(),
      resolved: false,
      tag: selectedTag
    };

    const updatedComments = [...(reviewData.comments || []), newComment];

    try {
      const docRef = doc(db, 'shared_reviews', reviewId);
      await updateDoc(docRef, {
        comments: updatedComments,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Kunne ikke oppdatere via Firestore, lagrer lokalt:', e);
      const updated = {
        ...reviewData,
        comments: updatedComments,
        updatedAt: new Date().toISOString()
      };
      setReviewData(updated);
      try {
        localStorage.setItem(`blu_shared_review_${reviewId}`, JSON.stringify(updated));
      } catch {}
    } finally {
      setIsSubmittingComment(false);
      setCommentText('');
      setSelectedQuote('');
      setActiveParagraphIndex(null);
    }
  };

  // Toggle resolve comment
  const handleToggleResolve = async (commentId: string) => {
    if (!reviewData) return;
    const updatedComments = (reviewData.comments || []).map(c => 
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    );

    try {
      const docRef = doc(db, 'shared_reviews', reviewId);
      await updateDoc(docRef, {
        comments: updatedComments,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      const updated = { ...reviewData, comments: updatedComments };
      setReviewData(updated);
      try {
        localStorage.setItem(`blu_shared_review_${reviewId}`, JSON.stringify(updated));
      } catch {}
    }
  };

  // Copy share link
  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}${window.location.pathname}?review=${reviewId}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Scroll to paragraph
  const scrollToParagraph = (idx?: number) => {
    if (idx !== undefined && paragraphRefs.current[idx]) {
      paragraphRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      paragraphRefs.current[idx]?.classList.add('ring-2', 'ring-indigo-400');
      setTimeout(() => {
        paragraphRefs.current[idx]?.classList.remove('ring-2', 'ring-indigo-400');
      }, 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 min-h-[500px]">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="font-bold text-slate-800 text-sm">Laster oppgave til hverandrevurdering...</h3>
        <p className="text-xs text-slate-500 mt-1">Henter tekst og kommentarer fra medstudenter</p>
      </div>
    );
  }

  if (error || !reviewData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-[500px]">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg mb-1">Dokumentet kunne ikke åpnes</h3>
        <p className="text-xs text-slate-500 max-w-md text-center mb-6 leading-relaxed">
          {error || 'Fant ikke det forespurte dokumentet for hverandrevurdering.'}
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" /> Tilbake til Skriveverksted
          </button>
        )}
      </div>
    );
  }

  // Split content into paragraphs for margin comment anchoring
  const paragraphs = reviewData.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const wordCount = reviewData.content.trim().split(/\s+/).filter(Boolean).length;
  const isAuthor = currentUser?.uid && reviewData.authorId === currentUser.uid;

  // Filtered comments
  const comments = reviewData.comments || [];
  const filteredComments = comments.filter(c => {
    if (filterTag === 'alle') return true;
    if (filterTag === 'uloste') return !c.resolved;
    if (filterTag === 'loste') return c.resolved;
    return c.tag === filterTag;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/70 overflow-hidden font-sans">
      {/* Top Banner Navigation */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Tilbake"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <BookOpen className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 truncate max-w-[280px] sm:max-w-md">
                  {reviewData.title}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Hverandrevurdering
                </span>
                {reviewData.allowComments === false ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Kun lesing
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Kommentarer åpne
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span>Skrevet av <strong>{reviewData.authorName || 'Student'}</strong></span>
                <span>•</span>
                <span>{reviewData.template || 'Fagtekst'}</span>
                <span>•</span>
                <span>{wordCount} ord</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {onOpenInWorkshop && isAuthor && (
            <button
              onClick={() => onOpenInWorkshop(reviewData.content, reviewData.title)}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Rediger i Skriveverksted
            </button>
          )}

          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            title="Kopier leselenke for medstudenter"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copiedLink ? 'Leselenke kopiert!' : 'Kopier leselenke'}</span>
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              isSidebarOpen 
                ? 'bg-indigo-600 text-white shadow-2xs' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Marginrespons ({comments.length})</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Reading View */}
        <main 
          onMouseUp={handleMouseUp}
          className="flex-1 overflow-y-auto px-4 py-8 lg:px-12 flex justify-center custom-scrollbar"
        >
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12 space-y-8 h-fit min-h-[800px]">
            {/* Task Prompt / Problemstilling Banner */}
            {reviewData.taskPrompt && (
              <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs space-y-1">
                <span className="font-bold text-indigo-900 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Quote className="w-3 h-3 text-indigo-600" /> Oppgaveformulering / Problemstilling
                </span>
                <p className="text-indigo-950 font-medium leading-relaxed italic">
                  «{reviewData.taskPrompt}»
                </p>
              </div>
            )}

            {/* Title Header inside paper */}
            <div className="border-b border-slate-200 pb-6">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 leading-tight">
                {reviewData.title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-3 font-sans">
                <span className="flex items-center gap-1 text-slate-700 font-semibold">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> {reviewData.authorName}
                </span>
                <span>•</span>
                <span>Opprettet {new Date(reviewData.createdAt).toLocaleDateString('no-NO')}</span>
                <span>•</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                  {reviewData.template || 'Praksisoppgave'}
                </span>
              </div>
            </div>

            {/* Instruction tooltip for reviewer */}
            {reviewData.allowComments !== false && (
              <div className="px-4 py-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Slik gir du tilbakemelding:</strong> Marker tekst med musen for å sitere en setning, eller klikk på snakkeboblen ved siden av hvert avsnitt for å legge inn kommentarer i margen.
                </div>
              </div>
            )}

            {/* Paragraphs with Margin Comment Anchors */}
            <div className="space-y-6 text-slate-800 text-[15px] leading-relaxed font-serif">
              {paragraphs.map((para, idx) => {
                const paraComments = comments.filter(c => c.paragraphIndex === idx);
                const isSelected = activeParagraphIndex === idx;

                return (
                  <div
                    key={idx}
                    ref={(el) => { paragraphRefs.current[idx] = el; }}
                    className={`group relative p-3 -mx-3 rounded-xl transition-all ${
                      isSelected ? 'bg-indigo-50/70 border border-indigo-200' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Floating Add Comment Trigger */}
                    {reviewData.allowComments !== false && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveParagraphIndex(isSelected ? null : idx);
                          setSelectedQuote('');
                        }}
                        className={`absolute -right-4 sm:-right-8 top-3 p-1.5 rounded-full transition-all cursor-pointer shadow-xs ${
                          isSelected
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                            : paraComments.length > 0
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-indigo-100 hover:text-indigo-600'
                        }`}
                        title="Legg til kommentar til dette avsnittet"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Paragraph Content */}
                    <div className="prose prose-slate max-w-none text-slate-800 leading-relaxed">
                      <ReactMarkdown>{para}</ReactMarkdown>
                    </div>

                    {/* Existing Margin Badges on Paragraph */}
                    {paraComments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 font-sans">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                          Respons:
                        </span>
                        {paraComments.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setIsSidebarOpen(true);
                              setHighlightedCommentId(c.id);
                              setTimeout(() => setHighlightedCommentId(null), 2500);
                            }}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                              c.resolved 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 line-through opacity-75' 
                                : c.tag === 'rammeplan'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : c.tag === 'teori'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : c.tag === 'ros'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <span>{c.authorName}:</span>
                            <span className="truncate max-w-[150px]">{c.text}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Inline Comment Box for Selected Paragraph */}
                    {isSelected && reviewData.allowComments !== false && (
                      <div className="mt-3 p-4 bg-white rounded-xl border border-indigo-200 shadow-sm space-y-3 font-sans animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                            Ny kommentar til avsnitt #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveParagraphIndex(null)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {selectedQuote && (
                          <div className="p-2 bg-slate-50 border-l-2 border-indigo-500 rounded text-xs text-slate-600 italic">
                            «{selectedQuote}»
                          </div>
                        )}

                        {/* Preset quick buttons */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Hurtigforslag for barnehagelærerfag:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {BLU_COMMENT_PRESETS.map((p, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => {
                                  setCommentText(p.text);
                                  setSelectedTag(p.tag as any);
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[10px] font-medium transition-colors cursor-pointer"
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Name input if empty */}
                        {!reviewerName && (
                          <div>
                            <input
                              type="text"
                              value={reviewerName}
                              onChange={(e) => handleNameChange(e.target.value)}
                              placeholder="Ditt navn som medstudent..."
                              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        )}

                        {/* Category selection */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 mr-1">Kategori:</span>
                          {(['rammeplan', 'teori', 'didaktikk', 'kilde', 'ros', 'generelt'] as const).map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setSelectedTag(tag)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                                selectedTag === tag 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>

                        {/* Comment text area */}
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Skriv din kommentar eller tilbakemelding her..."
                          className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          rows={3}
                        />

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-slate-400">
                            Kommentaren lagres direkte i medstudentens margen.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddComment(idx)}
                            disabled={!commentText.trim() || isSubmittingComment}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>{isSubmittingComment ? 'Lagrer...' : 'Legg til kommentar'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Right Margin Comments Panel */}
        {isSidebarOpen && (
          <aside className="w-[360px] lg:w-[400px] bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden shadow-lg animate-in slide-in-from-right duration-200 font-sans">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Marginrespons & Tilbakemeldinger
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                {comments.length}
              </span>
            </div>

            {/* Filter Chips */}
            <div className="p-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto text-[11px] bg-white custom-scrollbar">
              {[
                { id: 'alle', label: 'Alle' },
                { id: 'uloste', label: 'Ubesvarte' },
                { id: 'rammeplan', label: 'Rammeplan' },
                { id: 'teori', label: 'Teori' },
                { id: 'didaktikk', label: 'Didaktikk' },
                { id: 'ros', label: 'Ros' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTag(tab.id)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer ${
                    filterTag === tab.id 
                      ? 'bg-indigo-600 text-white shadow-2xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Reviewer identity badge */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 truncate">
                <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="text-[11px] text-slate-400">Deg som medstudent:</span>
                <strong className="text-slate-800 text-[11px] truncate">{reviewerName || 'Anonym'}</strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newN = prompt('Endre ditt navn for kommentarer:', reviewerName);
                  if (newN !== null) handleNameChange(newN);
                }}
                className="text-[10px] text-indigo-600 font-bold hover:underline"
              >
                Endre
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {filteredComments.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Ingen kommentarer i denne visningen ennå.
                  </p>
                  {reviewData.allowComments !== false && (
                    <p className="text-[11px] text-slate-400">
                      Klikk på snakkeboblene ved avsnittene for å legge inn den første tilbakemeldingen!
                    </p>
                  )}
                </div>
              ) : (
                filteredComments.map(c => {
                  const isHighlighted = highlightedCommentId === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                        isHighlighted 
                          ? 'ring-2 ring-indigo-500 bg-indigo-50/70 border-indigo-300' 
                          : c.resolved 
                          ? 'bg-slate-50/80 border-slate-200 opacity-60' 
                          : 'bg-white border-slate-200 hover:border-indigo-200 shadow-2xs'
                      }`}
                    >
                      {/* Comment Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">
                            {c.authorName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800 text-[11px] truncate max-w-[130px]">
                            {c.authorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {c.tag && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              c.tag === 'rammeplan'
                                ? 'bg-purple-100 text-purple-800'
                                : c.tag === 'teori'
                                ? 'bg-blue-100 text-blue-800'
                                : c.tag === 'ros'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {c.tag}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Selected Quote if present */}
                      {c.selectedText && (
                        <div className="p-2 bg-slate-50 border-l-2 border-indigo-400 rounded text-[11px] text-slate-600 italic">
                          «{c.selectedText}»
                        </div>
                      )}

                      {/* Comment Text */}
                      <p className={`text-slate-800 text-xs leading-relaxed ${c.resolved ? 'line-through text-slate-500' : ''}`}>
                        {c.text}
                      </p>

                      {/* Action buttons on comment */}
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        {c.paragraphIndex !== undefined ? (
                          <button
                            type="button"
                            onClick={() => scrollToParagraph(c.paragraphIndex)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span>Gå til avsnitt #{c.paragraphIndex + 1}</span>
                          </button>
                        ) : <span />}

                        {/* Resolve toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleResolve(c.id)}
                          className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                            c.resolved 
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' 
                              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                          }`}
                          title={c.resolved ? 'Merk som uløst' : 'Merk som innarbeidet/løst'}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{c.resolved ? 'Løst' : 'Marker som løst'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick General Comment at bottom of sidebar */}
            {reviewData.allowComments !== false && (
              <div className="p-4 border-t border-slate-200 bg-slate-50/60 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Legg til en generell kommentar:
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                    placeholder="F.eks: 'Helhetlig veldig bra drøfting!'"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddComment()}
                    disabled={!commentText.trim() || isSubmittingComment}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-xs cursor-pointer"
                    title="Send kommentar"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default PeerReviewReader;
