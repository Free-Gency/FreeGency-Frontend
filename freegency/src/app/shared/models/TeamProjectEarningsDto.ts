export interface TeamProjectEarningsDto {
  projectId: string;
  projectTitle: string;
  currency: string;
  totalBudget: number;
  releasedAmount: number;
  members: TeamMemberEarningDto[];
}
export interface TeamMemberEarningDto {
  userId: string;
  name: string;
  role: string | null;
  percentage: number;
  amount: number;
  releasedAmount: number;
  status: string;
}