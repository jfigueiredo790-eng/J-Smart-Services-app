import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  enableNetwork,
  disableNetwork,
  doc,
  getDocFromServer,
  type Firestore,
  type FirestoreSettings
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App safely (singleton across reloads)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with forced long-polling in browsers so mobile carrier proxies,
// Android WebViews, and preview proxies never buffer open WebChannel streams indefinitely
// (which causes the "Backend didn't respond within 10 seconds" timeout).
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
const isBrowser = typeof window !== 'undefined';

function createFirestoreInstance(): Firestore {
  const settings: FirestoreSettings = isBrowser
    ? {
        experimentalForceLongPolling: true,
        experimentalLongPollingOptions: {
          timeoutSeconds: 20
        },
        ignoreUndefinedProperties: true
      }
    : {
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

// Keep Firestore network state synchronized with real browser online/offline & mobile resume events
if (isBrowser) {
  let hiddenAt = 0;

  window.addEventListener('offline', () => {
    disableNetwork(db).catch(() => {});
  });

  window.addEventListener('online', () => {
    enableNetwork(db).catch(() => {});
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible') {
        const wasHiddenLong = hiddenAt > 0 && Date.now() - hiddenAt > 30_000;
        hiddenAt = 0;
        if (navigator.onLine !== false && wasHiddenLong) {
          enableNetwork(db).catch(() => {});
        }
      }
    });
  }
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
      code === 'deadline-exceeded' ||
      message.includes('the client is offline') ||
      message.includes('Could not reach Cloud Firestore backend') ||
      message.includes("Backend didn't respond");

    if (isTransientOffline && retryOnTransient) {
      await new Promise(resolve => setTimeout(resolve, 2000));
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
if (isBrowser) {
  setTimeout(() => {
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      testConnection().catch(() => {});
    }
  }, 800);
}

export default app;

