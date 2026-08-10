import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { extractApiError } from '../../../../core/http/api-error';
import {
  CategoriesApiService,
  type CategoryDto,
} from '../../../auth/data-access/categories-api.service';
import {
  ProjectsApiService,
  type ProjectDto,
} from '../../../auth/data-access/projects-api.service';
import { ProjectCandidatesApiService } from '../../../project/data-access/project-candidates-api.service';
import type { SuggestedCandidate } from '../../../project/models/project-candidates';
import { TeamsService } from '../../../developer/data-access/teams.service';
import type { Team } from '../../../developer/models/team';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { InviteToProjectModalComponent } from '../../components/invite-to-project-modal/invite-to-project-modal.component';
import {
  DevelopersBrowseApiService,
  type DeveloperBrowseItem,
} from '../../data-access/developers-browse-api.service';
import { ProjectInvitationsApiService } from '../../data-access/project-invitations-api.service';
import type { InviteTarget, ProjectInvitation } from '../../models/project-invitation';

type HireTab = 'discover' | 'matched' | 'invitations';

interface CategoryCarousel<T> {
  category: CategoryDto;
  items: T[];
}

interface MatchedCard extends SuggestedCandidate {
  projectId: string;
  projectTitle: string;
}

@Component({
  selector: 'app-hire-talent',
  standalone: true,
  imports: [
    ClientViewNavbarComponent,
    DecimalPipe,
    RouterLink,
    InviteToProjectModalComponent,
  ],
  templateUrl: './hire-talent.component.html',
  styleUrl: './hire-talent.component.css',
})
export class HireTalentComponent implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly candidatesApi = inject(ProjectCandidatesApiService);
  private readonly teamsApi = inject(TeamsService);
  private readonly developersApi = inject(DevelopersBrowseApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly invitationsApi = inject(ProjectInvitationsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tab = signal<HireTab>('discover');
  protected readonly loadingDiscover = signal(true);
  protected readonly loadingMatched = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly openProjects = signal<ProjectDto[]>([]);
  protected readonly selectedMatchProjectId = signal<string | null>(null);
  protected readonly matched = signal<MatchedCard[]>([]);
  protected readonly teamCarousels = signal<CategoryCarousel<Team>[]>([]);
  protected readonly developerCarousels = signal<CategoryCarousel<DeveloperBrowseItem>[]>([]);

  protected readonly invitations = signal<ProjectInvitation[]>([]);
  protected readonly invitationsLoading = signal(false);
  protected readonly invitationsError = signal<string | null>(null);
  protected readonly actionBusyId = signal<string | null>(null);

  protected readonly inviteTarget = signal<InviteTarget | null>(null);
  protected readonly inviteProjectId = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);

  protected readonly selectedMatchProject = computed(() => {
    const id = this.selectedMatchProjectId();
    return this.openProjects().find((p) => p.id === id) ?? null;
  });

  protected readonly pendingInviteCount = computed(
    () => this.invitations().filter((i) => i.status === 'Pending').length,
  );

  protected readonly hasDiscoverContent = computed(
    () => this.teamCarousels().length > 0 || this.developerCarousels().length > 0,
  );

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'invitations' || tabParam === 'matched' || tabParam === 'discover') {
      this.tab.set(tabParam);
    }

    this.loadDiscover();
    this.loadInvitations();
    if (this.tab() === 'matched') this.ensureMatchedLoaded();
  }

  protected setTab(tab: HireTab): void {
    this.tab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: tab === 'discover' ? {} : { tab },
      replaceUrl: true,
    });
    if (tab === 'invitations') this.loadInvitations();
    if (tab === 'matched') this.ensureMatchedLoaded();
  }

  protected selectMatchProject(projectId: string): void {
    if (this.selectedMatchProjectId() === projectId) return;
    this.selectedMatchProjectId.set(projectId);
    this.loadMatchedFor(projectId);
  }

  protected initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'FG';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  protected matchPercent(score: number): number {
    return Math.round(Math.min(1, Math.max(0, score)) * 100);
  }

  protected isTeamCandidate(card: MatchedCard): boolean {
    return (card.candidateType || '').toLowerCase() === 'team';
  }

  protected teamPrimaryCategory(team: Team): string {
    const primary = team.categories?.find((c) => c.isPrimary) ?? team.categories?.[0];
    return (primary?.nameEn || primary?.name || '').trim();
  }

  protected teamSpecialtyLabels(team: Team): string[] {
    return (team.specialties ?? [])
      .map((s) => (s.nameEn || s.nameAr || '').trim())
      .filter(Boolean)
      .slice(0, 2);
  }

  protected formatBudget(project: ProjectDto): string {
    const currency = project.currency || 'USD';
    if (project.isFixedPrice) return `Fixed · ${currency} ${project.budgetMin}`;
    return `${currency} ${project.budgetMin} – ${project.budgetMax}`;
  }

  protected openInvite(target: InviteTarget, projectId?: string | null): void {
    this.inviteTarget.set(target);
    this.inviteProjectId.set(projectId ?? null);
  }

  protected closeInvite(): void {
    this.inviteTarget.set(null);
    this.inviteProjectId.set(null);
  }

  protected onInviteSent(): void {
    this.toast.set('Invitation sent.');
    this.loadInvitations();
    setTimeout(() => this.toast.set(null), 2800);
  }

  protected inviteMatched(card: MatchedCard): void {
    const isTeam = this.isTeamCandidate(card);
    this.openInvite(
      {
        inviteeType: isTeam ? 'Team' : 'User',
        inviteeTeamId: isTeam ? card.id : null,
        inviteeUserId: isTeam ? null : card.id,
        displayName: card.name,
      },
      card.projectId,
    );
  }

  protected inviteTeam(team: Team): void {
    this.openInvite({
      inviteeType: 'Team',
      inviteeTeamId: team.id,
      displayName: team.name,
    });
  }

  protected inviteDeveloper(dev: DeveloperBrowseItem): void {
    this.openInvite({
      inviteeType: 'User',
      inviteeUserId: dev.userId,
      displayName: `${dev.firstName} ${dev.lastName}`.trim() || 'Developer',
    });
  }

  protected viewMatched(card: MatchedCard): void {
    const isTeam = this.isTeamCandidate(card);
    void this.router.navigate(
      isTeam ? ['/client/teams', card.id] : ['/client/developers', card.id],
    );
  }

  protected statusClass(status: string): string {
    return `hire-status hire-status--${(status || 'pending').toLowerCase()}`;
  }

  protected cancelInvitation(id: string): void {
    this.actionBusyId.set(id);
    this.invitationsApi.cancel(id).subscribe({
      next: () => {
        this.actionBusyId.set(null);
        this.loadInvitations();
      },
      error: (err) => {
        this.actionBusyId.set(null);
        this.invitationsError.set(extractApiError(err) || 'Could not cancel invitation.');
      },
    });
  }

  protected openChat(roomId: string | null): void {
    if (!roomId) return;
    void this.router.navigate(['/client/messages'], { queryParams: { room: roomId } });
  }

  protected scrollRail(el: HTMLElement, dir: 1 | -1): void {
    el.scrollBy({ left: dir * Math.min(460, el.clientWidth * 0.85), behavior: 'smooth' });
  }

  private ensureMatchedLoaded(): void {
    if (this.openProjects().length && this.selectedMatchProjectId()) {
      if (!this.matched().length) this.loadMatchedFor(this.selectedMatchProjectId()!);
      return;
    }
    this.projectsApi
      .getMine({ pageNumber: 1, pageSize: 20, status: 'Open' })
      .pipe(
        catchError(() => of({ items: [] as ProjectDto[] })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        const open = (page.items ?? []).filter(
          (p) => (p.status || '').toLowerCase() === 'open',
        );
        this.openProjects.set(open);
        const first = open[0]?.id ?? null;
        this.selectedMatchProjectId.set(first);
        if (first) this.loadMatchedFor(first);
        else this.matched.set([]);
      });
  }

  private loadMatchedFor(projectId: string): void {
    const project = this.openProjects().find((p) => p.id === projectId);
    this.loadingMatched.set(true);
    this.error.set(null);
    this.candidatesApi
      .getCandidatesForProject(projectId, 16)
      .pipe(
        catchError(() => of({ candidates: [] as SuggestedCandidate[] })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (res) => {
          this.matched.set(
            (res.candidates ?? []).map(
              (c) =>
                ({
                  ...c,
                  projectId,
                  projectTitle: project?.title ?? 'Project',
                }) as MatchedCard,
            ),
          );
          this.loadingMatched.set(false);
        },
        error: (err) => {
          this.loadingMatched.set(false);
          this.error.set(extractApiError(err) || 'Could not load matches.');
        },
      });
  }

  private loadDiscover(): void {
    this.loadingDiscover.set(true);
    this.error.set(null);

    forkJoin({
      projects: this.projectsApi
        .getMine({ pageNumber: 1, pageSize: 20, status: 'Open' })
        .pipe(catchError(() => of({ items: [] as ProjectDto[] }))),
      categories: this.categoriesApi.getCategories().pipe(catchError(() => of([] as CategoryDto[]))),
    })
      .pipe(
        switchMap(({ projects, categories }) => {
          const open = (projects.items ?? []).filter(
            (p) => (p.status || '').toLowerCase() === 'open',
          );
          this.openProjects.set(open);
          if (!this.selectedMatchProjectId() && open[0]) {
            this.selectedMatchProjectId.set(open[0].id);
          }

          const teamCalls = categories.slice(0, 6).map((category) =>
            this.teamsApi
              .browse({
                categoryId: category.id,
                pageNumber: 1,
                pageSize: 10,
                excludeMine: false,
              })
              .pipe(
                catchError(() => of({ items: [] as Team[] })),
                switchMap((page) =>
                  of({ category, items: page.items ?? [] } as CategoryCarousel<Team>),
                ),
              ),
          );

          const developerCalls = categories.slice(0, 6).map((category) =>
            this.developersApi
              .browse({ categoryId: category.id, pageNumber: 1, pageSize: 10 })
              .pipe(
                catchError(() => of({ items: [] as DeveloperBrowseItem[] })),
                switchMap((page) =>
                  of({
                    category,
                    items: page.items ?? [],
                  } as CategoryCarousel<DeveloperBrowseItem>),
                ),
              ),
          );

          return forkJoin({
            teams: teamCalls.length
              ? forkJoin(teamCalls)
              : of([] as CategoryCarousel<Team>[]),
            developers: developerCalls.length
              ? forkJoin(developerCalls)
              : of([] as CategoryCarousel<DeveloperBrowseItem>[]),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ teams, developers }) => {
          this.teamCarousels.set(teams.filter((c) => c.items.length > 0));
          this.developerCarousels.set(developers.filter((c) => c.items.length > 0));
          this.loadingDiscover.set(false);
        },
        error: (err) => {
          this.loadingDiscover.set(false);
          this.error.set(extractApiError(err) || 'Could not load talent.');
        },
      });
  }

  private loadInvitations(): void {
    this.invitationsLoading.set(true);
    this.invitationsError.set(null);
    this.invitationsApi.getSent().subscribe({
      next: (items) => {
        this.invitations.set(items);
        this.invitationsLoading.set(false);
      },
      error: (err) => {
        this.invitationsLoading.set(false);
        this.invitationsError.set(extractApiError(err) || 'Could not load invitations.');
      },
    });
  }
}
