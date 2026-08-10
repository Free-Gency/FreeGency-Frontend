import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import { ProjectCandidatesResponse } from '../models/project-candidates';

@Injectable({ providedIn: 'root' })
export class ProjectCandidatesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/suggestions`;

  getCandidatesForProject(projectId: string, topK = 10): Observable<ProjectCandidatesResponse> {
    const params = new HttpParams().set('topK', String(topK));

    return this.http
      .get<ApiResponse<ProjectCandidatesResponse>>(
        `${this.baseUrl}/candidates-for-project/${projectId}`,
        { params },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) throw new Error('Failed to fetch candidate suggestions.');
          return {
            ...res.data,
            candidates: res.data.candidates ?? [],
            metadata: res.data.metadata ?? { returnedCount: 0, elapsedMs: 0, warnings: [] },
          };
        }),
      );
  }
}
