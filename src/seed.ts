import { Provider } from './types';

// Sample providers for the prototype only.
export const SEED_PROVIDERS: Provider[] = [
  {
    id: 'p1', name: 'مكتب النخبة للمساحة', kind: 'office', licenseNo: 'JEA-0000', verified: true,
    experienceYears: 15,
    cv: {
      education: 'B.Sc. Surveying & Geomatics',
      experience: ['Subdivision projects in Amman and Zarqa', 'Topographic surveys for road works'],
      equipment: ['GNSS RTK', 'Total station', 'Drone'],
    },
    services: ['plot', 'subdivision', 'topographic', 'staking', 'asBuilt', 'sitePlan', 'dispute'],
    governorates: ['amman', 'zarqa', 'balqa'],
    reviews: [
      { by: 'أحمد', stars: 5, text: 'Fast and clear, delivered on time.', jobService: 'plot', at: '2026-09-02' },
      { by: 'Sara', stars: 4, text: 'Good work, site visit was rescheduled once.', jobService: 'staking', at: '2026-08-15' },
    ],
  },
  {
    id: 'p2', name: 'م. خالد', kind: 'individual', verified: false, experienceYears: 4,
    cv: {
      education: 'Diploma in Surveying',
      experience: ['Plot boundary marking in Irbid'],
      equipment: ['Total station'],
    },
    services: ['plot', 'staking', 'sitePlan'],
    governorates: ['irbid', 'ajloun', 'jerash'],
    reviews: [],
  },
];
