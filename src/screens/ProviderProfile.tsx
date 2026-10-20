import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import * as data from '../data';
import { avgStars } from '../money';
import { Provider, Role, ServiceId, ServicePost } from '../types';
import { Avatar, BackButton, Button, Card, colors, H, P, Pill, Stats, useLang } from '../ui';
import { PostCard } from './Posts';
import { ReportBlock } from './Safety';
import { ReviewList } from './ReviewList';

export function ProviderProfile({ provider, role, mine, viewerId, onRequest, onDirect, onNewPost, onEdit, onBack }: {
  provider: Provider; role: Role; mine: boolean; viewerId: string;
  onRequest: (service: ServiceId) => void; onDirect?: () => void; onNewPost?: () => void; onEdit?: () => void; onBack: () => void;
}) {
  const { t, rtl } = useLang();
  const stars = avgStars(provider.reviews.map((r) => r.stars));
  const [posts, setPosts] = useState<ServicePost[]>([]);
  const loadPosts = useCallback(() => { data.listPosts({ providerId: provider.id }).then(setPosts).catch(() => {}); }, [provider.id]);
  useEffect(loadPosts, [loadPosts]);
  return (
    <ScrollView>
      <View style={{ height: provider.coverUrl ? 120 : 64, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.primary }}>
        {provider.coverUrl && <Image source={{ uri: provider.coverUrl }} style={{ width: '100%', height: '100%' }} />}
      </View>
      <View style={{ alignItems: 'center', marginTop: -36, gap: 6, marginBottom: 12 }}>
        <View style={{ borderWidth: 4, borderColor: colors.bg, borderRadius: 44 }}><Avatar name={provider.name} size={76} /></View>
        <Text style={{ fontSize: 21, fontWeight: '800', color: colors.ink, textAlign: 'center' }}>{provider.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Pill text={t(provider.kind)} tone="muted" icon="office-building-outline" />
          <Pill text={provider.verified ? t('verified') : t('unverified')} tone={provider.verified ? 'primary' : 'accent'} icon={provider.verified ? 'check-decagram' : 'alert-circle-outline'} />
        </View>
        {provider.licenseNo && <Text style={{ fontSize: 12, color: colors.muted }}>{`${t('licenseNo')}: ${provider.licenseNo}`}</Text>}
      </View>
      <Stats items={[
        { value: String(provider.experienceYears || '-'), label: t('years') },
        { value: stars ? String(stars) : '-', label: t('rating') },
        { value: String(provider.reviews.length), label: t('reviewsCount') },
      ]} />
      {!mine && role === 'customer' && onDirect && <Button title={t('requestDirect')} icon="account-arrow-right-outline" onPress={onDirect} />}
      {!provider.verified && !mine && <Card><P small>{`⚠ ${t('unverifiedWarn')}`}</P></Card>}
      {(provider.services.length > 0 || !!provider.otherServices) && (
        <Card>
          <P>{t('servicesOffered')}</P>
          <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {provider.services.filter((s) => s !== 'other').map((s) => <Pill key={s} text={t(`service.${s}`)} />)}
            {provider.governorates.map((g) => <Pill key={g} text={t(`gov.${g}`)} tone="accent" icon="map-marker-outline" />)}
          </View>
          {!!provider.otherServices && provider.services.includes('other') && <View style={{ marginTop: 8 }}><P muted>{provider.otherServices}</P></View>}
        </Card>
      )}
      <Card>
        <P>{t('cv')}</P>
        <P muted>{`${t('education')}: ${provider.cv.education}`}</P>
        <P muted>{`${t('experience')}:`}</P>
        {provider.cv.experience.map((e) => <P key={e} muted>{`• ${e}`}</P>)}
        <P muted>{`${t('equipment')}: ${provider.cv.equipment.join('، ')}`}</P>
      </Card>
      {mine && onEdit && <Button title={t('editCv')} icon="pencil-outline" secondary onPress={onEdit} />}
      <H>{t('postsOnProfile')}</H>
      {mine && onNewPost && <Button title={t('newPost')} icon="plus" onPress={onNewPost} />}
      {posts.length === 0 && <P muted>{t('noPosts')}</P>}
      {posts.map((p) => <PostCard key={p.id} post={p} role={role} mine={mine} viewerId={mine ? undefined : viewerId} onRequest={onRequest} onChanged={loadPosts} />)}
      <P>{`★ ${stars || '-'} (${provider.reviews.length})`}</P>
      <ReviewList reviews={provider.reviews} />
      {!mine && <ReportBlock reporterId={viewerId} userId={provider.id} canBlock onBlocked={onBack} />}
      <BackButton onPress={onBack} />
    </ScrollView>
  );
}
