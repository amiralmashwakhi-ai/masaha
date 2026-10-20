import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GOVERNORATES, SERVICES } from '../services';
import { PlotLocation, ServiceId, ServiceRequest } from '../types';
import { Button, Card, colors, Field, H, IconCircle, OptionRow, P, useLang } from '../ui';

const emptyLocation: PlotLocation = {
  governorate: '', directorate: '', village: '', basin: '', plotNumber: '',
};

export function RequestWizard({ initialService, onDone, onCancel }: {
  initialService?: ServiceId; onDone: (r: ServiceRequest) => void; onCancel: () => void;
}) {
  const { t } = useLang();
  const [service, setService] = useState<ServiceId | null>(initialService ?? null);
  const [loc, setLoc] = useState<PlotLocation>(emptyLocation);
  const [area, setArea] = useState('');
  const [notes, setNotes] = useState('');
  const [visits, setVisits] = useState(1);
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
            subtitle={`${sv.baseJod[0]}–${sv.baseJod[1]} ${t('jod')}${sv.perVisit ? ` ${t('perVisit')}` : ''}`}
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
      {info.perVisit && (
        <Card>
          <P>{t('visits')}</P>
          <P muted small>{t('visitsHint')}</P>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 8 }}>
            <Pressable onPress={() => setVisits(Math.max(1, visits - 1))} hitSlop={8}><IconCircle name="minus" /></Pressable>
            <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink, minWidth: 36, textAlign: 'center' }}>{visits}</Text>
            <Pressable onPress={() => setVisits(Math.min(50, visits + 1))} hitSlop={8}><IconCircle name="plus" /></Pressable>
          </View>
        </Card>
      )}
      <Field label={t('notes')} value={notes} onChange={setNotes} />
      <Card>
        <P>{t('docsNeeded')}</P>
        {info.docs.map((d) => <P key={d} muted>{`• ${t(`doc.${d}`)}`}</P>)}
      </Card>
      <Card>
        <P>{`${t('estimate')}: ${info.baseJod[0] * (info.perVisit ? visits : 1)}–${info.baseJod[1] * (info.perVisit ? visits : 1)} ${t('jod')}`}</P>
        {info.perVisit && <P muted small>{`${info.baseJod[0]}–${info.baseJod[1]} ${t('jod')} ${t('perVisit')} × ${visits}`}</P>}
      </Card>
      <Button
        title={t('submit')}
        onPress={() =>
          onDone({
            id: String(Date.now()),
            service,
            location: { ...loc, areaM2: area ? Number(area) : undefined },
            notes,
            visits: info.perVisit ? visits : undefined,
            createdAt: new Date().toISOString(),
            stage: 'requested',
          })
        }
      />
      <Button title={t('back')} onPress={() => setService(null)} secondary />
    </ScrollView>
  );
}
