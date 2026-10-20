import { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Role } from './types';

export interface Profile { id: string; role: Role | 'admin'; full_name: string; phone: string | null }

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

// Email and password; Supabase's default confirmation email (a link) works on the free plan without template changes.
export const signUp = (email: string, password: string) =>
  supabase.auth.signUp({ email, password, options: { emailRedirectTo: 'https://masaha-kappa.vercel.app' } });

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export async function loadProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('id, role, full_name, phone').eq('id', userId).maybeSingle();
  return data as Profile | null;
}

export async function createProfile(userId: string, fullName: string, phone: string, role: Role, providerKind?: 'individual' | 'office') {
  const { error } = await supabase.from('profiles').insert({ id: userId, full_name: fullName, phone, role });
  if (error) return error;
  if (role === 'provider') {
    const res = await supabase.from('providers').insert({ id: userId, kind: providerKind ?? 'individual', display_name: fullName });
    return res.error;
  }
  return null;
}

export const signOut = () => supabase.auth.signOut();
