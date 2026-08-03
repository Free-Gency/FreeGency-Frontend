export interface TeamSuggestionResponse {
  developerId: string;
  aiSummary: string | null;
  rankedTeams: RankedTeamSuggestion[];
  metadata?: {
    totalCandidatesEvaluated: number;
    returnedCount: number;
    processingTimeMs: number;
    usedFallbackScoring: boolean;
    warnings?: string[] | null;
  };
}

export interface RankedTeamSuggestion {
  teamId: string;
  teamName: string;
  teamLogoUrl: string | null;
  jobId: string | null;
  jobTitle: string | null;
  score: number;
  confidence: number;
  summary: string | null;
  reason: string | null;
  strengths: string[];
  weaknesses: string[];
  jobSkills: string[];
  memberCount: number;
  averageRating: number;
  ratingCount: number;
  hasApplied: boolean;
}
