import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { api } from '../services/api';

interface AuthContextType {
  user: FirebaseUser | null;
  token: string | null;
  loading: boolean;
  isFirebaseReady: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const syncWithBackend = useCallback(async (idToken: string) => {
    try {
      await api.syncUser(idToken);
    } catch (err) {
      // Backend synchronization issues should NOT prevent frontend auth from succeeding
      console.warn('Backend user profile sync warning (will retry on next session):', err);
    }
  }, []);

  const getIdToken = useCallback(
    async (forceRefresh = false): Promise<string | null> => {
      if (!auth.currentUser) return null;
      try {
        const freshToken = await auth.currentUser.getIdToken(forceRefresh);
        setToken(freshToken);
        return freshToken;
      } catch (err) {
        console.warn('Failed to refresh Firebase ID token:', err);
        return token;
      }
    },
    [token]
  );

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    // Check for redirect result if returned from Google OAuth redirect flow
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const freshToken = await result.user.getIdToken();
          setUser(result.user);
          setToken(freshToken);
          await syncWithBackend(freshToken);
        }
      })
      .catch((err) => {
        console.warn('Firebase redirect sign-in warning:', err);
      });

    // Listen for ongoing authentication state updates (login, logout, refresh)
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        try {
          const freshToken = await fbUser.getIdToken();
          setToken(freshToken);
          await syncWithBackend(freshToken);
        } catch (err) {
          console.warn('Error retrieving ID token on state change:', err);
        }
      } else {
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [syncWithBackend]);

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    setUser(cred.user);
    try {
      const freshToken = await cred.user.getIdToken();
      setToken(freshToken);
      await syncWithBackend(freshToken);
    } catch (err) {
      console.warn('Post-login token sync warning:', err);
    }
  };

  const signUpWithEmail = async (name: string, email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name.trim()) {
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
      } catch (profileErr) {
        console.warn('Could not update user display name:', profileErr);
      }
    }
    setUser(cred.user);
    try {
      const freshToken = await cred.user.getIdToken(true);
      setToken(freshToken);
      await syncWithBackend(freshToken);
    } catch (err) {
      console.warn('Post-registration token sync warning:', err);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      setUser(cred.user);
      const freshToken = await cred.user.getIdToken();
      setToken(freshToken);
      await syncWithBackend(freshToken);
    } catch (err: any) {
      // If popup was blocked by browser or restricted, attempt redirect flow
      if (err.code === 'auth/popup-blocked') {
        console.info('Google popup blocked by browser; falling back to redirect flow.');
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setToken(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isFirebaseReady: isFirebaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
        getIdToken,
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
