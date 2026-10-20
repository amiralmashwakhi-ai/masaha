import React from 'react';
import { ScrollView, View } from 'react-native';
import { Job, JOB_STAGES, Role, ServiceRequest } from '../types';
import { Button, Card, H, P, useLang } from '../ui';

function Tracker({ stage }: { stage: ServiceRequest['stage'] }) {
  const { t } = useLang();
  const current = JOB_STAGES.indexOf(stage);
  return (
    <View style={{ marginTop: 8 }}>
      {JOB_STAGES.map((st, i) => (
        <P key={st} muted={i > current}>
          {`${i <= current ? '●' : '○'} ${t(`stage.${st}`)}`}
        </P>
      ))}
    </View>
  );
}

export function JobList({ role, jobs, onNew, onOpen, onBack }: {
  role: Role; jobs: Job[]; onNew?: () => void; onOpen: (id: string) => void; onBack: () => void;
}) {
  const { t } = useLang();
  return (
    <ScrollView>
      <H>{role === 'customer' ? t('myJobs') : t('jobFeed')}</H>
      {role === 'customer' && onNew && <Button title={t('newRequest')} onPress={onNew} />}
      {jobs.length === 0 && <P muted>{t('noJobs')}</P>}
      {jobs.map((j) => (
        <Card key={j.id} onPress={() => onOpen(j.id)}>
          <P>{t(`service.${j.service}`)}</P>
          <P muted>
            {[t(`gov.${j.location.governorate}`), j.location.village,
              `${t('basin')} ${j.location.basin}`, `${t('plotNumber')} ${j.location.plotNumber}`]
              .filter(Boolean).join(' · ')}
          </P>
          {role === 'customer' && <Tracker stage={j.stage} />}
          <Button title={role === 'customer' ? t('open') : t('sendQuote')} onPress={() => onOpen(j.id)} secondary />
        </Card>
      ))}
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}
