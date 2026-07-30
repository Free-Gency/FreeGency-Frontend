import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectProposal, ProposalStatus } from '../models/project-proposal';

export interface ProposalsQuery {
  projectId: string;
  search?: string;
  status?: ProposalStatus;
  sortBy?: 'AppliedAt' | 'ProposedBudget';
  sortDirection?: 'asc' | 'desc';
  pageNumber?: number;
  pageSize?: number;
}

export interface PagedProposals {
  items: ProjectProposal[];
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectProposalsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getByProjectId(query: ProposalsQuery): Observable<PagedProposals> {
    const params: Record<string, string> = {
      projectId: query.projectId,
      pageNumber: String(query.pageNumber ?? 1),
      pageSize: String(query.pageSize ?? 10),
      sortBy: query.sortBy ?? 'AppliedAt',
      sortDirection: query.sortDirection ?? 'desc',
    };
    if (query.search) params['search'] = query.search;
    if (query.status) params['status'] = query.status;

    return this.http
      .get<{
        isSuccess: boolean;
        data?: { items: ProjectProposal[]; totalCount?: number };
        message?: string | null;
      }>(`${this.baseUrl}/api/v1/proposals`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load proposals.');
          }
          return {
            items: res.data.items,
            totalCount: res.data.totalCount ?? res.data.items.length,
          };
        }),
      );
  }

  view(proposalId: string): Observable<void> {
    return this.postAction(proposalId, 'view');
  }

  startDiscussion(proposalId: string): Observable<void> {
    return this.postAction(proposalId, 'start-discussion');
  }

  closeDiscussion(proposalId: string): Observable<void> {
    return this.postAction(proposalId, 'close-discussion');
  }

  reject(proposalId: string): Observable<void> {
    return this.postAction(proposalId, 'reject');
  }

  private postAction(proposalId: string, action: string): Observable<void> {
    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/api/v1/proposals/${proposalId}/${action}`,
        null,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || `Failed to ${action} proposal.`);
          }
        }),
      );
  }
}
