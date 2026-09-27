import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
} from '../services/firebase/firebaseConfig';
import { db } from '../services/firebase/firebaseConfig';
import { BrandLogo } from './BrandLogo';
import { CheckCircle2, AlertCircle, ArrowLeft, ExternalLink, ShieldCheck, RefreshCw, Smartphone } from 'lucide-react';

interface ChromeAuthReceiverProps {
  handoffId: string;
}

export const ChromeAuthReceiver: React.FC<ChromeAuthReceiverProps> = ({ handoffId }) => {
  const [status, setStatus] = useState<'READY' | 'SIGNING_IN' | 'COMPLETED' | 'ERROR'>('READY');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [redirectFallbackAvailable, setRedirectFallbackAvailable] = useState(false);

  // Complete the handoff in Firestore
  const completeHandoff = async (user: any) => {
    try {
      const idToken = await user.getIdToken();
      const cleanEmail = (user.email || '').toLowerCase().trim();
      setUserEmail(cleanEmail);

      if (db && handoffId) {
        const hRef = doc(db, 'auth_handoffs', handoffId);
        await setDoc(
          hRef,
          {
            handoffId,
            status: 'COMPLETED',
            token: idToken,
            uid: user.uid,
            email: cleanEmail,
            fullName: user.displayName || cleanEmail.split('@')[0] || 'Movement Member',
            photoURL: user.photoURL || '',
            completedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      setStatus('COMPLETED');

      // Attempt to automatically return or close after short delay
      setTimeout(() => {
        try {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.close();
          }
        } catch {}
      }, 2500);
    } catch (err: any) {
      console.error('[ChromeAuthReceiver] Error finalizing handoff:', err);
      setStatus('ERROR');
      setErrorMsg(err.message || 'Failed to sync authentication token to the app.');
    }
  };

  // Check on startup if returning from a redirect or already signed in
  useEffect(() => {
    if (!auth) return;

    // 1. Check for OAuth redirect result
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          completeHandoff(result.user);
        }
      })
      .catch((rErr) => {
        console.warn('[ChromeAuthReceiver] Redirect check note:', rErr);
      });

    // 2. Check if user is already signed in on Chrome
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && status === 'READY') {
        completeHandoff(currentUser);
      }
    });

    return () => unsubscribe();
  }, [handoffId]);

  // Direct User-Gesture Google Sign-In via Popup
  const handleGoogleSignInClick = async () => {
    setStatus('SIGNING_IN');
    setErrorMsg(null);
    setRedirectFallbackAvailable(false);

    try {
      if (!auth) {
        throw new Error('Authentication service initializing. Please wait a moment and try again.');
      }

      const result = await signInWithPopup(auth, googleProvider);
      if (result && result.user) {
        await completeHandoff(result.user);
      }
    } catch (err: any) {
      console.warn('[ChromeAuthReceiver] Popup sign-in error:', err);

      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setStatus('READY');
        return;
      }

      const isPopupBlockedOrStorage =
        err?.code === 'auth/popup-blocked' ||
        err?.code === 'auth/missing-initial-state' ||
        err?.message?.includes('missing initial state') ||
        err?.message?.includes('sessionStorage');

      if (isPopupBlockedOrStorage) {
        // Automatically offer redirect fallback
        setRedirectFallbackAvailable(true);
        setStatus('ERROR');
        setErrorMsg('The browser popup was blocked. You can continue using direct redirect authentication below.');
        return;
      }

      setStatus('ERROR');
      setErrorMsg(err.message || 'Google sign-in could not be completed. Please try again.');
    }
  };

  // Fallback direct redirect for environments where popups are blocked
  const handleRedirectSignIn = async () => {
    setStatus('SIGNING_IN');
    setErrorMsg(null);
    try {
      if (!auth) throw new Error('Authentication is initializing.');
      await signInWithRedirect(auth, googleProvider);
    } catch (err: any) {
      setStatus('ERROR');
      setErrorMsg(err.message || 'Redirect sign-in failed.');
    }
  };

  const handleReturnToApp = () => {
    try {
      window.close();
    } catch {}
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Direct back to root without query param so app can load
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border-2 border-[#D4AF37]/50 shadow-xl p-6 sm:p-8 text-center space-y-5 animate-fadeIn">
        <div className="inline-block">
          <BrandLogo size="md" />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#2C1810] tracking-tight font-sans">
            Google Sign-In for Android App
          </h1>
          <p className="text-xs text-[#795548] mt-1.5 leading-relaxed">
            Authorize your account safely in Chrome. Once signed in, authorization will instantly reflect inside the Awareness Global Movement app.
          </p>
        </div>

        {/* READY / DEFAULT STATE: Clear, authentic 1-click button */}
        {status === 'READY' && (
          <div className="py-4 space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#FFFDF5] border border-[#D4AF37]/40 text-left flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#5D4037] leading-relaxed">
                <span className="font-bold text-[#2C1810] block">Official Google Authentication</span>
                Tap below to choose your Google account in Chrome.
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignInClick}
              className="w-full py-3.5 px-4 rounded-2xl bg-white border-2 border-[#2C1810]/20 hover:border-[#D4AF37] hover:bg-[#FFFDF8] text-[#2C1810] text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer active:scale-98"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        {/* SIGNING IN PROGRESS */}
        {status === 'SIGNING_IN' && (
          <div className="py-8 space-y-4">
            <div className="w-10 h-10 border-3 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-[#2C1810]">
              Connecting with Google...
            </p>
            <p className="text-xs text-[#8D6E63] max-w-xs mx-auto">
              Please complete your account selection in the Google prompt.
            </p>
          </div>
        )}

        {/* COMPLETED STATE: Leads back to app */}
        {status === 'COMPLETED' && (
          <div className="py-6 space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-emerald-800">
                Sign-In Complete!
              </h2>
              <p className="text-xs text-[#5D4037]">
                Authenticated as: <strong>{userEmail}</strong>
              </p>
              <p className="text-xs text-emerald-700 font-semibold pt-1">
                ✓ Successfully sent to Awareness Global Movement app.
              </p>
              <p className="text-[11px] text-[#795548]">
                Returning to your app now...
              </p>
            </div>

            <div className="pt-3 space-y-2">
              <button
                type="button"
                onClick={handleReturnToApp}
                className="w-full py-3.5 rounded-xl bg-[#2C1810] text-[#FDFBF7] text-xs font-bold hover:bg-[#3E2723] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
              >
                <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                <span>Return to Movement App</span>
              </button>

              <p className="text-[10px] text-[#8D6E63]">
                Or switch to your app from your recent apps screen — your account is already connected!
              </p>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'ERROR' && (
          <div className="py-4 space-y-4">
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 text-left">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>

            <div className="space-y-2">
              {redirectFallbackAvailable ? (
                <button
                  type="button"
                  onClick={handleRedirectSignIn}
                  className="w-full py-3 rounded-xl bg-[#2C1810] text-[#FDFBF7] text-xs font-bold hover:bg-[#3E2723] transition-all cursor-pointer shadow-xs"
                >
                  Continue with Direct Redirect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  className="w-full py-3 rounded-xl bg-[#2C1810] text-[#FDFBF7] text-xs font-bold hover:bg-[#3E2723] transition-all cursor-pointer shadow-xs"
                >
                  Try Google Sign-In Again
                </button>
              )}

              <button
                type="button"
                onClick={handleReturnToApp}
                className="w-full py-2.5 rounded-xl bg-white border border-[#2C1810]/20 text-[#2C1810] text-xs font-semibold hover:bg-[#FDFBF7] transition-all cursor-pointer"
              >
                Back to App
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
