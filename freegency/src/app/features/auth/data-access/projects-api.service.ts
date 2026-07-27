import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { PagedResponse } from '../../../shared/models/PagedResponse';

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

export interface MyProjectsSummaryDto {
  total: number;
  draft: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  upcomingDeadlines: ProjectDto[];
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

  getMine(options?: {
    role?: 'as-client' | 'as-assignee';
    pageNumber?: number;
    pageSize?: number;
    status?: string | null;
    search?: string | null;
  }): Observable<PagedResponse<ProjectDto>> {
    let params = new HttpParams()
      .set('role', options?.role ?? 'as-client')
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 10));

    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedResponse<ProjectDto>>>(`${this.baseUrl}/mine`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load projects.');
          }
          return {
            ...res.data,
            items: res.data.items ?? [],
          };
        }),
      );
  }

  getMineSummary(
    role: 'as-client' | 'as-assignee' = 'as-client',
  ): Observable<MyProjectsSummaryDto> {
    const params = new HttpParams().set('role', role);

    return this.http
      .get<ApiResponse<MyProjectsSummaryDto>>(`${this.baseUrl}/mine/summary`, {
        params,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load project summary.');
          }
          return {
            ...res.data,
            upcomingDeadlines: res.data.upcomingDeadlines ?? [],
          };
        }),
      );
  }
}
