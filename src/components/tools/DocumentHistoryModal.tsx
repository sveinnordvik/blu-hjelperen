import React, { useState, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ShieldCheck, 
  Trash2, 
  Eye, 
  ChevronRight,
  Save,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { 
  DocumentSnapshot, 
  getDocumentSnapshots, 
  saveDocumentSnapshot, 
  deleteDocumentSnapshot,
  countWords 
} from '../../lib/documentBackup';

export interface DocumentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  currentTitle: string;
  currentContent: string;
  onRestoreVersion: (title: string, content: string) => void;
  lastCloudSyncTime?: string | null;
  isOnline?: boolean;
}

export const DocumentHistoryModal: React.FC<DocumentHistoryModalProps> = ({
  isOpen,
  onClose,
  docId,
  currentTitle,
  currentContent,
  onRestoreVersion,
  lastCloudSyncTime,
  isOnline = true
}) => {
  const [snapshots, setSnapshots] = useState<DocumentSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DocumentSnapshot | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && docId) {
      const list = getDocumentSnapshots(docId);
      setSnapshots(list);
      if (list.length > 0) {
        setSelectedSnapshot(list[0]);
      } else {
        setSelectedSnapshot(null);
      }
    }
  }, [isOpen, docId]);

  if (!isOpen) return null;

  const currentWords = countWords(currentContent);

  const handleTakeManualBackup = () => {
    const snap = saveDocumentSnapshot(docId, currentTitle, currentContent, 'manual');
    if (snap) {
      setSnapshots(prev => [snap, ...prev]);
      setSelectedSnapshot(snap);
      setToastMessage('Ny sikkerhetskopi opprettet!');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleRestore = (snap: DocumentSnapshot) => {
    // 1. Ta først en sikkerhetskopi av nåværende tilstand som restore_point
    saveDocumentSnapshot(docId, currentTitle, currentContent, 'restore_point');
    
    // 2. Gjennomfør gjenopprettingen
    onRestoreVersion(snap.title, snap.content);
    setToastMessage(`Gjenopprettet versjon fra ${snap.displayTime} (${snap.displayDate})!`);
    setConfirmRestoreId(null);
    
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleDelete = (snapId: string) => {
    deleteDocumentSnapshot(docId, snapId);
    setSnapshots(prev => prev.filter(s => s.id !== snapId));
    if (selectedSnapshot?.id === snapId) {
      setSelectedSnapshot(snapshots.find(s => s.id !== snapId) || null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                Versjonshistorikk & Angre
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Lokal backup OK
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Automatisk lagrede øyeblikksbilder på denne enheten. Gjenopprett tidligere utkast trygt når som helst.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTakeManualBackup}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Opprett et øyeblikksbilde nå"
            >
              <Save className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lagre snapshot nå</span>
            </button>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STATUS BAR: SYNKRONISERING */}
        <div className="px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-600">
            <div className="flex items-center gap-1.5 font-medium">
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-amber-500'}`} />
              <span>{isOnline ? 'Online (Tilkoblet)' : 'Frakoblet (Lokal lagring)'}</span>
            </div>
            {lastCloudSyncTime && (
              <span className="text-slate-500">
                Siste skysynk: <strong className="text-slate-700">{lastCloudSyncTime}</strong>
              </span>
            )}
            <span className="text-slate-500">
              Nåværende tekst: <strong className="text-slate-700">{currentWords.toLocaleString('nb-NO')} ord</strong>
            </span>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            {snapshots.length} lagrede versjoner tilgjengelig
          </span>
        </div>

        {/* HOVEDINNHOLD: 2 KOLONNER */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          
          {/* VENSTRE: LISTE OVER VERSJONER (5 kolonner) */}
          <div className="md:col-span-5 border-r border-slate-100 flex flex-col min-h-0 overflow-y-auto p-4 space-y-2 bg-slate-50/40">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1">
              Tidslinje for utkast
            </div>

            {snapshots.length === 0 ? (
              <div className="p-8 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Ingen tidligere versjoner ennå</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Systemet tar automatisk sikkerhetskopi mens du skriver. Du kan også trykke «Lagre snapshot nå» ovenfor.
                </p>
              </div>
            ) : (
              snapshots.map((snap, idx) => {
                const isSelected = selectedSnapshot?.id === snap.id;
                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                        : 'bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-800">
                          {idx === 0 ? 'Siste utkast' : snap.displayTime}
                        </span>
                        <span className="text-[11px] text-slate-400">({snap.displayDate})</span>
                      </div>

                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        snap.reason === 'manual'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : snap.reason === 'restore_point'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : snap.reason === 'pre_export'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {snap.reasonLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                      <span className="truncate max-w-[160px] font-medium text-slate-600">
                        {snap.title}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span>{snap.wordCount} ord</span>
                        {snap.wordDiff !== undefined && snap.wordDiff !== 0 && (
                          <span className={`font-semibold ${snap.wordDiff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {snap.wordDiff > 0 ? `+${snap.wordDiff}` : snap.wordDiff}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* HØYRE: FORHÅNDSVISNING OG GJENOPPRETTING (7 kolonner) */}
          <div className="md:col-span-7 flex flex-col min-h-0 overflow-hidden bg-white">
            {selectedSnapshot ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* FORHÅNDSVISNINGSHEADER */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{selectedSnapshot.title}</h3>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {selectedSnapshot.displayDate} kl. {selectedSnapshot.displayTime}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Omfang: <strong>{selectedSnapshot.wordCount} ord</strong> (Nåværende utkast har {currentWords} ord)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreId(selectedSnapshot.id)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Gjenopprett denne versjonen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(selectedSnapshot.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Slett denne versjonen fra lokal historikk"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* BEKREFTELSESDRAFT HVIS BRUKER KLIKKET GJENOPPRETT */}
                {confirmRestoreId === selectedSnapshot.id && (
                  <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-950 flex items-center justify-between gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong className="font-bold">Er du sikker på at du vil rulle tilbake?</strong>
                        <p className="text-amber-800 mt-0.5">
                          Nåværende tekst blir automatisk sikkerhetskopiert først, slik at du aldri mister noe.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreId(null)}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                      >
                        Avbryt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestore(selectedSnapshot)}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer shadow-xs"
                      >
                        Ja, gjenopprett nå
                      </button>
                    </div>
                  </div>
                )}

                {/* INNHOLD I SNAPSHOT */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/20 font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap select-text">
                  {selectedSnapshot.content ? (
                    selectedSnapshot.content
                  ) : (
                    <span className="text-slate-400 italic">Tomt innhold i denne versjonen.</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
                Velg en versjon fra listen til venstre for å forhåndsvise eller gjenopprette.
              </div>
            )}
          </div>
        </div>

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="p-3 bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* FOOTER */}
        <div className="p-3 px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Alle versjoner lagres trygt i din nettlesers lokale database, selv ved nettfell.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
          >
            Lukk
          </button>
        </div>

      </div>
    </div>
  );
};
