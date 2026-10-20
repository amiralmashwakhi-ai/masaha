import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { avgStars } from '../money';
import { Provider } from '../types';
import { Button, Card, H, P, useLang } from '../ui';

export function ProviderProfile({ provider, onBack }: { provider: Provider; onBack: () => void }) {
  const { t } = useLang();
  const [showReviews, setShowReviews] = useState(false);
  const stars = avgStars(provider.reviews.map((r) => r.stars));
  return (
    <ScrollView>
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
      <Button
        title={showReviews ? t('hideReviews') : `${t('reviews')} (${provider.reviews.length}) ★ ${stars || '-'}`}
        onPress={() => setShowReviews(!showReviews)}
        secondary
      />
      {showReviews && provider.reviews.length === 0 && <P muted>{t('noReviews')}</P>}
      {showReviews && provider.reviews.map((r, i) => (
        <Card key={i}>
          <P>{`${'★'.repeat(r.stars)} ${r.by}`}</P>
          <P muted>{`${t(`service.${r.jobService}`)} · ${r.at}`}</P>
          <P>{r.text}</P>
        </Card>
      ))}
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}
