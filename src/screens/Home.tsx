import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { serviceName, SERVICES, stageTone } from '../services';
import { Job, Role, ServiceId } from '../types';
import { Card, colors, IconCircle, OptionRow, P, Pill, SectionTitle, Stats, Tile, TileGrid, useLang } from '../ui';

// A compact card for one job: service, place and status.
function JobRow({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const { t, rtl } = useLang();
  const icon = SERVICES.find((s) => s.id === job.service)?.icon ?? 'map-marker';
  return (
    <Card onPress={onOpen}>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
        <IconCircle name={icon} />
        <View style={{ flex: 1, gap: 4, alignItems: rtl ? 'flex-end' : 'flex-start' }}>
          <P>{serviceName(job, t)}</P>
          <P muted small>{[t(`gov.${job.location.governorate}`), job.location.village].filter(Boolean).join(' · ')}</P>
        </View>
        <Pill text={t(`stage.${job.stage}`)} tone={stageTone(job.stage)} />
      </View>
    </Card>
  );
}

export function Home({ role, name, coverUrl, jobs, verified, rating, onJobs, onOpenJob, onService, onNew, onBrowse, onNewPost, onEditProfile, onHistory, onVerify }: {
  role: Role; name: string; coverUrl?: string | null; jobs: Job[]; verified?: boolean; rating?: number;
  onJobs: () => void; onOpenJob: (id: string) => void; onService: (s: ServiceId) => void; onNew?: () => void; onBrowse: () => void;
  onNewPost?: () => void; onEditProfile?: () => void; onHistory: () => void; onVerify?: () => void;
}) {
  const { t, rtl } = useLang();
  const provider = role === 'provider';
  const active = jobs.filter((j) => !['done', 'cancelled'].includes(j.stage));
  const open = jobs.filter((j) => ['requested', 'quoted'].includes(j.stage) && !j.providerId);
  const mine = provider ? active.filter((j) => j.providerId) : active;
  const align = { textAlign: rtl ? 'right' : 'left' } as const;
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <ImageBackground source={{ uri: coverUrl ?? undefined }} imageStyle={{ borderRadius: 24 }}
        style={{ borderRadius: 24, overflow: 'hidden', backgroundColor: colors.primary, marginBottom: 16 }}>
        <View style={{ padding: 20, gap: 6, backgroundColor: coverUrl ? 'rgba(31,74,77,0.6)' : undefined }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', ...align }}>{`${t('hello')} ${name}`}</Text>
          <Text style={{ color: '#D6E6E3', fontSize: 13, lineHeight: 20, ...align }}>{provider ? t('homeProviderLine') : t('tagline')}</Text>
          {!provider && onNew && (
            <Pressable onPress={onNew} style={{ marginTop: 12, flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10,
              backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 13, paddingHorizontal: 14 }}>
              <MaterialCommunityIcons name="magnify" size={22} color={colors.primary} />
              <Text style={{ flex: 1, fontSize: 15, color: '#7B8786', ...align }}>{t('whatDoYouNeed')}</Text>
              <View style={{ backgroundColor: colors.accent, borderRadius: 10, padding: 6 }}>
                <MaterialCommunityIcons name={rtl ? 'arrow-left' : 'arrow-right'} size={18} color="#fff" />
              </View>
            </Pressable>
          )}
          {provider && (
            <View style={{ marginTop: 8 }}>
              <Pill text={verified ? t('verified') : t('unverified')} tone={verified ? 'primary' : 'accent'} icon={verified ? 'check-decagram' : 'alert-circle-outline'} />
            </View>
          )}
        </View>
      </ImageBackground>

      {provider ? (
        <>
          {!verified && onVerify && (
            <OptionRow icon="shield-alert-outline" tone="accent" title={t('needLicenseTitle')} subtitle={t('verifyLicenseHint')} onPress={onVerify} />
          )}
          <Stats items={[
            { value: String(open.length), label: t('newRequestsCount') },
            { value: String(mine.length), label: t('activeJobs') },
            { value: rating ? rating.toFixed(1) : '-', label: t('rating') },
          ]} />
          <TileGrid>
            <Tile icon="briefcase-search-outline" title={t('jobFeed')} subtitle={t('jobFeedHint')} onPress={onJobs} />
            {onNewPost && <Tile icon="bullhorn-outline" tone="accent" title={t('newPost')} subtitle={t('newPostHint')} onPress={onNewPost} />}
            {onEditProfile && <Tile icon="card-account-details-outline" title={t('myProfile')} subtitle={t('myProfileHint')} onPress={onEditProfile} />}
            <Tile icon="history" title={t('history')} subtitle={t('historyHint')} onPress={onHistory} />
          </TileGrid>
          {mine.length > 0 && (
            <>
              <SectionTitle title={t('activeJobs')} action={t('seeAll')} onAction={onJobs} />
              {mine.slice(0, 3).map((j) => <JobRow key={j.id} job={j} onOpen={() => onOpenJob(j.id)} />)}
            </>
          )}
        </>
      ) : (
        <>
          {mine.length > 0 && (
            <>
              <SectionTitle title={t('activeJobs')} action={t('seeAll')} onAction={onJobs} />
              {mine.slice(0, 2).map((j) => <JobRow key={j.id} job={j} onOpen={() => onOpenJob(j.id)} />)}
            </>
          )}
          <SectionTitle title={t('services')} />
          <TileGrid>
            {SERVICES.map((sv) => (
              <Tile key={sv.id} icon={sv.icon} tone={sv.id === 'other' ? 'accent' : 'primary'} title={t(`service.${sv.id}`)}
                subtitle={sv.id === 'other' ? t('otherHint') : `${t('from')} ${sv.baseJod[0]} ${t('jod')}`} onPress={() => onService(sv.id)} />
            ))}
          </TileGrid>
          <OptionRow icon="storefront-outline" tone="accent" title={t('browseServices')} subtitle={t('browseServicesHint')} onPress={onBrowse} />
        </>
      )}
      <View style={{ height: 12 }} />
    </ScrollView>
  );
}
