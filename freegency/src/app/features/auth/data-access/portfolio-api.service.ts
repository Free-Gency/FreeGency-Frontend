import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SKIP_LOADING } from '../../../core/http/loading.interceptor';
import { environment } from '../../../../environments/environment';
import type { PagedResponse } from '../../../shared/models/PagedResponse';

export interface PortfolioProjectDto {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  imageCover: string | null;
  projectUrl: string | null;
  completionDate: string | null;
  visibility: number | string;
  categoryName: string | null;
  ownerName: string | null;
}

export interface PortfolioImageDto {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface PortfolioSkillDto {
  id: string;
  name: string;
}

export interface PortfolioCreatorDto {
  kind: string;
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  headline: string | null;
  averageRating: number;
  ratingCount: number;
  membersCount: number;
  specialties: string[];
  skills: string[];
}

export interface OwnerReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerUserId?: string | null;
  reviewerName: string;
  reviewerAvatar: string | null;
}

export interface PortfolioProjectDetailsDto {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  imageCover: string | null;
  projectUrl: string | null;
  completionDate: string | null;
  visibility: number | string;
  categoryName: string | null;
  ownerName: string | null;
  ownerType: string;
  ownerUserId: string | null;
  ownerTeamId: string | null;
  creator: PortfolioCreatorDto | null;
  ownerReviews: OwnerReviewDto[];
  images: PortfolioImageDto[];
  skills: PortfolioSkillDto[];
}

export interface RecentlyViewedPortfolioDto {
  id: string;
  title: string;
  categoryName: string | null;
  ownerName: string | null;
  imageCover: string | null;
  viewedAt: string;
}

interface ApiResponse<T> {
  isSuccess: boolean;
  data?: T | null;
  message?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PortfolioApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

  getInspiration(options?: {
    categoryId?: string | null;
    search?: string | null;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedResponse<PortfolioProjectDto>> {
    let params = new HttpParams()
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 6));

    if (options?.categoryId) {
      params = params.set('categoryId', options.categoryId);
    }
    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedResponse<PortfolioProjectDto>>>(
        `${this.baseUrl}/portfolio-projects/inspiration`,
        { params },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load inspiration.');
          }
          return {
            ...res.data,
            items: res.data.items ?? [],
          };
        }),
      );
  }

  getDetails(id: string): Observable<PortfolioProjectDetailsDto> {
    return this.http
      .get<ApiResponse<PortfolioProjectDetailsDto>>(
        `${this.baseUrl}/portfolio-projects/${id}`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load portfolio details.');
          }
          return {
            ...res.data,
            images: res.data.images ?? [],
            skills: res.data.skills ?? [],
            ownerReviews: res.data.ownerReviews ?? [],
            creator: res.data.creator
              ? {
                  ...res.data.creator,
                  specialties: res.data.creator.specialties ?? [],
                  skills: res.data.creator.skills ?? [],
                }
              : null,
          };
        }),
      );
  }

  getRecentlyViewed(take = 5): Observable<RecentlyViewedPortfolioDto[]> {
    const params = new HttpParams().set('take', String(take));

    return this.http
      .get<ApiResponse<RecentlyViewedPortfolioDto[]>>(
        `${this.baseUrl}/me/portfolio-projects/recently-viewed`,
        {
          params,
          context: new HttpContext().set(SKIP_LOADING, true),
        },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to load recently viewed.');
          }
          return res.data ?? [];
        }),
      );
  }

  recordView(portfolioProjectId: string): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(
        `${this.baseUrl}/portfolio-projects/${portfolioProjectId}/view`,
        null,
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to record view.');
          }
        }),
      );
  }

  addFeedback(
    portfolioProjectId: string,
    body: { rating: number; comment?: string | null },
  ): Observable<OwnerReviewDto> {
    return this.http
      .post<ApiResponse<OwnerReviewDto>>(
        `${this.baseUrl}/portfolio-projects/${portfolioProjectId}/feedback`,
        body,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to submit review.');
          }
          return res.data;
        }),
      );
  }
}
