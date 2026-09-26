import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  CheckCircle2, 
  ExternalLink, 
  Lock, 
  Edit3, 
  Users, 
  MessageSquare, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { DocumentItem } from './WritingWorkshop';
import { SharedReviewData } from '../PeerReviewReader';

interface PeerReviewShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem;
  currentUser?: any;
  onOpenReader?: (reviewId: string) => void;
}

export const PeerReviewShareModal: React.FC<PeerReviewShareModalProps> = ({
  isOpen,
  onClose,
  document: docItem,
  currentUser,
  onOpenReader
}) => {
  const [reviewId, setReviewId] = useState<string>('');
  const [allowComments, setAllowComments] = useState(true);
  const [isClosed, setIsClosed] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Generate deterministic reviewId based on author & docId or random unique
  useEffect(() => {
    if (!isOpen) return;

    // Use a clean ID based on docItem id or generate
    const generatedId = `rev_${docItem.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
    setReviewId(generatedId);

    // Check if review already exists in Firestore or local storage
    const checkExisting = async () => {
      try {
        const docRef = doc(db, 'shared_reviews', generatedId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as SharedReviewData;
          setAllowComments(data.allowComments !== false);
          setIsClosed(!!data.isClosed);
          setCommentsCount(Array.isArray(data.comments) ? data.comments.length : 0);
          return;
        }
      } catch (e) {
        console.warn('Sjekk av skydata feilet, sjekker lokalt:', e);
      }

      // Check local fallback
      const local = localStorage.getItem(`blu_shared_review_${generatedId}`);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          setAllowComments(parsed.allowComments !== false);
          setIsClosed(!!parsed.isClosed);
          setCommentsCount(Array.isArray(parsed.comments) ? parsed.comments.length : 0);
        } catch {}
      }
    };

    checkExisting();
  }, [isOpen, docItem.id]);

  if (!isOpen) return null;

  const authorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Student';
  const shareUrl = `${window.location.origin}${window.location.pathname}?review=${reviewId}`;

  const handlePublishOrUpdate = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    const reviewPayload: SharedReviewData = {
      id: reviewId,
      docId: docItem.id,
      authorId: currentUser?.uid || 'local_user',
      authorName,
      title: docItem.title || 'Uten tittel',
      template: docItem.template,
      taskPrompt: docItem.taskPrompt,
      content: docItem.content || '',
      allowComments,
      isClosed,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'shared_reviews', reviewId);
      await setDoc(docRef, reviewPayload, { merge: true });
      setStatusMessage('Leselenken er oppdatert og aktiv i skyen!');
    } catch (e: any) {
      console.warn('Kunne ikke lagre til Firestore:', e);
      setStatusMessage('Lagret lokalt (skyen svarte ikke). Lenken kan åpnes i denne nettleseren.');
    } finally {
      try {
        localStorage.setItem(`blu_shared_review_${reviewId}`, JSON.stringify(reviewPayload));
      } catch {}
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Hverandrevurdering & Leselenke</h3>
              <p className="text-xs text-slate-500">Gi medstudenter tilgang til å lese og kommentere i margen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Document Summary Card */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <h4 className="font-bold text-slate-900 text-xs truncate">{docItem.title}</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {docItem.template || 'Fagtekst'} • {docItem.content.trim().split(/\s+/).filter(Boolean).length} ord
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {commentsCount} kommentarer
              </span>
            </div>
          </div>

          {/* Share Link Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Leselenke for medstudenter
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kopiert!' : 'Kopier'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              💡 Send denne lenken på Canvas, i kollokviegruppa eller på melding. Medstudentene trenger kun lenken for å lese og gi tilbakemelding.
            </p>
          </div>

          {/* Permission Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Innstillinger for leselenken
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  Tillat kommentarer i margen
                </p>
                <p className="text-slate-500 mt-0.5">
                  Medstudenter kan markere setninger og legge inn respons mot Rammeplanen, pensumteori og didaktikk.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={isClosed}
                onChange={(e) => setIsClosed(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-slate-300"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  Lukk for ny respons (kun lesing)
                </p>
                <p className="text-slate-500 mt-0.5">
                  Bruk dette når du er ferdig med responsrunden og skal skrive ferdig oppgaven.
                </p>
              </div>
            </label>
          </div>

          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            {onOpenReader && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReader(reviewId);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>Åpne lesevisning</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Lukk
            </button>
            <button
              type="button"
              onClick={handlePublishOrUpdate}
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publiserer...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Oppdater leselenke</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeerReviewShareModal;
