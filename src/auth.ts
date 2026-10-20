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

// Email one-time code; phone SMS needs an SMS provider connected in Supabase first.
export const sendCode = (email: string) =>
  supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });

export const verifyCode = (email: string, token: string) =>
  supabase.auth.verifyOtp({ email, token, type: 'email' });

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
