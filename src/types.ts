export type Lang = 'ar' | 'en';
export type Role = 'customer' | 'provider';

export type ServiceId =
  | 'plot' | 'subdivision' | 'topographic' | 'staking'
  | 'asBuilt' | 'sitePlan' | 'dispute' | 'other';

export type JobStage =
  | 'requested' | 'quoted' | 'agreed' | 'visitScheduled'
  | 'fieldWork' | 'drafting' | 'submitted' | 'done'
  | 'cancelled' | 'disputed'; // off the normal path, not in JOB_STAGES

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

export type VisitLength = 'upTo2h' | 'upTo4h' | 'fullDay';

export interface ServiceRequest {
  id: string;
  service: ServiceId;
  location: PlotLocation;
  notes: string;
  visits?: number; // construction staking only
  visitLength?: VisitLength;
  withReport?: boolean; // staking: written report or not
  customService?: string; // the customer's own words when service is 'other'
  invitedProviderId?: string; // a direct request: only this surveyor sees and quotes on it
  projectId?: string; // shared by services requested together for the same plot
  createdAt: string;
  stage: JobStage;
}

// One entry per action on a job; this log is what both sides rely on in a dispute.
export interface JobEvent {
  at: string;
  by: Role | 'masaha';
  kind: 'message' | 'quote' | 'changeOrder' | 'stage' | 'file';
  text: string;
}

export interface Review {
  by: string;
  stars: 1 | 2 | 3 | 4 | 5;
  text: string;
  jobService?: ServiceId;
  at: string;
}

// A licensed surveying office; the CV is what customers judge them by.
export interface Provider {
  id: string;
  name: string;
  kind: 'individual' | 'office';
  licenseNo?: string;
  verified: boolean;
  experienceYears: number;
  cv: { education: string; experience: string[]; equipment: string[] };
  services: ServiceId[];
  otherServices?: string; // services outside the app's list, in the surveyor's words
  governorates: string[];
  coverUrl?: string;
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
  customerId: string;
  providerId?: string; // provider of the accepted quote
  // Reviews left on this job, one per side.
  reviews: { by: Role; stars: Review['stars']; text: string }[];
  quotes: Quote[];
  acceptedQuoteId?: string;
  signedBy: Role[];
  bothSignedAt?: string; // signatures can be withdrawn for 3 minutes after this
  milestones: Milestone[];
  events: JobEvent[];
}

export interface Attachment { url: string; name: string; kind: 'image' | 'document' }

// A provider's public offer of a service, shown in the services feed and on their profile.
export interface ServicePost {
  id: string;
  providerId: string;
  providerName: string;
  service: ServiceId;
  title: string;
  body: string;
  priceFromJod?: number;
  governorate?: string;
  attachments: Attachment[];
  active: boolean;
  createdAt: string;
}
