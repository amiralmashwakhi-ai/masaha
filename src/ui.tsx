import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { createContext, useContext } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Lang } from './types';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Taken from the logo: deep teal with a warm sand accent on a soft cream background; no pure black.
const light = {
  bg: '#F6F3ED', card: '#FFFFFF', ink: '#2D3A3A', muted: '#7B8786',
  primary: '#2F6F73', primaryInk: '#FFFFFF', primarySoft: '#E3EEEE',
  accent: '#E0A458', accentSoft: '#FBF0E1', accentInk: '#B7782F',
  line: '#E7E2D8', done: '#2F6F73', star: '#E0A458', danger: '#C0614A',
};
// Night mode: soft charcoal-teal instead of black, same teal and sand.
const dark: typeof light = {
  bg: '#1B2223', card: '#253031', ink: '#E4EAE8', muted: '#97A4A2',
  primary: '#5AA9AD', primaryInk: '#0F2526', primarySoft: '#2D4243',
  accent: '#E0A458', accentSoft: '#3B3226', accentInk: '#E8B977',
  line: '#34403F', done: '#5AA9AD', star: '#E0A458', danger: '#E07A62',
};

// Mutated in place by setDark, so screens reading colors.x at render time pick up the theme.
export const colors = { ...light };
export function setDark(on: boolean) {
  Object.assign(colors, on ? dark : light);
  s = makeStyles();
}

export const radius = { card: 20, button: 14, input: 12 };

const shadow = {
  shadowColor: '#4A4030', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
};

interface Ctx { lang: Lang; t: (k: string) => string; rtl: boolean; toggleLang: () => void; dark: boolean; toggleDark: () => void }
export const LangCtx = createContext<Ctx>({ lang: 'ar', t: (k) => k, rtl: true, toggleLang: () => {}, dark: false, toggleDark: () => {} });
export const useLang = () => useContext(LangCtx);

const logo = require('../assets/brand/logo.png');

export function Logo({ size = 36 }: { size?: number }) {
  return <Image source={logo} style={{ width: size, height: size, borderRadius: size * 0.24 }} />;
}

// Shown on every screen: logo and name, and the ☰ menu in the top corner.
export function Header({ onMenu, onBell, unread = 0 }: { onMenu: () => void; onBell?: () => void; unread?: number }) {
  const { t, rtl } = useLang();
  return (
    <View style={[s.header, rtl && { flexDirection: 'row-reverse' }]}>
      <View style={[s.row, rtl && { flexDirection: 'row-reverse' }]}>
        <Logo size={34} />
        <Text style={s.brand}>{t('appName')}</Text>
      </View>
      <View style={[s.row, rtl && { flexDirection: 'row-reverse' }]}>
        {onBell && (
          <Pressable onPress={onBell} style={s.menuBtn} hitSlop={8} accessibilityLabel={t('notifications')}>
            <MaterialCommunityIcons name={unread ? 'bell-badge-outline' : 'bell-outline'} size={21} color={colors.primary} />
            {unread > 0 && (
              <View style={s.badge}><Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text></View>
            )}
          </Pressable>
        )}
        <Pressable onPress={onMenu} style={s.menuBtn} hitSlop={8} accessibilityLabel={t('menu')}>
          <MaterialCommunityIcons name="menu" size={22} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

// Search ignores case, Arabic diacritics and the common letter variants (أ/إ/آ/ا, ة/ه, ى/ي).
export const normalize = (s: string) => s.toLowerCase()
  .replace(/[\u064B-\u0652\u0640]/g, '')
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
export const matches = (query: string, ...fields: (string | undefined | null | false)[]) => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const hay = normalize(fields.filter(Boolean).join(' '));
  return words.every((w) => hay.includes(w));
};

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const { rtl } = useLang();
  return (
    <View style={[s.input, { flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingVertical: 4 }]}>
      <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted}
        style={{ flex: 1, paddingVertical: 6, fontSize: 14, color: colors.ink, textAlign: rtl ? 'right' : 'left' }} />
      {!!value && (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      )}
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
  const fg = tone === 'primary' ? colors.primary : colors.accentInk;
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

const makeStyles = () => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brand: { fontSize: 17, fontWeight: '700', color: colors.primary },
  menuBtn: { backgroundColor: colors.primarySoft, width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
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
let s = makeStyles();
