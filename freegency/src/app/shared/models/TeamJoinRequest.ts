export interface TeamJoinRequest {
  id: string;

  userId: string;
  fullName: string;
  userName?: string | null;
  profilePicture?: string | null;

  averageRating: number;
  reviewCount: number;
  completedProjects: number;

  coverLetter?: string | null;

  status: 'pending' | 'Accepted' | 'Rejected';

  requestedAt: string;

  teamJobId?: string | null;
  teamJobTitle?: string | null;
}
export interface TeamJoinRequestParams {
  teamId: string;
  pageNumber?: number;
  pageSize?: number;
  status?: string;
}