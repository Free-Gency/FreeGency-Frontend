import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import { TeamSuggestionResponse } from '../models/team-suggestion';

@Injectable({ providedIn: 'root' })
export class TeamSuggestionsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/team-suggestions`;
  private readonly joinRequestsUrl = `${environment.apiBaseUrl}/api/v1/TeamJoinRequest/join-requests`;

  getSuggestions(topK = 10): Observable<TeamSuggestionResponse> {
    const params = new HttpParams().set('topK', String(topK));

    return this.http
      .get<ApiResponse<TeamSuggestionResponse>>(this.baseUrl, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) throw new Error('Failed to fetch team suggestions.');
          return { ...res.data, rankedTeams: res.data.rankedTeams ?? [] };
        }),
      );
  }

  /** Calls the EXISTING apply-to-team-job endpoint. */
  applyToTeamJob(jobId: string, coverLetter?: string): Observable<void> {
    return this.http
      .put<void>(this.joinRequestsUrl, { jobId, coverLetter: coverLetter ?? '' })
      .pipe(map(() => void 0));
  }
}
