import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { createContext, useContext } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lang } from './types';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Taken from the logo: deep teal with a warm sand accent on a soft cream background; no pure black.
export const colors = {
  bg: '#F6F3ED', card: '#FFFFFF', ink: '#2D3A3A', muted: '#7B8786',
  primary: '#2F6F73', primaryInk: '#FFFFFF', primarySoft: '#E3EEEE',
  accent: '#E0A458', accentSoft: '#FBF0E1',
  line: '#E7E2D8', done: '#2F6F73', star: '#E0A458', danger: '#C0614A',
};

export const radius = { card: 20, button: 14, input: 12 };

const shadow = {
  shadowColor: '#4A4030', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
};

interface Ctx { lang: Lang; t: (k: string) => string; rtl: boolean; toggleLang: () => void }
export const LangCtx = createContext<Ctx>({ lang: 'ar', t: (k) => k, rtl: true, toggleLang: () => {} });
export const useLang = () => useContext(LangCtx);

const logo = require('../assets/brand/logo.png');

export function Logo({ size = 36 }: { size?: number }) {
  return <Image source={logo} style={{ width: size, height: size, borderRadius: size * 0.24 }} />;
}

// Shown on every screen: logo and name, language switch in the top corner.
export function Header() {
  const { t, toggleLang, rtl } = useLang();
  return (
    <View style={[s.header, rtl && { flexDirection: 'row-reverse' }]}>
      <View style={[s.row, rtl && { flexDirection: 'row-reverse' }]}>
        <Logo size={34} />
        <Text style={s.brand}>{t('appName')}</Text>
      </View>
      <Pressable onPress={toggleLang} style={s.langBtn} hitSlop={8}>
        <MaterialCommunityIcons name="translate" size={15} color={colors.primary} />
        <Text style={s.langText}>{t('switchLang')}</Text>
      </Pressable>
    </View>
  );
}

export function H({ children }: { children: React.ReactNode }) {
  const { rtl } = useLang();
  return <Text style={[s.h, rtl && s.rtl]}>{children}</Text>;
}

export function P({ children, muted, small }: { children: React.ReactNode; muted?: boolean; small?: boolean }) {
  const { rtl } = useLang();
  return <Text style={[s.p, muted && { color: colors.muted }, small && { fontSize: 12, lineHeight: 18 }, rtl && s.rtl]}>{children}</Text>;
}

export function IconCircle({ name, size = 40, tone = 'primary' }: { name: IconName; size?: number; tone?: 'primary' | 'accent' }) {
  const bg = tone === 'primary' ? colors.primarySoft : colors.accentSoft;
  const fg = tone === 'primary' ? colors.primary : '#B7782F';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={name} size={size * 0.55} color={fg} />
    </View>
  );
}

export function Button({ title, onPress, secondary, icon, disabled }: {
  title: string; onPress: () => void; secondary?: boolean; icon?: IconName; disabled?: boolean;
}) {
  const fg = secondary ? colors.primary : colors.primaryInk;
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[s.btn, secondary && s.btn2, disabled && { opacity: 0.5 }]}>
      {icon && <MaterialCommunityIcons name={icon} size={17} color={fg} style={{ marginHorizontal: 6 }} />}
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function LinkText({ title, onPress }: { title: string; onPress: () => void }) {
  const { rtl } = useLang();
  return (
    <Text onPress={onPress} style={[s.link, rtl && s.rtl]}>{title}</Text>
  );
}

export function Card({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={s.card}>{children}</Pressable>;
}

// A tappable row: icon, title and optional subtitle.
export function OptionRow({ icon, title, subtitle, onPress, tone }: {
  icon: IconName; title: string; subtitle?: string; onPress?: () => void; tone?: 'primary' | 'accent';
}) {
  const { rtl } = useLang();
  return (
    <Pressable onPress={onPress} style={[s.card, s.row, { gap: 12 }, rtl && { flexDirection: 'row-reverse' }]}>
      <IconCircle name={icon} tone={tone} />
      <View style={{ flex: 1 }}>
        <Text style={[s.optTitle, rtl && s.rtl]}>{title}</Text>
        {!!subtitle && <Text style={[s.optSub, rtl && s.rtl]}>{subtitle}</Text>}
      </View>
      {onPress && <MaterialCommunityIcons name={rtl ? 'chevron-left' : 'chevron-right'} size={20} color={colors.muted} />}
    </Pressable>
  );
}

export function Field({ label, value, onChange, numeric, secure, multiline }: {
  label: string; value: string; onChange: (v: string) => void; numeric?: boolean; secure?: boolean; multiline?: boolean;
}) {
  const { rtl } = useLang();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[s.label, rtl && s.rtl]}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { minHeight: 80, textAlignVertical: 'top' }, rtl && s.rtl]}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        secureTextEntry={secure}
        multiline={multiline}
        autoCapitalize="none"
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { fontSize: 17, fontWeight: '700', color: colors.primary },
  langBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  langText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  h: { fontSize: 19, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  p: { fontSize: 14, color: colors.ink, lineHeight: 21 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  btn: { flexDirection: 'row', justifyContent: 'center', backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.button, alignItems: 'center', marginVertical: 5 },
  btn2: { backgroundColor: colors.primarySoft },
  btnText: { fontSize: 14, fontWeight: '600' },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600', marginVertical: 6 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 14, marginBottom: 12, ...shadow },
  optTitle: { fontSize: 14, fontWeight: '600', color: colors.ink },
  optSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 5 },
  input: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, color: colors.ink },
});
