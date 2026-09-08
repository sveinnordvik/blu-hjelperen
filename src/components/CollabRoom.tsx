import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  Zap, 
  Sparkles, 
  Send, 
  Check, 
  X, 
  RotateCw, 
  Volume2, 
  Plus, 
  Save, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  FileText, 
  ArrowRight, 
  ChevronRight, 
  Lightbulb, 
  Layers, 
  Award, 
  Share2, 
  Copy,
  Info,
  Calendar,
  Clock,
  Edit3,
  Drama
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { askPraksisTeamAgent, generateFlashcardsFromNotes, generateFlashcards, playAudio, stopAudio, Flashcard } from '../services/geminiService';
import { FlashcardModule } from './FlashcardModule';
import { TeamChat, TeamMessage } from './TeamChat';
import { RoleplaySimulator } from './RoleplaySimulator';
import { doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface GroupMember {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  isOnline?: boolean;
}

export interface CollabMessage {
  id: string;
  userId: string;
  user: string;
  content: string;
  timestamp: string;
  isBot?: boolean;
  isMe?: boolean;
}

export interface CollabGroupData {
  id: string;
  groupId?: string;
  name: string;
  groupName?: string;
  sharedRagContext?: string;
  flashcards?: Flashcard[];
  messages?: CollabMessage[];
  members?: GroupMember[];
  userProgress?: Record<string, { mastered: string[]; learning: string[] }>;
  createdAt?: string;
  updatedAt?: string;
}

interface CollabRoomProps {
  groupData?: CollabGroupData;
  groupId?: string;
  currentUser: any;
  onUpdateGroup?: (updated: CollabGroupData) => void;
  onBackToOverview?: () => void;
}

// Preset templates for shared pedagogical RAG context
const RAG_PRESET_TEMPLATES = [
  {
    title: "🌳 Uterom & Risikofylt lek",
    content: `### Observasjoner om Uterom og Risikofylt lek (Praksis barnehage X)
- **Fokus**: Barnas mestring og vurdering av egne grenser i ulendt terreng.
- **Teori**: Ellen Beate Hansen Sandseter (2007) kategorier for risikofylt lek (høyde, fart, farlige verktøy, farlige elementer, boltrelek, forsvinne/bli borte).
- **Rammeplanen**: Fagområdet "Kropp, bevegelse, mat og helse" – personalet skal støtte barnas motoriske utfordringer og vurdere risiko uten overbeskyttelse.
- **Drøftingsspørsmål**: Hvor går grensen mellom pedagogisk forsvarlig risikotoleranse og personalets frykt for skader?`
  },
  {
    title: "👶 Barns medvirkning & Danning",
    content: `### Fellesnotater: Barns medvirkning og relasjoner
- **Lovverk**: Barnehageloven § 3 (Barns rett til medvirkning) og FNs barnekonvensjon art. 12.
- **Teori**: Berit Bae om anerkjennende væremåte og definisjonsmakt. Barn som likeverdige subjekter i barnehagehverdagen.
- **Praksis-case**: Samlingsstund der barna selv tar initiativ til endring i dagsrytmen.
- **Akademisk forankring**: Å skille mellom medbestemmelse på aktivitetsnivå og reell opplevelse av innflytelse på egen hverdag.`
  },
  {
    title: "🎨 De syv fagområdene i Rammeplanen",
    content: `### Sammenfatning: Rammeplanens fagområder og tverrfaglighet
1. Kunst, kultur og kreativitet
2. Natur, miljø og teknologi
3. Kropp, bevegelse, mat og helse
4. Språk, tekst og kommunikasjon
5. Samfunn, religion og etikk
6. Nærmiljø og samfunn
7. Antall, rom og form
- **Fokus for vår oppgave**: Hvordan pedagogisk dokumentasjon kan synliggjøre progresjon i språkarbeid gjennom naturaktiviteter.`
  }
];

export function CollabRoom({
  groupData: initialGroupData,
  groupId: propGroupId,
  currentUser,
  onUpdateGroup,
  onBackToOverview
}: CollabRoomProps) {
  const currentUid = currentUser?.uid || 'guest_user';
  const currentUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Meg';

  // Fallback demo group state if none provided
  const fallbackGroupId = propGroupId || initialGroupData?.id || initialGroupData?.groupId || 'kollokvie_gruppe_a';
  
  const [group, setGroup] = useState<CollabGroupData>(() => {
    return initialGroupData || {
      id: fallbackGroupId,
      groupId: fallbackGroupId,
      name: 'Kollokviegruppe A (Basen)',
      groupName: 'Kollokviegruppe A (Basen)',
      sharedRagContext: `### Felles praksisnotater – Uterom og Rammeplanen\nVi har observert at barna på avdeling Blåbær viser stor mestringsglede når de får klatre i steinura bak barnehagen.\n\n- Teori: Ellen Beate Hansen Sandseter om risikofylt lek og mestringstro.\n- Rammeplan: "Kropp, bevegelse, mat og helse" samt "Natur, miljø og teknologi".\n- Utfordring: Enkelte voksne stopper leken for tidlig av bekymring.`,
      members: [
        { id: currentUid, name: currentUserName, isOnline: true },
        { id: 'uid_sarah', name: 'Sara Nilsen', isOnline: true },
        { id: 'uid_jonas', name: 'Jonas Berg', isOnline: false },
        { id: 'uid_praksis_bot', name: 'Praksis-agenten (Team-bot)', role: 'Faglig AI-veileder', isOnline: true }
      ],
      messages: [
        {
          id: 'msg_welcome',
          userId: 'uid_praksis_bot',
          user: 'Praksis-agenten',
          content: 'Hei dere! 👋 Jeg er gruppens faste fjerde medlem. Jeg har lest gjennom fellesnotatene deres om uterommet og risikofylt lek. Hva vil dere drøfte i dag?',
          timestamp: new Date(Date.now() - 3600000).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
          isBot: true
        }
      ],
      flashcards: [
        {
          id: 'fc_1',
          term: 'Risikofylt lek (Sandseter, 2007)',
          definition: 'Spennende og fysisk utfordrende former for lek som innebærer en viss usikkerhet og mulighet for fysisk skade. Avgjørende for barns risikovurdering og mestringstro.',
          category: 'Lek & Utvikling',
          example: 'Klatring i høye trær eller utforsking av ukjent terreng uten konstant inngripen.',
          hint: 'Ellen Beate Hansen Sandseter deler dette inn i 6 kategorier.'
        },
        {
          id: 'fc_2',
          term: 'Barns medvirkning (Barnehageloven § 3)',
          definition: 'Barn har rett til å gi uttrykk for sitt syn på barnehagens daglige virksomhet. Barnets synspunkter skal tillegges vekt i samsvar med dets alder og modenhet.',
          category: 'Etikk & Lovverk',
          example: 'Barna deltar aktivt i planleggingen av ukens turer og vurderer egne aktiviteter.',
          hint: 'Forankret i FNs barnekonvensjon art. 12.'
        },
        {
          id: 'fc_3',
          term: 'Den proksimale utviklingssonen (Vygotskij)',
          definition: 'Differansen mellom det et barn kan klare på egen hånd (aktuelt utviklingsnivå) og det barnet kan oppnå med veiledning fra en voksen eller mer kompetent jevnaldrende (stillasbygging).',
          category: 'Pedagogisk teori',
          example: 'Pedagogen veileder barnet med støttende spørsmål ved spikking eller problemløsning.',
          hint: 'Sosialkonstruktivistisk læringssyn og "scaffolding".'
        },
        {
          id: 'fc_4',
          term: 'Anerkjennende relasjoner (Berit Bae)',
          definition: 'En væremåte der den voksne møter barnet som et likeverdig subjekt med respekt for barnets opplevelsesverden, følelser og intensjoner.',
          category: 'Relasjon & Danning',
          example: 'Å lytte genuint til barnets opplevelse fremfor å avfeie eller overkjøre det med voksendefinisjoner.',
          hint: 'Kontrast til vurderende og instruerende kommunikasjon.'
        }
      ],
      userProgress: {}
    };
  });

  const [activeTab, setActiveTab] = useState<'chat' | 'simulator' | 'flashcards' | 'context' | 'members'>('chat');
  
  // Realtime Firestore Subscription
  useEffect(() => {
    if (!group.id || group.id.startsWith('local_')) return;
    
    try {
      const docRef = doc(db, 'groups', group.id);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as CollabGroupData;
          setGroup(prev => ({
            ...prev,
            ...cloudData,
            name: cloudData.groupName || cloudData.name || prev.name,
            sharedRagContext: cloudData.sharedRagContext !== undefined ? cloudData.sharedRagContext : prev.sharedRagContext,
            flashcards: cloudData.flashcards || prev.flashcards,
            messages: cloudData.messages || prev.messages,
            userProgress: cloudData.userProgress || prev.userProgress || {}
          }));
        }
      }, (err) => {
        console.warn('Firestore subscription notice (using local state fallback):', err.message);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore init note:', e);
    }
  }, [group.id]);

  // Helper for saving updates to Firestore & parent
  const saveGroupData = async (updatedFields: Partial<CollabGroupData>) => {
    const updated: CollabGroupData = {
      ...group,
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };
    setGroup(updated);
    if (onUpdateGroup) onUpdateGroup(updated);

    if (group.id && currentUser && !currentUser.isAnonymous) {
      try {
        const docRef = doc(db, 'groups', group.id);
        await setDoc(docRef, {
          groupId: group.id,
          groupName: updated.name || updated.groupName || 'Kollokviegruppe',
          name: updated.name || updated.groupName || 'Kollokviegruppe',
          sharedRagContext: updated.sharedRagContext || '',
          flashcards: updated.flashcards || [],
          messages: updated.messages || [],
          members: updated.members || [],
          userProgress: updated.userProgress || {},
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error('Error saving group data to Firestore:', err);
      }
    }
  };

  // -------------------------------------------------------------
  // CHAT & PRAKSIS-AGENT STATE
  // -------------------------------------------------------------
  const [chatInput, setChatInput] = useState('');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [group.messages, activeTab]);

  const handleSendMessage = async (customPrompt?: string, askBotDirectly: boolean = false) => {
    const messageText = customPrompt || chatInput.trim();
    if (!messageText || isBotThinking) return;

    const newMsg: CollabMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUid,
      user: currentUserName,
      content: messageText,
      timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };

    const updatedMessages = [...(group.messages || []), newMsg];
    setChatInput('');
    await saveGroupData({ messages: updatedMessages });

    // Sjekk om meldingen nevner boten eller ber om faglige råd
    const lowerText = messageText.toLowerCase();
    const shouldBotReply = askBotDirectly || 
      lowerText.includes('@praksis') || 
      lowerText.includes('@bot') || 
      lowerText.includes('hvordan') || 
      lowerText.includes('rammeplan') || 
      lowerText.includes('praksis') || 
      lowerText.includes('teori') || 
      lowerText.includes('hjelp') ||
      lowerText.endsWith('?');

    if (shouldBotReply) {
      setIsBotThinking(true);
      try {
        const botResponse = await askPraksisTeamAgent({
          question: messageText,
          sharedRagContext: group.sharedRagContext || '',
          chatHistory: updatedMessages.map(m => ({
            user: m.user,
            content: m.content,
            isBot: m.isBot
          })),
          groupName: group.name,
          studentName: currentUserName
        });

        const botMsg: CollabMessage = {
          id: `msg_bot_${Date.now()}`,
          userId: 'uid_praksis_bot',
          user: 'Praksis-agenten',
          content: botResponse,
          timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
          isBot: true
        };

        await saveGroupData({ messages: [...updatedMessages, botMsg] });
      } catch (err: any) {
        const errorMsg: CollabMessage = {
          id: `msg_err_${Date.now()}`,
          userId: 'uid_praksis_bot',
          user: 'Praksis-agenten',
          content: 'Oisann, jeg fikk litt trøbbel med å hente svar akkurat nå. Prøv igjen om et lite øyeblikk!',
          timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
          isBot: true
        };
        await saveGroupData({ messages: [...updatedMessages, errorMsg] });
      } finally {
        setIsBotThinking(false);
      }
    }
  };

  const handlePlayAudio = (msgId: string, text: string) => {
    if (playingAudioId === msgId) {
      stopAudio();
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(msgId);
      playAudio(text, {
        onEnd: () => setPlayingAudioId(null),
        onError: () => setPlayingAudioId(null)
      });
    }
  };

  // -------------------------------------------------------------
  // FLASHCARD (EKSAMENSDRILL & TINDER-SVEIP) STATE
  // -------------------------------------------------------------
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardTerm, setNewCardTerm] = useState('');
  const [newCardDef, setNewCardDef] = useState('');
  const [newCardCategory, setNewCardCategory] = useState('Lek & Utvikling');
  const [newCardExample, setNewCardExample] = useState('');
  const [flashcardFilter, setFlashcardFilter] = useState<'all' | 'learning' | 'mastered'>('all');
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // User progress for current user
  const userMastered: string[] = group.userProgress?.[currentUid]?.mastered || [];
  const userLearning: string[] = group.userProgress?.[currentUid]?.learning || [];

  const flashcards = group.flashcards || [];
  
  const filteredFlashcards = flashcards.filter(card => {
    if (flashcardFilter === 'mastered') return userMastered.includes(card.id);
    if (flashcardFilter === 'learning') return userLearning.includes(card.id);
    return true;
  });

  const activeCard = filteredFlashcards[currentCardIndex];

  const handleSwipe = async (cardId: string, mastered: boolean) => {
    setSwipeDirection(mastered ? 'right' : 'left');
    setIsFlipped(false);

    const nextMastered = mastered 
      ? Array.from(new Set([...userMastered, cardId]))
      : userMastered.filter(id => id !== cardId);

    const nextLearning = !mastered 
      ? Array.from(new Set([...userLearning, cardId]))
      : userLearning.filter(id => id !== cardId);

    const updatedUserProgress = {
      ...(group.userProgress || {}),
      [currentUid]: {
        mastered: nextMastered,
        learning: nextLearning
      }
    };

    setTimeout(async () => {
      setSwipeDirection(null);
      if (currentCardIndex < filteredFlashcards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        setCurrentCardIndex(filteredFlashcards.length);
      }
      await saveGroupData({ userProgress: updatedUserProgress });
    }, 250);
  };

  const handleGenerateCardsAI = async () => {
    setIsGeneratingCards(true);
    try {
      const generated = await generateFlashcardsFromNotes({
        notesContext: group.sharedRagContext || '',
        count: 10,
        topic: group.name
      });
      const combined = [...(group.flashcards || []), ...generated];
      // remove duplicate terms
      const unique = Array.from(new Map(combined.map(c => [c.term.toLowerCase(), c])).values());
      await saveGroupData({ flashcards: unique });
      setCurrentCardIndex(0);
      setIsFlipped(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingCards(false);
    }
  };

  const handleAddManualCard = async () => {
    if (!newCardTerm.trim() || !newCardDef.trim()) return;
    const newCard: Flashcard = {
      id: `card_${Date.now()}`,
      term: newCardTerm.trim(),
      definition: newCardDef.trim(),
      category: newCardCategory,
      example: newCardExample.trim() || undefined
    };
    await saveGroupData({ flashcards: [...flashcards, newCard] });
    setNewCardTerm('');
    setNewCardDef('');
    setNewCardExample('');
    setShowAddCardModal(false);
  };

  const handleResetProgress = async () => {
    const updatedUserProgress = {
      ...(group.userProgress || {}),
      [currentUid]: {
        mastered: [],
        learning: []
      }
    };
    await saveGroupData({ userProgress: updatedUserProgress });
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  // -------------------------------------------------------------
  // SHARED RAG CONTEXT STATE
  // -------------------------------------------------------------
  const [ragNotes, setRagNotes] = useState(group.sharedRagContext || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveSuccess, setNotesSaveSuccess] = useState(false);

  useEffect(() => {
    setRagNotes(group.sharedRagContext || '');
  }, [group.sharedRagContext]);

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await saveGroupData({ sharedRagContext: ragNotes });
    setIsSavingNotes(false);
    setNotesSaveSuccess(true);
    setTimeout(() => setNotesSaveSuccess(false), 2500);
  };

  const handleInsertTemplate = (templateContent: string) => {
    const combined = ragNotes ? `${ragNotes}\n\n${templateContent}` : templateContent;
    setRagNotes(combined);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full py-2">
      {/* 1. Header & Group Status Banner */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-4">
          {onBackToOverview && (
            <button
              onClick={onBackToOverview}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 transition-colors"
              title="Tilbake til oversikt"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div className="p-4 bg-primary-light/30 rounded-3xl text-primary shrink-0">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Basen: Aktivt Kollokvierom
              </span>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Praksis-agent tilkoblet
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {group.name || group.groupName || 'Kollokviegruppe'}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
              Delt kunnskapsbase for gruppen. Gemini-agenten deltar som 4. medlem med direkte tilgang til fellesnotatene.
            </p>
          </div>
        </div>

        {/* Tab Navigation Pill */}
        <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl w-full md:w-auto flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'chat'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-primary" />
            Team-Chat
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'simulator'
                ? 'bg-white text-purple-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Drama className="w-4 h-4 text-purple-600" />
            Pedagogisk Simulator
          </button>
          <button
            onClick={() => setActiveTab('flashcards')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'flashcards'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            Flashcards ({flashcards.length})
          </button>
          <button
            onClick={() => setActiveTab('context')}
            className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'context'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-500" />
            Felles Kunnskapsbase
          </button>
        </div>
      </div>

      {/* 2. Main Tab Views */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* TAB: SIMULATOR & MUNTLIG DRILL */}
        {activeTab === 'simulator' && (
          <div className="lg:col-span-12">
            <RoleplaySimulator />
          </div>
        )}
        
        {/* TAB 1: TEAM-CHAT MED PRAKSIS-AGENTEN */}
        {activeTab === 'chat' && (
          <>
            {/* Left: Interactive TeamChat Module */}
            <div className="lg:col-span-8 flex flex-col">
              <TeamChat
                sharedRagContext={group.sharedRagContext || ''}
                currentUser={currentUser}
                initialMessages={group.messages?.map(m => ({
                  role: m.isBot || m.userId === 'uid_praksis_bot' ? 'agent' : 'user',
                  sender: m.user || 'Student',
                  content: m.content,
                  timestamp: m.timestamp
                }))}
                onUpdateMessages={(updatedMsgs) => {
                  const mapped: CollabMessage[] = updatedMsgs.map((m, idx) => ({
                    id: `msg_${idx}_${Date.now()}`,
                    userId: m.role === 'agent' ? 'uid_praksis_bot' : currentUid,
                    user: m.sender,
                    content: m.content,
                    timestamp: m.timestamp || new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
                    isBot: m.role === 'agent',
                    isMe: m.role === 'user' && m.sender === currentUserName
                  }));
                  saveGroupData({ messages: mapped });
                }}
              />
            </div>

            {/* Right: Kollokvie-hjelp & Raske spørsmål til Team-boten */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-gradient-to-br from-primary/10 via-white to-primary/5 p-6 rounded-[2.5rem] border border-primary/20 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-white rounded-2xl text-primary shadow-sm border border-slate-100">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm md:text-base">Praksis-agenten</h3>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Gruppens 4. medlem</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Still faglige spørsmål direkte til agenten. Den bruker deres delte praksisnotater til å gi forankrede eksempler og litteraturhenvisninger.
                </p>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Hurtigspørsmål:
                  </span>
                  {[
                    "Hvordan bør vi knytte praksisfunnene våre til rammeplanen?",
                    "Hva sier Sandseter om risikofylt lek i uterommet?",
                    "Hjelp oss å drøfte barns medvirkning etter Berit Bae.",
                    "Lag et forslag til problemstilling basert på notatene våre."
                  ].map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q, true)}
                      className="w-full text-left p-3 bg-white/90 hover:bg-white border border-slate-200/80 hover:border-primary/40 rounded-xl text-xs font-bold text-slate-700 hover:text-primary transition-all flex items-center justify-between group shadow-sm"
                    >
                      <span className="line-clamp-2">{q}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

              {/* RAG Context Quick Preview Widget */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    Aktiv RAG-Kunnskapsbase
                  </h4>
                  <button
                    onClick={() => setActiveTab('context')}
                    className="text-[11px] font-bold text-primary hover:underline"
                  >
                    Rediger
                  </button>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 line-clamp-4 font-mono leading-relaxed">
                  {group.sharedRagContext || 'Ingen fellesnotater lagt inn ennå. Trykk for å legge til.'}
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: DELTE FLASHCARDS (EKSAMENSDRILL & TINDER-SVEIP) */}
        {activeTab === 'flashcards' && (
          <div className="lg:col-span-12 flex flex-col gap-6">
            {/* Top Toolbar */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-amber-500" />
                  Eksamensdrill: Delte Flashcards
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Sveip eller klikk for å pugge felles begreper. Fremdriften lagres individuelt for deg ({userMastered.length} mestret).
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleGenerateCardsAI}
                  disabled={isGeneratingCards}
                  className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-bold text-xs hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGeneratingCards ? 'Genererer kort...' : 'Auto-generer fra notater'}
                </button>
                <button
                  onClick={() => setShowAddCardModal(true)}
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Legg til kort
                </button>
                <button
                  onClick={handleResetProgress}
                  className="px-4 py-2.5 text-slate-400 hover:text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1"
                  title="Nullstill min fremdrift"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Nullstill
                </button>
              </div>
            </div>

            {/* Filter Tabs & Progress Meter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFlashcardFilter('all'); setCurrentCardIndex(0); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    flashcardFilter === 'all' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'
                  }`}
                >
                  Alle ({flashcards.length})
                </button>
                <button
                  onClick={() => { setFlashcardFilter('learning'); setCurrentCardIndex(0); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    flashcardFilter === 'learning' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'text-slate-500'
                  }`}
                >
                  Må øves ({userLearning.length})
                </button>
                <button
                  onClick={() => { setFlashcardFilter('mastered'); setCurrentCardIndex(0); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    flashcardFilter === 'mastered' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'text-slate-500'
                  }`}
                >
                  Mestret ({userMastered.length})
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">
                  Fremdrift: {userMastered.length} / {flashcards.length}
                </span>
                <div className="w-32 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${flashcards.length > 0 ? (userMastered.length / flashcards.length) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Flashcard Interactive Swipe Arena */}
            <div className="flex flex-col items-center justify-center min-h-[420px] py-4">
              {filteredFlashcards.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-md">
                  <Zap className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                  <h4 className="font-black text-slate-900 text-lg mb-2">Ingen kort i dette utvalget</h4>
                  <p className="text-xs text-slate-500 mb-6">
                    {flashcardFilter === 'mastered'
                      ? 'Du har ikke markert noen kort som mestret ennå.'
                      : 'Kortstokken er tom. Generer automatisk med AI eller legg til egne kort.'}
                  </p>
                  <button
                    onClick={handleGenerateCardsAI}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-hover shadow-lg"
                  >
                    Auto-generer kort fra gruppens notater
                  </button>
                </div>
              ) : currentCardIndex >= filteredFlashcards.length ? (
                <div className="text-center p-12 bg-white rounded-[3rem] border border-slate-100 shadow-sm max-w-md space-y-4">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Award className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-slate-900 text-xl">Kortstokken er fullført!</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Flott innsats! Du mestrer nå <strong>{userMastered.length} av {flashcards.length}</strong> begreper i denne runden.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => { setCurrentCardIndex(0); setIsFlipped(false); }}
                      className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-xs hover:bg-primary-hover transition-all"
                    >
                      Start på nytt
                    </button>
                    {userLearning.length > 0 && (
                      <button
                        onClick={() => { setFlashcardFilter('learning'); setCurrentCardIndex(0); }}
                        className="px-5 py-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl font-bold text-xs hover:bg-amber-100"
                      >
                        Øv kun på vanskelige ({userLearning.length})
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-lg flex flex-col items-center">
                  {/* Card Index Indicator */}
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Kort {currentCardIndex + 1} av {filteredFlashcards.length}
                  </div>

                  {/* Flashcard Component with 3D Flip & Drag Animation */}
                  <div className="relative w-full h-[320px] perspective-1000 cursor-pointer select-none">
                    <motion.div
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.x > 100) {
                          handleSwipe(activeCard.id, true);
                        } else if (info.offset.x < -100) {
                          handleSwipe(activeCard.id, false);
                        }
                      }}
                      animate={{
                        rotateY: isFlipped ? 180 : 0,
                        x: swipeDirection === 'right' ? 300 : swipeDirection === 'left' ? -300 : 0,
                        opacity: swipeDirection ? 0 : 1
                      }}
                      transition={{ duration: 0.3 }}
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="w-full h-full relative preserve-3d"
                    >
                      {/* FRONT OF CARD */}
                      <div
                        className={`absolute inset-0 backface-hidden bg-white p-8 rounded-[2.5rem] border-2 shadow-xl flex flex-col justify-between ${
                          userMastered.includes(activeCard.id)
                            ? 'border-emerald-300'
                            : userLearning.includes(activeCard.id)
                            ? 'border-amber-300'
                            : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[11px] font-black uppercase tracking-wider">
                            {activeCard.category || 'Begrep'}
                          </span>
                          <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                            <RotateCw className="w-3 h-3" /> Trykk for å snu
                          </span>
                        </div>

                        <div className="my-auto text-center px-4">
                          <h4 className="text-xl md:text-2xl font-black text-slate-900 leading-snug">
                            {activeCard.term}
                          </h4>
                          {activeCard.hint && (
                            <p className="text-xs text-slate-400 italic mt-3 font-medium">
                              💡 Hint: {activeCard.hint}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold border-t border-slate-100 pt-3">
                          <span>👈 Sveip venstre: Øv mer</span>
                          <span>👉 Sveip høyre: Kan det</span>
                        </div>
                      </div>

                      {/* BACK OF CARD (FLIPPED) */}
                      <div
                        style={{ transform: 'rotateY(180deg)' }}
                        className="absolute inset-0 backface-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-white/10 text-primary-light rounded-full text-[11px] font-black uppercase tracking-wider">
                            Fasit & Drøfting
                          </span>
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                            <RotateCw className="w-3 h-3" /> Trykk for å snu tilbake
                          </span>
                        </div>

                        <div className="my-auto overflow-y-auto pr-2 max-h-[160px] text-center">
                          <p className="text-sm md:text-base text-slate-100 font-medium leading-relaxed">
                            {activeCard.definition}
                          </p>
                          {activeCard.example && (
                            <div className="mt-3 p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 italic">
                              Praksiseksempel: {activeCard.example}
                            </div>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 text-center border-t border-white/10 pt-3">
                          Klikk på knappene under for å evaluere
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Swipe Action Buttons */}
                  <div className="flex items-center gap-6 mt-6">
                    <button
                      onClick={() => handleSwipe(activeCard.id, false)}
                      className="px-6 py-4 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:scale-105"
                    >
                      <X className="w-5 h-5 text-amber-600" />
                      Må øves mer
                    </button>
                    <button
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all"
                      title="Snu kort"
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSwipe(activeCard.id, true)}
                      className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
                    >
                      <Check className="w-5 h-5 text-white" />
                      Kan det!
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FELLES KUNNSKAPSBASE (RAG-KONTEKST FOR HELE GRUPPEN) */}
        {activeTab === 'context' && (
          <div className="lg:col-span-12 flex flex-col gap-6">
            <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-blue-500" />
                  Gruppens Felles Kunnskapsbase (RAG-kontekst)
                </h3>
                <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                  Legg inn notater, sitater fra Rammeplanen, observasjoner fra praksis og pensumreferanser. Praksis-agenten leser alt her når den veileder dere!
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-xs hover:bg-primary-hover shadow-lg shadow-primary-light transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingNotes ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {notesSaveSuccess ? 'Lagret i skyen!' : 'Lagre notater'}
                </button>
              </div>
            </div>

            {/* Quick Templates insertion bar */}
            <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span>Sett inn faglige maler:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {RAG_PRESET_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleInsertTemplate(tmpl.content)}
                    className="px-3.5 py-1.5 bg-white border border-blue-200 text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold transition-colors shadow-sm"
                  >
                    + {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Area */}
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 block">
                Fellesnotater & Teorigrunnlag (Markdown støttes)
              </label>
              <textarea
                value={ragNotes}
                onChange={(e) => setRagNotes(e.target.value)}
                rows={14}
                placeholder="Skriv inn gruppens fellesnotater her... F.eks: Hvilke teoretikere dere bruker, observasjoner fra praksisbarnehagen, problemstilling og referanser."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
              />

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Gemini-agenten har kontinuerlig tilgang til dette innholdet
                </span>
                <span>{ragNotes.length} tegn</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: ADD MANUAL FLASHCARD */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-black text-slate-900 text-lg">Legg til nytt Flashcard</h4>
              <button onClick={() => setShowAddCardModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Begrep / Spørsmål (Forside)</label>
                <input
                  type="text"
                  value={newCardTerm}
                  onChange={(e) => setNewCardTerm(e.target.value)}
                  placeholder="F.eks. Risikofylt lek"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Definisjon & Forankring (Bakside)</label>
                <textarea
                  value={newCardDef}
                  onChange={(e) => setNewCardDef(e.target.value)}
                  rows={3}
                  placeholder="Faglig forklaring og kobling til Rammeplanen..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Kategori</label>
                <select
                  value={newCardCategory}
                  onChange={(e) => setNewCardCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Lek & Utvikling">Lek & Utvikling</option>
                  <option value="Rammeplanen">Rammeplanen</option>
                  <option value="Etikk & Lovverk">Etikk & Lovverk</option>
                  <option value="Pedagogisk teori">Pedagogisk teori</option>
                  <option value="Didaktikk">Didaktikk</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Praksiseksempel (Valgfritt)</label>
                <input
                  type="text"
                  value={newCardExample}
                  onChange={(e) => setNewCardExample(e.target.value)}
                  placeholder="F.eks. Klatring i trær i skogen..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowAddCardModal(false)}
                className="px-4 py-2.5 text-slate-500 font-bold text-xs"
              >
                Avbryt
              </button>
              <button
                onClick={handleAddManualCard}
                disabled={!newCardTerm.trim() || !newCardDef.trim()}
                className="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary-hover transition-all disabled:opacity-50"
              >
                Lagre kort
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
