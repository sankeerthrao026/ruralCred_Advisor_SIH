'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  getFirebaseIdToken,
  subscribeToFirebaseAuthState,
} from '@/lib/firebase/auth';
import { firestoreInstance, isFirebaseConfigured } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import {
  createPresetSession,
  getDemoSession,
  clearDemoSession,
  DEMO_USER_ID_KEY,
  LOCAL_AUTH_KEY,
  ACTIVE_PROFILE_KEY,
} from '@/lib/demo-session';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  isDemo?: boolean;
  authMode?: 'demo' | 'authenticated';
}

export interface AuthContextType {
  user: AuthUser | null;
  idToken: string | null;
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
  isConfigured: boolean;
  isDemo: boolean;
  demoModeEnabled: boolean;
  configError: string | null;
  continueAsDemo: () => AuthUser;
  exitDemo: () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  loginAsDemoUser: (persona?: 'dairy' | 'kirana' | 'weaving') => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Check active demo session first
    const demo = getDemoSession();
    if (demo && demo.user?.id) {
      return demo.user;
    }

    // 2. Check stored authenticated user
    const stored = localStorage.getItem(LOCAL_AUTH_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && parsed.id) {
        return parsed;
      }
    }
  } catch {}
  return null;
}

function persistUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
      if (user.isDemo) {
        localStorage.setItem(DEMO_USER_ID_KEY, user.id);
      } else {
        localStorage.removeItem(DEMO_USER_ID_KEY);
      }
    } else {
      localStorage.removeItem(LOCAL_AUTH_KEY);
      localStorage.removeItem(DEMO_USER_ID_KEY);
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
    }
  } catch {}
}

