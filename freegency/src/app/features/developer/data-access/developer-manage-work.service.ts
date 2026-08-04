import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADING } from '../../../core/http/loading.interceptor';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import { Project } from '../../../shared/models/Project';
import {
  PagedResponse,
  Proposal,
  ProposalStatus,
} from '../../../shared/models/Proposal';
import { DeveloperMilestone } from '../models/developer-milestone';

export interface MyProjectsSummary {
  total: number;
  draft: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

@Injectable({ providedIn: 'root' })
export class DeveloperManageWorkService {
  private readonly http = inject(HttpClient);
  private readonly projectsUrl = `${environment.apiBaseUrl}/api/v1/projects`;
  private readonly proposalsUrl = `${environment.apiBaseUrl}/api/v1/proposals`;
  private readonly milestonesUrl = `${environment.apiBaseUrl}/api/v1/milestones`;

  getMyProjects(options?: {
    pageNumber?: number;
    pageSize?: number;
    status?: string | null;
    search?: string | null;
    sortBy?: 'CreatedAt' | 'Title' | 'Budget' | 'Deadline';
    sortDirection?: 'asc' | 'desc';
    skipLoading?: boolean;
  }): Observable<PagedResponse<Project>> {
    let params = new HttpParams()
      .set('role', 'as-assignee')
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 10))
      .set('sortBy', options?.sortBy ?? 'Deadline')
      .set('sortDirection', options?.sortDirection ?? 'asc');

    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedResponse<Project>>>(`${this.projectsUrl}/mine`, {
        params,
        context: options?.skipLoading
          ? new HttpContext().set(SKIP_LOADING, true)
          : undefined,
      })
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
  getMyProjectsSummary(): Observable<MyProjectsSummary> {
    const params = new HttpParams().set('role', 'as-assignee');

    return this.http
      .get<ApiResponse<MyProjectsSummary>>(`${this.projectsUrl}/mine/summary`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to fetch projects summary.');
          }
          return res.data;
        }),
      );
  }

  getMyProposals(options?: {
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

    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedResponse<Proposal>>>(`${this.proposalsUrl}/mine`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to fetch proposals.');
          }
          return { ...res.data, items: res.data.items ?? [] };
        }),
      );
  }

  getMyMilestones(): Observable<DeveloperMilestone[]> {
    return this.http
      .get<ApiResponse<DeveloperMilestone[]>>(`${this.milestonesUrl}/mine`)
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to fetch milestones.');
          }
          return res.data;
        }),
      );
  }

  submitMilestone(milestoneId: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${this.milestonesUrl}/${milestoneId}/submit`, null)
      .pipe(map(() => void 0));
  }
}
