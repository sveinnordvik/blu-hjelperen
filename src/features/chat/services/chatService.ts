import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'model' | 'assistant';
  text: string;
  timestamp?: string;
  createdAt?: string;
}

/**
 * Lagrer en enkelt melding (bruker eller KI) til Firestore.
 * Vi bruker setDoc for å kunne bestemme ID-en til dokumentet selv (message.id).
 */
export const saveMessage = async (userId: string, chatId: string, message: ChatMessageData) => {
  try {
    const db = getFirestore();
    // Stien matcher reglene vi har i firestore.rules: users/{userId}/chats/{chatId}/messages/{messageId}
    const messageRef = doc(db, `users/${userId}/chats/${chatId}/messages`, message.id);
    
    await setDoc(messageRef, {
      ...message,
      // Vi lagrer også et eget tidspunkt for sortering (hvis timestamp fra klienten mangler)
      createdAt: message.timestamp || new Date().toISOString()
    }, { merge: true });

    // Oppdater metadata på selve chat-sesjonen (f.eks. sist oppdatert, tittel)
    const chatDocRef = doc(db, `users/${userId}/chats`, chatId);
    await setDoc(chatDocRef, {
      id: chatId,
      lastMessage: message.text.slice(0, 100),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Feil ved lagring av melding til Firestore:", error);
    // Vi kaster ikke feilen opp for å unngå å blokkere brukerens opplevelse dersom nettverket hikker
  }
};

/**
 * Henter hele chat-historikken for en gitt chat-økt fra Firestore.
 * Sorterer meldingene kronologisk slik at de vises i riktig rekkefølge i UI.
 */
export const getChatHistory = async (userId: string, chatId: string): Promise<ChatMessageData[]> => {
  try {
    const db = getFirestore();
    const messagesRef = collection(db, `users/${userId}/chats/${chatId}/messages`);
    
    // Vi spør databasen og ber om å få dokumentene sortert på "createdAt" (eldst først)
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => doc.data() as ChatMessageData);
  } catch (error) {
    console.error("Feil ved henting av chat-historikk:", error);
    return []; // Returnerer en tom liste hvis det feiler
  }
};

/**
 * Henter alle chat-sesjoner for en bruker
 */
export const getUserChats = async (userId: string) => {
  try {
    const db = getFirestore();
    const chatsRef = collection(db, `users/${userId}/chats`);
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Feil ved henting av chats:", error);
    return [];
  }
};
