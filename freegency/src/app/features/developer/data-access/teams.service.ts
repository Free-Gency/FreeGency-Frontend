import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SKIP_LOADING } from '../../../core/http/loading.interceptor';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import {
  PagedTeamJobs,
  PagedTeamJoinRequests,
  PagedTeams,
  Team,
  TeamJob,
  TeamJobDetails,
  TeamJoinRequest,
  TeamMemberRow,
  TeamPortfolioProject,
} from '../models/team';


export interface TeamPortfolioRoadmapStepInput {
  title: string;
  sortOrder?: number;
  isDone?: boolean;
}

export interface TeamPortfolioMetricInput {
  value: string;
  label: string;
  sortOrder?: number;
}

export interface TeamPortfolioWriteInput {
  title: string;
  description?: string;
  budget?: number | string | null;
  projectUrl?: string | null;
  prototypeUrl?: string | null;
  completionDate?: string | null;
  categoryId?: string | null;
  visibility?: string;
  challenge?: string | null;
  solution?: string | null;
  durationLabel?: string | null;
  industry?: string | null;
  teamLeads?: string | null;
  testimonialQuote?: string | null;
  testimonialAuthorName?: string | null;
  testimonialAuthorTitle?: string | null;
  testimonialAuthorAvatarUrl?: string | null;
  skillIds?: string[];
  roadmapSteps?: TeamPortfolioRoadmapStepInput[];
  metrics?: TeamPortfolioMetricInput[];
  images?: File[];
}

export interface TeamReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerUserId?: string | null;
  reviewerName: string;
  reviewerAvatar: string | null;
}

