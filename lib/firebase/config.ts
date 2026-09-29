import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

let firebaseApp: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let auth: Auth | null = null;
let isFirebaseConfigured = false;

try {
  if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firestoreInstance = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    isFirebaseConfigured = true;
  }
} catch (error) {
  console.warn('Firebase initialization skipped, using resilient offline local storage:', error);
}

export { firebaseApp, auth, firestoreInstance, isFirebaseConfigured };

