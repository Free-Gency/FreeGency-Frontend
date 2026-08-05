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

export interface PortfolioRoadmapStepDto {
  id?: string | null;
  title: string;
  sortOrder: number;
  isDone: boolean;
}

export interface PortfolioMetricDto {
  id?: string | null;
  value: string;
  label: string;
  sortOrder: number;
}

export interface PortfolioProjectDetailsDto {
  id: string;
  title: string;
  description: string;
  budget: number | null;
  imageCover: string | null;
  projectUrl: string | null;
  prototypeUrl?: string | null;
  completionDate: string | null;
  updatedAt?: string | null;
  visibility: number | string;
  categoryName: string | null;
  ownerName: string | null;
  ownerType: string;
  ownerUserId: string | null;
  ownerTeamId: string | null;
  challenge?: string | null;
  solution?: string | null;
  durationLabel?: string | null;
  industry?: string | null;
  teamLeads?: string | null;
  testimonialQuote?: string | null;
  testimonialAuthorName?: string | null;
  testimonialAuthorTitle?: string | null;
  testimonialAuthorAvatarUrl?: string | null;
  canEdit?: boolean;
  creator: PortfolioCreatorDto | null;
  ownerReviews: OwnerReviewDto[];
  images: PortfolioImageDto[];
  skills: PortfolioSkillDto[];
  roadmapSteps?: PortfolioRoadmapStepDto[];
  metrics?: PortfolioMetricDto[];
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
            ownerReviews: this.normalizeReviews(res.data.ownerReviews ?? (res.data as { OwnerReviews?: OwnerReviewDto[] }).OwnerReviews ?? []),
            canEdit: !!(res.data.canEdit ?? (res.data as { CanEdit?: boolean }).CanEdit),
            roadmapSteps: res.data.roadmapSteps ?? [],
            metrics: res.data.metrics ?? [],
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

  private normalizeReviews(list: OwnerReviewDto[]): OwnerReviewDto[] {
    return (list ?? []).map((r) => {
      const raw = r as OwnerReviewDto & {
        Id?: string;
        Rating?: number;
        Comment?: string | null;
        CreatedAt?: string;
        ReviewerUserId?: string | null;
        ReviewerName?: string;
        ReviewerAvatar?: string | null;
      };
      return {
        id: String(raw.id ?? raw.Id ?? ''),
        rating: Number(raw.rating ?? raw.Rating ?? 0),
        comment: (raw.comment ?? raw.Comment ?? null) as string | null,
        createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ''),
        reviewerUserId: (raw.reviewerUserId ?? raw.ReviewerUserId ?? null) as string | null,
        reviewerName: String(raw.reviewerName ?? raw.ReviewerName ?? '').trim() || 'Community member',
        reviewerAvatar: (raw.reviewerAvatar ?? raw.ReviewerAvatar ?? null) as string | null,
      };
    });
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
          return this.normalizeReviews([res.data])[0];
        }),
      );
  }

  /** Lightweight create used by developer onboarding (optional step). */
  createDeveloperPortfolio(input: {
    title: string;
    description?: string | null;
    projectUrl?: string | null;
    categoryId?: string | null;
    images?: File[];
  }): Observable<string> {
    const form = new FormData();
    form.append('Title', input.title.trim());
    form.append(
      'Description',
      (input.description ?? '').trim() || input.title.trim(),
    );
    form.append('OwnerType', 'User');
    form.append('Visibility', 'Public');
    if (input.projectUrl?.trim()) {
      form.append('ProjectUrl', input.projectUrl.trim());
    }
    if (input.categoryId) {
      form.append('CategoryId', input.categoryId);
    }
    for (const file of input.images ?? []) {
      form.append('Images', file, file.name);
    }

    return this.http
      .post<ApiResponse<string>>(`${this.baseUrl}/developer/me/portfolio-projects`, form)
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to create portfolio project.');
          }
          return res.data;
        }),
      );
  }
}
