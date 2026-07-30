export type ReleaseStatus = 'Locked' | 'InReview' | 'Pending' | 'Released';
export type WorkStatus = 'NotStarted' | 'InProgress' | 'Submitted' | 'ChangesRequested' | 'Approved';
export type FileKind = 'Brief' | 'Deliverable' | 'Shared' | 'Other';

export interface ProjectMilestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  amount: number;
  releasedAmount: number;
  sortOrder: number;
  releaseStatus: ReleaseStatus;
  workStatus: WorkStatus;
  proposedByUserId: string | null;
  dueDate: string | null;
  isFunded: boolean;
  submittedAt: string | null;
  availableAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  files: MilestoneFile[];
}

export interface MilestoneFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileKind: FileKind;
  createdAt: string;
}
