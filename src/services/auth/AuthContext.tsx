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
import { saveUserToFirestore } from '../firebase/firestoreService';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and observe Firebase Auth state or stored local token
  useEffect(() => {
    let isMounted = true;

    if (!auth) {
      // Firebase Auth unavailable in this environment, restore from local session token
      const currentToken = getStoredToken();
      if (currentToken) {
        api.getMe()
          .then((res) => {
            if (isMounted) {
              setUser(res.user);
            }
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
          console.warn('[Auth] Session restoration warning:', err);
          // Try local session fallback
          const currentToken = getStoredToken();
          if (currentToken && isMounted) {
            try {
              const res = await api.getMe();
              if (isMounted) setUser(res.user);
            } catch {
              // Ignore
            }
          }
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
      let fbUserSuccess = false;

      // 1. Try Firebase Authentication if initialized
      if (auth) {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          const fbUser = userCredential.user;
          const idToken = await fbUser.getIdToken();

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
          fbUserSuccess = true;
          return;
        } catch (fbErr: any) {
          console.warn('[Firebase Auth] signIn failed, checking backend credentials:', fbErr?.code || fbErr?.message);
        }
      }

      // 2. Seamless Backend database fallback (e.g. if domain not yet authorized or provider disabled)
      if (!fbUserSuccess) {
        try {
          const localRes = await api.login({ email: cleanEmail, password });
          if (localRes && localRes.user) {
            // Attempt to register in Firebase Auth silently in background for future SSO
            if (auth) {
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
                // Non-blocking
              }
            }

            setStoredToken(localRes.token);
            setToken(localRes.token);
            setUser(localRes.user);
            saveUserToFirestore(localRes.user).catch(() => {});
            return;
          }
        } catch (apiErr: any) {
          throw new Error(apiErr.message || 'Incorrect email or password. Please verify your credentials and try again.');
        }
      }
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

      let fbRegistered = false;

      // 1. Try Firebase Authentication if initialized
      if (auth) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          const fbUser = userCredential.user;

          if (cleanName && fbUser) {
            try {
              await updateFirebaseProfile(fbUser, { displayName: cleanName });
            } catch {
              // Non-blocking
            }
          }

          const idToken = await fbUser.getIdToken();
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
          fbRegistered = true;
          return;
        } catch (fbErr: any) {
          console.warn('[Firebase Auth] createUser failed, trying backend direct signup:', fbErr?.code || fbErr?.message);
          // If the email is already in use in Firebase, give clear message
          if (fbErr?.code === 'auth/email-already-in-use') {
            throw new Error('An account with this email address already exists. Please sign in instead.');
          }
        }
      }

      // 2. Fallback to backend direct signup (ensures account creation always works on any host)
      if (!fbRegistered) {
        try {
          const res = await api.signup({
            fullName: cleanName,
            email: cleanEmail,
            password,
            confirmPassword,
          });

          setStoredToken(res.token);
          setToken(res.token);
          setUser(res.user);
          saveUserToFirestore(res.user).catch(() => {});
          return;
        } catch (apiErr: any) {
          throw new Error(apiErr.message || 'Could not complete registration. Please try again.');
        }
      }
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
      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();

      const res = await api.firebaseSession({
        uid: fbUser.uid,
        email: fbUser.email || '',
        fullName: fbUser.displayName || undefined,
        idToken,
      });

      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      saveUserToFirestore(res.user).catch(() => {});
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        // User voluntarily dismissed popup
        return;
      }
      if (err?.code === 'auth/unauthorized-domain') {
        throw new Error('This deployment domain is not yet added to Firebase Console Authorized Domains. You can sign in using email/password.');
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
        // Fallback to backend reset endpoint
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
    try {
      let idToken: string | undefined = undefined;
      if (auth?.currentUser) {
        idToken = await auth.currentUser.getIdToken(true);
      }
      const res = await api.claimTopAdmin(bootstrapKey, idToken);

      // Force refresh user token to obtain new custom claims (role: 'TOP_ADMIN')
      if (auth?.currentUser) {
        await auth.currentUser.getIdToken(true).catch(() => {});
        await auth.currentUser.getIdTokenResult(true).catch(() => {});
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
    if (auth?.currentUser && fullName) {
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
