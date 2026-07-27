import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectProposal } from '../models/project-proposal';



@Injectable({ providedIn: 'root' })
export class ProjectProposalsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getByProjectId(projectId: string): Observable<ProjectProposal[]> {
    return this.http
      .get<{ isSuccess: boolean; data?: { items: ProjectProposal[] }; message?: string | null }>(
        `${this.baseUrl}/api/v1/proposals`,
        { params: { projectId } },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load proposals.');
          }
          return res.data.items;
        }),
      );
  }

  accept(proposalId: string): Observable<void> {
    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/api/v1/proposals/${proposalId}/accept`,
        null,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to accept proposal.');
          }
        }),
      );
  }

  reject(proposalId: string): Observable<void> {
    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/api/v1/proposals/${proposalId}/reject`,
        null,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to reject proposal.');
          }
        }),
      );
  }
}