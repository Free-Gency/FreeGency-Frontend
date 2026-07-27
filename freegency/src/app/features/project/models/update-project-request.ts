

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  categoryId?: string;
  isFixedPrice?: boolean;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  estimatedDurationDays?: number | null;
  deadline?: string | null;
  visibility?: string;
  specialtyIds?: string[];
  skillIds?: string[];
}