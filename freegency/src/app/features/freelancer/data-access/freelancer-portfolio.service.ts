import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DeveloperProfile,
  PortfolioProjectDto,
  PortfolioReviewDto,
  SocialLinkDto,
} from '../model/portfolio.model';

interface ApiResponse<T> {
  isSuccess?: boolean;
  data?: T | null;
}

@Injectable({ providedIn: 'root' })
export class FreelancerPortfolioService {
  private readonly http = inject(HttpClient);
  private readonly profilesUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

  getPublicProfile(userId: string): Observable<DeveloperProfile> {
    return this.http.get<ApiResponse<DeveloperProfile> | DeveloperProfile>(
      `${this.profilesUrl}/developers/${userId}`,
    ).pipe(
      map((res) => {
        const raw = (res as ApiResponse<DeveloperProfile>)?.data ?? (res as DeveloperProfile);
        if (!raw) throw new Error('Developer profile not found.');
        return this.normalizeProfile(raw);
      }),
    );
  }

  getMyProfile(): Observable<DeveloperProfile> {
    return this.http.get<ApiResponse<DeveloperProfile> | DeveloperProfile>(
      `${this.profilesUrl}/developer/me`,
    ).pipe(
      map((res) => {
        const raw = (res as ApiResponse<DeveloperProfile>)?.data ?? (res as DeveloperProfile);
        if (!raw) throw new Error('Developer profile not found.');
        return this.normalizeProfile(raw);
      }),
    );
  }

  getPublicProjects(userId: string): Observable<PortfolioProjectDto[]> {
    return this.http
      .get<ApiResponse<PortfolioProjectDto[]> | PortfolioProjectDto[]>(
        `${this.profilesUrl}/developers/${userId}/portfolio-projects`,
      )
      .pipe(
        map((res) => {
          const raw =
            (res as ApiResponse<PortfolioProjectDto[]>)?.data ??
            (res as PortfolioProjectDto[]);
          return Array.isArray(raw) ? raw : [];
        }),
      );
  }

  getMyProjects(): Observable<PortfolioProjectDto[]> {
    return this.http
      .get<ApiResponse<PortfolioProjectDto[]> | PortfolioProjectDto[]>(
        `${this.profilesUrl}/developer/me/portfolio-projects`,
      )
      .pipe(
        map((res) => {
          const raw =
            (res as ApiResponse<PortfolioProjectDto[]>)?.data ??
            (res as PortfolioProjectDto[]);
          return Array.isArray(raw) ? raw : [];
        }),
      );
  }

  getSocialLinks(userId?: string | null): Observable<SocialLinkDto[]> {
    // Optional endpoint — fail soft if unavailable.
    const url = userId
      ? `${environment.apiBaseUrl}/api/v1/social-links/user/${userId}`
      : `${environment.apiBaseUrl}/api/v1/social-links/me`;
    return this.http.get<ApiResponse<SocialLinkDto[]> | SocialLinkDto[]>(url).pipe(
      map((res) => {
        const raw =
          (res as ApiResponse<SocialLinkDto[]>)?.data ?? (res as SocialLinkDto[]);
        return Array.isArray(raw) ? raw : [];
      }),
    );
  }

  getPublicReviews(userId: string): Observable<PortfolioReviewDto[]> {
    return this.http
      .get<ApiResponse<PortfolioReviewDto[]> | PortfolioReviewDto[]>(
        `${this.profilesUrl}/developers/${userId}/reviews`,
      )
      .pipe(map((res) => this.normalizeReviews(res)));
  }

  getMyReviews(): Observable<PortfolioReviewDto[]> {
    return this.http
      .get<ApiResponse<PortfolioReviewDto[]> | PortfolioReviewDto[]>(
        `${this.profilesUrl}/developer/me/reviews`,
      )
      .pipe(map((res) => this.normalizeReviews(res)));
  }

  addReview(
    userId: string,
    body: { rating: number; comment?: string | null },
  ): Observable<PortfolioReviewDto> {
    return this.http
      .post<ApiResponse<PortfolioReviewDto> | PortfolioReviewDto>(
        `${this.profilesUrl}/developers/${userId}/reviews`,
        body,
      )
      .pipe(
        map((res) => {
          const raw =
            (res as ApiResponse<PortfolioReviewDto>)?.data ??
            (res as PortfolioReviewDto);
          const [normalized] = this.normalizeReviews([raw]);
          return normalized;
        }),
      );
  }

  private normalizeReviews(
    res: ApiResponse<PortfolioReviewDto[]> | PortfolioReviewDto[],
  ): PortfolioReviewDto[] {
    const raw =
      (res as ApiResponse<PortfolioReviewDto[]>)?.data ??
      (res as PortfolioReviewDto[]);
    if (!Array.isArray(raw)) return [];

    return raw.map((r) => {
      const row = r as PortfolioReviewDto & {
        ModerationStatus?: string | null;
        ModerationWarning?: string | null;
      };
      const createdAt = r.createdAt ?? '';
      const date = createdAt
        ? new Date(createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '';
      return {
        ...r,
        rating: Number(r.rating ?? 0),
        reviewerName: r.reviewerName || 'Client',
        reviewerTitle: r.reviewerTitle || 'Client',
        avatar: r.reviewerAvatar ?? r.avatar ?? null,
        date,
        moderationStatus: r.moderationStatus ?? row.ModerationStatus ?? null,
        moderationWarning: r.moderationWarning ?? row.ModerationWarning ?? null,
      };
    });
  }

  private normalizeProfile(raw: DeveloperProfile): DeveloperProfile {
    const interests = raw.interests ?? [];
    const specialtyTitle =
      raw.title ||
      interests
        .flatMap((i) => i.specialties ?? [])
        .map((s) => s.nameEn || s.nameAr || '')
        .find((n) => !!n.trim()) ||
      null;

    const rating = Number(raw.averageRating ?? 0);
    const jobSuccess =
      raw.jobSuccessRate != null && Number(raw.jobSuccessRate) > 0
        ? Math.round(Number(raw.jobSuccessRate))
        : rating > 0
          ? Math.round(Math.min(5, Math.max(0, rating)) / 5 * 100)
          : 0;

    return {
      ...raw,
      id: raw.id,
      userId: (raw as DeveloperProfile & { userId?: string }).userId,
      interests,
      profileImage: raw.profileImage ?? null,
      bio: raw.bio ?? null,
      country: raw.country ?? '',
      title: specialtyTitle,
      averageRating: rating,
      ratingCount: Number(raw.ratingCount ?? 0),
      jobSuccessRate: jobSuccess,
      totalJobs: Number(raw.totalJobs ?? 0),
      isAvailable: raw.isAvailable ?? true,
    };
  }
}
