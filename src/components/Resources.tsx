import React, { useState, useRef, useEffect } from 'react';
import { WorkspaceLayout, FolderType, HistoryItem } from './WorkspaceLayout';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Library, 
  Folder, 
  FolderPlus,
  FolderOpen,
  UploadCloud, 
  ExternalLink, 
  Shield, 
  AlertTriangle, 
  FileText, 
  Search, 
  BookOpen, 
  Lock, 
  Trash2,
  Copy,
  Check,
  Plus,
  Download,
  X,
  Sparkles,
  ArrowRight,
  Pin,
  PinOff,
  Edit2,
  RotateCcw,
  File,
  FileCheck,
  FileCode,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Move,
  Clock,
  Archive,
  StickyNote,
  BookMarked,
  CheckSquare
} from 'lucide-react';
import { KildebankView } from './tools/KildebankView';
import { PensumHubActionMenu, PensumHubAction } from './tools/PensumHubActionMenu';
import { usePensumHub } from '../context/PensumHubContext';
import { 
  FieldNote, 
  NoteCategory, 
  subscribeFieldNotes, 
  saveFieldNote, 
  deleteFieldNote 
} from '../services/fieldNotesService';
import { cn, formatBytes } from '../lib/utils';
import { db, auth } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { extractTextFromPdf } from '../lib/pdfUtils';
import { extractTextFromDocx } from '../lib/docxUtils';

export interface ResourcesProps {
  collegeName?: string;
  initialMenu?: 'library' | 'files' | 'field-notes-archive' | 'sources' | 'kildebank' | string;
  onNavigateToFieldNotes?: () => void;
  onNavigateToWorkshop?: (targetDocId?: string) => void;
  onNavigateToTools?: (toolId?: string) => void;
}

export interface ArchiveFile {
  id: string;
  name: string;
  content: string;
  folderId?: string | null;
  type: 'file' | 'folder';
  fileType?: string;
  size?: number;
  isPinned?: boolean;
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
  dataUrl?: string;
}

const RESOURCE_LINKS: Record<string, string> = {
  'Canvas (Læringsplattform)': 'https://www.instructure.com/canvas/login',
  'Wiseflow (Eksamen)': 'https://europe.wiseflow.net/login/search',
  'Studentweb': 'https://fsweb.no/studentweb/index.jsf',
  'Pensumoversikt': 'https://oria.no',
  'Rammeplan for barnehagen': 'https://www.udir.no/laring-og-trivsel/rammeplan-for-barnehagen/',
  'Barnehageloven': 'https://lovdata.no/dokument/NL/lov/2005-06-17-64',
  'SIKT (Personvern)': 'https://sikt.no/logg-inn',
  'NESH-Retningslinjer': 'https://www.forskningsetikk.no/retningslinjer/hum-sam/forskningsetiske-retningslinjer-for-samfunnsvitenskap-humaniora-juss-og-teologi/'
};

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

const INITIAL_SAMPLE_FILES: ArchiveFile[] = [
  { 
    id: 'sample-folder-1', 
    name: 'Didaktiske planer', 
    content: '', 
    type: 'folder', 
    isPinned: false, 
    updatedAt: new Date().toISOString() 
  },
  { 
    id: 'sample-file-1', 
    name: 'Læring gjennom mestring - skoggruppemetoden.pdf', 
    content: '# Læring gjennom mestring - skoggruppemetoden\n\nPedagogisk opplegg for arbeid med natur og friluftsliv i barnehagen. Fokus på barns risikomestring og medvirkning i ulendt terreng.\n\nForankring: Rammeplanens fagområde Kropp, bevegelse, mat og helse samt Natur, miljø og teknologi.', 
    type: 'file', 
    fileType: 'PDF', 
    size: 245000, 
    folderId: 'sample-folder-1', 
    isPinned: false, 
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString() 
  },
  { 
    id: 'sample-file-2', 
    name: 'Generelle prinsipper for alle sesongplaner.docx', 
    content: '# Generelle prinsipper for alle sesongplaner\n\nStrukturen bygger på didaktisk relasjonsmodell: Mål, innhold, læreforutsetninger, rammefaktorer, arbeidsmåter og vurdering.', 
    type: 'file', 
    fileType: 'Word', 
    size: 112000, 
    isPinned: false, 
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString() 
  }
];

