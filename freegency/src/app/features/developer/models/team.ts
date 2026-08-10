export type TeamRoleLabel = 'TeamLeader' | 'TeamMember';

export interface TeamCategory {
  categoryId: string;
  name: string;
  nameEn?: string;
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

export interface TeamMemberAvatar {
  userId: string;
  name: string;
  imageUrl: string | null;
}

export interface TeamMemberRow {
  userId: string;
  name: string;
  imageUrl: string | null;
  role: TeamRoleLabel | string;
  job?: string | null;
  isOwner: boolean;
  joinedAt?: string | null;
}

export interface Team {
  id: string;
  name: string;
  logo: string | null;
  cover?: string | null;
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
  /** Portfolio + completed client projects. */
  projectsCount?: number;
  /** Present when the current user belongs to the team. */
  myRole?: TeamRoleLabel | null;
  memberAvatars?: TeamMemberAvatar[];
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
  /** Present on browse / details payloads when the API includes the team. */
  teamName?: string | null;
  teamLogo?: string | null;
}

export interface TeamJobDetails extends TeamJob {
  closedAt: string | null;
  teamName: string;
  skills: { id: string; name: string }[];
}

export type TeamJoinRequestStatus = 'pending' | 'Accepted' | 'Rejected' | string;

export interface TeamJoinRequest {
  id: string;
  userId: string;
  fullName: string;
  userName: string | null;
  profilePicture: string | null;
  averageRating: number;
  reviewCount: number;
  completedProjects: number;
  coverLetter: string | null;
  status: TeamJoinRequestStatus;
  requestedAt: string;
  teamJobId: string | null;
  teamJobTitle: string | null;
  /** Future AI ranking — overall fit 0–100 (or 0–1 from API). */
  matchScore?: number | null;
  /** Future AI ranking — 1-based rank among applicants for this job. */
  matchRank?: number | null;
  /** Future AI ranking — short rationale from profile/CV analysis. */
  aiReasoning?: string | null;
  /** Optional CV / portfolio link when backend exposes it. */
  cvUrl?: string | null;
}

export interface PagedTeamJoinRequests {
  items: TeamJoinRequest[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface PagedTeamJobs {
  items: TeamJob[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface PagedTeams {
  items: Team[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
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
  | 'projects'
  | 'jobs'
  | 'tasks'
  | 'finance'
  | 'messages'
  | 'members'
  | 'invitations';
