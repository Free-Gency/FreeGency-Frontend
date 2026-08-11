export interface ProjectImageDto {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface MetricDto {
  label: string;
  value: string;
}

export interface RoadmapStepDto {
  title: string;
  description: string;
}

export interface ProjectDetailDto {
  id: string;
  title: string;
  description: string;
  budget: number;
  imageCover: string;
  projectUrl: string | null;
  prototypeUrl: string | null;
  completionDate: string;
  updatedAt: string | null;
  visibility: string;
  categoryName: string;
  ownerName: string;
  ownerType: string;
  ownerUserId: string;
  ownerTeamId: string | null;
  challenge: string | null;
  solution: string | null;
  durationLabel: string | null;
  industry: string | null;
  teamLeads: string | null;
  testimonialQuote: string | null;
  testimonialAuthorName: string | null;
  testimonialAuthorTitle: string | null;
  testimonialAuthorAvatarUrl: string | null;
  canEdit: boolean;
  creator: string | null;
  ownerReviews: any[]; 
  images: ProjectImageDto[];
  skills: string[];
  roadmapSteps: RoadmapStepDto[];
  metrics: MetricDto[];
}

export interface ReviewPayload {
  rating: number;
  title: string;
  displayName: string;
  comment: string;
}