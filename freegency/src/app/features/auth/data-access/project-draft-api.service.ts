import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface GenerateProjectDraftRequest {
  userInput: string;
}

export interface ProjectDraftResponse {
  title: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  needsManualCategoryReview: boolean;
  specialtyIds: string[];
  specialtyNames: string[];
  skillIds: string[];
  skillNames: string[];
}

@Injectable({ providedIn: 'root' })
export class ProjectDraftApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/project-drafts`;

  generate(userInput: string): Observable<ProjectDraftResponse> {
    const body: GenerateProjectDraftRequest = { userInput };
    return this.http.post<ProjectDraftResponse>(`${this.baseUrl}/generate`, body);
  }
}
