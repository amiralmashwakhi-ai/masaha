import { Milestone } from './types';

// Platform commission, taken from the provider's payout. Placeholder rate until confirmed.
export const COMMISSION_RATE = 0.1;

export const DEFAULT_MILESTONES: Milestone[] = [
  { key: 'fieldWork', share: 0.3, status: 'pending' },
  { key: 'delivery', share: 0.7, status: 'pending' },
];

export const round = (n: number) => Math.round(n * 1000) / 1000; // JOD has 3 decimals (fils)

// Amounts shown without trailing zeros: 250, 87.5.
export const fmt = (n: number) => String(round(n));

export function split(priceJod: number) {
  const commission = round(priceJod * COMMISSION_RATE);
  return { customerPays: priceJod, commission, providerGets: round(priceJod - commission) };
}

export function avgStars(stars: number[]) {
  return stars.length ? round(stars.reduce((a, b) => a + b, 0) / stars.length) : 0;
}
