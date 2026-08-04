export interface ProfileCompletion {
  percentage: number;
  missingSteps: string[];
}

export interface DeveloperProfile {
  id: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  bio: string;
  averageRating: number;
  ratingCount: number;
  country: string;
  interests: any[];
}

export interface DeveloperProfileSummary extends DeveloperProfile {
  fullName: string;
  completion: ProfileCompletion;
}