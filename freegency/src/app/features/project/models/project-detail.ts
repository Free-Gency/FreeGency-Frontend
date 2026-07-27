
export type ProjectStatus = 'Draft' | 'Open' | 'InProgress' | 'Completed' | 'Cancelled';
export type ProjectVisibility = 'Public' | 'Private';


export interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  clientId: string;
  clientName: string;
  clientAvatarUrl: string | null;
  clientRating: number;
  categoryId: string;
  categoryName: string;
  isFixedPrice: boolean;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  deadline: string | null;
  estimatedDurationDays: number | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  assignedTeamId: string | null;
  assignedUserId: string | null;
  specialties: string[];
  skills: string[];
  skillIds: string[];
  proposalCount: number;
  createdAt: string;
}