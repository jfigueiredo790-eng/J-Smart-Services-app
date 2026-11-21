import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  enableNetwork,
  doc,
  getDocFromServer,
  type Firestore
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely (singleton across reloads)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with auto-detect long-polling (uses native Fetch/WebChannel streams first,
// automatically falling back to long-polling only if a proxy blocks streaming).
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

function createFirestoreInstance(): Firestore {
  const settings = {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true
  };
  try {
    return dbId
      ? initializeFirestore(app, settings, dbId)
      : initializeFirestore(app, settings);
  } catch {
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db: Firestore = createFirestoreInstance();

// Initialize Firebase Storage
export const storage = getStorage(app);

// Automatically re-enable Firestore network when the device regains connectivity
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    enableNetwork(db).catch(() => {});
  });
}

// Validate connection to Firestore without emitting false configuration errors on transient mobile offline drops
export async function testConnection(retryOnTransient = true): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    const code = typeof error?.code === 'string' ? error.code : '';
    const message = error instanceof Error ? error.message : String(error);

    // A permission-denied response proves the Cloud Firestore backend is reachable and healthy
    if (code === 'permission-denied' || message.includes('Missing or insufficient permissions')) {
      return true;
    }

    const isTransientOffline =
      code === 'unavailable' ||
      message.includes('the client is offline') ||
      message.includes('Could not reach Cloud Firestore backend');

    if (isTransientOffline && retryOnTransient) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return false;
      }
      await enableNetwork(db).catch(() => {});
      return testConnection(false);
    }

    if (isTransientOffline) {
      console.warn('Firestore está temporariamente em modo offline. A sincronização retomará automaticamente quando a ligação estabilizar.');
    }
    return false;
  }
}

// Defer initial connection probe slightly so browser networking settles cleanly after boot
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection().catch(() => {});
  }, 500);
}

export default app;

