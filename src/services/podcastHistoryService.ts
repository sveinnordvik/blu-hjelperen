import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { PodcastDialogueLine, PodcastEpisode, countDialogueWords } from '../types/podcast';

const LOCAL_STORAGE_KEY = 'blu_podcast_episodes_v1';
const MAX_LOCAL_EPISODES = 25;

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
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

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return cleaned || `pod_${Date.now()}`;
}

function sanitizeEpisodePayload(
  episode: PodcastEpisode,
  userId?: string
): PodcastEpisode {
  const safeDialogue: PodcastDialogueLine[] = (episode.dialogue || [])
    .slice(0, 120)
    .map((line): PodcastDialogueLine => ({
      speaker: line.speaker === 'Ekspert' ? 'Ekspert' : 'Programleder',
      text: String(line.text || '').trim().slice(0, 4000)
    }))
    .filter((line) => line.text.length > 0);

  const safeSources = (episode.sourceTitles || [])
    .slice(0, 25)
    .map((s) => String(s || '').trim().slice(0, 200))
    .filter(Boolean);

  const safeWordCount =
    typeof episode.wordCount === 'number' && episode.wordCount > 0
      ? Math.round(episode.wordCount)
      : countDialogueWords(safeDialogue);

  return {
    id: sanitizeId(episode.id || `pod_${Date.now()}`),
    ...(userId ? { userId } : episode.userId ? { userId: episode.userId } : {}),
    title: String(episode.title || 'Pensum-Podden episode').trim().slice(0, 250),
    summary: String(episode.summary || '').trim().slice(0, 1000),
    estimatedMinutes: Math.max(1, Math.min(60, Math.round(episode.estimatedMinutes || 5))),
    lengthPreset: ['short', 'medium', 'long'].includes(episode.lengthPreset)
      ? episode.lengthPreset
      : 'short',
    angle: ['oversikt', 'praksisnaer', 'eksamen'].includes(episode.angle)
      ? episode.angle
      : 'praksisnaer',
    focusNote: String(episode.focusNote || '').trim().slice(0, 500),
    sourceTitles: safeSources.length > 0 ? safeSources : ['Pensumkilde'],
    wordCount: safeWordCount,
    dialogue: safeDialogue,
    createdAt: episode.createdAt || new Date().toISOString()
  };
}

function readLocalEpisodes(): PodcastEpisode[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PodcastEpisode =>
        Boolean(item && typeof item.id === 'string' && Array.isArray(item.dialogue))
    );
  } catch (err) {
    console.warn('Kunne ikke lese lokale podcast-episoder:', err);
    return [];
  }
}

function writeLocalEpisodes(episodes: PodcastEpisode[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(episodes.slice(0, MAX_LOCAL_EPISODES))
    );
  } catch (err) {
    console.warn('Kunne ikke lagre lokale podcast-episoder:', err);
  }
}

export async function loadPodcastEpisodes(userId?: string | null): Promise<{
  episodes: PodcastEpisode[];
  storageSource: 'cloud' | 'local';
}> {
  const localEpisodes = readLocalEpisodes();
  const effectiveUid = userId || auth.currentUser?.uid;

  if (!effectiveUid) {
    return { episodes: localEpisodes, storageSource: 'local' };
  }

  const colPath = `users/${effectiveUid}/podcastEpisodes`;
  try {
    const q = query(collection(db, colPath), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const cloudEpisodes: PodcastEpisode[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as PodcastEpisode;
      return {
        ...data,
        id: docSnap.id
      };
    });

    // Merge any unsynced local episodes created in the same browser
    const byId = new Map<string, PodcastEpisode>();
    for (const ep of cloudEpisodes) {
      byId.set(ep.id, ep);
    }
    for (const ep of localEpisodes) {
      if (!byId.has(ep.id) && (!ep.userId || ep.userId === effectiveUid)) {
        byId.set(ep.id, ep);
      }
    }

    const merged = Array.from(byId.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    writeLocalEpisodes(merged);
    return { episodes: merged, storageSource: 'cloud' };
  } catch (error) {
    console.warn('Faller tilbake til lokal podcast-historikk:', error);
    return { episodes: localEpisodes, storageSource: 'local' };
  }
}

export async function savePodcastEpisode(
  episode: PodcastEpisode,
  userId?: string | null
): Promise<{ episode: PodcastEpisode; savedToCloud: boolean }> {
  const effectiveUid = userId || auth.currentUser?.uid;
  const sanitized = sanitizeEpisodePayload(episode, effectiveUid || undefined);

  // Save locally first so user never loses work
  const existingLocal = readLocalEpisodes().filter((e) => e.id !== sanitized.id);
  writeLocalEpisodes([sanitized, ...existingLocal]);

  if (!effectiveUid) {
    return { episode: sanitized, savedToCloud: false };
  }

  const docPath = `users/${effectiveUid}/podcastEpisodes/${sanitized.id}`;
  try {
    const payload = {
      id: sanitized.id,
      userId: effectiveUid,
      title: sanitized.title,
      summary: sanitized.summary,
      estimatedMinutes: sanitized.estimatedMinutes,
      lengthPreset: sanitized.lengthPreset,
      angle: sanitized.angle,
      focusNote: sanitized.focusNote || '',
      sourceTitles: sanitized.sourceTitles,
      wordCount: sanitized.wordCount,
      dialogue: sanitized.dialogue,
      createdAt: sanitized.createdAt
    };
    await setDoc(doc(db, `users/${effectiveUid}/podcastEpisodes`, sanitized.id), payload);
    return { episode: sanitized, savedToCloud: true };
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    } catch {
      // Structured Firestore error already logged; return local save gracefully
      return { episode: sanitized, savedToCloud: false };
    }
  }
}

export async function deletePodcastEpisode(
  episodeId: string,
  userId?: string | null
): Promise<void> {
  const safeId = sanitizeId(episodeId);
  const existingLocal = readLocalEpisodes().filter((e) => e.id !== safeId);
  writeLocalEpisodes(existingLocal);

  const effectiveUid = userId || auth.currentUser?.uid;
  if (!effectiveUid) return;

  const docPath = `users/${effectiveUid}/podcastEpisodes/${safeId}`;
  try {
    await deleteDoc(doc(db, `users/${effectiveUid}/podcastEpisodes`, safeId));
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    } catch {
      // Logged via handleFirestoreError
    }
  }
}

export function formatEpisodeTranscript(episode: PodcastEpisode): string {
  const lines = [
    episode.title,
    '='.repeat(Math.min(episode.title.length, 60)),
    '',
    episode.summary,
    '',
    `Estimert lengde: ca. ${episode.estimatedMinutes} min (${episode.wordCount} ord)`,
    episode.sourceTitles.length > 0 ? `Kilder: ${episode.sourceTitles.join(', ')}` : '',
    episode.focusNote ? `Fokus: ${episode.focusNote}` : '',
    '',
    '--- MANUS ---',
    ''
  ].filter((line, idx) => idx < 10 || line !== undefined);

  for (const turn of episode.dialogue) {
    lines.push(`${turn.speaker}: ${turn.text}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}
