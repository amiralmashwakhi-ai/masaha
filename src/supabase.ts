import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Publishable key: safe in the app; access is enforced by row-level security in backend/schema.sql.
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);

export const jodToFils = (jod: number) => Math.round(jod * 1000);
export const filsToJod = (fils: number) => fils / 1000;
