import { ServiceId } from './types';

export interface ServiceInfo {
  id: ServiceId;
  // Indicative JOD range before quotes; placeholder figures until confirmed.
  baseJod: [number, number];
  docs: Array<'deed' | 'plotPlan' | 'id' | 'permit' | 'buildingPlans'>;
}

export const SERVICES: ServiceInfo[] = [
  { id: 'plot', baseJod: [100, 250], docs: ['deed', 'id'] },
  { id: 'subdivision', baseJod: [400, 1200], docs: ['deed', 'plotPlan', 'id'] },
  { id: 'topographic', baseJod: [200, 800], docs: ['deed'] },
  { id: 'staking', baseJod: [150, 400], docs: ['permit', 'buildingPlans'] },
  { id: 'asBuilt', baseJod: [200, 500], docs: ['permit', 'buildingPlans', 'deed'] },
  { id: 'sitePlan', baseJod: [50, 150], docs: ['deed', 'id'] },
  { id: 'dispute', baseJod: [250, 700], docs: ['deed', 'plotPlan', 'id'] },
];

export const GOVERNORATES = [
  'amman', 'zarqa', 'irbid', 'balqa', 'madaba', 'jerash',
  'ajloun', 'mafraq', 'karak', 'tafilah', 'maan', 'aqaba',
] as const;
