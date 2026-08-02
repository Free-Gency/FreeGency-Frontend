import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import {
  PagedTeamJobs,
  Team,
  TeamJob,
  TeamJobDetails,
  TeamPortfolioProject,
} from '../models/team';

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly http = inject(HttpClient);
  private readonly teamsUrl = `${environment.apiBaseUrl}/api/v1/teams`;
  private readonly jobsUrl = `${environment.apiBaseUrl}/api/v1/jobs`;
  private readonly joinUrl = `${environment.apiBaseUrl}/api/v1/TeamJoinRequest`;
  private readonly profilesUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

  getMine(): Observable<Team[]> {
    return this.http.get<ApiResponse<Team[]>>(`${this.teamsUrl}/mine`).pipe(
      map((res) => {
        if (!res.isSuccess || !res.data) {
          throw new Error('Failed to load your teams.');
        }
        return res.data;
      }),
    );
  }

  browse(): Observable<Team[]> {
    return this.http.get<ApiResponse<Team[]>>(this.teamsUrl).pipe(
      map((res) => {
        if (!res.isSuccess || !res.data) {
          throw new Error('Failed to browse teams.');
        }
        return res.data;
      }),
    );
  }

  getById(id: string): Observable<Team> {
    return this.http.get<ApiResponse<Team>>(`${this.teamsUrl}/${id}`).pipe(
      map((res) => {
        if (!res.isSuccess || !res.data) {
          throw new Error('Failed to load team.');
        }
        return res.data;
      }),
    );
  }

  getByCode(teamCode: string): Observable<Team> {
    return this.http
      .get<ApiResponse<Team>>(`${this.teamsUrl}/by-code/${encodeURIComponent(teamCode)}`)
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Team code not found.');
          }
          return res.data;
        }),
      );
  }

  createTeam(input: { name: string; aboutUs?: string; logo?: File | null }): Observable<string> {
    const form = new FormData();
    form.append('Name', input.name);
    if (input.aboutUs?.trim()) {
      form.append('AboutUs', input.aboutUs.trim());
    }
    if (input.logo) {
      form.append('Logo', input.logo, input.logo.name);
    }

    return this.http.post<ApiResponse<string>>(this.teamsUrl, form).pipe(
      map((res) => {
        if (!res.isSuccess || !res.data) {
          throw new Error('Failed to create team.');
        }
        return res.data;
      }),
    );
  }

  joinByCode(code: string, coverLetter?: string): Observable<void> {
    return this.http
      .post(`${this.joinUrl}/join-by-code`, {
        code: code.trim(),
        coverLetter: coverLetter?.trim() || null,
      })
      .pipe(map(() => undefined));
  }

  browseOpenJobs(options?: {
    search?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedTeamJobs> {
    let params = new HttpParams()
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 12))
      .set('sortBy', 'CreatedAt')
      .set('sortDirection', 'desc');

    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedTeamJobs>>(this.jobsUrl, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to load team openings.');
          }
          return {
            ...res.data,
            items: res.data.items ?? [],
          };
        }),
      );
  }

  getTeamJobs(teamId: string): Observable<TeamJob[]> {
    return this.http
      .get<ApiResponse<TeamJob[]>>(`${environment.apiBaseUrl}/api/v1/teams/${teamId}/jobs`)
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to load team jobs.');
          }
          return res.data;
        }),
      );
  }

  getJobDetails(jobId: string): Observable<TeamJobDetails> {
    return this.http.get<ApiResponse<TeamJobDetails>>(`${this.jobsUrl}/${jobId}`).pipe(
      map((res) => {
        if (!res.isSuccess || !res.data) {
          throw new Error('Failed to load opening.');
        }
        return res.data;
      }),
    );
  }

  getTeamPortfolio(teamId: string): Observable<TeamPortfolioProject[]> {
    return this.http
      .get<ApiResponse<TeamPortfolioProject[]>>(
        `${this.profilesUrl}/teams/${teamId}/portfolio-projects`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            return [];
          }
          return res.data ?? [];
        }),
      );
  }
}
