import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { createProfile, sendCode, verifyCode } from '../auth';
import { Role } from '../types';
import { Button, Field, H, P, useLang } from '../ui';

export function SignIn() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  return (
    <ScrollView>
      <H>{t('signIn')}</H>
      <Field label={t('email')} value={email} onChange={setEmail} />
      {!sent && (
        <Button title={t('sendCode')} onPress={async () => {
          const { error: e } = await sendCode(email.trim());
          if (e) setError(e.message); else { setSent(true); setError(''); }
        }} />
      )}
      {sent && (
        <>
          <P muted>{t('codeSent')}</P>
          <Field label={t('code')} value={code} onChange={setCode} numeric />
          <Button title={t('verify')} onPress={async () => {
            const { error: e } = await verifyCode(email.trim(), code.trim());
            if (e) setError(e.message);
          }} />
        </>
      )}
      {!!error && <P>{error}</P>}
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
