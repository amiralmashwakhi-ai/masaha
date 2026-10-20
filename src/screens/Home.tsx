import React from 'react';
import { ImageBackground, ScrollView, Text, View } from 'react-native';
import { Role } from '../types';
import { colors, OptionRow, P, useLang } from '../ui';

export function Home({ role, name, coverUrl, onJobs, onNew, onBrowse, onNewPost, onEditProfile, onHistory }: {
  role: Role; name: string; coverUrl?: string | null;
  onJobs: () => void; onNew?: () => void; onBrowse: () => void; onNewPost?: () => void; onEditProfile?: () => void; onHistory: () => void;
}) {
  const { t, rtl } = useLang();
  return (
    <ScrollView>
      <ImageBackground
        source={{ uri: coverUrl ?? undefined }}
        style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: colors.primary, marginBottom: 14 }}
      >
        <View style={{ padding: 18, minHeight: 110, justifyContent: 'flex-end', backgroundColor: coverUrl ? 'rgba(47,111,115,0.55)' : undefined }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: rtl ? 'right' : 'left' }}>{`${t('hello')} ${name}`}</Text>
          <Text style={{ color: '#E8F1F1', fontSize: 12, textAlign: rtl ? 'right' : 'left' }}>{role === 'customer' ? t('customer') : t('provider')}</Text>
        </View>
      </ImageBackground>
      <P muted small>{t('tagline')}</P>
      <View style={{ height: 10 }} />
      {role === 'customer' && onNew && <OptionRow icon="plus-circle-outline" tone="accent" title={t('newRequest')} subtitle={t('newRequestHint')} onPress={onNew} />}
      {onNewPost && <OptionRow icon="bullhorn-outline" tone="accent" title={t('newPost')} subtitle={t('newPostHint')} onPress={onNewPost} />}
      <OptionRow icon="storefront-outline" title={t('browseServices')} subtitle={t('browseServicesHint')} onPress={onBrowse} />
      <OptionRow icon="clipboard-list-outline" title={role === 'customer' ? t('myJobs') : t('jobFeed')} onPress={onJobs} />
      {onEditProfile && <OptionRow icon="card-account-details-outline" title={t('myProfile')} subtitle={t('myProfileHint')} onPress={onEditProfile} />}
      <OptionRow icon="history" title={t('history')} subtitle={t('historyHint')} onPress={onHistory} />
    </ScrollView>
  );
}
