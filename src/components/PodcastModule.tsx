import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Copy,
  CreditCard,
  Download,
  FileText,
  Headphones,
  History,
  Library,
  Loader2,
  Lock,
  Mic,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  UserCheck,
  Volume2,
  AlertTriangle,
  X
} from 'lucide-react';
import { PensumFileItem, usePensumHub } from '../context/PensumHubContext';
import { ArchiveFilePickerModal } from './tools/ArchiveFilePickerModal';
import { generatePodcastScript } from '../services/geminiService';
import {
  deletePodcastEpisode,
  formatEpisodeTranscript,
  loadPodcastEpisodes,
  savePodcastEpisode
} from '../services/podcastHistoryService';
import {
  PodcastAudioProgress,
  generatePodcastAudioWav,
  triggerWavDownload
} from '../services/podcastAudioService';
import {
  PODCAST_MINUTES_PACK_30_PRICE,
  PODCAST_MINUTES_PACK_90_PRICE,
  PODCAST_SEMESTER_INCLUDED_MINUTES,
  STRIPE_PODCAST_MINUTES_30_URL,
  STRIPE_PODCAST_MINUTES_90_URL,
  getStripePaymentUrl,
  isUnlimitedUser
} from '../config/accessConfig';
import {
  PODCAST_AI_QUALITY_OPTIONS,
  PODCAST_AI_VOICES,
  PODCAST_ANGLE_OPTIONS,
  PODCAST_LENGTH_OPTIONS,
  PODCAST_PRESET_TOPICS,
  PodcastAiQuality,
  PodcastAiVoiceId,
  PodcastAngle,
  PodcastEpisode,
  PodcastLengthPreset,
  PodcastPresetTopic,
  PodcastSpeaker,
  PodcastVoiceEngine,
  calculatePodcastAudioCost,
  countDialogueWords
} from '../types/podcast';
import { cn } from '../lib/utils';

interface PodcastModuleProps {
  userId?: string | null;
  userEmail?: string | null;
  pricingTier?: string;
  podcastAudioMinutes?: number;
  onDeductPodcastMinutes?: (minutes: number) => void | Promise<void>;
  onAddPodcastMinutes?: (minutes: number) => void | Promise<void>;
  onUpgrade?: () => void;
  onBackToTools?: () => void;
  onNavigateToResources?: () => void;
}

const SPEED_OPTIONS = [0.9, 1, 1.25, 1.5] as const;

function isNorwegianVoice(voice: SpeechSynthesisVoice): boolean {
  const lang = (voice.lang || '').toLowerCase();
  const name = (voice.name || '').toLowerCase();
  return (
    lang.startsWith('nb') ||
    lang.startsWith('no') ||
    lang.startsWith('nn') ||
    name.includes('norwegian') ||
    name.includes('norsk') ||
    name.includes('bokmål') ||
    name.includes('bokmal')
  );
}

/**
 * Splits a long dialogue line into natural sentence chunks (<= 240 chars)
 * so browsers like Chrome never silently stall mid-utterance.
 */
function splitLineForSpeech(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= 240) return [cleaned];

  const sentences = cleaned.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [cleaned];
  const chunks: string[] = [];
  let current = '';

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;
    if ((current + ' ' + sentence).trim().length <= 240) {
      current = (current + ' ' + sentence).trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.length <= 240) {
        current = sentence;
      } else {
        // Split very long sentence on commas/spaces
        const words = sentence.split(' ');
        let part = '';
        for (const word of words) {
          if ((part + ' ' + word).trim().length <= 220) {
            part = (part + ' ' + word).trim();
          } else {
            if (part) chunks.push(part);
            part = word;
          }
        }
        current = part;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [cleaned];
}

