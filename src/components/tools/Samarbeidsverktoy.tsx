import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';

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
  }
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
  throw new Error(JSON.stringify(errInfo));
}

import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Check, Share2, MessageSquare, Plus, 
  Clock, Send, FileText, Video, CheckSquare, 
  Download, FolderOpen, Upload, File as FileIcon, X, AlertOctagon, LogOut, Trash2, Settings, Calendar as CalendarIcon, CalendarDays, Info, CalendarRange, Sparkles, Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link as LinkIcon } from 'lucide-react';
import { Document, Packer, Paragraph } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { CollabRoom } from '../CollabRoom';

const categoryConfig: Record<string, {label: string, color: string, icon: any}> = {
  meeting: { label: 'Gruppemøte', color: 'bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200', icon: Users },
  lecture: { label: 'Forelesning/Undervisning', color: 'bg-purple-100 border-purple-200 text-purple-700 hover:bg-purple-200', icon: Video },
  deadline: { label: 'Frist/Innlevering', color: 'bg-rose-100 border-rose-200 text-rose-700 hover:bg-rose-200', icon: AlertOctagon },
  social: { label: 'Sosialt', color: 'bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200', icon: CheckSquare }
};

interface GroupFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  date: string;
  size?: string;
}

interface Message {
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

interface Todo {
  id: string;
  task: string;
  assignee: string;
  dueDate?: string;
  completed: boolean;
}

interface Member {
  name: string;
  role: string;
  color: string;
  isOnline: boolean;
  id?: string;
}

interface Activity {
  id: string;
  user: string;
  action: string;
  time: string;
}

interface Group {
  id: string;
  groupId?: string;
  name: string;
  groupName?: string;
  isDemo?: boolean;
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

interface SamarbeidsverktoyProps {
  user: any;
  pricingTier: string;
  setActiveTab: (tab: any) => void;
}

import { RichTextEditor } from './RichTextEditor';

export const Samarbeidsverktoy: React.FC<SamarbeidsverktoyProps> = ({
  user,
  pricingTier,
  setActiveTab
}) => {

  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>(() => {
    try {
      return localStorage.getItem('blu_activeGroupId') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (activeGroupId) {
        localStorage.setItem('blu_activeGroupId', activeGroupId);
      } else {
        localStorage.removeItem('blu_activeGroupId');
      }
    } catch {}
  }, [activeGroupId]);

  useEffect(() => {
    const p = 'groups';
    const unsubscribe = onSnapshot(collection(db, p), (snapshot) => {
      const fetchedGroups: Group[] = [];
      snapshot.forEach(doc => {
        fetchedGroups.push(doc.data() as Group);
      });
      setGroups(prev => {
        if (JSON.stringify(prev) === JSON.stringify(fetchedGroups)) {
           return prev;
        }

        if (prev.length > 0 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          fetchedGroups.forEach(fg => {
            const pg = prev.find(g => g.id === fg.id);
            if (pg && fg.messages && pg.messages && fg.messages.length > pg.messages.length) {
              const newMsgs = fg.messages.slice(pg.messages.length);
              const latestMsg = newMsgs[newMsgs.length - 1];
              const isFromMe = latestMsg.user === (user?.displayName || 'Meg') || latestMsg.isMe;
              
              if (!isFromMe) {
                new Notification(`Ny melding i ${fg.name}`, {
                  body: `${latestMsg.user}: ${latestMsg.content}`,
                  icon: 'https://picsum.photos/seed/blu-icon/192/192'
                });
              }
            }
          });
        }

        return fetchedGroups;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, p);
    });
    return () => unsubscribe();
  }, []);
  
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  // Inner Navigation Tab State
  const [activeInnerTab, setActiveInnerTab] = useState<'basen' | 'oversikt' | 'chat' | 'notater' | 'filer' | 'kalender' | 'innstillinger'>('basen');

  // Input states
  const [groupInput, setGroupInput] = useState('');
  const [newTodoInput, setNewTodoInput] = useState('');
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  
  // Calendar States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEventStart, setNewEventStart] = useState('09:00');
  const [newEventEnd, setNewEventEnd] = useState('10:00');
  const [newEventAllDay, setNewEventAllDay] = useState(false);
  const [newEventCategory, setNewEventCategory] = useState('meeting');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventFiles, setNewEventFiles] = useState<any[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [isFetchingCalendar, setIsFetchingCalendar] = useState(false);
  const [calendarLinkInput, setCalendarLinkInput] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  
  const handleFetchCalendar = async () => {
    if (!calendarLinkInput.trim()) {
        setFetchError("Lim inn en gyldig lenke.");
        return;
    }
    setIsFetchingCalendar(true);
    setFetchError(null);
    let validUrl = calendarLinkInput.trim().replace('webcal://', 'https://');

    try {
        const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(validUrl));
        if (!response.ok) {
           throw new Error('Kunne ikke hente kalenderen. Nettverksfeil.');
        }
        const text = await response.text();
        
        if (!text.includes('BEGIN:VCALENDAR')) {
           throw new Error('Ugyldig kalenderformat mottatt.');
        }

        const newEvents: any[] = [];
        const lines = text.split(/\r?\n/);
        let inEvent = false;
        let currentEvent: any = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('BEGIN:VEVENT')) {
                inEvent = true;
                currentEvent = {
                    id: 'ical-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
                    title: 'Ny hendelse',
                    date: '',
                    startTime: '00:00',
                    endTime: '01:00',
                    allDay: false,
                    type: 'lecture',
                    location: '',
                    description: '',
                    files: []
                };
            } else if (line.startsWith('END:VEVENT')) {
                inEvent = false;
                if (currentEvent && currentEvent.date) {
                    newEvents.push(currentEvent);
                }
                currentEvent = null;
            } else if (inEvent && currentEvent) {
                if (line.startsWith('SUMMARY:')) {
                    currentEvent.title = line.substring(8).trim();
                } else if (line.startsWith('LOCATION:')) {
                    currentEvent.location = line.substring(9).trim();
                } else if (line.startsWith('DESCRIPTION:')) {
                    currentEvent.description = line.substring(12).trim();
                } else if (line.startsWith('DTSTART')) {
                    const valIndex = line.indexOf(':');
                    if (valIndex !== -1) {
                        const val = line.substring(valIndex + 1);
                        if (val.length >= 8) {
                           const year = val.substring(0,4);
                           const month = val.substring(4,6);
                           const day = val.substring(6,8);
                           currentEvent.date = `${year}-${month}-${day}`;
                           
                           if (val.includes('T') && val.length >= 15) {
                               const timePart = val.substring(val.indexOf('T') + 1);
                               const hour = timePart.substring(0, 2);
                               const min = timePart.substring(2, 4);
                               currentEvent.startTime = `${hour}:${min}`;
                           } else {
                               currentEvent.allDay = true;
                           }
                        }
                    }
                } else if (line.startsWith('DTEND')) {
                    const valIndex = line.indexOf(':');
                    if (valIndex !== -1) {
                        const val = line.substring(valIndex + 1);
                        if (val.includes('T') && val.length >= 15) {
                               const timePart = val.substring(val.indexOf('T') + 1);
                               const hour = timePart.substring(0, 2);
                               const min = timePart.substring(2, 4);
                               currentEvent.endTime = `${hour}:${min}`;
                        }
                    }
                }
            }
        }

        if (newEvents.length > 0) {
            const updatedEvents = [...(activeGroup?.events || []), ...newEvents];
            updateActiveGroup({ events: updatedEvents });
            setCalendarLinkInput('');
            alert(`Importerte ${newEvents.length} hendelser med hell!`);
        } else {
            throw new Error('Fant ingen hendelser i kalenderen.');
        }

    } catch (err: any) {
        console.error("Kalender-fetch feilet:", err);
        setFetchError("Kunne ikke hente: " + (err.message || 'Sjekk lenken og prøv igjen.'));
    } finally {
        setIsFetchingCalendar(false);
    }
  };

