import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SKIP_LOADING } from '../../../core/http/loading.interceptor';
import { environment } from '../../../../environments/environment';

export interface CategoryDto {
  id: string;
  name: string;
  nameEn: string;
  imageCover: string | null;
}

interface CategoriesApiResponse {
  isSuccess: boolean;
  data?: { items?: CategoryDto[] } | null;
}

@Injectable({ providedIn: 'root' })
export class CategoriesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/categories`;

  getCategories(options?: { skipLoading?: boolean }): Observable<CategoryDto[]> {
    const params = new HttpParams().set('pageNumber', '1').set('pageSize', '30');
    const context =
      options?.skipLoading === false
        ? undefined
        : new HttpContext().set(SKIP_LOADING, true);

    return this.http
      .get<CategoriesApiResponse>(this.baseUrl, { params, context })
      .pipe(map((res) => res.data?.items ?? []));
  }
}