function formatDateLabel(isoString: string): string {
  try {
    return new Intl.DateTimeFormat('nb-NO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoString));
  } catch {
    return '';
  }
}

export function PodcastModule({
  userId,
  userEmail,
  pricingTier,
  podcastAudioMinutes,
  onDeductPodcastMinutes,
  onAddPodcastMinutes,
  onUpgrade,
  onBackToTools,
  onNavigateToResources
}: PodcastModuleProps) {
  const { activePensumFiles, startPensumAction, clearPensumAction } = usePensumHub();

  const isUnlimited = isUnlimitedUser(userEmail);
  const isSemesterPlan =
    isUnlimited ||
    ['semester', 'yearly', 'preview'].includes((pricingTier || '').toLowerCase());

  const [localAudioMinutes, setLocalAudioMinutes] = useState<number>(() => {
    if (typeof podcastAudioMinutes === 'number') return podcastAudioMinutes;
    try {
      const saved = localStorage.getItem('blu_podcast_audio_minutes');
      return saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (typeof podcastAudioMinutes === 'number') {
      setLocalAudioMinutes(podcastAudioMinutes);
    }
  }, [podcastAudioMinutes]);

  const effectiveAudioMinutes =
    typeof podcastAudioMinutes === 'number'
      ? podcastAudioMinutes
      : localAudioMinutes;

  // View mode
  const [viewMode, setViewMode] = useState<'studio' | 'history'>('studio');

  // Configuration state
  const [lengthPreset, setLengthPreset] = useState<PodcastLengthPreset>('short');
  const [angle, setAngle] = useState<PodcastAngle>('praksisnaer');
  const [focusNote, setFocusNote] = useState('');
  const [pastedNotes, setPastedNotes] = useState('');
  const [showPastedNotes, setShowPastedNotes] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PodcastPresetTopic | null>(null);
  const [dismissedFileIds, setDismissedFileIds] = useState<string[]>([]);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active episode & saved history
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [savedEpisodes, setSavedEpisodes] = useState<PodcastEpisode[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [storageMode, setStorageMode] = useState<'cloud' | 'local'>('local');
  const [isSaving, setIsSaving] = useState(false);
  const [savedEpisodeIds, setSavedEpisodeIds] = useState<Set<string>>(new Set());
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Voice engine separation: free browser TTS vs paid Gemini AI voices
  const [voiceEngine, setVoiceEngine] = useState<PodcastVoiceEngine>('browser');
  const [aiQuality, setAiQuality] = useState<PodcastAiQuality>('studio');
  const [aiHostVoice, setAiHostVoice] = useState<PodcastAiVoiceId>('Kore');
  const [aiExpertVoice, setAiExpertVoice] = useState<PodcastAiVoiceId>('Charon');

  // AI .wav audio export state & session cache (keyed by episode + quality + AI voices)
  const [audioCache, setAudioCache] = useState<
    Record<
      string,
      { blob: Blob; objectUrl: string; episodeId: string; quality: PodcastAiQuality }
    >
  >({});
  const audioCacheRef = useRef<
    Record<
      string,
      { blob: Blob; objectUrl: string; episodeId: string; quality: PodcastAiQuality }
    >
  >({});
  const [audioDownloadEpisodeId, setAudioDownloadEpisodeId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<PodcastAudioProgress | null>(null);
  const [audioDownloadError, setAudioDownloadError] = useState<string | null>(null);
  const [showAudioQuotaModal, setShowAudioQuotaModal] = useState(false);
  const [pendingAudioEpisode, setPendingAudioEpisode] = useState<PodcastEpisode | null>(null);

  // Web Speech API player state
  const speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [hostVoiceURI, setHostVoiceURI] = useState<string>('');
  const [expertVoiceURI, setExpertVoiceURI] = useState<string>('');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [activeLineIndex, setActiveLineIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Refs for race-free Web Speech playback & auto-scroll
  const playbackSessionRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1);
  const hostVoiceURIRef = useRef<string>('');
  const expertVoiceURIRef = useRef<string>('');
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const episodeRef = useRef<PodcastEpisode | null>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    audioCacheRef.current = audioCache;
  }, [audioCache]);

  useEffect(() => {
    return () => {
      Object.values(audioCacheRef.current).forEach((entry) => {
        URL.revokeObjectURL(entry.objectUrl);
      });
    };
  }, []);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    hostVoiceURIRef.current = hostVoiceURI;
  }, [hostVoiceURI]);

  useEffect(() => {
    expertVoiceURIRef.current = expertVoiceURI;
  }, [expertVoiceURI]);

  useEffect(() => {
    voicesRef.current = availableVoices;
  }, [availableVoices]);

  useEffect(() => {
    episodeRef.current = episode;
  }, [episode]);

  // Visible Pensum-Hub files (excluding locally dismissed ones)
  const visibleArchiveFiles = useMemo(
    () => (activePensumFiles || []).filter((f) => !dismissedFileIds.includes(f.id)),
    [activePensumFiles, dismissedFileIds]
  );

  // Check if selected archive files have empty content so we can proactively offer paste-in
  const emptyContentFiles = useMemo(
    () =>
      visibleArchiveFiles.filter(
        (f) => !f.content || f.content.trim().length < 30
      ),
    [visibleArchiveFiles]
  );

  useEffect(() => {
    // Reset dismissed ids if user picked new files in Filarkivet
    setDismissedFileIds([]);
    if (activePensumFiles && activePensumFiles.length > 0) {
      setSelectedPreset(null);
    }
  }, [activePensumFiles]);

  // Stop speech cleanly
  const stopPlayback = useCallback(() => {
    playbackSessionRef.current += 1;
    activeUtteranceRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore browser speech cancel edge cases
      }
    }
    setIsPlaying(false);
    setIsPaused(false);
  }, []);

  // Mandatory cleanup on unmount and page unload
  useEffect(() => {
    const handleUnload = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      stopPlayback();
    };
  }, [stopPlayback]);

  // Load saved episode history
  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    loadPodcastEpisodes(userId)
      .then(({ episodes, storageSource }) => {
        if (!active) return;
        setSavedEpisodes(episodes);
        setStorageMode(storageSource);
        setSavedEpisodeIds(new Set(episodes.map((e) => e.id)));
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  // Load browser voices (Norwegian prioritized)
  useEffect(() => {
    if (!speechSupported) return;

    const refreshVoices = () => {
      const allVoices = window.speechSynthesis.getVoices() || [];
      if (allVoices.length === 0) return;

      const norwegian = allVoices.filter(isNorwegianVoice);
      const sorted = [
        ...norwegian,
        ...allVoices.filter((v) => !isNorwegianVoice(v))
      ];
      setAvailableVoices(sorted);

      const pool = norwegian.length > 0 ? norwegian : sorted;
      setHostVoiceURI((prev) => {
        if (prev && sorted.some((v) => v.voiceURI === prev)) return prev;
        return pool[0]?.voiceURI || '';
      });
      setExpertVoiceURI((prev) => {
        if (prev && sorted.some((v) => v.voiceURI === prev)) return prev;
        return (pool[1] || pool[0])?.voiceURI || '';
      });
    };

    refreshVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
    const fallbackTimer = window.setTimeout(refreshVoices, 400);

    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', refreshVoices);
      window.clearTimeout(fallbackTimer);
    };
  }, [speechSupported]);

  const norwegianVoices = useMemo(
    () => availableVoices.filter(isNorwegianVoice),
    [availableVoices]
  );

  const usingPitchSeparation =
    Boolean(hostVoiceURI) && hostVoiceURI === expertVoiceURI;

  // Smooth auto-scroll active dialogue line into view
  useEffect(() => {
    if (!episode || !autoScrollEnabled) return;
    const node = lineRefs.current[activeLineIndex];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeLineIndex, episode, autoScrollEnabled]);

  // Core sequential two-speaker Web Speech engine
  const speakLineAtIndex = useCallback(
    (index: number, sessionId: number) => {
      const currentEp = episodeRef.current;
      if (!currentEp || !speechSupported) return;
      if (sessionId !== playbackSessionRef.current) return;

      if (index < 0 || index >= currentEp.dialogue.length) {
        setIsPlaying(false);
        setIsPaused(false);
        return;
      }

      const line = currentEp.dialogue[index];
      const chunks = splitLineForSpeech(line.text);
      if (chunks.length === 0) {
        speakLineAtIndex(index + 1, sessionId);
        return;
      }

      setActiveLineIndex(index);
      setAudioError(null);

      const voices = voicesRef.current;
      const desiredURI =
        line.speaker === 'Programleder'
          ? hostVoiceURIRef.current
          : expertVoiceURIRef.current;
      const chosenVoice =
        voices.find((v) => v.voiceURI === desiredURI) ||
        voices.find(isNorwegianVoice) ||
        null;

      const sameVoice =
        !hostVoiceURIRef.current ||
        hostVoiceURIRef.current === expertVoiceURIRef.current;

      // Subtle pitch & cadence differentiation when browser only exposes 1 Norwegian voice
      const speakerPitch = sameVoice
        ? line.speaker === 'Programleder'
          ? 1.07
          : 0.91
        : line.speaker === 'Programleder'
        ? 1.02
        : 0.96;

      const speakerRateOffset =
        sameVoice && line.speaker === 'Programleder' ? 1.03 : 1.0;

      const speakChunk = (chunkIdx: number) => {
        if (sessionId !== playbackSessionRef.current) return;
        if (chunkIdx >= chunks.length) {
          if (index + 1 < currentEp.dialogue.length) {
            window.setTimeout(() => {
              if (sessionId === playbackSessionRef.current) {
                speakLineAtIndex(index + 1, sessionId);
              }
            }, 220);
          } else {
            setIsPlaying(false);
            setIsPaused(false);
          }
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[chunkIdx]);
        activeUtteranceRef.current = utterance;

        if (chosenVoice) {
          utterance.voice = chosenVoice;
          utterance.lang = chosenVoice.lang || 'nb-NO';
        } else {
          utterance.lang = 'nb-NO';
        }

        utterance.rate = Math.min(
          2,
          Math.max(0.5, playbackRateRef.current * speakerRateOffset)
        );
        utterance.pitch = speakerPitch;

        utterance.onend = () => {
          if (sessionId !== playbackSessionRef.current) return;
          speakChunk(chunkIdx + 1);
        };

        utterance.onerror = (event) => {
          if (sessionId !== playbackSessionRef.current) return;
          if (event.error === 'canceled' || event.error === 'interrupted') {
            return;
          }
          setAudioError(
            'Nettleseren avbrøt opplesingen. Trykk Spill av igjen, eller velg en annen stemme.'
          );
          setIsPlaying(false);
          setIsPaused(false);
        };

        try {
          window.speechSynthesis.speak(utterance);
        } catch {
          setAudioError('Klarte ikke å starte lydavspilling i denne nettleseren.');
          setIsPlaying(false);
          setIsPaused(false);
        }
      };

      speakChunk(0);
    },
    [speechSupported]
  );

  const startPlaybackFrom = useCallback(
    (index: number) => {
      const currentEp = episodeRef.current;
      if (!currentEp || currentEp.dialogue.length === 0) return;
      if (!speechSupported) {
        setAudioError(
          'Nettleseren din støtter ikke Web Speech API (window.speechSynthesis). Du kan fortsatt lese, kopiere og eksportere manuset.'
        );
        return;
      }

      const clampedIndex = Math.max(
        0,
        Math.min(index, currentEp.dialogue.length - 1)
      );
      playbackSessionRef.current += 1;
      const newSession = playbackSessionRef.current;
      window.speechSynthesis.cancel();

      setIsPlaying(true);
      setIsPaused(false);
      setActiveLineIndex(clampedIndex);

      // Brief tick after cancel() prevents Chrome from dropping the immediately queued utterance
      window.setTimeout(() => {
        if (newSession === playbackSessionRef.current) {
          speakLineAtIndex(clampedIndex, newSession);
        }
      }, 45);
    },
    [speechSupported, speakLineAtIndex]
  );

  const handleTogglePlayPause = () => {
    if (!episode) return;
    if (!speechSupported) {
      setAudioError(
        'Nettleseren din støtter ikke stemmeavspilling. Prøv Chrome, Edge eller Safari.'
      );
      return;
    }

    if (isPlaying && !isPaused) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        setIsPaused(true);
      } else {
        stopPlayback();
      }
      return;
    }

    if (isPlaying && isPaused) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        startPlaybackFrom(activeLineIndex);
      }
      return;
    }

    const startIdx =
      activeLineIndex >= episode.dialogue.length - 1 ? 0 : activeLineIndex;
    startPlaybackFrom(startIdx);
  };

  const handleStepLine = (delta: number) => {
    if (!episode) return;
    const nextIdx = Math.max(
      0,
      Math.min(episode.dialogue.length - 1, activeLineIndex + delta)
    );
    if (isPlaying && !isPaused) {
      startPlaybackFrom(nextIdx);
    } else {
      stopPlayback();
      setActiveLineIndex(nextIdx);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!episode || episode.dialogue.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetIndex = Math.min(
      episode.dialogue.length - 1,
      Math.floor(ratio * episode.dialogue.length)
    );
    startPlaybackFrom(targetIndex);
  };

  const handleSpeedChange = (newRate: number) => {
    setPlaybackRate(newRate);
    playbackRateRef.current = newRate;
    if (isPlaying && !isPaused) {
      startPlaybackFrom(activeLineIndex);
    }
  };

  const handleVoiceChange = (speaker: PodcastSpeaker, uri: string) => {
    if (speaker === 'Programleder') {
      setHostVoiceURI(uri);
      hostVoiceURIRef.current = uri;
    } else {
      setExpertVoiceURI(uri);
      expertVoiceURIRef.current = uri;
    }
    if (isPlaying && !isPaused) {
      startPlaybackFrom(activeLineIndex);
    }
  };

  const showTransientFeedback = (message: string) => {
    setStatusFeedback(message);
    window.setTimeout(() => {
      setStatusFeedback((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  // Build combined source text & titles
  const sourcePayload = useMemo(() => {
    const sections: string[] = [];
    const titles: string[] = [];

    if (visibleArchiveFiles.length > 0) {
      for (const file of visibleArchiveFiles) {
        titles.push(file.title);
        const body =
          file.content && file.content.trim().length > 0
            ? file.content.trim()
            : `Referansetittel uten lagret fulltekst: ${file.title}`;
        sections.push(
          `KILDE FRA FILARKIVET: ${file.title}\nKATEGORI: ${file.category || 'Pensum'}\nINNHOLD:\n${body}`
        );
      }
    }

    if (pastedNotes.trim().length > 0) {
      titles.push(
        visibleArchiveFiles.length > 0 ? 'Egne innlimte notater' : 'Innlimt pensumtekst'
      );
      sections.push(`INNLIMTE NOTATER / PENSUMTEKST:\n${pastedNotes.trim()}`);
    }

    if (selectedPreset && visibleArchiveFiles.length === 0 && pastedNotes.trim().length === 0) {
      titles.push(selectedPreset.title);
      sections.push(selectedPreset.sourceContent);
    }

    return {
      combinedText: sections.join('\n\n---\n\n'),
      sourceTitles: titles
    };
  }, [visibleArchiveFiles, pastedNotes, selectedPreset]);

  const hasValidSource = sourcePayload.combinedText.trim().length >= 15;

  const handleGenerateEpisode = async () => {
    if (!hasValidSource) {
      setErrorMessage(
        'Velg minst én fil fra Filarkivet, lim inn egne notater, eller velg et ferdig BLU-tema før du lager podcast.'
      );
      return;
    }

    stopPlayback();
    setIsGenerating(true);
    setErrorMessage(null);
    setAudioError(null);

    try {
      const generated = await generatePodcastScript({
        sourceText: sourcePayload.combinedText,
        sourceTitles: sourcePayload.sourceTitles,
        lengthPreset,
        angle,
        focusNote: focusNote.trim() || undefined
      });

      const newEpisode: PodcastEpisode = {
        id: `pod_${Date.now()}`,
        userId: userId || undefined,
        title: generated.title,
        summary: generated.summary,
        estimatedMinutes: generated.estimatedMinutes,
        lengthPreset,
        angle,
        focusNote: focusNote.trim() || undefined,
        sourceTitles: sourcePayload.sourceTitles,
        wordCount: countDialogueWords(generated.dialogue),
        dialogue: generated.dialogue,
        createdAt: new Date().toISOString()
      };

      setEpisode(newEpisode);
      setActiveLineIndex(0);
      setViewMode('studio');
    } catch (err: any) {
      console.error('Feil ved generering av podcast:', err);
      setErrorMessage(
        err?.message ||
          'Kunne ikke generere podcast-manus akkurat nå. Prøv igjen om et øyeblikk.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEpisode = async () => {
    if (!episode || isSaving) return;
    setIsSaving(true);
    try {
      const { episode: saved, savedToCloud } = await savePodcastEpisode(
        episode,
        userId
      );
      setEpisode(saved);
      setSavedEpisodes((prev) => [
        saved,
        ...prev.filter((item) => item.id !== saved.id)
      ]);
      setSavedEpisodeIds((prev) => new Set(prev).add(saved.id));
      showTransientFeedback(
        savedToCloud
          ? 'Lagret i episode-historikken på kontoen din'
          : 'Lagret i lokal episode-historikk'
      );
    } catch (err) {
      console.error('Klarte ikke å lagre episode:', err);
      showTransientFeedback('Kunne ikke lagre episoden akkurat nå');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyTranscript = async () => {
    if (!episode) return;
    try {
      const text = formatEpisodeTranscript(episode);
      await navigator.clipboard.writeText(text);
      setCopiedTranscript(true);
      showTransientFeedback('Hele manuset ble kopiert til utklippstavlen');
      window.setTimeout(() => setCopiedTranscript(false), 2200);
    } catch {
      showTransientFeedback('Klarte ikke å kopiere automatisk – merk teksten manuelt');
    }
  };

  const deductAudioMinutes = async (minutes: number) => {
    if (onDeductPodcastMinutes) {
      await onDeductPodcastMinutes(minutes);
    } else {
      setLocalAudioMinutes((prev) => {
        const next = Math.max(0, prev - minutes);
        try {
          localStorage.setItem('blu_podcast_audio_minutes', next.toString());
        } catch {
          // Ignore storage issues
        }
        return next;
      });
    }
  };

  const addAudioMinutes = async (minutes: number) => {
    if (onAddPodcastMinutes) {
      await onAddPodcastMinutes(minutes);
    } else {
      setLocalAudioMinutes((prev) => {
        const next = prev + minutes;
        try {
          localStorage.setItem('blu_podcast_audio_minutes', next.toString());
        } catch {
          // Ignore storage issues
        }
        return next;
      });
    }
  };

  const buildAudioCacheKey = useCallback(
    (
      epId: string,
      quality: PodcastAiQuality,
      host: PodcastAiVoiceId,
      expert: PodcastAiVoiceId
    ) => `${epId}__${quality}__${host}__${quality === 'standard' ? 'single' : expert}`,
    []
  );

  const ensureAiAudioForEpisode = async (
    targetEpisode: PodcastEpisode,
    autoDownload: boolean
  ) => {
    const cacheKey = buildAudioCacheKey(
      targetEpisode.id,
      aiQuality,
      aiHostVoice,
      aiExpertVoice
    );
    const cached = audioCacheRef.current[cacheKey];
    if (cached) {
      setAudioDownloadError(null);
      if (autoDownload) {
        triggerWavDownload(cached.blob, targetEpisode.title);
        showTransientFeedback('Lydfil (.wav) lastet ned på nytt fra økten (0 min trukket)');
      }
      return;
    }

    if (audioDownloadEpisodeId) return;

    const neededMinutes = calculatePodcastAudioCost(
      targetEpisode.estimatedMinutes,
      aiQuality
    );
    if (!isUnlimited && effectiveAudioMinutes < neededMinutes) {
      setAudioDownloadError(null);
      setPendingAudioEpisode(targetEpisode);
      setShowAudioQuotaModal(true);
      return;
    }

    setAudioDownloadEpisodeId(targetEpisode.id);
    setAudioProgress(null);
    setAudioDownloadError(null);

    try {
      const blob = await generatePodcastAudioWav(targetEpisode, {
        qualityLevel: aiQuality,
        hostVoiceName: aiHostVoice,
        expertVoiceName: aiExpertVoice,
        onProgress: setAudioProgress
      });
      const objectUrl = URL.createObjectURL(blob);
      setAudioCache((prev) => {
        const existing = prev[cacheKey];
        if (existing) {
          URL.revokeObjectURL(existing.objectUrl);
        }
        return {
          ...prev,
          [cacheKey]: {
            blob,
            objectUrl,
            episodeId: targetEpisode.id,
            quality: aiQuality
          }
        };
      });

      if (!isUnlimited) {
        await deductAudioMinutes(neededMinutes);
      }

      if (autoDownload) {
        triggerWavDownload(blob, targetEpisode.title);
        showTransientFeedback(
          isUnlimited
            ? 'Lydfil (.wav) lastet ned (VIP – ubegrenset)'
            : `Lydfil (.wav) lastet ned (${neededMinutes} min brukt)`
        );
      } else {
        showTransientFeedback(
          isUnlimited
            ? 'AI-lyd er klar i avspilleren (VIP – ubegrenset)'
            : `AI-lyd er klar for avspilling og nedlasting (${neededMinutes} min brukt)`
        );
      }
    } catch (err: unknown) {
      console.error('Feil ved generering av podcast-lydfil:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Kunne ikke lage lydfil akkurat nå. Ingen minutter ble trukket.';
      setAudioDownloadError(message);
    } finally {
      setAudioDownloadEpisodeId(null);
      setAudioProgress(null);
    }
  };

  const handleDownloadAudio = async (targetEpisode: PodcastEpisode) => {
    await ensureAiAudioForEpisode(targetEpisode, true);
  };

  const handleOpenSavedEpisode = (saved: PodcastEpisode) => {
    stopPlayback();
    setEpisode(saved);
    setActiveLineIndex(0);
    setAudioError(null);
    setAudioDownloadError(null);
    setViewMode('studio');
  };

  const handleDeleteSavedEpisode = async (episodeId: string) => {
    await deletePodcastEpisode(episodeId, userId);
    setSavedEpisodes((prev) => prev.filter((item) => item.id !== episodeId));
    setSavedEpisodeIds((prev) => {
      const next = new Set(prev);
      next.delete(episodeId);
      return next;
    });
    if (episode?.id === episodeId) {
      stopPlayback();
    }
    showTransientFeedback('Episoden ble slettet fra historikken');
  };

  const handleBack = () => {
    stopPlayback();
    onBackToTools?.();
  };

  const handleGoToArchive = () => {
    stopPlayback();
    onNavigateToResources?.();
  };

  const handleConfirmArchiveFiles = (files: PensumFileItem[]) => {
    startPensumAction(files, null);
    setDismissedFileIds([]);
    if (files.length > 0) {
      setSelectedPreset(null);
      showTransientFeedback(
        `${files.length} ${files.length === 1 ? 'kilde' : 'kilder'} klar til podcast`
      );
    } else {
      showTransientFeedback('Kildevalg oppdatert');
    }
  };

  const activeLengthOption =
    PODCAST_LENGTH_OPTIONS.find((opt) => opt.id === lengthPreset) ||
    PODCAST_LENGTH_OPTIONS[0];
  const activeAngleOption =
    PODCAST_ANGLE_OPTIONS.find((opt) => opt.id === angle) ||
    PODCAST_ANGLE_OPTIONS[1];

  const progressPercent =
    episode && episode.dialogue.length > 0
      ? Math.round(((activeLineIndex + 1) / episode.dialogue.length) * 100)
      : 0;

  const isCurrentEpisodeSaved = Boolean(episode && savedEpisodeIds.has(episode.id));

  const angleLabel = (a: PodcastAngle) =>
    PODCAST_ANGLE_OPTIONS.find((opt) => opt.id === a)?.label || 'Praksisnær';

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Studio toppnavigasjon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToTools && (
            <button
              type="button"
              onClick={handleBack}
              className="h-10 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Verktøykassen</span>
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight truncate">
                Pensum-Podden
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0 whitespace-nowrap">
                Beta
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              To-stemmers studiepodcast forankret i pensum og Rammeplanen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mode switch: Studio vs Mine episoder */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('studio')}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
                viewMode === 'studio'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-600" />
              <span>Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap',
                viewMode === 'history'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Mine episoder</span>
              <span className="tabular-nums text-slate-500">
                ({savedEpisodes.length})
              </span>
            </button>
          </div>

          {onNavigateToResources && (
            <button
              type="button"
              onClick={handleGoToArchive}
              className="h-10 px-3.5 rounded-xl bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 hover:text-emerald-800 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Library className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Filarkivet</span>
            </button>
          )}
        </div>
      </div>

      {/* Tilbakemeldingslinje */}
      {statusFeedback && (
        <div
          role="status"
          className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-2"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {statusFeedback}
          </span>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
            aria-label="Lukk melding"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* HISTORIKK-VISNING */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-serif font-bold text-slate-900">
                Lagrede episoder
              </h2>
              <p className="text-xs text-slate-500">
                {storageMode === 'cloud'
                  ? 'Synkronisert med brukerkontoen din · Tilgjengelig på tvers av enheter'
                  : 'Lagret lokalt i denne nettleseren · Logg inn for å synkronisere til kontoen din'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                stopPlayback();
                setEpisode(null);
                setViewMode('studio');
              }}
              className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Lag ny episode</span>
            </button>
          </div>

          {historyLoading ? (
            <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Henter lagrede episoder...</span>
            </div>
          ) : savedEpisodes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Ingen lagrede episoder ennå
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Når du genererer en podcast i studioet kan du klikke «Lagre i historikk» for å lytte til den igjen senere eller laste den ned som lydfil (.wav).
              </p>
              <button
                type="button"
                onClick={() => setViewMode('studio')}
                className="mt-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gå til studio</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {audioDownloadError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start justify-between gap-2"
                >
                  <span className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{audioDownloadError}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAudioDownloadError(null)}
                    className="text-rose-700 hover:text-rose-950 p-0.5 cursor-pointer"
                    aria-label="Lukk feilmelding"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedEpisodes.map((saved) => {
                  const isDownloadingThis = audioDownloadEpisodeId === saved.id;
                  const savedCacheKey = buildAudioCacheKey(
                    saved.id,
                    aiQuality,
                    aiHostVoice,
                    aiExpertVoice
                  );
                  const isCachedInSession = Boolean(audioCache[savedCacheKey]);
                  const savedCost = calculatePodcastAudioCost(
                    saved.estimatedMinutes,
                    aiQuality
                  );
                  return (
                    <div
                      key={saved.id}
                      className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 tabular-nums">
                          <span>{formatDateLabel(saved.createdAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>ca. {saved.estimatedMinutes} min</span>
                          <span aria-hidden="true">·</span>
                          <span>{saved.wordCount} ord</span>
                          <span aria-hidden="true">·</span>
                          <span>{angleLabel(saved.angle)}</span>
                        </div>
                        <h3 className="text-base font-serif font-bold text-slate-900 leading-snug">
                          {saved.title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {saved.summary}
                        </p>
                        {saved.sourceTitles.length > 0 && (
                          <p className="text-[11px] text-slate-500 truncate pt-1">
                            Kilder: {saved.sourceTitles.join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenSavedEpisode(saved)}
                          className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Åpne og spill av</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDownloadAudio(saved)}
                            disabled={Boolean(audioDownloadEpisodeId)}
                            className="h-9 px-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 text-slate-700 hover:text-emerald-800 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap tabular-nums"
                            title={
                              isCachedInSession
                                ? 'Last ned klar lydfil (.wav) på nytt'
                                : `Last ned lydfil (.wav · ${aiQuality === 'standard' ? 'Standard AI' : 'Studio To-stemmers'} · ${savedCost} min)`
                            }
                          >
                            {isDownloadingThis ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                <span className="hidden sm:inline tabular-nums">
                                  {audioProgress
                                    ? `${audioProgress.currentBatch}/${audioProgress.totalBatches}`
                                    : 'Lager…'}
                                </span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Lydfil</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedEpisode(saved.id)}
                            className="h-9 w-9 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-700 inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="Slett episode"
                            aria-label={`Slett ${saved.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GENERERINGS-TILSTAND */}
      {viewMode === 'studio' && isGenerating && (
        <div className="bg-white border border-slate-200 rounded-2xl py-16 px-6 max-w-xl mx-auto text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto relative">
            <Headphones className="w-8 h-8" />
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600 absolute -top-2 -right-2 bg-white rounded-full" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-serif font-bold text-slate-900">
              Skriver manus til Pensum-Podden
            </h2>
            <p className="text-sm text-slate-600">
              Programleder og Fagekspert forbereder samtalen basert på kildene dine.
            </p>
          </div>
          <div className="text-xs text-slate-500 flex flex-wrap items-center justify-center gap-2 pt-1 tabular-nums">
            <span>{activeLengthOption.label}</span>
            <span aria-hidden="true">·</span>
            <span>Mål: {activeLengthOption.wordRangeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{activeAngleOption.label}</span>
          </div>
          {lengthPreset === 'long' && (
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              En dybdeepisode på ca. 20 minutter inneholder over 2 500 ord og tar typisk 20–40 sekunder å skrive.
            </p>
          )}
        </div>
      )}

      {/* OPPSETT / KONFIGURASJON (når ingen episode er åpen) */}
      {viewMode === 'studio' && !isGenerating && !episode && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Venstre kolonne: Kildegrunnlag */}
          <div className="lg:col-span-7 space-y-5">
            {/* Valgte filer fra Filarkivet */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-serif font-bold text-slate-900">
                    1. Velg kilder fra Filarkivet
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bruk én eller flere pensumfiler fra arkivet, lim inn egne notater, eller velg et BLU-tema under.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="h-9 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Library className="w-3.5 h-3.5" />
                  <span>
                    {visibleArchiveFiles.length > 0
                      ? 'Legg til / endre fra Filarkivet'
                      : 'Velg i Filarkivet'}
                  </span>
                </button>
              </div>

              {visibleArchiveFiles.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700 tabular-nums">
                      {visibleArchiveFiles.length}{' '}
                      {visibleArchiveFiles.length === 1 ? 'kilde valgt' : 'kilder valgt'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        clearPensumAction();
                        setDismissedFileIds([]);
                      }}
                      className="text-slate-500 hover:text-rose-700 font-medium cursor-pointer transition-colors"
                    >
                      Tøm kildevalg
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {visibleArchiveFiles.map((file) => {
                      const charCount = file.content?.trim().length || 0;
                      return (
                        <div
                          key={file.id}
                          className="px-3.5 py-2.5 bg-slate-50/50 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {file.title}
                              </p>
                              <p className="text-[11px] text-slate-500 tabular-nums">
                                {file.category || 'Pensum'} ·{' '}
                                {charCount >= 30
                                  ? `${Math.round(charCount / 6)} ord tilgjengelig`
                                  : 'Kun referansetittel (ingen fulltekst)'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setDismissedFileIds((prev) => [...prev, file.id])
                            }
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                            aria-label={`Fjern ${file.title}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {emptyContentFiles.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          {emptyContentFiles.length === 1
                            ? 'Én valgt kilde mangler lagret fulltekst'
                            : `${emptyContentFiles.length} valgte kilder mangler lagret fulltekst`}
                        </span>
                      </div>
                      <p className="text-amber-900/90 leading-relaxed">
                        Du kan fortsatt generere podcast basert på tittelen, eller lime inn utdrag og stikkord under for skarpere forankring i kapittelet.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-800">
                      Ingen arkivfiler valgt akkurat nå
                    </p>
                    <p className="text-slate-500">
                      Hent filer fra Filarkivet, lim inn egne notater under, eller klikk på et ferdig BLU-tema.
                    </p>
                  </div>
                </div>
              )}

              {/* Innlimte notater */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setShowPastedNotes((prev) => !prev)}
                  className="text-xs font-semibold text-slate-700 hover:text-emerald-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {showPastedNotes || emptyContentFiles.length > 0 ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <span>
                    {pastedNotes.trim()
                      ? `Egne innlimte notater (${pastedNotes.trim().split(/\s+/).length} ord)`
                      : 'Lim inn egne notater eller kapittelutdrag (valgfritt)'}
                  </span>
                </button>

                {(showPastedNotes ||
                  emptyContentFiles.length > 0 ||
                  pastedNotes.trim().length > 0) && (
                  <textarea
                    value={pastedNotes}
                    onChange={(e) => {
                      setPastedNotes(e.target.value);
                      if (e.target.value.trim().length > 0) {
                        setSelectedPreset(null);
                      }
                    }}
                    rows={5}
                    placeholder="Lim inn forelesningsnotater, artikkelutdrag eller stikkord fra pensumboka her..."
                    className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-slate-900 placeholder:text-slate-400 leading-relaxed"
                  />
                )}
              </div>
            </section>

            {/* Ferdige BLU-temaer for rask start */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5">
              <div>
                <h2 className="text-base font-serif font-bold text-slate-900">
                  Eller hurtigstart med et ferdig BLU-tema
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ferdige faggrunnlag for barnehagelærerutdanningen når du vil øve raskt uten å laste opp filer.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PODCAST_PRESET_TOPICS.map((topic) => {
                  const isSelected =
                    selectedPreset?.id === topic.id &&
                    visibleArchiveFiles.length === 0 &&
                    pastedNotes.trim().length === 0;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(topic);
                        setErrorMessage(null);
                        if (visibleArchiveFiles.length > 0) {
                          setDismissedFileIds(activePensumFiles.map((f) => f.id));
                        }
                        if (pastedNotes.trim().length > 0) {
                          setPastedNotes('');
                        }
                      }}
                      className={cn(
                        'p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-emerald-700">
                          {topic.category}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {topic.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-snug">
                        {topic.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Høyre kolonne: Episode-innstillinger og generering */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 lg:sticky lg:top-4">
            {/* Lengde (ordtallstyrt) */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-base font-serif font-bold text-slate-900">
                  2. Velg lengde
                </h2>
                <span className="text-[11px] text-slate-500 tabular-nums">
                  Styrt av ordtall (~140 ord/min)
                </span>
              </div>

              <div className="space-y-2" role="radiogroup" aria-label="Podcast-lengde">
                {PODCAST_LENGTH_OPTIONS.map((opt) => {
                  const active = lengthPreset === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setLengthPreset(opt.id)}
                      className={cn(
                        'w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                        active
                          ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500/30'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                      )}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">
                            {opt.label}
                          </span>
                          <span className="text-xs text-slate-500 tabular-nums">
                            · {opt.wordRangeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5',
                          active
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        )}
                      >
                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Samtalevinkling */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100">
              <h2 className="text-base font-serif font-bold text-slate-900">
                3. Samtalevinkling
              </h2>
              <div
                className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80"
                role="radiogroup"
                aria-label="Samtalevinkling"
              >
                {PODCAST_ANGLE_OPTIONS.map((opt) => {
                  const active = angle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setAngle(opt.id)}
                      className={cn(
                        'py-2 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                        active
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-600 leading-snug">
                {activeAngleOption.description}
              </p>
            </div>

            {/* Valgfritt fokusfelt */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <label
                htmlFor="podcast-focus-input"
                className="block text-sm font-bold text-slate-900"
              >
                4. Valgfritt fokusområde
              </label>
              <input
                id="podcast-focus-input"
                type="text"
                value={focusNote}
                onChange={(e) => setFocusNote(e.target.value)}
                maxLength={280}
                placeholder="F.eks. Fokuser på sammenhengen mellom ledelse og medvirkning"
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs leading-relaxed flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Hovedknapp */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleGenerateEpisode}
                disabled={!hasValidSource || isGenerating}
                className="w-full h-12 px-5 rounded-xl bg-slate-900 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Headphones className="w-4 h-4" />
                <span>Lag podcast</span>
              </button>

              <p className="text-[11px] text-slate-500 text-center tabular-nums">
                {hasValidSource
                  ? `Klar med ${sourcePayload.sourceTitles.length} ${sourcePayload.sourceTitles.length === 1 ? 'kilde' : 'kilder'} · ${activeLengthOption.shortLabel} · ${activeAngleOption.label}`
                  : 'Velg en kilde til venstre for å aktivere knappen'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AVSPILLER + SYNKRONISERT MANUS (To-soners studio) */}
      {viewMode === 'studio' && !isGenerating && episode && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Venstre kolonne: Kontrolldekk og stemmevelger */}
          <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 lg:sticky lg:top-4">
            {/* Episode-info */}
            <div className="space-y-2">
              <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 tabular-nums">
                <span className="font-semibold text-emerald-700">
                  {angleLabel(episode.angle)}
                </span>
                <span aria-hidden="true">·</span>
                <span>ca. {episode.estimatedMinutes} min</span>
                <span aria-hidden="true">·</span>
                <span>{episode.wordCount} ord</span>
                <span aria-hidden="true">·</span>
                <span>{episode.dialogue.length} replikker</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 leading-snug text-balance">
                {episode.title}
              </h2>

              <p className="text-sm text-slate-600 leading-relaxed">
                {episode.summary}
              </p>

              {episode.sourceTitles.length > 0 && (
                <p className="text-xs text-slate-500 pt-1">
                  <span className="font-semibold text-slate-700">Kilder: </span>
                  {episode.sourceTitles.join(', ')}
                </p>
              )}
            </div>

            {/* Avspillingsmodus-skille: Gratis nettleserstemme vs AI-studio-stemmer */}
            {(() => {
              const activeCacheKey = buildAudioCacheKey(
                episode.id,
                aiQuality,
                aiHostVoice,
                aiExpertVoice
              );
              const cachedAudio = audioCache[activeCacheKey];
              const neededMinutes = calculatePodcastAudioCost(
                episode.estimatedMinutes,
                aiQuality
              );
              const isDownloadingThis = audioDownloadEpisodeId === episode.id;
              const needsTopUp =
                !isUnlimited && !cachedAudio && effectiveAudioMinutes < neededMinutes;
              const activeQualityMeta =
                PODCAST_AI_QUALITY_OPTIONS.find((q) => q.id === aiQuality) ||
                PODCAST_AI_QUALITY_OPTIONS[1];

              return (
                <>
                  {/* Tydelig modusbryter mellom Gratis nettleser og AI-stemmer */}
                  <div
                    className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80"
                    role="tablist"
                    aria-label="Velg stemmetype for avspilling"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={voiceEngine === 'browser'}
                      onClick={() => setVoiceEngine('browser')}
                      className={cn(
                        'py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex flex-col items-center gap-0.5',
                        voiceEngine === 'browser'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Nettleserstemmer</span>
                      </span>
                      <span className="text-[10px] font-medium text-emerald-700">
                        Gratis · 0 min
                      </span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={voiceEngine === 'ai'}
                      onClick={() => {
                        stopPlayback();
                        setVoiceEngine('ai');
                      }}
                      className={cn(
                        'py-2 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex flex-col items-center gap-0.5',
                        voiceEngine === 'ai'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>AI-studio</span>
                      </span>
                      <span className="text-[10px] font-medium text-slate-500 tabular-nums">
                        {isUnlimited
                          ? 'VIP · Ubegrenset'
                          : cachedAudio
                          ? 'Klar i økten · 0 min'
                          : `${neededMinutes} min · ${activeQualityMeta.badgeText}`}
                      </span>
                    </button>
                  </div>

                  {/* AVSPILLER-KORT */}
                  {voiceEngine === 'browser' ? (
                    <>
                      {/* Nå snakker + fremdriftslinje (Gratis Web Speech) */}
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={cn(
                                'w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                                episode.dialogue[activeLineIndex]?.speaker === 'Programleder'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-indigo-100 text-indigo-700'
                              )}
                            >
                              {episode.dialogue[activeLineIndex]?.speaker === 'Programleder' ? (
                                <Mic className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <span className="font-semibold text-slate-900 truncate">
                              {episode.dialogue[activeLineIndex]?.speaker || 'Programleder'}
                            </span>
                            <span className="text-slate-500 whitespace-nowrap">
                              {isPlaying && !isPaused
                                ? 'snakker nå'
                                : isPaused
                                ? 'satt på pause'
                                : 'klar'}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums shrink-0">
                            {activeLineIndex + 1} / {episode.dialogue.length}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div
                            role="slider"
                            tabIndex={0}
                            aria-label="Fremdrift i episoden"
                            aria-valuemin={1}
                            aria-valuemax={episode.dialogue.length}
                            aria-valuenow={activeLineIndex + 1}
                            onClick={handleProgressBarClick}
                            onKeyDown={(e) => {
                              if (e.key === 'ArrowRight') handleStepLine(1);
                              if (e.key === 'ArrowLeft') handleStepLine(-1);
                            }}
                            className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            title="Klikk for å hoppe til en del av episoden"
                          >
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all duration-150"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                            <span>Gratis nettleserstemme · 0 min</span>
                            <span>{progressPercent}%</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => startPlaybackFrom(0)}
                            className="h-10 w-10 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 inline-flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Start episoden på nytt"
                            title="Start på nytt"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStepLine(-1)}
                            disabled={activeLineIndex === 0}
                            className="h-10 w-10 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 text-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Forrige replikk"
                            title="Forrige replikk"
                          >
                            <SkipBack className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={handleTogglePlayPause}
                            className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer min-w-[136px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            aria-label={isPlaying && !isPaused ? 'Pause' : 'Spill av'}
                          >
                            {isPlaying && !isPaused ? (
                              <>
                                <Pause className="w-4 h-4 fill-current" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 fill-current" />
                                <span>{isPaused ? 'Fortsett' : 'Spill av'}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStepLine(1)}
                            disabled={activeLineIndex >= episode.dialogue.length - 1}
                            className="h-10 w-10 rounded-xl bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 text-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Neste replikk"
                            title="Neste replikk"
                          >
                            <SkipForward className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {audioError && (
                        <div
                          role="alert"
                          className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>{audioError}</span>
                        </div>
                      )}

                      {/* Hastighet (for nettleseravspilling) */}
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          Hastighet
                        </span>
                        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                          {SPEED_OPTIONS.map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              aria-pressed={playbackRate === rate}
                              onClick={() => handleSpeedChange(rate)}
                              className={cn(
                                'h-8 px-2.5 rounded-lg text-xs font-semibold tabular-nums transition-all cursor-pointer whitespace-nowrap',
                                playbackRate === rate
                                  ? 'bg-white text-slate-900 shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              )}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Del 1: Gratis nettleserstemmer */}
                      <div className="border-t border-slate-100 pt-4 space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowVoiceSettings((prev) => !prev)}
                          className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-950 cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Volume2 className="w-4 h-4 text-slate-600" />
                            <span>
                              Nettleserstemmer · Gratis (
                              {norwegianVoices.length > 0
                                ? `${norwegianVoices.length} norske funnet`
                                : `${availableVoices.length} stemmer`}
                              )
                            </span>
                          </span>
                          {showVoiceSettings ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {showVoiceSettings && (
                          <div className="space-y-3 pt-1">
                            {!speechSupported ? (
                              <p className="text-xs text-slate-500">
                                Nettleseren din støtter ikke Web Speech API.
                              </p>
                            ) : availableVoices.length === 0 ? (
                              <p className="text-xs text-slate-500">
                                Ingen nettleserstemmer ble rapportert ennå. Prøv å trykke Spill av, så laster nettleseren standardstemmen.
                              </p>
                            ) : (
                              <>
                                <div className="space-y-1">
                                  <label
                                    htmlFor="voice-select-host"
                                    className="block text-[11px] font-semibold text-emerald-800"
                                  >
                                    Programleder (nettleser)
                                  </label>
                                  <select
                                    id="voice-select-host"
                                    value={hostVoiceURI}
                                    onChange={(e) =>
                                      handleVoiceChange('Programleder', e.target.value)
                                    }
                                    className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  >
                                    {availableVoices.map((v) => (
                                      <option key={`host-${v.voiceURI}`} value={v.voiceURI}>
                                        {v.name} ({v.lang})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1">
                                  <label
                                    htmlFor="voice-select-expert"
                                    className="block text-[11px] font-semibold text-indigo-800"
                                  >
                                    Ekspert (nettleser)
                                  </label>
                                  <select
                                    id="voice-select-expert"
                                    value={expertVoiceURI}
                                    onChange={(e) =>
                                      handleVoiceChange('Ekspert', e.target.value)
                                    }
                                    className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  >
                                    {availableVoices.map((v) => (
                                      <option key={`exp-${v.voiceURI}`} value={v.voiceURI}>
                                        {v.name} ({v.lang})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {usingPitchSeparation && (
                                  <p className="text-[11px] text-slate-500 leading-snug">
                                    Samme nettleserstemme er valgt for begge rollene – avspilleren skiller dem automatisk med ulik tonehøyde.
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* AI-STUDIO-AVSPILLER */
                    <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-emerald-950 inline-flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{activeQualityMeta.label}</span>
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-800 tabular-nums">
                          {isUnlimited
                            ? 'VIP · 0 min'
                            : cachedAudio
                            ? 'Klar i økten'
                            : `${neededMinutes} min`}
                        </span>
                      </div>

                      {cachedAudio ? (
                        <div className="space-y-2">
                          <audio
                            controls
                            src={cachedAudio.objectUrl}
                            className="w-full h-10"
                          />
                          <p className="text-[11px] text-emerald-800 leading-snug">
                            Samme lydfil kan lastes ned som .wav under uten nytt trekk i økten.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          <p className="text-xs text-slate-600 leading-relaxed">
                            Generer lydfilen med valgt AI-kvalitet og stemmene under for å lytte rett i spilleren og lagre offline (.wav).
                          </p>
                          <button
                            type="button"
                            onClick={() => ensureAiAudioForEpisode(episode, false)}
                            disabled={Boolean(audioDownloadEpisodeId)}
                            className="w-full h-11 px-4 rounded-xl bg-slate-900 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer tabular-nums"
                          >
                            {isDownloadingThis ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>
                                  {audioProgress
                                    ? `Lager AI-lyd (${audioProgress.currentBatch}/${audioProgress.totalBatches})…`
                                    : 'Lager AI-lyd…'}
                                </span>
                              </>
                            ) : needsTopUp ? (
                              <>
                                <Lock className="w-4 h-4 text-amber-300" />
                                <span>Fyll på minutter ({neededMinutes} min kreves)</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 fill-current" />
                                <span>
                                  {isUnlimited
                                    ? 'Generer og spill av AI-lyd (VIP)'
                                    : `Generer og spill av AI-lyd (${neededMinutes} min)`}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Del 2: AI-kvalitet & AI-stemmer (brukes ved AI-avspilling og .wav-nedlasting) */}
                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 inline-flex items-center gap-1.5">
                        <Headphones className="w-4 h-4 text-emerald-600" />
                        <span>AI-kvalitet og stemmer (.wav)</span>
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {isUnlimited
                          ? 'VIP · Ubegrenset'
                          : `Saldo: ${effectiveAudioMinutes} min`}
                      </span>
                    </div>

                    {/* Kvalitetsnivåer med ulik minuttpris */}
                    <div
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                      role="radiogroup"
                      aria-label="Velg AI-lydkvalitet"
                    >
                      {PODCAST_AI_QUALITY_OPTIONS.map((qOpt) => {
                        const active = aiQuality === qOpt.id;
                        const qCost = calculatePodcastAudioCost(
                          episode.estimatedMinutes,
                          qOpt.id
                        );
                        return (
                          <button
                            key={qOpt.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setAiQuality(qOpt.id)}
                            className={cn(
                              'p-2.5 rounded-xl border text-left transition-all cursor-pointer space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                              active
                                ? 'bg-emerald-50/75 border-emerald-500 ring-1 ring-emerald-500/30'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                            )}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-xs font-bold text-slate-900">
                                {qOpt.label}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-800 tabular-nums whitespace-nowrap">
                                {isUnlimited ? 'VIP' : `${qCost} min`}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">
                              {qOpt.badgeText} · {qOpt.id === 'standard' ? '1 stemme' : '2 stemmer'}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* AI-stemmevelger */}
                    <div
                      className={cn(
                        'grid gap-2',
                        aiQuality === 'studio' ? 'grid-cols-2' : 'grid-cols-1'
                      )}
                    >
                      <div className="space-y-1">
                        <label
                          htmlFor="ai-voice-select-host"
                          className="block text-[11px] font-semibold text-emerald-800"
                        >
                          {aiQuality === 'standard'
                            ? 'AI-fortellerstemme'
                            : 'Programleder (AI)'}
                        </label>
                        <select
                          id="ai-voice-select-host"
                          value={aiHostVoice}
                          onChange={(e) =>
                            setAiHostVoice(e.target.value as PodcastAiVoiceId)
                          }
                          className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {PODCAST_AI_VOICES.map((v) => (
                            <option key={`ai-host-${v.id}`} value={v.id}>
                              {v.label} — {v.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      {aiQuality === 'studio' && (
                        <div className="space-y-1">
                          <label
                            htmlFor="ai-voice-select-expert"
                            className="block text-[11px] font-semibold text-indigo-800"
                          >
                            Ekspert (AI)
                          </label>
                          <select
                            id="ai-voice-select-expert"
                            value={aiExpertVoice}
                            onChange={(e) =>
                              setAiExpertVoice(e.target.value as PodcastAiVoiceId)
                            }
                            className="w-full h-9 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {PODCAST_AI_VOICES.map((v) => (
                              <option key={`ai-exp-${v.id}`} value={v.id}>
                                {v.label} — {v.description}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lagring, eksport og ny episode */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEpisode}
                        disabled={isSaving}
                        className={cn(
                          'h-10 px-3 rounded-xl font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap border',
                          isCurrentEpisodeSaved
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                            : 'bg-slate-900 hover:bg-emerald-700 border-slate-900 text-white'
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isCurrentEpisodeSaved ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isCurrentEpisodeSaved ? 'Lagret i historikk' : 'Lagre episode'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyTranscript}
                        className="h-10 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {copiedTranscript ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Kopiert!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopier manus</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 tabular-nums">
                      {isUnlimited ? (
                        <span className="text-emerald-700 font-semibold">
                          VIP · Ubegrenset AI-lydnedlasting ({activeQualityMeta.label})
                        </span>
                      ) : cachedAudio ? (
                        <span className="text-emerald-700 font-semibold">
                          Lydfil klar i økten · gratis ny nedlasting · Saldo: {effectiveAudioMinutes} min
                        </span>
                      ) : (
                        <>
                          <span>
                            Saldo:{' '}
                            <strong className={needsTopUp ? 'text-rose-700' : 'text-slate-700'}>
                              {effectiveAudioMinutes} min
                            </strong>
                            <span aria-hidden="true"> · </span>
                            {activeQualityMeta.label}: {neededMinutes} min
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingAudioEpisode(episode);
                              setShowAudioQuotaModal(true);
                            }}
                            className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer"
                          >
                            {needsTopUp ? 'Fyll på minutter' : '+ Fyll på'}
                          </button>
                        </>
                      )}
                    </div>

                    {audioDownloadError && (
                      <div
                        role="alert"
                        className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>{audioDownloadError}</span>
                      </div>
                    )}

                    {cachedAudio && voiceEngine === 'browser' && (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-900">
                          <span>Generert AI-lydfil ({activeQualityMeta.label})</span>
                          <span className="text-emerald-700">Klar offline</span>
                        </div>
                        <audio
                          controls
                          src={cachedAudio.objectUrl}
                          className="w-full h-9"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadAudio(episode)}
                        disabled={Boolean(audioDownloadEpisodeId)}
                        className={cn(
                          'h-10 px-3 rounded-xl border font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed tabular-nums',
                          needsTopUp
                            ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                            : 'bg-white hover:bg-emerald-50 hover:border-emerald-300 border-slate-200 text-slate-700 hover:text-emerald-800'
                        )}
                        title={
                          cachedAudio
                            ? 'Last ned den genererte .wav-lydfilen på nytt'
                            : isUnlimited
                            ? `Generer og last ned .wav (${activeQualityMeta.label})`
                            : `Generer lydfil (.wav · ${activeQualityMeta.label} · ${neededMinutes} min)`
                        }
                      >
                        {isDownloadingThis ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            <span>
                              {audioProgress
                                ? `Lager (${audioProgress.currentBatch}/${audioProgress.totalBatches})…`
                                : 'Lager lyd…'}
                            </span>
                          </>
                        ) : needsTopUp ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Last ned .wav ({neededMinutes} min)</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>
                              {cachedAudio || isUnlimited
                                ? 'Last ned .wav'
                                : `Last ned .wav (${neededMinutes} min)`}
                            </span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          stopPlayback();
                          setAudioDownloadError(null);
                          setEpisode(null);
                        }}
                        className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ny episode</span>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </aside>

          {/* Høyre kolonne: Interaktivt, synkronisert manus */}
          <section className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-serif font-bold text-slate-900">
                  Interaktivt manus
                </h3>
                <p className="text-xs text-slate-500">
                  Klikk på hvilken som helst replikk for å hoppe rett dit i avspillingen.
                </p>
              </div>

              <button
                type="button"
                aria-pressed={autoScrollEnabled}
                onClick={() => setAutoScrollEnabled((prev) => !prev)}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap',
                  autoScrollEnabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                )}
              >
                Auto-scroll: {autoScrollEnabled ? 'På' : 'Av'}
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 max-h-[72vh] overflow-y-auto">
              {episode.dialogue.map((turn, idx) => {
                const isActive = idx === activeLineIndex;
                const isHost = turn.speaker === 'Programleder';

                return (
                  <button
                    key={`${episode.id}-line-${idx}`}
                    ref={(el) => {
                      lineRefs.current[idx] = el;
                    }}
                    type="button"
                    onClick={() => startPlaybackFrom(idx)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border transition-all cursor-pointer space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                      isActive
                        ? isHost
                          ? 'bg-emerald-50/75 border-emerald-300 ring-1 ring-emerald-300/60'
                          : 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300/60'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs',
                            isHost
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          )}
                        >
                          {isHost ? (
                            <Mic className="w-3.5 h-3.5" />
                          ) : (
                            <BookOpen className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span
                          className={cn(
                            'text-xs font-bold',
                            isHost ? 'text-emerald-900' : 'text-indigo-900'
                          )}
                        >
                          {turn.speaker}
                        </span>
                        {isActive && isPlaying && !isPaused && (
                          <span className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1">
                            · Leses nå
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        #{idx + 1}
                      </span>
                    </div>

                    <p
                      className={cn(
                        'text-[15px] leading-relaxed',
                        isActive ? 'text-slate-950 font-medium' : 'text-slate-700'
                      )}
                    >
                      {turn.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Kvote- og påfyllsmodal for nedlastbar AI-lydfil (.wav) */}
      {showAudioQuotaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative space-y-5">
            <button
              type="button"
              onClick={() => {
                setShowAudioQuotaModal(false);
                setPendingAudioEpisode(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
              aria-label="Lukk modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
                <Headphones className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Last ned podcast som lydfil (.wav)
                </h3>
                <p className="text-xs font-semibold text-emerald-700 tabular-nums">
                  {PODCAST_SEMESTER_INCLUDED_MINUTES} min inkludert i Semester-pakka · Påfyll via Stripe
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Hvorfor koster AI-lydfiler minutter?
              </p>
              <p className="leading-relaxed">
                Å lage en ekte to-stemmers lydfil for offline avspilling bruker egne lyd-tokens. Avspilling direkte i nettleseren og kopiering av manus er alltid gratis.
              </p>
              <p className="leading-relaxed text-slate-500">
                Semester-pakka inkluderer{' '}
                <strong className="text-slate-700">
                  {PODCAST_SEMESTER_INCLUDED_MINUTES} minutter
                </strong>
                . Trenger du mer, kan du fylle på når som helst.
              </p>
            </div>

            {/* Gjeldende saldo og episodebehov */}
            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-1.5 text-xs tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-emerald-950 font-medium">Din lydsaldo:</span>
                <span className="font-bold text-emerald-900 font-mono">
                  {effectiveAudioMinutes} min
                </span>
              </div>
              {pendingAudioEpisode && (
                <div className="flex items-center justify-between text-emerald-900/90">
                  <span>
                    Valgt kvalitet ({aiQuality === 'standard' ? 'Standard AI · 0,5×' : 'Studio To-stemmers · 1×'}):
                  </span>
                  <span className="font-bold font-mono">
                    {calculatePodcastAudioCost(
                      pendingAudioEpisode.estimatedMinutes,
                      aiQuality
                    )}{' '}
                    min
                  </span>
                </div>
              )}
              {pendingAudioEpisode && aiQuality === 'studio' && (
                <p className="text-[11px] text-emerald-900/80 pt-1">
                  Tips: Bytt til <strong>Standard AI</strong> i stemmeinnstillingene for å bruke bare{' '}
                  {calculatePodcastAudioCost(pendingAudioEpisode.estimatedMinutes, 'standard')}{' '}
                  min, eller lytt gratis med nettleserstemmer.
                </p>
              )}
            </div>

            {/* Kjøpshandlinger */}
            <div className="space-y-2.5">
              {!isSemesterPlan && onUpgrade && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAudioQuotaModal(false);
                    setPendingAudioEpisode(null);
                    onUpgrade();
                  }}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Oppgrader til Semester-pakka</span>
                  </div>
                  <span className="text-xs font-mono opacity-95">60 min inkl.</span>
                </button>
              )}

              <button
                type="button"
                onClick={async () => {
                  setShowAudioQuotaModal(false);
                  if (
                    STRIPE_PODCAST_MINUTES_30_URL &&
                    !STRIPE_PODCAST_MINUTES_30_URL.includes('test_podcast_minutes')
                  ) {
                    window.open(
                      getStripePaymentUrl(
                        STRIPE_PODCAST_MINUTES_30_URL,
                        userId || undefined,
                        userEmail || undefined
                      ),
                      '_blank',
                      'noopener,noreferrer'
                    );
                  } else {
                    await addAudioMinutes(30);
                    showTransientFeedback('+30 min AI-lyd lagt til på kontoen din');
                  }
                  setPendingAudioEpisode(null);
                }}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl font-black text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-between cursor-pointer tabular-nums"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Kjøp +30 minutter via Stripe</span>
                </div>
                <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-md text-xs font-mono">
                  {PODCAST_MINUTES_PACK_30_PRICE},- NOK
                </span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setShowAudioQuotaModal(false);
                  if (
                    STRIPE_PODCAST_MINUTES_90_URL &&
                    !STRIPE_PODCAST_MINUTES_90_URL.includes('test_podcast_minutes')
                  ) {
                    window.open(
                      getStripePaymentUrl(
                        STRIPE_PODCAST_MINUTES_90_URL,
                        userId || undefined,
                        userEmail || undefined
                      ),
                      '_blank',
                      'noopener,noreferrer'
                    );
                  } else {
                    await addAudioMinutes(90);
                    showTransientFeedback('+90 min AI-lyd lagt til på kontoen din');
                  }
                  setPendingAudioEpisode(null);
                }}
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-between cursor-pointer tabular-nums"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Kjøp +90 minutter via Stripe</span>
                </div>
                <span className="bg-slate-800 px-2 py-0.5 rounded-md text-xs font-mono text-emerald-300">
                  {PODCAST_MINUTES_PACK_90_PRICE},- NOK
                </span>
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowAudioQuotaModal(false);
                  setPendingAudioEpisode(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
              >
                Avbryt og lytt gratis i nettleseren
              </button>
            </div>
          </div>
        </div>
      )}

      <ArchiveFilePickerModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        selectedFiles={visibleArchiveFiles}
        onConfirmSelection={handleConfirmArchiveFiles}
        onOpenFullArchive={onNavigateToResources ? handleGoToArchive : undefined}
      />
    </div>
  );
}

export default PodcastModule;
