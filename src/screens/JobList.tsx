import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { fmt } from '../money';
import { GOVERNORATES, serviceName, SERVICES, stageTone } from '../services';
import { Job, JOB_STAGES, Role, ServiceId } from '../types';
import { BackButton, Button, Card, colors, H, IconCircle, Chips, matches, P, Pill, SearchWithFilters, useLang } from '../ui';

function Progress({ stage }: { stage: Job['stage'] }) {
  const { t, rtl } = useLang();
  const current = JOB_STAGES.indexOf(stage);
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 4 }}>
        {JOB_STAGES.map((st, i) => (
          <View key={st} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= current ? colors.primary : colors.line }} />
        ))}
      </View>
      {current >= 0 && (
        <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6, textAlign: rtl ? 'right' : 'left' }}>
          {`${t('step')} ${current + 1} ${t('of')} ${JOB_STAGES.length}`}
        </Text>
      )}
    </View>
  );
}

export function JobList({ role, jobs, onNew, onOpen, onBack }: {
  role: Role; jobs: Job[]; onNew?: () => void; onOpen: (id: string) => void; onBack: () => void;
}) {
  const { t, rtl } = useLang();
  const [query, setQuery] = useState('');
  const [service, setService] = useState<ServiceId | null>(null);
  const [gov, setGov] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | 'open' | 'active' | 'closed'>('all');
  const [sort, setSort] = useState<'new' | 'old'>('new');
  const offerLine = (j: Job) => {
    const won = j.quotes.find((q) => q.id === j.acceptedQuoteId);
    if (won) return `${fmt(won.priceJod)} ${t('jod')}`;
    return j.quotes.length ? `${j.quotes.length} ${t('offersCount')}` : t('waitingOffers');
  };
  const projectSize = (id: string) => jobs.filter((x) => x.projectId === id).length;
  const phase = (j: Job) => ['requested', 'quoted'].includes(j.stage) ? 'open' : ['done', 'cancelled'].includes(j.stage) ? 'closed' : 'active';
  const shown = jobs.filter((j) => (!service || j.service === service) && (!gov || j.location.governorate === gov)
    && (status === 'all' || phase(j) === status)
    && matches(query, serviceName(j, t), t(`gov.${j.location.governorate}`), j.location.directorate,
      j.location.village, j.location.basin, j.location.plotNumber, j.notes, t(`stage.${j.stage}`)))
    .sort((a, b) => sort === 'new' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt));
  return (
    <ScrollView>
      <H>{role === 'customer' ? t('myJobs') : t('jobFeed')}</H>
      {jobs.length > 0 && (
        <SearchWithFilters value={query} onChange={setQuery} placeholder={t('searchJobs')}
          active={[service, gov, status !== 'all' || null, sort !== 'new' || null].filter(Boolean).length}>
          <Chips label={t('service')} value={service} onChange={setService}
            options={[{ id: null, title: t('all') }, ...SERVICES.map((x) => ({ id: x.id, title: t(`service.${x.id}`) }))]} />
          <Chips label={t('governorate')} value={gov} onChange={setGov}
            options={[{ id: null, title: t('all') }, ...GOVERNORATES.map((g) => ({ id: g, title: t(`gov.${g}`) }))]} />
          <Chips label={t('status')} value={status} onChange={setStatus}
            options={(['all', 'open', 'active', 'closed'] as const).map((id) => ({ id, title: t(`phase.${id}`) }))} />
          <Chips label={t('sortBy')} value={sort} onChange={setSort}
            options={[{ id: 'new', title: t('sort.new') }, { id: 'old', title: t('sort.old') }]} />
        </SearchWithFilters>
      )}
      {jobs.length === 0 && (
        <Card>
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 12 }}>
            <IconCircle name={role === 'customer' ? 'clipboard-text-outline' : 'briefcase-search-outline'} size={60} tone="accent" />
            <P>{t('noJobs')}</P>
            {role === 'customer' && onNew && <Button title={t('newRequest')} icon="plus" onPress={onNew} />}
          </View>
        </Card>
      )}
      {jobs.length > 0 && shown.length === 0 && <P muted>{t('noResults')}</P>}
      {shown.map((j) => {
        const icon = SERVICES.find((s) => s.id === j.service)?.icon ?? 'map-marker';
        return (
          <Card key={j.id} onPress={() => onOpen(j.id)}>
            <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 12 }}>
              <IconCircle name={icon} size={44} />
              <View style={{ flex: 1, gap: 3 }}>
                <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}><P>{serviceName(j, t)}</P></View>
                  <Pill text={t(`stage.${j.stage}`)} tone={stageTone(j.stage)} />
                </View>
                <P muted small>
                  {[t(`gov.${j.location.governorate}`), j.location.village,
                    j.location.basin && `${t('basin')} ${j.location.basin}`,
                    j.location.plotNumber && `${t('plotNumber')} ${j.location.plotNumber}`,
                    j.visits && `${j.visits} ${t('visitsShort')}`]
                    .filter(Boolean).join(' · ')}
                </P>
                <P muted small>{offerLine(j)}</P>
                {!!j.projectId && projectSize(j.projectId) > 1 && (
                  <Pill icon="layers-outline" tone="accent" text={t('sameProject').replace('{n}', String(projectSize(j.projectId)))} />
                )}
              </View>
            </View>
            <Progress stage={j.stage} />
          </Card>
        );
      })}
      <BackButton onPress={onBack} />
    </ScrollView>
  );
}
