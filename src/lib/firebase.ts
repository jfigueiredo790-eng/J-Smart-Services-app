import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
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

// Validate Connection to Firestore on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration: the client is offline.');
    }
    return false;
  }
}
testConnection();

export default app;

