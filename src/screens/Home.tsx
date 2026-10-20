import React from 'react';
import { View } from 'react-native';
import { Button, H, P, useLang } from '../ui';
import { Role } from '../types';

export function Home({ role, onRole, onToggleLang, onSignOut, onEditProfile }: {
  role: Role; onRole: () => void; onToggleLang: () => void; onSignOut: () => void; onEditProfile?: () => void;
}) {
  const { t } = useLang();
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <H>{t('appName')}</H>
      <P muted>{t('tagline')}</P>
      <View style={{ height: 24 }} />
      <Button title={role === 'customer' ? t('myJobs') : t('jobFeed')} onPress={onRole} />
      {onEditProfile && <Button title={t('myProfile')} onPress={onEditProfile} secondary />}
      <View style={{ height: 24 }} />
      <Button title={t('switchLang')} onPress={onToggleLang} secondary />
      <Button title={t('signOut')} onPress={onSignOut} secondary />
    </View>
  );
}
