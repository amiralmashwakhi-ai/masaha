import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import * as data from '../data';
import { Job, Role } from '../types';
import { Button, Card, colors, OptionRow, P, useLang } from '../ui';

const TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

// The provider's final outputs, officially signed and stamped. Required before delivery; the reference in a dispute.
export function Deliverables({ job, role, userId, since, onCount }: {
  job: Job; role: Role; userId: string; since?: string; onCount: (fresh: number) => void;
}) {
  const { t } = useLang();
  const [files, setFiles] = useState<data.JobFile[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => {
    data.listJobFiles(job.id).then((list) => {
      setFiles(list);
      onCount(list.filter((f) => !since || f.at > since).length);
    }).catch(() => setFiles([]));
  }, [job.id, since]);
  useEffect(load, [load]);

  const isProvider = role === 'provider' && job.providerId === userId;
  const canUpload = isProvider && ['drafting', 'submitted', 'disputed'].includes(job.stage);
  const relevant = ['drafting', 'submitted', 'disputed', 'done', 'cancelled'].includes(job.stage);
  if (!relevant && !files?.length) return null;

  return (
    <Card>
      <P title>{t('deliverables')}</P>
      <P muted small>{isProvider ? t('deliverablesHintProvider') : t('deliverablesHintCustomer')}</P>
      {files?.length === 0 && <P muted small>{t('noDeliverables')}</P>}
      {files?.map((f) => (
        <OptionRow key={f.id} icon={f.mime.startsWith('image/') ? 'file-image-outline' : 'file-pdf-box'}
          title={f.name} subtitle={f.at.slice(0, 16).replace('T', ' ')}
          onPress={f.url ? () => Linking.openURL(f.url!) : undefined} />
      ))}
      {canUpload && (
        <View style={{ borderTopWidth: 1, borderColor: colors.line, marginTop: 8, paddingTop: 8 }}>
          <OptionRow icon={confirmed ? 'checkbox-marked' : 'checkbox-blank-outline'} tone={confirmed ? 'primary' : 'accent'}
            title={t('confirmStamped')} onPress={() => setConfirmed(!confirmed)} />
          <Button title={t('uploadDeliverable')} icon="file-upload-outline" disabled={!confirmed || busy} onPress={async () => {
            const r = await DocumentPicker.getDocumentAsync({ type: TYPES, copyToCacheDirectory: true, multiple: true });
            if (r.canceled || !r.assets.length) return;
            setBusy(true); setMsg(t('uploading'));
            try {
              for (const a of r.assets) await data.uploadDeliverable(job.id, userId, a.uri, a.name, a.mimeType ?? 'application/pdf');
              setMsg(''); setConfirmed(false);
            } catch { setMsg(t('uploadFailed')); } finally { setBusy(false); load(); }
          }} />
        </View>
      )}
      {!!msg && <P small>{msg}</P>}
    </Card>
  );
}
