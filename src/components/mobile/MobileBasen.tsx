import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  Calendar, 
  Video, 
  Plus, 
  Check, 
  Copy, 
  Share2, 
  Clock, 
  Sparkles, 
  Send, 
  GraduationCap, 
  AlertOctagon, 
  X, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CalendarDays,
  List,
  Edit2,
  UserPlus,
  ChevronDown,
  FileCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Group, Message, Member, GroupEvent } from '../Basen';

export interface MobileBasenProps {
  groups: Group[];
  activeGroup?: Group;
  activeGroupId: string;
  setActiveGroupId: (id: string) => void;
  onNewGroup: () => void;
  updateActiveGroup: (updates: Partial<Group>) => void;
  user?: any;
  onCopyInvite: () => void;
  copiedInvite: boolean;
  pricingTier?: string;
  setParentActiveTab?: (tab: any) => void;
}

type MobileTab = 'oversikt' | 'chat' | 'notater' | 'kalender';

const APPOINTMENT_TYPES = [
  { id: 'guidance', label: 'Veiledningstime', sub: 'Praksisveileder / faglærer', icon: GraduationCap, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'meeting', label: 'Gruppemøte', sub: 'Kollokvieøkt / forberedelse', icon: Users, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'assignment', label: 'Arbeidskrav', sub: 'Obligatorisk innlevering', icon: FileCheck, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'deadline', label: 'Eksamen / Frist', sub: 'Avsluttende vurdering', icon: AlertOctagon, color: 'bg-rose-100 text-rose-700 border-rose-200' }
] as const;

