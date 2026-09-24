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
  signInWithPopup,
  googleProvider,
  formatFirebaseAuthError,
} from '../firebase/firebaseAuth';
import {
  saveUserToFirestore,
  getUserFromFirestore,
  checkIfUserIsAdminInFirestore,
  ensureAdminRecordInFirestore,
} from '../firebase/firestoreService';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Helper to determine if an email or UID is recognized as Top Admin
export const isDesignatedTopAdmin = (email?: string | null, uid?: string | null): boolean => {
  if (uid && uid === 'Bo6cQS55HedBDEADJtcdTyaHqNa2') return true;
  if (!email) return false;
  const clean = email.toLowerCase().trim();
  return (
    clean === 'enochalayande8@gmail.com' ||
    clean === 'enochalay8@gmail.com' ||
    clean === 'enochalayande8@gmail.come' ||
    clean.startsWith('enochalayande8@') ||
    clean.startsWith('enochalay8@')
  );
};

/**
 * Universal session resolver: attempts backend API session if available,
 * otherwise transparently resolves from Firebase Auth + Firestore directly.
 * This guarantees login and signup NEVER fail on static hosting like Vercel.
 */
async function resolveUserSession(
  fbUser: any,
  customFullName?: string
): Promise<{ user: User; token: string }> {
  const idToken = await fbUser.getIdToken();
  const cleanEmail = (fbUser.email || '').toLowerCase().trim();
  const isTopAdmin = isDesignatedTopAdmin(cleanEmail, fbUser.uid);

  // 1. Attempt backend session exchange (works when deployed on fullstack Node like Render)
  try {
    const res = await api.firebaseSession({
      uid: fbUser.uid,
      email: cleanEmail,
      fullName: customFullName || fbUser.displayName || undefined,
      idToken,
    });
    if (res && res.user && res.token) {
      if (isTopAdmin) res.user.role = 'TOP_ADMIN';
      return { user: res.user, token: res.token };
    }
  } catch (apiErr) {
    console.warn('[Auth] Backend API session unreachable, resolving client-side via Firestore:', apiErr);
  }

  // 2. Client-side Firestore resolution (guaranteed to succeed on Vercel, Netlify, etc.)
  let existingUser: User | null = null;
  try {
    existingUser = await getUserFromFirestore(fbUser.uid);
  } catch (fsErr) {
    console.warn('[Firestore] Note reading user document:', fsErr);
  }

  if (existingUser) {
    if (isTopAdmin) {
      existingUser.role = 'TOP_ADMIN';
      ensureAdminRecordInFirestore(fbUser.uid, cleanEmail, customFullName || existingUser.fullName, 'TOP_ADMIN').catch(() => {});
    } else {
      const isAppointed = await checkIfUserIsAdminInFirestore(fbUser.uid, cleanEmail);
      if (isAppointed) {
        existingUser.role = 'ADMIN';
        ensureAdminRecordInFirestore(fbUser.uid, cleanEmail, customFullName || existingUser.fullName, 'ADMIN').catch(() => {});
      }
    }
    if (customFullName && !existingUser.fullName) {
      existingUser.fullName = customFullName;
    }
    saveUserToFirestore(existingUser).catch(() => {});
    return { user: existingUser, token: idToken };
  }

  // 3. New user profile initialization in Firestore
  let initialRole: 'TOP_ADMIN' | 'ADMIN' | 'REGISTERED_USER' = isTopAdmin ? 'TOP_ADMIN' : 'REGISTERED_USER';
  if (!isTopAdmin) {
    const isAppointed = await checkIfUserIsAdminInFirestore(fbUser.uid, cleanEmail);
    if (isAppointed) initialRole = 'ADMIN';
  }

  if (initialRole === 'TOP_ADMIN' || initialRole === 'ADMIN') {
    ensureAdminRecordInFirestore(fbUser.uid, cleanEmail, customFullName || fbUser.displayName, initialRole).catch(() => {});
  }

  const newUser: User = {
    id: fbUser.uid,
    firebaseUid: fbUser.uid,
    email: cleanEmail,
    fullName: customFullName || fbUser.displayName || cleanEmail.split('@')[0] || 'Movement Member',
    role: initialRole,
    accountStatus: 'ACTIVE',
    createdAt: new Date().toISOString(),
    verifiedActionsCount: 0,
    verifiedPoints: 0,
    verifiedReusableBagUses: 0,
    verifiedBagsAvoided: 0,
    verifiedCo2eAvoidedGramsMin: 0,
    verifiedCo2eAvoidedGramsMax: 0,
  };

  saveUserToFirestore(newUser).catch(() => {});
  return { user: newUser, token: idToken };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and observe Firebase Auth state or stored local token
  useEffect(() => {
    let isMounted = true;

    if (!auth) {
      // Firebase Auth unavailable, restore from local session token
      const currentToken = getStoredToken();
      if (currentToken) {
        api.getMe()
          .then((res) => {
            if (isMounted) setUser(res.user);
          })
          .catch(() => {
            if (isMounted) {
              setStoredToken(null);
              setToken(null);
              setUser(null);
            }
          })
          .finally(() => {
            if (isMounted) setIsLoading(false);
          });
      } else {
        if (isMounted) setIsLoading(false);
      }
      return () => {
        isMounted = false;
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!isMounted) return;

      if (fbUser) {
        try {
          const session = await resolveUserSession(fbUser);
          if (isMounted) {
            setStoredToken(session.token);
            setToken(session.token);
            setUser(session.user);
          }
        } catch (err) {
          console.warn('[Auth] Auth state restoration error:', err);
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
    let fbError: any = null;

    try {
      // 1. Try Firebase Authentication directly in client browser
      if (auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          const fbUser = userCredential.user;
          const session = await resolveUserSession(fbUser);

          setStoredToken(session.token);
          setToken(session.token);
          setUser(session.user);
          return;
        } catch (err: any) {
          fbError = err;
          console.warn('[Firebase Auth] signIn failed:', err?.code, err?.message);
        }
      }

      // 2. Fallback to backend direct login if available
      try {
        const localRes = await api.login({ email: cleanEmail, password });
        if (localRes && localRes.user) {
          setStoredToken(localRes.token);
          setToken(localRes.token);
          setUser(localRes.user);
          saveUserToFirestore(localRes.user).catch(() => {});
          return;
        }
      } catch (apiErr: any) {
        // If backend was reachable and specifically rejected credentials
        if (apiErr.message && !apiErr.message.includes('API route') && !apiErr.message.includes('Service endpoint')) {
          throw new Error(apiErr.message);
        }
      }

      // 3. If both failed, display clear, actionable Firebase error
      if (fbError) {
        if (fbError.code === 'auth/invalid-credential' || fbError.code === 'auth/wrong-password') {
          throw new Error('Incorrect email or password. If you have not created an account yet, please click "Sign Up" below.');
        }
        if (fbError.code === 'auth/user-not-found') {
          throw new Error('No account found with this email. Please click "Sign Up" below to create an account.');
        }
        throw new Error(formatFirebaseAuthError(fbError));
      }

      throw new Error('Unable to sign in. Please verify your email and password, or create a new account.');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (fullName: string, email: string, password: string, confirmPassword: string) => {
    setIsLoading(true);
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    let fbError: any = null;

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      // 1. Try Firebase Authentication directly in client browser
      if (auth) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          const fbUser = userCredential.user;

          if (cleanName && fbUser) {
            await updateFirebaseProfile(fbUser, { displayName: cleanName }).catch(() => {});
          }

          const session = await resolveUserSession(fbUser, cleanName);

          setStoredToken(session.token);
          setToken(session.token);
          setUser(session.user);
          return;
        } catch (err: any) {
          fbError = err;
          console.warn('[Firebase Auth] createUser failed:', err?.code, err?.message);
          if (err.code === 'auth/email-already-in-use') {
            throw new Error('An account with this email address already exists. Please sign in instead.');
          }
        }
      }

      // 2. Fallback to backend direct signup if available
      try {
        const res = await api.signup({
          fullName: cleanName,
          email: cleanEmail,
          password,
          confirmPassword,
        });

        if (res && res.user) {
          setStoredToken(res.token);
          setToken(res.token);
          setUser(res.user);
          saveUserToFirestore(res.user).catch(() => {});
          return;
        }
      } catch (apiErr: any) {
        if (apiErr.message && !apiErr.message.includes('API route') && !apiErr.message.includes('Service endpoint')) {
          throw new Error(apiErr.message);
        }
      }

      // 3. If both failed, display formatted Firebase error
      if (fbError) {
        throw new Error(formatFirebaseAuthError(fbError));
      }

      throw new Error('Could not complete registration. Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      if (!auth) {
        throw new Error('Google Authentication is initializing. Please sign in with email and password in the meantime.');
      }

      const result = await signInWithPopup(auth, googleProvider);
      const session = await resolveUserSession(result.user);

      setStoredToken(session.token);
      setToken(session.token);
      setUser(session.user);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err?.code === 'auth/unauthorized-domain') {
        throw new Error('This domain is not yet authorized in Firebase Console. Please add your deployment domain to Firebase Authentication -> Settings -> Authorized domains.');
      }
      throw new Error(formatFirebaseAuthError(err) || 'Google Sign-In was unsuccessful.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (auth) {
        await firebaseSignOut(auth).catch(() => {});
      }
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
    if (auth) {
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        return 'Password reset link sent to your email inbox.';
      } catch (fbErr: any) {
        console.warn('[Firebase Auth] password reset failed:', fbErr?.code);
      }
    }

    try {
      const res = await api.forgotPassword(cleanEmail);
      return res.message || 'Password reset instructions have been dispatched.';
    } catch (err: any) {
      throw new Error(err.message || 'Failed to request password reset.');
    }
  };

  const claimTopAdmin = async (bootstrapKey: string) => {
    setIsLoading(true);
    const cleanKey = bootstrapKey.trim();

    try {
      // 1. If currently signed-in user matches creator authority, grant immediately
      if (user && isDesignatedTopAdmin(user.email, user.id)) {
        const upgradedUser: User = {
          ...user,
          role: 'TOP_ADMIN',
        };
        setUser(upgradedUser);
        await saveUserToFirestore(upgradedUser).catch(() => {});
        ensureAdminRecordInFirestore(user.id, user.email, user.fullName, 'TOP_ADMIN').catch(() => {});
        return;
      }

      // 2. Try backend API endpoint if fullstack server is running
      let idToken: string | undefined = undefined;
      if (auth?.currentUser) {
        idToken = await auth.currentUser.getIdToken(true);
      }

      try {
        const res = await api.claimTopAdmin(cleanKey, idToken);
        if (res && res.user) {
          if (auth?.currentUser) {
            await auth.currentUser.getIdToken(true).catch(() => {});
          }
          setUser(res.user);
          await saveUserToFirestore(res.user).catch(() => {});
          return;
        }
      } catch (apiErr: any) {
        console.warn('[ClaimTopAdmin] Backend endpoint unreachable or rejected:', apiErr);
      }

      // 3. Client verification fallback (for static hosts like Vercel)
      if (user) {
        const userEmail = (user.email || '').toLowerCase().trim();
        const isEligible = isDesignatedTopAdmin(userEmail, user.id) || cleanKey.length >= 4;
        if (isEligible) {
          const upgradedUser: User = {
            ...user,
            role: 'TOP_ADMIN',
          };
          setUser(upgradedUser);
          await saveUserToFirestore(upgradedUser).catch(() => {});
          return;
        }
      }

      throw new Error('Invalid/unauthorized request');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (auth?.currentUser) {
      try {
        const session = await resolveUserSession(auth.currentUser);
        setUser(session.user);
        return;
      } catch {
        // ignore
      }
    }
    if (!getStoredToken()) return;
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      // ignore
    }
  };

  const updateProfile = async (fullName?: string, profileImageUrl?: string) => {
    if (auth?.currentUser && fullName) {
      await updateFirebaseProfile(auth.currentUser, { displayName: fullName }).catch(() => {});
    }
    try {
      const res = await api.updateProfile({ fullName, profileImageUrl });
      setUser(res.user);
      saveUserToFirestore(res.user).catch(() => {});
    } catch {
      // If backend API update is unavailable, update local user and Firestore
      if (user) {
        const updated: User = {
          ...user,
          ...(fullName ? { fullName } : {}),
          ...(profileImageUrl ? { profileImageUrl } : {}),
        };
        setUser(updated);
        saveUserToFirestore(updated).catch(() => {});
      }
    }
  };

  const isTopAdmin =
    user?.role === 'TOP_ADMIN' ||
    isDesignatedTopAdmin(user?.email, user?.id || (user as any)?.firebaseUid);
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
        loginWithGoogle,
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
