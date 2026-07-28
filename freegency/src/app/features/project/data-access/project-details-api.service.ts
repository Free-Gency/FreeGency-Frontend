import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectDetail } from '../models/project-detail';
import { UpdateProjectRequest } from '../models/update-project-request';


@Injectable({ providedIn: 'root' })
export class ProjectDetailsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;

  getById(id: string): Observable<ProjectDetail> {
    return this.http
      .get<{ isSuccess: boolean; data?: ProjectDetail; message?: string | null }>(
        `${this.baseUrl}/${id}`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load project.');
          }
          return res.data;
        }),
      );
  }

  // The backend's Edit action reads UpdateProjectRequestDto.Id from the body
  // (there's no [FromRoute] id parameter on the controller), so the id must
  // be included in the request payload, not just the URL.
  update(request: UpdateProjectRequest): Observable<void> {
    return this.http
      .put<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/${request.id}`,
        request,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to update project.');
          }
        }),
      );
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/${id}`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to delete project.');
          }
        }),
      );
  }

  replaceSkills(id: string, skillIds: string[]): Observable<void> {
    return this.http
      .put<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/${id}/skills`,
        skillIds,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to update skills.');
          }
        }),
      );
  }

  publish(id: string): Observable<void> {
    return this.http
      .patch<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/${id}/publish`,
        null,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to publish project.');
          }
        }),
      );
  }
}