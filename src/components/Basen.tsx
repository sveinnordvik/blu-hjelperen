import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { WorkspaceLayout, HistoryItem } from './WorkspaceLayout';
import { 
  Users, 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Calendar, 
  Folder, 
  Settings, 
  UserPlus, 
  Plus, 
  Check, 
  Share2, 
  Clock, 
  Video, 
  Download, 
  Upload, 
  File as FileIcon, 
  X, 
  AlertOctagon, 
  LogOut, 
  Trash2, 
  CalendarDays, 
  Info, 
  CalendarRange, 
  CheckSquare, 
  Send, 
  FolderOpen,
  FileCheck,
  MapPin
} from 'lucide-react';
import { Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Document, Packer, Paragraph } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { CollabRoom } from './CollabRoom';
import { RichTextEditor } from './tools/RichTextEditor';
import { MobileBasen } from './mobile/MobileBasen';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

const categoryConfig: Record<string, { label: string; color: string; icon: any }> = {
  meeting: { label: 'Gruppemøte', color: 'bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200', icon: Users },
  assignment: { label: 'Arbeidskrav', color: 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200', icon: FileCheck },
  arbeidskrav: { label: 'Arbeidskrav', color: 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200', icon: FileCheck },
  lecture: { label: 'Forelesning/Undervisning', color: 'bg-purple-100 border-purple-200 text-purple-700 hover:bg-purple-200', icon: Video },
  deadline: { label: 'Eksamen', color: 'bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200', icon: AlertOctagon },
  social: { label: 'Skriveøkt/Sosialt', color: 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200', icon: CheckSquare }
};

export interface GroupFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  date: string;
  size?: string;
  content?: string;
  sharedBy?: string;
}

export interface Message {
  id: string;
  user: string;
  content: string;
  time: string;
  color: string;
  isMe: boolean;
  isDemo?: boolean;
  isBot?: boolean;
  userId?: string;
  timestamp?: string;
}

export interface Todo {
  id: string;
  task: string;
  assignee: string;
  dueDate?: string;
  completed: boolean;
}

export interface Member {
  name: string;
  role: string;
  color: string;
  isOnline: boolean;
  id?: string;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  time: string;
}

export interface GroupEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  type?: 'meeting' | 'guidance' | 'deadline' | 'lecture' | 'social' | 'assignment' | 'arbeidskrav' | string;
  category?: string;
  location?: string;
  description?: string;
}

export interface Group {
  id: string;
  groupId?: string;
  name: string;
  groupName?: string;
  isDemo?: boolean;
  isPinned?: boolean;
  messages: Message[];
  notes: string;
  sharedRagContext?: string;
  flashcards?: any[];
  userProgress?: Record<string, any>;
  todos: Todo[];
  files: GroupFile[];
  events?: any[];
  members: Member[];
  activity: Activity[];
  meetingLink: string;
  calendarLink?: string;
  unreadChat?: boolean;
}

export interface BasenProps {
  user?: any;
  pricingTier?: string;
  setActiveTab?: (tab: any) => void;
}

const DEFAULT_DEMO_GROUPS: Group[] = [
  {
    id: 'TEST-888',
    name: 'Bachelor våren 2027',
    isDemo: true,
    isPinned: true,
    notes: '# Felles notater for Bachelor 2027\n\nHer samler vi drøftinger, observasjoner fra praksis og kildehenvisninger.',
    sharedRagContext: 'Bacheloroppgave om barns medvirkning og demokratisk praksis i barnehagen.',
    members: [
      { id: 'mem-1', name: 'Svein Nordvik', role: 'Oppretter', color: 'bg-indigo-600', isOnline: true },
      { id: 'mem-2', name: 'Kristin Berg', role: 'Medlem', color: 'bg-emerald-600', isOnline: true },
      { id: 'mem-3', name: 'Lars Holm', role: 'Medlem', color: 'bg-amber-600', isOnline: false },
      { id: 'mem-4', name: 'Praksis-agenten (AI)', role: 'KI-veileder', color: 'bg-blue-600', isOnline: true }
    ],
    messages: [
      {
        id: 'msg-1',
        user: 'Kristin Berg',
        content: 'Hei alle sammen! Har dere sett på kapittel 3 i rammeplanen angående barns medvirkning?',
        time: '10:14',
        color: 'emerald',
        isMe: false
      },
      {
        id: 'msg-2',
        user: 'Svein Nordvik',
        content: 'Ja, jeg har lagt inn noen refleksjonsnotater i fellesnotatene.',
        time: '10:18',
        color: 'indigo',
        isMe: true
      }
    ],
    todos: [
      { id: 'todo-1', task: 'Formulere problemstilling for prosjektet', assignee: 'Svein', dueDate: '2026-09-20', completed: true },
      { id: 'todo-2', task: 'Finne 3 fagfellevurderte kilder i Oria', assignee: 'Kristin', dueDate: '2026-09-25', completed: false },
      { id: 'todo-3', task: 'Avtale tid for intervju med styrer', assignee: 'Lars', dueDate: '2026-09-30', completed: false }
    ],
    files: [
      { id: 'f-1', name: 'Prosjektbeskrivelse_utkast.docx', type: 'file', date: '01.09.2026', size: '24 KB' },
      { id: 'f-2', name: 'Notater_styrerintervju.docx', type: 'file', date: '04.09.2026', size: '18 KB' }
    ],
    events: [
      {
        id: 'ev-1',
        title: 'Kollokviemøte: Teori og metode',
        date: new Date().toISOString().split('T')[0],
        startTime: '12:00',
        endTime: '14:00',
        allDay: false,
        type: 'meeting',
        location: 'Teams',
        description: 'Gjennomgang av litteratur og metodedesign.'
      }
    ],
    activity: [
      { id: 'act-1', user: 'Svein Nordvik', action: 'opprettet gruppen og inviterte medlemmer', time: '1. sept' },
      { id: 'act-2', user: 'Kristin Berg', action: 'la til et nytt gjøremål', time: 'I går' }
    ],
    meetingLink: 'https://teams.microsoft.com'
  },
  {
    id: 'KOL-204',
    name: 'Praksisgruppe 3 - Natur og friluft',
    isDemo: true,
    isPinned: false,
    notes: 'Observasjonsfokus: Barns utforsking i ulendt terreng og risikolek.',
    sharedRagContext: 'Praksisperiode 2: Natur, helse og bevegelse.',
    members: [
      { id: 'mem-k1', name: 'Svein Nordvik', role: 'Oppretter', color: 'bg-indigo-600', isOnline: true },
      { id: 'mem-k2', name: 'Maria Sund', role: 'Medlem', color: 'bg-rose-600', isOnline: false },
      { id: 'mem-k3', name: 'Henrik Vang', role: 'Medlem', color: 'bg-teal-600', isOnline: true }
    ],
    messages: [
      {
        id: 'msg-k-1',
        user: 'Maria Sund',
        content: 'Husk å ta med observasjonsskjemaene til mandag!',
        time: '09:00',
        color: 'rose',
        isMe: false
      }
    ],
    todos: [
      { id: 't-1', task: 'Lage didaktisk plan for turdag', assignee: 'Maria', dueDate: '2026-09-18', completed: false }
    ],
    files: [],
    events: [],
    activity: [
      { id: 'act-k1', user: 'Maria Sund', action: 'ble med i gruppen', time: '2 dager siden' }
    ],
    meetingLink: ''
  }
];

export function Basen({ user, pricingTier = 'semester', setActiveTab: setParentActiveTab }: BasenProps) {
  const [groups, setGroups] = useState<Group[]>(() => {
    try {
      const cached = localStorage.getItem('blu_basen_groups_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DEMO_GROUPS;
  });

  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('blu_activeGroupId');
      if (saved) return saved;
    } catch {}
    return 'TEST-888';
  });

  // Modern tabs inside the group room
  const [activeTab, setActiveTab] = useState<'oversikt' | 'ki' | 'chat' | 'notater' | 'kalender' | 'filer'>('oversikt');

  // Modals & temporary states
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [groupNotice, setGroupNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setGroupNotice({ message, type });
    setTimeout(() => setGroupNotice(null), 4000);
  };

  // Chat input
  const [groupInput, setGroupInput] = useState('');

  // Todo input
  const [newTodoInput, setNewTodoInput] = useState('');
  const [isAddingTodo, setIsAddingTodo] = useState(false);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'uke' | 'dag'>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventAllDay, setNewEventAllDay] = useState(false);
  const [newEventStart, setNewEventStart] = useState('09:00');
  const [newEventEnd, setNewEventEnd] = useState('10:00');
  const [newEventCategory, setNewEventCategory] = useState('meeting');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventFiles, setNewEventFiles] = useState<string[]>([]);
  const [showFilePickerForEvent, setShowFilePickerForEvent] = useState(false);
  const [calendarLinkInput, setCalendarLinkInput] = useState('');
  const [isFetchingCalendar, setIsFetchingCalendar] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Persist active group ID
  useEffect(() => {
    try {
      if (activeGroupId) {
        localStorage.setItem('blu_activeGroupId', activeGroupId);
      }
    } catch {}
  }, [activeGroupId]);

  // Persist groups cache locally
  useEffect(() => {
    try {
      localStorage.setItem('blu_basen_groups_cache', JSON.stringify(groups));
    } catch {}
  }, [groups]);

  // Sync with Firestore collection 'groups'
  useEffect(() => {
    const p = 'groups';
    const unsubscribe = onSnapshot(
      collection(db, p),
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedGroups: Group[] = [];
          snapshot.forEach(d => {
            fetchedGroups.push({ ...d.data(), id: d.id } as Group);
          });
          setGroups(prev => {
            // Keep default demo groups if not already present or merge
            const merged = [...fetchedGroups];
            DEFAULT_DEMO_GROUPS.forEach(dg => {
              if (!merged.find(g => g.id === dg.id)) {
                merged.push(dg);
              }
            });
            return merged;
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, p);
      }
    );
    return () => unsubscribe();
  }, []);

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];

  // Helper to update active group in state and Firestore
  const updateActiveGroup = (updates: Partial<Group>) => {
    if (!activeGroup) return;
    const updated = { ...activeGroup, ...updates };
    setGroups(prev => prev.map(g => g.id === activeGroup.id ? updated : g));

    if (!activeGroup.isDemo) {
      const docRef = doc(db, 'groups', activeGroup.id);
      setDoc(docRef, updates, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, 'groups')
      );
    }
  };

  const handleNewGroup = () => {
    if (pricingTier === 'free') {
      showNotice('Gratisbrukere kan delta i eksisterende grupper via invitasjonslenke. Oppgrader for å opprette egne grupper.', 'error');
      if (setParentActiveTab) setParentActiveTab('pricing');
      return;
    } else if (pricingTier === 'monthly' && groups.filter(g => !g.isDemo).length >= 1) {
      showNotice('Månedspakken inkluderer 1 aktiv gruppe. Oppgrader til Semester-pakka for ubegrenset antall grupper.', 'error');
      if (setParentActiveTab) setParentActiveTab('pricing');
      return;
    }
    setNewGroupName('');
    setShowCreateGroup(true);
  };

  const handleCreateGroupConfirm = () => {
    if (!newGroupName.trim()) return;
    const newId = 'KOL-' + Math.floor(100 + Math.random() * 900);
    const myName = user?.displayName || 'Svein Nordvik';
    const newGroup: Group = {
      id: newId,
      name: newGroupName.trim(),
      messages: [],
      notes: `# ${newGroupName.trim()}\n\nVelkommen til kollokviegruppen! Skriv felles notater og praksiserfaringer her.`,
      sharedRagContext: '',
      todos: [],
      files: [],
      events: [],
      members: [{ id: 'mem-' + Date.now(), name: myName, role: 'Oppretter', color: 'bg-indigo-600', isOnline: true }],
      activity: [{ id: Date.now().toString(), user: myName, action: 'opprettet gruppen', time: 'Akkurat nå' }],
      meetingLink: ''
    };

    setGroups(prev => [newGroup, ...prev]);
    setActiveGroupId(newId);
    setActiveTab('oversikt');
    setShowCreateGroup(false);
    setNewGroupName('');

    // Write to Firestore
    setDoc(doc(db, 'groups', newId), newGroup).catch(err =>
      handleFirestoreError(err, OperationType.CREATE, 'groups')
    );
  };

  const handlePinItem = (id: string, isPinned: boolean) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, isPinned } : g));
  };

  const handleRenameItem = (id: string, newTitle: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, name: newTitle } : g));
    if (activeGroup && activeGroup.id === id && !activeGroup.isDemo) {
      const docRef = doc(db, 'groups', id);
      setDoc(docRef, { name: newTitle }, { merge: true }).catch(err =>
        handleFirestoreError(err, OperationType.WRITE, 'groups')
      );
    }
  };

  const handleDeleteItem = (id: string) => {
    const toDelete = groups.find(g => g.id === id);
    if (toDelete && !toDelete.isDemo) {
      deleteDoc(doc(db, 'groups', id)).catch(err =>
        handleFirestoreError(err, OperationType.DELETE, 'groups')
      );
    }
    const filtered = groups.filter(g => g.id !== id);
    setGroups(filtered);
    if (activeGroupId === id) {
      if (filtered.length > 0) {
        setActiveGroupId(filtered[0].id);
      } else {
        setActiveGroupId('');
      }
      setActiveTab('oversikt');
    }
  };

  const handleCopyInvite = () => {
    if (!activeGroup) return;
    const link = `https://blu-hjelperen.no/join/${activeGroup.id.toLowerCase()}`;
    navigator.clipboard.writeText(link);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  // Chat message sending
  const handleSendGroupMessage = () => {
    if (!groupInput.trim() || !activeGroup) return;
    const myName = user?.displayName?.split(' ')[0] || 'Meg';
    const newMsg: Message = {
      id: 'msg-' + Date.now(),
      user: myName,
      content: groupInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: 'indigo',
      isMe: true
    };
    updateActiveGroup({
      messages: [...activeGroup.messages, newMsg]
    });
    setGroupInput('');
  };

  // Todo functions
  const handleAddTodo = () => {
    if (!newTodoInput.trim() || !activeGroup) return;
    const myName = user?.displayName?.split(' ')[0] || 'Meg';
    const newTodo: Todo = {
      id: 'todo-' + Date.now(),
      task: newTodoInput.trim(),
      assignee: myName,
      completed: false
    };
    updateActiveGroup({
      todos: [...activeGroup.todos, newTodo],
      activity: [{ id: Date.now().toString(), user: myName, action: 'la til et nytt gjøremål', time: 'Akkurat nå' }, ...activeGroup.activity]
    });
    setNewTodoInput('');
    setIsAddingTodo(false);
  };

  const handleToggleTodo = (todoId: string) => {
    if (!activeGroup) return;
    const updated = activeGroup.todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
    updateActiveGroup({ todos: updated });
  };

  // File handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !activeGroup) return;
    const newFiles: GroupFile[] = Array.from(e.target.files).map(f => ({
      id: Date.now().toString() + f.name,
      name: f.name,
      type: 'file',
      date: new Date().toLocaleDateString('no-NO'),
      size: `${Math.round(f.size / 1024)} KB`
    }));
    const myName = user?.displayName?.split(' ')[0] || 'Meg';
    updateActiveGroup({
      files: [...newFiles, ...activeGroup.files],
      activity: [{ id: Date.now().toString(), user: myName, action: `lastet opp ${e.target.files.length} filer`, time: 'Akkurat nå' }, ...activeGroup.activity]
    });
  };

  const exportAllFiles = async () => {
    if (!activeGroup) return;
    const zip = new JSZip();
    const folder = zip.folder(activeGroup.name);
    activeGroup.files.forEach(f => {
      const contentStr = `Dette er filinnhold for: ${f.name} fra gruppen ${activeGroup.name}`;
      const docxDoc = new Document({
        sections: [{ properties: {}, children: [new Paragraph(contentStr)] }]
      });
      Packer.toBlob(docxDoc).then(blob => folder?.file(f.name, blob));
    });

    setTimeout(async () => {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${activeGroup.name}_arkiv.zip`);
    }, 800);
  };

  const exportSingleFile = async (fileName: string) => {
    const docxDoc = new Document({
      sections: [{ properties: {}, children: [new Paragraph(`Eksempel på innhold for ${fileName}`)] }]
    });
    const blob = await Packer.toBlob(docxDoc);
    saveAs(blob, fileName);
  };

  const handleExportNotes = async () => {
    if (!activeGroup) return;
    const docxDoc = new Document({
      sections: [{ 
        properties: {}, 
        children: [
          new Paragraph(`Fellesnotater for ${activeGroup.name}`),
          new Paragraph(activeGroup.notes || 'Ingen notater skrevet enda.')
        ] 
      }]
    });
    const blob = await Packer.toBlob(docxDoc);
    saveAs(blob, `${activeGroup.name}_fellesnotater.docx`);
  };

  // Calendar logic
  const handleFetchCalendar = async () => {
    if (!calendarLinkInput.trim() || !activeGroup) {
      setFetchError('Lim inn en gyldig iCal-lenke.');
      return;
    }
    setIsFetchingCalendar(true);
    setFetchError(null);
    const validUrl = calendarLinkInput.trim().replace('webcal://', 'https://');

    try {
      const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(validUrl));
      if (!response.ok) throw new Error('Kunne ikke hente kalenderen. Nettverksfeil.');
      const text = await response.text();
      if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Ugyldig kalenderformat mottatt.');

      const newEvents: any[] = [];
      const lines = text.split(/\r?\n/);
      let inEvent = false;
      let currentEvent: any = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('BEGIN:VEVENT')) {
          inEvent = true;
          currentEvent = {
            id: 'ical-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            title: 'Ny hendelse',
            date: '',
            startTime: '09:00',
            endTime: '10:00',
            allDay: false,
            type: 'lecture',
            location: '',
            description: ''
          };
        } else if (line.startsWith('END:VEVENT')) {
          inEvent = false;
          if (currentEvent && currentEvent.date) {
            newEvents.push(currentEvent);
          }
          currentEvent = null;
        } else if (inEvent && currentEvent) {
          if (line.startsWith('SUMMARY:')) currentEvent.title = line.substring(8).trim();
          else if (line.startsWith('LOCATION:')) currentEvent.location = line.substring(9).trim();
          else if (line.startsWith('DESCRIPTION:')) currentEvent.description = line.substring(12).trim();
          else if (line.startsWith('DTSTART')) {
            const valIndex = line.indexOf(':');
            if (valIndex !== -1) {
              const val = line.substring(valIndex + 1);
              if (val.length >= 8) {
                const y = val.substring(0, 4);
                const m = val.substring(4, 6);
                const d = val.substring(6, 8);
                currentEvent.date = `${y}-${m}-${d}`;
                if (val.includes('T') && val.length >= 15) {
                  const timePart = val.substring(val.indexOf('T') + 1);
                  currentEvent.startTime = `${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
                } else {
                  currentEvent.allDay = true;
                }
              }
            }
          }
        }
      }

      if (newEvents.length > 0) {
        updateActiveGroup({ events: [...(activeGroup.events || []), ...newEvents] });
        setCalendarLinkInput('');
        showNotice(`Importerte ${newEvents.length} hendelser med hell!`, 'success');
      } else {
        throw new Error('Fant ingen gyldige hendelser i kalenderen.');
      }
    } catch (err: any) {
      setFetchError('Kunne ikke hente: ' + (err.message || 'Sjekk lenken og prøv igjen.'));
    } finally {
      setIsFetchingCalendar(false);
    }
  };

  const getWeekNumber = (d: Date) => {
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];

  // Calendar Grid memo
  const calendarGrid = useMemo(() => {
    if (!activeGroup) return null;
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    const renderCell = (year: number, month: number, day: number, isCurrentMonth: boolean, key: string | number) => {
      const today = new Date();
      const isToday = isCurrentMonth && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = (activeGroup.events || []).filter(e => e.date === dateString);

      return (
        <div 
          key={key} 
          className={cn(
            'bg-white p-2 min-h-[90px] border-b border-r border-slate-100 flex flex-col justify-between transition-colors',
            !isCurrentMonth && 'bg-slate-50/60 opacity-50'
          )}
        >
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full',
              isToday ? 'bg-primary text-white font-black' : 'text-slate-600'
            )}>
              {day}
            </span>
          </div>
          <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-16 custom-scrollbar">
            {dayEvents.map((ev: any, idx: number) => {
              const conf = categoryConfig[ev.type || 'meeting'] || categoryConfig.meeting;
              return (
                <button
                  key={ev.id || `day-ev-${idx}`}
                  onClick={() => setSelectedEvent(ev)}
                  className={cn(
                    'w-full text-left text-[10px] font-bold py-1 px-1.5 rounded-lg truncate flex items-center gap-1 border transition-all cursor-pointer',
                    conf.color
                  )}
                  title={ev.title}
                >
                  <span className="truncate">{ev.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    const firstDay = new Date(y, m, 1).getDay();
    const startIndex = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();

    const rows = [];
    for (let row = 0; row < 6; row++) {
      const dayCells = [];
      for (let col = 0; col < 7; col++) {
        const i = row * 7 + col;
        if (i < startIndex) {
          dayCells.push(renderCell(y, m - 1, prevMonthDays - startIndex + i + 1, false, `p-${i}`));
        } else if (i < startIndex + daysInMonth) {
          dayCells.push(renderCell(y, m, i - startIndex + 1, true, `c-${i}`));
        } else {
          dayCells.push(renderCell(y, m + 1, i - startIndex - daysInMonth + 1, false, `n-${i}`));
        }
      }
      rows.push(
        <div key={`row-${row}`} className="grid grid-cols-7">
          {dayCells}
        </div>
      );
    }
    return rows;
  }, [currentDate, activeGroup?.events]);

  // Tabs for the active group room
  const groupTabs = [
    { id: 'oversikt', label: 'Oversikt', icon: Users },
    { id: 'ki', label: 'KI & Flashcards', icon: Sparkles },
    { id: 'chat', label: 'Gruppechat', icon: MessageSquare },
    { id: 'notater', label: 'Fellesnotater', icon: FileText },
    { id: 'kalender', label: 'Kalender', icon: Calendar },
    { id: 'filer', label: 'Filer & Oppgaver', icon: Folder }
  ] as const;

  // History items formatted for WorkspaceLayout
  const historyItems: HistoryItem[] = groups.map((g, idx) => ({
    id: g.id || `grp-${idx}`,
    title: g.name,
    subtitle: `ID: ${g.id || ''} • ${g.members?.length || 1} medlemmer`,
    isPinned: g.isPinned || false
  }));

  return (
    <>
      {/* DESKTOP VISNING (Uendret og bevart for md: og større) */}
      <div className="hidden md:block w-full h-full">
        <WorkspaceLayout
      title="Basen (Kollokvie)"
      subtitle="Samarbeid og felles læring"
      icon={<Users className="w-6 h-6" />}
      actionButtonLabel="Ny gruppe"
      onActionClick={handleNewGroup}
      historyItems={historyItems}
      activeItemId={activeGroupId}
      onItemClick={(id) => {
        setActiveGroupId(id);
        setActiveTab('oversikt');
      }}
      onPinItem={handlePinItem}
      onRenameItem={handleRenameItem}
      onDeleteItem={handleDeleteItem}
    >
      {({ isCollapsed }) => (
        !activeGroup ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4 text-slate-400">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-700 text-base">Ingen gruppe valgt</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Velg en gruppe i sidemenyen, eller opprett en ny for å starte samarbeidet.
            </p>
            <button 
              onClick={handleNewGroup} 
              className="mt-5 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary-hover transition-all cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Ny gruppe
            </button>
          </div>
        ) : (
          <div className="flex flex-col h-full bg-white relative overflow-hidden">
            
            {/* HEADER OG UNDERMENY FOR GRUPPEN */}
            <div className={`border-b border-slate-200 bg-white z-10 pt-4 px-6 shadow-xs transition-all duration-300 ${
              isCollapsed ? 'pl-20 sm:pl-32' : ''
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      {activeGroup.name}
                    </h2>
                    {activeGroup.isDemo && (
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-indigo-100">
                        Demo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    ID: {activeGroup.id} • {activeGroup.members?.length || 1} medlemmer
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleCopyInvite}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs",
                      copiedInvite 
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                        : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100"
                    )}
                    title="Kopier invitasjonslenke for medstudenter"
                  >
                    {copiedInvite ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Lenke kopiert!</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Inviter</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => setShowSettingsModal(true)}
                    className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer"
                    title="Gruppeinnstillinger"
                    aria-label="Gruppeinnstillinger"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Hovedmeny for gruppen */}
              <div className="flex flex-wrap gap-2 pb-2">
                {groupTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                        isActive 
                          ? 'border-primary text-primary font-black' 
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {tab.label}
                      {tab.id === 'chat' && activeGroup.unreadChat && (
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ARBEIDSFLATER (Selve innholdet byttes ut basert på aktiv tab) */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 custom-scrollbar">
              <div className="max-w-6xl mx-auto">
                <AnimatePresence>
                  {groupNotice && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`mb-6 p-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs ${
                        groupNotice.type === 'error'
                          ? 'bg-rose-50 border border-rose-200 text-rose-800'
                          : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      }`}
                    >
                      <span>{groupNotice.message}</span>
                      <button onClick={() => setGroupNotice(null)} className="p-1 hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* VISNING: OVERSIKT */}
                {activeTab === 'oversikt' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Invitasjonslenke */}
                      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-primary" /> Invitasjonslenke
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          Del denne lenken med medstudenter for å gi dem direkte tilgang til rommet.
                        </p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            readOnly 
                            value={`https://blu-hjelperen.no/join/${activeGroup.id.toLowerCase()}`} 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 font-mono select-all" 
                          />
                          <button 
                            onClick={handleCopyInvite}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                          >
                            {copiedInvite ? 'Kopiert!' : 'Kopier'}
                          </button>
                        </div>
                      </div>

                      {/* Møterom */}
                      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                          <Video className="w-4 h-4 text-purple-600" /> Fast videomøterom
                        </h3>
                        <p className="text-xs text-slate-500 mb-4">
                          Lim inn Teams, Zoom eller Google Meet-lenke for faste kollokviemøter.
                        </p>
                        <div className="flex gap-2">
                          <input 
                            value={activeGroup.meetingLink || ''} 
                            onChange={e => updateActiveGroup({ meetingLink: e.target.value })} 
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-purple-400" 
                            placeholder="https://teams.microsoft.com/..." 
                          />
                          <a 
                            href={activeGroup.meetingLink || '#'} 
                            target={activeGroup.meetingLink ? "_blank" : undefined} 
                            rel="noopener noreferrer" 
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all text-center inline-flex items-center shrink-0",
                              activeGroup.meetingLink 
                                ? "bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer" 
                                : "bg-slate-100 text-slate-400 pointer-events-none"
                            )}
                          >
                            Åpne møte
                          </a>
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Medlemmer og tilstedeværelse */}
                      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" /> Medlemmer ({activeGroup.members?.length || 1})
                          </h3>
                        </div>
                        <div className="space-y-2.5">
                          {(activeGroup.members || []).map((m, idx) => (
                            <div key={m.id || `member-ov-${m.name}-${idx}`} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-full text-xs font-bold text-white flex items-center justify-center relative shrink-0", m.color || "bg-indigo-600")}>
                                  {m.name.charAt(0)}
                                  {m.isOnline && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{m.name}</p>
                                  <p className="text-[10px] text-slate-400">{m.isOnline ? 'Aktiv nå' : 'Frakoblet'}</p>
                                </div>
                              </div>
                              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                {m.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Siste aktivitet */}
                      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" /> Siste aktivitet
                        </h3>
                        <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                          {(activeGroup.activity || []).length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Ingen nylig aktivitet registrert.</p>
                          ) : (
                            activeGroup.activity.map((act, idx) => (
                              <div key={act.id || `act-${idx}`} className="flex items-start gap-3 text-xs">
                                <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-300 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-slate-700">
                                    <span className="font-bold text-slate-900">{act.user}</span> {act.action}
                                  </p>
                                  <span className="text-[10px] text-slate-400 font-medium">{act.time}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VISNING: KI & FLASHCARDS */}
                {activeTab === 'ki' && (
                  <div className="bg-white rounded-3xl shadow-xs border border-slate-200 overflow-hidden">
                    <CollabRoom
                      groupId={activeGroup.id}
                      groupData={{
                        id: activeGroup.id,
                        groupId: activeGroup.id,
                        name: activeGroup.name,
                        groupName: activeGroup.name,
                        sharedRagContext: activeGroup.sharedRagContext || activeGroup.notes || '',
                        flashcards: activeGroup.flashcards || [],
                        messages: activeGroup.messages?.map(m => ({
                          id: m.id,
                          userId: m.userId || (m.isMe ? user?.uid || 'me' : 'other'),
                          user: m.user,
                          content: m.content,
                          timestamp: m.time || m.timestamp || 'Akkurat nå',
                          isBot: m.isBot,
                          isMe: m.isMe
                        })) || [],
                        members: activeGroup.members?.map((m, idx) => ({
                          id: m.id || `m_${idx}`,
                          name: m.name,
                          role: m.role,
                          isOnline: m.isOnline
                        })) || [],
                        userProgress: activeGroup.userProgress || {}
                      }}
                      currentUser={user}
                      onUpdateGroup={(updated) => {
                        updateActiveGroup({
                          name: updated.name,
                          sharedRagContext: updated.sharedRagContext,
                          flashcards: updated.flashcards,
                          userProgress: updated.userProgress,
                          messages: updated.messages?.map(m => ({
                            id: m.id,
                            user: m.user,
                            content: m.content,
                            time: m.timestamp,
                            color: m.isBot ? 'blue' : 'emerald',
                            isMe: m.isMe || false,
                            isBot: m.isBot,
                            userId: m.userId
                          }))
                        });
                      }}
                    />
                  </div>
                )}

                {/* VISNING: CHAT */}
                {activeTab === 'chat' && (
                  <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 h-[620px] flex flex-col">
                    <div className="flex-1 bg-slate-50/70 rounded-2xl p-4 mb-4 overflow-y-auto space-y-4 custom-scrollbar">
                      {activeGroup.messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                          <MessageSquare className="w-10 h-10 text-slate-300" />
                          <span className="text-sm font-medium">Ingen meldinger i gruppen enda. Bli den første til å skrive!</span>
                        </div>
                      ) : (
                        activeGroup.messages.map((msg, idx) => (
                          <div key={msg.id || `msg-${idx}`} className={cn("flex gap-3", msg.isMe ? "flex-row-reverse" : "flex-row")}>
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0",
                              msg.color === 'emerald' ? "bg-emerald-500" : 
                              msg.color === 'indigo' ? "bg-indigo-600" : 
                              msg.color === 'rose' ? "bg-rose-500" : "bg-slate-600"
                            )}>
                              {msg.user.charAt(0)}
                            </div>
                            <div className={cn(
                              "p-3 rounded-2xl shadow-xs max-w-[80%]",
                              msg.isMe 
                                ? "bg-primary text-white rounded-tr-none" 
                                : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                            )}>
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <span className={cn("text-[11px] font-bold", msg.isMe ? "text-white/90" : "text-slate-900")}>
                                  {msg.user}
                                </span>
                                <span className={cn("text-[10px]", msg.isMe ? "text-white/60" : "text-slate-400")}>
                                  {msg.time}
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed">{msg.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0 items-end">
                      <textarea 
                        rows={3}
                        value={groupInput}
                        onChange={(e) => setGroupInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleSendGroupMessage();
                          }
                        }}
                        placeholder="Skriv en melding til gruppen..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none leading-relaxed custom-scrollbar"
                      />
                      <button 
                        onClick={handleSendGroupMessage}
                        className="bg-primary text-white px-5 rounded-xl hover:bg-primary-hover shadow-md shadow-primary/20 transition-all font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Send</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* VISNING: NOTATER */}
                {activeTab === 'notater' && (
                  <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                          <FileText className="w-5 h-5 text-primary" /> Felles Notatblokk
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Sanntidsnotater for kollokviet, praksisrefleksjoner og kildeutveksling.</p>
                      </div>
                    </div>
                    <RichTextEditor 
                      key={activeGroup.id} 
                      editorContext={{ id: activeGroup.id, name: activeGroup.name }}
                      initialNotes={activeGroup.notes} 
                      onChange={(notes) => updateActiveGroup({ notes })} 
                      onSaveToFolder={(content) => {
                        const d = new Date();
                        const filename = `Notat_${d.getDate()}.${d.getMonth()+1}.${d.getFullYear()}.docx`;
                        const newFile: GroupFile = {
                          id: Date.now().toString(),
                          name: filename,
                          type: 'file',
                          date: d.toLocaleDateString('no-NO'),
                          size: `${Math.round(content.length / 1024) + 1} KB`
                        };
                        updateActiveGroup({
                          files: [newFile, ...activeGroup.files],
                          activity: [{ id: Date.now().toString(), user: user?.displayName || 'Meg', action: 'lagret et notat i arkivet', time: 'Akkurat nå' }, ...activeGroup.activity]
                        });
                        showNotice(`Notatet ble lagret i filarkivet som "${filename}"`, 'success');
                      }}
                    />
                  </div>
                )}

                {/* VISNING: KALENDER */}
                {activeTab === 'kalender' && (
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          <CalendarRange className="w-5 h-5 text-primary" /> Gruppekalender
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">Få oversikt over felles møter, veiledningstimer og innleveringsfrister.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setNewEventTitle('');
                            setNewEventDate(new Date().toISOString().split('T')[0]);
                            setNewEventAllDay(false);
                            setNewEventStart('09:00');
                            setNewEventEnd('10:00');
                            setNewEventCategory('meeting');
                            setNewEventLocation('');
                            setNewEventDescription('');
                            setNewEventFiles([]);
                            setShowFilePickerForEvent(false);
                            setShowEventModal(true);
                          }}
                          className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Ny hendelse
                        </button>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button 
                            onClick={() => setCalendarView('month')} 
                            className={cn("px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer", calendarView === 'month' ? "bg-white shadow-xs text-slate-900" : "text-slate-500 hover:text-slate-900")}
                          >
                            Måned
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Kategori-oversikt og fargeforklaring */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 py-2 px-4 bg-white border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-600 mb-4 shadow-2xs">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Kategorier:</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Gruppemøte</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Arbeidskrav</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Eksamen</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Skriveøkt</span>
                      <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Forelesning</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Kalendervisning */}
                      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                          <h4 className="font-bold text-slate-900 text-sm">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                          </h4>
                          <div className="flex gap-1.5">
                            <button 
                              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} 
                              className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer"
                            >
                              &lt;
                            </button>
                            <button 
                              onClick={() => setCurrentDate(new Date())} 
                              className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer"
                            >
                              I dag
                            </button>
                            <button 
                              onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} 
                              className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer"
                            >
                              &gt;
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 text-center py-2">
                          <div>Man</div><div>Tir</div><div>Ons</div><div>Tor</div><div>Fre</div><div>Lør</div><div>Søn</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {calendarGrid}
                        </div>
                      </div>

                      {/* Timeplan-import / iCal */}
                      <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                          <h4 className="font-black text-slate-900 mb-3 flex items-center gap-2 text-sm">
                            <CalendarDays className="w-4 h-4 text-emerald-600" /> Importer Timeplan (iCal)
                          </h4>
                          <p className="text-xs text-slate-500 mb-3">Lim inn TimeEdit- eller Canvas-lenke for å hente inn felles timeplan:</p>
                          <div className="flex gap-2 mb-3">
                            <input 
                              type="text" 
                              value={calendarLinkInput}
                              onChange={(e) => setCalendarLinkInput(e.target.value)}
                              placeholder="https://timeedit..." 
                              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button 
                              onClick={handleFetchCalendar}
                              disabled={isFetchingCalendar}
                              className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                              {isFetchingCalendar ? 'Henter...' : 'Hent'}
                            </button>
                          </div>
                          {fetchError && <p className="text-xs font-bold text-red-500 mb-3">{fetchError}</p>}
                          
                          <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-100 text-xs text-emerald-800 space-y-1.5 font-medium">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                              <Info className="w-3.5 h-3.5 text-emerald-600" /> Slik gjør du:
                            </div>
                            <p>1. Åpne timeplanen i TimeEdit/Canvas.</p>
                            <p>2. Velg <strong>Abonner / iCal</strong> og kopier lenken.</p>
                            <p>3. Lim inn her og trykk <strong>Hent</strong>.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* VISNING: FILER OG OPPGAVER */}
                {activeTab === 'filer' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Filarkiv */}
                    <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                            <FolderOpen className="w-5 h-5 text-primary" /> Felles Filer & Dokumenter
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">Del pensum, utkast og artikler med gruppen.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={exportAllFiles}
                            disabled={activeGroup.files.length === 0}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 disabled:opacity-40 rounded-xl transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> ZIP
                          </button>
                          <label className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer">
                            <Upload className="w-3.5 h-3.5" /> Last opp
                            <input type="file" multiple accept=".doc,.docx,.pdf,.txt" className="hidden" onChange={handleFileUpload} />
                          </label>
                        </div>
                      </div>

                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 flex-1 min-h-[300px]">
                        {activeGroup.files.length === 0 ? (
                          <div className="p-8 h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <Folder className="w-10 h-10 text-slate-300" />
                            <span className="text-xs">Ingen filer lastet opp enda.</span>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto custom-scrollbar">
                            {activeGroup.files.map((f, idx) => (
                              <div key={f.id || `file-${f.name}-${idx}`} className="p-3.5 flex items-center justify-between hover:bg-white transition-colors bg-slate-50/30">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                                    <FileIcon className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{f.name}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{f.date} {f.size && `• ${f.size}`}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {f.content && (
                                    <button 
                                      onClick={() => {
                                        const reviewId = `rev_${f.id || f.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                        try {
                                          const reviewObj = {
                                            id: reviewId,
                                            title: f.name.replace(/\.[^/.]+$/, ''),
                                            authorName: f.sharedBy || 'Medstudent',
                                            authorId: user?.uid || 'peer',
                                            content: f.content,
                                            allowComments: true,
                                            createdAt: new Date().toISOString()
                                          };
                                          localStorage.setItem(`blu_shared_review_${reviewId}`, JSON.stringify(reviewObj));
                                          localStorage.setItem('blu_active_review_id', reviewId);
                                        } catch {}
                                        if (setParentActiveTab) setParentActiveTab('peer-review');
                                      }}
                                      className="p-1.5 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                      title="Åpne for hverandrevurdering og margkommentarer"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => exportSingleFile(f.name)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                    title="Last ned"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hvem gjør hva (Gjøremål) */}
                    <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                            <CheckSquare className="w-5 h-5 text-primary" /> Hvem gjør hva?
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">Fordel oppgaver og sett tidsfrister.</p>
                        </div>
                      </div>

                      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[340px] custom-scrollbar pr-1 pb-2">
                        {activeGroup.todos.length === 0 && !isAddingTodo ? (
                          <div className="p-8 h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <CheckSquare className="w-10 h-10 text-slate-300" />
                            <span className="text-xs">Ingen oppgaver lagt til.</span>
                          </div>
                        ) : (
                          activeGroup.todos.map((todo, idx) => (
                            <div key={todo.id || `todo-${idx}`} className="flex items-center gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 hover:border-primary/30 transition-all">
                              <button 
                                onClick={() => handleToggleTodo(todo.id)}
                                className={cn(
                                  "w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer",
                                  todo.completed ? "bg-primary border-primary text-white" : "border-slate-300 bg-white"
                                )}
                              >
                                {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-xs font-medium truncate", todo.completed ? "text-slate-400 line-through" : "text-slate-800")}>
                                  {todo.task}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span>Ansvar: <strong className="text-slate-600">{todo.assignee}</strong></span>
                                  {todo.dueDate && <span>• Frist: {todo.dueDate}</span>}
                                </div>
                              </div>
                            </div>
                          ))
                        )}

                        {isAddingTodo ? (
                          <div className="flex gap-2 pt-2">
                            <input 
                              type="text" 
                              value={newTodoInput}
                              onChange={(e) => setNewTodoInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                              placeholder="Beskriv oppgaven..."
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary"
                              autoFocus
                            />
                            <button 
                              onClick={handleAddTodo} 
                              className="bg-primary text-white font-bold text-xs px-3 py-2 rounded-xl hover:bg-primary-hover cursor-pointer"
                            >
                              Lagre
                            </button>
                            <button 
                              onClick={() => setIsAddingTodo(false)} 
                              className="bg-slate-100 text-slate-600 font-bold text-xs px-3 py-2 rounded-xl hover:bg-slate-200 cursor-pointer"
                            >
                              Avbryt
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setIsAddingTodo(true)}
                            className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer mt-2"
                          >
                            + Ny oppgave
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* MODAL: OPPRETT NY GRUPPE */}
            <AnimatePresence>
              {showCreateGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                      <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">Opprett ny gruppe</h3>
                    <p className="text-xs text-slate-500 mb-5">Lag et felles rom for kollokviet eller prosjektgruppen din.</p>
                    
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Gruppenavn</label>
                    <input 
                      type="text" 
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateGroupConfirm()}
                      placeholder="F.eks. Kollokviegruppe 4"
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium mb-5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowCreateGroup(false)}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                      >
                        Avbryt
                      </button>
                      <button 
                        onClick={handleCreateGroupConfirm}
                        disabled={!newGroupName.trim()}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
                      >
                        Opprett
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL: GRUPPEINNSTILLINGER */}
            <AnimatePresence>
              {showSettingsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-200 space-y-5"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" /> Gruppeinnstillinger
                      </h3>
                      <button 
                        onClick={() => setShowSettingsModal(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Endre gruppenavn</label>
                      <input 
                        type="text" 
                        value={activeGroup.name}
                        onChange={e => updateActiveGroup({ name: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-1">Faresone</h4>
                      <p className="text-[11px] text-slate-500 mb-3">Handlinger her kan fjerne tilgang for deg eller hele gruppen.</p>
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setShowSettingsModal(false);
                            setShowLeaveConfirm(true);
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" /> Forlat gruppe
                        </button>
                        <button 
                          onClick={() => {
                            setShowSettingsModal(false);
                            setShowDeleteConfirm(true);
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Slett gruppe
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL: FORLAT GRUPPE */}
            <AnimatePresence>
              {showLeaveConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                  <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                      <LogOut className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">Forlat gruppe?</h4>
                      <p className="text-xs text-slate-500 mt-1">Du vil miste tilgang til delte notater og filer i denne gruppen.</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setShowLeaveConfirm(false)}
                        className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Avbryt
                      </button>
                      <button 
                        onClick={() => {
                          setShowLeaveConfirm(false);
                          handleDeleteItem(activeGroup.id);
                        }}
                        className="flex-1 py-2 px-3 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 cursor-pointer shadow-xs"
                      >
                        Forlat
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL: SLETT GRUPPE PERMANENT */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                  <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900">Slette denne gruppen?</h4>
                      <p className="text-xs text-slate-500 mt-1">Handlingen kan ikke angres. Alle fellesnotater, oppgaver og meldinger vil bli slettet.</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Avbryt
                      </button>
                      <button 
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          handleDeleteItem(activeGroup.id);
                        }}
                        className="flex-1 py-2 px-3 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 cursor-pointer shadow-xs"
                      >
                        Slett permanent
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL: NY HENDELSE I KALENDER */}
            <AnimatePresence>
              {showEventModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-2xl font-black text-slate-800">Ny hendelse</h2>
                      <button 
                        type="button"
                        onClick={() => setShowEventModal(false)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
                        title="Lukk"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 mb-6">Legg til en felles hendelse i kalenderen.</p>

                    <div className="space-y-4">
                      
                      {/* Tittel */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Tittel</label>
                        <input 
                          type="text" 
                          value={newEventTitle}
                          onChange={e => setNewEventTitle(e.target.value)}
                          placeholder="F.eks. Gruppemøte" 
                          className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" 
                          autoFocus
                        />
                      </div>

                      {/* Dato og tid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Dato</label>
                          <input 
                            type="date" 
                            value={newEventDate}
                            onChange={e => setNewEventDate(e.target.value)}
                            className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" 
                          />
                        </div>
                        <div className="flex flex-col justify-end pb-3">
                          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={newEventAllDay}
                              onChange={e => setNewEventAllDay(e.target.checked)}
                              className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer" 
                            /> Hele dagen
                          </label>
                        </div>
                      </div>

                      {!newEventAllDay && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Starttid</label>
                            <input 
                              type="time" 
                              value={newEventStart}
                              onChange={e => setNewEventStart(e.target.value)}
                              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" 
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Sluttid</label>
                            <input 
                              type="time" 
                              value={newEventEnd}
                              onChange={e => setNewEventEnd(e.target.value)}
                              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" 
                            />
                          </div>
                        </div>
                      )}

                      {/* Kategori og Sted */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Kategori</label>
                        <select 
                          value={newEventCategory}
                          onChange={e => setNewEventCategory(e.target.value)}
                          className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="meeting">Gruppemøte (Blå)</option>
                          <option value="assignment">Arbeidskrav (Oransje)</option>
                          <option value="deadline">Eksamen (Rød)</option>
                          <option value="social">Skriveøkt (Grønn)</option>
                          <option value="lecture">Forelesning (Lilla)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Sted / Lenke</label>
                        <input 
                          type="text" 
                          value={newEventLocation}
                          onChange={e => setNewEventLocation(e.target.value)}
                          placeholder="Fysisk møtested eller Teams/Zoom-lenke" 
                          className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary" 
                        />
                      </div>

                      {/* Agenda */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Agenda / Beskrivelse</label>
                        <textarea 
                          value={newEventDescription}
                          onChange={e => setNewEventDescription(e.target.value)}
                          placeholder="Hva skal gjøres?" 
                          className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-primary"
                        ></textarea>
                      </div>

                      {/* Filvedlegg */}
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mt-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-2">
                          <Folder className="w-4 h-4 text-primary" /> Koble til filer (fra Basen)
                        </label>

                        {/* Valgte filer */}
                        {newEventFiles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {newEventFiles.map((fn, idx) => (
                              <span key={`nef-${fn}-${idx}`} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700">
                                <FileIcon className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="max-w-[180px] truncate">{fn}</span>
                                <button 
                                  type="button" 
                                  onClick={() => setNewEventFiles(prev => prev.filter(f => f !== fn))}
                                  className="text-slate-400 hover:text-red-500 ml-0.5 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        <button 
                          type="button"
                          onClick={() => setShowFilePickerForEvent(prev => !prev)}
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                        >
                          {showFilePickerForEvent ? 'Lukk filvelger' : '+ Velg fil fra Basen'}
                        </button>

                        {showFilePickerForEvent && (
                          <div className="mt-3 p-2 bg-white border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1">
                            {activeGroup.files.length === 0 ? (
                              <p className="text-xs text-slate-400 p-2 italic">Ingen filer i Basen enda. Last opp i "Filer & Oppgaver"-fanen.</p>
                            ) : (
                              activeGroup.files.map((f, idx) => {
                                const isSelected = newEventFiles.includes(f.name);
                                return (
                                  <div 
                                    key={f.id || `ev-fp-${f.name}-${idx}`}
                                    onClick={() => {
                                      if (isSelected) {
                                        setNewEventFiles(prev => prev.filter(name => name !== f.name));
                                      } else {
                                        setNewEventFiles(prev => [...prev, f.name]);
                                      }
                                    }}
                                    className={cn(
                                      "flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors",
                                      isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-slate-50 text-slate-700"
                                    )}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <FileIcon className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">{f.name}</span>
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Handlingsknapper */}
                    <div className="flex gap-3 mt-8">
                      <button 
                        type="button"
                        onClick={() => setShowEventModal(false)}
                        className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                      >
                        Avbryt
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (!newEventTitle.trim()) return;
                          const newEv = {
                            id: 'ev-' + Date.now(),
                            title: newEventTitle.trim(),
                            date: newEventDate,
                            startTime: newEventAllDay ? '00:00' : newEventStart,
                            endTime: newEventAllDay ? '23:59' : newEventEnd,
                            allDay: newEventAllDay,
                            type: newEventCategory,
                            location: newEventLocation.trim(),
                            description: newEventDescription.trim(),
                            files: newEventFiles
                          };
                          updateActiveGroup({ events: [...(activeGroup.events || []), newEv] });
                          setShowEventModal(false);
                        }}
                        disabled={!newEventTitle.trim()}
                        className="flex-1 py-3 px-4 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Lagre hendelse
                      </button>
                    </div>
                    
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* MODAL: VIS DETALJER FOR VALGT HENDELSE */}
            <AnimatePresence>
              {selectedEvent && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-100 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border",
                          (categoryConfig[selectedEvent.type || 'meeting'] || categoryConfig.meeting).color
                        )}>
                          {(() => {
                            const ConfIcon = (categoryConfig[selectedEvent.type || 'meeting'] || categoryConfig.meeting).icon;
                            return <ConfIcon className="w-3.5 h-3.5" />;
                          })()}
                          <span>{(categoryConfig[selectedEvent.type || 'meeting'] || categoryConfig.meeting).label}</span>
                        </span>
                        <h3 className="text-lg font-black text-slate-900 mt-2 leading-snug">
                          {selectedEvent.title}
                        </h3>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedEvent(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 font-medium">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span><strong>Dato:</strong> {selectedEvent.date}</span>
                      </div>
                      <div className="flex items-center gap-2 font-medium">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span><strong>Tid:</strong> {selectedEvent.allDay ? 'Hele dagen' : `${selectedEvent.startTime || '09:00'} - ${selectedEvent.endTime || '10:00'}`}</span>
                      </div>
                      {selectedEvent.location && (
                        <div className="flex items-center gap-2 font-medium">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                          <span><strong>Sted/Lenke:</strong> {selectedEvent.location}</span>
                        </div>
                      )}
                    </div>

                    {selectedEvent.description && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Beskrivelse / Agenda</label>
                        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                          {selectedEvent.description}
                        </p>
                      </div>
                    )}

                    {selectedEvent.files && selectedEvent.files.length > 0 && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Tilknyttede filer</label>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedEvent.files.map((fn: string, idx: number) => (
                            <span key={`sev-f-${idx}`} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700">
                              <FileIcon className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="max-w-[200px] truncate">{fn}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button 
                        type="button"
                        onClick={() => {
                          updateActiveGroup({ events: (activeGroup.events || []).filter(e => e.id !== selectedEvent.id) });
                          setSelectedEvent(null);
                        }}
                        className="flex-1 py-2.5 px-3 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Slett hendelse</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setSelectedEvent(null)}
                        className="flex-1 py-2.5 px-3 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Lukk
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        )
      )}
    </WorkspaceLayout>
      </div>

      {/* MOBIL VISNING (Forenklet kollokvieopplevelse ihht BLU-planen) */}
      <div className="md:hidden">
        <MobileBasen
          groups={groups}
          activeGroup={activeGroup}
          activeGroupId={activeGroupId}
          setActiveGroupId={setActiveGroupId}
          onNewGroup={handleNewGroup}
          updateActiveGroup={updateActiveGroup}
          user={user}
          onCopyInvite={handleCopyInvite}
          copiedInvite={copiedInvite}
          pricingTier={pricingTier}
          setParentActiveTab={setParentActiveTab}
        />
      </div>

      {/* MOBIL MODAL: OPPRETT NY GRUPPE */}
      <AnimatePresence>
        {showCreateGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Opprett ny gruppe</h3>
                <p className="text-xs text-slate-500 mt-0.5">Lag et felles rom for kollokviet eller prosjektgruppen din.</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Gruppenavn</label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateGroupConfirm()}
                  placeholder="F.eks. Kollokviegruppe 4"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Avbryt
                </button>
                <button 
                  onClick={handleCreateGroupConfirm}
                  disabled={!newGroupName.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
                >
                  Opprett
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Basen;
