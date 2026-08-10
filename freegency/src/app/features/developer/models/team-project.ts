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
