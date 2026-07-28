export type ProposalStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';
export type ApplicantType = 'User' | 'Team';

export interface Proposal {
  id: string;
  projectId: string;
  projectTitle: string;
  applicantType: ApplicantType;
  teamId: string | null;
  teamName: string | null;
  userId: string | null;
  applicantName: string | null;
  applicantAvatarUrl: string | null;
  coverLetter: string;
  proposedBudget: number;
  status: ProposalStatus;
  appliedAt: string;
  responseAt: string | null;
  chatRoomId: string | null;
  attachmentUrls: string[];
}

export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
