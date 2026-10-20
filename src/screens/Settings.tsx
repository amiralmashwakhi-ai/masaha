import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { changePassword, Profile } from '../auth';
import * as data from '../data';
import { Button, Card, colors, Field, H, IconCircle, OptionRow, P, useLang } from '../ui';
import { DeleteAccountCard, LicenseCard } from './Safety';

// Brand badges drawn as text so no third-party logo files are bundled.
function Badge({ kind }: { kind: data.PaymentMethod['kind'] }) {
  const style = {
    cliq: { bg: '#5B2C83', fg: '#fff', label: 'CliQ' },
    visa: { bg: '#1A1F71', fg: '#fff', label: 'VISA' },
    mastercard: { bg: '#FFF4E5', fg: '#EB001B', label: 'mastercard' },
  }[kind];
  return (
    <View style={{ backgroundColor: style.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 64, alignItems: 'center' }}>
      <Text style={{ color: style.fg, fontWeight: '800', fontSize: 12, fontStyle: kind === 'visa' ? 'italic' : 'normal' }}>{style.label}</Text>
    </View>
  );
}

export function Settings({ profile, isProvider, onChanged, onSignOut, onBack }: {
  profile: Profile; isProvider: boolean; onChanged: () => void; onSignOut: () => void; onBack: () => void;
}) {
  const { t, rtl } = useLang();
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [methods, setMethods] = useState<data.PaymentMethod[]>([]);
  const [cliq, setCliq] = useState('');
  const [addingCliq, setAddingCliq] = useState(false);
  const [msg, setMsg] = useState('');

  const loadMethods = () => data.listPaymentMethods().then(setMethods).catch(() => setMsg(t('somethingWrong')));
  useEffect(() => { loadMethods(); }, []);
  const tryIt = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setMsg(ok); } catch { setMsg(t('somethingWrong')); }
  };

  const pickCover = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 1], quality: 0.7 });
    if (res.canceled || !res.assets[0]) return;
    await tryIt(async () => {
      const url = await data.uploadCover(profile.id, res.assets[0].uri, res.assets[0].mimeType ?? 'image/jpeg');
      await data.updateProfile(profile.id, { cover_url: url });
      if (isProvider) await data.setProviderCover(profile.id, url);
      onChanged();
    }, t('saved'));
  };

  const row = rtl ? 'row-reverse' : 'row';

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <H>{t('settings')}</H>

      <Pressable onPress={pickCover} style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 12, backgroundColor: colors.primarySoft, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        {profile.cover_url
          ? <Image source={{ uri: profile.cover_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} />
          : null}
        <View style={{ flexDirection: row, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <MaterialCommunityIcons name="image-edit-outline" size={16} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{profile.cover_url ? t('changeCover') : t('addCover')}</Text>
        </View>
      </Pressable>

      <Card>
        <P>{t('personalInfo')}</P>
        <Field label={t('fullName')} value={name} onChange={setName} />
        <Field label={t('phone')} value={phone} onChange={setPhone} numeric />
        <Button title={t('save')} onPress={() => tryIt(async () => { await data.updateProfile(profile.id, { full_name: name.trim(), phone: phone.trim() }); onChanged(); }, t('saved'))} />
      </Card>

      <Card>
        <P>{t('changePassword')}</P>
        <Field label={t('newPassword')} value={pw} onChange={setPw} secure />
        <Field label={t('confirmPassword')} value={pw2} onChange={setPw2} secure />
        <Button
          title={t('changePassword')}
          icon="lock-reset"
          onPress={() => {
            if (pw.length < 6) { setMsg(t('passwordRule')); return; }
            if (pw !== pw2) { setMsg(t('passwordsDiffer')); return; }
            tryIt(async () => { const { error } = await changePassword(pw); if (error) throw error; setPw(''); setPw2(''); }, t('passwordChanged'));
          }}
        />
      </Card>

      <Card>
        <P>{t('paymentMethods')}</P>
        <P muted small>{isProvider ? t('payoutHint') : t('payHint')}</P>
        {methods.map((m) => (
          <View key={m.id} style={{ flexDirection: row, alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.line }}>
            <Badge kind={m.kind} />
            <Text style={{ flex: 1, fontSize: 13, color: colors.ink, textAlign: rtl ? 'right' : 'left' }}>
              {m.kind === 'cliq' ? m.cliq_alias : `•••• ${m.last4 ?? ''}`}
            </Text>
            {m.is_default
              ? <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{t('default')}</Text>
              : <Text onPress={() => tryIt(async () => { await data.setDefaultMethod(methods, m.id); await loadMethods(); }, t('saved'))} style={{ fontSize: 11, color: colors.muted }}>{t('makeDefault')}</Text>}
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} onPress={() => tryIt(async () => { await data.removeMethod(m.id); await loadMethods(); }, t('removed'))} />
          </View>
        ))}
        {addingCliq ? (
          <View style={{ marginTop: 10 }}>
            <Field label={t('cliqAlias')} value={cliq} onChange={setCliq} />
            <Button title={t('save')} onPress={() => {
              if (!cliq.trim()) return;
              tryIt(async () => { await data.addCliq(profile.id, cliq.trim(), methods.length === 0); setCliq(''); setAddingCliq(false); await loadMethods(); }, t('saved'));
            }} />
          </View>
        ) : (
          <View style={{ marginTop: 10 }}>
            <OptionRow icon="bank-transfer" tone="accent" title={t('addCliq')} subtitle={t('addCliqHint')} onPress={() => setAddingCliq(true)} />
            <View style={{ flexDirection: row, alignItems: 'center', gap: 10 }}>
              <IconCircle name="credit-card-outline" />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: row, gap: 6 }}><Badge kind="visa" /><Badge kind="mastercard" /></View>
                <P muted small>{t('cardsSoon')}</P>
              </View>
            </View>
          </View>
        )}
      </Card>

      {!!msg && <View style={{ backgroundColor: colors.accentSoft, borderRadius: 12, padding: 10, marginBottom: 10 }}><P small>{msg}</P></View>}
      {isProvider && <LicenseCard userId={profile.id} />}
      <Button title={t('signOut')} icon="logout" secondary onPress={onSignOut} />
      <DeleteAccountCard />
      <Button title={t('back')} secondary onPress={onBack} />
    </ScrollView>
  );
}