export function Resources({ 
  collegeName = 'DMMH', 
  initialMenu = 'files',
  onNavigateToFieldNotes,
  onNavigateToWorkshop,
  onNavigateToTools
}: ResourcesProps) {
  // Navigation / views: 'files' | 'library' | 'field-notes-archive' | 'sources'
  const [activeMenu, setActiveMenu] = useState<string>(() => {
    if (initialMenu === 'library') return 'library';
    if (initialMenu === 'sources' || initialMenu === 'kildebank') return 'sources';
    if (initialMenu === 'field-notes-archive') return 'field-notes-archive';
    return 'files';
  });
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));

  // Pensum-Hub / Multi-select state for Filarkiv
  const { activePensumFiles, pendingAction, startPensumAction } = usePensumHub();
  const [selectedFiles, setSelectedFiles] = useState<string[]>(() => {
    if (activePensumFiles && activePensumFiles.length > 0) {
      return activePensumFiles.map(f => f.id);
    }
    return [];
  });
  const [isPensumHubMenuOpen, setIsPensumHubMenuOpen] = useState(false);

  useEffect(() => {
    if (activePensumFiles && activePensumFiles.length > 0 && selectedFiles.length === 0) {
      setSelectedFiles(activePensumFiles.map(f => f.id));
    }
  }, [activePensumFiles]);

  const toggleFileSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFiles(prev => 
      prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
    );
  };

  const handleBrukKilderClick = () => {
    const selectedFilesList = items.filter(f => selectedFiles.includes(f.id)).map(f => ({
      id: f.id,
      title: f.name,
      content: (f.content && f.content.trim().length > 0) ? f.content : f.name,
      fileType: f.fileType
    }));

    if (pendingAction) {
      console.log("Resources: Direct navigation to pendingAction:", pendingAction, selectedFilesList);
      startPensumAction(selectedFilesList, pendingAction);
      if (onNavigateToTools) {
        onNavigateToTools(pendingAction);
      } else if (onNavigateToWorkshop) {
        onNavigateToWorkshop('verktoy');
      }
      window.dispatchEvent(new CustomEvent('blu-switch-tab', { detail: { tab: 'verktoy', subTab: pendingAction } }));
    } else {
      setIsPensumHubMenuOpen(true);
    }
  };

  // Files & folders state
  const [items, setItems] = useState<ArchiveFile[]>(() => {
    try {
      const user = auth.currentUser;
      const key = user ? `blu_context_files_cache_${user.uid}` : 'blu_context_files_guest';
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Feil ved lesing av filarkiv-cache:", e);
    }
    return INITIAL_SAMPLE_FILES;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = auth.currentUser;

  // Real-time Firestore sync for context_files
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      try {
        const cached = localStorage.getItem('blu_context_files_guest');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        }
      } catch (e) {
        console.warn("Feil ved lasting av gjestefiler:", e);
      }
      return;
    }

    setSyncState('saving');
    const q = query(
      collection(db, 'context_files'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const fetched = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Uten navn',
            content: data.content || '',
            folderId: data.folderId || null,
            type: (data.type === 'folder' ? 'folder' : 'file') as 'file' | 'folder',
            fileType: data.fileType || (data.name?.endsWith('.pdf') ? 'PDF' : data.name?.endsWith('.docx') ? 'Word' : 'Fil'),
            size: data.size || 0,
            isPinned: data.isPinned || false,
            userId: data.userId,
            dataUrl: data.dataUrl,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt) : new Date().toISOString()
          } as ArchiveFile;
        });

        // Sorter: nyeste først
        fetched.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        setItems(fetched);
        
        try {
          localStorage.setItem(`blu_context_files_cache_${currentUser.uid}`, JSON.stringify(fetched));
        } catch (err) {
          console.warn("Kunne ikke lagre til lokal cache:", err);
        }
      } else {
        const cached = localStorage.getItem(`blu_context_files_cache_${currentUser.uid}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setItems(parsed);
            }
          } catch {}
        }
      }
      setSyncState('synced');
      setLastSyncTime(new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));
    }, (error) => {
      console.error("Feil ved synkronisering av filarkiv fra Firestore:", error);
      setSyncState('offline');
    });

    return () => unsubscribe();
  }, [user]);

  // Hjelper for å oppdatere lokal cache
  const updateLocalCache = (newItems: ArchiveFile[]) => {
    setItems(newItems);
    try {
      const currentUser = auth.currentUser;
      const key = currentUser ? `blu_context_files_cache_${currentUser.uid}` : 'blu_context_files_guest';
      localStorage.setItem(key, JSON.stringify(newItems));
    } catch (e) {
      console.warn("Feil ved lagring til lokal cache:", e);
    }
  };

  // Field notes state
  const [fieldNotes, setFieldNotes] = useState<FieldNote[]>([]);
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<string>('Alle');
  const [notesSearchQuery, setNotesSearchQuery] = useState('');
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  
  // Quick create in archive
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<NoteCategory>('Observasjon');

  // Modal for ny mappe
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Modal for gi nytt navn
  const [renamingItem, setRenamingItem] = useState<{ id: string; name: string; isNote?: boolean } | null>(null);
  const [renameInputVal, setRenameInputVal] = useState('');

  // Modal for flytting
  const [movingItem, setMovingItem] = useState<{ id: string; name: string; folderId?: string | null; isNote?: boolean } | null>(null);

  useEffect(() => {
    const unsub = subscribeFieldNotes((notes) => {
      setFieldNotes(notes);
    });
    return () => unsub();
  }, []);

  // Hent mapper og filer separat
  const folderItems = items.filter(it => it.type === 'folder');
  const fileItems = items.filter(it => it.type === 'file');

  // Konverter mapper til WorkspaceLayout-format (inkludert fast system-mappe for Feltnotater)
  const workspaceFolders: FolderType[] = [
    {
      id: 'folder_feltnotater',
      name: `Feltnotater & Kladdeblokk (${fieldNotes.length})`,
      isExpanded: true
    },
    ...folderItems.map(f => ({
      id: f.id,
      name: f.name,
      isExpanded: true
    }))
  ];

  // Konverter opplastede filer til WorkspaceLayout-format
  const fileHistoryItems: HistoryItem[] = fileItems.map(file => {
    const ext = file.name.split('.').pop()?.toUpperCase() || file.fileType || 'FIL';
    return {
      id: file.id,
      title: file.name,
      subtitle: `${ext} • ${file.size ? formatBytes(file.size) : 'Dokument'}`,
      isPinned: file.isPinned || false,
      folderId: file.folderId || undefined,
      icon: ext.includes('PDF') ? (
        <span className="text-red-400 font-bold text-[10px] bg-red-950/60 px-1 py-0.5 rounded">PDF</span>
      ) : ext.includes('DOC') || ext.includes('WORD') ? (
        <span className="text-blue-400 font-bold text-[10px] bg-blue-950/60 px-1 py-0.5 rounded">DOC</span>
      ) : (
        <FileText className="w-4 h-4 text-slate-400" />
      ),
      rawFile: file
    };
  });

  // Konverter feltnotater til WorkspaceLayout-format slik at de også ligger i "Mine dokumenter"
  const fieldNoteHistoryItems: HistoryItem[] = fieldNotes.map(note => {
    return {
      id: `note_${note.id}`,
      title: note.title,
      subtitle: `${note.category} • Feltnotat`,
      isPinned: note.isPinned || false,
      folderId: note.folderId || 'folder_feltnotater',
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      isNote: true,
      rawNote: note
    };
  });

  // Samlet liste over alle dokumenter (Filer + Feltnotater)
  const workspaceHistoryItems: HistoryItem[] = [...fileHistoryItems, ...fieldNoteHistoryItems];

  // Opprett ny mappe
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folderName = newFolderName.trim();
    const currentUser = auth.currentUser;
    const newFolderId = `folder_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    const newFolder: ArchiveFile = {
      id: newFolderId,
      name: folderName,
      content: '',
      type: 'folder',
      folderId: null,
      isPinned: false,
      userId: currentUser?.uid || 'guest',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateLocalCache([newFolder, ...items]);
    setNewFolderName('');
    setIsCreatingFolder(false);

    if (currentUser) {
      try {
        setSyncState('saving');
        await addDoc(collection(db, 'context_files'), {
          name: folderName,
          content: '',
          type: 'folder',
          folderId: null,
          isPinned: false,
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setSyncState('synced');
      } catch (err) {
        console.error("Feil ved lagring av mappe til Firestore:", err);
      }
    }
  };

  // Slett mappe
  const handleDeleteFolder = async (folderId: string) => {
    if (folderId === 'folder_feltnotater') {
      setArchiveNotice('Mappen for Feltnotater & Kladdeblokk er en fast samlemappe og kan ikke slettes.');
      setTimeout(() => setArchiveNotice(null), 3500);
      return;
    }

    const folderToDelete = folderItems.find(f => f.id === folderId);
    if (!folderToDelete) return;

    if (!window.confirm(`Er du sikker på at du vil slette mappen «${folderToDelete.name}»? Filer i mappen blir flyttet til roten.`)) {
      return;
    }

    // Flytt filer i mappen til roten og fjern mappen
    const updated = items
      .filter(it => it.id !== folderId)
      .map(it => it.folderId === folderId ? { ...it, folderId: null } : it);

    updateLocalCache(updated);

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        setSyncState('saving');
        if (!folderId.startsWith('sample-')) {
          await deleteDoc(doc(db, 'context_files', folderId));
        }
        const filesToUnlink = fileItems.filter(f => f.folderId === folderId && !f.id.startsWith('sample-'));
        for (const f of filesToUnlink) {
          await updateDoc(doc(db, 'context_files', f.id), {
            folderId: null,
            updatedAt: serverTimestamp()
          });
        }
        setSyncState('synced');
      } catch (err) {
        console.error("Feil ved sletting av mappe i Firestore:", err);
      }
    }
  };

  // Endre mappenavn
  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = items.map(it => it.id === folderId ? { ...it, name: newName.trim(), updatedAt: new Date().toISOString() } : it);
    updateLocalCache(updated);
    const currentUser = auth.currentUser;
    if (currentUser && !folderId.startsWith('sample-')) {
      try {
        await updateDoc(doc(db, 'context_files', folderId), {
          name: newName.trim(),
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Feil ved omdøping av mappe i Firestore:", err);
      }
    }
  };

  // Endre farge på mappe
  const handleUpdateFolderColor = async (folderId: string, color: string) => {
    const updated = items.map(it => it.id === folderId ? { ...it, color, updatedAt: new Date().toISOString() } : it);
    updateLocalCache(updated);
    const currentUser = auth.currentUser;
    if (currentUser && !folderId.startsWith('sample-')) {
      try {
        await updateDoc(doc(db, 'context_files', folderId), {
          color,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Feil ved oppdatering av mappefarge i Firestore:", err);
      }
    }
  };

  // Arkiver element
  const handleArchiveItem = async (itemId: string, isArchived: boolean) => {
    if (itemId.startsWith('note_')) {
      const realNoteId = itemId.replace('note_', '');
      const note = fieldNotes.find(n => n.id === realNoteId);
      if (note) {
        await saveFieldNote({ ...note, isArchived, updatedAt: new Date().toISOString() });
      }
    } else {
      const updated = items.map(it => it.id === itemId ? { ...it, isArchived, updatedAt: new Date().toISOString() } : it);
      updateLocalCache(updated);
      const currentUser = auth.currentUser;
      if (currentUser && !itemId.startsWith('sample-')) {
        try {
          await updateDoc(doc(db, 'context_files', itemId), { isArchived, updatedAt: serverTimestamp() });
        } catch (err) {
          console.error("Feil ved arkivering i Firestore:", err);
        }
      }
    }
  };

  // Arkiver mappe
  const handleArchiveFolder = async (folderId: string, isArchived: boolean) => {
    const updated = items.map(it => it.id === folderId ? { ...it, isArchived, updatedAt: new Date().toISOString() } : it);
    updateLocalCache(updated);
    const currentUser = auth.currentUser;
    if (currentUser && !folderId.startsWith('sample-')) {
      try {
        await updateDoc(doc(db, 'context_files', folderId), { isArchived, updatedAt: serverTimestamp() });
      } catch (err) {
        console.error("Feil ved arkivering av mappe i Firestore:", err);
      }
    }
  };

  // Flytt fil eller feltnotat til mappe
  const handleMoveItem = async (itemId: string, folderId: string | undefined) => {
    if (itemId.startsWith('note_')) {
      const realNoteId = itemId.replace('note_', '');
      const note = fieldNotes.find(n => n.id === realNoteId);
      if (note) {
        await saveFieldNote({
          ...note,
          folderId: folderId || null,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      const updated = items.map(it => {
        if (it.id === itemId) {
          return { ...it, folderId: folderId || null, updatedAt: new Date().toISOString() };
        }
        return it;
      });

      updateLocalCache(updated);

      const currentUser = auth.currentUser;
      if (currentUser && !itemId.startsWith('sample-')) {
        try {
          setSyncState('saving');
          await updateDoc(doc(db, 'context_files', itemId), {
            folderId: folderId || null,
            updatedAt: serverTimestamp()
          });
          setSyncState('synced');
        } catch (err) {
          console.error("Feil ved flytting av fil i Firestore:", err);
        }
      }
    }
    setMovingItem(null);
  };

  // Fest / løsne fil eller feltnotat til toppen
  const handlePinItem = async (itemId: string, isPinned: boolean) => {
    if (itemId.startsWith('note_')) {
      const realNoteId = itemId.replace('note_', '');
      const note = fieldNotes.find(n => n.id === realNoteId);
      if (note) {
        await saveFieldNote({
          ...note,
          isPinned,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      const updated = items.map(it => {
        if (it.id === itemId) {
          return { ...it, isPinned, updatedAt: new Date().toISOString() };
        }
        return it;
      });

      updateLocalCache(updated);

      const currentUser = auth.currentUser;
      if (currentUser && !itemId.startsWith('sample-')) {
        try {
          setSyncState('saving');
          await updateDoc(doc(db, 'context_files', itemId), {
            isPinned,
            updatedAt: serverTimestamp()
          });
          setSyncState('synced');
        } catch (err) {
          console.error("Feil ved pinning av fil i Firestore:", err);
        }
      }
    }
  };

  // Gi nytt navn til fil eller feltnotat
  const handleRenameItem = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const cleanTitle = newTitle.trim();

    if (id.startsWith('note_')) {
      const realNoteId = id.replace('note_', '');
      const note = fieldNotes.find(n => n.id === realNoteId);
      if (note) {
        await saveFieldNote({
          ...note,
          title: cleanTitle,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      const updated = items.map(it => {
        if (it.id === id) {
          return { ...it, name: cleanTitle, updatedAt: new Date().toISOString() };
        }
        return it;
      });

      updateLocalCache(updated);

      const currentUser = auth.currentUser;
      if (currentUser && !id.startsWith('sample-')) {
        try {
          setSyncState('saving');
          await updateDoc(doc(db, 'context_files', id), {
            name: cleanTitle,
            updatedAt: serverTimestamp()
          });
          setSyncState('synced');
        } catch (err) {
          console.error("Feil ved endring av navn i Firestore:", err);
        }
      }
    }
    setRenamingItem(null);
    setRenameInputVal('');
  };

  // Slett fil eller feltnotat
  const handleDeleteItem = async (id: string) => {
    if (id.startsWith('note_')) {
      const realNoteId = id.replace('note_', '');
      if (window.confirm('Vil du slette dette feltnotatet?')) {
        await deleteFieldNote(realNoteId);
        if (selectedNoteId === realNoteId) setSelectedNoteId(null);
      }
    } else {
      const updated = items.filter(it => it.id !== id);
      updateLocalCache(updated);

      if (selectedFileId === id) {
        setSelectedFileId(null);
      }

      const currentUser = auth.currentUser;
      if (currentUser && !id.startsWith('sample-')) {
        try {
          setSyncState('saving');
          await deleteDoc(doc(db, 'context_files', id));
          setSyncState('synced');
        } catch (err) {
          console.error("Feil ved sletting av fil i Firestore:", err);
        }
      }
    }
  };

  // Håndter filopplasting
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setSyncState('saving');
    const currentUser = auth.currentUser;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let content = '';
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let fileType = 'Fil';

        if (ext === 'pdf' || file.type === 'application/pdf') {
          fileType = 'PDF';
          content = await extractTextFromPdf(file);
        } else if (ext === 'docx' || ext === 'doc') {
          fileType = 'Word';
          content = await extractTextFromDocx(file);
        } else {
          fileType = ext ? ext.toUpperCase() : 'Tekst';
          content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve((event.target?.result as string) || '');
            reader.onerror = () => resolve('');
            reader.readAsText(file);
          });
        }

        const newFileId = `file_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 6)}`;
        
        const newArchiveFile: ArchiveFile = {
          id: newFileId,
          name: file.name,
          content: content || `Fil: ${file.name}\nStørrelse: ${formatBytes(file.size)}`,
          folderId: (selectedFolderFilter && selectedFolderFilter !== 'folder_feltnotater') ? selectedFolderFilter : null,
          type: 'file',
          fileType,
          size: file.size,
          isPinned: false,
          userId: currentUser?.uid || 'guest',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Oppdater lokalt
        setItems(prev => [newArchiveFile, ...prev]);

        // Lagre i Firestore
        if (currentUser) {
          await addDoc(collection(db, 'context_files'), {
            name: file.name,
            content: (content || '').slice(0, 500000),
            folderId: (selectedFolderFilter && selectedFolderFilter !== 'folder_feltnotater') ? selectedFolderFilter : null,
            type: 'file',
            fileType,
            size: file.size,
            isPinned: false,
            userId: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }

        setSelectedFileId(newFileId);
        setSelectedNoteId(null);
        setActiveMenu('files');
      } catch (uploadErr) {
        console.error(`Feil ved opplasting av fil ${file.name}:`, uploadErr);
        setArchiveNotice(`Kunne ikke lese eller lagre filen «${file.name}». Prøv igjen.`);
        setTimeout(() => setArchiveNotice(null), 4000);
      }
    }

    setIsUploading(false);
    setSyncState('synced');
    setLastSyncTime(new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }));
    e.target.value = '';
  };

  const handleTriggerUpload = () => {
    setActiveMenu('files');
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  const handleOpenLink = (linkName: string) => {
    const url = RESOURCE_LINKS[linkName];
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyNote = (note: FieldNote) => {
    const text = `${note.title} [${note.category}]\n\n${note.content}`;
    navigator.clipboard.writeText(text);
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  const handleDownloadNote = (note: FieldNote) => {
    const text = `# ${note.title}\nKategori: ${note.category}\nDato: ${note.createdAt}\n\n${note.content}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadFile = (file: ArchiveFile) => {
    const blob = new Blob([file.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name.endsWith('.txt') || file.name.endsWith('.pdf') || file.name.endsWith('.docx') 
      ? file.name 
      : `${file.name}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToWritingWorkshop = (title: string, content: string, source: string) => {
    try {
      localStorage.setItem('blu_pending_workshop_import', JSON.stringify({
        title: title.replace(/\.[^/.]+$/, ""),
        content: content || '',
        template: 'Praksisfortelling/Praksisoppgave',
        taskPrompt: `Basert på «${title}» fra ${source}.`,
        targetWords: 1500
      }));
      window.location.href = '#skriving';
      window.dispatchEvent(new CustomEvent('blu-switch-tab', { detail: { tab: 'writing-workshop' } }));
    } catch (e) {
      console.error("Feil ved eksport til skriveverksted:", e);
    }
  };

  const handleSaveArchiveNote = async () => {
    if (!newTitle.trim() && !newContent.trim()) return;

    const noteToSave: FieldNote = {
      id: `fn-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: newTitle.trim() || 'Feltnotat ' + new Date().toLocaleDateString('no-NO'),
      content: newContent.trim(),
      category: newCategory,
      folderId: selectedFolderFilter || 'folder_feltnotater',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await saveFieldNote(noteToSave);
    setNewTitle('');
    setNewContent('');
    setNewCategory('Observasjon');
    setIsCreatingNote(false);
  };

  // Filtrerte filer for hovedvisningen
  const filteredFiles = fileItems.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (f.content && f.content.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFolder = selectedFolderFilter ? f.folderId === selectedFolderFilter : true;
    return matchesSearch && matchesFolder;
  });

  const filteredFieldNotes = fieldNotes.filter(n => {
    const matchesCategory = selectedNoteCategory === 'Alle' || n.category === selectedNoteCategory;
    const q = notesSearchQuery.toLowerCase().trim();
    const matchesQuery = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
    const matchesFolder = selectedFolderFilter ? (selectedFolderFilter === 'folder_feltnotater' || n.folderId === selectedFolderFilter) : true;
    return matchesCategory && matchesQuery && matchesFolder;
  });

  const activeSelectedFile = fileItems.find(f => f.id === selectedFileId);
  const activeSelectedNote = fieldNotes.find(n => n.id === selectedNoteId);

  const currentActiveItemId = selectedFileId || (selectedNoteId ? `note_${selectedNoteId}` : null);

  return (
    <WorkspaceLayout
      title="Filarkiv & Ressurser"
      subtitle="Mapper, dokumenter og faglige kilder"
      icon={<Archive className="w-6 h-6" />}
      actionButtonLabel="Last opp fil"
      onActionClick={handleTriggerUpload}
      folders={workspaceFolders}
      onAddFolder={() => setIsCreatingFolder(true)}
      onDeleteFolder={handleDeleteFolder}
      onRenameFolder={handleRenameFolder}
      onUpdateFolderColor={handleUpdateFolderColor}
      onArchiveFolder={handleArchiveFolder}
      onMoveToFolder={handleMoveItem}
      onPinItem={handlePinItem}
      onRenameItem={handleRenameItem}
      onArchiveItem={handleArchiveItem}
      onDeleteItem={handleDeleteItem}
      historyItems={workspaceHistoryItems}
      activeItemId={currentActiveItemId}
      historySectionTitle="Mine dokumenter"
      onItemClick={(id: string) => {
        if (id.startsWith('note_')) {
          const realNoteId = id.replace('note_', '');
          setSelectedNoteId(realNoteId);
          setSelectedFileId(null);
          setActiveMenu('field-notes-archive');
        } else {
          setSelectedFileId(id);
          setSelectedNoteId(null);
          setActiveMenu('files');
        }
      }}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        multiple 
        className="hidden" 
        id="resources-file-upload-input"
        aria-label="Last opp fil"
      />

      <div className="flex-1 flex flex-col h-full bg-slate-50/70 overflow-hidden">
        {/* TOPP-BAR: Faner og synkronisering */}
        <div className="px-4 sm:px-6 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
            <button 
              type="button"
              onClick={() => { setActiveMenu('files'); setSelectedNoteId(null); }} 
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeMenu === 'files' 
                  ? "bg-white text-primary shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Filarkiv ({fileItems.length})</span>
            </button>
            <button 
              type="button"
              onClick={() => { setActiveMenu('field-notes-archive'); setSelectedFileId(null); }} 
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeMenu === 'field-notes-archive' 
                  ? "bg-white text-amber-700 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Feltnotater ({fieldNotes.length})</span>
            </button>
            <button 
              type="button"
              onClick={() => { setActiveMenu('library'); setSelectedFileId(null); setSelectedNoteId(null); }} 
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeMenu === 'library' 
                  ? "bg-white text-primary shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Library className="w-3.5 h-3.5" />
              <span>Ressursbibliotek</span>
            </button>
            <button 
              type="button"
              onClick={() => { setActiveMenu('sources'); setSelectedFileId(null); setSelectedNoteId(null); }} 
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5",
                activeMenu === 'sources' 
                  ? "bg-white text-indigo-700 shadow-xs font-black" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kildebank (APA 7)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            {/* Synkroniseringsindikator */}
            <div 
              className="h-8 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/90 border border-slate-200/90 select-none shrink-0 shadow-2xs"
              title={`Lagret i skyen og lokal kopi OK (kl. ${lastSyncTime}).`}
            >
              {syncState === 'saving' || isUploading ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-800 whitespace-nowrap">
                    {isUploading ? 'Laster opp...' : 'Lagrer i skyen...'}
                  </span>
                </>
              ) : syncState === 'offline' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[11px] font-semibold text-amber-800 whitespace-nowrap">
                    Frakoblet (lokal OK)
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs ring-2 ring-emerald-500/20" />
                  <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                    Lagret i skyen {lastSyncTime ? `kl. ${lastSyncTime}` : ''}
                  </span>
                </>
              )}
            </div>

            {/* Hurtighandlinger for filarkivet */}
            {activeMenu === 'files' && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Ny mappe</span>
                </button>
                <button
                  type="button"
                  onClick={handleTriggerUpload}
                  className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Last opp</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* HOVEDINNHOLD */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex justify-center">
          <div className="max-w-5xl w-full">

            {/* VISNING 1: FILARKIV */}
            {activeMenu === 'files' && (
              <div className="space-y-6">

                {/* VISNING 1A: EN ENKELT FIL ER VALGT */}
                {activeSelectedFile ? (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-150">
                    {/* Filheader & Kontroller */}
                    <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-2xs">
                          {activeSelectedFile.fileType === 'PDF' ? (
                            <span className="font-black text-xs text-red-600">PDF</span>
                          ) : activeSelectedFile.fileType === 'Word' ? (
                            <span className="font-black text-xs text-blue-600">DOC</span>
                          ) : (
                            <FileText className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                              {activeSelectedFile.name}
                            </h2>
                            {activeSelectedFile.isPinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Pin className="w-3 h-3 fill-amber-500 text-amber-500" /> Festet
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>{activeSelectedFile.fileType || 'Dokument'}</span>
                            <span>•</span>
                            <span>{activeSelectedFile.size ? formatBytes(activeSelectedFile.size) : 'Dokument'}</span>
                            {activeSelectedFile.folderId && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                                  <Folder className="w-3 h-3" />
                                  {folderItems.find(f => f.id === activeSelectedFile.folderId)?.name || 'Mappe'}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Handlinger for valgt fil */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          onClick={() => handlePinItem(activeSelectedFile.id, !activeSelectedFile.isPinned)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                            activeSelectedFile.isPinned
                              ? "bg-amber-50 text-amber-800 border-amber-300"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          )}
                          title={activeSelectedFile.isPinned ? "Løsne fra toppen" : "Fest til toppen"}
                        >
                          {activeSelectedFile.isPinned ? <PinOff className="w-3.5 h-3.5 text-amber-600" /> : <Pin className="w-3.5 h-3.5 text-amber-500" />}
                          <span>{activeSelectedFile.isPinned ? 'Løsne' : 'Fest'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setRenamingItem({ id: activeSelectedFile.id, name: activeSelectedFile.name });
                            setRenameInputVal(activeSelectedFile.name);
                          }}
                          className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Gi nytt navn"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-sky-500" />
                          <span>Gi nytt navn</span>
                        </button>

                        <button
                          onClick={() => setMovingItem({ id: activeSelectedFile.id, name: activeSelectedFile.name, folderId: activeSelectedFile.folderId })}
                          className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Flytt til en annen mappe"
                        >
                          <Move className="w-3.5 h-3.5 text-slate-500" />
                          <span>Flytt</span>
                        </button>

                        <button
                          onClick={() => handleDownloadFile(activeSelectedFile)}
                          className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Last ned fil"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Last ned</span>
                        </button>

                        <button
                          onClick={() => handleDeleteItem(activeSelectedFile.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Slett fil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setSelectedFileId(null)}
                          className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:bg-slate-800"
                        >
                          <span>Lukk visning</span>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Hurtighandlinger for pedagogisk arbeid */}
                    <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-indigo-950 font-medium flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Vil du bruke teksten fra denne filen direkte i oppgaveskrivingen din?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendToWritingWorkshop(activeSelectedFile.name, activeSelectedFile.content, 'filarkivet')}
                          className="px-3.5 py-1.5 bg-primary text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs hover:bg-primary-hover transition-all cursor-pointer"
                        >
                          <span>Åpne i Skriveverksted</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(activeSelectedFile.content || '');
                            setCopiedText(true);
                            setTimeout(() => setCopiedText(false), 2000);
                          }}
                          className="px-3.5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          {copiedText ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">Kopiert!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kopier tekst</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Tekstinnhold */}
                    <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto">
                      <div className="prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                        {activeSelectedFile.content || 'Ingen tekstlig innhold kunne ekstraheres fra denne filen.'}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* OVERSIKT OVER FILER OG MAPPER */
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-800">Filarkiv & Dokumenter</h2>
                        <p className="text-slate-500 mt-1 text-sm">
                          Organiser dine pedagogiske planer, oppgaver og referansedokumenter i mapper.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => setIsCreatingFolder(true)}
                          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                        >
                          <FolderPlus className="w-4 h-4 text-primary" /> Opprett ny mappe
                        </button>
                        <button 
                          onClick={handleTriggerUpload}
                          className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md cursor-pointer active:scale-95"
                        >
                          <UploadCloud className="w-4 h-4" /> Last opp filer
                        </button>
                      </div>
                    </div>

                    {/* Feltnotater & Kladdeblokk integrasjonskort */}
                    <div className="bg-gradient-to-r from-amber-50 via-emerald-50/40 to-amber-50/70 border border-amber-200/80 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm sm:text-base font-black text-slate-900">
                              Feltnotater & Kladdeblokk
                            </h3>
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {fieldNotes.length} notater
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                            Alle observasjoner og notater fra mobil og felt er tilgjengelige i «Mine dokumenter» til venstre og i notatarkivet.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => { setActiveMenu('field-notes-archive'); setSelectedNoteId(null); }}
                          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Åpne notatarkiv</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        {onNavigateToFieldNotes && (
                          <button
                            onClick={onNavigateToFieldNotes}
                            className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            title="Gå til Kladdeblokk-verktøyet"
                          >
                            Kladdeblokk
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mappelinje & Filter */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5" /> Dine Mapper ({workspaceFolders.length})
                        </h3>
                        {selectedFolderFilter && (
                          <button
                            onClick={() => setSelectedFolderFilter(null)}
                            className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Vis alle filer
                          </button>
                        )}
                      </div>

                      {/* Mappe-kort grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <button
                          onClick={() => setSelectedFolderFilter(null)}
                          className={cn(
                            "p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group",
                            selectedFolderFilter === null
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Folder className={cn("w-4 h-4 shrink-0", selectedFolderFilter === null ? "text-primary-light" : "text-slate-400")} />
                            <span className="font-bold text-xs sm:text-sm truncate">Alle filer (Rot)</span>
                          </div>
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", selectedFolderFilter === null ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500")}>
                            {fileItems.length}
                          </span>
                        </button>

                        {/* Feltnotater mappe-kort */}
                        <button
                          onClick={() => {
                            setSelectedFolderFilter(selectedFolderFilter === 'folder_feltnotater' ? null : 'folder_feltnotater');
                            setActiveMenu('field-notes-archive');
                          }}
                          className={cn(
                            "p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group",
                            selectedFolderFilter === 'folder_feltnotater'
                              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                              : "bg-amber-50/60 border-amber-200/80 text-amber-950 hover:bg-amber-100/60"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <BookOpen className={cn("w-4 h-4 shrink-0", selectedFolderFilter === 'folder_feltnotater' ? "text-white" : "text-amber-600")} />
                            <span className="font-bold text-xs sm:text-sm truncate">Feltnotater & Kladdeblokk</span>
                          </div>
                          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", selectedFolderFilter === 'folder_feltnotater' ? "bg-amber-700 text-amber-100" : "bg-amber-100 text-amber-800")}>
                            {fieldNotes.length}
                          </span>
                        </button>

                        {folderItems.map(folder => {
                          const countInFolder = fileItems.filter(f => f.folderId === folder.id).length + fieldNotes.filter(n => n.folderId === folder.id).length;
                          const isSelected = selectedFolderFilter === folder.id;
                          return (
                            <div
                              key={folder.id}
                              onClick={() => setSelectedFolderFilter(isSelected ? null : folder.id)}
                              className={cn(
                                "p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group relative",
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/20"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <Folder className={cn("w-4 h-4 shrink-0", isSelected ? "text-white" : "text-indigo-500")} />
                                <span className="font-bold text-xs sm:text-sm truncate">{folder.name}</span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-100 text-slate-500")}>
                                  {countInFolder}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFolder(folder.id);
                                  }}
                                  className={cn("p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity", isSelected ? "hover:bg-indigo-700 text-indigo-200 hover:text-white" : "hover:bg-red-50 text-slate-400 hover:text-red-600")}
                                  title={`Slett mappen «${folder.name}»`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Søk */}
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2">
                      <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Søk i filarkivet og dokumenttekst..." 
                        className="flex-1 p-2 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="p-1.5 text-slate-400 hover:text-slate-600 mr-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dropzone */}
                    <div 
                      onClick={handleTriggerUpload}
                      className="border-2 border-dashed border-slate-300 hover:border-primary bg-white hover:bg-slate-50/80 rounded-3xl p-6 sm:p-8 text-center transition-all cursor-pointer group flex flex-col items-center justify-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-primary flex items-center justify-center transition-colors">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">
                          Klikk her for å laste opp dokumenter {selectedFolderFilter && selectedFolderFilter !== 'folder_feltnotater' ? `til «${folderItems.find(f => f.id === selectedFolderFilter)?.name}»` : ''}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Støtter PDF, Word (.docx) og tekstfiler. Teksten indekseres automatisk og lagres trygt i skyen.
                        </p>
                      </div>
                    </div>

                    {/* Filliste */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-xs uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            Dokumenter ({filteredFiles.length})
                          </h3>
                          {filteredFiles.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const filteredIds = filteredFiles.map(f => f.id);
                                const allSel = filteredIds.every(id => selectedFiles.includes(id));
                                if (allSel) {
                                  setSelectedFiles(prev => prev.filter(id => !filteredIds.includes(id)));
                                } else {
                                  setSelectedFiles(prev => Array.from(new Set([...prev, ...filteredIds])));
                                }
                              }}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>
                                {filteredFiles.every(f => selectedFiles.includes(f.id)) ? 'Fjern alle valgte' : `Velg alle (${filteredFiles.length})`}
                              </span>
                            </button>
                          )}
                        </div>

                        {selectedFolderFilter && (
                          <span className="text-xs font-bold text-primary bg-primary-light/30 px-2.5 py-0.5 rounded-full">
                            Mappe: {selectedFolderFilter === 'folder_feltnotater' ? 'Feltnotater & Kladdeblokk' : folderItems.find(f => f.id === selectedFolderFilter)?.name}
                          </span>
                        )}
                      </div>

                      <div className="divide-y divide-slate-100">
                        {filteredFiles.length === 0 ? (
                          <div className="p-10 text-center text-sm text-slate-400 font-medium">
                            {searchQuery 
                              ? `Ingen filer funnet for «${searchQuery}»` 
                              : selectedFolderFilter 
                                ? 'Ingen filer i denne mappen ennå. Last opp en fil over!'
                                : 'Ingen filer i arkivet ennå. Last opp ditt første dokument over!'}
                          </div>
                        ) : (
                          filteredFiles.map((file) => {
                            const folder = folderItems.find(f => f.id === file.folderId);
                            const isPinned = file.isPinned;
                            const isSelected = selectedFiles.includes(file.id);

                            return (
                              <div 
                                key={file.id} 
                                onClick={() => toggleFileSelection(file.id)}
                                className={cn(
                                  "flex items-center justify-between p-4 transition-colors group cursor-pointer",
                                  isSelected
                                    ? "bg-blue-50 hover:bg-blue-100/80"
                                    : "hover:bg-slate-50/80"
                                )}
                              >
                                <div className="flex items-center gap-3.5 min-w-0 pr-3 flex-1">
                                  {/* Avkrysningsboks (checkbox) helt til venstre */}
                                  <button
                                    type="button"
                                    onClick={(e) => toggleFileSelection(file.id, e)}
                                    className={cn(
                                      "w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0",
                                      isSelected
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                                        : "bg-white border-slate-300 hover:border-indigo-400 text-transparent"
                                    )}
                                    title={isSelected ? "Fjern avhuking" : "Velg dokument"}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>

                                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 group-hover:bg-indigo-50 group-hover:text-primary transition-colors shrink-0">
                                    {file.fileType === 'PDF' ? (
                                      <span className="font-black text-[10px] text-red-600 block w-4 text-center">PDF</span>
                                    ) : file.fileType === 'Word' ? (
                                      <span className="font-black text-[10px] text-blue-600 block w-4 text-center">DOC</span>
                                    ) : (
                                      <FileText className="w-5 h-5" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      {isPinned && <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-500 shrink-0" />}
                                      <p className={cn(
                                        "font-bold text-sm truncate transition-colors",
                                        isSelected ? "text-indigo-950 font-black" : "text-slate-800 group-hover:text-primary"
                                      )}>
                                        {file.name}
                                      </p>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                      <span>{file.fileType || 'Dokument'}</span>
                                      <span>•</span>
                                      <span>{file.size ? formatBytes(file.size) : 'Dokument'}</span>
                                      {folder && (
                                        <>
                                          <span>•</span>
                                          <span className="text-primary font-semibold flex items-center gap-1">
                                            <Folder className="w-3 h-3" /> {folder.name}
                                          </span>
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setSelectedFileId(file.id)}
                                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer mr-1"
                                    title="Åpne lesevisning for filen"
                                  >
                                    Vis
                                  </button>

                                  <button 
                                    onClick={() => handlePinItem(file.id, !file.isPinned)}
                                    className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title={file.isPinned ? "Løsne fra toppen" : "Fest til toppen"}
                                  >
                                    {file.isPinned ? <Pin className="w-4 h-4 fill-amber-400 text-amber-500" /> : <Pin className="w-4 h-4" />}
                                  </button>

                                  <button 
                                    onClick={() => {
                                      setRenamingItem({ id: file.id, name: file.name });
                                      setRenameInputVal(file.name);
                                    }}
                                    className="p-2 text-slate-400 hover:text-sky-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Gi nytt navn"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>

                                  <button 
                                    onClick={() => setMovingItem({ id: file.id, name: file.name, folderId: file.folderId })}
                                    className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Flytt til mappe"
                                  >
                                    <Move className="w-4 h-4" />
                                  </button>

                                  <button 
                                    onClick={() => handleDownloadFile(file)}
                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Last ned"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>

                                  <button 
                                    onClick={() => handleDeleteItem(file.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                    title="Slett fil"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* FLYTENDE HANDLINGSLINJE (ACTION BAR) for valgte filer */}
                    <AnimatePresence>
                      {selectedFiles.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 50, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 50, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] sm:w-auto bg-slate-900 text-white p-3.5 sm:p-4 rounded-3xl shadow-2xl border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3.5 backdrop-blur-md"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                              {selectedFiles.length}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold leading-tight">
                                {selectedFiles.length} {selectedFiles.length === 1 ? 'kilde valgt' : 'kilder valgt'}
                              </p>
                              <p className="text-[10px] text-slate-400 leading-tight">
                                Filarkiv-utvalg klart til bruk
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                              type="button"
                              onClick={handleBrukKilderClick}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Bruk kilder</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedFiles([])}
                              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                              title="Nullstill utvalg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* PENSUM-HUB ACTION MENU MODAL */}
                    <PensumHubActionMenu
                      isOpen={isPensumHubMenuOpen}
                      onClose={() => setIsPensumHubMenuOpen(false)}
                      selectedCount={selectedFiles.length}
                      selectedTitles={items.filter(f => selectedFiles.includes(f.id)).map(f => f.name)}
                      selectedFilesList={items.filter(f => selectedFiles.includes(f.id)).map(f => ({
                        id: f.id,
                        title: f.name,
                        content: (f.content && f.content.trim().length > 0) ? f.content : f.name,
                        fileType: f.fileType
                      }))}
                      onSelectAction={(actionType) => {
                        console.log("Valgt handling fra Filarkivet:", actionType);
                        if (onNavigateToTools) {
                          onNavigateToTools(actionType);
                        } else if (onNavigateToWorkshop) {
                          onNavigateToWorkshop('verktoy');
                        }
                        window.dispatchEvent(new CustomEvent('blu-switch-tab', { detail: { tab: 'verktoy', subTab: actionType } }));
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                      }}
                      onNavigateToTools={(actionType) => {
                        const target = actionType || 'flashcards';
                        if (onNavigateToTools) {
                          onNavigateToTools(target);
                        } else if (onNavigateToWorkshop) {
                          onNavigateToWorkshop('verktoy');
                        }
                        window.dispatchEvent(new CustomEvent('blu-switch-tab', { detail: { tab: 'verktoy', subTab: target } }));
                        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                      }}
                    />
                  </>
                )}
              </div>
            )}

            {/* VISNING 2: RESSURSBIBLIOTEK */}
            {activeMenu === 'library' && (
              <div className="space-y-8 pb-12">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">Ressursbibliotek</h2>
                  <p className="text-slate-500 mt-1">Hurtiglenker til viktige verktøy, lovverk og institusjonens sider.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-500" /> Din Høgskole ({collegeName})
                    </h3>
                    <div className="space-y-2">
                      {['Canvas (Læringsplattform)', 'Wiseflow (Eksamen)', 'Studentweb', 'Pensumoversikt'].map(link => (
                        <button 
                          key={link} 
                          onClick={() => handleOpenLink(link)}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group cursor-pointer text-left"
                        >
                          <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">{link}</span>
                          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-500" /> Styring & Etikk
                    </h3>
                    <div className="space-y-2">
                      {['Rammeplan for barnehagen', 'Barnehageloven', 'SIKT (Personvern)', 'NESH-Retningslinjer'].map(link => (
                        <button 
                          key={link} 
                          onClick={() => handleOpenLink(link)}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group cursor-pointer text-left"
                        >
                          <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600 transition-colors">{link}</span>
                          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-emerald-600" /> Personvern & Sikkerhet
                    </h3>
                    <p className="text-sm text-emerald-800 leading-relaxed mb-4">
                      Tjenesten lagrer og behandler teksten din trygt i en isolert og kryptert sky. Dine dokumenter brukes aldri til å trene andres modeller.
                    </p>
                    <ul className="text-xs text-emerald-700 space-y-2">
                      <li>• <strong>Sikker skylagring:</strong> Kryptert og isolert per student.</li>
                      <li>• <strong>Ingen KI-trening:</strong> Dine oppgaver og praksisnotater forblir dine.</li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                    <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" /> KI-Vettregler
                    </h3>
                    <p className="text-sm text-amber-800 leading-relaxed mb-4">
                      Bruk KI som en sparringspartner, ikke som en fasit. Du er alltid faglig ansvarlig for innholdet du leverer.
                    </p>
                    <ul className="text-xs text-amber-700 space-y-2">
                      <li>• <strong>Vær åpen:</strong> Oppgi alltid i oppgaven om KI er brukt til veiledning.</li>
                      <li>• <strong>Kritisk blikk:</strong> Sjekk alltid fakta og kilder mot pensum og Rammeplanen.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* VISNING 3: FELTNOTATER & KLADDEBLOKK ARKIV */}
            {activeMenu === 'field-notes-archive' && (
              <div className="space-y-6 pb-12">
                {/* HVIS ET ENKELT NOTAT ER VALGT */}
                {activeSelectedNote ? (
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-150">
                    <div className="p-5 sm:p-6 border-b border-slate-100 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border",
                              CATEGORY_COLORS[activeSelectedNote.category]?.bg || 'bg-slate-100',
                              CATEGORY_COLORS[activeSelectedNote.category]?.text || 'text-slate-700',
                              CATEGORY_COLORS[activeSelectedNote.category]?.border || 'border-slate-200'
                            )}>
                              {activeSelectedNote.category}
                            </span>
                            <h2 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                              {activeSelectedNote.title}
                            </h2>
                            {activeSelectedNote.isPinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Pin className="w-3 h-3 fill-amber-500 text-amber-500" /> Festet
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Opprettet: {new Date(activeSelectedNote.createdAt).toLocaleDateString('no-NO')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          onClick={() => handlePinItem(`note_${activeSelectedNote.id}`, !activeSelectedNote.isPinned)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                            activeSelectedNote.isPinned
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          {activeSelectedNote.isPinned ? <PinOff className="w-3.5 h-3.5 text-amber-700" /> : <Pin className="w-3.5 h-3.5 text-amber-600" />}
                          <span>{activeSelectedNote.isPinned ? 'Løsne' : 'Fest'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setRenamingItem({ id: `note_${activeSelectedNote.id}`, name: activeSelectedNote.title, isNote: true });
                            setRenameInputVal(activeSelectedNote.title);
                          }}
                          className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-sky-500" />
                          <span>Gi nytt navn</span>
                        </button>

                        <button
                          onClick={() => setMovingItem({ id: `note_${activeSelectedNote.id}`, name: activeSelectedNote.title, folderId: activeSelectedNote.folderId, isNote: true })}
                          className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Move className="w-3.5 h-3.5 text-slate-500" />
                          <span>Flytt</span>
                        </button>

                        <button
                          onClick={() => handleCopyNote(activeSelectedNote)}
                          className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-600" />
                          <span>Kopier</span>
                        </button>

                        <button
                          onClick={() => handleDownloadNote(activeSelectedNote)}
                          className="px-3 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Last ned</span>
                        </button>

                        <button
                          onClick={() => handleDeleteItem(`note_${activeSelectedNote.id}`)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setSelectedNoteId(null)}
                          className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:bg-slate-800"
                        >
                          <span>Lukk</span>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-3 bg-amber-50/70 border-b border-amber-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-amber-950 font-medium flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Vil du utvikle dette feltnotatet til et didaktisk opplegg eller skriveoppgave?
                      </span>
                      <button
                        onClick={() => handleSendToWritingWorkshop(activeSelectedNote.title, activeSelectedNote.content, 'Feltnotater')}
                        className="px-3.5 py-1.5 bg-amber-600 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs hover:bg-amber-700 transition-all cursor-pointer"
                      >
                        <span>Åpne i Skriveverksted</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto">
                      <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                        {activeSelectedNote.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-[11px] font-bold">
                            <BookOpen className="w-3.5 h-3.5" /> Felles notatarkiv
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            Synkronisert på mobil & desktop
                          </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mt-1">Feltnotater & Kladdeblokk</h2>
                        <p className="text-slate-500 text-sm mt-0.5">
                          Alle notater finnes også i sidemenyen «Mine dokumenter».
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setIsCreatingNote(!isCreatingNote)}
                          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Nytt notat her</span>
                        </button>

                        {onNavigateToFieldNotes && (
                          <button
                            onClick={onNavigateToFieldNotes}
                            className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>Åpne Kladdeblokk</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Hurtigskjema for nytt notat */}
                    {isCreatingNote && (
                      <div className="bg-white border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-md space-y-4 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-amber-600" /> Skriv nytt feltnotat
                          </h3>
                          <button
                            onClick={() => setIsCreatingNote(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Tittel / Situasjon</label>
                          <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="F.eks: Samling i skogkanten..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Kategori</label>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {CATEGORIES.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setNewCategory(cat)}
                                className={cn(
                                  "px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                  newCategory === cat
                                    ? `${CATEGORY_COLORS[cat].bg} ${CATEGORY_COLORS[cat].text} ${CATEGORY_COLORS[cat].border} shadow-xs`
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                )}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">Notatinnhold</label>
                          <textarea
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                            placeholder="Skriv inn observasjonen eller idéen her..."
                            rows={4}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => setIsCreatingNote(false)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            Avbryt
                          </button>
                          <button
                            onClick={handleSaveArchiveNote}
                            disabled={!newTitle.trim() && !newContent.trim()}
                            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            Lagre i arkiv
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Søk og kategorifilter for notater */}
                    <div className="space-y-3">
                      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2">
                        <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
                        <input 
                          type="text" 
                          value={notesSearchQuery}
                          onChange={(e) => setNotesSearchQuery(e.target.value)}
                          placeholder="Søk i alle feltnotater..." 
                          className="flex-1 p-2 bg-transparent outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        <button
                          onClick={() => setSelectedNoteCategory('Alle')}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer",
                            selectedNoteCategory === 'Alle'
                              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          Alle ({fieldNotes.length})
                        </button>
                        {CATEGORIES.map(cat => {
                          const count = fieldNotes.filter(n => n.category === cat).length;
                          return (
                            <button
                              key={`archive-cat-${cat}`}
                              onClick={() => setSelectedNoteCategory(cat)}
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer",
                                selectedNoteCategory === cat
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

                    {/* Notatliste */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredFieldNotes.length === 0 ? (
                        <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-6">
                          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <h4 className="font-bold text-sm text-slate-700">Ingen notater funnet i arkivet</h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                            {notesSearchQuery || selectedNoteCategory !== 'Alle'
                              ? 'Prøv et annet søkeord eller endre kategorifilteret.'
                              : 'Opprett et notat via «Nytt notat her» over eller fra Kladdeblokk.'}
                          </p>
                        </div>
                      ) : (
                        filteredFieldNotes.map(note => {
                          const catStyle = CATEGORY_COLORS[note.category] || CATEGORY_COLORS['Annet'];
                          const dateFormatted = (() => {
                            try {
                              return new Date(note.createdAt).toLocaleDateString('no-NO', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              });
                            } catch {
                              return '';
                            }
                          })();

                          return (
                            <div
                              key={note.id}
                              onClick={() => setSelectedNoteId(note.id)}
                              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-lg text-[10px] font-bold border",
                                    catStyle.bg,
                                    catStyle.text,
                                    catStyle.border
                                  )}>
                                    {note.category}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-medium">
                                    {dateFormatted}
                                  </span>
                                </div>

                                <h3 className="font-bold text-base text-slate-900 mb-2 group-hover:text-amber-900 transition-colors">
                                  {note.title}
                                </h3>

                                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
                                  {note.content}
                                </p>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleCopyNote(note)}
                                    className={cn(
                                      "px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer",
                                      copiedNoteId === note.id
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    )}
                                  >
                                    {copiedNoteId === note.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Kopiert!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Kopier</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    onClick={() => handleDownloadNote(note)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Last ned som .txt"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleDeleteItem(`note_${note.id}`)}
                                  className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Slett fra arkiv"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* VISNING 4: KILDEBANK & APA 7 */}
            {activeMenu === 'sources' && (
              <div className="pb-12">
                <KildebankView 
                  standalone={false} 
                  onNavigateToWorkshop={onNavigateToWorkshop}
                />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* MODAL: OPPRETT NY MAPPE */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-primary flex items-center justify-center mx-auto">
              <FolderPlus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Opprett ny mappe</h3>
              <p className="text-xs text-slate-500 mt-1">Organiser dine opplastede dokumenter og planer.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mappenavn</label>
              <input 
                type="text" 
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setIsCreatingFolder(false);
                }}
                placeholder="F.eks: Didaktiske planer 2026..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Avbryt
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
              >
                Opprett
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GI NYTT NAVN */}
      {renamingItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
              <Edit2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Gi nytt navn</h3>
              <p className="text-xs text-slate-500 mt-1">Endre tittelen på {renamingItem.isNote ? 'feltnotatet' : 'dokumentet'}.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nytt navn</label>
              <input 
                type="text" 
                autoFocus
                value={renameInputVal}
                onChange={(e) => setRenameInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameItem(renamingItem.id, renameInputVal);
                  if (e.key === 'Escape') setRenamingItem(null);
                }}
                placeholder="Skriv inn navn..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setRenamingItem(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Avbryt
              </button>
              <button 
                onClick={() => handleRenameItem(renamingItem.id, renameInputVal)}
                disabled={!renameInputVal.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-all shadow-md shadow-sky-500/20 disabled:opacity-50 cursor-pointer"
              >
                Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FLYTT TIL MAPPE */}
      {movingItem && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Move className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Flytt til mappe</h3>
              <p className="text-xs text-slate-500 mt-1 truncate">Velg plassering for «{movingItem.name}»</p>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar py-1">
              <button
                onClick={() => handleMoveItem(movingItem.id, undefined)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer",
                  !movingItem.folderId 
                    ? "bg-slate-900 text-white border-slate-900" 
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Rotmappe (ingen mappe)
                </span>
                {!movingItem.folderId && <Check className="w-4 h-4 text-emerald-400" />}
              </button>

              <button
                onClick={() => handleMoveItem(movingItem.id, 'folder_feltnotater')}
                className={cn(
                  "w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer",
                  movingItem.folderId === 'folder_feltnotater'
                    ? "bg-amber-600 text-white border-amber-600" 
                    : "bg-amber-50/60 border-amber-200 text-amber-950 hover:bg-amber-100/60"
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <BookOpen className="w-4 h-4 text-amber-600" /> Feltnotater & Kladdeblokk
                </span>
                {movingItem.folderId === 'folder_feltnotater' && <Check className="w-4 h-4 text-white" />}
              </button>

              {folderItems.map(f => {
                const isSelected = movingItem.folderId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleMoveItem(movingItem.id, f.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all cursor-pointer",
                      isSelected 
                        ? "bg-indigo-600 text-white border-indigo-600" 
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Folder className="w-4 h-4 text-indigo-500" /> {f.name}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button 
                onClick={() => setMovingItem(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkspaceLayout>
  );
}

export default Resources;
