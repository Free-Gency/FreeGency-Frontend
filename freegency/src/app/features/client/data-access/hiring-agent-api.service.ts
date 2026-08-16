import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';

export type HiringAgentRunStatus =
  | 'Queued'
  | 'Inviting'
  | 'WaitingAccepts'
  | 'Discussing'
  | 'Ranking'
  | 'ReportReady'
  | 'Hired'
  | 'Cancelled'
  | 'Failed'
  | 'Dismissed';

export type HiringAgentCandidateStatus =
  | 'Suggested'
  | 'Invited'
  | 'Accepted'
  | 'Rejected'
  | 'Discussing'
  | 'PlanProposed'
  | 'Ranked'
  | 'InviteFailed'
  | 'Expired';

export type HiringAgentInviteeType = 'User' | 'Team';

export interface StartHiringAgentRunRequest {
  projectId: string;
  topK?: number | null;
  inviteWindowHours?: number | null;
  discussionWindowHours?: number | null;
}

export interface HiringAgentCandidate {
  id: string;
  inviteeType: HiringAgentInviteeType;
  inviteeUserId: string | null;
  inviteeTeamId: string | null;
  displayName: string;
  avatarUrl: string | null;
  suggestionScore: number;
  rankOrder: number;
  status: HiringAgentCandidateStatus;
  invitationId: string | null;
  proposalId: string | null;
  chatRoomId: string | null;
  latestPlanVersionId: string | null;
  discussionScore: number | null;
  discussionNotes: string | null;
  agentMessageCount: number;
}

export interface HiringAgentRun {
  id: string;
  projectId: string;
  projectTitle: string;
  status: HiringAgentRunStatus;
  topK: number;
  inviteDeadlineUtc: string;
  discussionDeadlineUtc: string;
  recommendedProposalId: string | null;
  recommendedPlanVersionId: string | null;
  recommendedCandidateId: string | null;
  failureReason: string | null;
  createdAt: string;
  reportReadyAt: string | null;
  completedAt: string | null;
  clientHireApprovedAt: string | null;
  candidates: HiringAgentCandidate[];
}

export interface HiringAgentRankedDiscussion {
  candidateId: string;
  displayName: string;
  score: number;
  rank: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  chatRoomId: string | null;
  planVersionId: string | null;
  hasMilestonePlan: boolean;
}

export interface HiringAgentReport {
  runId: string;
  projectId: string;
  projectTitle: string;
  status: HiringAgentRunStatus;
  summary: string;
  recommended: HiringAgentCandidate | null;
  recommendedPlanVersionId: string | null;
  rankedDiscussions: HiringAgentRankedDiscussion[];
  risks: string[];
  reportReadyAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class HiringAgentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/hiring-agent`;

  start(body: StartHiringAgentRunRequest): Observable<HiringAgentRun> {
    return this.http
      .post<ApiResponse<HiringAgentRun>>(`${this.baseUrl}/runs`, body)
      .pipe(map((res) => this.unwrap(res, 'Failed to start hiring agent.')));
  }

  listMine(): Observable<HiringAgentRun[]> {
    return this.http
      .get<ApiResponse<HiringAgentRun[]>>(`${this.baseUrl}/runs`)
      .pipe(map((res) => this.unwrapList(res)));
  }

  getRun(id: string): Observable<HiringAgentRun> {
    return this.http
      .get<ApiResponse<HiringAgentRun>>(`${this.baseUrl}/runs/${id}`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load hiring agent run.')));
  }

  getByProject(projectId: string): Observable<HiringAgentRun> {
    return this.http
      .get<ApiResponse<HiringAgentRun>>(`${this.baseUrl}/runs/by-project/${projectId}`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load hiring agent run for project.')));
  }

  getReport(id: string): Observable<HiringAgentReport> {
    return this.http
      .get<ApiResponse<HiringAgentReport>>(`${this.baseUrl}/runs/${id}/report`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load hiring agent report.')));
  }

  confirmHire(id: string, candidateId?: string | null): Observable<string> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/runs/${id}/confirm-hire`, {
        candidateId: candidateId || null,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess) throw new Error(res.message || 'Failed to confirm hire.');
          return res.message || 'Hire confirmed.';
        }),
      );
  }

  dismiss(id: string): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/runs/${id}/dismiss`, {}).pipe(
      map((res) => {
        if (!res.isSuccess) throw new Error(res.message || 'Failed to dismiss report.');
      }),
    );
  }

  cancel(id: string): Observable<void> {
    return this.http.post<ApiResponse<unknown>>(`${this.baseUrl}/runs/${id}/cancel`, {}).pipe(
      map((res) => {
        if (!res.isSuccess) throw new Error(res.message || 'Failed to cancel hiring agent run.');
      }),
    );
  }

  closeInvites(id: string): Observable<HiringAgentRun> {
    return this.http
      .post<ApiResponse<HiringAgentRun>>(`${this.baseUrl}/runs/${id}/close-invites`, {})
      .pipe(map((res) => this.unwrap(res, 'Failed to close pending invites.')));
  }

  private unwrap<T>(res: ApiResponse<T>, fallback: string): T {
    if (!res.isSuccess || res.data == null) {
      throw new Error(res.message || fallback);
    }
    return res.data;
  }

  private unwrapList(res: ApiResponse<HiringAgentRun[]>): HiringAgentRun[] {
    if (!res.isSuccess) throw new Error(res.message || 'Failed to load hiring agent runs.');
    return res.data ?? [];
  }
}
