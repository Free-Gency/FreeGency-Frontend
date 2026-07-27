import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectEvent } from '../models/project-event';


@Injectable({ providedIn: 'root' })
export class ProjectEventsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;

  getByProjectId(projectId: string, skip = 0, take = 50): Observable<ProjectEvent[]> {
    return this.http
      .get<{ isSuccess: boolean; data?: ProjectEvent[]; message?: string | null }>(
        `${this.baseUrl}/${projectId}/events`,
        { params: { skip: skip.toString(), take: take.toString() } },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load events.');
          }
          return res.data;
        }),
      );
  }
}