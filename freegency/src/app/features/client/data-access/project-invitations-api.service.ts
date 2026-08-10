import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SKIP_LOADING } from '../../../core/http/loading.interceptor';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import {
  CreateProjectInvitationRequest,
  ProjectInvitation,
  ProjectInvitationStatus,
} from '../models/project-invitation';

const skipLoading = () => new HttpContext().set(SKIP_LOADING, true);

@Injectable({ providedIn: 'root' })
export class ProjectInvitationsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/project-invitations`;

  create(body: CreateProjectInvitationRequest): Observable<ProjectInvitation> {
    return this.http
      .post<ApiResponse<ProjectInvitation>>(this.baseUrl, body)
      .pipe(map((res) => this.unwrap(res, 'Failed to send invitation.')));
  }

  getSent(status?: ProjectInvitationStatus | null): Observable<ProjectInvitation[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiResponse<ProjectInvitation[]>>(`${this.baseUrl}/sent`, {
        params,
        context: skipLoading(),
      })
      .pipe(map((res) => this.unwrapList(res)));
  }

  getReceived(status?: ProjectInvitationStatus | null): Observable<ProjectInvitation[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiResponse<ProjectInvitation[]>>(`${this.baseUrl}/received`, {
        params,
        context: skipLoading(),
      })
      .pipe(map((res) => this.unwrapList(res)));
  }

  getForTeam(
    teamId: string,
    status?: ProjectInvitationStatus | null,
  ): Observable<ProjectInvitation[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiResponse<ProjectInvitation[]>>(`${this.baseUrl}/teams/${teamId}`, {
        params,
        context: skipLoading(),
      })
      .pipe(map((res) => this.unwrapList(res)));
  }

  accept(id: string): Observable<string> {
    return this.http
      .post<ApiResponse<string>>(`${this.baseUrl}/${id}/accept`, {})
      .pipe(map((res) => this.unwrap(res, 'Failed to accept invitation.')));
  }

  reject(id: string): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${id}/reject`, {})
      .pipe(
        map((res) => {
          if (!res.isSuccess) throw new Error(res.message || 'Failed to reject invitation.');
        }),
      );
  }

  cancel(id: string): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.baseUrl}/${id}/cancel`, {})
      .pipe(
        map((res) => {
          if (!res.isSuccess) throw new Error(res.message || 'Failed to cancel invitation.');
        }),
      );
  }

  private unwrap<T>(res: ApiResponse<T>, fallback: string): T {
    if (!res.isSuccess || res.data == null) {
      throw new Error(res.message || fallback);
    }
    return res.data;
  }

  private unwrapList(res: ApiResponse<ProjectInvitation[]>): ProjectInvitation[] {
    if (!res.isSuccess) throw new Error(res.message || 'Failed to load invitations.');
    return (res.data ?? []).map((i) => this.normalize(i));
  }

  private normalize(raw: ProjectInvitation): ProjectInvitation {
    return {
      id: String(raw.id),
      projectId: String(raw.projectId),
      projectTitle: raw.projectTitle ?? '',
      clientUserId: String(raw.clientUserId),
      clientName: raw.clientName ?? '',
      inviteeType: raw.inviteeType,
      inviteeUserId: raw.inviteeUserId ? String(raw.inviteeUserId) : null,
      inviteeUserName: raw.inviteeUserName ?? null,
      inviteeTeamId: raw.inviteeTeamId ? String(raw.inviteeTeamId) : null,
      inviteeTeamName: raw.inviteeTeamName ?? null,
      message: raw.message ?? '',
      status: raw.status,
      createdAt: raw.createdAt,
      respondedAt: raw.respondedAt ?? null,
      proposalId: raw.proposalId ? String(raw.proposalId) : null,
      chatRoomId: raw.chatRoomId ? String(raw.chatRoomId) : null,
    };
  }
}
