import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Share2, 
  FileText, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2, 
  ExternalLink, 
  BookOpen, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { DocumentItem } from './WritingWorkshop';

export interface ShareToCollabModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem;
  currentUser?: any;
  onNavigateToBasen?: () => void;
}

interface CollabGroupItem {
  id: string;
  name: string;
  membersCount?: number;
  isDemo?: boolean;
}

const FALLBACK_DEFAULT_GROUPS: CollabGroupItem[] = [
  { id: 'BACH-2026', name: 'Bachelor-gjengen 2026', membersCount: 4 },
  { id: 'PED-PRAKSIS', name: 'Praksis & Pedagogikk H26', membersCount: 3 }
];

export const ShareToCollabModal: React.FC<ShareToCollabModalProps> = ({
  isOpen,
  onClose,
  document: docItem,
  currentUser,
  onNavigateToBasen
}) => {
  const [groups, setGroups] = useState<CollabGroupItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sharing preferences
  const [shareAsFile, setShareAsFile] = useState(true);
  const [shareToNotes, setShareToNotes] = useState(true);
  const [shareToRag, setShareToRag] = useState(true);
  const [postToChat, setPostToChat] = useState(true);
  const [shareSummaryNote, setShareSummaryNote] = useState('');

  // Fetch groups from Firestore or local cache
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setErrorMessage(null);
      return;
    }

    const loadGroups = async () => {
      setIsLoadingGroups(true);
      setErrorMessage(null);

      try {
        const querySnapshot = await getDocs(collection(db, 'groups'));
        if (!querySnapshot.empty) {
          const list: CollabGroupItem[] = [];
          querySnapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              name: data.name || data.groupName || 'Kollokviegruppe',
              membersCount: Array.isArray(data.members) ? data.members.length : 3,
              isDemo: !!data.isDemo
            });
          });
          setGroups(list);
          if (list.length > 0) {
            setSelectedGroupId(list[0].id);
          }
        } else {
          // Check local cache
          const cached = localStorage.getItem('blu_basen_groups_cache');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const list = parsed.map((g: any) => ({
                  id: g.id || 'group_1',
                  name: g.name || 'Kollokviegruppe',
                  membersCount: Array.isArray(g.members) ? g.members.length : 3,
                  isDemo: !!g.isDemo
                }));
                setGroups(list);
                setSelectedGroupId(list[0].id);
                setIsLoadingGroups(false);
                return;
              }
            } catch {}
          }
          setGroups(FALLBACK_DEFAULT_GROUPS);
          setSelectedGroupId(FALLBACK_DEFAULT_GROUPS[0].id);
        }
      } catch (err) {
        console.warn('Kunne ikke hente grupper fra skyen, bruker lokale:', err);
        const cached = localStorage.getItem('blu_basen_groups_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const list = parsed.map((g: any) => ({
                id: g.id || 'group_1',
                name: g.name || 'Kollokviegruppe',
                membersCount: Array.isArray(g.members) ? g.members.length : 3,
                isDemo: !!g.isDemo
              }));
              setGroups(list);
              setSelectedGroupId(list[0].id);
              setIsLoadingGroups(false);
              return;
            }
          } catch {}
        }
        setGroups(FALLBACK_DEFAULT_GROUPS);
        setSelectedGroupId(FALLBACK_DEFAULT_GROUPS[0].id);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadGroups();
  }, [isOpen]);

  if (!isOpen) return null;

  const authorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Kollokviemedlem';

  const handleShare = async () => {
    if (!selectedGroupId) {
      setErrorMessage('Velg en kollokviegruppe å dele med.');
      return;
    }

    if (!shareAsFile && !shareToNotes && !shareToRag && !postToChat) {
      setErrorMessage('Velg minst én måte å dele dokumentet på.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const now = new Date();
      const dateString = now.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeString = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

      // Fetch existing group data if present
      let existingData: any = {};
      try {
        const groupRef = doc(db, 'groups', selectedGroupId);
        const snap = await getDoc(groupRef);
        if (snap.exists()) {
          existingData = snap.data();
        }
      } catch {}

      // Fallback from localStorage cache if empty
      if (!existingData.name) {
        const cached = localStorage.getItem('blu_basen_groups_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const found = parsed.find((g: any) => g.id === selectedGroupId);
            if (found) existingData = found;
          } catch {}
        }
      }

      const selectedGroupMeta = groups.find(g => g.id === selectedGroupId);
      const groupName = existingData.name || selectedGroupMeta?.name || 'Kollokviegruppe';

      // 1. Files update
      const existingFiles = Array.isArray(existingData.files) ? [...existingData.files] : [];
      if (shareAsFile) {
        const newFileItem = {
          id: `file_${Date.now()}`,
          name: `${docItem.title || 'Utkast'}.docx`,
          type: 'file',
          date: `${dateString} ${timeString}`,
          size: `${Math.max(1, Math.round(docItem.content.length / 1024))} KB`,
          content: docItem.content,
          sharedBy: authorName
        };
        existingFiles.unshift(newFileItem);
      }

      // 2. Notes update (peer review section)
      let updatedNotes = typeof existingData.notes === 'string' ? existingData.notes : '';
      if (shareToNotes) {
        const reviewHeader = `\n\n---\n### 📄 Utkast for hverandrevurdering: «${docItem.title}»\n*Delt av ${authorName} den ${dateString} kl. ${timeString}* • *Sjanger: ${docItem.template || 'Fagtekst'}*\n`;
        const commentPrompt = shareSummaryNote.trim() ? `\n> **Beskjed fra forfatter:** ${shareSummaryNote.trim()}\n` : '';
        const excerpt = docItem.content.length > 5000 ? `${docItem.content.slice(0, 5000)}\n\n*(Fortsettelse i filarkivet...)*` : docItem.content;
        updatedNotes += `${reviewHeader}${commentPrompt}\n${excerpt}\n`;
      }

      // 3. Shared RAG context update (for AI in CollabRoom)
      let updatedRag = typeof existingData.sharedRagContext === 'string' ? existingData.sharedRagContext : '';
      if (shareToRag) {
        const ragEntry = `\n\n### 📖 Pensum- & Utkastbidrag fra ${authorName}: «${docItem.title}»\n- **Oppgavetype:** ${docItem.template || 'Pedagogisk oppgave'}\n- **Oppgaveformulering:** ${docItem.taskPrompt || 'Ikke spesifisert'}\n- **Sentrale momenter:**\n${docItem.content.slice(0, 1500)}...\n`;
        updatedRag += ragEntry;
      }

      // 4. Messages update (auto announcement in group chat)
      const existingMessages = Array.isArray(existingData.messages) ? [...existingData.messages] : [];
      if (postToChat) {
        const chatNotice = {
          id: `msg_${Date.now()}`,
          userId: currentUser?.uid || 'user',
          user: authorName,
          content: `Hei gruppa! 📖 Jeg har lagt ut et nytt utkast av «${docItem.title}» (${docItem.template || 'oppgave'}) her i Basen for hverandrevurdering.${shareSummaryNote.trim() ? `\n\n💬 Note: ${shareSummaryNote.trim()}` : ''}`,
          time: timeString,
          timestamp: now.toISOString(),
          color: 'indigo',
          isMe: true
        };
        existingMessages.push(chatNotice);
      }

      // 5. Activity update
      const existingActivity = Array.isArray(existingData.activity) ? [...existingData.activity] : [];
      existingActivity.unshift({
        id: `act_${Date.now()}`,
        user: authorName,
        action: `delte utkastet «${docItem.title}» til hverandrevurdering`,
        time: 'Akkurat nå'
      });

      // Prepare payload to save
      const updatedGroup = {
        ...existingData,
        id: selectedGroupId,
        name: groupName,
        files: existingFiles,
        notes: updatedNotes,
        sharedRagContext: updatedRag,
        messages: existingMessages,
        activity: existingActivity,
        updatedAt: now.toISOString()
      };

      // Save to Firestore
      try {
        const groupRef = doc(db, 'groups', selectedGroupId);
        await setDoc(groupRef, updatedGroup, { merge: true });
      } catch (cloudErr) {
        console.warn('Kunne ikke lagre til Firestore direkte (bruker offline cache):', cloudErr);
      }

      // Always update local cache so Basen immediately shows it
      try {
        const cached = localStorage.getItem('blu_basen_groups_cache');
        let currentCache: any[] = cached ? JSON.parse(cached) : [];
        const index = currentCache.findIndex((g: any) => g.id === selectedGroupId);
        if (index >= 0) {
          currentCache[index] = updatedGroup;
        } else {
          currentCache.unshift(updatedGroup);
        }
        localStorage.setItem('blu_basen_groups_cache', JSON.stringify(currentCache));
      } catch (localErr) {
        console.error('Feil ved lagring i lokal cache:', localErr);
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Feil ved deling til kollokvie:', err);
      setErrorMessage(err.message || 'Kunne ikke dele til kollokviet. Vennligst prøv igjen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Del til kollokviegruppe</h3>
              <p className="text-xs text-slate-500">Hverandrevurdering og felles kunnskapsbase i Basen</p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Utkastet er delt med kollokviet!</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  «{docItem.title}» er nå tilgjengelig for medstudentene dine i Basen for gjennomlesing, notater og KI-drøfting.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Fortsett å skrive
                </button>
                {onNavigateToBasen && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToBasen();
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Åpne i Basen</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Document Overview Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 text-indigo-600 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{docItem.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {docItem.template || 'Dokument'} • {docItem.content.trim().split(/\s+/).filter(Boolean).length} ord
                  </p>
                </div>
              </div>

              {/* Group Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Velg kollokviegruppe
                </label>
                {isLoadingGroups ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    Laster kollokviegrupper...
                  </div>
                ) : groups.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-2">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Du er ikke meldt inn i en gruppe ennå
                    </p>
                    <p className="text-amber-800">
                      Gå til Basen for å opprette en studiegruppe eller bli med via en invitasjonslenke.
                    </p>
                    {onNavigateToBasen && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToBasen();
                        }}
                        className="mt-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition-colors inline-flex items-center gap-1.5"
                      >
                        Gå til Basen <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {groups.map((group) => {
                      const isSelected = selectedGroupId === group.id;
                      return (
                        <div
                          key={group.id}
                          onClick={() => setSelectedGroupId(group.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs ring-1 ring-emerald-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="font-semibold text-slate-800 truncate">{group.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {group.membersCount || 3} medlemmer
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sharing Modes */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Hva vil du dele?
                </label>

                {/* Option 1: File Archive */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareAsFile}
                    onChange={(e) => setShareAsFile(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      Legg til i gruppens felles filarkiv
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Gjør oppgaven tilgjengelig for direkte nedlasting eller lesing av medstudentene.
                    </p>
                  </div>
                </label>

                {/* Option 2: Group Notes for Peer Review */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareToNotes}
                    onChange={(e) => setShareToNotes(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      Felles notater for hverandrevurdering
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Lim inn teksten i gruppens felles notatblokk slik at kollokviet kan legge inn kommentarer.
                    </p>
                  </div>
                </label>

                {/* Option 3: Shared RAG Context */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareToRag}
                    onChange={(e) => setShareToRag(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Gruppens felles KI-kunnskapsbase (RAG)
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Lar gruppens PraksisTeam-veileder i CollabRoom svare på spørsmål basert på oppgaven din.
                    </p>
                  </div>
                </label>

                {/* Option 4: Post to Chat */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postToChat}
                    onChange={(e) => setPostToChat(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-slate-300"
                  />
                  <div className="text-xs">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                      Send varsel i gruppechatten
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Sender en melding i Basens chat slik at kollokviet vet at utkastet er klart.
                    </p>
                  </div>
                </label>
              </div>

              {/* Message to peers */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Beskjed til kollokviet (valgfritt)
                </label>
                <textarea
                  value={shareSummaryNote}
                  onChange={(e) => setShareSummaryNote(e.target.value)}
                  placeholder="F.eks: 'Hei! Har skrevet ferdig drøftingen av Bae og Sandseter. Spesielt takknemlig for innspill på overgangene!'"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={2}
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={isSubmitting || !selectedGroupId}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deler til kollokviet...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Del utkast nå</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
