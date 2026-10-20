import React from 'react';
import { View } from 'react-native';
import { Button, H, P, useLang } from '../ui';
import { Role } from '../types';

export function Home({ onRole, onToggleLang }: { onRole: (r: Role) => void; onToggleLang: () => void }) {
  const { t } = useLang();
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <H>{t('appName')}</H>
      <P muted>{t('tagline')}</P>
      <View style={{ height: 24 }} />
      <Button title={t('iAmCustomer')} onPress={() => onRole('customer')} />
      <Button title={t('iAmProvider')} onPress={() => onRole('provider')} secondary />
      <View style={{ height: 24 }} />
      <Button title={t('switchLang')} onPress={onToggleLang} secondary />
    </View>
  );
}
