export interface TeamProjectMemberAvatar {
  userId: string;
  name: string;
  imageUrl: string | null;
}

export interface TeamProjectCard {
  id: string;
  title: string;
  status: string;
  clientName: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  deadline: string | null;
  categoryName: string | null;
  totalMilestones: number;
  completedMilestones: number;
  progressPercent: number;
  isCurrentUserMember: boolean;
  currentMilestoneTitle: string | null;
  currentMilestoneAmount: number | null;
  currentMilestoneWorkStatus: string | null;
  currentMilestoneDue: string | null;
  currentMilestoneTasksDone: number;
  currentMilestoneTasksTotal: number;
  members: TeamProjectMemberAvatar[];
  membersTotal: number;
}

export interface ProjectMemberDto {
  userId: string;
  name: string;
  imageUrl: string | null;
  roleInProject: string;
  assignedAt: string;
}

export interface MilestoneAssignmentDto {
  id: string;
  milestoneId: string;
  userId: string;
  userName: string;
  imageUrl: string | null;
  percentage: number;
}

export interface MilestoneAssignmentItem {
  userId: string;
  percentage: number;
}

export interface MilestoneAssigneeDto {
  userId: string;
  name: string;
  imageUrl: string | null;
}

export interface MilestonePayoutSplitItem {
  userId: string;
  value: number;
}

export interface MilestonePayoutSplitsDto {
  teamId: string;
  projectId: string | null;
  milestoneId: string | null;
  splitType: string;
  items: MilestonePayoutSplitItem[];
}
