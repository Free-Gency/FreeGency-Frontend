export interface PortfolioSkill {
  id: string;
  name: string;
}

export interface PortfolioSpecialty {
  id: string;
  nameAr?: string;
  nameEn?: string;
  skills?: PortfolioSkill[];
}

export interface PortfolioInterest {
  id: string;
  name?: string;
  nameEn?: string;
  imageCover?: string | null;
  specialties?: PortfolioSpecialty[];
}

export interface SocialLinkDto {
  id: string;
  platform: string;
  url: string;
}

export interface PortfolioProjectDto {
  id: string;
  title: string;
  description: string;
  budget?: number | null;
  imageCover: string | null;
  projectUrl?: string | null;
  completionDate?: string | null;
  visibility?: number | string;
  categoryName: string | null;
  ownerName?: string | null;
}

/** Portfolio page view of a developer profile. */
export interface DeveloperProfile {
  id: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  bio: string | null;
  averageRating: number;
  ratingCount: number;
  country: string;
  interests: PortfolioInterest[];
  title?: string | null;
  hourlyRate?: number | null;
  isAvailable?: boolean | null;
  jobSuccessRate?: number | null;
  totalJobs?: number | null;
}
