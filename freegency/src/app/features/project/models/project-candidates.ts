export interface ProjectCandidatesResponse {
  projectId: string;
  candidates: SuggestedCandidate[];
  metadata?: SuggestionMetadata;
}

export interface SuggestedCandidate {
  candidateType: 'Team' | 'Developer' | string;
  id: string;
  name: string;
  about?: string | null;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  averageRating: number;
  ratingCount: number;
  skills: string[];
  specialties?: string[];
  categories?: string[];
  portfolioProjectCount: number;
  completedProjectsCount: number;
  memberCount?: number | null;
  featuredPortfolioProjectId?: string | null;
  featuredPortfolioTitle?: string | null;
  finalScore: number;
  vectorScore: number;
  breakdown?: {
    vector: number;
    skillOverlap: number;
    specialtyOverlap: number;
    rating: number;
    portfolio: number;
  };
}

export interface SuggestionMetadata {
  returnedCount: number;
  elapsedMs: number;
  warnings?: string[];
}
