import { IconName } from './ui';
import { Job, Role } from './types';

// What happens next on a job, from one side's point of view: whose turn it is, and what to do.
// Drives the "next step" card on the job page and the "your tasks" list on Home.
export interface NextStep { turn: 'you' | 'other' | 'none'; key: string; icon: IconName }

export function nextStep(job: Job, role: Role, userId: string, canQuote = true): NextStep {
  const you = (key: string, icon: IconName): NextStep => ({ turn: 'you', key, icon });
  const other = (key: string, icon: IconName): NextStep => ({ turn: 'other', key, icon });
  const held = (k: 'fieldWork' | 'delivery') => job.milestones.find((m) => m.key === k)?.status === 'held';
  const paid = job.milestones.some((m) => m.status !== 'pending');
  const customer = role === 'customer';
  switch (job.stage) {
    case 'requested':
    case 'quoted':
      if (customer) return job.quotes.length ? you('next.compareQuotes', 'scale-balance') : other('next.waitQuotes', 'timer-sand');
      if (job.quotes.some((q) => q.providerId === userId)) return other('next.waitCustomerChoice', 'timer-sand');
      return canQuote ? you('next.sendQuote', 'cash-plus') : you('next.verifyFirst', 'shield-alert-outline');
    case 'agreed':
      if (!job.signedBy.includes(role)) return you('next.sign', 'draw-pen');
      if (job.signedBy.length < 2) return other(customer ? 'next.waitProviderSign' : 'next.waitCustomerSign', 'timer-sand');
      if (!paid) return customer ? you('next.pay', 'shield-lock-outline') : other('next.waitPayment', 'timer-sand');
      return other('next.waitVisit', 'calendar-clock');
    case 'visitScheduled':
      return customer ? other('next.providerVisits', 'map-marker-radius-outline') : you('next.doFieldWork', 'map-marker-radius-outline');
    case 'fieldWork':
      if (customer) return held('fieldWork') ? you('next.releaseFirst', 'cash-check') : other('next.providerDrafting', 'pencil-ruler');
      return other('next.waitFirstRelease', 'timer-sand');
    case 'drafting':
      return customer ? other('next.providerDrafting', 'pencil-ruler') : you('next.uploadFiles', 'file-upload-outline');
    case 'submitted':
      return customer ? you('next.reviewFiles', 'file-check-outline') : other('next.waitFinalRelease', 'timer-sand');
    case 'done':
      return job.reviews.some((r) => r.by === role) ? { turn: 'none', key: 'next.done', icon: 'check-decagram' }
        : you(customer ? 'next.rateProvider' : 'next.rateCustomer', 'star-outline');
    case 'disputed':
      return you('next.dispute', 'alert-octagon-outline');
    default:
      return { turn: 'none', key: 'next.cancelled', icon: 'close-circle-outline' };
  }
}
