import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  updateFirebaseProfile,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  FirebaseUser,
} from './firebaseConfig';

/**
 * Format Firebase Auth errors into clear, friendly, and actionable messages
 */
export function formatFirebaseAuthError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';
  const message = error.message || '';

  if (
    code === 'auth/missing-initial-state' ||
    message.includes('missing initial state') ||
    message.includes('sessionStorage is inaccessible') ||
    message.includes('storage-partitioned')
  ) {
    return 'Google Sign-In is restricted inside downloadable APK webviews because Android isolates popup session storage. Please sign in or register with your Email and Password below for instant access inside the APK.';
  }

  if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
    return 'The sign-in popup was blocked by your browser or app. Please sign in with your Email and Password below.';
  }

  if (code === 'auth/web-storage-unsupported' || message.includes('web-storage-unsupported')) {
    return 'Web storage is disabled or restricted in this environment. Please sign in with your Email and Password below.';
  }

  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with this email address. Please sign in with your email and password.';
  }

  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is invalid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account exists with this email address. Please click Sign Up below to create your account.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled or pending configuration in the Firebase project.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Console. Please add this deployment domain to Firebase Authentication Authorized Domains.';
    case 'auth/popup-closed-by-user':
      return 'The authentication popup was closed before completing.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to multiple failed login attempts. Please try again later or reset your password.';
    case 'auth/network-request-failed':
      return 'Network error connecting to authentication services. Please check your internet connection.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

export {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  updateFirebaseProfile,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
};
export type { FirebaseUser };

