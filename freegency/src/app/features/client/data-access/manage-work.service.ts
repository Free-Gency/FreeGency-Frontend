import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import { Project } from '../../../shared/models/Project';
import { Proposal, PagedResponse, ProposalStatus } from '../../../shared/models/Proposal';

export interface MyProjectsSummary {
  total: number;
  draft: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface ProposalMatchSummary {
  matchedRequiredSkills: number;
  totalRequiredSkills: number;
  matchedPreferredSkills: number;
  totalPreferredSkills: number;
  missingSkills?: string[] | null;
  fitVerdict?: string | null;
}

export interface RankedProposal {
  candidateId: string;
  candidateName: string;
  rank: number;
  overallScore: number;
  aiReasoning?: string | null;
  matchSummary?: ProposalMatchSummary | null;
}

export interface ProjectRankingResponse {
  projectId: string;
  rankedProposals: RankedProposal[];
  aiSummary?: string | null;
  metadata?: {
    totalCandidatesEvaluated: number;
    returnedCount: number;
    usedAiEmbeddings: boolean;
    fromCache: boolean;
    warnings?: string[] | null;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ManageWorkService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;
  private readonly proposalsUrl = `${environment.apiBaseUrl}/api/v1/proposals`;

  getMyProjects(options?: {
    role?: 'as-client' | 'as-assignee';
    pageNumber?: number;
    pageSize?: number;
    status?: string | null;
    search?: string | null;
    sortBy?: 'CreatedAt' | 'Title' | 'Budget';
    sortDirection?: 'asc' | 'desc';
  }): Observable<PagedResponse<Project>> {
    let params = new HttpParams()
      .set('role', options?.role ?? 'as-client')
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 10))
      .set('sortBy', options?.sortBy ?? 'CreatedAt')
      .set('sortDirection', options?.sortDirection ?? 'desc');

    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedResponse<Project>>>(`${this.baseUrl}/mine`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to fetch projects.');
          }
          return { ...res.data, items: res.data.items ?? [] };
        }),
      );
  }

  /** Total counts (not paginated) — for tab/sidebar badges */
  getMyProjectsSummary(
    role: 'as-client' | 'as-assignee' = 'as-client',
  ): Observable<MyProjectsSummary> {
    const params = new HttpParams().set('role', role);

    return this.http
      .get<ApiResponse<MyProjectsSummary>>(`${this.baseUrl}/mine/summary`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to fetch projects summary.');
          }
          return res.data;
        }),
      );
  }

  // TODO: replace once backend ready
  getMilestones(projectId: string): Observable<any[]> {
    return of([]);
  }

  // TODO: replace once backend ready
  getMembers(projectId: string): Observable<any[]> {
    return of([]);
  }

  // --- Proposals ---
  getProposals(options?: {
    projectId?: string;
    status?: ProposalStatus;
    search?: string | null;
    sortBy?: 'AppliedAt' | 'ProposedBudget';
    sortDirection?: 'asc' | 'desc';
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedResponse<Proposal>> {
    let params = new HttpParams()
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 10))
      .set('sortBy', options?.sortBy ?? 'AppliedAt')
      .set('sortDirection', options?.sortDirection ?? 'desc');

    if (options?.projectId) {
      params = params.set('projectId', options.projectId);
    }
    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedResponse<Proposal>>>(this.proposalsUrl, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to fetch proposals.');
          }
          return { ...res.data, items: res.data.items ?? [] };
        }),
      );
  }

  getProposalsForProject(projectId: string, status?: ProposalStatus): Observable<Proposal[]> {
    return this.getProposals({ projectId, status }).pipe(map((page) => page.items));
  }

  getProposalRanking(projectId: string, topK = 50): Observable<ProjectRankingResponse> {
    const params = new HttpParams().set('topK', String(topK));

    return this.http
      .get<ApiResponse<ProjectRankingResponse>>(`${this.baseUrl}/${projectId}/proposal-ranking`, {
        params,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to rank proposals.');
          }
          return {
            ...res.data,
            rankedProposals: res.data.rankedProposals ?? [],
          };
        }),
      );
  }

  acceptProposal(id: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.proposalsUrl}/${id}/accept`, {})
      .pipe(map(() => void 0));
  }

  rejectProposal(id: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.proposalsUrl}/${id}/reject`, {})
      .pipe(map(() => void 0));
  }
}
