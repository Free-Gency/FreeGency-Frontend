export interface ProjectFeedParams {
  tab?: string;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ProjectFeedResponse {
  data: any[];
  totalCount: number;
}

export interface ProjectFeedItem {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientAvatarUrl?: string;
  clientRating?: number;
  categoryName?: string;
  categoryId?: string;
  
  isFixedPrice?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  
  budget?: number;
  budgetAmount?: number;
  
  skills?: string[];
  proposalCount?: number;
  proposalsCount?: number;
  isSaved?: boolean;
  createdAt?: string;
  status?: string | number;
  
  appliedAt?: string;
  coverLetter?: string;
  proposedSolution?: string;
  bidAmount?: number;
  proposedBudget?: number;
  projectTitle?: string;
  project?: Partial<ProjectFeedItem>;
}