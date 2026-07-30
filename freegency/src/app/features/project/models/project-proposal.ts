export type ProposalStatus =
  | 'Pending'
  | 'Viewed'
  | 'InDiscussion'
  | 'Rejected'
  | 'Withdrawn'
  | 'Expired';

export interface ProjectProposal {
  id: string;
  projectId: string;
  projectTitle: string;
  applicantType: 'User' | 'Team';
  teamId: string | null;
  teamName: string | null;
  userId: string | null;
  applicantName: string;
  applicantAvatarUrl: string | null;
  coverLetter: string;
  approach: string;
  proposedTimeline: string | null;
  portfolioUrl: string | null;
  proposedBudget: number;
  status: ProposalStatus;
  rejectReason: string | null;
  appliedAt: string;
  responseAt: string | null;
  chatRoomId: string | null;
  attachmentUrls: string[];
}
