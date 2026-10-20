import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SERVICES } from '../services';
import { Job, JOB_STAGES, Role } from '../types';
import { Button, Card, colors, H, IconCircle, P, useLang } from '../ui';

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
      <Text style={{ fontSize: 12, color: colors.primary, marginTop: 6, textAlign: rtl ? 'right' : 'left' }}>
        {`${current + 1}/${JOB_STAGES.length} · ${t(`stage.${stage}`)}`}
      </Text>
    </View>
  );
}

export function JobList({ role, jobs, onNew, onOpen, onBack }: {
  role: Role; jobs: Job[]; onNew?: () => void; onOpen: (id: string) => void; onBack: () => void;
}) {
  const { t, rtl } = useLang();
  return (
    <ScrollView>
      <H>{role === 'customer' ? t('myJobs') : t('jobFeed')}</H>
      {role === 'customer' && onNew && <Button title={t('newRequest')} icon="plus" onPress={onNew} />}
      {jobs.length === 0 && <P muted>{t('noJobs')}</P>}
      {jobs.map((j) => {
        const icon = SERVICES.find((s) => s.id === j.service)?.icon ?? 'map-marker';
        return (
          <Card key={j.id} onPress={() => onOpen(j.id)}>
            <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
              <IconCircle name={icon} />
              <View style={{ flex: 1 }}>
                <P>{t(`service.${j.service}`)}</P>
                <P muted small>
                  {[t(`gov.${j.location.governorate}`), j.location.village,
                    j.location.basin && `${t('basin')} ${j.location.basin}`,
                    j.location.plotNumber && `${t('plotNumber')} ${j.location.plotNumber}`,
                    j.visits && `${j.visits} ${t('visitsShort')}`]
                    .filter(Boolean).join(' · ')}
                </P>
              </View>
            </View>
            <Progress stage={j.stage} />
          </Card>
        );
      })}
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}
