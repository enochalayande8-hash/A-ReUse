// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile as updateFirebaseProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseAppletConfig from '../../../firebase-applet-config.json';

// Web app's Firebase configuration loaded from canonical applet config
export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId,
};

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firebase Firestore Database with explicit database ID
export const db = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId);

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
};
export type { FirebaseUser };
export { db as firestore };

