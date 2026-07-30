export type ProposalStatus =
  | 'Pending'
  | 'Viewed'
  | 'InDiscussion'
  | 'Rejected'
  | 'Withdrawn'
  | 'Expired';

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
  approach: string;
  proposedTimeline: string | null;
  similarLinksUrl: string | null;
  proposedBudget: number;
  status: ProposalStatus;
  rejectReason: string | null;
  appliedAt: string;
  responseAt: string | null;
  chatRoomId: string | null;
  attachmentUrls: string[];
  skills?: string[] | null;
  specialties?: string[] | null;
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
