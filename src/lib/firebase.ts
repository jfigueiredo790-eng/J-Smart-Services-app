import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with experimentalForceLongPolling to handle container/iframe network constraints without WebSocket drops
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

export const db = dbId 
  ? initializeFirestore(app, { experimentalForceLongPolling: true, ignoreUndefinedProperties: true }, dbId)
  : initializeFirestore(app, { experimentalForceLongPolling: true, ignoreUndefinedProperties: true });

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;

