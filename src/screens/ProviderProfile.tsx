import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView } from 'react-native';
import * as data from '../data';
import { avgStars } from '../money';
import { Provider, Role, ServiceId, ServicePost } from '../types';
import { Button, Card, H, P, useLang } from '../ui';
import { PostCard } from './Posts';
import { ReviewList } from './ReviewList';

export function ProviderProfile({ provider, role, mine, onRequest, onNewPost, onEdit, onBack }: {
  provider: Provider; role: Role; mine: boolean;
  onRequest: (service: ServiceId) => void; onNewPost?: () => void; onEdit?: () => void; onBack: () => void;
}) {
  const { t } = useLang();
  const stars = avgStars(provider.reviews.map((r) => r.stars));
  const [posts, setPosts] = useState<ServicePost[]>([]);
  const loadPosts = useCallback(() => { data.listPosts({ providerId: provider.id }).then(setPosts).catch(() => {}); }, [provider.id]);
  useEffect(loadPosts, [loadPosts]);
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
      {mine && onEdit && <Button title={t('editCv')} icon="pencil-outline" secondary onPress={onEdit} />}
      <H>{t('postsOnProfile')}</H>
      {mine && onNewPost && <Button title={t('newPost')} icon="plus" onPress={onNewPost} />}
      {posts.length === 0 && <P muted>{t('noPosts')}</P>}
      {posts.map((p) => <PostCard key={p.id} post={p} role={role} mine={mine} onRequest={onRequest} onChanged={loadPosts} />)}
      <P>{`★ ${stars || '-'} (${provider.reviews.length})`}</P>
      <ReviewList reviews={provider.reviews} />
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}
