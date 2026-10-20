import { ServiceId, VisitLength } from './types';
import type { IconName } from './ui';

export interface ServiceInfo {
  id: ServiceId;
  icon: IconName;
  // Indicative JOD range before quotes (per visit for staking); placeholder figures until confirmed.
  perVisit?: boolean;
  baseJod: [number, number];
  docs: Array<'deed' | 'plotPlan' | 'id' | 'permit' | 'buildingPlans'>;
}

export const SERVICES: ServiceInfo[] = [
  { id: 'plot', icon: 'map-marker-radius', baseJod: [100, 250], docs: ['deed', 'id'] },
  { id: 'subdivision', icon: 'vector-square', baseJod: [400, 1200], docs: ['deed', 'plotPlan', 'id'] },
  { id: 'topographic', icon: 'terrain', baseJod: [200, 800], docs: ['deed'] },
  { id: 'staking', icon: 'crane', perVisit: true, baseJod: [60, 400], docs: ['permit', 'buildingPlans'] },
  { id: 'asBuilt', icon: 'home-city-outline', baseJod: [200, 500], docs: ['permit', 'buildingPlans', 'deed'] },
  { id: 'sitePlan', icon: 'file-document-outline', baseJod: [50, 150], docs: ['deed', 'id'] },
  { id: 'dispute', icon: 'scale-balance', baseJod: [250, 700], docs: ['deed', 'plotPlan', 'id'] },
];

// Staking is priced per visit by how long the visit takes; placeholder ranges until confirmed.
export const VISIT_LENGTHS: { id: VisitLength; baseJod: [number, number] }[] = [
  { id: 'upTo2h', baseJod: [60, 120] },
  { id: 'upTo4h', baseJod: [100, 200] },
  { id: 'fullDay', baseJod: [150, 400] },
];

export const GOVERNORATES = [
  'amman', 'zarqa', 'irbid', 'balqa', 'madaba', 'jerash',
  'ajloun', 'mafraq', 'karak', 'tafilah', 'maan', 'aqaba',
] as const;
