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
  TeamCategory,
  TeamJob,
  TeamJobDetails,
  TeamJoinRequest,
  TeamMemberAvatar,
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

const skipLoadingCtx = () => new HttpContext().set(SKIP_LOADING, true);

@Injectable({ providedIn: 'root' })
export class TeamsService {
  private readonly http = inject(HttpClient);
  private readonly teamsUrl = `${environment.apiBaseUrl}/api/v1/teams`;
  private readonly jobsUrl = `${environment.apiBaseUrl}/api/v1/jobs`;
  private readonly joinUrl = `${environment.apiBaseUrl}/api/v1/TeamJoinRequest`;
  private readonly profilesUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

  getMine(): Observable<Team[]> {
    return this.http.get<ApiResponse<Team[]>>(`${this.teamsUrl}/mine`).pipe(
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

    return this.http.get<ApiResponse<PagedTeams>>(this.teamsUrl, { params }).pipe(
      map((res) => {
        if (!res.isSuccess || !res.data) {
          throw new Error('Failed to browse teams.');
        }
        const raw = res.data as PagedTeams & { Items?: Team[]; TotalCount?: number; PageNumber?: number; PageSize?: number };
        const items = (raw.items ?? raw.Items ?? []).map((team) => this.normalizeTeam(team));
        return {
          items,
          pageNumber: raw.pageNumber ?? raw.PageNumber ?? options?.pageNumber ?? 1,
          pageSize: raw.pageSize ?? raw.PageSize ?? options?.pageSize ?? 9,
          totalCount: raw.totalCount ?? raw.TotalCount ?? items.length,
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

  getByCode(teamCode: string): Observable<Team> {
    return this.http
      .get<ApiResponse<Team>>(`${this.teamsUrl}/by-code/${encodeURIComponent(teamCode)}`)
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Team code not found.');
          }
          return res.data;
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
      .put(`${this.joinUrl}/join-requests`, {
        jobId,
        coverLetter: coverLetter?.trim() || null,
      })
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
          const page = (raw ?? {}) as {
            items?: unknown[];
            Items?: unknown[];
            pageNumber?: number;
            PageNumber?: number;
            pageSize?: number;
            PageSize?: number;
            totalCount?: number;
            TotalCount?: number;
            totalPages?: number;
            TotalPages?: number;
            hasPreviousPage?: boolean;
            hasNextPage?: boolean;
          };
          const items = (page.items ?? page.Items ?? []).map((item) =>
            this.normalizeJoinRequest((item ?? {}) as Record<string, unknown>),
          );
          return {
            items,
            pageNumber: page.pageNumber ?? page.PageNumber ?? 1,
            pageSize: page.pageSize ?? page.PageSize ?? 20,
            totalCount: page.totalCount ?? page.TotalCount ?? items.length,
            totalPages: page.totalPages ?? page.TotalPages,
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
    const r = raw as {
      id?: string;
      Id?: string;
      userId?: string;
      UserId?: string;
      fullName?: string;
      FullName?: string;
      userName?: string | null;
      UserName?: string | null;
      profilePicture?: string | null;
      ProfilePicture?: string | null;
      averageRating?: number;
      AverageRating?: number;
      reviewCount?: number;
      ReviewCount?: number;
      completedProjects?: number;
      CompletedProjects?: number;
      coverLetter?: string | null;
      CoverLetter?: string | null;
      status?: string | number;
      Status?: string | number;
      requestedAt?: string;
      RequestedAt?: string;
      teamJobId?: string | null;
      TeamJobId?: string | null;
      teamJobTitle?: string | null;
      TeamJobTitle?: string | null;
    };

    const statusRaw = r.status ?? r.Status;
    let status = 'pending';
    if (typeof statusRaw === 'number') {
      status = statusRaw === 1 ? 'Accepted' : statusRaw === 2 ? 'Rejected' : 'pending';
    } else if (statusRaw != null) {
      status = String(statusRaw);
    }

    return {
      id: String(r.id ?? r.Id ?? ''),
      userId: String(r.userId ?? r.UserId ?? ''),
      fullName: String(r.fullName ?? r.FullName ?? 'Applicant'),
      userName: (r.userName ?? r.UserName ?? null) as string | null,
      profilePicture: (r.profilePicture ?? r.ProfilePicture ?? null) as string | null,
      averageRating: Number(r.averageRating ?? r.AverageRating ?? 0),
      reviewCount: Number(r.reviewCount ?? r.ReviewCount ?? 0),
      completedProjects: Number(r.completedProjects ?? r.CompletedProjects ?? 0),
      coverLetter: (r.coverLetter ?? r.CoverLetter ?? null) as string | null,
      status,
      requestedAt: String(r.requestedAt ?? r.RequestedAt ?? ''),
      teamJobId: (r.teamJobId ?? r.TeamJobId ?? null) as string | null,
      teamJobTitle: (r.teamJobTitle ?? r.TeamJobTitle ?? null) as string | null,
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
      .get<ApiResponse<PagedTeamJobs>>(this.jobsUrl, { params })
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Failed to load team openings.');
          }
          return {
            ...res.data,
            items: res.data.items ?? [],
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
          return res.data;
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
            throw new Error('Failed to add portfolio project.');
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
    form.append('Description', (input.description ?? '').trim());
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

  private normalizeTeam(team: Team): Team {
    const raw = team as Team & {
      MemberAvatars?: TeamMemberAvatar[];
      Cover?: string | null;
    };
    const rawAvatars = team.memberAvatars ?? raw.MemberAvatars ?? [];

    return {
      ...team,
      cover: team.cover ?? raw.Cover ?? null,
      categories: (team.categories ?? []).map((category) => {
        const rawCategory = category as TeamCategory & { NameEn?: string };
        const nameEn = (category.nameEn || rawCategory.NameEn || '').trim();
        return {
          ...category,
          // Keep English only in nameEn — never copy Arabic `name` into it.
          nameEn: nameEn || undefined,
        };
      }),
      skills: team.skills ?? [],
      memberAvatars: rawAvatars.map((avatar) => ({
        userId: avatar.userId,
        name: avatar.name || 'Member',
        imageUrl: avatar.imageUrl ?? null,
      })),
      membersCount: team.membersCount ?? 0,
      projectsCount: team.projectsCount ?? 0,
    };
  }
}
