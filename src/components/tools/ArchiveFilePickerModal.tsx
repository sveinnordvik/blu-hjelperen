import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckSquare,
  ExternalLink,
  FileText,
  Folder,
  Loader2,
  Search,
  Square,
  UploadCloud,
  X
} from 'lucide-react';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { PensumFileItem } from '../../context/PensumHubContext';
import { extractTextFromPdf } from '../../lib/pdfUtils';
import { extractTextFromDocx } from '../../lib/docxUtils';
import { cn, formatBytes } from '../../lib/utils';

interface ArchivePickerItem {
  id: string;
  name: string;
  content: string;
  folderId?: string | null;
  type: 'file' | 'folder';
  fileType?: string;
  size?: number;
  isPinned?: boolean;
  userId?: string;
  updatedAt?: string;
}

interface ArchiveFilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: PensumFileItem[];
  onConfirmSelection: (files: PensumFileItem[]) => void;
  onOpenFullArchive?: () => void;
}

const FALLBACK_SAMPLE_ITEMS: ArchivePickerItem[] = [
  {
    id: 'sample-folder-1',
    name: 'Didaktiske planer',
    content: '',
    type: 'folder',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sample-file-1',
    name: 'Læring gjennom mestring - skoggruppemetoden.pdf',
    content:
      '# Læring gjennom mestring - skoggruppemetoden\n\nPedagogisk opplegg for arbeid med natur og friluftsliv i barnehagen. Fokus på barns risikomestring og medvirkning i ulendt terreng.\n\nForankring: Rammeplanens fagområde Kropp, bevegelse, mat og helse samt Natur, miljø og teknologi.',
    type: 'file',
    fileType: 'PDF',
    size: 245000,
    folderId: 'sample-folder-1',
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'sample-file-2',
    name: 'Generelle prinsipper for alle sesongplaner.docx',
    content:
      '# Generelle prinsipper for alle sesongplaner\n\nStrukturen bygger på didaktisk relasjonsmodell: Mål, innhold, læreforutsetninger, rammefaktorer, arbeidsmåter og vurdering.',
    type: 'file',
    fileType: 'Word',
    size: 112000,
    folderId: null,
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

function getCacheKey(uid?: string | null): string {
  return uid ? `blu_context_files_cache_${uid}` : 'blu_context_files_guest';
}

function readCachedItems(uid?: string | null): ArchivePickerItem[] {
  try {
    const raw = localStorage.getItem(getCacheKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignorer ugylig lokal cache
  }
  return FALLBACK_SAMPLE_ITEMS;
}

function writeCachedItems(uid: string | null | undefined, items: ArchivePickerItem[]) {
  try {
    localStorage.setItem(getCacheKey(uid), JSON.stringify(items));
  } catch {
    // Ignorer kvote-feil i localStorage
  }
}

export function ArchiveFilePickerModal({
  isOpen,
  onClose,
  selectedFiles,
  onConfirmSelection,
  onOpenFullArchive
}: ArchiveFilePickerModalProps) {
  const [items, setItems] = useState<ArchivePickerItem[]>(() =>
    readCachedItems(auth.currentUser?.uid)
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialiser avhukede filer fra aktivt valg hver gang modalen åpnes
  useEffect(() => {
    if (!isOpen) return;
    setCheckedIds(selectedFiles.map((f) => f.id));
    setSearchQuery('');
    setSelectedFolderId('all');
    setUploadFeedback(null);
  }, [isOpen, selectedFiles]);

  // Synkroniser arkivfiler fra Firestore (samme samling som Filarkivet)
  useEffect(() => {
    if (!isOpen) return;

    const currentUser = auth.currentUser;
    const cached = readCachedItems(currentUser?.uid);
    setItems(cached);

    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const q = query(
      collection(db, 'context_files'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: ArchivePickerItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            const rawUpdated = data.updatedAt;
            const isoUpdated = rawUpdated
              ? typeof rawUpdated?.toDate === 'function'
                ? rawUpdated.toDate().toISOString()
                : String(rawUpdated)
              : new Date().toISOString();

            return {
              id: d.id,
              name: data.name || 'Uten navn',
              content: data.content || '',
              folderId: data.folderId || null,
              type: data.type === 'folder' ? 'folder' : 'file',
              fileType:
                data.fileType ||
                (data.name?.toLowerCase().endsWith('.pdf')
                  ? 'PDF'
                  : data.name?.toLowerCase().endsWith('.docx')
                  ? 'Word'
                  : 'Fil'),
              size: data.size || 0,
              isPinned: Boolean(data.isPinned),
              userId: data.userId,
              updatedAt: isoUpdated
            };
          });

          fetched.sort(
            (a, b) =>
              new Date(b.updatedAt || 0).getTime() -
              new Date(a.updatedAt || 0).getTime()
          );

          setItems(fetched);
          writeCachedItems(currentUser.uid, fetched);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('Feil ved lasting av Filarkivet i modal:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  // Lukk på Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  const folders = useMemo(
    () => items.filter((item) => item.type === 'folder'),
    [items]
  );

  const fileItems = useMemo(
    () => items.filter((item) => item.type === 'file'),
    [items]
  );

  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach((folder) => map.set(folder.id, folder.name));
    return map;
  }, [folders]);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return fileItems.filter((file) => {
      if (selectedFolderId !== 'all') {
        if (selectedFolderId === 'root') {
          if (file.folderId) return false;
        } else if (file.folderId !== selectedFolderId) {
          return false;
        }
      }
      if (!q) return true;
      return (
        file.name.toLowerCase().includes(q) ||
        (file.content || '').toLowerCase().includes(q)
      );
    });
  }, [fileItems, selectedFolderId, searchQuery]);

  const initiallySelectedIdSet = useMemo(
    () => new Set(selectedFiles.map((f) => f.id)),
    [selectedFiles]
  );

  const archiveIdSet = useMemo(
    () => new Set(fileItems.map((f) => f.id)),
    [fileItems]
  );

  const checkedArchiveCount = useMemo(
    () => checkedIds.filter((id) => archiveIdSet.has(id)).length,
    [checkedIds, archiveIdSet]
  );

  const newlyAddedCount = useMemo(
    () =>
      checkedIds.filter(
        (id) => archiveIdSet.has(id) && !initiallySelectedIdSet.has(id)
      ).length,
    [checkedIds, archiveIdSet, initiallySelectedIdSet]
  );

  const allVisibleChecked =
    filteredFiles.length > 0 &&
    filteredFiles.every((file) => checkedIds.includes(file.id));

  const toggleFile = (fileId: string) => {
    setCheckedIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredFiles.map((f) => f.id);
    if (visibleIds.length === 0) return;
    if (allVisibleChecked) {
      setCheckedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setCheckedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const processUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadFeedback(null);
    const currentUser = auth.currentUser;
    const uploadedNewIds: string[] = [];
    const lowTextWarnings: string[] = [];
    const failedFiles: string[] = [];

    const targetFolderId =
      selectedFolderId !== 'all' && selectedFolderId !== 'root'
        ? selectedFolderId
        : null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        failedFiles.push(`${file.name} (over 10 MB)`);
        continue;
      }

      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let fileType = 'Tekst';
        let extracted = '';

        if (ext === 'pdf' || file.type === 'application/pdf') {
          fileType = 'PDF';
          extracted = await extractTextFromPdf(file);
        } else if (ext === 'docx' || ext === 'doc') {
          fileType = 'Word';
          extracted = await extractTextFromDocx(file);
        } else {
          fileType = ext ? ext.toUpperCase() : 'Tekst';
          extracted = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) =>
              resolve((event.target?.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsText(file);
          });
        }

        const cleanName = (file.name || 'Dokument').trim().slice(0, 254);
        const cleanContent = (extracted || '').trim().slice(0, 500000);

        if (cleanContent.length < 30) {
          lowTextWarnings.push(cleanName);
        }

        const storedContent =
          cleanContent ||
          `Fil: ${cleanName}\nStørrelse: ${formatBytes(file.size)}`;

        let resolvedId = `file_${Date.now()}_${i}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;

        if (currentUser) {
          const docRef = await addDoc(collection(db, 'context_files'), {
            name: cleanName,
            content: storedContent,
            folderId: targetFolderId,
            type: 'file',
            fileType,
            size: file.size,
            isPinned: false,
            userId: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          resolvedId = docRef.id;
        }

        const newItem: ArchivePickerItem = {
          id: resolvedId,
          name: cleanName,
          content: storedContent,
          folderId: targetFolderId,
          type: 'file',
          fileType,
          size: file.size,
          isPinned: false,
          userId: currentUser?.uid || 'guest',
          updatedAt: new Date().toISOString()
        };

        setItems((prev) => {
          const deduped = [newItem, ...prev.filter((it) => it.id !== resolvedId)];
          writeCachedItems(currentUser?.uid, deduped);
          return deduped;
        });

        uploadedNewIds.push(resolvedId);
      } catch (err) {
        console.error(`Feil ved opplasting av ${file.name}:`, err);
        failedFiles.push(file.name);
      }
    }

    if (uploadedNewIds.length > 0) {
      setCheckedIds((prev) => Array.from(new Set([...prev, ...uploadedNewIds])));
    }

    if (failedFiles.length > 0) {
      setUploadFeedback({
        type: 'error',
        text: `Kunne ikke laste opp: ${failedFiles.join(', ')}.`
      });
    } else if (lowTextWarnings.length > 0) {
      setUploadFeedback({
        type: 'warning',
        text: `${uploadedNewIds.length} ${
          uploadedNewIds.length === 1 ? 'fil' : 'filer'
        } lagt til i Filarkivet og huket av. Merk: Lite lesbar tekst ble funnet i ${lowTextWarnings.join(
          ', '
        )}.`
      });
    } else if (uploadedNewIds.length > 0) {
      setUploadFeedback({
        type: 'success',
        text: `${uploadedNewIds.length} ${
          uploadedNewIds.length === 1 ? 'ny fil' : 'nye filer'
        } lastet opp til Filarkivet og huket av.`
      });
    }

    setIsUploading(false);
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      await processUploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleConfirm = () => {
    const checkedSet = new Set(checkedIds);

    // Bevar eventuelle eksterne kilder (f.eks. fra Kildebanken) som ikke ligger i Filarkivet
    const preservedNonArchive = selectedFiles.filter(
      (f) => !archiveIdSet.has(f.id) && checkedSet.has(f.id)
    );

    const selectedArchiveItems: PensumFileItem[] = fileItems
      .filter((file) => checkedSet.has(file.id))
      .map((file) => ({
        id: file.id,
        title: file.name,
        content: file.content && file.content.trim().length > 0 ? file.content : file.name,
        fileType: file.fileType,
        category:
          (file.folderId && folderNameMap.get(file.folderId)) || 'Filarkivet'
      }));

    const mergedMap = new Map<string, PensumFileItem>();
    preservedNonArchive.forEach((item) => mergedMap.set(item.id, item));
    selectedArchiveItems.forEach((item) => mergedMap.set(item.id, item));

    onConfirmSelection(Array.from(mergedMap.values()));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-picker-title"
      onClick={() => {
        if (!isUploading) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toppfelt */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="archive-picker-title"
              className="text-lg font-serif font-bold text-slate-900 tracking-tight"
            >
              Velg kilder fra Filarkivet
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Huk av én eller flere filer, eller last opp nye dokumenter rett inn i podcasten.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenFullArchive && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullArchive();
                }}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hele Filarkivet</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Lukk filvelger"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Opplasting + Søk og mappefilter */}
        <div className="px-5 py-3.5 border-b border-slate-100 space-y-3 bg-slate-50/50">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.md,.csv"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={() => setIsDragActive(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                await processUploadFiles(e.dataTransfer.files);
              }
            }}
            className={cn(
              'rounded-xl border border-dashed px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
              isDragActive
                ? 'border-emerald-500 bg-emerald-50/70'
                : 'border-slate-300 bg-white'
            )}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900">
                  {isUploading
                    ? 'Leser ut tekst og lagrer til Filarkivet...'
                    : 'Last opp nye pensumfiler direkte'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Støtter PDF, Word (.docx) og tekstfiler · Lagres i arkivet og hukes av automatisk
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Last opp filer</span>
            </button>
          </div>

          {uploadFeedback && (
            <div
              role="status"
              className={cn(
                'px-3.5 py-2 rounded-xl border text-xs font-medium flex items-start gap-2',
                uploadFeedback.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : uploadFeedback.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              )}
            >
              {uploadFeedback.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{uploadFeedback.text}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søk etter filnavn eller innhold..."
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  aria-label="Tøm søk"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {filteredFiles.length > 0 && (
              <button
                type="button"
                onClick={toggleAllVisible}
                className="h-10 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                {allVisibleChecked ? (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Fjern valg ({filteredFiles.length})</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Velg alle ({filteredFiles.length})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {folders.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedFolderId('all')}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap',
                  selectedFolderId === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                )}
              >
                Alle filer ({fileItems.length})
              </button>
              {folders.map((folder) => {
                const count = fileItems.filter((f) => f.folderId === folder.id).length;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={cn(
                      'h-8 px-3 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap',
                      selectedFolderId === folder.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                    )}
                  >
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[140px]">{folder.name}</span>
                    <span className="tabular-nums opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Filliste */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {isLoading && fileItems.length === 0 ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="h-12 rounded-xl bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="px-6 py-12 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                {searchQuery
                  ? `Ingen filer matchet «${searchQuery}»`
                  : 'Ingen filer i dette filteret ennå'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Last opp PDF, Word eller tekstfiler over for å legge dem til i Filarkivet og bruke dem i podcasten.
              </p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isChecked = checkedIds.includes(file.id);
              const wasAlreadyActive = initiallySelectedIdSet.has(file.id);
              const wordEstimate = file.content
                ? Math.max(0, Math.round(file.content.trim().length / 6))
                : 0;
              const folderLabel =
                (file.folderId && folderNameMap.get(file.folderId)) || null;

              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => toggleFile(file.id)}
                  className={cn(
                    'w-full min-h-[54px] px-5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500',
                    isChecked
                      ? 'bg-emerald-50/60 hover:bg-emerald-50'
                      : 'bg-white hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      )}
                      aria-hidden="true"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.75]" />
                    </span>

                    <FileText
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isChecked ? 'text-emerald-700' : 'text-slate-400'
                      )}
                    />

                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-500 tabular-nums truncate">
                        {file.fileType || 'Dokument'}
                        <span aria-hidden="true"> · </span>
                        {wordEstimate >= 10
                          ? `ca. ${wordEstimate.toLocaleString('nb-NO')} ord`
                          : 'Kun tittel'}
                        {folderLabel && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>{folderLabel}</span>
                          </>
                        )}
                        {wasAlreadyActive && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-emerald-700 font-medium">
                              Allerede i podcasten
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Bunntekst med bekreftelse */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-600 tabular-nums">
            <span className="font-semibold text-slate-900">
              {checkedArchiveCount}{' '}
              {checkedArchiveCount === 1 ? 'arkivfil valgt' : 'arkivfiler valgt'}
            </span>
            {newlyAddedCount > 0 && (
              <span className="text-emerald-700 font-medium">
                {' '}
                · +{newlyAddedCount} ny{newlyAddedCount === 1 ? '' : 'e'} legges til
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-40"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isUploading}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer tabular-nums disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {checkedArchiveCount > 0
                  ? `Legg til valgte (${checkedArchiveCount})`
                  : 'Oppdater kildevalg'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
