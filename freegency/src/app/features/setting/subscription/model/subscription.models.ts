export type FeatureType =
  | 'CreateProject' | 'SendProposal' | 'JoinedTeams' | 'ActiveProjects'
  | 'ProjectSendInvitation' | 'TeamInvite' | 'GenerateProjectDraft'
  | 'TeamSuggestions' | 'AIChatProposal' | 'ProposalRanking' | 'HiringAgent';

export type BillingPeriod = 'Monthly' | 'Yearly';

export interface PlanFeature {
  feature: FeatureType;
  limit: number | null;
  isEnabled: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  yearlyPrice: number;
  isActive: boolean;
  features: PlanFeature[];
}

export interface FeatureUsage {
  isEnabled: boolean;
  limit: number | null;
  used: number;
  remaining: number;
}

export interface PlanSnapshot {
  planName: string;
  isSubscribed: boolean;
  renewsAt: string | null; 
  usage: Record<FeatureType, FeatureUsage>;
}

export interface ChangePlanRequest {
  planId: string;
  billingPeriod: BillingPeriod;
}