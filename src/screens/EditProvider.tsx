import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { GOVERNORATES, SERVICES } from '../services';
import { Provider, ServiceId } from '../types';
import { Button, Card, Field, H, P, useLang } from '../ui';

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export function EditProvider({ provider, onSave, onBack }: {
  provider: Provider; onSave: (p: Provider) => Promise<void>; onBack: () => void;
}) {
  const { t } = useLang();
  const [name, setName] = useState(provider.name);
  const [kind, setKind] = useState(provider.kind);
  const [license, setLicense] = useState(provider.licenseNo ?? '');
  const [years, setYears] = useState(String(provider.experienceYears || ''));
  const [education, setEducation] = useState(provider.cv.education);
  const [experience, setExperience] = useState(provider.cv.experience.join('\n'));
  const [equipment, setEquipment] = useState(provider.cv.equipment.join('\n'));
  const [services, setServices] = useState<ServiceId[]>(provider.services);
  const [govs, setGovs] = useState<string[]>(provider.governorates);
  const [status, setStatus] = useState('');
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <ScrollView>
      <H>{t('myProfile')}</H>
      <Field label={t('displayName')} value={name} onChange={setName} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title={t('individual')} onPress={() => setKind('individual')} secondary={kind !== 'individual'} /></View>
        <View style={{ flex: 1 }}><Button title={t('office')} onPress={() => setKind('office')} secondary={kind !== 'office'} /></View>
      </View>
      <Field label={t('licenseNo')} value={license} onChange={setLicense} />
      <Field label={t('experienceYears')} value={years} onChange={setYears} numeric />
      <Field label={t('education')} value={education} onChange={setEducation} />
      <Field label={t('experienceLines')} value={experience} onChange={setExperience} multiline />
      <Field label={t('equipmentLines')} value={equipment} onChange={setEquipment} multiline />
      <Card>
        <P>{t('servicesOffered')}</P>
        {SERVICES.filter((sv) => sv.id !== 'other').map((sv) => (
          <Button key={sv.id} title={t(`service.${sv.id}`)} onPress={() => setServices(toggle(services, sv.id))} secondary={!services.includes(sv.id)} />
        ))}
      </Card>
      <Card>
        <P>{t('areasServed')}</P>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {GOVERNORATES.map((g) => (
            <Button key={g} title={t(`gov.${g}`)} onPress={() => setGovs(toggle(govs, g))} secondary={!govs.includes(g)} />
          ))}
        </View>
      </Card>
      <Button
        title={t('save')}
        onPress={async () => {
          try {
            await onSave({
              ...provider, name: name.trim() || provider.name, kind, licenseNo: license.trim() || undefined,
              experienceYears: Number(years) || 0,
              cv: { education: education.trim(), experience: lines(experience), equipment: lines(equipment) },
              services, governorates: govs,
            });
            setStatus(t('saved'));
          } catch {
            setStatus(t('somethingWrong'));
          }
        }}
      />
      {!!status && <P muted>{status}</P>}
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}
