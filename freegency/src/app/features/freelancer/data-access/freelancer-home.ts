import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { DeveloperProfileSummary } from '../../../shared/models/developer-profile.model';

import {
  ProjectFeedParams,
  ProjectFeedResponse,
} from '../../../shared/models/freelancer-home.model';

@Injectable({
  providedIn: 'root',
})
export class FreelancerHome {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getProjectsFeed(paramsData: ProjectFeedParams): Observable<ProjectFeedResponse> {
    let params = new HttpParams()
      .set('pageNumber', (paramsData.page || 1).toString())
      .set('pageSize', (paramsData.pageSize || 6).toString());

    if (paramsData.category && paramsData.category !== 'ALL') {
      params = params.set('categoryId', paramsData.category);
    }

    if (paramsData.search && paramsData.search.trim()) {
      params = params.set('search', paramsData.search.trim());
    }

    return this.http.get<any>(`${this.baseUrl}/api/v1/projects`, { params }).pipe(
      map((res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.$values || [];
        const total = res?.totalCount || res?.total || list.length;
        return { data: list, totalCount: total };
      }),
      catchError((error) => {
        console.error('Error fetching project feed:', error);
        return of({ data: [], totalCount: 0 });
      }),
    );
  }

  getMyApplications(page = 1, pageSize = 6): Observable<{ data: any[]; totalCount: number }> {
    const params = new HttpParams()
      .set('sortBy', 'AppliedAt')
      .set('sortDirection', 'desc')
      .set('pageNumber', page.toString())
      .set('pageSize', pageSize.toString());

    return this.http.get<any>(`${this.baseUrl}/api/v1/proposals`, { params }).pipe(
      map((res) => {
        const list = Array.isArray(res) ? res : res?.data || res?.$values || [];
        const total = res?.totalCount || res?.total || list.length;
        return { data: list, totalCount: total };
      }),
      catchError((error) => {
        console.error('Error fetching proposals:', error);
        return of({ data: [], totalCount: 0 });
      }),
    );
  }

  getSavedProjects(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/api/v1/projects/saved`).pipe(
      map((res) => (Array.isArray(res) ? res : res?.data || res?.$values || [])),
      catchError((error) => {
        console.error('Error fetching saved projects:', error);
        return of([]);
      }),
    );
  }

  getProfileSummary(): Observable<DeveloperProfileSummary | null> {
    const profile$ = this.http.get<any>(`${this.baseUrl}/api/v1/profiles/developer/me`).pipe(
      map((res) => res?.data || res),
      catchError(() => of(null)),
    );

    const portfolio$ = this.http
      .get<any>(`${this.baseUrl}/api/v1/profiles/developer/me/portfolio-projects`)
      .pipe(
        map((res) => res?.data || res || []),
        catchError(() => of([])),
      );

    return forkJoin({ profile: profile$, portfolio: portfolio$ }).pipe(
      map(({ profile, portfolio }) => {
        if (!profile) return null;

        const missingSteps: string[] = [];
        let earnedScore = 0;

        if (profile.bio && profile.bio.trim().length > 0) {
          earnedScore += 25;
        } else {
          missingSteps.push('Add bio');
        }

        if (profile.profileImage) {
          earnedScore += 25;
        } else {
          missingSteps.push('Upload profile picture');
        }

        if (Array.isArray(profile.interests) && profile.interests.length > 0) {
          earnedScore += 25;
        } else {
          missingSteps.push('Add skills & interests');
        }

        if (Array.isArray(portfolio) && portfolio.length > 0) {
          earnedScore += 25;
        } else {
          missingSteps.push('Upload portfolio project');
        }

        return {
          ...profile,
          fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
          completion: {
            percentage: earnedScore,
            missingSteps,
          },
        };
      }),
    );
  }

  getCategories(): Observable<any[]> {
    const params = new HttpParams()
      .set('pageNumber', '1')
      .set('pageSize', '10')
      .set('sortBy', 'Name')
      .set('sortDirection', 'asc');

    return this.http.get<any>(`${this.baseUrl}/api/v1/categories`, { params }).pipe(
      map((res) => {
        const items = res?.data?.items || res?.data || res || [];
        return [{ id: 'ALL', name: 'ALL', nameEn: 'ALL' }, ...items];
      }),
      catchError(() => of([{ id: 'ALL', name: 'ALL', nameEn: 'ALL' }])),
    );
  }

  toggleSaveProject(projectId: string, isCurrentlySaved: boolean): Observable<boolean> {
    const url = `${this.baseUrl}/api/v1/projects/${projectId}/save`;

    const request$ = isCurrentlySaved ? this.http.delete<any>(url) : this.http.post<any>(url, {});

    return request$.pipe(
      map(() => true),
      catchError((error) => {
        console.error('Error toggling saved status:', error);
        return of(false);
      }),
    );
  }
}
