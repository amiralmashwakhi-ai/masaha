import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { createContext, useContext, useEffect, useRef } from 'react';
import { BackHandler, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

// One row of choices for a search filter; the first option usually means "all".
export function Chips<T>({ label, options, value, onChange }: {
  label?: string; options: { id: T; title: string }[]; value: T; onChange: (v: T) => void;
}) {
  const { rtl } = useLang();
  return (
    <View style={{ marginBottom: 6 }}>
      {!!label && <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 4, textAlign: rtl ? 'right' : 'left' }}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable key={String(o.id)} onPress={() => onChange(o.id)}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, marginEnd: 6,
                backgroundColor: on ? colors.primary : colors.primarySoft }}>
              <Text style={{ fontSize: 12, color: on ? colors.primaryInk : colors.primary }}>{o.title}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Search box plus a button that shows or hides the filter rows under it.
export function SearchWithFilters({ value, onChange, placeholder, active, children }: {
  value: string; onChange: (v: string) => void; placeholder: string; active: number; children: React.ReactNode;
}) {
  const { t, rtl } = useLang();
  const [open, setOpen] = React.useState(false);
  return (
    <View>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}><SearchBox value={value} onChange={onChange} placeholder={placeholder} /></View>
        <Pressable onPress={() => setOpen(!open)} accessibilityLabel={t('filters')}
          style={[s.input, { paddingVertical: 9, paddingHorizontal: 10, backgroundColor: open || active ? colors.primarySoft : colors.bg }]}>
          <MaterialCommunityIcons name="tune-variant" size={20} color={colors.primary} />
          {active > 0 && (
            <View style={{ position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{active}</Text>
            </View>
          )}
        </Pressable>
      </View>
      {open && <View style={{ marginBottom: 6 }}>{children}</View>}
    </View>
  );
}

export type Tone = 'primary' | 'accent' | 'muted' | 'danger';
const toneColors = (tone: Tone) => ({
  primary: { bg: colors.primarySoft, fg: colors.primary },
  accent: { bg: colors.accentSoft, fg: colors.accentInk },
  muted: { bg: colors.line, fg: colors.muted },
  danger: { bg: colors.accentSoft, fg: colors.danger },
}[tone]);

// A small rounded label, for a job's status, "verified" and the like.
export function Pill({ text, tone = 'primary', icon }: { text: string; tone?: Tone; icon?: IconName }) {
  const { rtl } = useLang();
  const c = toneColors(tone);
  return (
    <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, alignSelf: rtl ? 'flex-end' : 'flex-start', backgroundColor: c.bg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
      {icon && <MaterialCommunityIcons name={icon} size={13} color={c.fg} />}
      <Text style={{ fontSize: 12, fontWeight: '700', color: c.fg }}>{text}</Text>
    </View>
  );
}

// A section heading with an optional link on the other side ("see all").
export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { rtl } = useLang();
  return (
    <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 10 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink }}>{title}</Text>
      {action && onAction && <Text onPress={onAction} style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>{action}</Text>}
    </View>
  );
}

// Two-column grid of tappable tiles: an icon over a title and a short line.
export function TileGrid({ children }: { children: React.ReactNode }) {
  const { rtl } = useLang();
  return <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 4 }}>{children}</View>;
}
export function Tile({ icon, title, subtitle, onPress, tone = 'primary', selected }: { icon: IconName; title: string; subtitle?: string; onPress: () => void; tone?: 'primary' | 'accent'; selected?: boolean }) {
  const { rtl } = useLang();
  return (
    <Pressable onPress={onPress} style={[s.card, { width: '48.5%', minHeight: 118, gap: 8, alignItems: rtl ? 'flex-end' : 'flex-start' },
      selected && { borderColor: colors.primary, borderWidth: 2 }]}>
      <IconCircle name={selected ? 'check' : icon} tone={selected ? 'primary' : tone} size={42} />
      <Text style={[s.optTitle, rtl && s.rtl]} numberOfLines={2}>{title}</Text>
      {!!subtitle && <Text style={[s.optSub, rtl && s.rtl, { marginTop: 0 }]} numberOfLines={2}>{subtitle}</Text>}
    </Pressable>
  );
}

// Round picture, or the first letter of the name on teal.
export function Avatar({ name, uri, size = 56 }: { name: string; uri?: string; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primaryInk, fontSize: size * 0.42, fontWeight: '800' }}>{name.trim().replace(/^مكتب\s+/, '').replace(/^ال/, '').charAt(0) || '؟'}</Text>
    </View>
  );
}

// A row of figures: a big number over a small label, split by thin lines.
export function Stats({ items }: { items: { value: string; label: string }[] }) {
  const { rtl } = useLang();
  return (
    <View style={[s.card, { flexDirection: rtl ? 'row-reverse' : 'row', paddingVertical: 12 }]}>
      {items.map((it, i) => (
        <View key={it.label} style={{ flex: 1, alignItems: 'center', borderColor: colors.line, borderLeftWidth: i > 0 && rtl ? 0 : i > 0 ? 1 : 0, borderRightWidth: i > 0 && rtl ? 1 : 0 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{it.value}</Text>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{it.label}</Text>
        </View>
      ))}
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

// A screen's way back. On Android the phone's own back button does it, so no button is drawn there.
// The most recently shown screen wins, because BackHandler calls the latest listener first.
export function BackButton({ onPress }: { onPress: () => void }) {
  const { t } = useLang();
  const latest = useRef(onPress);
  latest.current = onPress;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { latest.current(); return true; });
    return () => sub.remove();
  }, []);
  if (Platform.OS === 'android') return null;
  return <Button title={t('back')} onPress={onPress} secondary />;
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
  h: { fontSize: 21, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  p: { fontSize: 14, color: colors.ink, lineHeight: 21 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  btn: { flexDirection: 'row', justifyContent: 'center', backgroundColor: colors.primary, minHeight: 48, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.button, alignItems: 'center', marginVertical: 5 },
  btn2: { backgroundColor: colors.primarySoft },
  btnText: { fontSize: 15, fontWeight: '700' },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600', marginVertical: 6 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16, marginBottom: 12, ...shadow },
  optTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
  optSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  label: { fontSize: 12, color: colors.muted, marginBottom: 5 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, minHeight: 46, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, color: colors.ink },
});
let s = makeStyles();
