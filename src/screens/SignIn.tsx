import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { createProfile, signIn, signUp } from '../auth';
import { Role } from '../types';
import { Button, Field, H, P, useLang } from '../ui';

export function SignIn() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [info, setInfo] = useState('');

  const submit = async () => {
    const e = email.trim();
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

  return (
    <ScrollView>
      <H>{mode === 'signIn' ? t('signIn') : t('signUp')}</H>
      <Field label={t('email')} value={email} onChange={setEmail} />
      <Field label={t('password')} value={password} onChange={setPassword} secure />
      <Button title={mode === 'signIn' ? t('signInBtn') : t('signUpBtn')} onPress={submit} />
      <Button
        title={mode === 'signIn' ? t('noAccount') : t('haveAccount')}
        onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setInfo(''); }}
        secondary
      />
      {!!info && <P>{info}</P>}
    </ScrollView>
  );
}

export function CreateProfile({ userId, onDone }: { userId: string; onDone: () => void }) {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [kind, setKind] = useState<'individual' | 'office'>('individual');
  const [error, setError] = useState('');

  return (
    <ScrollView>
      <H>{t('createProfile')}</H>
      <Field label={t('fullName')} value={name} onChange={setName} />
      <Field label={t('phone')} value={phone} onChange={setPhone} numeric />
      <Button title={t('iAmCustomer')} onPress={() => setRole('customer')} secondary={role !== 'customer'} />
      <Button title={t('iAmProvider')} onPress={() => setRole('provider')} secondary={role !== 'provider'} />
      {role === 'provider' && (
        <>
          <Button title={t('individual')} onPress={() => setKind('individual')} secondary={kind !== 'individual'} />
          <Button title={t('office')} onPress={() => setKind('office')} secondary={kind !== 'office'} />
        </>
      )}
      <Button title={t('next')} onPress={async () => {
        if (!name.trim()) return;
        const e = await createProfile(userId, name.trim(), phone.trim(), role, kind);
        if (e) setError(e.message); else onDone();
      }} />
      {!!error && <P>{error}</P>}
    </ScrollView>
  );
}
