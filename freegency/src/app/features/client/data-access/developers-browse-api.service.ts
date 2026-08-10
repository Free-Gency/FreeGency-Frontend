import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SKIP_LOADING } from '../../../core/http/loading.interceptor';
import { environment } from '../../../../environments/environment';
import { PagedResponse } from '../../../shared/models/PagedResponse';

export interface DeveloperBrowseItem {
  userId: string;
  profileId: string;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  bio: string | null;
  title: string | null;
  averageRating: number;
  ratingCount: number;
  country: string;
  skills: string[];
  categories: string[];
}

@Injectable({ providedIn: 'root' })
export class DevelopersBrowseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/profiles/developers`;

  browse(options?: {
    search?: string;
    categoryId?: string | null;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedResponse<DeveloperBrowseItem>> {
    let params = new HttpParams()
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 12));

    if (options?.search?.trim()) params = params.set('search', options.search.trim());
    if (options?.categoryId?.trim()) params = params.set('categoryId', options.categoryId.trim());

    return this.http
      .get<PagedResponse<DeveloperBrowseItem>>(this.baseUrl, {
        params,
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(
        map((res) => ({
          ...res,
          items: (res.items ?? []).map((d) => ({
            ...d,
            userId: String(d.userId),
            profileId: String(d.profileId),
            skills: d.skills ?? [],
            categories: d.categories ?? [],
          })),
        })),
      );
  }
}
