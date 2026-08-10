import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADING } from '../../../core/http/loading.interceptor';

export interface MyModerationStrike {
  id: string;
  category: string;
  categoryLabel: string;
  reason: string;
  userMessage?: string | null;
  sourceType: string;
  createdAt: string;
}

export interface MyModerationStatus {
  hasViolations: boolean;
  strikeCount: number;
  strikeThreshold: number;
  strikeWindowDays: number;
  strikesRemainingUntilRestriction: number;
  isRestricted: boolean;
  restrictedUntil?: string | null;
  restrictionSummary: string;
  recentStrikes: MyModerationStrike[];
}

interface ApiResponse<T> {
  isSuccess?: boolean;
  data?: T | null;
  message?: string | null;
}

const emptyStatus = (): MyModerationStatus => ({
  hasViolations: false,
  strikeCount: 0,
  strikeThreshold: 3,
  strikeWindowDays: 30,
  strikesRemainingUntilRestriction: 3,
  isRestricted: false,
  restrictedUntil: null,
  restrictionSummary: 'No active warnings.',
  recentStrikes: [],
});

@Injectable({ providedIn: 'root' })
export class ModerationStatusService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/api/v1/moderation/me`;

  getMyStatus(): Observable<MyModerationStatus> {
    return this.http
      .get<ApiResponse<MyModerationStatus> | MyModerationStatus>(this.url, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(
        map((res) => {
          const raw =
            (res as ApiResponse<MyModerationStatus>)?.data ??
            (res as MyModerationStatus);
          if (!raw) return emptyStatus();
          return {
            ...emptyStatus(),
            ...raw,
            recentStrikes: Array.isArray(raw.recentStrikes) ? raw.recentStrikes : [],
            hasViolations: !!raw.hasViolations,
            strikeCount: Number(raw.strikeCount ?? 0),
            strikeThreshold: Number(raw.strikeThreshold ?? 3),
            strikeWindowDays: Number(raw.strikeWindowDays ?? 30),
            strikesRemainingUntilRestriction: Number(
              raw.strikesRemainingUntilRestriction ?? 0,
            ),
            isRestricted: !!raw.isRestricted,
          };
        }),
        catchError(() => of(emptyStatus())),
      );
  }
}
