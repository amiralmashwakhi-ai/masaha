import React, { createContext, useContext } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lang } from './types';

export const colors = {
  bg: '#F6F7F4', card: '#FFFFFF', ink: '#1C2B26', muted: '#5E6B66',
  primary: '#1F6F5C', primaryInk: '#FFFFFF', line: '#DDE2DE', done: '#1F6F5C',
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
  h: { fontSize: 22, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  p: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  btn: { backgroundColor: colors.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginVertical: 6 },
  btn2: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  btnText: { color: colors.primaryInk, fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.line },
  label: { fontSize: 13, color: colors.muted, marginBottom: 4 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, fontSize: 15 },
});
