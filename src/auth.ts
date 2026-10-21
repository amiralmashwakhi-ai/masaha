import { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Role } from './types';

export interface Profile { id: string; role: Role | 'admin'; full_name: string; phone: string | null; cover_url: string | null; data_consent_at: string | null }

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
  supabase.auth.signUp({ email, password, options: { emailRedirectTo: 'https://masaha-kappa.vercel.app/reset-password.html' } });

export const signIn = (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export async function loadProfile(userId: string) {
  const { data } = await supabase.from('profiles').select('id, role, full_name, phone, cover_url, data_consent_at').eq('id', userId).maybeSingle();
  return data as Profile | null;
}

export async function createProfile(userId: string, fullName: string, phone: string, role: Role) {
  const { error } = await supabase.from('profiles').insert({ id: userId, full_name: fullName, phone, role, terms_accepted_at: new Date().toISOString(), data_consent_at: new Date().toISOString() });
  if (error) return error;
  if (role === 'provider') {
    const res = await supabase.from('providers').insert({ id: userId, kind: 'office', display_name: fullName });
    return res.error;
  }
  return null;
}

// Users who signed up before the consent to storage outside Jordan was added agree once.
export const recordConsent = () => supabase.rpc('record_consent');

export const signOut = () => supabase.auth.signOut();

// Opens Supabase's hosted reset page flow; the email link lands on the website, where the new password is set.
export const sendPasswordReset = (email: string) =>
  supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://masaha-kappa.vercel.app/reset-password.html' });

export const changePassword = (password: string) => supabase.auth.updateUser({ password });

WebBrowser.maybeCompleteAuthSession();

// Google sign-in in the system browser; Supabase sends the user back to masaha://auth with the session.
export async function signInWithGoogle() {
  const redirectTo = Linking.createURL('auth');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return error ?? new Error('no url');
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return null;
  const params = new URLSearchParams(res.url.split('#')[1] ?? res.url.split('?')[1] ?? '');
  const code = params.get('code');
  if (code) return (await supabase.auth.exchangeCodeForSession(code)).error;
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return new Error(params.get('error_description') ?? 'sign-in cancelled');
  return (await supabase.auth.setSession({ access_token, refresh_token })).error;
}
