import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { split } from '../money';
import { Job, JOB_STAGES, Provider, Review, Role } from '../types';
import { ChatCard } from './ChatCard';
import { ReviewList } from './ReviewList';
import { Button, Card, colors, Field, H, P, useLang } from '../ui';

export interface JobActions {
  sendQuote: (jobId: string, priceJod: number, days: number, scope: string) => void;
  acceptQuote: (jobId: string, quoteId: string) => void;
  sign: (jobId: string, role: Role) => void;
  payEscrow: (jobId: string) => void;
  advance: (jobId: string) => void;
  release: (jobId: string, key: 'fieldWork' | 'delivery') => void;
  review: (jobId: string, by: Role, stars: 1 | 2 | 3 | 4 | 5, text: string) => void;
}

export function JobDetail({ job, role, userId, providers, loadCustomerReviews, actions, onProfile, onBack }: {
  job: Job; role: Role; userId: string; providers: Provider[]; loadCustomerReviews: (customerId: string) => Promise<Review[]>; actions: JobActions;
  onProfile: (id: string) => void; onBack: () => void;
}) {
  const { t } = useLang();
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [scope, setScope] = useState('');
  const [stars, setStars] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [reviewText, setReviewText] = useState('');
  const [customerReviews, setCustomerReviews] = useState<Review[]>([]);
  useEffect(() => {
    if (role === 'provider') loadCustomerReviews(job.customerId).then(setCustomerReviews);
  }, [job.customerId, role]);
  const myReview = job.reviews.find((r) => r.by === role);
  const theirReview = job.reviews.find((r) => r.by !== role);
  const accepted = job.quotes.find((q) => q.id === job.acceptedQuoteId);
  const providerOf = (id: string) => providers.find((p) => p.id === id);
  const fullySigned = job.signedBy.includes('customer') && job.signedBy.includes('provider');
  const paid = job.milestones.some((m) => m.status !== 'pending');

  return (
    <ScrollView>
      <H>{t(`service.${job.service}`)}</H>
      <P muted>{t(`stage.${job.stage}`)} ({JOB_STAGES.indexOf(job.stage) + 1}/{JOB_STAGES.length})</P>
      {!!job.visits && <P>{`${t('visits')}: ${job.visits}`}</P>}

      {!accepted && (
        <Card>
          <P>{t('quotes')}</P>
          {job.quotes.length === 0 && <P muted>{t('noQuotes')}</P>}
          {job.quotes.map((q) => {
            const p = providerOf(q.providerId);
            return (
              <View key={q.id} style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 8, marginTop: 8 }}>
                <P>{`${p?.name ?? ''} · ${q.priceJod} ${t('jod')} · ${q.days} ${t('days')}`}</P>
                <P muted>{q.scope}</P>
                <Button title={t('viewProfile')} onPress={() => onProfile(q.providerId)} secondary />
                {role === 'customer' && <Button title={t('accept')} onPress={() => actions.acceptQuote(job.id, q.id)} />}
              </View>
            );
          })}
          {role === 'provider' && job.quotes.length === 0 && (
            <View style={{ marginTop: 12 }}>
              <Field label={t('price')} value={price} onChange={setPrice} numeric />
              <Field label={t('days')} value={days} onChange={setDays} numeric />
              <Field label={t('scope')} value={scope} onChange={setScope} />
              {Number(price) > 0 && (
                <P muted>{`${t('commission')}: ${split(Number(price)).commission} · ${t('providerGets')}: ${split(Number(price)).providerGets} ${t('jod')}`}</P>
              )}
              <Button
                title={t('sendQuote')}
                onPress={() => {
                  if (Number(price) > 0) actions.sendQuote(job.id, Number(price), Number(days) || 1, scope);
                  setPrice(''); setDays(''); setScope('');
                }}
              />
            </View>
          )}
        </Card>
      )}

      {accepted && (
        <Card>
          <P>{t('agreement')}</P>
          <P muted>{t('agreementBody')}</P>
          <P>{`${providerOf(accepted.providerId)?.name} · ${accepted.priceJod} ${t('jod')} · ${accepted.days} ${t('days')}`}</P>
          <P muted>{accepted.scope}</P>
          <P muted>{`${t('commission')}: ${split(accepted.priceJod).commission} · ${t('providerGets')}: ${split(accepted.priceJod).providerGets} ${t('jod')}`}</P>
          <P muted>{`${t('signedBy')}: ${job.signedBy.map((r) => t(r)).join('، ') || '-'}`}</P>
          {!job.signedBy.includes(role) && <Button title={t('sign')} onPress={() => actions.sign(job.id, role)} />}
        </Card>
      )}

      {accepted && fullySigned && (
        <Card>
          <P>{t('escrow')}</P>
          {job.milestones.map((m) => (
            <View key={m.key} style={{ marginTop: 6 }}>
              <P>{`${t(`ms.${m.key}`)}: ${Math.round(accepted.priceJod * m.share * 1000) / 1000} ${t('jod')}`}</P>
              <P muted>{t(`mss.${m.status}`)}</P>
              {role === 'customer' && m.status === 'held' && (
                <Button title={t('release')} onPress={() => actions.release(job.id, m.key)} secondary />
              )}
            </View>
          ))}
          {role === 'customer' && !paid && (
            <Button title={`${t('payEscrow')} (${accepted.priceJod} ${t('jod')})`} onPress={() => actions.payEscrow(job.id)} />
          )}
        </Card>
      )}

      {role === 'provider' && accepted && (job.stage === 'visitScheduled' || job.stage === 'drafting') && (
        <Button
          title={job.stage === 'visitScheduled' ? t('markFieldWork') : t('markSubmitted')}
          onPress={() => actions.advance(job.id)}
        />
      )}

      {role === 'provider' && (
        <Card>
          <P>{t('customerRating')}</P>
          <ReviewList reviews={customerReviews} />
        </Card>
      )}

      {job.stage === 'done' && accepted && (
        <Card>
          <P>{role === 'customer' ? t('rateProvider') : t('rateCustomer')}</P>
          {myReview ? (
            <P muted>{`${'★'.repeat(myReview.stars)} ${myReview.text}`}</P>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 8 }}>
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <Text key={n} onPress={() => setStars(n)} style={{ fontSize: 32, color: n <= stars ? colors.star : colors.line, marginHorizontal: 4 }}>
                    ★
                  </Text>
                ))}
              </View>
              <Field label={t('reviewText')} value={reviewText} onChange={setReviewText} />
              <Button title={t('submitReview')} onPress={() => actions.review(job.id, role, stars, reviewText.trim())} />
            </>
          )}
          {theirReview && <P muted>{`${t('theyRatedYou')}: ${'★'.repeat(theirReview.stars)} ${theirReview.text}`}</P>}
        </Card>
      )}

      <ChatCard job={job} role={role} userId={userId} providers={providers} />

      <Card>
        <P>{t('record')}</P>
        {job.events.map((e, i) => <P key={i} muted>{`${e.at.slice(0, 16).replace('T', ' ')} · ${t(e.by)} · ${e.text}`}</P>)}
      </Card>
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}
