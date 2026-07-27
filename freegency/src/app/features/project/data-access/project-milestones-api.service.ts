import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectMilestone } from '../models/project-milestone';
import { ProjectEscrow } from '../models/project-escrow';


@Injectable({ providedIn: 'root' })
export class ProjectMilestonesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;

  getMilestones(projectId: string): Observable<ProjectMilestone[]> {
    return this.http
      .get<{ isSuccess: boolean; data?: ProjectMilestone[]; message?: string | null }>(
        `${this.baseUrl}/${projectId}/milestones`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load milestones.');
          }
          return res.data;
        }),
      );
  }

  getEscrow(projectId: string): Observable<ProjectEscrow> {
    return this.http
      .get<{ isSuccess: boolean; data?: ProjectEscrow; message?: string | null }>(
        `${this.baseUrl}/${projectId}/escrow`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load escrow.');
          }
          return res.data;
        }),
      );
  }
}