import { 
  collection, 
  addDoc, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { LiteratureDocument } from '../types/literature';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error(`Firestore Error [${operationType}] på ${path}:`, JSON.stringify(errInfo));
  throw new Error(`Feil ved Firestore-operasjon (${operationType} på ${path}): ${errInfo.error}`);
}

/**
 * Normaliserer og sikrer at både engelske og norske feltnavn er utfylt på dokumentet
 */
function normalizeDocumentData(data: Partial<LiteratureDocument>, userId?: string): LiteratureDocument {
  const title = data.title || data.tittel || 'Uten tittel';
  const authors = Array.isArray(data.authors) 
    ? data.authors 
    : (Array.isArray(data.forfattere) ? data.forfattere : []);
  const year = Number(data.year || data.utgivelsesår || new Date().getFullYear());
  const createdAt = data.createdAt || data.opplastingsdato || new Date().toISOString();
  const sourceType = data.sourceType || data.kildetype || 'pdf';
  const access = data.access || data.tilgang || 'privat';

  return {
    ...data,
    title,
    tittel: title,
    authors,
    forfattere: authors,
    year,
    utgivelsesår: year,
    createdAt,
    opplastingsdato: createdAt,
    sourceType,
    kildetype: sourceType,
    access,
    tilgang: access,
    userId: userId || data.userId || auth.currentUser?.uid || ''
  };
}

/**
 * Legger til et privat litteratur-dokument i brukerens silo (users/{userId}/litteratur)
 */
export async function addPrivateDocument(
  userId: string,
  documentData: Omit<LiteratureDocument, 'id'>
): Promise<LiteratureDocument> {
  const path = `users/${userId}/litteratur`;
  try {
    if (!userId) {
      throw new Error('Gyldig bruker-ID (userId) er påkrevd for å opprette private dokumenter.');
    }
    const normalized = normalizeDocumentData({ ...documentData, access: 'privat', tilgang: 'privat' }, userId);
    const colRef = collection(db, 'users', userId, 'litteratur');
    const docRef = await addDoc(colRef, {
      ...normalized,
      createdTimestamp: serverTimestamp()
    });
    return {
      ...normalized,
      id: docRef.id
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Henter alle private litteratur-dokumenter for en bruker (users/{userId}/litteratur)
 */
export async function getPrivateDocuments(userId: string): Promise<LiteratureDocument[]> {
  const path = `users/${userId}/litteratur`;
  try {
    if (!userId) {
      throw new Error('Gyldig bruker-ID (userId) er påkrevd for å hente private dokumenter.');
    }
    const colRef = collection(db, 'users', userId, 'litteratur');
    const snapshot = await getDocs(colRef);
    const documents: LiteratureDocument[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...normalizeDocumentData(data, userId)
      };
    });
    return documents;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Legger til et felles Open Access-dokument i fellesarkivet (felles_litteratur)
 */
export async function addPublicDocument(
  documentData: Omit<LiteratureDocument, 'id'>
): Promise<LiteratureDocument> {
  const path = 'felles_litteratur';
  try {
    const currentUserId = auth.currentUser?.uid || '';
    const normalized = normalizeDocumentData({ ...documentData, access: 'felles', tilgang: 'felles' }, currentUserId);
    const colRef = collection(db, 'felles_litteratur');
    const docRef = await addDoc(colRef, {
      ...normalized,
      createdTimestamp: serverTimestamp()
    });
    return {
      ...normalized,
      id: docRef.id
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Henter alle felles Open Access-dokumenter fra fellesarkivet (felles_litteratur)
 */
export async function getPublicDocuments(): Promise<LiteratureDocument[]> {
  const path = 'felles_litteratur';
  try {
    const colRef = collection(db, 'felles_litteratur');
    const snapshot = await getDocs(colRef);
    const documents: LiteratureDocument[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...normalizeDocumentData(data)
      };
    });
    return documents;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