function mapFirebaseUser(fbUser: any): AuthUser {
  return {
    id: fbUser.uid,
    email: fbUser.email || '',
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Entrepreneur',
    isDemo: false,
    authMode: 'authenticated',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isDemo = Boolean(
    user?.isDemo ||
      user?.id?.startsWith('demo_') ||
      user?.id?.startsWith('demo-') ||
      (typeof window !== 'undefined' && Boolean(localStorage.getItem(DEMO_USER_ID_KEY)))
  );

  // Initialize and subscribe to Firebase Auth state changes
  useEffect(() => {
    let active = true;

    // 1. Initialize from localStorage
    const initialUser = getInitialUser();
    if (initialUser && active) {
      setUser(initialUser);
    }
    if (active) {
      setIsInitialized(true);
    }

    // 2. Subscribe to Firebase Auth
    const unsubscribe = subscribeToFirebaseAuthState(async (fbUser) => {
      if (!active) return;
      const hasDemoSession = typeof window !== 'undefined' && Boolean(localStorage.getItem(DEMO_USER_ID_KEY));

      if (fbUser) {
        // Active Firebase authenticated user
        const mapped = mapFirebaseUser(fbUser);
        const token = await getFirebaseIdToken();
        if (active) {
          setUser(mapped);
          setIdToken(token);
          persistUser(mapped);
        }
      } else if (!hasDemoSession) {
        // No Firebase user and not in demo mode -> reset state
        if (active) {
          setUser(null);
          setIdToken(null);
          persistUser(null);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // 1. Explicit Action: Continue as Demo User (Anita Sharma)
  const continueAsDemo = useCallback((): AuthUser => {
    const { user: demoUser } = createPresetSession('dairy');
    setUser(demoUser);
    setIdToken(null);
    persistUser(demoUser);
    setError(null);
    setLoading(false);
    return demoUser;
  }, []);

  // 2. Explicit Action: Exit Demo
  const exitDemo = useCallback(() => {
    clearDemoSession();
    setUser(null);
    setIdToken(null);
    persistUser(null);
    setError(null);
    setLoading(false);
  }, []);

  // 3. Explicit Action: Pre-configured Evaluator Demo Personas
  const loginAsDemoUser = async (persona: 'dairy' | 'kirana' | 'weaving' = 'dairy') => {
    const { user: chosen } = createPresetSession(persona);
    setUser(chosen);
    setIdToken(null);
    persistUser(chosen);
    setError(null);
    setLoading(false);
  };

  // 4. Real Firebase Sign In
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    setLoading(true);
    setError(null);
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setLoading(false);
      const msg = 'Please enter your email and password.';
      setError(msg);
      return { error: msg };
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      const msg = 'Firebase Authentication is not configured. Please check environment variables.';
      setError(msg);
      return { error: msg };
    }

    try {
      const { user: fbUser, error: fbError } = await signInWithEmail(cleanEmail, cleanPassword);
      if (fbError || !fbUser) {
        setLoading(false);
        setError(fbError || 'Failed to sign in.');
        return { error: fbError || 'Failed to sign in.' };
      }

      // Successful Firebase Authentication
      clearDemoSession();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        localStorage.removeItem(DEMO_USER_ID_KEY);
      }
      const mapped = mapFirebaseUser(fbUser);
      const token = await getFirebaseIdToken();
      setUser(mapped);
      setIdToken(token);
      persistUser(mapped);
      setLoading(false);
      return { error: null };
    } catch (e: any) {
      setLoading(false);
      const msg = e?.message || 'Authentication failed.';
      setError(msg);
      return { error: msg };
    }
  };

  // 5. Real Firebase Sign Up
  const signUp = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ error: string | null }> => {
    setLoading(true);
    setError(null);
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const chosenName = name?.trim() || cleanEmail.split('@')[0] || 'Entrepreneur';

    if (!cleanEmail || !cleanPassword) {
      setLoading(false);
      const msg = 'Please enter an email and password.';
      setError(msg);
      return { error: msg };
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      const msg = 'Firebase Authentication is not configured. Please check environment variables.';
      setError(msg);
      return { error: msg };
    }

    try {
      const { user: fbUser, error: fbError } = await signUpWithEmail(cleanEmail, cleanPassword, chosenName);
      if (fbError || !fbUser) {
        setLoading(false);
        setError(fbError || 'Registration failed.');
        return { error: fbError || 'Registration failed.' };
      }

      // Successful Firebase Registration
      clearDemoSession();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        localStorage.removeItem(DEMO_USER_ID_KEY);
      }
      const mapped = mapFirebaseUser(fbUser);
      const token = await getFirebaseIdToken();

      // Initialize real user's profile in Firestore
      if (firestoreInstance) {
        try {
          const userDocRef = doc(firestoreInstance, 'users', fbUser.uid);
          const initialProfile = {
            name: chosenName,
            businessName: `${chosenName} Enterprises`,
            location: '',
            category: 'Dairy Farming',
            marginCapital: 0,
            hasActiveLoan: false,
            simulatingSecondLoan: false,
            onboardingCompleted: false,
            email: cleanEmail,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await setDoc(userDocRef, initialProfile, { merge: true });
        } catch (fsErr) {
          console.warn('[Auth] Initial Firestore profile setup:', fsErr);
        }
      }

      setUser(mapped);
      setIdToken(token);
      persistUser(mapped);
      setLoading(false);
      return { error: null };
    } catch (e: any) {
      setLoading(false);
      const msg = e?.message || 'Registration failed.';
      setError(msg);
      return { error: msg };
    }
  };

  // 6. Sign Out
  const signOut = async (): Promise<void> => {
    setLoading(true);
    if (isFirebaseConfigured) {
      try {
        await signOutUser();
      } catch (e) {
        console.warn('[Auth] Firebase signout error:', e);
      }
    }
    clearDemoSession();
    setUser(null);
    setIdToken(null);
    persistUser(null);
    setError(null);
    setLoading(false);
  };

  const getIdTokenWrapper = async (forceRefresh: boolean = false): Promise<string | null> => {
    return await getFirebaseIdToken(forceRefresh);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        idToken,
        loading,
        isInitialized,
        error,
        isConfigured: isFirebaseConfigured,
        isDemo,
        demoModeEnabled: DEMO_MODE_ENABLED,
        configError: null,
        continueAsDemo,
        exitDemo,
        signIn,
        signUp,
        signOut,
        loginAsDemoUser,
        getIdToken: getIdTokenWrapper,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
