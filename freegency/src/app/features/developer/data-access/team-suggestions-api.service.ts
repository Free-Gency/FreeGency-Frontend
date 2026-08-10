import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import { TeamsForMeResponse } from '../models/team-suggestion';

@Injectable({ providedIn: 'root' })
export class TeamSuggestionsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/suggestions/teams-for-me`;
  private readonly joinRequestsUrl = `${environment.apiBaseUrl}/api/v1/TeamJoinRequest/join-requests`;

  getSuggestions(topK = 10): Observable<TeamsForMeResponse> {
    const params = new HttpParams().set('topK', String(topK));

    return this.http
      .get<ApiResponse<TeamsForMeResponse>>(this.baseUrl, { params })
      .pipe(
        map((res) => {
          if (!res?.isSuccess || !res.data) {
            const msg =
              (res as { error?: { message?: string }; message?: string | null } | null)?.error
                ?.message ||
              res?.message ||
              'Failed to fetch team suggestions.';
            throw new Error(msg);
          }
          return {
            ...res.data,
            suggestions: res.data.suggestions ?? [],
            metadata: res.data.metadata ?? { returnedCount: 0, elapsedMs: 0, warnings: [] },
          };
        }),
      );
  }

  /** Existing apply-to-team-job endpoint. */
  applyToTeamJob(jobId: string, coverLetter?: string): Observable<void> {
    return this.http
      .put<void>(this.joinRequestsUrl, { jobId, coverLetter: coverLetter ?? '' })
      .pipe(map(() => void 0));
  }
}
