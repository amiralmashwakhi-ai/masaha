import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GOVERNORATES, SERVICES, VISIT_LENGTHS } from '../services';
import { PlotLocation, ServiceId, ServiceRequest, VisitLength } from '../types';
import { BackButton, Button, Card, colors, Field, H, IconCircle, OptionRow, P, Pill, Tile, TileGrid, useLang } from '../ui';

const emptyLocation: PlotLocation = {
  governorate: '', directorate: '', village: '', basin: '', plotNumber: '',
};

interface Visit { visits: number; length: VisitLength; withReport: boolean }
const defaultVisit: Visit = { visits: 1, length: 'upTo4h', withReport: true };

// One request can cover several services for the same plot; each becomes its own job.
export function RequestWizard({ initialService, invited, onDone, onCancel }: {
  initialService?: ServiceId; invited?: { id: string; name: string }; onDone: (rs: ServiceRequest[]) => void; onCancel: () => void;
}) {
  const { t } = useLang();
  const [picked, setPicked] = useState<ServiceId[]>(initialService ? [initialService] : []);
  const [picking, setPicking] = useState(!initialService);
  const [loc, setLoc] = useState<PlotLocation>(emptyLocation);
  const [area, setArea] = useState('');
  const [notes, setNotes] = useState('');
  const [visit, setVisit] = useState<Partial<Record<ServiceId, Visit>>>({});
  const [custom, setCustom] = useState('');
  const set = (k: keyof PlotLocation) => (v: string) => setLoc({ ...loc, [k]: v });
  const toggle = (id: ServiceId) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  const vOf = (id: ServiceId) => visit[id] ?? defaultVisit;
  const setV = (id: ServiceId, v: Partial<Visit>) => setVisit({ ...visit, [id]: { ...vOf(id), ...v } });

  const infos = SERVICES.filter((x) => picked.includes(x.id));
  if (picking || !infos.length) {
    return (
      <ScrollView>
        <H>{t('services')}</H>
        {invited && <Card><P>{t('directTo').replace('{n}', invited.name)}</P><P muted small>{t('directHint')}</P></Card>}
        <P muted small>{t('pickServices')}</P>
        <View style={{ height: 10 }} />
        <TileGrid>
          {SERVICES.map((sv) => (
            <Tile
              key={sv.id}
              icon={sv.icon}
              tone={sv.id === 'other' ? 'accent' : 'primary'}
              selected={picked.includes(sv.id)}
              title={t(`service.${sv.id}`)}
              subtitle={sv.id === 'other' ? t('otherHint') : `${sv.baseJod[0]}–${sv.baseJod[1]} ${t('jod')}${sv.perVisit ? ` ${t('perVisit')}` : ''}`}
              onPress={() => toggle(sv.id)}
            />
          ))}
        </TileGrid>
        <Button
          title={picked.length > 1 ? t('nextWithCount').replace('{n}', String(picked.length)) : t('next')}
          disabled={!picked.length}
          onPress={() => setPicking(false)}
        />
        <BackButton onPress={onCancel} />
      </ScrollView>
    );
  }

  const rangeOf = (id: ServiceId) => {
    const info = SERVICES.find((x) => x.id === id)!;
    const r = info.perVisit ? VISIT_LENGTHS.find((l) => l.id === vOf(id).length)!.baseJod : info.baseJod;
    const n = info.perVisit ? vOf(id).visits : 1;
    return [r[0] * n, r[1] * n];
  };
  const priced = infos.filter((x) => x.id !== 'other');
  const total = priced.reduce((a, x) => [a[0] + rangeOf(x.id)[0], a[1] + rangeOf(x.id)[1]], [0, 0]);
  const docs = [...new Set(infos.flatMap((x) => x.docs))];
  const several = infos.length > 1;
  return (
    <ScrollView>
      {several ? (
        <>
          <H>{t('projectRequest')}</H>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
            {infos.map((x) => <Pill key={x.id} icon={x.icon} text={t(`service.${x.id}`)} />)}
          </View>
          <P muted small>{t('projectHint')}</P>
        </>
      ) : (
        <>
          <View style={{ alignItems: 'center', marginBottom: 6 }}><IconCircle name={infos[0].icon} size={56} /></View>
          <H>{t(`service.${infos[0].id}`)}</H>
        </>
      )}
      <Button title={t('addAnotherService')} icon="plus" secondary onPress={() => setPicking(true)} />
      {invited && <P muted>{t('directTo').replace('{n}', invited.name)}</P>}
      {picked.includes('other') && <Field label={t('otherName')} value={custom} onChange={setCustom} />}
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
      {infos.filter((x) => x.perVisit).map((info) => {
        const v = vOf(info.id);
        return (
          <Card key={info.id}>
            {several && <P>{t(`service.${info.id}`)}</P>}
            <P>{t('visits')}</P>
            <P muted small>{t('visitsHint')}</P>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 8 }}>
              <Pressable onPress={() => setV(info.id, { visits: Math.max(1, v.visits - 1) })} hitSlop={8}><IconCircle name="minus" /></Pressable>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink, minWidth: 36, textAlign: 'center' }}>{v.visits}</Text>
              <Pressable onPress={() => setV(info.id, { visits: Math.min(50, v.visits + 1) })} hitSlop={8}><IconCircle name="plus" /></Pressable>
            </View>
            <View style={{ marginTop: 10 }}>
              <P>{t('visitLength')}</P>
              {VISIT_LENGTHS.map((l) => (
                <OptionRow key={l.id} icon={v.length === l.id ? 'check-circle' : 'clock-outline'} tone={v.length === l.id ? 'primary' : 'accent'}
                  title={t(`len.${l.id}`)} subtitle={`${l.baseJod[0]}–${l.baseJod[1]} ${t('jod')} ${t('perVisit')}`} onPress={() => setV(info.id, { length: l.id })} />
              ))}
            </View>
            <View style={{ marginTop: 10 }}>
              <P>{t('reportQ')}</P>
              {[true, false].map((r) => (
                <OptionRow key={String(r)} icon={v.withReport === r ? 'check-circle' : r ? 'file-document-outline' : 'file-hidden'}
                  tone={v.withReport === r ? 'primary' : 'accent'} title={r ? t('withReport') : t('withoutReport')}
                  subtitle={r ? t('withReportHint') : undefined} onPress={() => setV(info.id, { withReport: r })} />
              ))}
            </View>
          </Card>
        );
      })}
      <Field label={t('notes')} value={notes} onChange={setNotes} />
      <Card>
        <P title>{t('docsNeeded')}</P>
        {docs.map((d) => <P key={d} muted>{`• ${t(`doc.${d}`)}`}</P>)}
      </Card>
      <Card>
        {several && priced.map((x) => (
          <P key={x.id} muted small>{`${t(`service.${x.id}`)}: ${rangeOf(x.id)[0]}–${rangeOf(x.id)[1]} ${t('jod')}`}</P>
        ))}
        {priced.length > 0 && <P>{`${several ? t('estimateTotal') : t('estimate')}: ${total[0]}–${total[1]} ${t('jod')}`}</P>}
        {picked.includes('other') && <P muted={priced.length > 0} small={priced.length > 0}>{t('otherPrice')}</P>}
        <P muted small>{t('feesNote')}</P>
        {several && <P muted small>{t('projectSeparate')}</P>}
      </Card>
      <Button
        title={several ? t('submitCount').replace('{n}', String(infos.length)) : t('submit')}
        disabled={picked.includes('other') && !custom.trim()}
        onPress={() => {
          const projectId = several ? newId() : undefined;
          onDone(infos.map((info) => ({
            id: String(Date.now()),
            service: info.id,
            location: { ...loc, areaM2: area ? Number(area) : undefined },
            notes,
            visits: info.perVisit ? vOf(info.id).visits : undefined,
            visitLength: info.perVisit ? vOf(info.id).length : undefined,
            withReport: info.perVisit ? vOf(info.id).withReport : undefined,
            customService: info.id === 'other' ? custom.trim() : undefined,
            invitedProviderId: invited?.id,
            projectId,
            createdAt: new Date().toISOString(),
            stage: 'requested',
          })));
        }}
      />
      <BackButton onPress={() => setPicking(true)} />
    </ScrollView>
  );
}

// RFC 4122 v4 from Math.random; only used to group a customer's own requests.
function newId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });
}
