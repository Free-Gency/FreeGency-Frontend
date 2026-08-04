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
  clientName: string;
  postedTimeOrDeadline: string;
  title: string;
  description: string;
  tags: string[];
  budget: number;
  proposalsCount: number;
  isSaved?: boolean;
  category: string;
  matchPercentage?: number;
}