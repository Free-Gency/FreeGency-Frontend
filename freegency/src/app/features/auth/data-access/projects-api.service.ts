import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface CreateProjectRequest {
  title: string;
  description: string;
  categoryId: string;
  isFixedPrice: boolean;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  estimatedDurationDays: number | null;
  skillIds: string[];
  specialtyIds: string[];
}

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;

  create(request: CreateProjectRequest): Observable<string> {
    return this.http
      .post<{ isSuccess: boolean; data?: string | null; message?: string | null }>(
        this.baseUrl,
        request,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to create project.');
          }
          return res.data;
        }),
      );
  }

  publish(projectId: string): Observable<void> {
    return this.http
      .patch<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/${projectId}/publish`,
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
