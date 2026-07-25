import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TaxonomySpecialty {
  id: string;
  nameEn: string;
  nameAr?: string;
}

export interface TaxonomySkill {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class TaxonomyApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getSpecialtiesByCategory(categoryId: string): Observable<TaxonomySpecialty[]> {
    return this.http
      .get<{ data?: TaxonomySpecialty[] | null }>(
        `${this.baseUrl}/api/v1/specialties/category/${categoryId}`,
      )
      .pipe(map((res) => res.data ?? []));
  }

  getSkillsBySpecialty(specialtyId: string): Observable<TaxonomySkill[]> {
    return this.http
      .get<{ data?: TaxonomySkill[] | null }>(
        `${this.baseUrl}/api/v1/specialties/${specialtyId}/skills`,
      )
      .pipe(map((res) => res.data ?? []));
  }

  /** Unique skills across the given specialties. */
  getSkillsForSpecialties(specialtyIds: string[]): Observable<TaxonomySkill[]> {
    const ids = [...new Set(specialtyIds.filter(Boolean))];
    if (!ids.length) return of([]);

    return forkJoin(ids.map((id) => this.getSkillsBySpecialty(id))).pipe(
      map((lists) => {
        const byId = new Map<string, TaxonomySkill>();
        for (const skill of lists.flat()) {
          byId.set(skill.id, skill);
        }
        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
      }),
    );
  }
}