const skipLoadingCtx = () => new HttpContext().set(SKIP_LOADING, true);

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly http = inject(HttpClient);
  private readonly teamsUrl = `${environment.apiBaseUrl}/api/v1/teams`;
  private readonly jobsUrl = `${environment.apiBaseUrl}/api/v1/jobs`;
  private readonly joinUrl = `${environment.apiBaseUrl}/api/v1/TeamJoinRequest`;
  private readonly profilesUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

  getMine(): Observable<Team[]> {
    return this.http
      .get<ApiResponse<Team[]>>(`${this.teamsUrl}/mine`, { context: skipLoadingCtx() })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to load your teams.');
          }
          return res.data.map((team) => this.normalizeTeam(team));
        }),
      );
  }

  browse(options?: {
    search?: string;
    categoryId?: string | null;
    pageNumber?: number;
    pageSize?: number;
    excludeMine?: boolean;
  }): Observable<PagedTeams> {
    let params = new HttpParams()
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 9))
      .set('excludeMine', String(options?.excludeMine ?? true));

    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }
    if (options?.categoryId?.trim()) {
      params = params.set('categoryId', options.categoryId.trim());
    }

    return this.http.get<ApiResponse<PagedTeams>>(this.teamsUrl, { params, context: skipLoadingCtx() }).pipe(
      map((res) => {
        if (!res.isSuccess || !res.data) {
          throw new Error('Failed to browse teams.');
        }
        const raw = res.data;
        const items = (raw.items ?? []).map((team) => this.normalizeTeam(team));
        return {
          items,
          pageNumber: raw.pageNumber ?? options?.pageNumber ?? 1,
          pageSize: raw.pageSize ?? options?.pageSize ?? 9,
          totalCount: raw.totalCount ?? items.length,
          totalPages: raw.totalPages,
          hasPreviousPage: raw.hasPreviousPage,
          hasNextPage: raw.hasNextPage,
        };
      }),
    );
  }

  getById(id: string, options?: { skipLoading?: boolean }): Observable<Team> {
    return this.http
      .get<ApiResponse<Team>>(`${this.teamsUrl}/${id}`, {
        context: options?.skipLoading ? skipLoadingCtx() : undefined,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to load team.');
          }
          return this.normalizeTeam(res.data);
        }),
      );
  }

  getTeamReviews(teamId: string, options?: { skipLoading?: boolean }): Observable<TeamReview[]> {
    return this.http
      .get<ApiResponse<TeamReview[]>>(`${this.teamsUrl}/${teamId}/reviews`, {
        context: options?.skipLoading ? skipLoadingCtx() : undefined,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load team reviews.');
          }
          return (res.data as TeamReview[]).map((r) => this.normalizeTeamReview(r));
        }),
      );
  }

  addTeamReview(
    teamId: string,
    body: { rating: number; comment?: string | null },
  ): Observable<TeamReview> {
    return this.http
      .post<ApiResponse<TeamReview>>(`${this.teamsUrl}/${teamId}/reviews`, {
        rating: body.rating,
        comment: body.comment?.trim() || null,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to submit team review.');
          }
          return this.normalizeTeamReview(res.data);
        }),
      );
  }

  getByCode(teamCode: string): Observable<Team> {
    return this.http
      .get<ApiResponse<Team>>(`${this.teamsUrl}/by-code/${encodeURIComponent(teamCode)}`)
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Team code not found.');
          }
          return this.normalizeTeam(res.data);
        }),
      );
  }

  getMembers(teamId: string): Observable<TeamMemberRow[]> {
    return this.http.get<ApiResponse<TeamMemberRow[]>>(`${this.teamsUrl}/${teamId}/members`).pipe(
      map((res) => {
        if (!res.isSuccess || !res.data) {
          throw new Error('Failed to load team members.');
        }
        return (res.data ?? []).map((m) => ({
          userId: m.userId ?? '',
          name: (m.name ?? 'Member').trim() || 'Member',
          imageUrl: m.imageUrl ?? null,
          role: (m.role ?? 'TeamMember') as TeamMemberRow['role'],
          job: m.job ?? null,
          isOwner: !!m.isOwner,
          joinedAt: m.joinedAt ?? null,
        }));
      }),
    );
  }

  updateMemberRole(teamId: string, userId: string, role: 'TeamLeader' | 'TeamMember'): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.teamsUrl}/${teamId}/members/${userId}/role`, { role })
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update member role.');
          }
        }),
      );
  }

  createTeamGroup(
    teamId: string,
    input: { title: string; memberUserIds?: string[] },
  ): Observable<string> {
    return this.http
      .post<ApiResponse<string>>(`${this.teamsUrl}/${teamId}/chat-groups`, {
        title: input.title.trim(),
        memberUserIds: input.memberUserIds ?? [],
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to create group.');
          }
          return String(res.data);
        }),
      );
  }

  updateTeamChatRoom(
    teamId: string,
    roomId: string,
    input: { title?: string; logo?: File | null },
  ): Observable<void> {
    const form = new FormData();
    if (input.title?.trim()) {
      form.append('Title', input.title.trim());
    }
    if (input.logo) {
      form.append('Logo', input.logo, input.logo.name);
    }
    return this.http
      .put<ApiResponse<unknown>>(`${this.teamsUrl}/${teamId}/chat-groups/${roomId}`, form)
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update chat room.');
          }
        }),
      );
  }

  getTeamChatRoomMembers(
    teamId: string,
    roomId: string,
  ): Observable<{ userId: string; name: string; roleLabel?: string | null; canSend: boolean }[]> {
    return this.http
      .get<ApiResponse<Record<string, unknown>[]>>(
        `${this.teamsUrl}/${teamId}/chat-groups/${roomId}/members`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to load chat members.');
          }
          return (res.data ?? []).map((raw) => ({
            userId: String(raw['userId'] ?? ''),
            name: String(raw['name'] ?? 'Member').trim() || 'Member',
            roleLabel: (raw['roleLabel'] as string | null | undefined) ?? null,
            canSend: (raw['canSend'] as boolean | undefined) ?? true,
          }));
        }),
      );
  }

  addTeamChatRoomMembers(
    teamId: string,
    roomId: string,
    memberUserIds: string[],
  ): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.teamsUrl}/${teamId}/chat-groups/${roomId}/members`, {
        memberUserIds,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to add members.');
          }
        }),
      );
  }

  createTeam(input: {
    name: string;
    aboutUs?: string;
    logo?: File | null;
    cover?: File | null;
    categories?: { categoryId: string; isPrimary: boolean }[];
    skillIds?: string[];
  }): Observable<string> {
    const form = new FormData();
    form.append('Name', input.name);
    if (input.aboutUs?.trim()) {
      form.append('AboutUs', input.aboutUs.trim());
    }
    if (input.logo) {
      form.append('Logo', input.logo, input.logo.name);
    }
    if (input.cover) {
      form.append('Cover', input.cover, input.cover.name);
    }
    (input.categories ?? []).forEach((category, index) => {
      form.append(`Categories[${index}].CategoryId`, category.categoryId);
      form.append(`Categories[${index}].IsPrimary`, String(category.isPrimary));
    });
    (input.skillIds ?? []).forEach((skillId, index) => {
      form.append(`SkillIds[${index}]`, skillId);
    });

    return this.http.post<ApiResponse<string>>(this.teamsUrl, form).pipe(
      map((res) => {
        if (!res.isSuccess || !res.data) {
          throw new Error('Failed to create team.');
        }
        return res.data;
      }),
    );
  }

  updateTeam(
    teamId: string,
    input: {
      name: string;
      aboutUs?: string | null;
      logo?: File | null;
      cover?: File | null;
    },
    options?: { skipLoading?: boolean },
  ): Observable<void> {
    const form = new FormData();
    form.append('Id', teamId);
    form.append('Name', input.name.trim());
    if (input.aboutUs != null) {
      form.append('AboutUs', input.aboutUs.trim());
    }
    if (input.logo) {
      form.append('Logo', input.logo, input.logo.name);
    }
    if (input.cover) {
      form.append('Cover', input.cover, input.cover.name);
    }

    return this.http
      .put<ApiResponse<unknown>>(`${this.teamsUrl}/${teamId}`, form, {
        context: options?.skipLoading ? skipLoadingCtx() : undefined,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update team.');
          }
        }),
      );
  }

  replaceCategories(
    teamId: string,
    categories: { categoryId: string; isPrimary: boolean }[],
  ): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.teamsUrl}/${teamId}/categories`, { categories })
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update team categories.');
          }
        }),
      );
  }

  replaceSpecialties(teamId: string, specialtyIds: string[]): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.teamsUrl}/${teamId}/specialties`, { specialtyIds })
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update team specialties.');
          }
        }),
      );
  }

  replaceSkills(teamId: string, skillIds: string[]): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.teamsUrl}/${teamId}/skills`, { skillIds })
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update team skills.');
          }
        }),
      );
  }

  joinByCode(code: string, coverLetter?: string): Observable<void> {
    return this.http
      .post(`${this.joinUrl}/join-by-code`, {
        code: code.trim(),
        coverLetter: coverLetter?.trim() || null,
      })
      .pipe(map(() => undefined));
  }

  applyToTeamJob(jobId: string, coverLetter?: string): Observable<void> {
    return this.http
      .put(
        `${this.joinUrl}/join-requests`,
        {
          jobId,
          JobId: jobId,
          coverLetter: coverLetter?.trim() || null,
          CoverLetter: coverLetter?.trim() || null,
        },
        { context: skipLoadingCtx() },
      )
      .pipe(map(() => undefined));
  }

  getTeamJoinRequests(
    teamId: string,
    options?: { status?: string; pageNumber?: number; pageSize?: number; skipLoading?: boolean },
  ): Observable<PagedTeamJoinRequests> {
    let params = new HttpParams()
      .set('teamId', teamId)
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 20));

    if (options?.status?.trim()) {
      params = params.set('status', options.status.trim().toLowerCase());
    }

    return this.http
      .get<unknown>(`${this.joinUrl}/Get-Team-Join-Request`, {
        params,
        context: options?.skipLoading ? skipLoadingCtx() : undefined,
      })
      .pipe(
        map((raw) => {
          const root = (raw ?? {}) as Record<string, unknown>;
          const page = (
            root['data'] && typeof root['data'] === 'object'
              ? (root['data'] as Record<string, unknown>)
              : root
          ) as {
            items?: unknown[];
            pageNumber?: number;
            pageSize?: number;
            totalCount?: number;
            totalPages?: number;
            hasPreviousPage?: boolean;
            hasNextPage?: boolean;
          };
          const items = (page.items ?? []).map((item) =>
            this.normalizeJoinRequest((item ?? {}) as Record<string, unknown>),
          );
          return {
            items,
            pageNumber: page.pageNumber ?? 1,
            pageSize: page.pageSize ?? 20,
            totalCount: page.totalCount ?? items.length,
            totalPages: page.totalPages,
            hasPreviousPage: page.hasPreviousPage,
            hasNextPage: page.hasNextPage,
          };
        }),
      );
  }

  acceptJoinRequest(requestId: string, options?: { skipLoading?: boolean }): Observable<void> {
    return this.http
      .patch(`${this.joinUrl}/${requestId}/accept`, null, {
        context: options?.skipLoading ? skipLoadingCtx() : undefined,
      })
      .pipe(map(() => undefined));
  }

  rejectJoinRequest(requestId: string, options?: { skipLoading?: boolean }): Observable<void> {
    return this.http
      .patch(`${this.joinUrl}/${requestId}/reject`, null, {
        context: options?.skipLoading ? skipLoadingCtx() : undefined,
      })
      .pipe(map(() => undefined));
  }

  private normalizeJoinRequest(raw: Record<string, unknown>): TeamJoinRequest {
    const statusRaw = raw['status'];
    let status = 'pending';
    if (typeof statusRaw === 'number') {
      status = statusRaw === 1 ? 'Accepted' : statusRaw === 2 ? 'Rejected' : 'pending';
    } else if (statusRaw != null) {
      status = String(statusRaw);
    }

    const rawScore = (raw['matchScore'] ?? raw['overallScore'] ?? null) as number | null;
    let matchScore: number | null = null;
    if (rawScore != null && !Number.isNaN(Number(rawScore))) {
      const n = Number(rawScore);
      matchScore = Math.round(n <= 1 ? n * 100 : n);
    }

    return {
      id: String(raw['id'] ?? ''),
      userId: String(raw['userId'] ?? ''),
      fullName: String(raw['fullName'] ?? 'Applicant'),
      userName: (raw['userName'] as string | null | undefined) ?? null,
      profilePicture: (raw['profilePicture'] as string | null | undefined) ?? null,
      averageRating: Number(raw['averageRating'] ?? 0),
      reviewCount: Number(raw['reviewCount'] ?? 0),
      completedProjects: Number(raw['completedProjects'] ?? 0),
      coverLetter: (raw['coverLetter'] as string | null | undefined) ?? null,
      status,
      requestedAt: String(raw['requestedAt'] ?? ''),
      teamJobId: (raw['teamJobId'] as string | null | undefined) ?? null,
      teamJobTitle: (raw['teamJobTitle'] as string | null | undefined) ?? null,
      matchScore,
      matchRank: (raw['matchRank'] ?? raw['rank'] ?? null) as number | null,
      aiReasoning: (raw['aiReasoning'] as string | null | undefined) ?? null,
      cvUrl: ((raw['cvUrl'] ?? raw['resumeUrl'] ?? null) as string | null),
    };
  }

  browseOpenJobs(options?: {
    search?: string;
    pageNumber?: number;
    pageSize?: number;
  }): Observable<PagedTeamJobs> {
    let params = new HttpParams()
      .set('pageNumber', String(options?.pageNumber ?? 1))
      .set('pageSize', String(options?.pageSize ?? 12))
      .set('sortBy', 'CreatedAt')
      .set('sortDirection', 'desc');

    if (options?.search?.trim()) {
      params = params.set('search', options.search.trim());
    }

    return this.http
      .get<ApiResponse<PagedTeamJobs>>(this.jobsUrl, { params, context: skipLoadingCtx() })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to load team openings.');
          }
          const raw = res.data;
          const items = (raw.items ?? []).map((job) => this.normalizeTeamJob(job));
          return {
            ...raw,
            items,
            pageNumber: Number(raw.pageNumber ?? 1),
            pageSize: Number(raw.pageSize ?? items.length),
            totalCount: Number(raw.totalCount ?? items.length),
          };
        }),
      );
  }

  getTeamJobs(teamId: string, options?: { skipLoading?: boolean }): Observable<TeamJob[]> {
    return this.http
      .get<ApiResponse<TeamJob[]>>(`${environment.apiBaseUrl}/api/v1/teams/${teamId}/jobs`, {
        context: options?.skipLoading ? skipLoadingCtx() : undefined,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to load team jobs.');
          }
          return (res.data as TeamJob[]).map((job) => this.normalizeTeamJob(job));
        }),
      );
  }

  getJobDetails(jobId: string, options?: { skipLoading?: boolean }): Observable<TeamJobDetails> {
    return this.http
      .get<ApiResponse<TeamJobDetails>>(`${this.jobsUrl}/${jobId}`, {
        context: options?.skipLoading ? skipLoadingCtx() : undefined,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to load opening.');
          }
          return res.data;
        }),
      );
  }

  createTeamJob(
    teamId: string,
    input: { title: string; description: string; skillIds?: string[] },
    options?: { skipLoading?: boolean },
  ): Observable<string> {
    return this.http
      .post<ApiResponse<string>>(
        `${environment.apiBaseUrl}/api/v1/teams/${teamId}/jobs`,
        {
          title: input.title.trim(),
          description: input.description.trim(),
          skillIds: input.skillIds ?? [],
        },
        { context: options?.skipLoading ? skipLoadingCtx() : undefined },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to create team job.');
          }
          return res.data;
        }),
      );
  }

  updateTeamJob(
    jobId: string,
    input: { title: string; description: string },
    options?: { skipLoading?: boolean },
  ): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(
        `${this.jobsUrl}/${jobId}`,
        {
          id: jobId,
          title: input.title.trim(),
          description: input.description.trim(),
        },
        { context: options?.skipLoading ? skipLoadingCtx() : undefined },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update team job.');
          }
        }),
      );
  }

  updateTeamJobSkills(
    jobId: string,
    skillIds: string[],
    options?: { skipLoading?: boolean },
  ): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(
        `${this.jobsUrl}/${jobId}/skills`,
        { id: jobId, skillIds },
        { context: options?.skipLoading ? skipLoadingCtx() : undefined },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update job skills.');
          }
        }),
      );
  }

  closeTeamJob(jobId: string, options?: { skipLoading?: boolean }): Observable<void> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.jobsUrl}/${jobId}/close`, null, {
        context: options?.skipLoading ? skipLoadingCtx() : undefined,
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to close team job.');
          }
        }),
      );
  }

  getTeamPortfolio(teamId: string, options?: { skipLoading?: boolean }): Observable<TeamPortfolioProject[]> {
    return this.http
      .get<ApiResponse<TeamPortfolioProject[]>>(
        `${this.profilesUrl}/teams/${teamId}/portfolio-projects`,
        { context: options?.skipLoading ? skipLoadingCtx() : undefined },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            return [];
          }
          return res.data ?? [];
        }),
      );
  }

  createTeamPortfolio(
    teamId: string,
    input: TeamPortfolioWriteInput,
  ): Observable<string> {
    const form = this.buildPortfolioForm(input, false);

    return this.http
      .post<ApiResponse<string>>(`${this.profilesUrl}/teams/${teamId}/portfolio-projects`, form, {
        context: skipLoadingCtx(),
      })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to add portfolio project.');
          }
          return res.data;
        }),
      );
  }

  updateTeamPortfolio(
    teamId: string,
    projectId: string,
    input: TeamPortfolioWriteInput,
  ): Observable<void> {
    const form = this.buildPortfolioForm(input, true);
    form.append('Id', projectId);

    return this.http
      .put<ApiResponse<unknown>>(
        `${this.profilesUrl}/teams/${teamId}/portfolio-projects/${projectId}`,
        form,
        { context: skipLoadingCtx() },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update portfolio project.');
          }
        }),
      );
  }

  replaceTeamPortfolioSkills(teamId: string, projectId: string, skillIds: string[]): Observable<void> {
    return this.http
      .put<ApiResponse<unknown>>(
        `${this.profilesUrl}/teams/${teamId}/portfolio-projects/${projectId}/skills`,
        skillIds,
        { context: skipLoadingCtx() },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to update portfolio skills.');
          }
        }),
      );
  }

  uploadTeamPortfolioImages(teamId: string, projectId: string, images: File[]): Observable<void> {
    if (!images.length) {
      return of(undefined);
    }
    const form = new FormData();
    for (const file of images) {
      form.append('images', file, file.name);
    }
    return this.http
      .post<ApiResponse<unknown>>(
        `${this.profilesUrl}/teams/${teamId}/portfolio-projects/${projectId}/images`,
        form,
        { context: skipLoadingCtx() },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to upload portfolio images.');
          }
        }),
      );
  }

  deleteTeamPortfolio(teamId: string, projectId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(
        `${this.profilesUrl}/teams/${teamId}/portfolio-projects/${projectId}`,
        { context: skipLoadingCtx() },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error('Failed to delete portfolio project.');
          }
        }),
      );
  }

  private buildPortfolioForm(input: TeamPortfolioWriteInput, isUpdate: boolean): FormData {
    const form = new FormData();
    form.append('Title', input.title.trim());
    form.append('Description', (input.description ?? '').trim() || input.title.trim());
    form.append('OwnerType', 'Team');
    if (input.budget != null && input.budget !== '') {
      form.append('Budget', String(input.budget));
    }
    if (input.projectUrl?.trim()) form.append('ProjectUrl', input.projectUrl.trim());
    if (input.prototypeUrl?.trim()) form.append('PrototypeUrl', input.prototypeUrl.trim());
    if (input.completionDate) form.append('CompletionDate', input.completionDate);
    if (input.categoryId) form.append('CategoryId', input.categoryId);
    form.append('Visibility', input.visibility ?? 'Public');
    if (input.challenge != null) form.append('Challenge', input.challenge);
    if (input.solution != null) form.append('Solution', input.solution);
    if (input.durationLabel != null) form.append('DurationLabel', input.durationLabel);
    if (input.industry != null) form.append('Industry', input.industry);
    if (input.teamLeads != null) form.append('TeamLeads', input.teamLeads);
    if (input.testimonialQuote != null) form.append('TestimonialQuote', input.testimonialQuote);
    if (input.testimonialAuthorName != null) {
      form.append('TestimonialAuthorName', input.testimonialAuthorName);
    }
    if (input.testimonialAuthorTitle != null) {
      form.append('TestimonialAuthorTitle', input.testimonialAuthorTitle);
    }
    if (input.testimonialAuthorAvatarUrl != null) {
      form.append('TestimonialAuthorAvatarUrl', input.testimonialAuthorAvatarUrl);
    }

    (input.skillIds ?? []).forEach((id, index) => {
      form.append(`SkillIds[${index}]`, id);
    });

    (input.roadmapSteps ?? []).forEach((step, index) => {
      form.append(`RoadmapSteps[${index}].Title`, step.title);
      form.append(`RoadmapSteps[${index}].SortOrder`, String(step.sortOrder ?? index));
      form.append(`RoadmapSteps[${index}].IsDone`, String(!!step.isDone));
    });

    (input.metrics ?? []).forEach((metric, index) => {
      form.append(`Metrics[${index}].Value`, metric.value);
      form.append(`Metrics[${index}].Label`, metric.label);
      form.append(`Metrics[${index}].SortOrder`, String(metric.sortOrder ?? index));
    });

    if (!isUpdate) {
      for (const file of input.images ?? []) {
        form.append('Images', file, file.name);
      }
    }

    return form;
  }

  private normalizeTeamReview(review: TeamReview): TeamReview {
    return {
      id: String(review.id ?? ''),
      rating: Number(review.rating ?? 0),
      comment: review.comment ?? null,
      createdAt: String(review.createdAt ?? ''),
      reviewerUserId: review.reviewerUserId ?? null,
      reviewerName: String(review.reviewerName ?? '').trim() || 'Community member',
      reviewerAvatar: review.reviewerAvatar ?? null,
    };
  }

  private normalizeTeamJob(job: TeamJob): TeamJob {
    return {
      id: String(job.id ?? ''),
      teamId: String(job.teamId ?? ''),
      title: String(job.title ?? ''),
      description: String(job.description ?? ''),
      status: String(job.status ?? 'Open'),
      createdAt: String(job.createdAt ?? ''),
      teamName: job.teamName ?? null,
      teamLogo: job.teamLogo ?? null,
    };
  }

  private normalizeTeam(team: Team): Team {
    return {
      ...team,
      cover: team.cover ?? null,
      categories: (team.categories ?? []).map((category) => {
        const nameEn = (category.nameEn || '').trim();
        return {
          ...category,
          // Keep English only in nameEn — never copy Arabic `name` into it.
          nameEn: nameEn || undefined,
        };
      }),
      skills: team.skills ?? [],
      memberAvatars: (team.memberAvatars ?? []).map((avatar) => ({
        userId: avatar.userId,
        name: avatar.name || 'Member',
        imageUrl: avatar.imageUrl ?? null,
      })),
      membersCount: team.membersCount ?? 0,
      projectsCount: team.projectsCount ?? 0,
    };
  }
}
