// Sikkerhetskopi, offline-lagring og versjonshistorikk for BLU-hjelperen

export interface DocumentSnapshot {
  id: string;
  docId: string;
  timestamp: string; // ISO-streng
  displayTime: string; // f.eks. "14:52"
  displayDate: string; // f.eks. "26. sept"
  title: string;
  content: string;
  wordCount: number;
  wordDiff?: number;
  reason: 'autosave' | 'manual' | 'pre_export' | 'restore_point';
  reasonLabel: string;
}

const MAX_SNAPSHOTS = 25;

export function countWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  // Fjern eventuell html
  const clean = text.replace(/<[^>]*>/g, ' ').trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Henter alle lokale versjoner for et gitt dokument
 */
export function getDocumentSnapshots(docId: string): DocumentSnapshot[] {
  if (!docId) return [];
  try {
    const raw = localStorage.getItem(`blu_snapshots_${docId}`);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn('Kunne ikke hente versjonshistorikk fra localStorage:', e);
    return [];
  }
}

/**
 * Lagrer et nytt øyeblikksbilde (snapshot) i historikken
 */
export function saveDocumentSnapshot(
  docId: string,
  title: string,
  content: string,
  reason: 'autosave' | 'manual' | 'pre_export' | 'restore_point' = 'autosave'
): DocumentSnapshot | null {
  if (!docId || content === undefined || content === null) return null;

  try {
    const existing = getDocumentSnapshots(docId);
    const now = new Date();
    const words = countWords(content);

    // Hvis forrige snapshot var identisk på innhold, hopp over med mindre det er manuell lagring
    if (existing.length > 0 && reason === 'autosave') {
      const last = existing[0];
      if (last.content === content) {
        return null;
      }
      // Ikke lagre for ofte hvis innholdsforskjellen er minimal (under 10 ord) og under 3 minutter siden
      const timeDiffMs = now.getTime() - new Date(last.timestamp).getTime();
      const wordDiff = Math.abs(words - last.wordCount);
      if (timeDiffMs < 120000 && wordDiff < 10) {
        return null;
      }
    }

    const lastWordCount = existing.length > 0 ? existing[0].wordCount : words;
    const diff = words - lastWordCount;

    let reasonLabel = 'Automatisk lagret';
    if (reason === 'manual') reasonLabel = 'Manuell lagring';
    if (reason === 'pre_export') reasonLabel = 'Før eksport';
    if (reason === 'restore_point') reasonLabel = 'Sikkerhetskopi før gjenoppretting';

    const newSnapshot: DocumentSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      docId,
      timestamp: now.toISOString(),
      displayTime: now.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }),
      displayDate: now.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }),
      title: title || 'Uten tittel',
      content,
      wordCount: words,
      wordDiff: diff,
      reason,
      reasonLabel
    };

    const updated = [newSnapshot, ...existing].slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(`blu_snapshots_${docId}`, JSON.stringify(updated));

    // Lagre også alltid som den absolutte siste nødkopien
    localStorage.setItem(
      `blu_draft_backup_${docId}`,
      JSON.stringify({
        title,
        content,
        timestamp: now.toISOString(),
        wordCount: words
      })
    );

    return newSnapshot;
  } catch (err) {
    console.warn('Kunne ikke lagre snapshot i localStorage:', err);
    return null;
  }
}

/**
 * Henter nødkopien fra lokal lagring hvis nettet sviktet
 */
export function getLocalEmergencyBackup(docId: string): { title: string; content: string; timestamp: string; wordCount: number } | null {
  try {
    const raw = localStorage.getItem(`blu_draft_backup_${docId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Sletter en spesifikk snapshot fra historikken
 */
export function deleteDocumentSnapshot(docId: string, snapshotId: string): boolean {
  try {
    const existing = getDocumentSnapshots(docId);
    const updated = existing.filter(s => s.id !== snapshotId);
    localStorage.setItem(`blu_snapshots_${docId}`, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}
