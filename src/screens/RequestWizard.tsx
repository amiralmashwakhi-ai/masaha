import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { GOVERNORATES, SERVICES } from '../services';
import { PlotLocation, ServiceId, ServiceRequest } from '../types';
import { Button, Card, Field, H, IconCircle, OptionRow, P, useLang } from '../ui';

const emptyLocation: PlotLocation = {
  governorate: '', directorate: '', village: '', basin: '', plotNumber: '',
};

export function RequestWizard({ onDone, onCancel }: {
  onDone: (r: ServiceRequest) => void; onCancel: () => void;
}) {
  const { t } = useLang();
  const [service, setService] = useState<ServiceId | null>(null);
  const [loc, setLoc] = useState<PlotLocation>(emptyLocation);
  const [area, setArea] = useState('');
  const [notes, setNotes] = useState('');
  const set = (k: keyof PlotLocation) => (v: string) => setLoc({ ...loc, [k]: v });

  const info = SERVICES.find((x) => x.id === service);
  if (!service || !info) {
    return (
      <ScrollView>
        <H>{t('services')}</H>
        {SERVICES.map((sv) => (
          <OptionRow
            key={sv.id}
            icon={sv.icon}
            title={t(`service.${sv.id}`)}
            subtitle={`${sv.baseJod[0]}–${sv.baseJod[1]} ${t('jod')}`}
            onPress={() => setService(sv.id)}
          />
        ))}
        <Button title={t('back')} onPress={onCancel} secondary />
      </ScrollView>
    );
  }

  return (
    <ScrollView>
      <View style={{ alignItems: 'center', marginBottom: 6 }}><IconCircle name={info.icon} size={56} /></View>
      <H>{t(`service.${service}`)}</H>
      <P muted>{t('location')}</P>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
        {GOVERNORATES.map((g) => (
          <Button
            key={g}
            title={t(`gov.${g}`)}
            onPress={() => set('governorate')(g)}
            secondary={loc.governorate !== g}
          />
        ))}
      </View>
      <Field label={t('directorate')} value={loc.directorate} onChange={set('directorate')} />
      <Field label={t('village')} value={loc.village} onChange={set('village')} />
      <Field label={t('basin')} value={loc.basin} onChange={set('basin')} numeric />
      <Field label={t('plotNumber')} value={loc.plotNumber} onChange={set('plotNumber')} numeric />
      <Field label={t('area')} value={area} onChange={setArea} numeric />
      <Field label={t('notes')} value={notes} onChange={setNotes} />
      <Card>
        <P>{t('docsNeeded')}</P>
        {info.docs.map((d) => <P key={d} muted>{`• ${t(`doc.${d}`)}`}</P>)}
      </Card>
      <Card>
        <P>{`${t('estimate')}: ${info.baseJod[0]}–${info.baseJod[1]} ${t('jod')}`}</P>
      </Card>
      <Button
        title={t('submit')}
        onPress={() =>
          onDone({
            id: String(Date.now()),
            service,
            location: { ...loc, areaM2: area ? Number(area) : undefined },
            notes,
            createdAt: new Date().toISOString(),
            stage: 'requested',
          })
        }
      />
      <Button title={t('back')} onPress={() => setService(null)} secondary />
    </ScrollView>
  );
}
