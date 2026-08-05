import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectMilestone } from '../models/project-milestone';
import { ProjectEscrow } from '../models/project-escrow';
import {
  MilestonePlanVersion,
  ProposeMilestonePlanPayload,
  RequestPlanChangesPayload,
} from '../models/milestone-plan';

@Injectable({ providedIn: 'root' })
export class ProjectMilestonesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

  getMilestones(projectId: string): Observable<ProjectMilestone[]> {
    return this.http
      .get<{ isSuccess: boolean; data?: ProjectMilestone[]; message?: string | null }>(
        `${this.baseUrl}/projects/${projectId}/milestones`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load milestones.');
          }
          return res.data;
        }),
      );
  }

  getEscrow(projectId: string): Observable<ProjectEscrow> {
    return this.http
      .get<{ isSuccess: boolean; data?: ProjectEscrow; message?: string | null }>(
        `${this.baseUrl}/projects/${projectId}/escrow`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load escrow.');
          }
          return res.data;
        }),
      );
  }

  getPlanVersions(projectId: string): Observable<MilestonePlanVersion[]> {
    return this.http
      .get<{ isSuccess: boolean; data?: MilestonePlanVersion[]; message?: string | null }>(
        `${this.baseUrl}/projects/${projectId}/milestone-plans`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load milestone plans.');
          }
          return res.data;
        }),
      );
  }

  getLatestPlan(projectId: string): Observable<MilestonePlanVersion> {
    return this.http
      .get<{ isSuccess: boolean; data?: MilestonePlanVersion; message?: string | null }>(
        `${this.baseUrl}/projects/${projectId}/milestone-plans/latest`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load latest plan.');
          }
          return res.data;
        }),
      );
  }

  proposePlan(payload: ProposeMilestonePlanPayload): Observable<MilestonePlanVersion> {
    return this.http
      .post<Record<string, unknown>>(
        `${this.baseUrl}/milestone-plans`,
        payload,
      )
      .pipe(
        map((res) => {
          const isSuccess = !!(res['isSuccess'] ?? res['IsSuccess']);
          const data = (res['data'] ?? res['Data']) as MilestonePlanVersion | undefined;
          const message = String(res['message'] ?? res['Message'] ?? '').trim();
          const nestedError = (res['error'] ?? res['Error']) as { message?: string; Message?: string } | null;
          const errorMessage = String(nestedError?.message ?? nestedError?.Message ?? '').trim();

          if (!isSuccess || !data) {
            throw new Error(errorMessage || message || 'Failed to propose plan.');
          }
          return data;
        }),
      );
  }

  requestPlanChanges(payload: RequestPlanChangesPayload): Observable<void> {
    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/milestone-plans/request-changes`,
        payload,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to request changes.');
          }
        }),
      );
  }

  acceptPlan(planVersionId: string): Observable<void> {
    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/milestone-plans/${planVersionId}/accept`,
        null,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to accept plan.');
          }
        }),
      );
  }

  fundNext(projectId: string): Observable<void> {
    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/projects/${projectId}/milestones/fund-next`,
        null,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to fund milestone.');
          }
        }),
      );
  }

  submitMilestone(milestoneId: string): Observable<void> {
    return this.postMilestoneAction(milestoneId, 'submit');
  }

  approveRelease(milestoneId: string): Observable<void> {
    return this.postMilestoneAction(milestoneId, 'approve-release');
  }

  requestWorkChanges(milestoneId: string, comment: string): Observable<void> {
    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/milestones/${milestoneId}/request-work-changes`,
        { comment },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to request work changes.');
          }
        }),
      );
  }

  private postMilestoneAction(milestoneId: string, action: string): Observable<void> {
    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/milestones/${milestoneId}/${action}`,
        null,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || `Failed to ${action}.`);
          }
        }),
      );
  }
}
