import { JobEvent, JOB_STAGES } from './types';

type T = (key: string) => string;

// Older log lines carry amounts like "250.000"; show them as "250".
const tidy = (s: string) => s.replace(/(\d+)\.(\d*?)0+(?!\d)/g, (_, a, b) => (b ? `${a}.${b}` : a));

// The server writes the job log in English; show it in the reader's language.
export function eventText(e: JobEvent, t: T): string {
  const s = e.text;
  let m = s.match(/^([\d.]+) JOD \/ (\d+) days$/);
  if (m) return `${t('ev.quote')}: ${tidy(m[1])} ${t('jod')} / ${m[2]} ${t('days')}`;
  m = s.match(/^released ([\d.]+) JOD \((\w+)\)$/);
  if (m) return `${t('ev.released')} ${tidy(m[1])} ${t('jod')} (${t(`ms.${m[2]}`)})`;
  m = s.match(/^dispute opened: ([\s\S]*)$/);
  if (m) return `${t('ev.disputeOpened')}: ${m[1]}`;
  m = s.match(/^correction requested: ([\s\S]*)$/);
  if (m) return `${t('ev.correction')}: ${m[1]}`;
  if (s === 'dispute resolved: refunded') return t('ev.refunded');
  if (s === 'dispute resolved: released') return t('ev.releasedToProvider');
  if (s === 'quote accepted') return t('ev.accepted');
  if (s === 'agreement signed') return t('ev.signed');
  if (s === 'signature withdrawn') return t('ev.unsigned');
  if (s === 'settlement proposed') return t('ev.settleProposed');
  if (s === 'dispute settled amicably') return t('ev.settled');
  if (s.startsWith('paid into escrow')) return t('ev.paid');
  if ((JOB_STAGES as string[]).includes(s) || s === 'cancelled') return t(`stage.${s}`);
  return tidy(s);
}

// The latest note Masaha sent both sides, while the job is being corrected.
export function correctionNote(events: JobEvent[]): string | undefined {
  const last = [...events].reverse().find((e) => e.text.startsWith('correction requested: ') || e.text.startsWith('dispute'));
  return last?.text.startsWith('correction requested: ') ? last.text.slice('correction requested: '.length) : undefined;
}

export function lastCorrectionAt(events: JobEvent[]): string | undefined {
  return [...events].reverse().find((e) => e.text.startsWith('correction requested: '))?.at;
}
