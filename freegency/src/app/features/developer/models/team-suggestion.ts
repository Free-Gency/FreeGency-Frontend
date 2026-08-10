export interface TeamsForMeResponse {
  suggestions: SuggestedTeamJob[];
  metadata?: SuggestionMetadata;
}

export interface SuggestedTeamJob {
  teamId: string;
  teamName: string;
  teamAverageRating: number;
  teamRatingCount: number;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  requiredSkills: string[];
  finalScore: number;
  vectorScore: number;
  breakdown?: SuggestionScoreBreakdown;
}

export interface SuggestionScoreBreakdown {
  vector: number;
  skillOverlap: number;
  specialtyOverlap: number;
  rating: number;
  portfolio: number;
}

export interface SuggestionMetadata {
  returnedCount: number;
  elapsedMs: number;
  warnings?: string[];
}

/** @deprecated Use TeamsForMeResponse — kept for gradual migration */
export type TeamSuggestionResponse = TeamsForMeResponse & {
  developerId?: string;
  aiSummary?: string | null;
  rankedTeams?: RankedTeamSuggestion[];
};

/** @deprecated mapped from SuggestedTeamJob in the component */
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
