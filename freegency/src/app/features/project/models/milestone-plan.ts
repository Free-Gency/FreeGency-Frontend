export interface MilestonePlanItem {
  id: string;
  title: string;
  definitionOfDone: string;
  amount: number;
  dueDate: string | null;
  sortOrder: number;
  changeTag: 'New' | 'Updated' | null;
}

export interface MilestonePlanVersion {
  id: string;
  projectId: string;
  proposalId: string;
  version: number;
  status: 'Proposed' | 'ChangesRequested' | 'Accepted' | string;
  changeComment: string | null;
  proposedByUserId: string;
  createdAt: string;
  items: MilestonePlanItem[];
}

export interface ProposeMilestonePlanPayload {
  projectId: string;
  proposalId: string;
  milestones: {
    title: string;
    definitionOfDone: string;
    amount: number;
    dueDate?: string | null;
  }[];
}

export interface RequestPlanChangesPayload {
  planVersionId: string;
  comment: string;
}

export type MilestonePlanAiAssistMode =
  | 'FullPlan'
  | 'ApplyChangeRequest'
  | 'Milestone'
  | 'Field';

export interface MilestonePlanAiDraftItem {
  title: string;
  definitionOfDone: string;
  amount: number;
  dueDate?: string | null;
}

export interface MilestonePlanAiAssistPayload {
  proposalId: string;
  mode: MilestonePlanAiAssistMode;
  currentMilestones?: MilestonePlanAiDraftItem[];
  milestoneIndex?: number | null;
  field?: 'title' | 'definitionOfDone' | null;
  changeComment?: string | null;
}

export interface MilestonePlanAiAssistResult {
  milestones: MilestonePlanAiDraftItem[];
}
