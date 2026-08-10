
export type MilestoneReleaseStatus = 'Locked' | 'InReview' | 'Pending' | 'Released';

export type MilestoneWorkStatus =
  | 'NotStarted'
  | 'InProgress'
  | 'Submitted'
  | 'ChangesRequested'
  | 'Approved';

export interface DeveloperMilestone {
  id: string;
  projectId: string;
  projectTitle: string;
  projectStatus: string;
  title: string;
  description: string;
  amount: number;
  releasedAmount: number;
  sortOrder: number;
  releaseStatus: MilestoneReleaseStatus;
  workStatus: MilestoneWorkStatus;
  dueDate: string | null;
  isFunded: boolean;
  isAssignee?: boolean;
  canSubmit: boolean;
  submittedAt: string | null;
  createdAt: string;
}
