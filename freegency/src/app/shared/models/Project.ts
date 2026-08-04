export type ProjectStatus = 'Open' | 'Draft' | 'InProgress' | 'Completed' | 'Cancelled';

export interface Project {
  id: string;
  title: string;
  description: string;
  isFixedPrice: boolean;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  deadline: string | null;
  estimatedDurationDays: number | null;
  status: ProjectStatus;
  createdAt: string;
  categoryName: string;
  clientName: string;
  clientAvatarUrl: string | null;
  specialties: string[];
  skills: string[];
  proposalCount: number;
  /** Present when a team is the assignee. */
  assignedTeamId?: string | null;
}
