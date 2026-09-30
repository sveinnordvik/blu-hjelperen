import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';

export type NoteCategory = 
  | 'Observasjon'
  | 'Didaktisk idé'
  | 'Rammeplanen'
  | 'Barna sa/gjorde'
  | 'Praksisveileder'
  | 'Annet';

export interface FieldNote {
  id: string;
  userId?: string;
  title: string;
  content: string;
  category: NoteCategory;
  isPinned?: boolean;
  isArchived?: boolean;
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY = 'blu_field_notes_v1';

export const getLocalFieldNotes = (): FieldNote[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error reading field notes from localStorage', err);
    return [];
  }
};

export const setLocalFieldNotes = (notes: FieldNote[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Error saving field notes to localStorage', err);
  }
};

type NotesListener = (notes: FieldNote[]) => void;
const listeners = new Set<NotesListener>();

const notifyListeners = (notes: FieldNote[]) => {
  listeners.forEach((listener) => listener(notes));
};

export const subscribeFieldNotes = (callback: NotesListener): (() => void) => {
  listeners.add(callback);
  
  // Initial fire from local storage
  const local = getLocalFieldNotes();
  callback(local);

  let unsubscribeFirestore: (() => void) | null = null;

  try {
    const user = auth?.currentUser;
    if (user && db) {
      const q = query(
        collection(db, 'fieldNotes'),
        where('userId', '==', user.uid)
      );

      unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          const remoteNotes: FieldNote[] = snapshot.docs.map((d) => ({
            ...(d.data() as FieldNote),
            id: d.id,
          }));

          // Merge local and remote
          const localNotes = getLocalFieldNotes();
          const map = new Map<string, FieldNote>();
          localNotes.forEach((n) => map.set(n.id, n));
          remoteNotes.forEach((n) => map.set(n.id, n));

          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );

          setLocalFieldNotes(merged);
          notifyListeners(merged);
        },
        (error) => {
          console.warn('Firestore field notes subscription fallback to offline cache:', error);
          callback(getLocalFieldNotes());
        }
      );
    }
  } catch (err) {
    console.warn('Could not initialize firestore subscription, staying offline:', err);
  }

  return () => {
    listeners.delete(callback);
    if (unsubscribeFirestore) {
      unsubscribeFirestore();
    }
  };
};

export const saveFieldNote = async (note: FieldNote): Promise<void> => {
  // Always update offline cache first (failsafe)
  const current = getLocalFieldNotes();
  const existingIdx = current.findIndex((n) => n.id === note.id);
  const updatedList = [...current];

  if (existingIdx >= 0) {
    updatedList[existingIdx] = note;
  } else {
    updatedList.unshift(note);
  }

  setLocalFieldNotes(updatedList);
  notifyListeners(updatedList);

  // Sync to Firestore if authenticated
  try {
    const user = auth?.currentUser;
    if (user && db) {
      const noteToSave = {
        ...note,
        userId: user.uid,
      };
      await setDoc(doc(db, 'fieldNotes', note.id), noteToSave, { merge: true });
    }
  } catch (err) {
    console.warn('Saved offline. Cloud sync pending when back online:', err);
  }
};

export const deleteFieldNote = async (id: string): Promise<void> => {
  // Always update offline cache first
  const current = getLocalFieldNotes();
  const updatedList = current.filter((n) => n.id !== id);
  setLocalFieldNotes(updatedList);
  notifyListeners(updatedList);

  // Remove from Firestore if authenticated
  try {
    const user = auth?.currentUser;
    if (user && db) {
      await deleteDoc(doc(db, 'fieldNotes', id));
    }
  } catch (err) {
    console.warn('Deleted locally. Cloud sync failed:', err);
  }
};
