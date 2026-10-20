import React, { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lang } from './types';

// Soft, low-contrast palette: warm off-white background, muted sage-teal accent, no pure black.
export const colors = {
  bg: '#F5F3EE', card: '#FFFFFF', ink: '#33413C', muted: '#7A8782',
  primary: '#4F8F80', primaryInk: '#FFFFFF', primarySoft: '#E6F0ED',
  line: '#E6E2DA', done: '#4F8F80', star: '#E3B04B',
};

export const radius = { card: 20, button: 16, input: 14 };

const shadow = {
  shadowColor: '#5B5040', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

interface Ctx { lang: Lang; t: (k: string) => string; rtl: boolean }
export const LangCtx = createContext<Ctx>({ lang: 'ar', t: (k) => k, rtl: true });
export const useLang = () => useContext(LangCtx);

export function H({ children }: { children: React.ReactNode }) {
  const { rtl } = useLang();
  return <Text style={[s.h, rtl && s.rtl]}>{children}</Text>;
}

export function P({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  const { rtl } = useLang();
  return <Text style={[s.p, muted && { color: colors.muted }, rtl && s.rtl]}>{children}</Text>;
}

export function Button({ title, onPress, secondary }: { title: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, secondary && s.btn2]}>
      <Text style={[s.btnText, secondary && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={s.card}>{children}</Pressable>;
}

export function Field({ label, value, onChange, numeric, secure }: {
  label: string; value: string; onChange: (v: string) => void; numeric?: boolean; secure?: boolean;
}) {
  const { rtl } = useLang();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[s.label, rtl && s.rtl]}>{label}</Text>
      <TextInput
        style={[s.input, rtl && s.rtl]}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        secureTextEntry={secure}
        autoCapitalize="none"
      />
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 24, fontWeight: '700', color: colors.ink, marginBottom: 10 },
  p: { fontSize: 15, color: colors.ink, lineHeight: 24 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  btn: { backgroundColor: colors.primary, paddingVertical: 15, paddingHorizontal: 18, borderRadius: radius.button, alignItems: 'center', marginVertical: 6 },
  btn2: { backgroundColor: colors.primarySoft },
  btnText: { color: colors.primaryInk, fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 18, marginBottom: 14, ...shadow },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: colors.ink },
});
