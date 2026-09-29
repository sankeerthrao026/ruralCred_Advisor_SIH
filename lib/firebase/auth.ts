import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './config';

export interface FirebaseUserInfo {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: FirebaseUser | null; error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    return { user: null, error: 'Firebase is not configured.' };
  }
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { user: cred.user, error: null };
  } catch (err: any) {
    let msg = err?.message || 'Failed to sign in.';
    if (
      err?.code === 'auth/user-not-found' ||
      err?.code === 'auth/wrong-password' ||
      err?.code === 'auth/invalid-credential'
    ) {
      msg = 'Invalid email or password.';
    } else if (err?.code === 'auth/too-many-requests') {
      msg = 'Access temporarily disabled due to too many failed login attempts. Please try again later.';
    } else if (err?.code === 'auth/operation-not-allowed') {
      msg = 'Email/Password sign-in is not enabled in the Firebase Console.';
    } else if (err?.code === 'auth/network-request-failed') {
      msg = 'Network connection failed. Please check your internet connection.';
    } else if (err?.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email address.';
    }
    return { user: null, error: msg };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<{ user: FirebaseUser | null; error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    return { user: null, error: 'Firebase is not configured.' };
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    return { user: cred.user, error: null };
  } catch (err: any) {
    let msg = err?.message || 'Failed to create account.';
    if (err?.code === 'auth/email-already-in-use') {
      msg = 'This email address is already registered. Please sign in instead.';
    } else if (err?.code === 'auth/weak-password') {
      msg = 'Password should be at least 6 characters.';
    } else if (err?.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email address.';
    } else if (err?.code === 'auth/operation-not-allowed') {
      msg = 'Email/Password sign-up is not enabled in the Firebase Console.';
    } else if (err?.code === 'auth/network-request-failed') {
      msg = 'Network connection failed. Please check your internet connection.';
    }
    return { user: null, error: msg };
  }
}

export async function signOutUser(): Promise<{ error: string | null }> {
  if (!isFirebaseConfigured || !auth) {
    return { error: null };
  }
  try {
    await fbSignOut(auth);
    return { error: null };
  } catch (err: any) {
    return { error: err?.message || 'Failed to sign out.' };
  }
}

export async function getFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
  if (!isFirebaseConfigured || !auth || !auth.currentUser) {
    return null;
  }
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (err) {
    console.warn('[Firebase Auth] Failed to retrieve ID token:', err);
    return null;
  }
}

export function subscribeToFirebaseAuthState(
  onChange: (user: FirebaseUser | null) => void
): () => void {
  if (!isFirebaseConfigured || !auth) {
    onChange(null);
    return () => {};
  }
  return onAuthStateChanged(auth, onChange);
}
