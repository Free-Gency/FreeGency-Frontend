import { HttpClient, HttpParams } from '@angular/common/http';
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

export interface ProjectDto {
  id: string;
  title: string;
  description: string;
  isFixedPrice: boolean;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  deadline: string | null;
  estimatedDurationDays: number | null;
  status: string;
  createdAt: string;
  categoryName: string;
  clientName: string;
  clientAvatarUrl: string | null;
  specialties: string[];
  skills: string[];
  proposalCount: number;
}

interface ApiResponse<T> {
  isSuccess: boolean;
  data?: T | null;
  message?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;

  create(request: CreateProjectRequest): Observable<string> {
    return this.http
      .post<ApiResponse<string>>(this.baseUrl, request)
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
      .patch<ApiResponse<unknown>>(`${this.baseUrl}/${projectId}/publish`, null)
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to publish project.');
          }
        }),
      );
  }

  getMine(role: 'as-client' | 'as-assignee' = 'as-client'): Observable<ProjectDto[]> {
    const params = new HttpParams().set('role', role);

    return this.http
      .get<ApiResponse<ProjectDto[]>>(`${this.baseUrl}/mine`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to load projects.');
          }
          return res.data ?? [];
        }),
      );
  }
}
