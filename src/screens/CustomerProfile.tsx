import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as data from '../data';
import { avgStars } from '../money';
import { Review } from '../types';
import { Avatar, BackButton, Card, colors, P, Stats, useLang } from '../ui';
import { ReviewList } from './ReviewList';

// A customer's public page: name, member since, and the reviews surveyors left about them.
export function CustomerProfile({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useLang();
  const [person, setPerson] = useState<data.PublicPerson | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => {
    data.publicProfiles([id]).then((m) => setPerson(m[id] ?? null)).catch(() => {});
    data.reviewsAbout(id).then(setReviews).catch(() => {});
  }, [id]);
  const stars = avgStars(reviews.map((r) => r.stars));
  return (
    <ScrollView>
      <View style={{ alignItems: 'center', gap: 6, marginVertical: 12 }}>
        <Avatar name={person?.name ?? ''} size={76} />
        <Text style={{ fontSize: 21, fontWeight: '800', color: colors.ink, textAlign: 'center' }}>{person?.name ?? t('customer')}</Text>
        {person && <P muted small>{`${t('memberSince')} ${person.since.slice(0, 7)}`}</P>}
      </View>
      <Stats items={[
        { value: reviews.length ? stars.toFixed(1) : '–', label: t('rating') },
        { value: String(reviews.length), label: t('reviewsCount') },
      ]} />
      <Card>
        <P>{t('customerRating')}</P>
        {reviews.length ? <ReviewList reviews={reviews} /> : <P muted small>{t('noCustomerReviews')}</P>}
      </Card>
      <BackButton onPress={onBack} />
    </ScrollView>
  );
}