  const handlePrevDate = () => {
    setCurrentDate(prev => {
       const newDate = new Date(prev);
       if (calendarView === 'month') newDate.setMonth(prev.getMonth() - 1);
       else if (calendarView === 'uke') newDate.setDate(prev.getDate() - 7);
       else newDate.setDate(prev.getDate() - 1);
       return newDate;
    });
  };
  const handleNextDate = () => {
    setCurrentDate(prev => {
       const newDate = new Date(prev);
       if (calendarView === 'month') newDate.setMonth(prev.getMonth() + 1);
       else if (calendarView === 'uke') newDate.setDate(prev.getDate() + 7);
       else newDate.setDate(prev.getDate() + 1);
       return newDate;
    });
  };
  const handleToday = () => {
    setCurrentDate(new Date());
  };
  
  const getWeekNumber = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return weekNo;
  };

  const monthNames = ["Januar", "Februar", "Mars", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Desember"];
  let formattedDateHeader = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  if (calendarView === 'uke') {
      formattedDateHeader = `Uke ${getWeekNumber(currentDate)}, ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  } else if (calendarView === 'dag') {
      formattedDateHeader = `${currentDate.getDate()}. ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }


  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
  
  // Initialize simulated notifications
  useEffect(() => {
    if (activeGroup?.isDemo) {
      const timer = setTimeout(() => {
        setGroups(prev => prev.map(g => {
          if (g.isDemo && activeInnerTab !== 'chat') {
            return {
              ...g,
              unreadChat: true,
              messages: [...g.messages, {
                id: 'sim-' + Date.now(),
                user: 'Kristin',
                content: 'Hei! Jeg har sett på utkastet ditt 😊',
                time: new Date().toLocaleTimeString('no-NO', {hour: '2-digit', minute:'2-digit'}),
                color: 'bg-emerald-100 text-emerald-800',
                isMe: false,
                isDemo: true
              }]
            };
          }
          return g;
        }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeGroupId, activeInnerTab]);
  
  // Initialize simulated notifications
  useEffect(() => {
    if (activeGroup?.isDemo) {
      const timer = setTimeout(() => {
        setGroups(prev => prev.map(g => {
          if (g.isDemo && activeInnerTab !== 'chat') {
            return {
              ...g,
              unreadChat: true,
              messages: [...g.messages, {
                id: 'sim-' + Date.now(),
                user: 'Kristin',
                content: 'Hei! Jeg har sett på utkastet ditt 😊',
                time: new Date().toLocaleTimeString('no-NO', {hour: '2-digit', minute:'2-digit'}),
                color: 'bg-emerald-100 text-emerald-800',
                isMe: false,
                isDemo: true
              }]
            };
          }
          return g;
        }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeGroupId, activeInnerTab]);

  const saveGroupToFirestore = (groupId: string, dataToMerge: Partial<Group>) => {
    const docRef = doc(db, 'groups', groupId);
    /* Manually only send what we need and avoid loops on identical local data since it's merged manually */
    setDoc(docRef, dataToMerge, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'groups'));
  };

  const updateActiveGroupLocal = (updates: Partial<Group>) => {
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, ...updates } : g));
  };
  
  const updateActiveGroup = (updates: Partial<Group>) => {
    updateActiveGroupLocal(updates);
    if (activeGroupId) {
       saveGroupToFirestore(activeGroupId, updates);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => ({
        id: Date.now().toString() + f.name,
        name: f.name,
        type: 'file' as const,
        date: new Date().toLocaleDateString('no-NO'),
        size: `${Math.round(f.size / 1024)} KB`
      }));
      
      const myName = user?.displayName?.split(' ')[0] || 'Meg';
      updateActiveGroup({
         files: [...newFiles, ...activeGroup.files],
         activity: [{ id: Date.now().toString(), user: myName, action: `lastet opp ${e.target.files?.length} nye filer`, time: 'Akkurat nå' }, ...activeGroup.activity]
      });
    }
  };

  const exportAllFiles = async () => {
    const zip = new JSZip();
    const folder = zip.folder(activeGroup.name);
    activeGroup.files.forEach(f => {
      if (f.type === 'file') {
        const contentStr = `Dette er generert eksempeldata for filen: ${f.name}`;
        const doc = new Document({
          sections: [{ properties: {}, children: [new Paragraph(contentStr)] }]
        });
        Packer.toBlob(doc).then(blob => folder?.file(f.name, blob));
      }
    });

    setTimeout(async () => {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${activeGroup.name}_arkiv.zip`);
    }, 1000);
  };

  const exportSingleFile = async (fileName: string) => {
    const doc = new Document({
      sections: [{ properties: {}, children: [new Paragraph(`Eksempel på innhold for ${fileName}`)] }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, fileName);
  };

  const handleDeleteGroup = () => {
     setShowDeleteConfirm(false);
     if (activeGroupId) {
       deleteDoc(doc(db, 'groups', activeGroupId)).catch(err => handleFirestoreError(err, OperationType.DELETE, 'groups'));
     }
     const remaining = groups.filter(g => g.id !== activeGroupId);
     if (remaining.length > 0) setActiveGroupId(remaining[0].id);
     else setActiveGroupId('');
     setActiveInnerTab('oversikt');
  };
  
  const handleLeaveGroup = () => {
     setShowLeaveConfirm(false);
     // Simulating leave since it's anonymous data - remove user from members array?
     // For now, same as delete:
     if (activeGroupId) {
       deleteDoc(doc(db, 'groups', activeGroupId)).catch(err => handleFirestoreError(err, OperationType.DELETE, 'groups'));
     }
     const remaining = groups.filter(g => g.id !== activeGroupId);
     if (remaining.length > 0) setActiveGroupId(remaining[0].id);
     else setActiveGroupId('');
     setActiveInnerTab('oversikt');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      const newId = newGroupName.substring(0, 4).toUpperCase() + '-' + Math.floor(Math.random() * 10000);
      const newGroup: Group = { 
        id: newId, 
        name: newGroupName,
        messages: [],
        notes: '',
        todos: [],
        files: [],
        events: [],
        members: [{ name: user?.displayName || 'Meg', role: 'Oppretter', color: 'bg-primary', isOnline: true }],
        activity: [{ id: Date.now().toString(), user: user?.displayName || 'Meg', action: 'opprettet gruppen', time: 'Akkurat nå' }],
        meetingLink: ''
      };
      
      setDoc(doc(db, 'groups', newId), newGroup).catch(err => handleFirestoreError(err, OperationType.CREATE, 'groups'));
      
      setActiveGroupId(newId);
      setShowCreateGroup(false);
      setNewGroupName('');
      setActiveInnerTab('oversikt');
    }
  };

  const handleSendGroupMessage = () => {
    if (!groupInput.trim()) return;
    const myName = user?.displayName?.split(' ')[0] || 'Meg';
    const newMsg = {
        id: Date.now().toString(),
        user: myName,
        content: groupInput,
        time: 'Akkurat nå',
        color: 'blue',
        isMe: true
    };
    updateActiveGroup({
        messages: [...activeGroup.messages, newMsg]
    });
    
    // Send request to backend for FCM notification
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    fetch(`${apiUrl}/api/send-notification`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
          title: `Ny melding fra ${myName} i ${activeGroup.name}`,
          body: groupInput,
          token: "dummy" // In a real app, backend fetches actual tokens from members' user profiles
       })
    }).catch(e => console.error("FCM trigger feilet:", e));

    setGroupInput('');
  };

  const handleAddTodo = () => {
    if (!newTodoInput.trim()) return;
    const myName = user?.displayName?.split(' ')[0] || 'Meg';
    const newTodo = {
      id: Date.now().toString(),
      task: newTodoInput,
      assignee: 'Ufordelt',
      completed: false
    };
    updateActiveGroup({ 
      todos: [...activeGroup.todos, newTodo],
      activity: [{ id: Date.now().toString(), user: myName, action: 'la til et nytt gjøremål', time: 'Akkurat nå' }, ...activeGroup.activity]
    });
    setNewTodoInput('');
    setIsAddingTodo(false);
  };

  const handleSaveNotesToFolder = (content: string) => {
      const myName = user?.displayName?.split(' ')[0] || 'Meg';
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
        activity: [{ id: Date.now().toString(), user: myName, action: `lagret et notat i arkivet`, time: 'Akkurat nå' }, ...activeGroup.activity]
      });
      alert(`Notatet ble lagret i arkivet som "${filename}"`);
  };



  const calendarGridCache = React.useMemo(() => {
    const renderCell = (y: number, m: number, day: number, isCurrentMonth: boolean, i: number) => {
      const today = new Date();
      const isToday = isCurrentMonth && day === today.getDate() && m === today.getMonth() && y === today.getFullYear();
      const dateString = new Date(Date.UTC(y, m, day)).toISOString().split('T')[0];
      const dayEvents = (activeGroup?.events || []).filter(e => e.date === dateString);

      return (
        <div key={i} className={cn("bg-white p-2 min-w-0 overflow-hidden", calendarView === 'month' ? "min-h-[100px]" : "min-h-[400px]", isCurrentMonth ? "" : "opacity-40 bg-slate-50")}>
          <span className={cn("text-xs font-bold inline-flex items-center justify-center rounded-full", isToday ? "bg-primary text-white w-6 h-6" : "text-slate-500", calendarView === 'month' ? '' : 'mb-4 text-base')}>
            {day}{calendarView === 'uke' ? '.' : ''}
          </span>
          <div className="mt-2 space-y-1">
            {dayEvents.map(event => {
               const catConf = categoryConfig[event.type || 'meeting'] || categoryConfig.meeting;
               const Icon = catConf.icon;
               const hasLink = event.location?.startsWith('http') || event.location?.startsWith('www');
               return (
                <button key={event.id} onClick={() => setSelectedEvent(event)} className={cn("w-full text-left border text-[10px] font-bold py-1.5 px-2 rounded-lg flex flex-col gap-0.5 transition-colors relative z-10 overflow-hidden", catConf.color)}>
                  <div className="flex items-center gap-1 w-full min-w-0">
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">{event.title}</span>
                    {hasLink && <LinkIcon className="w-3 h-3 shrink-0" />}
                  </div>
                  {calendarView === 'uke' && !event.allDay && <span className="font-normal opacity-70 ml-4 truncate">{event.startTime} - {event.endTime}</span>}
                  {calendarView === 'uke' && event.allDay && <span className="font-normal opacity-70 ml-4 truncate">Hele dagen</span>}
                </button>
               );
            })}
            {calendarView === 'month' && (activeGroup?.todos || []).filter(t => t.dueDate && t.dueDate.includes('-' + String(day).padStart(2, '0'))).map(t => (
               <div key={t.id} className="bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold py-1 px-2 rounded-lg truncate flex items-center gap-1 opacity-80" title={t.task}>
                 <CheckSquare className="w-3 h-3 shrink-0" /> <span className="truncate">{t.task}</span>
               </div>
            ))}
          </div>
        </div>
      );
    };

    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    if (calendarView === 'month') {
      const firstDay = new Date(y, m, 1).getDay();
      const startIndex = firstDay === 0 ? 6 : firstDay - 1; // shift so Mon=0
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const prevMonthDays = new Date(y, m, 0).getDate();
      
      const rows = [];
      for(let row = 0; row < 6; row++) {
          let rowDate;
          if(row * 7 < startIndex) {
              rowDate = new Date(y, m - 1, prevMonthDays - startIndex + (row * 7) + 1);
          } else if(row * 7 < startIndex + daysInMonth) {
              rowDate = new Date(y, m, (row * 7) - startIndex + 1);
          } else {
              rowDate = new Date(y, m + 1, (row * 7) - startIndex - daysInMonth + 1);
          }
          const wn = getWeekNumber(rowDate);
          
          const dayCells = [];
          for(let col = 0; col < 7; col++) {
              const i = row * 7 + col;
              if (i < startIndex) dayCells.push(renderCell(y, m - 1, prevMonthDays - startIndex + i + 1, false, i));
              else if (i < startIndex + daysInMonth) dayCells.push(renderCell(y, m, i - startIndex + 1, true, i));
              else dayCells.push(renderCell(y, m + 1, i - startIndex - daysInMonth + 1, false, i));
          }

          rows.push(
            <div key={`row-${row}`} className="flex gap-px">
              <div className="w-12 shrink-0 bg-slate-50 flex items-start justify-center pt-3 border-r border-slate-100 text-[10px] font-bold text-slate-400">
                {wn}
              </div>
              <div className="flex-1 grid grid-cols-7 gap-px">
                {dayCells}
              </div>
            </div>
          );
      }
      return rows;
    } else if (calendarView === 'uke') {
      let currentDay = currentDate.getDay();
      if (currentDay === 0) currentDay = 7;
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDay + 1);
      
      const cells = [];
      for(let i=0; i<7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(d.getDate() + i);
          cells.push(renderCell(d.getFullYear(), d.getMonth(), d.getDate(), true, i));
      }
      return cells;
    }
    return null;
  }, [currentDate, calendarView, activeGroup?.events, activeGroup?.todos]);

  // Custom rendering when no active group exists
  if (!activeGroup) {
      return (
        <motion.div 
          key="collaboration-empty"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col lg:flex-row gap-6 w-full"
        >
          {/* Left panel */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
                    <button 
          onClick={() => {
            if (pricingTier === 'free') {
              alert("Gratisbrukere kan kun delta i eksisterende grupper via invitasjonslenke.");
              setActiveTab('pricing');
            } else if (pricingTier === 'monthly' && groups.length >= 1) {
              alert("Premium Måned inkluderer maks 1 gruppe. Oppgrader til Semester-pakka for ubegrenset antall grupper.");
              setActiveTab('pricing');
            } else {
              setShowCreateGroup(true);
            }
          }}
          className="w-full border-2 border-dashed border-primary/30 text-primary bg-primary-light/20 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-light/40 transition-colors"
        >
          <Plus className="w-5 h-5" /> Ny gruppe
        </button>
          </div>
          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-[2rem] border border-slate-200 p-12 text-center h-[500px]">
            <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Velkommen til Basen!</h2>
            <p className="text-slate-500 mb-8 max-w-md">
              Her kan du opprette studiegrupper for å samarbeide om prosjekter, dele filer og koordinere arbeid.
            </p>
            {showCreateGroup && (
              <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 w-full sm:w-auto">
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Navn på gruppen..."
                  className="px-4 py-2 rounded-xl text-sm justify-center border-slate-200 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={handleCreateGroup} className="flex-1 sm:flex-none bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-primary/20">Opprett</button>
                  <button onClick={() => setShowCreateGroup(false)} className="flex-1 sm:flex-none bg-slate-200 text-slate-600 px-3 py-2 rounded-xl">Avbryt</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      );
  }

  const inviteLink = `https://blu-hjelperen.no/join/${activeGroup.id.toLowerCase()}`;

  const tabs = [
    { id: 'basen', label: 'Basen (AI & Flashcards)', icon: Sparkles },
    { id: 'oversikt', label: 'Oversikt', icon: Users },
    { id: 'chat', label: 'Klassisk Chat', icon: MessageSquare },
    { id: 'notater', label: 'Notater', icon: FileText },
    { id: 'filer', label: 'Filer & Oppgaver', icon: FolderOpen },
    { id: 'kalender', label: 'Kalender', icon: CalendarIcon },
    { id: 'innstillinger', label: 'Innstillinger', icon: Settings },
  ] as const;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col lg:flex-row gap-6 w-full"
    >
      {/* Left panel: Group Navigation only */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
        <button 
          onClick={() => {
            if (pricingTier === 'free') {
              alert("Gratisbrukere kan kun delta i eksisterende grupper via invitasjonslenke.");
              setActiveTab('pricing');
            } else if (pricingTier === 'monthly' && groups.length >= 1) {
              alert("Premium Måned inkluderer maks 1 gruppe. Oppgrader til Semester-pakka for ubegrenset antall grupper.");
              setActiveTab('pricing');
            } else {
              setShowCreateGroup(true);
            }
          }}
          className="w-full border-2 border-dashed border-primary/30 text-primary bg-primary-light/20 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-light/40 transition-colors"
        >
          <Plus className="w-5 h-5" /> Ny gruppe
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-900 text-sm">Dine Grupper</h3>
          </div>
          <div className="p-2 space-y-1">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => {
                  setActiveGroupId(group.id);
                  setActiveInnerTab('oversikt');
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between",
                  activeGroupId === group.id ? "bg-primary text-white" : "hover:bg-slate-100 text-slate-700"
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm truncate">{group.name}</span>
                </div>
                {group.isDemo && (
                  <span className={cn(
                    "text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                    activeGroupId === group.id ? "bg-white/20 text-white" : "bg-primary-light text-primary"
                  )}>
                    Demo
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Header & Inner Tabs */}
        <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-200">
           <div className="flex flex-col md:flex-row items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-primary-light p-3 rounded-2xl">
                  <Users className="text-primary w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{activeGroup.name}</h2>
                    {activeGroup.isDemo && (
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-blue-200">Demonstrasjon</span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                    ID: {activeGroup.id}
                  </p>
                </div>
              </div>
           </div>

           <div className="mt-6 flex overflow-x-auto custom-scrollbar gap-2 pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                     setActiveInnerTab(tab.id);
                     if (tab.id === 'chat' && activeGroup.unreadChat) {
                       setGroups(prev => prev.map(g => g.id === activeGroup.id ? {...g, unreadChat: false} : g));
                     }
                  }}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors",
                    activeInnerTab === tab.id 
                     ? "bg-slate-900 text-white" 
                     : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                  {tab.id === 'chat' && activeGroup.unreadChat && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
              ))}
            </div>
        </div>

        {/* Tab Content Area */}
        <div className="space-y-6">
          
          {/* TAB 0: BASEN (AI-AGENT & FLASHCARDS) */}
          {activeInnerTab === 'basen' && (
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
          )}

          {/* TAB 1: OVERSIKT */}
          {activeInnerTab === 'oversikt' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-6">
                 {/* Invitasjon */}
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <label className="block text-xs font-bold text-slate-900 mb-3">Invitasjonslenke</label>
                    <div className="flex flex-col gap-2">
                      <input readOnly value={inviteLink} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs text-slate-600 focus:outline-none" />
                      <button onClick={() => copyToClipboard(inviteLink, 'invite')} className={cn("w-full py-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2", copiedId === 'invite' ? "bg-emerald-100 text-emerald-700" : "bg-primary text-white hover:bg-primary-hover")}>
                        {copiedId === 'invite' ? <><Check className="w-4 h-4"/> Kopiert</> : <><Share2 className="w-4 h-4"/> Kopier og del</>}
                      </button>
                    </div>
                 </div>

                 {/* Møterom */}
                 <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <label className="block text-xs font-bold text-slate-900 mb-3 flex items-center gap-2"><Video className="w-4 h-4 text-purple-500"/> Fast møterom</label>
                    <div className="flex flex-col gap-2">
                      <input 
                        value={activeGroup.meetingLink} 
                        onChange={e => updateActiveGroupLocal({meetingLink: e.target.value})} onBlur={() => activeGroup && saveGroupToFirestore(activeGroup.id, {meetingLink: activeGroup.meetingLink})} onKeyDown={(e) => e.key === 'Enter' && activeGroup && saveGroupToFirestore(activeGroup.id, {meetingLink: activeGroup.meetingLink})} 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-xs text-slate-600 focus:outline-none focus:border-purple-300" 
                        placeholder="Lim inn Teams/Zoom lenke her..."
                      />
                      <a href={activeGroup.meetingLink || '#'} target={activeGroup.meetingLink ? "_blank" : undefined} rel="noopener noreferrer" className={cn("w-full py-3 rounded-xl text-xs font-bold transition-colors text-center inline-block", activeGroup.meetingLink ? "bg-purple-100 text-purple-700 hover:bg-purple-200" : "bg-slate-100 text-slate-400 pointer-events-none")}>Bli med i møtet</a>
                    </div>
                 </div>
               </div>

               <div className="space-y-6">
                 {/* Tilstedeværelse */}
                 <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                   <h3 className="font-bold text-slate-900 mb-4">Tilstedeværelse ({activeGroup.members.length})</h3>
                   <div className="space-y-3">
                     {activeGroup.members.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-8 h-8 rounded-full text-xs font-bold text-white flex items-center justify-center relative", m.color)}>
                              {m.name.charAt(0)}
                              {m.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>}
                            </div>
                            <span className="text-sm text-slate-700 font-medium">{m.name}</span>
                          </div>
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{m.role}</span>
                        </div>
                     ))}
                   </div>
                 </div>

                 {/* Siste aktivitet */}
                 <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                   <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                     <Clock className="w-5 h-5 text-primary" /> Siste aktivitet
                   </h3>
                   <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar">
                     {activeGroup.activity.length === 0 ? (
                       <p className="text-xs text-slate-400 py-4">Ingen aktivitet registrert enda.</p>
                     ) : (
                       activeGroup.activity.map((act) => (
                         <div key={act.id} className="flex items-start gap-3">
                           <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-200 border border-slate-300 shrink-0" />
                           <div className="flex-1 min-w-0">
                             <p className="text-xs text-slate-600"><span className="font-bold text-slate-800">{act.user}</span> {act.action}</p>
                             <span className="text-[10px] text-slate-400">{act.time}</span>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                   {activeGroup.isDemo && (
                     <div className="mt-4 pt-4 border-t border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dette er eksempeldata</div>
                   )}
                 </div>
               </div>
            </div>
          )}

          {/* TAB 2: CHAT */}
          {activeInnerTab === 'chat' && (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 h-[600px] flex flex-col">
              <div className="flex-1 bg-slate-50 rounded-2xl p-4 mb-4 overflow-y-auto space-y-4 custom-scrollbar">
                {activeGroup.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                    <MessageSquare className="w-12 h-12 text-slate-200" />
                    <span className="text-sm font-medium">Ingen meldinger enda. Bli den første til å skrive!</span>
                  </div>
                ) : (
                  activeGroup.messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-3", msg.isMe ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0",
                        msg.color === 'emerald' ? "bg-emerald-500" : 
                        msg.color === 'blue' ? "bg-blue-500" : 
                        msg.color === 'amber' ? "bg-amber-500" : "bg-slate-500"
                      )}>
                        {msg.user.charAt(0)}
                      </div>
                      <div className={cn(
                        "p-3 rounded-2xl shadow-sm max-w-[80%]",
                        msg.isMe ? "bg-primary text-white rounded-tr-none" : "bg-white text-slate-700 rounded-tl-none border border-slate-200"
                      )}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <span className={cn("text-[10px] mt-1 block", msg.isMe ? "text-white/60" : "text-slate-400")}>{msg.time}</span>
                      </div>
                    </div>
                  ))
                )}
                {activeGroup.isDemo && (
                  <div className="text-center pt-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 px-3 py-1.5 rounded-full bg-white">Dette er eksempeldata</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={groupInput}
                  onChange={(e) => setGroupInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendGroupMessage()}
                  placeholder="Skriv en melding til gruppen..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button 
                  onClick={handleSendGroupMessage}
                  className="bg-primary text-white px-6 rounded-xl hover:bg-primary-hover shadow-md shadow-primary/20 transition-all font-bold flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: NOTATER */}
          {activeInnerTab === 'notater' && (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-lg">
                 <FileText className="w-5 h-5 text-primary" /> Felles Notatblokk (Pro)
               </h3>
               <RichTextEditor 
                 key={activeGroup.id} 
                 editorContext={{ id: activeGroup.id, name: activeGroup.name }}
                 initialNotes={activeGroup.notes} 
                 onChange={(notes) => updateActiveGroup({notes})} 
                 onSaveToFolder={handleSaveNotesToFolder}
               />
               <p className="text-xs text-slate-500 mt-4 px-2">Tips: Du kan bruke fullskjermsknappen for å få bedre skriveplass.</p>
            </div>
          )}

          {/* TAB 4: FILER OG OPPGAVER */}
          {activeInnerTab === 'filer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Filarkiv / Mappe */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                 <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 mb-6">
                   <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                     <FolderOpen className="w-5 h-5 text-primary" /> Gruppemappe
                   </h3>
                   <div className="flex items-center gap-2 flex-wrap">
                     <button 
                       onClick={exportAllFiles}
                       disabled={activeGroup.files.length === 0}
                       className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 hover:border-blue-200 disabled:opacity-50 rounded-lg transition-colors uppercase tracking-widest"
                     >
                       <Download className="w-3.5 h-3.5" /> Eksporter mape
                     </button>
                     <label className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 rounded-lg transition-colors cursor-pointer uppercase tracking-widest">
                       <Upload className="w-3.5 h-3.5" /> Bla gjennom
                       <input type="file" multiple accept=".doc,.docx,.txt" className="hidden" onChange={handleFileUpload} />
                     </label>
                   </div>
                 </div>
                 
                 <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 flex-1">
                   {activeGroup.files.length === 0 ? (
                     <div className="p-8 h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                       <FolderOpen className="w-12 h-12 text-slate-200" />
                       <span className="text-sm">Ingen filer lagret i denne mappen enda.</span>
                     </div>
                   ) : (
                     <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                       {activeGroup.files.map(file => (
                         <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-100/50 transition-colors bg-white">
                           <div className="flex items-center gap-4">
                             <div className={cn("p-3 rounded-xl flex-shrink-0", file.type === 'folder' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600")}>
                               {file.type === 'folder' ? <FolderOpen className="w-5 h-5" /> : <FileIcon className="w-5 h-5" />}
                             </div>
                             <div className="min-w-0">
                               <p className="text-sm font-bold text-slate-700 truncate">{file.name}</p>
                               <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold truncate">
                                 <span>{file.date}</span>
                                 {file.size && <span>• {file.size}</span>}
                               </div>
                             </div>
                           </div>
                           <div className="flex items-center gap-2 flex-shrink-0">
                             {file.type === 'file' && (
                               <button
                                 onClick={() => exportSingleFile(file.name)}
                                 className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                 title="Last ned"
                               >
                                 <Download className="w-5 h-5" />
                               </button>
                             )}
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
              </div>

              {/* Hvem gjør hva */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 flex flex-col">
                 <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-lg">
                   <CheckSquare className="w-5 h-5 text-primary" /> Hvem gjør hva?
                 </h3>
                 <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] custom-scrollbar pr-2 pb-4">
                   {activeGroup.todos.length === 0 && !isAddingTodo ? (
                     <div className="p-8 h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                       <CheckSquare className="w-12 h-12 text-slate-200" />
                       <span className="text-sm">Ingen oppgaver lagt til.</span>
                     </div>
                   ) : (
                     activeGroup.todos.map(todo => (
                       <div key={todo.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/20 transition-colors">
                         <button 
                           onClick={() => {
                              const newTodos = activeGroup.todos.map(t => t.id === todo.id ? {...t, completed: !t.completed} : t);
                              updateActiveGroup({todos: newTodos});
                           }}
                           className={cn("mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all", todo.completed ? "bg-primary border-primary text-white" : "border-slate-300 bg-white")}
                         >
                            {todo.completed && <Check className="w-3.5 h-3.5" />}
                         </button>
                         <div className="flex-1 min-w-0">
                            <input 
                              value={todo.task}
                              onChange={(e) => {
                                const newTodos = activeGroup.todos.map(t => t.id === todo.id ? {...t, task: e.target.value} : t);
                                updateActiveGroupLocal({todos: newTodos});
                              }}
                              onBlur={() => activeGroup && saveGroupToFirestore(activeGroup.id, {todos: activeGroup.todos})}
                              onKeyDown={(e) => e.key === 'Enter' && activeGroup && saveGroupToFirestore(activeGroup.id, {todos: activeGroup.todos})}
                              className={cn("w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0 m-0 text-sm font-medium", todo.completed ? "text-slate-400 line-through" : "text-slate-700")}
                            />
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Ansvar:</span>
                                <input 
                                  value={todo.assignee}
                                  onChange={(e) => {
                                    const newTodos = activeGroup.todos.map(t => t.id === todo.id ? {...t, assignee: e.target.value} : t);
                                    updateActiveGroupLocal({todos: newTodos});
                                  }}
                                  onBlur={() => activeGroup && saveGroupToFirestore(activeGroup.id, {todos: activeGroup.todos})}
                                  onKeyDown={(e) => e.key === 'Enter' && activeGroup && saveGroupToFirestore(activeGroup.id, {todos: activeGroup.todos})}
                                  className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 w-24 text-primary font-bold uppercase focus:outline-none focus:border-primary"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Frist:</span>
                                <input 
                                  type="date"
                                  value={todo.dueDate || ''}
                                  onChange={(e) => {
                                    const newTodos = activeGroup.todos.map(t => t.id === todo.id ? {...t, dueDate: e.target.value} : t);
                                    updateActiveGroupLocal({todos: newTodos});
                                  }}
                                  onBlur={() => activeGroup && saveGroupToFirestore(activeGroup.id, {todos: activeGroup.todos})}
                                  onKeyDown={(e) => e.key === 'Enter' && activeGroup && saveGroupToFirestore(activeGroup.id, {todos: activeGroup.todos})}
                                  className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 font-bold uppercase focus:outline-none focus:border-primary"
                                />
                              </div>
                            </div>
                         </div>
                       </div>
                     ))
                   )}
                   {isAddingTodo ? (
                     <div className="flex gap-2">
                         <input 
                           type="text" 
                           value={newTodoInput}
                           onChange={(e) => setNewTodoInput(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                           placeholder="Beskriv oppgaven..."
                           className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                         />
                         <button onClick={handleAddTodo} className="bg-primary text-white font-bold px-4 rounded-xl hover:bg-primary-hover">Lagre</button>
                     </div>
                   ) : (
                     <button 
                       onClick={() => setIsAddingTodo(true)}
                       className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-500 rounded-2xl text-sm font-bold hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors"
                     >
                       + Ny oppgave
                     </button>
                   )}
                 </div>
              </div>
            </div>
          )}

          
          {/* TAB 5: KALENDER */}
          {activeInnerTab === 'kalender' && (
             <div className="space-y-6">
                {/* Kalender Header */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary-light p-3 rounded-2xl text-primary">
                      <CalendarRange className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Kalender</h3>
                      <p className="text-sm text-slate-500 font-medium">Få full oversikt over gruppens frister, møter og felles timeplan.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => {
                       setNewEventTitle('');
                       setNewEventDate(new Date().toISOString().split('T')[0]);
                       setNewEventStart('09:00');
                       setNewEventEnd('10:00');
                       setNewEventAllDay(false);
                       setNewEventCategory('meeting');
                       setNewEventLocation('');
                       setNewEventDescription('');
                       setNewEventFiles([]);
                       setShowEventModal(true);
                    }} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-sm whitespace-nowrap">
                      + Ny hendelse
                    </button>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => setCalendarView('month')} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors", calendarView === 'month' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900")}>Måned</button>
                      <button onClick={() => setCalendarView('uke')} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors", calendarView === 'uke' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900")}>Uke</button>
                      <button onClick={() => setCalendarView('dag')} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-colors", calendarView === 'dag' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900")}>Dag</button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Kalender Main View */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                         <h4 className="font-bold text-slate-900">{formattedDateHeader}</h4>
                         <div className="flex gap-2">
                           <button onClick={handlePrevDate} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200">&lt;</button>
                           <button onClick={handleToday} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200">I dag</button>
                           <button onClick={handleNextDate} className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold hover:bg-slate-200">&gt;</button>
                         </div>
                      </div>
                      
                      {calendarView === 'dag' ? (
                        <div className="h-[600px] overflow-y-auto bg-slate-50 relative flex border-t border-slate-100">
                          <div className="w-16 shrink-0 py-4 border-r border-slate-200 bg-white">
                            {Array.from({length: 24}).map((_, i) => (
                              <div key={i} className="h-20 text-right pr-4 text-xs font-medium text-slate-400 relative">
                                <span className="relative -top-2">{String(i).padStart(2, '0')}:00</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex-1 relative">
                            {Array.from({length: 24}).map((_, i) => (
                              <div key={i} className="h-20 border-b border-slate-200"></div>
                            ))}
                            {(() => {
                               const dateString = currentDate.toISOString().split('T')[0];
                               const dayEvents = (activeGroup?.events || []).filter(e => e.date === dateString);
                               dayEvents.sort((a,b) => a.startTime.localeCompare(b.startTime));
                               
                               return dayEvents.map((event, idx) => {
                                 const startHour = parseInt(event.startTime.split(':')[0], 10);
                                 const startMin = parseInt(event.startTime.split(':')[1], 10);
                                 const endHour = parseInt(event.endTime.split(':')[0], 10);
                                 const endMin = parseInt(event.endTime.split(':')[1], 10);
                                 const top = (startHour + startMin / 60) * 80 + 16;
                                 const height = Math.max(((endHour + endMin / 60) - (startHour + startMin / 60)) * 80, 40);
                                 
                                 const overlapping = dayEvents.filter(e => e !== event && 
                                    ((e.startTime >= event.startTime && e.startTime < event.endTime) || 
                                     (e.endTime > event.startTime && e.endTime <= event.endTime)));
                                 
                                 let width = 'calc(100% - 1rem)';
                                 let left = '0.5rem';
                                 
                                 if (overlapping.length > 0) {
                                     width = 'calc(50% - 1rem)';
                                     const isSecond = dayEvents.indexOf(overlapping[0]) < idx;
                                     if (isSecond) left = '50%';
                                 }

                                 const catConf = categoryConfig[event.type || 'meeting'] || categoryConfig.meeting;
                                 const Icon = catConf.icon;
                                 const hasLink = event.location?.startsWith('http') || event.location?.startsWith('www');

                                 return (
                                   <button
                                     key={event.id}
                                     onClick={() => setSelectedEvent(event)}
                                     className={cn("absolute border rounded-xl p-2 text-left transition-all text-xs font-bold", catConf.color)}
                                     style={{ top: `${top}px`, height: `${height}px`, width, left }}
                                   >
                                     <div className="flex items-center gap-1 mb-1 truncate">
                                        <Icon className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{event.title}</span>
                                        {hasLink && <LinkIcon className="w-3 h-3 shrink-0 ml-auto opacity-70" />}
                                     </div>
                                     <div className="font-normal opacity-80">{event.startTime} - {event.endTime}</div>
                                   </button>
                                 );
                               });
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col overflow-x-auto custom-scrollbar">
                          <div className="min-w-[600px] flex flex-col">
                            {calendarView === 'month' ? (
                              <div className="flex border-b border-t border-slate-100 bg-slate-50">
                                <div className="w-12 shrink-0 border-r border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">Uke</div>
                                <div className="flex-1 grid grid-cols-7">
                                  {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(d => (
                                    <div key={d} className="p-2 text-center text-xs font-bold text-slate-500">{d}</div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-7 border-b border-t border-slate-100 bg-slate-50">
                                {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(d => (
                                  <div key={d} className="p-2 text-center text-xs font-bold text-slate-500">{d}</div>
                                ))}
                              </div>
                            )}
                            
                            <div className={cn("bg-slate-200", calendarView === 'month' ? "flex flex-col gap-px" : "grid grid-cols-7 gap-px")}>
                              {calendarGridCache}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sidebar - Importer kalender & Slik gjør du */}
                  <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                       <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2">
                         <CalendarDays className="w-5 h-5 text-emerald-600" />
                         Importer Timeplan
                       </h4>
                       <div className="space-y-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">Lim inn TimeEdit / iCal-lenke for å importere timeplan</label>
                            <div className="flex w-full gap-2 items-center">
                               <input 
                                 type="text" 
                                 value={calendarLinkInput}
                                 onChange={(e) => setCalendarLinkInput(e.target.value)}
                                 placeholder="https://..." 
                                 className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                               />
                               <button 
                                 onClick={handleFetchCalendar}
                                 disabled={isFetchingCalendar}
                                 className="shrink-0 whitespace-nowrap px-4 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                               >
                                 {isFetchingCalendar ? 'Henter...' : 'Hent'}
                               </button>
                            </div>
                            {fetchError && (
                               <p className="text-xs font-bold text-red-500 mt-2">{fetchError}</p>
                            )}
                         </div>
                         
                         <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                           <h5 className="text-sm font-bold text-emerald-900 flex items-center gap-2 mb-3">
                             <Info className="w-4 h-4 text-emerald-600" />
                             Slik gjør du det
                           </h5>
                           <div className="space-y-3 text-sm text-emerald-800 font-medium">
                             <p>
                               <strong className="text-emerald-950 font-black tracking-tight">1. Gå til timeplanen din:</strong> Åpne din timeplan i TimeEdit eller via Canvas.
                             </p>
                             <p>
                               <strong className="text-emerald-950 font-black tracking-tight">2. Finn abonnementslenken:</strong> 
                               {' '}Det er viktig at du velger <strong className="font-bold underline decoration-emerald-300">"Abonner på kalender"</strong> eller kopierer "iCal-lenken".
                             </p>
                             <div className="bg-white/60 p-3 rounded-xl border border-emerald-200 text-xs">
                               <span className="font-bold text-emerald-900">Viktig forskjell:</span> Et abonnement sørger for at timeplanen oppdaterer seg automatisk i appen ved endringer fra skolen. En "eksportert fil" vil være statisk og utdatert.
                             </div>
                             <p>
                               <strong className="text-emerald-950 font-black tracking-tight">3. Kopier og lim inn:</strong> Kopier lenken som starter på <code>webcal://</code> eller <code>https://</code> og lim den inn i feltet over.
                             </p>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>
             </div>
          )}


          {/* TAB 6: INNSTILLINGER */}
          {activeInnerTab === 'innstillinger' && (
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 max-w-2xl">
              <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-lg">
                 <Settings className="w-5 h-5 text-primary" /> Gruppeinnstillinger
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-2">Endre gruppenavn</label>
                  <div className="flex gap-2">
                    <input 
                      value={activeGroup.name}
                      onChange={(e) => updateActiveGroupLocal({name: e.target.value})} onBlur={() => activeGroup && saveGroupToFirestore(activeGroup.id, {name: activeGroup.name})} onKeyDown={(e) => e.key === 'Enter' && activeGroup && saveGroupToFirestore(activeGroup.id, {name: activeGroup.name})}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold text-amber-600 mb-2">Faresone</h4>
                  <p className="text-xs text-slate-500 mb-4">Handlinger her kan medføre tap av data og tilgang.</p>
                  
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button 
                      onClick={() => setShowLeaveConfirm(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors border border-amber-200"
                    >
                      <LogOut className="w-4 h-4" /> Forlat gruppe
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-200"
                    >
                      <Trash2 className="w-4 h-4" /> Slett gruppe
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div key="ap-auto-125-1" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full"
            >
               <h3 className="text-xl font-bold text-slate-900 mb-2">Opprett ny gruppe</h3>
               <p className="text-xs text-slate-500 mb-6">Inviter medstudenter og start samarbeidet.</p>
               
               <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Gruppenavn</label>
               <input 
                 value={newGroupName}
                 onChange={e => setNewGroupName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                 placeholder="F.eks Kollokviegruppe 4"
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium" 
               />
               
               <div className="flex items-center gap-3">
                 <button onClick={() => setShowCreateGroup(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Avbryt</button>
                 <button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="flex-1 py-3 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-colors">Opprett</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Group Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div key="ap-auto-126-1" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
            >
               <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertOctagon className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">Slett gruppe</h3>
               <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                 Er du sikker? Ved å slette gruppen slettes også ALL lagret data permanent, inkludert dokumenter, lister og chat-historikk. Dette kan ikke angres.
               </p>
               
               <div className="flex items-center gap-3">
                 <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Avbryt</button>
                 <button onClick={handleDeleteGroup} className="flex-1 py-3 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Slett permanent</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Group Modal */}
      <AnimatePresence>
        {showLeaveConfirm && (
          <motion.div key="ap-auto-127-1" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
            >
               <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <LogOut className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">Forlat gruppe</h3>
               <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                 Er du sikker på at du vil forlate gruppen? Du vil miste tilgangen til alle delte filer og notater umiddelbart.
               </p>
               
               <div className="flex items-center gap-3">
                 <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Avbryt</button>
                 <button onClick={handleLeaveGroup} className="flex-1 py-3 text-sm font-bold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors">Forlat gruppen</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div key="ap-auto-128-1" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full"
            >
               <h3 className="text-xl font-bold text-slate-900 mb-2">Ny hendelse</h3>
               <p className="text-xs text-slate-500 mb-6">Legg til en felles hendelse i kalenderen.</p>
               
               
<div className="space-y-4 mb-8 max-h-[60vh] overflow-y-auto px-1 pr-3 custom-scrollbar">
 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Tittel</label>
   <input 
     type="text" 
     value={newEventTitle} 
     onChange={(e) => setNewEventTitle(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
     placeholder="F.eks. Gruppemøte"
   />
 </div>
 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Dato</label>
   <input 
     type="date" 
     value={newEventDate} 
     onChange={(e) => setNewEventDate(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
   />
 </div>
 
 <div className="flex items-center gap-2 mb-2 mt-2">
   <input 
     type="checkbox" 
     id="allDayCheckbox"
     checked={newEventAllDay}
     onChange={(e) => setNewEventAllDay(e.target.checked)}
     className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
   />
   <label htmlFor="allDayCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer">Hele dagen</label>
 </div>

 {!newEventAllDay && (
   <div key="ap-auto-128-2" className="grid grid-cols-2 gap-4">
     <div>
       <label className="text-xs font-bold text-slate-500 mb-2 block">Starttid</label>
       <input 
         type="time" 
         value={newEventStart} 
         onChange={(e) => setNewEventStart(e.target.value)}
         className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
       />
     </div>
     <div>
       <label className="text-xs font-bold text-slate-500 mb-2 block">Sluttid</label>
       <input 
         type="time" 
         value={newEventEnd} 
         onChange={(e) => setNewEventEnd(e.target.value)}
         className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
       />
     </div>
   </div>
 )}

 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Kategori</label>
   <select 
     value={newEventCategory}
     onChange={(e) => setNewEventCategory(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
   >
     <option value="meeting">Gruppemøte (Blå)</option>
     <option value="lecture">Forelesning/Undervisning (Lilla)</option>
     <option value="deadline">Frist/Innlevering (Rød)</option>
     <option value="social">Sosialt (Grønn)</option>
   </select>
 </div>

 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Sted / Lenke</label>
   <input 
     type="text" 
     value={newEventLocation} 
     onChange={(e) => setNewEventLocation(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
     placeholder="Fysisk møtested eller Teams/Zoom-lenke"
   />
 </div>

 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Agenda / Beskrivelse</label>
   <textarea 
     value={newEventDescription} 
     onChange={(e) => setNewEventDescription(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px] resize-y bg-white"
     placeholder="Hva skal gjøres?"
   />
 </div>

 <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl">
    <label className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2"><FolderOpen className="w-4 h-4 text-primary"/> Koble til filer (fra Basen)</label>
    {newEventFiles.length > 0 && (
       <div key="ap-auto-128-3" className="flex flex-wrap gap-2 mb-3 mt-2">
         {newEventFiles.map(f => (
            <div key={f.id} className="flex items-center gap-1 bg-white border border-slate-200 text-xs px-2 py-1 rounded-lg shadow-sm">
               <FileIcon className="w-3 h-3 text-slate-400" />
               <span className="truncate max-w-[120px] font-medium text-slate-700">{f.name}</span>
               <button onClick={() => setNewEventFiles(prev => prev.filter(file => file.id !== f.id))} className="text-slate-400 hover:text-red-500 ml-1"><X className="w-3 h-3"/></button>
            </div>
         ))}
       </div>
    )}
    {!showFilePicker ? (
        <button onClick={() => setShowFilePicker(true)} className="text-xs font-bold text-primary bg-primary-light px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors w-full sm:w-auto mt-1">
          + Velg fil fra Basen
        </button>
    ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto mt-2">
           {activeGroup?.files?.length === 0 ? (
             <p className="text-xs text-slate-500 p-2">Ingen filer i gruppen.</p>
           ) : (
             activeGroup?.files?.map(f => (
               <button 
                 key={f.id} 
                 onClick={() => {
                    if(!newEventFiles.find(xf => xf.id === f.id)) {
                       setNewEventFiles([...newEventFiles, f]);
                    }
                    setShowFilePicker(false);
                 }}
                 className="w-full text-left p-2 hover:bg-slate-50 flex items-center gap-2 text-xs text-slate-700 font-medium rounded transition-colors"
               >
                 {f.type === 'folder' ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <FileIcon className="w-4 h-4 text-blue-500" />}
                 <span className="truncate">{f.name}</span>
               </button>
             ))
           )}
           <button onClick={() => setShowFilePicker(false)} className="w-full text-center p-2 text-[10px] uppercase font-bold text-slate-400 hover:bg-slate-50 transition-colors mt-2 rounded">Avbryt</button>
        </div>
    )}
 </div>
</div>

               
               <div className="flex items-center gap-3">
                 <button onClick={() => setShowEventModal(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Avbryt</button>
                 <button onClick={() => {
                   if (newEventTitle) {
                     const updatedEvents = [...(activeGroup?.events || []), {
                        id: Date.now().toString(),
                        title: newEventTitle,
                        date: newEventDate,
                        startTime: newEventAllDay ? '00:00' : newEventStart,
                        endTime: newEventAllDay ? '23:59' : newEventEnd,
                        allDay: newEventAllDay,
                        type: newEventCategory,
                        location: newEventLocation,
                        description: newEventDescription,
                        files: newEventFiles
                      }];
                      updateActiveGroup({ events: updatedEvents });;
                     setShowEventModal(false);
                     setNewEventTitle('');
                   }
                 }} className="flex-1 py-3 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-hover transition-colors shadow-md shadow-primary/20">Lagre hendelse</button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div key="ap-auto-129-1" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full relative"
            >
               <button onClick={() => { setSelectedEvent(null); setIsEditingEvent(false); }} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full transition-colors">
                 <X className="w-4 h-4" />
               </button>

               {!isEditingEvent ? (
                   <>
                       
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", categoryConfig[selectedEvent.type || 'meeting']?.color)}>
            {(() => {
                const Icon = categoryConfig[selectedEvent.type || 'meeting']?.icon || Users;
                return <Icon className="w-6 h-6" />;
            })()}
        </div>
    
                       
                       <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedEvent.title}</h3>
                       <p className="text-sm font-medium text-slate-500 mb-6">
                         {(() => {
                            const d = new Date(selectedEvent.date);
                            return `${d.getDate()}. ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                         })()}
                       </p>
                       
                       
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 mb-8">
                  {!selectedEvent.allDay && (
                    <>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-400">Starttid</span>
                         <span className="text-sm font-bold text-slate-700">{selectedEvent.startTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-400">Sluttid</span>
                         <span className="text-sm font-bold text-slate-700">{selectedEvent.endTime}</span>
                      </div>
                    </>
                  )}
                  {selectedEvent.allDay && (
                      <div key="ap-auto-129-2" className="flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-400">Tidspunkt</span>
                         <span className="text-sm font-bold text-slate-700">Hele dagen</span>
                      </div>
                  )}
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-bold text-slate-400">Kategori</span>
                     <span className="text-sm font-bold text-slate-700">{categoryConfig[selectedEvent.type || 'meeting']?.label || 'Gruppemøte'}</span>
                  </div>
                  {selectedEvent.location && (
                      <div key="ap-auto-129-3" className="flex items-center justify-between">
                         <span className="text-xs font-bold text-slate-400">Sted / Lenke</span>
                         {(selectedEvent.location.startsWith('http') || selectedEvent.location.startsWith('www')) ? (
                           <a href={selectedEvent.location.startsWith('http') ? selectedEvent.location : `https://${selectedEvent.location}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline truncate max-w-[200px] text-right flex items-center gap-1 justify-end"><LinkIcon className="w-3 h-3"/> Se lenke</a>
                         ) : (
                           <span className="text-sm font-bold text-slate-700 truncate max-w-[200px] text-right">{selectedEvent.location}</span>
                         )}
                      </div>
                  )}
               </div>
               
               {selectedEvent.description && (
                  <div key="ap-auto-129-4" className="mb-6">
                     <h4 className="text-xs font-bold text-slate-500 mb-1">Agenda / Beskrivelse</h4>
                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap">
                        {selectedEvent.description}
                     </div>
                  </div>
               )}

               {selectedEvent.files && selectedEvent.files.length > 0 && (
                  <div key="ap-auto-129-5" className="mb-8">
                     <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5"/> Filer</h4>
                     <div className="flex flex-col gap-2">
                        {selectedEvent.files.map((f: any) => (
                           <a key={f.id} href="#" className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                              <FileIcon className="w-4 h-4 text-primary" />
                              <span className="text-xs font-medium text-slate-700 truncate">{f.name}</span>
                              <Download className="w-3 h-3 text-slate-400 ml-auto" />
                           </a>
                        ))}
                     </div>
                  </div>
               )}

<div className="flex gap-3">
                         <button onClick={() => { setSelectedEvent(null); setIsEditingEvent(false); }} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Lukk</button>
                         <button onClick={() => { 
                             setIsEditingEvent(true);
                             setNewEventTitle(selectedEvent.title);
                             setNewEventDate(selectedEvent.date);
                             setNewEventStart(selectedEvent.startTime || '09:00');
                             setNewEventEnd(selectedEvent.endTime || '10:00');
                             setNewEventAllDay(selectedEvent.allDay || false);
                             setNewEventCategory(selectedEvent.type || 'meeting');
                             setNewEventLocation(selectedEvent.location || '');
                             setNewEventDescription(selectedEvent.description || '');
                             setNewEventFiles(selectedEvent.files || []);
                         }} className="flex-1 py-3 text-sm font-bold text-slate-700 bg-slate-200 rounded-xl hover:bg-slate-300 transition-colors">Rediger</button>
                       </div>
                   </>
               ) : (
                   <>
                       <h3 className="text-xl font-bold text-slate-900 mb-2">Rediger hendelse</h3>
                       <p className="text-xs text-slate-500 mb-6">Oppdater detaljene for hendelsen.</p>
                       
                       
<div className="space-y-4 mb-8 max-h-[60vh] overflow-y-auto px-1 pr-3 custom-scrollbar">
 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Tittel</label>
   <input 
     type="text" 
     value={newEventTitle} 
     onChange={(e) => setNewEventTitle(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
     placeholder="F.eks. Gruppemøte"
   />
 </div>
 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Dato</label>
   <input 
     type="date" 
     value={newEventDate} 
     onChange={(e) => setNewEventDate(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
   />
 </div>
 
 <div className="flex items-center gap-2 mb-2 mt-2">
   <input 
     type="checkbox" 
     id="allDayCheckbox"
     checked={newEventAllDay}
     onChange={(e) => setNewEventAllDay(e.target.checked)}
     className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary cursor-pointer"
   />
   <label htmlFor="allDayCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer">Hele dagen</label>
 </div>

 {!newEventAllDay && (
   <div key="ap-auto-129-6" className="grid grid-cols-2 gap-4">
     <div>
       <label className="text-xs font-bold text-slate-500 mb-2 block">Starttid</label>
       <input 
         type="time" 
         value={newEventStart} 
         onChange={(e) => setNewEventStart(e.target.value)}
         className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
       />
     </div>
     <div>
       <label className="text-xs font-bold text-slate-500 mb-2 block">Sluttid</label>
       <input 
         type="time" 
         value={newEventEnd} 
         onChange={(e) => setNewEventEnd(e.target.value)}
         className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
       />
     </div>
   </div>
 )}

 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Kategori</label>
   <select 
     value={newEventCategory}
     onChange={(e) => setNewEventCategory(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
   >
     <option value="meeting">Gruppemøte (Blå)</option>
     <option value="lecture">Forelesning/Undervisning (Lilla)</option>
     <option value="deadline">Frist/Innlevering (Rød)</option>
     <option value="social">Sosialt (Grønn)</option>
   </select>
 </div>

 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Sted / Lenke</label>
   <input 
     type="text" 
     value={newEventLocation} 
     onChange={(e) => setNewEventLocation(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-white"
     placeholder="Fysisk møtested eller Teams/Zoom-lenke"
   />
 </div>

 <div>
   <label className="text-xs font-bold text-slate-500 mb-2 block">Agenda / Beskrivelse</label>
   <textarea 
     value={newEventDescription} 
     onChange={(e) => setNewEventDescription(e.target.value)}
     className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[80px] resize-y bg-white"
     placeholder="Hva skal gjøres?"
   />
 </div>

 <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl">
    <label className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-2"><FolderOpen className="w-4 h-4 text-primary"/> Koble til filer (fra Basen)</label>
    {newEventFiles.length > 0 && (
       <div key="ap-auto-129-7" className="flex flex-wrap gap-2 mb-3 mt-2">
         {newEventFiles.map(f => (
            <div key={f.id} className="flex items-center gap-1 bg-white border border-slate-200 text-xs px-2 py-1 rounded-lg shadow-sm">
               <FileIcon className="w-3 h-3 text-slate-400" />
               <span className="truncate max-w-[120px] font-medium text-slate-700">{f.name}</span>
               <button onClick={() => setNewEventFiles(prev => prev.filter(file => file.id !== f.id))} className="text-slate-400 hover:text-red-500 ml-1"><X className="w-3 h-3"/></button>
            </div>
         ))}
       </div>
    )}
    {!showFilePicker ? (
        <button onClick={() => setShowFilePicker(true)} className="text-xs font-bold text-primary bg-primary-light px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors w-full sm:w-auto mt-1">
          + Velg fil fra Basen
        </button>
    ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto mt-2">
           {activeGroup?.files?.length === 0 ? (
             <p className="text-xs text-slate-500 p-2">Ingen filer i gruppen.</p>
           ) : (
             activeGroup?.files?.map(f => (
               <button 
                 key={f.id} 
                 onClick={() => {
                    if(!newEventFiles.find(xf => xf.id === f.id)) {
                       setNewEventFiles([...newEventFiles, f]);
                    }
                    setShowFilePicker(false);
                 }}
                 className="w-full text-left p-2 hover:bg-slate-50 flex items-center gap-2 text-xs text-slate-700 font-medium rounded transition-colors"
               >
                 {f.type === 'folder' ? <FolderOpen className="w-4 h-4 text-amber-500" /> : <FileIcon className="w-4 h-4 text-blue-500" />}
                 <span className="truncate">{f.name}</span>
               </button>
             ))
           )}
           <button onClick={() => setShowFilePicker(false)} className="w-full text-center p-2 text-[10px] uppercase font-bold text-slate-400 hover:bg-slate-50 transition-colors mt-2 rounded">Avbryt</button>
        </div>
    )}
 </div>
</div>

                       
                       <div className="flex flex-col gap-3">
                         <div className="flex items-center gap-3">
                             <button onClick={() => setIsEditingEvent(false)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Avbryt</button>
                             <button onClick={() => {
                               if (newEventTitle) {
                                 const updatedEvents = (activeGroup?.events || []).map(e => e.id === selectedEvent.id ? {
                                     ...e,
                                     title: newEventTitle,
                                     date: newEventDate,
                                     startTime: newEventAllDay ? '00:00' : newEventStart,
                                     endTime: newEventAllDay ? '23:59' : newEventEnd,
                                     allDay: newEventAllDay,
                                     type: newEventCategory,
                                     location: newEventLocation,
                                     description: newEventDescription,
                                     files: newEventFiles
                                 } : e);
                                 updateActiveGroup({ events: updatedEvents });
                                 const updated = {
                                     ...selectedEvent,
                                     title: newEventTitle,
                                     date: newEventDate,
                                     startTime: newEventAllDay ? '00:00' : newEventStart,
                                     endTime: newEventAllDay ? '23:59' : newEventEnd,
                                     allDay: newEventAllDay,
                                     type: newEventCategory,
                                     location: newEventLocation,
                                     description: newEventDescription,
                                     files: newEventFiles
                                 };
                                 setSelectedEvent(updated);
                                 setIsEditingEvent(false);
                               }
                             }} className="flex-1 py-3 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary-hover transition-colors shadow-md shadow-primary/20">Lagre endringer</button>
                         </div>
                         <button onClick={() => {
                             updateActiveGroup({ events: (activeGroup?.events || []).filter((e: any) => e.id !== selectedEvent.id) });
                             setSelectedEvent(null);
                             setIsEditingEvent(false);
                         }} className="w-full py-3 text-sm font-bold text-red-500 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 hover:border-red-300 transition-colors">Slett hendelse</button>
                       </div>
                   </>
               )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
