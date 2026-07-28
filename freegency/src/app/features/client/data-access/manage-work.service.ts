import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import { Project } from '../../../shared/models/Project';
import { Proposal, PagedResponse, ProposalStatus } from '../../../shared/models/Proposal';

@Injectable({
  providedIn: 'root',
})
export class ManageWorkService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;

  getMyProjects(role: 'as-client' | 'as-assignee'): Observable<Project[]> {
    return this.http
      .get<ApiResponse<Project[]>>(`${this.baseUrl}/mine`, {
        params: { role },
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to fetch projects.');
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
  getProposalsForProject(projectId: string, status?: ProposalStatus): Observable<Proposal[]> {
    const params: Record<string, string> = { projectId };
    if (status) params['status'] = status;

    return this.http
      .get<ApiResponse<PagedResponse<Proposal>>>(`${environment.apiBaseUrl}/api/v1/proposals`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess) throw new Error('Failed to fetch proposals.');
          return res.data.items;
        }),
      );
  }

  acceptProposal(id: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${environment.apiBaseUrl}/api/v1/proposals/${id}/accept`, {})
      .pipe(map(() => void 0));
  }

  rejectProposal(id: string): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${environment.apiBaseUrl}/api/v1/proposals/${id}/reject`, {})
      .pipe(map(() => void 0));
  }
}

