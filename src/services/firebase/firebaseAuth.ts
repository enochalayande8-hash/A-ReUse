import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  updateFirebaseProfile,
  onAuthStateChanged,
  FirebaseUser,
} from './firebaseConfig';

/**
 * Format Firebase Auth errors into clear, friendly messages
 */
export function formatFirebaseAuthError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is invalid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account exists with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please verify your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to multiple failed login attempts. Please try again later or reset your password.';
    case 'auth/network-request-failed':
      return 'Network error connecting to Firebase Authentication. Please check your internet connection.';
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
};
export type { FirebaseUser };
