import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADING } from '../../../core/http/loading.interceptor';
import { ApiResponse } from '../../../shared/models/ApiResponse';

export type PlanFeatureType =
  | 'CreateProject'
  | 'GenerateProjectDraft'
  | 'HiringAgent'
  | 'AIChat'
  | 'SendInvitation'
  | 'SendProposal'
  | 'TeamSuggestions';

export interface EntitlementCheck {
  feature: string;
  isAllowed: boolean;
  isEnabled: boolean;
  limit: number | null;
  used: number;
  remaining: number;
  planName: string;
  message: string | null;
}

export interface ProjectDraftEligibility {
  canCreateProject: boolean;
  canGenerateDraft: boolean;
  createProject: EntitlementCheck;
  generateProjectDraft: EntitlementCheck;
  message: string | null;
}

@Injectable({ providedIn: 'root' })
export class EntitlementsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/entitlements`;
  private readonly draftsUrl = `${environment.apiBaseUrl}/api/v1/project-drafts`;

  canConsume(feature: PlanFeatureType): Observable<EntitlementCheck> {
    return this.http
      .get<ApiResponse<EntitlementCheck>>(`${this.baseUrl}/${feature}/can-consume`, {
        context: new HttpContext().set(SKIP_LOADING, true),
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || `Could not check ${feature} entitlement.`);
          }
          return res.data;
        }),
      );
  }

  /** Soft check for AI create flow — no LLM, no quota consume. */
  getProjectDraftEligibility(): Observable<ProjectDraftEligibility> {
    return this.http
      .get<ApiResponse<ProjectDraftEligibility>>(`${this.draftsUrl}/eligibility`)
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Could not check project draft eligibility.');
          }
          return res.data;
        }),
      );
  }
}
