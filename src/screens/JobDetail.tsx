import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { correctionNote, eventText, lastCorrectionAt } from '../events';
import { fmt, split } from '../money';
import { Job, JOB_STAGES, Provider, Review, Role } from '../types';
import { ChatBubble } from './ChatCard';
import { Deliverables } from './Deliverables';
import { JobSafety } from './Safety';
import { ReviewList } from './ReviewList';
import { Button, Card, colors, Field, H, P, useLang } from '../ui';

export interface JobActions {
  unsign: (jobId: string) => void;
  sendQuote: (jobId: string, priceJod: number, days: number, scope: string) => void;
  acceptQuote: (jobId: string, quoteId: string) => void;
  sign: (jobId: string, role: Role) => void;
  payEscrow: (jobId: string) => void;
  advance: (jobId: string) => void;
  release: (jobId: string, key: 'fieldWork' | 'delivery') => void;
  review: (jobId: string, by: Role, stars: 1 | 2 | 3 | 4 | 5, text: string) => void;
}

export function JobDetail({ job, role, userId, providers, loadCustomerReviews, actions, onChanged, onProfile, onBack }: {
  job: Job; role: Role; userId: string; providers: Provider[]; loadCustomerReviews: (customerId: string) => Promise<Review[]>; actions: JobActions; onChanged: () => void;
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
  const [freshFiles, setFreshFiles] = useState(0);
  const needsFiles = !(job.service === 'staking' && job.withReport === false);
  // A signature can be withdrawn until 3 minutes after both sides signed, and never after payment.
  const [now, setNow] = useState(Date.now());
  const withdrawLeft = job.bothSignedAt ? Math.ceil((Date.parse(job.bothSignedAt) + 180000 - now) / 1000) : Infinity;
  const canUnsign = job.signedBy.includes(role) && !paid && ['quoted', 'agreed'].includes(job.stage) && withdrawLeft > 0;
  useEffect(() => {
    if (!job.bothSignedAt || withdrawLeft <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [job.bothSignedAt, withdrawLeft > 0]);
  const sinceCorrection = lastCorrectionAt(job.events);
  const note = ['visitScheduled', 'fieldWork', 'drafting'].includes(job.stage) ? correctionNote(job.events) : undefined;
  // Staking is quoted per visit; the stored price is the total.
  const visits = job.service === 'staking' && job.visits ? job.visits : 0;
  const priceLine = (q: { priceJod: number; days: number }) =>
    `${fmt(q.priceJod)} ${t('jod')}${visits > 1 ? ` (${fmt(q.priceJod / visits)} × ${visits})` : ''} · ${q.days} ${t('days')}`;

  return (
    <View style={{ flex: 1 }}>
    <ScrollView>
      <H>{t(`service.${job.service}`)}</H>
      <P muted>{JOB_STAGES.includes(job.stage) ? `${t(`stage.${job.stage}`)} (${JOB_STAGES.indexOf(job.stage) + 1}/${JOB_STAGES.length})` : t(`stage.${job.stage}`)}</P>
      {!!job.visits && <P>{`${t('visits')}: ${job.visits}${job.visitLength ? ` · ${t(`len.${job.visitLength}`)}` : ''}${job.withReport != null ? ` · ${job.withReport ? t('withReport') : t('withoutReport')}` : ''}`}</P>}
      {note && (
        <Card>
          <P>{t('correctionTitle')}</P>
          <P>{note}</P>
          <P muted small>{t('correctionHint')}</P>
        </Card>
      )}

      {!accepted && (
        <Card>
          <P>{t('quotes')}</P>
          {job.quotes.length === 0 && <P muted>{t('noQuotes')}</P>}
          {job.quotes.map((q) => {
            const p = providerOf(q.providerId);
            return (
              <View key={q.id} style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 8, marginTop: 8 }}>
                <P>{`${p?.name ?? ''} · ${priceLine(q)}`}</P>
                <P muted>{q.scope}</P>
                <Button title={t('viewProfile')} onPress={() => onProfile(q.providerId)} secondary />
                {role === 'customer' && <Button title={t('accept')} onPress={() => actions.acceptQuote(job.id, q.id)} />}
              </View>
            );
          })}
          {role === 'provider' && job.quotes.length === 0 && (
            <View style={{ marginTop: 12 }}>
              <Field label={visits ? t('pricePerVisit') : t('price')} value={price} onChange={setPrice} numeric />
              {!!visits && Number(price) > 0 && <P muted>{`${t('total')}: ${fmt(Number(price) * visits)} ${t('jod')}`}</P>}
              <Field label={t('days')} value={days} onChange={setDays} numeric />
              <Field label={t('scope')} value={scope} onChange={setScope} />
              {Number(price) > 0 && (
                <P muted>{`${t('commission')}: ${fmt(split(Number(price) * (visits || 1)).commission)} · ${t('providerGets')}: ${fmt(split(Number(price) * (visits || 1)).providerGets)} ${t('jod')}`}</P>
              )}
              <Button
                title={t('sendQuote')}
                onPress={() => {
                  if (Number(price) > 0) actions.sendQuote(job.id, Number(price) * (visits || 1), Number(days) || 1, scope);
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
          <P>{`${providerOf(accepted.providerId)?.name} · ${priceLine(accepted)}`}</P>
          <P muted>{accepted.scope}</P>
          <P muted>{`${t('commission')}: ${fmt(split(accepted.priceJod).commission)} · ${t('providerGets')}: ${fmt(split(accepted.priceJod).providerGets)} ${t('jod')}`}</P>
          <P muted>{`${t('signedBy')}: ${job.signedBy.map((r) => t(r)).join('، ') || '-'}`}</P>
          {!job.signedBy.includes(role) && <Button title={t('sign')} onPress={() => actions.sign(job.id, role)} />}
          {canUnsign && (
            <>
              <Button title={t('unsign')} icon="undo" secondary onPress={() => actions.unsign(job.id)} />
              {Number.isFinite(withdrawLeft) && <P muted small>{t('unsignLeft').replace('{s}', String(withdrawLeft))}</P>}
            </>
          )}
        </Card>
      )}

      {accepted && fullySigned && (
        <Card>
          <P>{t('escrow')}</P>
          {job.milestones.map((m) => (
            <View key={m.key} style={{ marginTop: 6 }}>
              <P>{`${t(`ms.${m.key}`)}: ${fmt(accepted.priceJod * m.share)} ${t('jod')}`}</P>
              <P muted>{t(`mss.${m.status}`)}</P>
              {role === 'customer' && m.status === 'held' && (
                <Button title={t('release')} onPress={() => actions.release(job.id, m.key)} secondary />
              )}
            </View>
          ))}
          {role === 'customer' && !paid && (
            <Button title={`${t('payEscrow')} (${fmt(accepted.priceJod)} ${t('jod')})`} onPress={() => actions.payEscrow(job.id)} />
          )}
        </Card>
      )}

      {accepted && needsFiles && <Deliverables job={job} role={role} userId={userId} since={sinceCorrection} onCount={setFreshFiles} />}

      {role === 'provider' && accepted && (job.stage === 'visitScheduled' || job.stage === 'drafting') && (
        <>
          <Button
            title={job.stage === 'visitScheduled' ? t('markFieldWork') : t('markSubmitted')}
            disabled={job.stage === 'drafting' && needsFiles && freshFiles === 0}
            onPress={() => actions.advance(job.id)}
          />
          {job.stage === 'drafting' && needsFiles && freshFiles === 0 && <P muted small>{t('needDeliverables')}</P>}
        </>
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

      <Card>
        <P>{t('record')}</P>
        {job.events.map((e, i) => <P key={i} muted>{`${e.at.slice(0, 16).replace('T', ' ')} · ${t(e.by === 'masaha' ? 'appName' : e.by)} · ${eventText(e, t)}`}</P>)}
      </Card>
      {(job.customerId === userId || job.providerId === userId) && <JobSafety job={job} role={role} onDone={onChanged} onDeleted={() => { onChanged(); onBack(); }} />}
      <Button title={t('back')} onPress={onBack} secondary />
      <View style={{ height: 70 }} />
    </ScrollView>
    <ChatBubble job={job} role={role} userId={userId} providers={providers} />
    </View>
  );
}
