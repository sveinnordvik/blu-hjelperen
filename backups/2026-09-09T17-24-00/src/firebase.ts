import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore - robustness for missing or invalid database ID
let dbInstance;
try {
  // Try with databaseId from config
  const dbId = firebaseConfig.firestoreDatabaseId;
  dbInstance = getFirestore(app, dbId && dbId !== "" ? dbId : undefined);
} catch (e) {
  console.warn("Could not initialize with named databaseId, falling back to default:", e);
  dbInstance = getFirestore(app);
}
export const db = dbInstance;
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged };
