import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with autoDetectLongPolling to handle container/iframe network constraints reliably
const dbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

export const db = dbId 
  ? initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true }, dbId)
  : initializeFirestore(app, { experimentalAutoDetectLongPolling: true, ignoreUndefinedProperties: true });

export default app;
