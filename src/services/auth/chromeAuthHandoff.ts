import { doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { User } from '../../types';
import { setStoredToken } from '../api';

export interface HandoffPayload {
  handoffId: string;
  status: 'PENDING' | 'COMPLETED' | 'EXPIRED';
  createdAt: string;
  completedAt?: string;
  token?: string;
  uid?: string;
  email?: string;
  fullName?: string;
  photoURL?: string;
}

/**
 * Initiates a secure cross-context OAuth handoff from Android APK WebView to Chrome.
 */
export async function startChromeGoogleAuthHandoff(): Promise<{
  handoffId: string;
  chromeUrl: string;
  intentUrl: string;
}> {
  const handoffId = 'handoff_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  // Create pending handoff document in Firestore
  if (db) {
    try {
      const hRef = doc(db, 'auth_handoffs', handoffId);
      await setDoc(hRef, {
        handoffId,
        status: 'PENDING',
        createdAt: now,
      });
    } catch (err) {
      console.warn('[ChromeAuthHandoff] Error creating handoff record:', err);
    }
  }

  const baseOrigin = window.location.origin;
  const basePath = window.location.pathname;
  const webUrl = `${baseOrigin}${basePath}?google_auth_handoff=${handoffId}`;

  // Android Chrome Intent syntax to open Google Chrome specifically from WebView
  const hostAndPath = `${window.location.host}${basePath}?google_auth_handoff=${handoffId}`;
  const intentUrl = `intent://${hostAndPath}#Intent;scheme=https;package=com.android.chrome;end`;

  return { handoffId, chromeUrl: webUrl, intentUrl };
}

/**
 * Actively listens for completion of the Google OAuth handoff from Chrome.
 */
export function listenForHandoffCompletion(
  handoffId: string,
  onCompleted: (data: { uid: string; email: string; fullName: string; token: string }) => void,
  onError?: (err: any) => void
): () => void {
  if (!db || !handoffId) return () => {};

  let isHandled = false;
  let pollInterval: any = null;
  const hRef = doc(db, 'auth_handoffs', handoffId);

  const checkData = (data: any) => {
    if (data && data.status === 'COMPLETED' && data.token && !isHandled) {
      isHandled = true;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      onCompleted({
        uid: data.uid || '',
        email: data.email || '',
        fullName: data.fullName || '',
        token: data.token,
      });

      // Cleanup handoff document after successful consumption
      deleteDoc(hRef).catch(() => {});
    }
  };

  // 1. Real-time Firestore snapshot listener
  const unsubscribeSnapshot = onSnapshot(
    hRef,
    (snap) => {
      if (snap.exists()) {
        checkData(snap.data());
      }
    },
    (error) => {
      console.warn('[ChromeAuthHandoff] onSnapshot listener note:', error);
      if (onError) onError(error);
    }
  );

  // 2. Window focus & visibility listener (fires when user switches back from Chrome to APK)
  const handleAppResume = async () => {
    if (isHandled) return;
    try {
      const snap = await getDoc(hRef);
      if (snap.exists()) {
        checkData(snap.data());
      }
    } catch (err) {
      console.warn('[ChromeAuthHandoff] onResume check note:', err);
    }
  };

  window.addEventListener('focus', handleAppResume);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      handleAppResume();
    }
  });

  // 3. Fallback active polling every 1.5s (handles Android WebView throttling background web sockets)
  pollInterval = setInterval(async () => {
    if (isHandled) {
      clearInterval(pollInterval);
      return;
    }
    try {
      const snap = await getDoc(hRef);
      if (snap.exists()) {
        checkData(snap.data());
      }
    } catch {}
  }, 1500);

  return () => {
    if (pollInterval) clearInterval(pollInterval);
    unsubscribeSnapshot();
    window.removeEventListener('focus', handleAppResume);
  };
}
