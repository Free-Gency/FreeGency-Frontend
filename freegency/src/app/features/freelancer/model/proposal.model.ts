/**
 * Mirrors the backend `ApplicantType` enum used in CreateProposalDto.
 * Keep the numeric values in sync with the C# enum.
 */
export enum ApplicantType {
  Team = 0,
  User = 1,
}

export interface TeamOption {
  id: string;
  name: string;
}

/**
 * Mirrors FreeGency.Application.Features.Proposals.Dtos.CreateProposalDto
 */
export interface CreateProposalDto {
  projectId: string;
  applicantType: ApplicantType;
  teamId?: string;
  coverLetter: string;
  approach: string;
  proposedTimeline?: string;
  similarLinksUrl?: string;
  proposedBudget: number;
}


export interface ProjectDetail {
  id: string;
  title: string;
  description: string;
  clientName: string;
  postedAt: string;
  budgetMin: number;
  budgetMax: number;
  duration: string;
  skills: string[];
  proposalCount: number;
}