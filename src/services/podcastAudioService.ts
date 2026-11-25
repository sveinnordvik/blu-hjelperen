import {
  PodcastAiQuality,
  PodcastAiVoiceId,
  PodcastDialogueLine,
  PodcastEpisode
} from '../types/podcast';

const MAX_TURNS_PER_BATCH = 8;
const MAX_CHARS_PER_BATCH = 2200;

export interface PodcastAudioProgress {
  currentBatch: number;
  totalBatches: number;
}

export interface GeneratePodcastAudioOptions {
  qualityLevel?: PodcastAiQuality;
  hostVoiceName?: PodcastAiVoiceId;
  expertVoiceName?: PodcastAiVoiceId;
  onProgress?: (progress: PodcastAudioProgress) => void;
}

export function batchPodcastDialogue(
  dialogue: PodcastDialogueLine[]
): PodcastDialogueLine[][] {
  const cleanLines = (dialogue || [])
    .map((line) => ({
      speaker: (line.speaker === 'Ekspert' ? 'Ekspert' : 'Programleder') as
        | 'Programleder'
        | 'Ekspert',
      text: (line.text || '').replace(/\s+/g, ' ').trim()
    }))
    .filter((line) => line.text.length > 0);

  if (cleanLines.length === 0) return [];

  const batches: PodcastDialogueLine[][] = [];
  let current: PodcastDialogueLine[] = [];
  let currentChars = 0;

  for (const line of cleanLines) {
    const wouldExceedTurns = current.length >= MAX_TURNS_PER_BATCH;
    const wouldExceedChars =
      current.length > 0 && currentChars + line.text.length > MAX_CHARS_PER_BATCH;

    if (wouldExceedTurns || wouldExceedChars) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(line);
    currentChars += line.text.length;
  }

  if (current.length > 0) {
    // Unngå ensom 1-replikks sluttbolk når forrige bolk har plass
    if (current.length === 1 && batches.length > 0) {
      const prev = batches[batches.length - 1];
      const prevChars = prev.reduce((sum, t) => sum + t.text.length, 0);
      if (prevChars + current[0].text.length <= 3200) {
        prev.push(current[0]);
      } else {
        batches.push(current);
      }
    } else {
      batches.push(current);
    }
  }

  return batches;
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface ParsedWavClip {
  sampleRate: number;
  numChannels: number;
  bitsPerSample: number;
  pcmData: Uint8Array;
}

function parseWavClip(wavBytes: Uint8Array): ParsedWavClip {
  if (wavBytes.length < 44) {
    return {
      sampleRate: 24000,
      numChannels: 1,
      bitsPerSample: 16,
      pcmData: wavBytes
    };
  }

  const view = new DataView(
    wavBytes.buffer,
    wavBytes.byteOffset,
    wavBytes.byteLength
  );

  const riff =
    String.fromCharCode(wavBytes[0], wavBytes[1], wavBytes[2], wavBytes[3]) ===
    'RIFF';
  const wave =
    String.fromCharCode(wavBytes[8], wavBytes[9], wavBytes[10], wavBytes[11]) ===
    'WAVE';

  if (!riff || !wave) {
    // Hvis serveren mot formodning returnerer rå PCM uten header
    return {
      sampleRate: 24000,
      numChannels: 1,
      bitsPerSample: 16,
      pcmData: wavBytes
    };
  }

  let sampleRate = 24000;
  let numChannels = 1;
  let bitsPerSample = 16;
  let offset = 12;

  while (offset + 8 <= wavBytes.length) {
    const chunkId = String.fromCharCode(
      wavBytes[offset],
      wavBytes[offset + 1],
      wavBytes[offset + 2],
      wavBytes[offset + 3]
    );
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;

    if (chunkId === 'fmt ' && chunkStart + 16 <= wavBytes.length) {
      numChannels = view.getUint16(chunkStart + 2, true) || 1;
      sampleRate = view.getUint32(chunkStart + 4, true) || 24000;
      bitsPerSample = view.getUint16(chunkStart + 14, true) || 16;
    } else if (chunkId === 'data') {
      const dataEnd = Math.min(wavBytes.length, chunkStart + chunkSize);
      return {
        sampleRate,
        numChannels,
        bitsPerSample,
        pcmData: wavBytes.slice(chunkStart, dataEnd)
      };
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  // Fallback: standard 44-byte RIFF-header
  return {
    sampleRate,
    numChannels,
    bitsPerSample,
    pcmData: wavBytes.slice(44)
  };
}

export function mergeWavBuffers(wavClips: Uint8Array[]): Blob {
  if (wavClips.length === 0) {
    throw new Error('Ingen lydklipp å sette sammen.');
  }

  if (wavClips.length === 1) {
    return new Blob([wavClips[0]], { type: 'audio/wav' });
  }

  const parsedClips = wavClips.map(parseWavClip);
  const { sampleRate, numChannels, bitsPerSample } = parsedClips[0];
  const totalPcmBytes = parsedClips.reduce(
    (sum, clip) => sum + clip.pcmData.length,
    0
  );

  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + totalPcmBytes, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, totalPcmBytes, true);

  const merged = new Uint8Array(44 + totalPcmBytes);
  merged.set(new Uint8Array(header), 0);

  let writeOffset = 44;
  for (const clip of parsedClips) {
    merged.set(clip.pcmData, writeOffset);
    writeOffset += clip.pcmData.length;
  }

  return new Blob([merged], { type: 'audio/wav' });
}

export async function generatePodcastAudioWav(
  episode: PodcastEpisode,
  optionsOrProgress?:
    | GeneratePodcastAudioOptions
    | ((progress: PodcastAudioProgress) => void)
): Promise<Blob> {
  const options: GeneratePodcastAudioOptions =
    typeof optionsOrProgress === 'function'
      ? { onProgress: optionsOrProgress }
      : optionsOrProgress || {};
  const {
    qualityLevel = 'studio',
    hostVoiceName = 'Kore',
    expertVoiceName = 'Charon',
    onProgress
  } = options;

  const batches = batchPodcastDialogue(episode.dialogue);
  if (batches.length === 0) {
    throw new Error('Episoden mangler replikker å gjøre om til lyd.');
  }

  let authToken = '';
  try {
    const { getAuth } = await import('firebase/auth');
    const { app } = await import('../firebaseConfig');
    const authInstance = getAuth(app);
    if (authInstance.currentUser) {
      authToken = await authInstance.currentUser.getIdToken();
    }
  } catch {
    // Fortsett som gjest i lokalt/preview-miljø
  }

  const wavClips: Uint8Array[] = [];

  for (let i = 0; i < batches.length; i++) {
    onProgress?.({ currentBatch: i + 1, totalBatches: batches.length });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      headers['X-Firebase-Auth'] = authToken;
    }

    const res = await fetch('/api/gemini/podcast-audio', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dialogue: batches[i],
        qualityLevel,
        hostVoiceName,
        expertVoiceName
      })
    });

    const rawText = await res.text().catch(() => '');
    let data: { audioBase64?: string; error?: string } = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        // Ikke JSON (f.eks. HTML fra proxy)
      }
    }

    if (!res.ok) {
      throw new Error(
        data?.error ||
          `Klarte ikke å generere lydfil (HTTP ${res.status}). Prøv igjen om et øyeblikk.`
      );
    }

    if (!data?.audioBase64 || typeof data.audioBase64 !== 'string') {
      throw new Error(
        data?.error || 'Mottok tomt lydsvar fra serveren. Prøv igjen.'
      );
    }

    wavClips.push(decodeBase64ToUint8Array(data.audioBase64));
  }

  return mergeWavBuffers(wavClips);
}

export function triggerWavDownload(blob: Blob, title: string): void {
  const url = URL.createObjectURL(blob);
  const safeFilename = (title || 'pensum-podden')
    .toLowerCase()
    .replace(/[^a-z0-9æøå]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFilename || 'pensum-podden'}.wav`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
