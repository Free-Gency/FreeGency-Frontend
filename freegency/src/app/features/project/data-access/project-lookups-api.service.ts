import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CategoryOption, SkillOption, SpecialtyOption } from '../models/project-lookup';


@Injectable({ providedIn: 'root' })
export class ProjectLookupsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

  private readonly largePage = { pageSize: '200' };

  getCategories(): Observable<CategoryOption[]> {
    return this.http
      .get<{ isSuccess: boolean; data?: { items: CategoryOption[] }; message?: string | null }>(
        `${this.baseUrl}/categories`,
        { params: this.largePage },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load categories.');
          }
          return res.data.items;
        }),
      );
  }

  getSpecialties(categoryId?: string): Observable<SpecialtyOption[]> {
    return this.http
      .get<{ isSuccess: boolean; data?: { items: SpecialtyOption[] }; message?: string | null }>(
        `${this.baseUrl}/specialties`,
        { params: categoryId ? { ...this.largePage, categoryId } : this.largePage },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load specialties.');
          }
          return res.data.items;
        }),
      );
  }

  getSkills(): Observable<SkillOption[]> {
    return this.http
      .get<{ isSuccess: boolean; data?: { items: SkillOption[] }; message?: string | null }>(
        `${this.baseUrl}/skills`,
        { params: this.largePage },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load skills.');
          }
          return res.data.items;
        }),
      );
  }
}