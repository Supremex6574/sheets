"use client";

import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
   signInAnonymously,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export interface AuthState {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
}

const provider = new GoogleAuthProvider();

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    await signInWithPopup(auth, provider);
  };

  const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
  };

  const updateDisplayName = async (name: string): Promise<void> => {
    // Sign in anonymously first if not already authenticated
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: name });
    await auth.currentUser.reload();
    setUser(auth.currentUser);
  };

  return { user, loading, signInWithGoogle, signOut, updateDisplayName };
}
