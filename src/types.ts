export type Lang = 'ar' | 'en';
export type Role = 'customer' | 'provider';

export type ServiceId =
  | 'plot' | 'subdivision' | 'topographic' | 'staking'
  | 'asBuilt' | 'sitePlan' | 'dispute';

export type JobStage =
  | 'requested' | 'quoted' | 'agreed' | 'visitScheduled'
  | 'fieldWork' | 'drafting' | 'submitted' | 'done';

export const JOB_STAGES: JobStage[] = [
  'requested', 'quoted', 'agreed', 'visitScheduled',
  'fieldWork', 'drafting', 'submitted', 'done',
];

// Plot location as recorded by the Department of Lands and Survey.
export interface PlotLocation {
  governorate: string;
  directorate: string;
  village: string;
  basin: string;
  plotNumber: string;
  areaM2?: number;
}

export interface ServiceRequest {
  id: string;
  service: ServiceId;
  location: PlotLocation;
  notes: string;
  createdAt: string;
  stage: JobStage;
}

// One entry per action on a job; this log is what both sides rely on in a dispute.
export interface JobEvent {
  at: string;
  by: Role;
  kind: 'message' | 'quote' | 'changeOrder' | 'stage' | 'file';
  text: string;
}

export interface Review {
  by: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string;
  jobService: ServiceId;
  at: string;
}

// Open to individual surveyors and offices; the CV is what customers judge them by.
export interface Provider {
  id: string;
  name: string;
  kind: 'individual' | 'office';
  licenseNo?: string;
  verified: boolean;
  experienceYears: number;
  cv: { education: string; experience: string[]; equipment: string[] };
  services: ServiceId[];
  governorates: string[];
  reviews: Review[];
}

export interface Quote {
  id: string;
  providerId: string;
  priceJod: number;
  days: number;
  scope: string;
}

export type MilestoneStatus = 'pending' | 'held' | 'released' | 'refunded';

export interface Milestone {
  key: 'fieldWork' | 'delivery';
  share: number; // fraction of the agreed price
  status: MilestoneStatus;
}

export interface Job extends ServiceRequest {
  quotes: Quote[];
  acceptedQuoteId?: string;
  signedBy: Role[];
  milestones: Milestone[];
  events: JobEvent[];
}
