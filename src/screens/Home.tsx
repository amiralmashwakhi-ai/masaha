import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ImageBackground, Pressable, ScrollView, Text, View } from 'react-native';
import { serviceName, SERVICES, stageTone } from '../services';
import { nextStep } from '../nextStep';
import { Job, Role, ServiceId } from '../types';
import { Card, colors, IconCircle, OptionRow, P, Pill, SectionTitle, Stats, Tile, TileGrid, useLang } from '../ui';

// One job that needs this user now: what to do, on which job.
function TaskRow({ job, role, userId, canQuote, onOpen }: { job: Job; role: Role; userId: string; canQuote: boolean; onOpen: () => void }) {
  const { t, rtl } = useLang();
  const step = nextStep(job, role, userId, canQuote);
  return (
    <Pressable onPress={onOpen} style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, backgroundColor: colors.accentSoft,
      borderRadius: 18, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.accent }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accentInk, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={step.icon} size={25} color={colors.card} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: rtl ? 'right' : 'left' }}>{t(step.key)}</Text>
        <Text style={{ fontSize: 13, color: colors.muted, textAlign: rtl ? 'right' : 'left' }} numberOfLines={1}>
          {[serviceName(job, t), t(`gov.${job.location.governorate}`), job.location.village].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <MaterialCommunityIcons name={rtl ? 'chevron-left' : 'chevron-right'} size={26} color={colors.accentInk} />
    </Pressable>
  );
}

// Two big shortcuts to answers: common questions and how the app works.
function HelpCards({ onFaq, onGuide }: { onFaq: () => void; onGuide: () => void }) {
  const { t, rtl } = useLang();
  const card = (icon: 'help-circle-outline' | 'map-legend', title: string, sub: string, onPress: () => void, tone: 'primary' | 'accent') => (
    <Pressable onPress={onPress} style={{ flex: 1, borderRadius: 20, padding: 14, gap: 8, minHeight: 120,
      backgroundColor: tone === 'primary' ? colors.primary : colors.accent }}>
      <MaterialCommunityIcons name={icon} size={34} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', textAlign: rtl ? 'right' : 'left' }}>{title}</Text>
      <Text style={{ color: '#fff', opacity: 0.9, fontSize: 12, lineHeight: 18, textAlign: rtl ? 'right' : 'left' }} numberOfLines={2}>{sub}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 10, marginBottom: 14 }}>
      {card('help-circle-outline', t('faq'), t('faqShort'), onFaq, 'primary')}
      {card('map-legend', t('guide'), t('guideShort'), onGuide, 'accent')}
    </View>
  );
}

// A compact card for one job: service, place and status.
function JobRow({ job, role, userId, onOpen }: { job: Job; role: Role; userId: string; onOpen: () => void }) {
  const { t, rtl } = useLang();
  const step = nextStep(job, role, userId);
  const icon = SERVICES.find((s) => s.id === job.service)?.icon ?? 'map-marker';
  return (
    <Card onPress={onOpen}>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
        <IconCircle name={icon} />
        <View style={{ flex: 1, gap: 4, alignItems: rtl ? 'flex-end' : 'flex-start' }}>
          <P>{serviceName(job, t)}</P>
          <P muted small>{[t(`gov.${job.location.governorate}`), job.location.village].filter(Boolean).join(' · ')}</P>
          <Text style={{ fontSize: 13, fontWeight: '700', color: step.turn === 'you' ? colors.accentInk : colors.primary, textAlign: rtl ? 'right' : 'left' }}>
            {`${step.turn === 'you' ? '● ' : ''}${t(step.key)}`}
          </Text>
        </View>
        <Pill text={t(`stage.${job.stage}`)} tone={stageTone(job.stage)} />
      </View>
    </Card>
  );
}

export function Home({ role, userId, name, coverUrl, jobs, verified, rating, onFaq, onGuide, onJobs, onOpenJob, onService, onNew, onBrowse, onNewPost, onEditProfile, onHistory, onVerify }: {
  role: Role; userId: string; name: string; coverUrl?: string | null; jobs: Job[]; verified?: boolean; rating?: number;
  onFaq: () => void; onGuide: () => void;
  onJobs: () => void; onOpenJob: (id: string) => void; onService: (s: ServiceId) => void; onNew?: () => void; onBrowse: () => void;
  onNewPost?: () => void; onEditProfile?: () => void; onHistory: () => void; onVerify?: () => void;
}) {
  const { t, rtl } = useLang();
  const provider = role === 'provider';
  const active = jobs.filter((j) => !['done', 'cancelled'].includes(j.stage));
  const open = jobs.filter((j) => ['requested', 'quoted'].includes(j.stage) && !j.providerId);
  const mine = provider ? active.filter((j) => j.providerId) : active;
  const align = { textAlign: rtl ? 'right' : 'left' } as const;
  // Open requests a surveyor hasn't quoted on live in "New requests", not in their task list.
  const tasks = (provider ? mine : active).filter((j) => nextStep(j, role, userId, !!verified).turn === 'you');
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

      {tasks.length > 0 && (
        <>
          <SectionTitle title={`${t('yourTasks')} (${tasks.length})`} />
          {tasks.slice(0, 4).map((j) => <TaskRow key={j.id} job={j} role={role} userId={userId} canQuote={!!verified} onOpen={() => onOpenJob(j.id)} />)}
        </>
      )}
      <HelpCards onFaq={onFaq} onGuide={onGuide} />

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
              {mine.slice(0, 3).map((j) => <JobRow key={j.id} job={j} role={role} userId={userId} onOpen={() => onOpenJob(j.id)} />)}
            </>
          )}
        </>
      ) : (
        <>
          {mine.length > 0 && (
            <>
              <SectionTitle title={t('activeJobs')} action={t('seeAll')} onAction={onJobs} />
              {mine.slice(0, 2).map((j) => <JobRow key={j.id} job={j} role={role} userId={userId} onOpen={() => onOpenJob(j.id)} />)}
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
