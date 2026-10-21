import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import * as data from '../data';
import { Job, Role } from '../types';
import { BackButton, Button, Card, colors, Field, H, IconCircle, IconName, OptionRow, P, useLang } from '../ui';

// Report (and optionally block) a person, post or chat. Collapsed to one small link until used.
export function ReportBlock({ reporterId, userId, postId, chatId, canBlock, onBlocked }: {
  reporterId: string; userId?: string; postId?: string; chatId?: string; canBlock?: boolean; onBlocked?: () => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  if (msg) return <P muted small>{msg}</P>;
  if (!open) return <Button title={t('reportOrBlock')} icon="flag-outline" secondary onPress={() => setOpen(true)} />;
  return (
    <View style={{ marginTop: 6 }}>
      <Field label={t('reportReason')} value={reason} onChange={setReason} multiline />
      <Button title={t('sendReport')} icon="flag" disabled={!reason.trim()} onPress={async () => {
        try { await data.report(reporterId, { userId, postId, chatId }, reason); setMsg(t('reportSent')); } catch { setMsg(t('somethingWrong')); }
      }} />
      {canBlock && userId && (
        <Button title={t('blockUser')} icon="cancel" secondary onPress={async () => {
          try { await data.block(reporterId, userId); setMsg(t('blocked')); onBlocked?.(); } catch { setMsg(t('somethingWrong')); }
        }} />
      )}
      <Button title={t('cancel')} secondary onPress={() => setOpen(false)} />
    </View>
  );
}

const NOTE_ICON: Record<string, IconName> = {
  newJob: 'briefcase-plus-outline', directRequest: 'account-arrow-right-outline', newQuote: 'cash-multiple', jobUpdate: 'progress-check',
  chatRequest: 'chat-question-outline', chatAccepted: 'chat-processing-outline', chatMessage: 'chat-outline',
  verified: 'check-decagram', rejected: 'alert-circle-outline', licensePending: 'card-account-details-outline',
};

// Masaha's operator tools live on the website, not in the app.
const ADMIN_URL = 'https://masaha-kappa.vercel.app/admin.html';

export function Notifications({ onOpenJob, onBack }: { onOpenJob: (id: string) => void; onBack: () => void }) {
  const { t } = useLang();
  const [items, setItems] = useState<data.AppNotification[] | null>(null);
  useEffect(() => {
    data.listNotifications().then((list) => { setItems(list); data.markAllRead(); }).catch(() => setItems([]));
  }, []);
  return (
    <ScrollView>
      <H>{t('notifications')}</H>
      {items === null && <P muted>{t('loading')}</P>}
      {items?.length === 0 && <P muted>{t('noNotifications')}</P>}
      {items?.map((n) => (
        <OptionRow key={n.id} icon={NOTE_ICON[n.kind] ?? 'bell-outline'} tone={n.read ? 'primary' : 'accent'}
          title={t(`note.${n.kind}`)}
          subtitle={[n.service && t(`service.${n.service}`), n.at.slice(0, 16).replace('T', ' ')].filter(Boolean).join(' · ')}
          onPress={n.jobId ? () => onOpenJob(n.jobId!) : n.kind === 'licensePending' ? () => Linking.openURL(ADMIN_URL) : undefined} />
      ))}
      <BackButton onPress={onBack} />
    </ScrollView>
  );
}

// Cancel (before payment) or dispute (after payment) a job.
export function JobSafety({ job, role, onDone, onDeleted }: { job: Job; role: Role; onDone: () => void; onDeleted: () => void }) {
  const { t } = useLang();
  const [mode, setMode] = useState<'none' | 'cancel' | 'dispute' | 'delete'>('none');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const canCancel = role === 'customer' && ['requested', 'quoted', 'agreed'].includes(job.stage);
  const canDispute = ['visitScheduled', 'fieldWork', 'drafting', 'submitted'].includes(job.stage);
  const canDelete = role === 'customer' && ['requested', 'quoted', 'cancelled'].includes(job.stage);
  const act = async (fn: () => Promise<unknown>) => {
    try { await fn(); setMode('none'); onDone(); } catch { setErr(t('somethingWrong')); }
  };
  if (job.stage === 'disputed') return <DisputeCard job={job} role={role} onDone={onDone} />;
  if (!canCancel && !canDispute && !canDelete) return null;
  return (
    <Card>
      {mode === 'none' && canCancel && <Button title={t('cancelRequest')} icon="close-circle-outline" secondary onPress={() => setMode('cancel')} />}
      {mode === 'none' && canDelete && <Button title={t('deleteRequest')} icon="delete-outline" secondary onPress={() => setMode('delete')} />}
      {mode === 'delete' && (
        <>
          <P>{t('deleteRequestConfirm')}</P>
          <Button title={t('yesDelete')} onPress={async () => {
            try { await data.deleteJob(job.id); onDeleted(); } catch { setErr(t('somethingWrong')); }
          }} />
          <Button title={t('back')} secondary onPress={() => setMode('none')} />
        </>
      )}
      {mode === 'none' && canDispute && <Button title={t('openDispute')} icon="scale-balance" secondary onPress={() => setMode('dispute')} />}
      {mode === 'cancel' && (
        <>
          <P>{t('cancelConfirm')}</P>
          <Button title={t('yesCancel')} onPress={() => act(() => data.cancelJob(job.id))} />
          <Button title={t('back')} secondary onPress={() => setMode('none')} />
        </>
      )}
      {mode === 'dispute' && (
        <>
          <P muted small>{t('disputeHint')}</P>
          <Field label={t('disputeReason')} value={reason} onChange={setReason} multiline />
          <Button title={t('sendDispute')} disabled={!reason.trim()} onPress={() => act(() => data.openDispute(job.id, reason))} />
          <Button title={t('back')} secondary onPress={() => setMode('none')} />
        </>
      )}
      {!!err && <P small>{err}</P>}
    </Card>
  );
}

// While a dispute is open: the chat is open for both sides, and either can agree to end it amicably.
function DisputeCard({ job, role, onDone }: { job: Job; role: Role; onDone: () => void }) {
  const { t } = useLang();
  const [d, setD] = useState<Awaited<ReturnType<typeof data.openDisputeOf>>>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { data.openDisputeOf(job.id).then(setD).catch(() => {}); }, [job.id]);
  useEffect(load, [load]);
  const mine = role === 'customer' ? d?.customer : d?.provider;
  const theirs = role === 'customer' ? d?.provider : d?.customer;
  return (
    <Card>
      <P title>{t('disputeOpen')}</P>
      <P muted small>{t('disputeTalkHint')}</P>
      {theirs && !mine && <P>{t('otherSideSettles')}</P>}
      {mine
        ? <P muted small>{t('waitingOtherSide')}</P>
        : <Button title={t('settleAmicably')} icon="handshake-outline" onPress={async () => {
            try { await data.settleDispute(job.id); load(); onDone(); } catch { setErr(t('somethingWrong')); }
          }} />}
      <P muted small>{t('disputeOpenHint')}</P>
      {!!err && <P small>{err}</P>}
    </Card>
  );
}

const DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

// Shown instead of provider tools until Masaha has verified the office's licence.
export function NeedLicense({ onSettings }: { onSettings: () => void }) {
  const { t } = useLang();
  return (
    <Card>
      <View style={{ alignItems: 'center', marginBottom: 6 }}><IconCircle name="shield-alert-outline" size={52} /></View>
      <P>{t('needLicenseTitle')}</P>
      <P muted small>{t('needLicenseBody')}</P>
      <Button title={t('verifyLicense')} icon="file-upload-outline" onPress={onSettings} />
    </Card>
  );
}

// Provider uploads their licence; Ameer's office reviews it before the "verified" badge appears.
export function LicenseCard({ userId }: { userId: string }) {
  const { t } = useLang();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof data.verificationStatus>> | null>(null);
  const [licenseNo, setLicenseNo] = useState('');
  const [ownerId, setOwnerId] = useState<data.PickedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { data.verificationStatus(userId).then(setStatus); }, [userId]);
  if (!status) return null;
  return (
    <Card>
      <P title>{t('licenseTitle')}</P>
      <P muted small>{t(`license.${status}`)}</P>
      {(status === 'none' || status === 'rejected') && (
        <>
          <Field label={t('licenseNo')} value={licenseNo} onChange={setLicenseNo} />
          <P small>{t('ownerIdTitle')}</P>
          <P muted small>{t('ownerIdHint')}</P>
          <Button title={ownerId ? `${t('ownerIdChosen')}: ${ownerId.name}` : t('uploadOwnerId')} icon={ownerId ? 'check-circle' : 'card-account-details-outline'} secondary disabled={busy} onPress={async () => {
            const r = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, copyToCacheDirectory: true });
            if (r.canceled || !r.assets[0]) return;
            const a = r.assets[0];
            setOwnerId({ uri: a.uri, name: a.name, mime: a.mimeType ?? 'application/pdf' });
          }} />
          <Button title={t('uploadLicense')} icon="file-upload-outline" disabled={busy || !licenseNo.trim() || !ownerId} onPress={async () => {
            const r = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, copyToCacheDirectory: true });
            if (r.canceled || !r.assets[0]) return;
            setBusy(true); setMsg(t('uploading'));
            try {
              const a = r.assets[0];
              await data.submitLicense(userId, { uri: a.uri, name: a.name, mime: a.mimeType ?? 'application/pdf' }, ownerId!, licenseNo);
              setStatus('pending'); setMsg('');
            } catch (e) { setMsg(data.isLicenseTaken(e) ? t('licenseTaken') : t('uploadFailed')); } finally { setBusy(false); }
          }} />
        </>
      )}
      {!!msg && <P small>{msg}</P>}
    </Card>
  );
}

export function DeleteAccountCard() {
  const { t } = useLang();
  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState('');
  return (
    <Card>
      <P title>{t('deleteAccount')}</P>
      <P muted small>{t('deleteAccountHint')}</P>
      {step === 0 && <Button title={t('deleteAccount')} icon="account-remove-outline" secondary onPress={() => setStep(1)} />}
      {step === 1 && (
        <>
          <P>{t('deleteConfirm')}</P>
          <Button title={t('yesDelete')} onPress={async () => {
            const r = await data.deleteMyAccount();
            setMsg(r === 'activeJobs' ? t('deleteActiveJobs') : r === 'error' ? t('somethingWrong') : '');
            setStep(0);
          }} />
          <Button title={t('back')} secondary onPress={() => setStep(0)} />
        </>
      )}
      {!!msg && <P small>{msg}</P>}
    </Card>
  );
}

