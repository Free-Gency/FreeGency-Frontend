
export type ProposalStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Withdrawn';


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
  proposedBudget: number;
  status: ProposalStatus;
  appliedAt: string;
  responseAt: string | null;
  chatRoomId: string | null;
  attachmentUrls: string[];
}