import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  vector,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { generateEmbedding } from './embeddingService';
import { TextChunk } from '../utils/textChunker';
import { OperationType, FirestoreErrorInfo } from './literatureService';

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  text: string;
  score: number;
  metadata: any;
  pageNumber?: number;
  isPublic?: boolean;
}

function handleVectorError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error(`VectorStore Error [${operationType}] på ${path}:`, JSON.stringify(errInfo));
  throw new Error(`Feil ved vektordatabase-operasjon (${operationType} på ${path}): ${errInfo.error}`);
}

/**
 * Beregner cosinus-likhet (Cosine Similarity) mellom to vektorer
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Lagrer tekst-chunks og deres Gemini embedding-vektorer i Firestore vector database.
 * Lagrer i under-samling: users/{userId}/litteratur/{documentId}/chunks
 */
export async function saveDocumentChunks(
  userId: string,
  documentId: string,
  chunks: TextChunk[],
  isPublic: boolean = false
): Promise<void> {
  if (!chunks || chunks.length === 0) return;

  const basePath = isPublic 
    ? `felles_litteratur/${documentId}/chunks` 
    : `users/${userId}/litteratur/${documentId}/chunks`;

  try {
    for (const chunk of chunks) {
      // 1. Generer embedding-vektor via Gemini API
      const embeddingVector = await generateEmbedding(chunk.text);

      // 2. Bygg Firestore-dokument med både råvektor og Firestore vector(...) type dersom tilgjengelig
      const chunkDocRef = isPublic
        ? doc(db, 'felles_litteratur', documentId, 'chunks', chunk.chunkId)
        : doc(db, 'users', userId, 'litteratur', documentId, 'chunks', chunk.chunkId);

      let vectorVal: any = embeddingVector;
      try {
        if (typeof vector === 'function') {
          vectorVal = vector(embeddingVector);
        }
      } catch {
        vectorVal = embeddingVector;
      }

      await setDoc(chunkDocRef, {
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        metadata: chunk.metadata,
        pageNumber: chunk.pageNumber || null,
        embedding: embeddingVector,
        vector: vectorVal,
        isPublic,
        createdAt: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    handleVectorError(error, OperationType.WRITE, basePath);
  }
}

/**
 * Utfører hybrid semantisk vektorsøk (Retrieval) på tvers av:
 * 1. Brukerens private pensumsilo (users/{userId}/litteratur/{docId}/chunks)
 * 2. Det felles Open Access-arkivet (felles_litteratur/{docId}/chunks)
 */
export async function searchSimilarChunks(
  userId: string,
  queryText: string,
  limitNum: number = 5,
  includePublic: boolean = true
): Promise<VectorSearchResult[]> {
  if (!queryText || !queryText.trim()) return [];

  const path = `hybrid_search_private_and_public`;
  try {
    // 1. Generer embedding-vektor for brukerens spørsmål via Gemini
    const queryVector = await generateEmbedding(queryText);

    const candidateDocs: { 
      id: string; 
      text: string; 
      documentId: string; 
      metadata: any; 
      pageNumber?: number; 
      embedding: number[];
      isPublic: boolean;
    }[] = [];

    // 2. Hent kandidater fra private dokumenter
    try {
      const userDocsRef = collection(db, 'users', userId, 'litteratur');
      const userDocsSnap = await getDocs(userDocsRef);

      for (const docSnap of userDocsSnap.docs) {
        const parentData = docSnap.data();
        const chunksRef = collection(db, 'users', userId, 'litteratur', docSnap.id, 'chunks');
        const chunksSnap = await getDocs(chunksRef);

        chunksSnap.forEach(cSnap => {
          const cData = cSnap.data();
          if (Array.isArray(cData.embedding)) {
            candidateDocs.push({
              id: cSnap.id,
              text: cData.text,
              documentId: cData.documentId || docSnap.id,
              metadata: {
                title: parentData.tittel || parentData.title || 'Privat pensum',
                authors: parentData.forfattere || parentData.authors || [],
                year: parentData.utgivelsesår || parentData.year || null,
                sourceType: parentData.kildetype || parentData.sourceType || 'privat_pensum',
                ...(cData.metadata || {})
              },
              pageNumber: cData.pageNumber,
              embedding: cData.embedding,
              isPublic: false
            });
          }
        });
      }
    } catch (privErr) {
      console.warn('Feil ved henting av private litteratur-chunks:', privErr);
    }

    // 3. Hent kandidater fra felles Open Access-arkiv
    if (includePublic) {
      try {
        const publicDocsRef = collection(db, 'felles_litteratur');
        const publicDocsSnap = await getDocs(publicDocsRef);

        for (const pSnap of publicDocsSnap.docs) {
          const parentData = pSnap.data();
          const pChunksRef = collection(db, 'felles_litteratur', pSnap.id, 'chunks');
          const pChunksSnap = await getDocs(pChunksRef);

          pChunksSnap.forEach(cSnap => {
            const cData = cSnap.data();
            if (Array.isArray(cData.embedding)) {
              candidateDocs.push({
                id: cSnap.id,
                text: cData.text,
                documentId: cData.documentId || pSnap.id,
                metadata: {
                  title: parentData.tittel || parentData.title || 'Felles Open Access-artikkel',
                  authors: parentData.forfattere || parentData.authors || [],
                  year: parentData.utgivelsesår || parentData.year || null,
                  sourceType: parentData.kildetype || parentData.sourceType || 'felles_litteratur',
                  ...(cData.metadata || {})
                },
                pageNumber: cData.pageNumber,
                embedding: cData.embedding,
                isPublic: true
              });
            }
          });
        }
      } catch (pubErr) {
        console.warn('Feil ved henting av felles_litteratur chunks:', pubErr);
      }
    }

    // 4. Beregn Cosine Similarity for alle kandidat-chunks
    const scoredResults: VectorSearchResult[] = candidateDocs.map(item => {
      const score = cosineSimilarity(queryVector, item.embedding);
      return {
        chunkId: item.id,
        documentId: item.documentId,
        text: item.text,
        score,
        metadata: item.metadata,
        pageNumber: item.pageNumber,
        isPublic: item.isPublic
      };
    });

    // 5. Sorter fallende etter kosinus-likhet og returner topp N
    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, limitNum);
  } catch (error) {
    handleVectorError(error, OperationType.GET, path);
  }
}