export const MobileBasen: React.FC<MobileBasenProps> = ({
  groups,
  activeGroup,
  activeGroupId,
  setActiveGroupId,
  onNewGroup,
  updateActiveGroup,
  user,
  onCopyInvite,
  copiedInvite,
  pricingTier = 'semester',
  setParentActiveTab
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('oversikt');
  const [showGroupSwitcher, setShowGroupSwitcher] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Notes state
  const [notesCopied, setNotesCopied] = useState(false);
  const [notesSaveStatus, setNotesSaveStatus] = useState<string>('Sky-synkronisert');

  // Calendar states
  const [calendarView, setCalendarView] = useState<'agenda' | 'month'>('agenda');
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  // New event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState<'guidance' | 'meeting' | 'deadline' | 'assignment'>('meeting');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventStartTime, setEventStartTime] = useState('10:00');
  const [eventEndTime, setEventEndTime] = useState('11:30');
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventLocation, setEventLocation] = useState('Teams');
  const [eventDescription, setEventDescription] = useState('');

  // Meeting link editing
  const [isEditingMeetingLink, setIsEditingMeetingLink] = useState(false);
  const [meetingLinkInput, setMeetingLinkInput] = useState(activeGroup?.meetingLink || '');

  // 1. Send chat message
  const handleSendMessage = () => {
    if (!chatInput.trim() || !activeGroup) return;
    const myName = user?.displayName?.split(' ')[0] || 'Meg';
    const newMsg: Message = {
      id: 'msg-' + Date.now(),
      user: myName,
      content: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: 'indigo',
      isMe: true
    };
    updateActiveGroup({
      messages: [...(activeGroup.messages || []), newMsg]
    });
    setChatInput('');
  };

  // 2. Save notes
  const handleNotesChange = (text: string) => {
    updateActiveGroup({ notes: text });
    setNotesSaveStatus('Lagrer...');
    setTimeout(() => {
      setNotesSaveStatus('Sky-synkronisert');
    }, 600);
  };

  const handleCopyNotes = () => {
    if (!activeGroup?.notes) return;
    navigator.clipboard.writeText(activeGroup.notes).then(() => {
      setNotesCopied(true);
      setTimeout(() => setNotesCopied(false), 2000);
    });
  };

  const handleInsertTemplate = (templateText: string) => {
    if (!activeGroup) return;
    const currentNotes = activeGroup.notes || '';
    const separator = currentNotes.trim().length > 0 ? '\n\n' : '';
    const updated = currentNotes + separator + templateText;
    handleNotesChange(updated);
  };

  // 3. Calendar logic: save new event
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !activeGroup) return;

    const newEv: GroupEvent = {
      id: 'ev-' + Date.now(),
      title: eventTitle.trim(),
      type: eventType,
      category: eventType,
      date: eventDate,
      startTime: eventStartTime,
      endTime: eventEndTime,
      allDay: eventAllDay,
      location: eventLocation.trim() || 'Teams',
      description: eventDescription.trim()
    };

    updateActiveGroup({
      events: [...(activeGroup.events || []), newEv]
    });

    // Reset form
    setEventTitle('');
    setEventDescription('');
    setShowEventModal(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!activeGroup) return;
    if (window.confirm('Vil du slette denne avtalen?')) {
      const updatedEvents = (activeGroup.events || []).filter(e => e.id !== eventId);
      updateActiveGroup({ events: updatedEvents });
    }
  };

  // Sort events chronologically
  const sortedEvents = useMemo(() => {
    if (!activeGroup?.events) return [];
    return [...activeGroup.events].sort((a, b) => {
      const dateA = a.date + ' ' + (a.startTime || '00:00');
      const dateB = b.date + ' ' + (b.startTime || '00:00');
      return dateA.localeCompare(dateB);
    });
  }, [activeGroup?.events]);

  // Find next upcoming event
  const nextEvent = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return sortedEvents.find(e => e.date >= today) || sortedEvents[0];
  }, [sortedEvents]);

  // Month grid helper
  const monthCalendarData = useMemo(() => {
    const y = currentMonthDate.getFullYear();
    const m = currentMonthDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const startIndex = firstDay === 0 ? 6 : firstDay - 1; // Mandag = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < startIndex; i++) {
      days.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr });
    }
    return days;
  }, [currentMonthDate]);

  const monthNames = [
    'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 
    'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <div className="w-full max-w-xl mx-auto pb-28 px-3 sm:px-4 space-y-4">
      
      {/* 1. TOPP-BANNER (Tydelig fane-header med full bredde og ryddig gruppevelger) */}
      <div className="bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          
          {/* Fane-navn: Basen tar hele bredden, med "Kollokvie i lomma" på linjen under */}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-white/20 backdrop-blur-md rounded-xl text-white">
                <Users className="w-4 h-4 text-purple-200" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white font-serif">
                Basen
              </h1>
            </div>
            <p className="text-xs text-purple-200 font-medium mt-0.5 pl-0.5">
              Kollokvie i lomma
            </p>
          </div>

          {/* Aktiv gruppe (venstre) + "Ny gruppe" på samme linje (høyre) */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              onClick={() => setShowGroupSwitcher(true)}
              className="flex-1 min-w-0 text-left group/btn p-2 -ml-2 rounded-2xl hover:bg-white/10 active:bg-white/15 transition-all flex items-center gap-2 cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                    {activeGroup ? activeGroup.name : 'Ingen gruppe valgt'}
                  </h2>
                  <div className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-white shrink-0 group-hover/btn:bg-white/30 transition-all">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-[11px] text-purple-100 mt-0.5 leading-tight truncate">
                  {activeGroup 
                    ? `${activeGroup.members?.length || 1} medlemmer • ${(activeGroup.events || []).length} planlagte avtaler` 
                    : 'Trykk for å velge gruppe'}
                </p>
              </div>
            </button>

            <button
              onClick={onNewGroup}
              className="px-3 py-2 bg-white/20 hover:bg-white/30 active:bg-white/35 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs backdrop-blur-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ny gruppe</span>
            </button>
          </div>

          {/* Hurtig-knapp for videorom */}
          {activeGroup && (
            <div className="mt-3.5 flex items-center gap-2">
              {activeGroup.meetingLink ? (
                <a
                  href={activeGroup.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold flex items-center justify-between text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Video className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="truncate">Fast videomøterom</span>
                  </span>
                  <span className="text-[11px] bg-emerald-500 text-white px-2 py-0.5 rounded-md font-extrabold shrink-0 ml-1">
                    Bli med
                  </span>
                </a>
              ) : (
                <button
                  onClick={() => {
                    setActiveTab('oversikt');
                    setIsEditingMeetingLink(true);
                  }}
                  className="flex-1 py-2 px-3 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold flex items-center gap-2 text-white transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4 text-purple-200 shrink-0" />
                  <span>Legg til Teams- eller Meet-lenke</span>
                </button>
              )}

              <button
                onClick={onCopyInvite}
                title="Inviter medstudenter"
                className="py-2 px-3 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold flex items-center gap-1.5 text-white transition-colors cursor-pointer shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedInvite ? '✓ Kopiert' : 'Inviter'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hvis ingen gruppe er valgt */}
      {!activeGroup ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-slate-900 text-base">Ingen gruppe valgt</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            Opprett en ny kollokviegruppe for studievennene dine, eller velg en gruppe.
          </p>
          <div className="space-y-2 pt-1">
            <button
              onClick={onNewGroup}
              className="w-full py-3 px-4 bg-purple-600 text-white rounded-2xl font-bold text-sm shadow-md hover:bg-purple-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Opprett kollokviegruppe
            </button>
            {groups.length > 0 && (
              <button
                onClick={() => setShowGroupSwitcher(true)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-purple-600" /> Velg eksisterende gruppe ({groups.length})
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* 3. DE FIRE ELEMENTENE: SEGMENTERT 4-DELT NAVIGASJON (Ihht skjermdump/plan) */}
          <div className="grid grid-cols-4 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/90 gap-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('oversikt')}
              className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'oversikt'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Oversikt</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer relative ${
                activeTab === 'chat'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
              {activeGroup.unreadChat && (
                <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-2" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('notater')}
              className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                activeTab === 'notater'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notater</span>
            </button>

            <button
              onClick={() => setActiveTab('kalender')}
              className={`py-2 px-1 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer relative ${
                activeTab === 'kalender'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Kalender</span>
              {(activeGroup.events?.length || 0) > 0 && (
                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded-full font-black ml-0.5">
                  {activeGroup.events?.length}
                </span>
              )}
            </button>
          </div>

          {/* 4. ELEMENTVISNING */}

          {/* ==================================================== */}
          {/* ELEMENT 1: OVERSIKT (Gruppestatus, medlemmer, hurtiginfo) */}
          {/* ==================================================== */}
          {activeTab === 'oversikt' && (
            <div className="space-y-3.5">
              
              {/* Neste planlagte avtale / milepæl */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600" /> Neste planlagte avtale
                  </span>
                  <button
                    onClick={() => {
                      setActiveTab('kalender');
                      setShowEventModal(true);
                    }}
                    className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ny avtale
                  </button>
                </div>

                {nextEvent ? (
                  <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between gap-2.5 overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          nextEvent.type === 'guidance' 
                            ? 'bg-purple-200/70 text-purple-900' 
                            : nextEvent.type === 'deadline' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {nextEvent.type === 'guidance' ? 'Veiledningstime' : nextEvent.type === 'deadline' ? 'Innleveringsfrist' : 'Gruppemøte'}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">{nextEvent.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">{nextEvent.title}</h4>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0">{nextEvent.allDay ? 'Hele dagen' : `${nextEvent.startTime || '10:00'} - ${nextEvent.endTime || '11:00'}`}</span>
                        {nextEvent.location && (
                          <span 
                            className="truncate text-slate-400 font-medium min-w-0" 
                            title={nextEvent.location}
                          >
                            • {nextEvent.location.startsWith('http') ? (nextEvent.location.includes('zoom') ? 'Zoom-møte' : nextEvent.location.includes('teams') ? 'Teams-møte' : 'Digital møtelenke') : nextEvent.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('kalender')}
                      className="text-xs text-purple-700 font-bold bg-white px-2.5 py-1.5 rounded-xl border border-purple-200 shadow-2xs hover:bg-purple-50 active:scale-95 cursor-pointer shrink-0 transition-all flex items-center gap-0.5 ml-2"
                    >
                      <span>Vis</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-xs text-slate-500">Ingen kommende avtaler registrert.</p>
                  </div>
                )}
              </div>

              {/* Videomøterom innstilling */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-indigo-600" /> Fast videomøterom (Teams / Zoom / Meet)
                  </span>
                  <button
                    onClick={() => setIsEditingMeetingLink(prev => !prev)}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> {isEditingMeetingLink ? 'Lukk' : 'Endre'}
                  </button>
                </div>

                {isEditingMeetingLink ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={meetingLinkInput}
                      onChange={e => setMeetingLinkInput(e.target.value)}
                      placeholder="https://teams.microsoft.com/l/meetup-join/..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-purple-600"
                    />
                    <button
                      onClick={() => {
                        updateActiveGroup({ meetingLink: meetingLinkInput.trim() });
                        setIsEditingMeetingLink(false);
                      }}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700"
                    >
                      Lagre
                    </button>
                  </div>
                ) : activeGroup.meetingLink ? (
                  <div className="flex items-center justify-between p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs">
                    <span className="text-indigo-900 font-medium truncate max-w-[200px]">
                      {activeGroup.meetingLink}
                    </span>
                    <a
                      href={activeGroup.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                    >
                      <span>Åpne</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Ingen fast møtelenke lagt til enda.</p>
                )}
              </div>

              {/* Medlemmer */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-600" /> Medlemmer ({activeGroup.members?.length || 1})
                  </span>
                  <button
                    onClick={onCopyInvite}
                    className="text-[11px] font-bold text-purple-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> {copiedInvite ? 'Lenke kopiert!' : 'Inviter'}
                  </button>
                </div>

                <div className="space-y-2">
                  {(activeGroup.members || []).map((m, idx) => (
                    <div 
                      key={m.id || `mob-mem-${m.name}-${idx}`} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 ${
                          m.color || 'bg-indigo-600'
                        }`}>
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{m.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{m.role || 'Medlem'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${m.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-[10px] text-slate-400">{m.isOnline ? 'Aktiv' : 'Frakoblet'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ELEMENT 2: GRUPPECHAT (Rask dialog med gruppa) */}
          {/* ==================================================== */}
          {activeTab === 'chat' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-purple-600" /> Kollokvie-dialog
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {(activeGroup.messages || []).length} meldinger
                </span>
              </div>

              {/* Meldingsstrøm */}
              <div className="max-h-[380px] min-h-[220px] overflow-y-auto space-y-3 p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 custom-scrollbar">
                {(!activeGroup.messages || activeGroup.messages.length === 0) ? (
                  <div className="text-center py-10 text-slate-400 text-xs space-y-1">
                    <p className="font-semibold">Ingen meldinger i gruppen enda.</p>
                    <p className="text-[11px] text-slate-400">Si hei eller velg et faglig spørsmål nedenfor!</p>
                  </div>
                ) : (
                  activeGroup.messages.map((msg, idx) => (
                    <div
                      key={msg.id || `mob-msg-${idx}`}
                      className={`flex gap-2.5 ${msg.isMe ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        msg.color === 'emerald' ? 'bg-emerald-600' :
                        msg.color === 'rose' ? 'bg-rose-600' :
                        msg.color === 'blue' ? 'bg-blue-600' : 'bg-purple-600'
                      }`}>
                        {msg.user[0]}
                      </div>
                      <div className={`max-w-[80%] ${msg.isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`flex items-center gap-1.5 mb-1 text-[10px] text-slate-400 ${msg.isMe ? 'justify-end' : ''}`}>
                          <span className="font-bold text-slate-700">{msg.user}</span>
                          <span>{msg.time}</span>
                        </div>
                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.isMe 
                            ? 'bg-purple-600 text-white rounded-tr-xs' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Faglige hurtig-prompts (100% synlig – ingen sideveis scrolling) */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                {[
                  {
                    icon: FileText,
                    label: 'Oppsummer',
                    fullPrompt: 'Oppsummer hva vi har diskutert',
                  },
                  {
                    icon: Calendar,
                    label: 'Møteagenda',
                    fullPrompt: 'Foreslå neste møteagenda',
                  },
                  {
                    icon: Sparkles,
                    label: '3 spørsmål',
                    desktopLabel: '3 problemstillinger',
                    fullPrompt: '3 didaktiske problemstillinger',
                  }
                ].map((item, idx) => (
                  <button
                    key={`prompt-${idx}`}
                    type="button"
                    onClick={() => {
                      setChatInput(item.fullPrompt);
                      chatInputRef.current?.focus();
                    }}
                    title={item.fullPrompt}
                    className="py-1.5 px-1.5 bg-slate-100/90 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 border border-slate-200/80 active:scale-95 text-slate-700 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs select-none min-w-0"
                  >
                    <item.icon className="w-3 h-3 text-purple-600 shrink-0" />
                    <span className="truncate">
                      {item.desktopLabel ? (
                        <>
                          <span className="hidden min-[380px]:inline">{item.desktopLabel}</span>
                          <span className="min-[380px]:hidden">{item.label}</span>
                        </>
                      ) : (
                        item.label
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* Input og send-knapp */}
              <div className="flex items-center gap-2">
                <input
                  ref={chatInputRef}
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Skriv til gruppen..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:border-purple-600"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim()}
                  className="p-2.5 bg-purple-600 text-white rounded-xl disabled:opacity-40 hover:bg-purple-700 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* ELEMENT 3: FELLESNOTATER (Delte notater, idémyldring, forberedelser) */}
          {/* ==================================================== */}
          {activeTab === 'notater' && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-600" /> Felles notatblokk
                  </h3>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {notesSaveStatus}
                  </span>
                </div>
                <button
                  onClick={handleCopyNotes}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{notesCopied ? 'Kopiert!' : 'Kopier alt'}</span>
                </button>
              </div>

              {/* Hurtig-innsetting av maler (Ingen sideveis scrolling) */}
              <div>
                <span className="text-slate-400 text-[10px] font-bold block mb-1">Hurtigmal for notater:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {[
                    { label: '+ Didaktisk idé', text: '### Didaktisk idé\n- **Mål:** \n- **Målgruppe:** \n- **Gjennomføring:** ' },
                    { label: '+ Observasjon', text: '### Observasjon i felt\n- **Kontekst:** \n- **Hva barna gjorde/sa:** \n- **Refleksjon:** ' },
                    { label: '+ Teori & Rammeplan', text: '### Teori & Rammeplan\n- **Kapittel:** \n- **Fagbegrep:** \n- **Didaktisk analyse:** ' },
                    { label: '+ Møteagenda', text: '### Agenda for neste møte\n1. Gjennomgang av arbeidskrav\n2. Fordeling av oppgaver\n3. Eventuelt' }
                  ].map((tmpl, idx) => (
                    <button
                      key={`tmpl-${idx}`}
                      type="button"
                      onClick={() => handleInsertTemplate(tmpl.text)}
                      className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl font-semibold transition-colors cursor-pointer border border-purple-200/60 text-center truncate shadow-2xs active:scale-95"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notat-tekstområde */}
              <textarea
                value={activeGroup.notes || ''}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Skriv felles notater, observasjoner og praksisrefleksjoner her..."
                rows={12}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-normal text-slate-800 focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20 leading-relaxed custom-scrollbar"
              />
            </div>
          )}

          {/* ==================================================== */}
          {/* ELEMENT 4: KALENDER (Agenda/liste, månedsvisning + avtaler) */}
          {/* ==================================================== */}
          {activeTab === 'kalender' && (
            <div className="space-y-3.5">
              
              {/* Kalender-kontrollpanel */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 flex items-center justify-between shadow-2xs">
                {/* Veksler: Agenda (liste) vs Måned */}
                <div className="flex items-center p-0.5 bg-slate-100 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setCalendarView('agenda')}
                    className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      calendarView === 'agenda' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Agenda</span>
                  </button>
                  <button
                    onClick={() => setCalendarView('month')}
                    className={`py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      calendarView === 'month' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-500'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Måned</span>
                  </button>
                </div>

                {/* Knapp for å opprette avtale */}
                <button
                  onClick={() => setShowEventModal(true)}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ny avtale</span>
                </button>
              </div>

              {/* 1. AGENDA / LISTEVISNING (Standard ihht planen) */}
              {calendarView === 'agenda' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800">
                      Kommende avtaler og frister ({sortedEvents.length})
                    </span>
                    {selectedCalendarDate && (
                      <button
                        onClick={() => setSelectedCalendarDate(null)}
                        className="text-[11px] text-purple-600 font-bold hover:underline"
                      >
                        Vis alle datoer
                      </button>
                    )}
                  </div>

                  {sortedEvents.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs space-y-2">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">Ingen planlagte avtaler enda.</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Legg til en veiledningstime med praksislærer, et kollokviemøte eller en innleveringsfrist!
                      </p>
                      <button
                        onClick={() => setShowEventModal(true)}
                        className="mt-2 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Opprett første avtale
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {sortedEvents
                        .filter(ev => !selectedCalendarDate || ev.date === selectedCalendarDate)
                        .map((ev, idx) => {
                          const isGuidance = ev.type === 'guidance';
                          const isDeadline = ev.type === 'deadline';
                          const isAssignment = ev.type === 'assignment' || ev.type === 'arbeidskrav';
                          return (
                            <div 
                              key={ev.id || `mob-ev-${idx}`} 
                              className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 relative group"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  isGuidance
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : isAssignment
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : isDeadline
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}>
                                  {isGuidance ? <GraduationCap className="w-3 h-3" /> : isAssignment ? <FileCheck className="w-3 h-3" /> : isDeadline ? <AlertOctagon className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                  <span>{isGuidance ? 'Veiledningstime' : isAssignment ? 'Arbeidskrav' : isDeadline ? 'Eksamen / Frist' : 'Gruppemøte'}</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-500">{ev.date}</span>
                                  <button
                                    onClick={() => handleDeleteEvent(ev.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                    title="Slett avtale"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <h4 className="text-xs font-bold text-slate-900">{ev.title}</h4>
                              {ev.description && (
                                <p className="text-[11px] text-slate-600 leading-relaxed">{ev.description}</p>
                              )}

                              <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {ev.allDay ? 'Hele dagen' : `${ev.startTime || '10:00'} - ${ev.endTime || '11:00'}`}
                                </span>
                                {ev.location && <span>• {ev.location}</span>}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* 2. MÅNEDSOVERSIKT (Kompakt rutenett med dager og hendelser) */}
              {calendarView === 'month' && (
                <div className="bg-white rounded-3xl border border-slate-200/90 p-4 space-y-3 shadow-2xs">
                  {/* Månedsnavigasjon */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-slate-800">
                      {monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const prev = new Date(currentMonthDate);
                          prev.setMonth(prev.getMonth() - 1);
                          setCurrentMonthDate(prev);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const next = new Date(currentMonthDate);
                          next.setMonth(next.getMonth() + 1);
                          setCurrentMonthDate(next);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Kalenderrutenett */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 pb-1">
                    <span>Man</span>
                    <span>Tir</span>
                    <span>Ons</span>
                    <span>Tor</span>
                    <span>Fre</span>
                    <span>Lør</span>
                    <span>Søn</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {monthCalendarData.map((item, idx) => {
                      if (!item.day) {
                        return <div key={`empty-${idx}`} className="h-10 rounded-xl" />;
                      }
                      const dayEvents = (activeGroup.events || []).filter(e => e.date === item.dateStr);
                      const isSelected = selectedCalendarDate === item.dateStr;
                      const isToday = item.dateStr === new Date().toISOString().split('T')[0];

                      return (
                        <button
                          key={`m-day-${item.dateStr}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCalendarDate(null);
                            } else {
                              setSelectedCalendarDate(item.dateStr);
                            }
                          }}
                          className={`h-11 rounded-xl flex flex-col items-center justify-center p-1 text-xs font-bold transition-all relative cursor-pointer border ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : isToday
                              ? 'bg-purple-50 text-purple-900 border-purple-300'
                              : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-purple-50/50'
                          }`}
                        >
                          <span>{item.day}</span>
                          {dayEvents.length > 0 && (
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {dayEvents.slice(0, 3).map((ev, eIdx) => (
                                <span
                                  key={`dot-${eIdx}`}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected
                                      ? 'bg-white'
                                      : ev.type === 'guidance'
                                      ? 'bg-purple-600'
                                      : ev.type === 'assignment' || ev.type === 'arbeidskrav'
                                      ? 'bg-amber-500'
                                      : ev.type === 'deadline'
                                      ? 'bg-rose-500'
                                      : 'bg-blue-500'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Vise hendelser for valgt dato i månedsvisning */}
                  {selectedCalendarDate && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>Hendelser på {selectedCalendarDate}:</span>
                        <button
                          onClick={() => setSelectedCalendarDate(null)}
                          className="text-[11px] text-purple-600 hover:underline"
                        >
                          Lukk filter
                        </button>
                      </div>
                      {sortedEvents.filter(e => e.date === selectedCalendarDate).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Ingen avtaler på denne datoen.</p>
                      ) : (
                        sortedEvents
                          .filter(e => e.date === selectedCalendarDate)
                          .map((ev, idx) => (
                            <div key={`sel-ev-${idx}`} className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-100 text-xs">
                              <p className="font-bold text-slate-900">{ev.title}</p>
                              <p className="text-[10px] text-slate-500">{ev.startTime} - {ev.endTime} • {ev.location}</p>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* MODAL FOR OPPRETTELSE AV AVTALE */}
          {/* ==================================================== */}
          <AnimatePresence>
            {showEventModal && (
              <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" /> Opprett avtale / frist
                    </h3>
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEvent} className="space-y-3.5">
                    {/* Avtaletype - Tre forhåndsdefinerte ihht planen */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Velg avtaletype:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {APPOINTMENT_TYPES.map(type => {
                          const Icon = type.icon;
                          const isSelected = eventType === type.id;
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => setEventType(type.id)}
                              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-[11px] leading-tight">{type.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tittel */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tittel på avtalen / fristen:
                      </label>
                      <input
                        type="text"
                        required
                        value={eventTitle}
                        onChange={e => setEventTitle(e.target.value)}
                        placeholder="F.eks: Veiledning om didaktisk plan..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    {/* Dato og tid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Dato:</label>
                        <input
                          type="date"
                          required
                          value={eventDate}
                          onChange={e => setEventDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Sted / rom:</label>
                        <input
                          type="text"
                          value={eventLocation}
                          onChange={e => setEventLocation(e.target.value)}
                          placeholder="Teams, rom 204..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                        />
                      </div>
                    </div>

                    {/* Tidsrom */}
                    {!eventAllDay && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Fra kl:</label>
                          <input
                            type="time"
                            value={eventStartTime}
                            onChange={e => setEventStartTime(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Til kl:</label>
                          <input
                            type="time"
                            value={eventEndTime}
                            onChange={e => setEventEndTime(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="allDayCheckbox"
                        checked={eventAllDay}
                        onChange={e => setEventAllDay(e.target.checked)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <label htmlFor="allDayCheckbox" className="text-xs text-slate-700 font-medium">
                        Hele dagen (f.eks. ved innleveringsfrist)
                      </label>
                    </div>

                    {/* Beskrivelse */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Beskrivelse (valgfritt):</label>
                      <textarea
                        value={eventDescription}
                        onChange={e => setEventDescription(e.target.value)}
                        placeholder="Hva skal forberedes eller tas opp..."
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                      />
                    </div>

                    {/* Handlingsknapper */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowEventModal(false)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Avbryt
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer shadow-md"
                      >
                        Lagre avtale
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* BUNNMENY (BOTTOM SHEET) FOR Å BYTTE GRUPPE */}
      <AnimatePresence>
        {showGroupSwitcher && (
          <div className="fixed inset-0 z-[250] bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Klikk på bakgrunn for å lukke */}
            <div 
              className="absolute inset-0"
              onClick={() => setShowGroupSwitcher(false)} 
            />

            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col"
            >
              {/* Dra-indikator på mobil */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

              {/* Tittel og lukkeknapp */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-600" /> Dine kollokviegrupper
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Velg gruppen du vil jobbe med, eller opprett en ny
                  </p>
                </div>
                <button
                  onClick={() => setShowGroupSwitcher(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Gruppeliste - vertikal flyt, full bredde, null sideveis scrolling */}
              <div className="py-3 space-y-2.5 overflow-y-auto custom-scrollbar flex-1 max-h-[50vh]">
                {groups.map((g, idx) => {
                  const isActive = activeGroupId === g.id;
                  const memberCount = g.members?.length || 1;
                  const eventCount = (g.events || []).length;
                  return (
                    <button
                      key={`sheet-grp-${g.id || idx}`}
                      onClick={() => {
                        setActiveGroupId(g.id);
                        setShowGroupSwitcher(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-purple-50/90 border-purple-300 shadow-2xs'
                          : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                          isActive
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {g.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-sm font-bold leading-snug break-words ${
                            isActive ? 'text-purple-950 font-black' : 'text-slate-900'
                          }`}>
                            {g.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {memberCount} {memberCount === 1 ? 'medlem' : 'medlemmer'} • {eventCount} {eventCount === 1 ? 'planlagt avtale' : 'planlagte avtaler'}
                          </p>
                        </div>
                      </div>

                      {isActive ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-black shrink-0 shadow-2xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>Aktiv</span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-500 hover:text-purple-600 px-2 py-1 rounded-lg bg-white border border-slate-200 shrink-0">
                          Bytt hit
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bunn-handling: Opprett ny gruppe */}
              <div className="pt-3 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    setShowGroupSwitcher(false);
                    onNewGroup();
                  }}
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-purple-300" />
                  <span>Opprett ny kollokviegruppe</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
