import React from 'react';
import { Image, ScrollView } from 'react-native';
import { avgStars } from '../money';
import { Provider } from '../types';
import { Button, Card, H, P, useLang } from '../ui';
import { ReviewList } from './ReviewList';

export function ProviderProfile({ provider, onBack }: { provider: Provider; onBack: () => void }) {
  const { t } = useLang();
  const stars = avgStars(provider.reviews.map((r) => r.stars));
  return (
    <ScrollView>
      {provider.coverUrl && (
        <Image source={{ uri: provider.coverUrl }} style={{ width: '100%', height: 110, borderRadius: 20, marginBottom: 12 }} />
      )}
      <H>{provider.name}</H>
      <P muted>
        {[t(provider.kind), provider.verified ? `✓ ${t('verified')}` : t('unverified'),
          `${provider.experienceYears} ${t('years')}`].join(' · ')}
      </P>
      {provider.licenseNo && <P muted>{provider.licenseNo}</P>}
      <Card>
        <P>{t('cv')}</P>
        <P muted>{`${t('education')}: ${provider.cv.education}`}</P>
        <P muted>{`${t('experience')}:`}</P>
        {provider.cv.experience.map((e) => <P key={e} muted>{`• ${e}`}</P>)}
        <P muted>{`${t('equipment')}: ${provider.cv.equipment.join('، ')}`}</P>
      </Card>
      <P>{`★ ${stars || '-'} (${provider.reviews.length})`}</P>
      <ReviewList reviews={provider.reviews} />
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}
