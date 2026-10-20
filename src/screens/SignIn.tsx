import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { createProfile, sendPasswordReset, signIn, signInWithGoogle, signUp } from '../auth';
import { Role } from '../types';
import { Button, colors, Field, H, LinkText, Logo, OptionRow, P, useLang } from '../ui';

export function SignIn() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'reset'>('signIn');
  const [info, setInfo] = useState('');

  const submit = async () => {
    const e = email.trim();
    if (mode === 'reset') {
      if (!e) { setInfo(t('enterEmail')); return; }
      const { error } = await sendPasswordReset(e);
      setInfo(error ? t('somethingWrong') : t('resetSent'));
      return;
    }
    if (!e || password.length < 6) { setInfo(t('passwordRule')); return; }
    if (mode === 'signIn') {
      const { error } = await signIn(e, password);
      if (error) setInfo(error.message.includes('confirm') ? t('confirmFirst') : t('wrongLogin'));
    } else {
      const { data, error } = await signUp(e, password);
      if (error) setInfo(error.message);
      else if (!data.session) { setInfo(t('checkEmail')); setMode('signIn'); }
    }
  };

  const titles = { signIn: t('signIn'), signUp: t('signUp'), reset: t('forgotTitle') };
  const buttons = { signIn: t('signInBtn'), signUp: t('signUpBtn'), reset: t('sendReset') };

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', marginVertical: 18 }}>
        <Logo size={84} />
        <P muted small>{t('tagline')}</P>
      </View>
      <H>{titles[mode]}</H>
      {mode === 'reset' && <P muted small>{t('forgotHelp')}</P>}
      <Field label={t('email')} value={email} onChange={setEmail} />
      {mode !== 'reset' && <Field label={t('password')} value={password} onChange={setPassword} secure />}
      {mode === 'signIn' && <LinkText title={t('forgotPassword')} onPress={() => { setMode('reset'); setInfo(''); }} />}
      <Button title={buttons[mode]} onPress={submit} />
      {mode !== 'reset' && (
        <>
          <P muted small>{t('or')}</P>
          <Button
            title={t('google')}
            icon="google"
            secondary
            onPress={async () => { const e = await signInWithGoogle(); if (e) setInfo(t('googleFailed')); }}
          />
        </>
      )}
      <LinkText
        title={mode === 'signIn' ? t('noAccount') : t('haveAccount')}
        onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setInfo(''); }}
      />
      {!!info && <View style={{ backgroundColor: colors.accentSoft, borderRadius: 12, padding: 10, marginTop: 8 }}><P small>{info}</P></View>}
    </ScrollView>
  );
}

export function CreateProfile({ userId, defaultName, onDone }: { userId: string; defaultName?: string; onDone: () => void }) {
  const { t } = useLang();
  const [name, setName] = useState(defaultName ?? '');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [kind, setKind] = useState<'individual' | 'office'>('individual');
  const [error, setError] = useState('');
  const pick = (on: boolean) => (on ? 'primary' : 'accent');

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <H>{t('createProfile')}</H>
      <Field label={t('fullName')} value={name} onChange={setName} />
      <Field label={t('phone')} value={phone} onChange={setPhone} numeric />
      <OptionRow icon={role === 'customer' ? 'check-circle' : 'account'} tone={pick(role === 'customer')} title={t('iAmCustomer')} subtitle={t('customerHint')} onPress={() => setRole('customer')} />
      <OptionRow icon={role === 'provider' ? 'check-circle' : 'account-hard-hat'} tone={pick(role === 'provider')} title={t('iAmProvider')} subtitle={t('providerHint')} onPress={() => setRole('provider')} />
      {role === 'provider' && (
        <>
          <OptionRow icon={kind === 'individual' ? 'check-circle' : 'account-tie'} tone={pick(kind === 'individual')} title={t('individual')} onPress={() => setKind('individual')} />
          <OptionRow icon={kind === 'office' ? 'check-circle' : 'office-building'} tone={pick(kind === 'office')} title={t('office')} onPress={() => setKind('office')} />
        </>
      )}
      <Button title={t('next')} onPress={async () => {
        if (!name.trim()) return;
        const e = await createProfile(userId, name.trim(), phone.trim(), role, kind);
        if (e) setError(e.message); else onDone();
      }} />
      {!!error && <P small>{error}</P>}
    </ScrollView>
  );
}
