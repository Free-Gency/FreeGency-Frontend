import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import { Project } from '../../../shared/models/Project';
import { Proposal, PagedResponse, ProposalStatus } from '../../../shared/models/Proposal';
import { Wallet } from '../../../shared/models/Wallet';
import { ProjectMilestonesApiService } from '../../project/data-access/project-milestones-api.service';
import { ProjectMilestone } from '../../project/models/project-milestone';
import { ProjectEscrow } from '../../project/models/project-escrow';
import { buildMilestoneProgressSummary } from '../pages/manage-work/milestones/milestone-progress.util';

export interface MyProjectsSummary {
  total: number;
  draft: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface ClientFinanceSnapshot {
  availableBalance: number;
  totalLockedInEscrow: number;
  releasedToDate: number;
  activeEscrowProjects: number;
  currency: string;
}

export interface ManageWorkAttentionSnapshot {
  proposalsToReview: number;
  milestonesAwaitingApproval: number;
}

export interface ProposalMatchSummary {
  matchedRequiredSkills: number;
  totalRequiredSkills: number;
  matchedPreferredSkills: number;
  totalPreferredSkills: number;
  missingSkills?: string[] | null;
  fitVerdict?: string | null;
}

export interface RankedProposal {
  candidateId: string;
  candidateName: string;
  rank: number;
  overallScore: number;
  aiReasoning?: string | null;
  matchSummary?: ProposalMatchSummary | null;
}

export interface ProjectRankingResponse {
  projectId: string;
  rankedProposals: RankedProposal[];
  aiSummary?: string | null;
  metadata?: {
    totalCandidatesEvaluated: number;
    returnedCount: number;
    usedAiEmbeddings: boolean;
    fromCache: boolean;
    warnings?: string[] | null;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ManageWorkService {
  private readonly http = inject(HttpClient);
  private readonly milestonesApi = inject(ProjectMilestonesApiService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;
  private readonly proposalsUrl = `${environment.apiBaseUrl}/api/v1/proposals`;
  private readonly walletUrl = `${environment.apiBaseUrl}/api/v1/Wallet`;

  getMyWallet(): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.walletUrl}/me`).pipe(
      map((data) => {
        if (!data) throw new Error('Failed to fetch wallet.');
        return data;
      }),
    );
  }

  /** Wallet balance + escrow totals across the client's projects. */
  getClientFinanceSnapshot(): Observable<ClientFinanceSnapshot> {
    return forkJoin({
      wallet: this.getMyWallet().pipe(
        catchError(() =>
          of({
            id: '',
            userId: '',
            currency: 'USD',
            available: 0,
            reserved: 0,
            pending: 0,
          } satisfies Wallet),
        ),
      ),
      projects: this.getMyProjects({
        role: 'as-client',
        status: 'in-progress',
        pageNumber: 1,
        pageSize: 50,
      }).pipe(
        catchError(() =>
          of({
            items: [],
            totalCount: 0,
            pageNumber: 1,
            pageSize: 50,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          } satisfies PagedResponse<Project>),
        ),
      ),
    }).pipe(
      switchMap(({ wallet, projects }) => {
        const list = projects.items ?? [];
        if (list.length === 0) {
          return of({
            availableBalance: Number(wallet.available ?? 0),
            totalLockedInEscrow: 0,
            releasedToDate: 0,
            activeEscrowProjects: 0,
            currency: wallet.currency || 'USD',
          } satisfies ClientFinanceSnapshot);
        }

        return forkJoin(
          list.map((project) =>
            this.milestonesApi.getEscrow(project.id).pipe(catchError(() => of(null as ProjectEscrow | null))),
          ),
        ).pipe(
          map((escrows) => {
            let locked = 0;
            let released = 0;
            let active = 0;
            for (const escrow of escrows) {
              if (!escrow) continue;
              const remaining = Number(escrow.remaining ?? 0);
              const totalReleased = Number(escrow.totalReleased ?? 0);
              locked += remaining;
              released += totalReleased;
              if (remaining > 0) active += 1;
            }
            return {
              availableBalance: Number(wallet.available ?? 0),
              totalLockedInEscrow: locked,
              releasedToDate: released,
              activeEscrowProjects: active,
              currency: wallet.currency || 'USD',
            } satisfies ClientFinanceSnapshot;
          }),
        );
      }),
    );
  }

  getAttentionSnapshot(): Observable<ManageWorkAttentionSnapshot> {
    return forkJoin({
      pending: this.getProposals({
        status: 'Pending',
        pageNumber: 1,
        pageSize: 1,
      }).pipe(
        catchError(() =>
          of({
            items: [],
            totalCount: 0,
            pageNumber: 1,
            pageSize: 1,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          } satisfies PagedResponse<Proposal>),
        ),
      ),
      viewed: this.getProposals({
        status: 'Viewed',
        pageNumber: 1,
        pageSize: 1,
      }).pipe(
        catchError(() =>
          of({
            items: [],
            totalCount: 0,
            pageNumber: 1,
            pageSize: 1,
            totalPages: 0,
            hasPreviousPage: false,
            hasNextPage: false,
          } satisfies PagedResponse<Proposal>),
        ),
      ),
      milestones: this.getMilestonesAwaitingApprovalCount(),
    }).pipe(
      map(({ pending, viewed, milestones }) => ({
        proposalsToReview: (pending.totalCount ?? 0) + (viewed.totalCount ?? 0),
        milestonesAwaitingApproval: milestones,
      })),
    );
  }

  /** Count milestones waiting for client approve-release. */
  getMilestonesAwaitingApprovalCount(): Observable<number> {
    return this.getMyProjects({
      role: 'as-client',
      status: 'in-progress',
      pageNumber: 1,
      pageSize: 50,
    }).pipe(
      switchMap((page) => {
        const projects = page.items ?? [];
        if (projects.length === 0) return of(0);

        return forkJoin(
          projects.map((project) =>
            this.milestonesApi
              .getMilestones(project.id)
              .pipe(catchError(() => of([] as ProjectMilestone[]))),
          ),
        ).pipe(
          map((lists) =>
            lists.reduce(
              (sum, milestones) =>
                sum +
                milestones.filter(
                  (m) => m.workStatus === 'Submitted' && m.releaseStatus === 'Pending',
                ).length,
              0,
            ),
          ),
        );
      }),
      catchError(() => of(0)),
    );
  }

  getMyProjects(options?: {
    role?: 'as-client' | 'as-assignee';
    pageNumber?: number;
    pageSize?: number;
    status?: string | null;
    search?: string | null;
    sortBy?: 'CreatedAt' | 'Title' | 'Budget';
    sortDirection?: 'asc' | 'desc';
  }): Observable<PagedResponse<Project>> {
    let params = new HttpParams()
      .set('role', options?.role ?? 'as-client')
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 10))
      .set('sortBy', options?.sortBy ?? 'CreatedAt')
      .set('sortDirection', options?.sortDirection ?? 'desc');

    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedResponse<Project>>>(`${this.baseUrl}/mine`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to fetch projects.');
          }
          return { ...res.data, items: res.data.items ?? [] };
        }),
      );
  }

  /** Total counts (not paginated) — for tab/sidebar badges */
  getMyProjectsSummary(
    role: 'as-client' | 'as-assignee' = 'as-client',
  ): Observable<MyProjectsSummary> {
    const params = new HttpParams().set('role', role);

    return this.http
      .get<ApiResponse<MyProjectsSummary>>(`${this.baseUrl}/mine/summary`, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to fetch projects summary.');
          }
          return res.data;
        }),
      );
  }

  /** Count of InProgress projects where client can fund or approve a milestone. */
  getMilestonesNeedsActionCount(): Observable<number> {
    return this.getMyProjects({
      role: 'as-client',
      status: 'in-progress',
      pageNumber: 1,
      pageSize: 50,
    }).pipe(
      switchMap((page) => {
        const projects = page.items ?? [];
        if (projects.length === 0) return of(0);

        return forkJoin(
          projects.map((project) =>
            forkJoin({
              milestones: this.milestonesApi
                .getMilestones(project.id)
                .pipe(catchError(() => of([] as ProjectMilestone[]))),
              escrow: this.milestonesApi
                .getEscrow(project.id)
                .pipe(catchError(() => of(null as ProjectEscrow | null))),
            }).pipe(
              map(({ milestones, escrow }) =>
                buildMilestoneProgressSummary(milestones, escrow).needsAction ? 1 : 0,
              ),
            ),
          ),
        ).pipe(map((flags) => flags.reduce((sum: number, n) => sum + n, 0)));
      }),
      catchError(() => of(0)),
    );
  }

  /** Progress summaries keyed by project id (for My Projects cards). */
  getMilestoneProgressByProjectIds(
    projectIds: string[],
  ): Observable<Record<string, ReturnType<typeof buildMilestoneProgressSummary>>> {
    const ids = [...new Set(projectIds.filter(Boolean))];
    if (ids.length === 0) return of({});

    return forkJoin(
      ids.map((projectId) =>
        forkJoin({
          milestones: this.milestonesApi
            .getMilestones(projectId)
            .pipe(catchError(() => of([] as ProjectMilestone[]))),
          escrow: this.milestonesApi
            .getEscrow(projectId)
            .pipe(catchError(() => of(null as ProjectEscrow | null))),
        }).pipe(
          map(({ milestones, escrow }) => ({
            projectId,
            summary: buildMilestoneProgressSummary(milestones, escrow),
          })),
        ),
      ),
    ).pipe(
      map((rows) => {
        const out: Record<string, ReturnType<typeof buildMilestoneProgressSummary>> = {};
        for (const row of rows) out[row.projectId] = row.summary;
        return out;
      }),
      catchError(() => of({})),
    );
  }

  // --- Members (stub until roster UI) ---
  getMembers(_projectId: string): Observable<unknown[]> {
    return of([]);
  }

  // --- Proposals ---
  getProposals(options?: {
    projectId?: string;
    status?: ProposalStatus;
    search?: string | null;
    sortBy?: 'AppliedAt' | 'ProposedBudget';
    sortDirection?: 'asc' | 'desc';
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedResponse<Proposal>> {
    let params = new HttpParams()
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 10))
      .set('sortBy', options?.sortBy ?? 'AppliedAt')
      .set('sortDirection', options?.sortDirection ?? 'desc');

    if (options?.projectId) {
      params = params.set('projectId', options.projectId);
    }
    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedResponse<Proposal>>>(this.proposalsUrl, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to fetch proposals.');
          }
          return { ...res.data, items: res.data.items ?? [] };
        }),
      );
  }

  getProposalsForProject(projectId: string, status?: ProposalStatus): Observable<Proposal[]> {
    return this.getProposals({ projectId, status }).pipe(map((page) => page.items));
  }

  getProposalRanking(projectId: string, topK = 50): Observable<ProjectRankingResponse> {
    const params = new HttpParams().set('topK', String(topK));

    return this.http
      .get<ApiResponse<ProjectRankingResponse>>(`${this.baseUrl}/${projectId}/proposal-ranking`, {
        params,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to rank proposals.');
          }
          return {
            ...res.data,
            rankedProposals: res.data.rankedProposals ?? [],
          };
        }),
      );
  }

  viewProposal(id: string): Observable<void> {
    return this.postProposalAction(id, 'view');
  }

  startDiscussion(id: string): Observable<string> {
    return this.http
      .post<ApiResponse<string> & { message?: string | null; error?: { message?: string } | null }>(
        `${this.proposalsUrl}/${id}/start-discussion`,
        {},
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(
              res.message || res.error?.message || 'Failed to start discussion.',
            );
          }
          return res.data;
        }),
      );
  }

  closeDiscussion(id: string): Observable<void> {
    return this.postProposalAction(id, 'close-discussion');
  }

  rejectProposal(id: string): Observable<void> {
    return this.postProposalAction(id, 'reject');
  }

  private postProposalAction(id: string, action: string): Observable<void> {
    return this.http
      .post<ApiResponse<void> & { message?: string | null; error?: { message?: string } | null }>(
        `${this.proposalsUrl}/${id}/${action}`,
        {},
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(
              res.message || res.error?.message || `Failed to ${action.replace(/-/g, ' ')}.`,
            );
          }
        }),
      );
  }
}
