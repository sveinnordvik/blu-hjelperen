import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export { app as default };
export const auth = getAuth(app);

// Initialize Firestore with robust long-polling detection to prevent timeout errors
let dbInstance;
const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== ""
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

try {
  dbInstance = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    },
    dbId
  );
} catch (e) {
  try {
    dbInstance = initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true
      },
      dbId
    );
  } catch (e2) {
    console.warn("Could not initialize with long-polling settings, falling back:", e2);
    dbInstance = getFirestore(app, dbId);
  }
}

export const db = dbInstance;
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged };
