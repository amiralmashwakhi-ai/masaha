import React, { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { createProfile, recordConsent, sendPasswordReset, signIn, signInWithGoogle, signUp } from '../auth';
import { Role } from '../types';
import { Button, colors, Field, H, LinkText, Logo, OptionRow, P, useLang } from '../ui';

export function SignIn({ onFaq, onGuide }: { onFaq: () => void; onGuide: () => void }) {
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
      <View style={{ marginTop: 16 }}>
        <OptionRow icon="help-circle-outline" title={t('faq')} subtitle={t('faqShort')} onPress={onFaq} />
        <OptionRow icon="map-legend" tone="accent" title={t('guide')} subtitle={t('guideShort')} onPress={onGuide} />
      </View>
    </ScrollView>
  );
}

const SITE = 'https://masaha-kappa.vercel.app';

export function CreateProfile({ userId, defaultName, onDone }: { userId: string; defaultName?: string; onDone: () => void }) {
  const { t } = useLang();
  const [name, setName] = useState(defaultName ?? '');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);
  const pick = (on: boolean) => (on ? 'primary' : 'accent');

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <H>{t('createProfile')}</H>
      <Field label={t('fullName')} value={name} onChange={setName} />
      <Field label={t('phone')} value={phone} onChange={setPhone} numeric />
      <OptionRow icon={role === 'customer' ? 'check-circle' : 'account'} tone={pick(role === 'customer')} title={t('iAmCustomer')} subtitle={t('customerHint')} onPress={() => setRole('customer')} />
      <OptionRow icon={role === 'provider' ? 'check-circle' : 'account-hard-hat'} tone={pick(role === 'provider')} title={t('iAmProvider')} subtitle={t('providerHint')} onPress={() => setRole('provider')} />
      <OptionRow icon={agreed ? 'checkbox-marked' : 'checkbox-blank-outline'} tone={pick(agreed)} title={t('termsAgree')} onPress={() => setAgreed(!agreed)} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
        <LinkText title={t('readTerms')} onPress={() => Linking.openURL(`${SITE}/terms.html`)} />
        <LinkText title={t('readPrivacy')} onPress={() => Linking.openURL(`${SITE}/privacy.html`)} />
      </View>
      <Button title={t('next')} disabled={!agreed || !name.trim()} onPress={async () => {
        if (!name.trim() || !agreed) return;
        const e = await createProfile(userId, name.trim(), phone.trim(), role);
        if (e) setError(e.message); else onDone();
      }} />
      {!!error && <P small>{error}</P>}
    </ScrollView>
  );
}

// Shown once to accounts created before the consent covered storing data outside Jordan.
export function ConsentGate({ onDone }: { onDone: () => void }) {
  const { t } = useLang();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <H>{t('consentTitle')}</H>
      <P muted>{t('consentHint')}</P>
      <OptionRow icon={agreed ? 'checkbox-marked' : 'checkbox-blank-outline'} tone={agreed ? 'primary' : 'accent'} title={t('termsAgree')} onPress={() => setAgreed(!agreed)} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
        <LinkText title={t('readTerms')} onPress={() => Linking.openURL(`${SITE}/terms.html`)} />
        <LinkText title={t('readPrivacy')} onPress={() => Linking.openURL(`${SITE}/privacy.html`)} />
      </View>
      <Button title={t('agreeContinue')} disabled={!agreed} onPress={async () => {
        const { error: e } = await recordConsent();
        if (e) setError(e.message); else onDone();
      }} />
      {!!error && <P small>{error}</P>}
    </ScrollView>
  );
}
