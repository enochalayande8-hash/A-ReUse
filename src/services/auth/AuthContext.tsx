import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../types';
import { AuthContextValue } from './authTypes';
import { api, getStoredToken, setStoredToken } from '../api';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  updateFirebaseProfile,
  onAuthStateChanged,
  formatFirebaseAuthError,
} from '../firebase/firebaseAuth';
import { saveUserToFirestore } from '../firebase/firestoreService';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and observe Firebase Auth state
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;

      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          const tokenResult = await fbUser.getIdTokenResult();
          const customRole = tokenResult.claims.role as string | undefined;

          const res = await api.firebaseSession({
            uid: fbUser.uid,
            email: fbUser.email || '',
            fullName: fbUser.displayName || undefined,
            idToken,
          });
          if (isMounted) {
            const resolvedUser = res.user;
            if (customRole === 'TOP_ADMIN' && fbUser.uid === 'Bo6cQS55HedBDEADJtcdTyaHqNa2') {
              resolvedUser.role = 'TOP_ADMIN';
            } else if (customRole === 'ADMIN' && resolvedUser.role === 'REGISTERED_USER') {
              resolvedUser.role = 'ADMIN';
            }
            setStoredToken(res.token);
            setToken(res.token);
            setUser(resolvedUser);
            saveUserToFirestore(resolvedUser).catch(() => {});
          }
        } catch (err) {
          console.warn('Firebase session restoration warning:', err);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        const currentToken = getStoredToken();
        if (currentToken) {
          try {
            const res = await api.getMe();
            if (isMounted) setUser(res.user);
          } catch {
            if (isMounted) {
              setStoredToken(null);
              setToken(null);
              setUser(null);
            }
          }
        } else {
          if (isMounted) setUser(null);
        }
        if (isMounted) setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const cleanEmail = email.trim();
    try {
      let userCredential;
      try {
        // 1. Authenticate with Firebase Authentication
        userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (fbErr: any) {
        // Check if user has an existing legacy/seed account in backend database
        try {
          const localRes = await api.login({ email: cleanEmail, password });
          if (localRes && localRes.user) {
            // Attempt to register in Firebase Auth for future logins
            try {
              const newFbUser = await createUserWithEmailAndPassword(auth, cleanEmail, password);
              if (localRes.user.fullName && newFbUser.user) {
                await updateFirebaseProfile(newFbUser.user, { displayName: localRes.user.fullName });
              }
              const idToken = await newFbUser.user.getIdToken();
              await api.firebaseSession({
                uid: newFbUser.user.uid,
                email: cleanEmail,
                fullName: localRes.user.fullName,
                idToken,
              });
            } catch {
              // Ignore if already created or restricted
            }
            setStoredToken(localRes.token);
            setToken(localRes.token);
            setUser(localRes.user);
            return;
          }
        } catch {
          // Local fallback failed as well, throw original friendly Firebase error
        }
        throw new Error(formatFirebaseAuthError(fbErr));
      }

      const fbUser = userCredential.user;
      const idToken = await fbUser.getIdToken();

      // 2. Establish app session
      const res = await api.firebaseSession({
        uid: fbUser.uid,
        email: fbUser.email || cleanEmail,
        fullName: fbUser.displayName || undefined,
        idToken,
      });

      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      saveUserToFirestore(res.user).catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (fullName: string, email: string, password: string, confirmPassword: string) => {
    setIsLoading(true);
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      // 1. Register with Firebase Authentication
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      } catch (fbErr: any) {
        throw new Error(formatFirebaseAuthError(fbErr));
      }

      const fbUser = userCredential.user;

      // 2. Update Firebase display name
      if (cleanName && fbUser) {
        try {
          await updateFirebaseProfile(fbUser, { displayName: cleanName });
        } catch {
          // Non-blocking
        }
      }

      // 3. Get Firebase ID token
      const idToken = await fbUser.getIdToken();

      // 4. Sync with app session
      const res = await api.firebaseSession({
        uid: fbUser.uid,
        email: fbUser.email || cleanEmail,
        fullName: cleanName || fbUser.displayName || cleanEmail.split('@')[0],
        idToken,
      });

      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      saveUserToFirestore(res.user).catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth).catch(() => {});
      await api.logout().catch(() => {});
    } finally {
      setStoredToken(null);
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<string> => {
    const cleanEmail = email.trim();
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      return 'Firebase password reset email has been sent. Please check your inbox.';
    } catch (fbErr: any) {
      try {
        const res = await api.forgotPassword(cleanEmail);
        return res.message;
      } catch {
        throw new Error(formatFirebaseAuthError(fbErr));
      }
    }
  };

  const claimTopAdmin = async (bootstrapKey: string) => {
    setIsLoading(true);
    try {
      let idToken: string | undefined = undefined;
      if (auth.currentUser) {
        idToken = await auth.currentUser.getIdToken(true);
      }
      const res = await api.claimTopAdmin(bootstrapKey, idToken);

      // Force refresh user token to obtain new custom claims (role: 'TOP_ADMIN')
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true);
        await auth.currentUser.getIdTokenResult(true);
      }

      setUser(res.user);
      if (res.user) {
        saveUserToFirestore(res.user).catch(() => {});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!getStoredToken()) return;
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      // ignore
    }
  };

  const updateProfile = async (fullName?: string, profileImageUrl?: string) => {
    if (auth.currentUser && fullName) {
      await updateFirebaseProfile(auth.currentUser, { displayName: fullName }).catch(() => {});
    }
    const res = await api.updateProfile({ fullName, profileImageUrl });
    setUser(res.user);
    saveUserToFirestore(res.user).catch(() => {});
  };

  const isTopAdmin = user?.role === 'TOP_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || isTopAdmin;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isTopAdmin,
        isAdmin,
        login,
        signup,
        logout,
        forgotPassword,
        claimTopAdmin,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

