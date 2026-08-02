export type TeamRoleLabel = 'TeamLeader' | 'TeamMember';

export interface TeamCategory {
  categoryId: string;
  name: string;
  isPrimary: boolean;
}

export interface TeamSpecialty {
  specialtyId: string;
  nameEn: string;
  nameAr: string;
}

export interface TeamSkill {
  skillId: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  logo: string | null;
  teamCode: string;
  aboutUs: string | null;
  averageRating: number;
  ratingCount: number;
  ownerUserId: string;
  ownerName: string;
  categories: TeamCategory[];
  specialties: TeamSpecialty[];
  skills: TeamSkill[];
  membersCount: number;
}

/** Card view-model for the My Teams hub. */
export interface TeamCardVm extends Team {
  role: TeamRoleLabel;
}

export interface TeamJob {
  id: string;
  teamId: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface TeamJobDetails extends TeamJob {
  closedAt: string | null;
  teamName: string;
  skills: { id: string; name: string }[];
}

export interface PagedTeamJobs {
  items: TeamJob[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface TeamPortfolioProject {
  id: string;
  title: string;
  description?: string | null;
  imageCover?: string | null;
}

export type MyTeamsHubTab = 'my-team' | 'discover' | 'openings';

export type TeamDetailTab =
  | 'overview'
  | 'portfolio'
  | 'projects'
  | 'tasks'
  | 'management'
  | 'finance'
  | 'messages';
