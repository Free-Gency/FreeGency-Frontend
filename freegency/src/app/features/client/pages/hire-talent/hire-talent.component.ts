import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Cancel01Icon,
  FilterVerticalIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { catchError, of } from 'rxjs';
import { extractApiError } from '../../../../core/http/api-error';
import {
  CategoriesApiService,
  type CategoryDto,
} from '../../../auth/data-access/categories-api.service';
import {
  ProjectsApiService,
  type ProjectDto,
} from '../../../auth/data-access/projects-api.service';
import {
  TaxonomyApiService,
  type TaxonomySkill,
  type TaxonomySpecialty,
} from '../../../auth/data-access/taxonomy-api.service';
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
type DiscoverKind = 'teams' | 'developers';
type DiscoverSort = 'rating' | 'reviews' | 'name';
type MinRating = 0 | 3 | 4 | 4.5;

interface MatchedCard extends SuggestedCandidate {
  projectId: string;
  projectTitle: string;
}

const PAGE_SIZE = 12;

@Component({
  selector: 'app-hire-talent',
  standalone: true,
  imports: [
    ClientViewNavbarComponent,
    DatePipe,
    DecimalPipe,
    RouterLink,
    InviteToProjectModalComponent,
    FormsModule,
    HugeiconsIconComponent,
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
  private readonly taxonomyApi = inject(TaxonomyApiService);
  private readonly invitationsApi = inject(ProjectInvitationsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly searchIcon = Search01Icon as IconSvgObject;
  protected readonly filterIcon = FilterVerticalIcon as IconSvgObject;
  protected readonly closeIcon = Cancel01Icon as IconSvgObject;

  protected readonly tab = signal<HireTab>('discover');
  protected readonly discoverKind = signal<DiscoverKind>('teams');
  protected readonly loadingDiscover = signal(true);
  protected readonly loadingMatched = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly specialties = signal<TaxonomySpecialty[]>([]);
  protected readonly skills = signal<TaxonomySkill[]>([]);

  protected readonly discoverSearch = signal('');
  protected readonly categoryId = signal<string | null>(null);
  protected readonly specialtyId = signal<string | null>(null);
  protected readonly skillId = signal<string | null>(null);
  protected readonly minRating = signal<MinRating>(0);
  protected readonly sortBy = signal<DiscoverSort>('rating');
  protected readonly filtersOpen = signal(false);

  protected readonly discoverTeams = signal<Team[]>([]);
  protected readonly discoverDevelopers = signal<DeveloperBrowseItem[]>([]);
  protected readonly discoverPage = signal(1);
  protected readonly discoverTotalCount = signal(0);
  protected readonly discoverTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.discoverTotalCount() / PAGE_SIZE)),
  );

  protected readonly openProjects = signal<ProjectDto[]>([]);
  protected readonly selectedMatchProjectId = signal<string | null>(null);
  protected readonly matched = signal<MatchedCard[]>([]);

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

  protected readonly activeFiltersCount = computed(() => {
    let n = 0;
    if (this.categoryId()) n++;
    if (this.specialtyId()) n++;
    if (this.skillId()) n++;
    if (this.minRating() > 0) n++;
    if (this.sortBy() !== 'rating') n++;
    return n;
  });

  protected readonly selectedCategoryLabel = computed(() => {
    const id = this.categoryId();
    if (!id) return 'All';
    const cat = this.categories().find((c) => c.id === id);
    return cat?.nameEn || cat?.name || 'All';
  });

  protected readonly discoverPageNumbers = computed(() => {
    const total = this.discoverTotalPages();
    const current = this.discoverPage();
    const window = 5;
    let start = Math.max(1, current - Math.floor(window / 2));
    let end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'invitations' || tabParam === 'matched' || tabParam === 'discover') {
      this.tab.set(tabParam);
    }
    const kind = this.route.snapshot.queryParamMap.get('kind');
    if (kind === 'developers' || kind === 'teams') this.discoverKind.set(kind);

    this.categoriesApi
      .getCategories()
      .pipe(catchError(() => of([] as CategoryDto[])), takeUntilDestroyed(this.destroyRef))
      .subscribe((cats) => this.categories.set(cats));

    this.projectsApi
      .getMine({ pageNumber: 1, pageSize: 20, status: 'Open' })
      .pipe(catchError(() => of({ items: [] as ProjectDto[] })), takeUntilDestroyed(this.destroyRef))
      .subscribe((page) => {
        const open = (page.items ?? []).filter(
          (p) => (p.status || '').toLowerCase() === 'open',
        );
        this.openProjects.set(open);
        if (!this.selectedMatchProjectId() && open[0]) {
          this.selectedMatchProjectId.set(open[0].id);
        }
      });

    this.loadDiscover(1);
    this.loadInvitations();
    if (this.tab() === 'matched') this.ensureMatchedLoaded();
  }

  protected setTab(tab: HireTab): void {
    this.tab.set(tab);
    this.syncQuery();
    if (tab === 'invitations') this.loadInvitations();
    if (tab === 'matched') this.ensureMatchedLoaded();
    if (tab === 'discover' && !this.discoverTeams().length && !this.discoverDevelopers().length) {
      this.loadDiscover(1);
    }
  }

  protected setDiscoverKind(kind: DiscoverKind): void {
    if (this.discoverKind() === kind) return;
    this.discoverKind.set(kind);
    this.syncQuery();
    this.loadDiscover(1);
  }

  protected onDiscoverSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.discoverSearch.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadDiscover(1), 320);
  }

  protected selectCategoryChip(categoryId: string | null): void {
    this.categoryId.set(categoryId);
    this.specialtyId.set(null);
    this.skillId.set(null);
    this.specialties.set([]);
    this.skills.set([]);
    if (categoryId) this.loadSpecialties(categoryId);
    this.loadDiscover(1);
  }

  protected openFilters(): void {
    this.filtersOpen.set(true);
  }

  protected closeFilters(): void {
    this.filtersOpen.set(false);
  }

  protected onFilterCategoryChange(categoryId: string): void {
    const id = categoryId || null;
    this.categoryId.set(id);
    this.specialtyId.set(null);
    this.skillId.set(null);
    this.skills.set([]);
    if (id) this.loadSpecialties(id);
    else {
      this.specialties.set([]);
    }
  }

  protected onFilterSpecialtyChange(specialtyId: string): void {
    const id = specialtyId || null;
    this.specialtyId.set(id);
    this.skillId.set(null);
    if (id) this.loadSkills(id);
    else this.skills.set([]);
  }

  protected applyFilters(): void {
    this.filtersOpen.set(false);
    this.loadDiscover(1);
  }

  protected clearFilters(): void {
    this.categoryId.set(null);
    this.specialtyId.set(null);
    this.skillId.set(null);
    this.minRating.set(0);
    this.sortBy.set('rating');
    this.specialties.set([]);
    this.skills.set([]);
    this.filtersOpen.set(false);
    this.loadDiscover(1);
  }

  protected goDiscoverPage(page: number): void {
    if (page < 1 || page > this.discoverTotalPages() || page === this.discoverPage()) return;
    this.loadDiscover(page);
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

  protected inviteeName(inv: ProjectInvitation): string {
    return inv.inviteeType === 'Team'
      ? inv.inviteeTeamName || 'Team'
      : inv.inviteeUserName || 'Developer';
  }

  protected inviteStatusKey(status: string): string {
    return (status || 'pending').toLowerCase();
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

  private syncQuery(): void {
    const tab = this.tab();
    const kind = this.discoverKind();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab: tab === 'discover' ? null : tab,
        kind: tab === 'discover' && kind !== 'teams' ? kind : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private loadSpecialties(categoryId: string): void {
    this.taxonomyApi
      .getSpecialtiesByCategory(categoryId)
      .pipe(catchError(() => of([] as TaxonomySpecialty[])))
      .subscribe((items) => this.specialties.set(items));
  }

  private loadSkills(specialtyId: string): void {
    this.taxonomyApi
      .getSkillsBySpecialty(specialtyId)
      .pipe(catchError(() => of([] as TaxonomySkill[])))
      .subscribe((items) => this.skills.set(items));
  }

  private loadDiscover(page: number): void {
    this.loadingDiscover.set(true);
    this.error.set(null);
    this.discoverPage.set(page);

    const search = this.discoverSearch().trim();
    const categoryId = this.categoryId();
    const minRating = this.minRating();
    const sortBy = this.sortBy();

    if (this.discoverKind() === 'teams') {
      this.teamsApi
        .browse({
          search: search || undefined,
          categoryId,
          pageNumber: page,
          pageSize: PAGE_SIZE,
          excludeMine: false,
        })
        .pipe(catchError(() => of({ items: [] as Team[], totalCount: 0 })))
        .subscribe({
          next: (pageRes) => {
            let items = [...(pageRes.items ?? [])];
            if (minRating > 0) {
              items = items.filter((t) => (t.averageRating ?? 0) >= minRating);
            }
            items = this.sortTeams(items, sortBy);
            this.discoverTeams.set(items);
            this.discoverDevelopers.set([]);
            this.discoverTotalCount.set(pageRes.totalCount ?? items.length);
            this.loadingDiscover.set(false);
          },
          error: (err) => {
            this.loadingDiscover.set(false);
            this.error.set(extractApiError(err) || 'Could not load teams.');
          },
        });
      return;
    }

    this.developersApi
      .browse({
        search: search || undefined,
        categoryId,
        specialtyId: this.specialtyId(),
        skillId: this.skillId(),
        pageNumber: page,
        pageSize: PAGE_SIZE,
      })
      .pipe(catchError(() => of({ items: [] as DeveloperBrowseItem[], totalCount: 0 })))
      .subscribe({
        next: (pageRes) => {
          let items = [...(pageRes.items ?? [])];
          if (minRating > 0) {
            items = items.filter((d) => (d.averageRating ?? 0) >= minRating);
          }
          items = this.sortDevelopers(items, sortBy);
          this.discoverDevelopers.set(items);
          this.discoverTeams.set([]);
          this.discoverTotalCount.set(pageRes.totalCount ?? items.length);
          this.loadingDiscover.set(false);
        },
        error: (err) => {
          this.loadingDiscover.set(false);
          this.error.set(extractApiError(err) || 'Could not load developers.');
        },
      });
  }

  private sortTeams(items: Team[], sortBy: DiscoverSort): Team[] {
    return items.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'reviews') return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
      return (b.averageRating ?? 0) - (a.averageRating ?? 0);
    });
  }

  private sortDevelopers(items: DeveloperBrowseItem[], sortBy: DiscoverSort): DeveloperBrowseItem[] {
    return items.sort((a, b) => {
      if (sortBy === 'name') {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
      if (sortBy === 'reviews') return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
      return (b.averageRating ?? 0) - (a.averageRating ?? 0);
    });
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
