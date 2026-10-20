import React, { useState } from 'react';
import { avgStars } from '../money';
import { Review } from '../types';
import { Button, Card, P, useLang } from '../ui';

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const stars = avgStars(reviews.map((r) => r.stars));
  return (
    <>
      <Button
        title={open ? t('hideReviews') : `${t('reviews')} (${reviews.length}) ★ ${stars || '-'}`}
        onPress={() => setOpen(!open)}
        secondary
      />
      {open && reviews.length === 0 && <P muted>{t('noReviews')}</P>}
      {open && reviews.map((r, i) => (
        <Card key={i}>
          <P>{`${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}  ${r.by}`}</P>
          <P muted>{`${t(`service.${r.jobService}`)} · ${r.at}`}</P>
          <P>{r.text}</P>
        </Card>
      ))}
    </>
  );
}
