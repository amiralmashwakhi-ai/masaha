import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import * as data from '../data';
import { Job, Role } from '../types';
import { Button, Card, colors, Field, H, IconCircle, IconName, OptionRow, P, useLang } from '../ui';

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
  verified: 'check-decagram', rejected: 'alert-circle-outline',
};

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
          onPress={n.jobId ? () => onOpenJob(n.jobId!) : undefined} />
      ))}
      <Button title={t('back')} onPress={onBack} secondary />
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
      <P>{t('disputeOpen')}</P>
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

// Provider uploads their licence; Ameer's office reviews it before the "verified" badge appears.
export function LicenseCard({ userId }: { userId: string }) {
  const { t } = useLang();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof data.verificationStatus>> | null>(null);
  const [licenseNo, setLicenseNo] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { data.verificationStatus(userId).then(setStatus); }, [userId]);
  if (!status) return null;
  return (
    <Card>
      <P>{t('licenseTitle')}</P>
      <P muted small>{t(`license.${status}`)}</P>
      {(status === 'none' || status === 'rejected') && (
        <>
          <Field label={t('licenseNo')} value={licenseNo} onChange={setLicenseNo} />
          <Button title={t('uploadLicense')} icon="file-upload-outline" disabled={busy} onPress={async () => {
            const r = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, copyToCacheDirectory: true });
            if (r.canceled || !r.assets[0]) return;
            setBusy(true); setMsg(t('uploading'));
            try {
              const a = r.assets[0];
              await data.submitLicense(userId, a.uri, a.name, a.mimeType ?? 'application/pdf', licenseNo);
              setStatus('pending'); setMsg('');
            } catch { setMsg(t('uploadFailed')); } finally { setBusy(false); }
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
      <P>{t('deleteAccount')}</P>
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

// Ameer's office: review licences, reports and disputes.
export function OperatorPanel({ onOpenJob, onBack }: { onOpenJob: (id: string) => void; onBack: () => void }) {
  const { t } = useLang();
  const [tab, setTab] = useState<'licenses' | 'reports' | 'disputes'>('licenses');
  const [providers, setProviders] = useState<data.PendingProvider[]>([]);
  const [reports, setReports] = useState<data.OpenReport[]>([]);
  const [disputes, setDisputes] = useState<data.OpenDispute[]>([]);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const load = useCallback(() => {
    Promise.all([data.pendingProviders(), data.openReports(), data.openDisputes()])
      .then(([p, r, d]) => { setProviders(p); setReports(r); setDisputes(d); setErr(''); })
      .catch(() => setErr(t('somethingWrong')));
  }, []);
  useEffect(load, [load]);
  const act = (fn: () => Promise<unknown>) => async () => { try { await fn(); } catch { setErr(t('somethingWrong')); } load(); };
  const tabs: { key: typeof tab; icon: IconName; count: number }[] = [
    { key: 'licenses', icon: 'card-account-details-outline', count: providers.length },
    { key: 'reports', icon: 'flag-outline', count: reports.length },
    { key: 'disputes', icon: 'scale-balance', count: disputes.length },
  ];
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <H>{t('operatorPanel')}</H>
      {tabs.map((x) => (
        <OptionRow key={x.key} icon={x.icon} tone={tab === x.key ? 'accent' : 'primary'}
          title={`${t(`op.${x.key}`)} (${x.count})`} onPress={() => setTab(x.key)} />
      ))}
      {!!err && <P small>{err}</P>}
      {tab === 'licenses' && providers.map((p) => (
        <Card key={p.id}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <IconCircle name="account-hard-hat" />
            <View style={{ flex: 1 }}><P>{p.name}</P><P muted small>{[t(p.kind), p.licenseNo].filter(Boolean).join(' · ')}</P></View>
          </View>
          {p.docUrl && <Button title={t('viewLicense')} icon="file-eye-outline" secondary onPress={() => Linking.openURL(p.docUrl!)} />}
          <Button title={t('approve')} icon="check" onPress={act(() => data.reviewProvider(p.id, true))} />
          <Button title={t('reject')} secondary onPress={act(() => data.reviewProvider(p.id, false))} />
        </Card>
      ))}
      {tab === 'reports' && reports.map((r) => (
        <Card key={r.id}>
          <P>{r.reason}</P>
          <P muted small>{[r.targetName, r.postId ? t('op.aboutPost') : r.chatId ? t('op.aboutChat') : '', r.at.slice(0, 10)].filter(Boolean).join(' · ')}</P>
          {r.postId && <Button title={t('op.hidePostClose')} onPress={act(() => data.closeReport(r.id, true))} />}
          <Button title={t('op.close')} secondary onPress={act(() => data.closeReport(r.id, false))} />
        </Card>
      ))}
      {tab === 'disputes' && disputes.map((d) => (
        <Card key={d.id}>
          <P>{d.service ? t(`service.${d.service}`) : ''}</P>
          <P muted small>{`${d.at.slice(0, 10)} · ${d.reason}`}</P>
          <Button title={t('op.openJob')} secondary onPress={() => onOpenJob(d.jobId)} />
          <P muted small>{t('op.checkFiles')}</P>
          <Field label={t('op.note')} value={note} onChange={setNote} multiline />
          <P muted small>{t('op.correctionHint')}</P>
          <Button title={t('op.correction')} icon="wrench-outline" disabled={!note.trim()} onPress={act(() => data.requestCorrection(d.id, note))} />
          <Button title={t('op.refund')} onPress={act(() => data.resolveDispute(d.id, true, note))} />
          <Button title={t('op.release')} secondary onPress={act(() => data.resolveDispute(d.id, false, note))} />
        </Card>
      ))}
      <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }} />
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}
