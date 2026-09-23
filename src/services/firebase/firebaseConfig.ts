import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import firebaseAppletConfig from '../../../firebase-applet-config.json';

// Web app's Firebase configuration loaded from canonical applet config with environment variable overrides
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig?.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig?.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig?.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig?.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig?.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig?.appId || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseAppletConfig?.firestoreDatabaseId || '',
};

// Safe initialization of Firebase App
let appInstance: any = null;
try {
  if (getApps().length > 0) {
    appInstance = getApp();
  } else if (firebaseConfig.apiKey) {
    appInstance = initializeApp(firebaseConfig);
  }
} catch (err) {
  console.warn('[Firebase] App initialization warning:', err);
}
export const app = appInstance;

// Safe initialization of Firebase Auth
let authInstance: Auth | null = null;
try {
  if (app) {
    authInstance = getAuth(app);
  }
} catch (err) {
  console.warn('[Firebase] Auth initialization warning:', err);
}
export const auth = authInstance as Auth;

// Safe initialization of Firestore with explicit database ID
let dbInstance: Firestore | null = null;
try {
  if (app) {
    dbInstance = firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
} catch (err) {
  console.warn('[Firebase] Firestore initialization warning:', err);
}
export const db = dbInstance as Firestore;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const isFirebaseConfigured = (): boolean => {
  return !!firebaseConfig.apiKey && firebaseConfig.apiKey !== '';
};

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  updateFirebaseProfile,
  onAuthStateChanged,
  signInWithPopup,
};
export type { FirebaseUser };
export { db as firestore };
