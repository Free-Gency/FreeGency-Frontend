import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Briefcase01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  FilterVerticalIcon,
  MoreHorizontalIcon,
  PlusSignIcon,
  Search01Icon,
  StarIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import {
  CategoriesApiService,
  type CategoryDto,
} from '../../../auth/data-access/categories-api.service';
import { ProjectInvitationsApiService } from '../../../client/data-access/project-invitations-api.service';
import type { ProjectInvitation } from '../../../client/models/project-invitation';
import { TeamHubCardComponent } from '../../components/team-hub-card/team-hub-card.component';
import { TeamSuggestionsComponent } from '../../components/team-suggestions/team-suggestions.component';
import { TeamsService } from '../../data-access/teams.service';
import { PagedTeamJobs, Team, TeamJob, TeamMemberAvatar } from '../../models/team';

type TeamsHubTab = 'active' | 'discover' | 'openings' | 'suggested' | 'invitations';

const DISCOVER_PAGE_SIZE = 9;

@Component({
  selector: 'app-developer-teams',
  standalone: true,
  imports: [
    DeveloperViewNavbarComponent,
    FormsModule,
    HugeiconsIconComponent,
    NgClass,
    TeamHubCardComponent,
    TeamSuggestionsComponent,
  ],
  templateUrl: './developer-teams.component.html',
  styleUrl: './developer-teams.component.css',
})
export class DeveloperTeamsComponent {
  private readonly teamsApi = inject(TeamsService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly invitationsApi = inject(ProjectInvitationsApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly groupIcon = UserGroupIcon as IconSvgObject;
  protected readonly plusIcon = PlusSignIcon as IconSvgObject;
  protected readonly briefcaseIcon = Briefcase01Icon as IconSvgObject;
  protected readonly searchIcon = Search01Icon as IconSvgObject;
  protected readonly filterIcon = FilterVerticalIcon as IconSvgObject;
  protected readonly moreIcon = MoreHorizontalIcon as IconSvgObject;
  protected readonly starIcon = StarIcon as IconSvgObject;
  protected readonly closeIcon = Cancel01Icon as IconSvgObject;
  protected readonly checkCircleIcon = CheckmarkCircle02Icon as IconSvgObject;

  protected readonly activeTab = signal<TeamsHubTab>('active');

  protected readonly activeTeams = signal<Team[]>([]);
  protected readonly discoverTeams = signal<Team[]>([]);
  protected readonly discoverPage = signal(1);
  protected readonly discoverTotalCount = signal(0);
  protected readonly discoverTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.discoverTotalCount() / DISCOVER_PAGE_SIZE)),
  );
  protected readonly openings = signal<PagedTeamJobs | null>(null);

  protected readonly loadingActive = signal(true);
  protected readonly loadingDiscover = signal(false);
  protected readonly loadingOpenings = signal(false);

  protected readonly activeError = signal<string | null>(null);
  protected readonly discoverError = signal<string | null>(null);
  protected readonly openingsError = signal<string | null>(null);

  protected readonly discoverSearch = signal('');
  protected readonly activeCategory = signal('All');
  protected readonly categoryOptions = signal<string[]>(['All']);
  /** categoryId -> English label */
  protected readonly categoryNameById = signal<Record<string, string>>({});
  /** English label -> categoryId */
  protected readonly categoryIdByName = signal<Record<string, string>>({});
  protected readonly filtersOpen = signal(false);

  protected readonly joinModalOpen = signal(false);
  protected readonly joinCode = signal('');
  protected readonly joinNote = signal('');
  protected readonly joinSubmitting = signal(false);
  protected readonly joinError = signal<string | null>(null);
  protected readonly joinSuccess = signal(false);

  protected readonly applyJobOpen = signal(false);
  protected readonly applyJobId = signal<string | null>(null);
  protected readonly applyJobTitle = signal('');
  protected readonly applyTeamName = signal('');
  protected readonly applyCoverLetter = signal('');
  protected readonly applySubmitting = signal(false);
  protected readonly applyError = signal<string | null>(null);
  protected readonly applySuccess = signal(false);
  protected readonly appliedJobIds = signal<string[]>([]);

  protected readonly invitations = signal<ProjectInvitation[]>([]);
  protected readonly loadingInvitations = signal(false);
  protected readonly invitationsError = signal<string | null>(null);
  protected readonly inviteActionId = signal<string | null>(null);

  protected readonly canSubmitJoin = computed(() => this.joinCode().trim().length >= 4);

  private readonly myTeamIds = computed(
    () => new Set(this.activeTeams().map((t) => t.id).filter(Boolean)),
  );

  protected readonly tabs = computed(() => [
    { id: 'active' as const, label: 'My Teams', count: this.activeTeams().length },
    { id: 'suggested' as const, label: 'For you', count: null as number | null },
    {
      id: 'discover' as const,
      label: 'Discover',
      count: this.discoverTotalCount(),
    },
    {
      id: 'openings' as const,
      label: 'Jobs',
      count: this.openings()?.totalCount ?? this.openings()?.items.length ?? 0,
    },
    {
      id: 'invitations' as const,
      label: 'Invitations',
      count: this.invitations().filter((i) => i.status === 'Pending').length,
    },
  ]);

  protected readonly hasActiveTeams = computed(() => this.activeTeams().length > 0);
  protected readonly hasOpenings = computed(() => (this.openings()?.items.length ?? 0) > 0);

  protected readonly hasDiscoverTeams = computed(() => this.discoverTeams().length > 0);

  protected readonly discoverPageNumbers = computed(() => {
    const total = this.discoverTotalPages();
    const current = this.discoverPage();
    const window = 5;
    let start = Math.max(1, current - Math.floor(window / 2));
    let end = Math.min(total, start + window - 1);
    start = Math.max(1, end - window + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  private discoverSearchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadActiveTeams();
    this.loadCategories();
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'invitations') {
      this.activeTab.set('invitations');
      this.loadInvitations();
    }
  }

  protected switchTab(tab: TeamsHubTab): void {
    this.activeTab.set(tab);

    if (tab === 'discover' && !this.discoverTeams().length && !this.loadingDiscover()) {
      this.loadDiscoverTeams(1);
    }

    if (tab === 'openings' && !this.openings() && !this.loadingOpenings()) {
      this.loadOpenings();
    }

    if (tab === 'invitations') {
      this.loadInvitations();
    }
  }

  protected invitationStatusClass(status: string): string {
    return `rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
      status === 'Pending'
        ? 'bg-orange-50 text-orange-700'
        : status === 'Accepted'
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-gray-100 text-gray-600'
    }`;
  }

  protected acceptInvitation(inv: ProjectInvitation): void {
    if (inv.status !== 'Pending' || this.inviteActionId()) return;
    this.inviteActionId.set(inv.id);
    this.invitationsApi.accept(inv.id).subscribe({
      next: (roomId) => {
        this.inviteActionId.set(null);
        this.loadInvitations();
        void this.router.navigate(['/developer/messages'], {
          queryParams: { room: roomId },
        });
      },
      error: (err) => {
        this.inviteActionId.set(null);
        this.invitationsError.set(extractApiError(err) || 'Could not accept invitation.');
      },
    });
  }

  protected rejectInvitation(inv: ProjectInvitation): void {
    if (inv.status !== 'Pending' || this.inviteActionId()) return;
    this.inviteActionId.set(inv.id);
    this.invitationsApi.reject(inv.id).subscribe({
      next: () => {
        this.inviteActionId.set(null);
        this.loadInvitations();
      },
      error: (err) => {
        this.inviteActionId.set(null);
        this.invitationsError.set(extractApiError(err) || 'Could not reject invitation.');
      },
    });
  }

  protected openInvitationChat(roomId: string | null): void {
    if (!roomId) return;
    void this.router.navigate(['/developer/messages'], { queryParams: { room: roomId } });
  }

  private loadInvitations(): void {
    this.loadingInvitations.set(true);
    this.invitationsError.set(null);
    this.invitationsApi.getReceived().subscribe({
      next: (items) => {
        this.invitations.set(items);
        this.loadingInvitations.set(false);
      },
      error: (err) => {
        this.loadingInvitations.set(false);
        this.invitationsError.set(extractApiError(err) || 'Could not load invitations.');
      },
    });
  }

  protected isOwnTeamJob(job: TeamJob): boolean {
    return !!job.teamId && this.myTeamIds().has(job.teamId);
  }

  protected hasApplied(jobId: string): boolean {
    return this.appliedJobIds().includes(jobId);
  }

  protected teamNameForJob(job: TeamJob): string {
    if (job.teamName?.trim()) return job.teamName.trim();
    const mine = this.activeTeams().find((t) => t.id === job.teamId);
    return mine?.name?.trim() || 'Team';
  }

  protected teamLogoForJob(job: TeamJob): string | null {
    if (job.teamLogo?.trim()) return job.teamLogo.trim();
    const mine = this.activeTeams().find((t) => t.id === job.teamId);
    return mine?.logo?.trim() || null;
  }

  protected jobStatusLabel(status: string | null | undefined): string {
    const raw = (status || 'open').trim();
    if (!raw) return 'Open';
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  protected relativeTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  protected openApplyJob(job: TeamJob): void {
    if (this.isOwnTeamJob(job) || this.hasApplied(job.id)) return;
    this.applyJobId.set(job.id);
    this.applyJobTitle.set(job.title);
    this.applyTeamName.set(this.teamNameForJob(job));
    this.applyCoverLetter.set('');
    this.applyError.set(null);
    this.applySuccess.set(false);
    this.applyJobOpen.set(true);
  }

  protected closeApplyJob(): void {
    if (this.applySubmitting()) return;
    this.applyJobOpen.set(false);
    this.applyJobId.set(null);
    this.applyJobTitle.set('');
    this.applyTeamName.set('');
    this.applyCoverLetter.set('');
    this.applyError.set(null);
    this.applySuccess.set(false);
  }

  protected submitApplyJob(): void {
    const jobId = this.applyJobId();
    if (!jobId || this.applySubmitting()) return;

    this.applySubmitting.set(true);
    this.applyError.set(null);

    this.teamsApi.applyToTeamJob(jobId, this.applyCoverLetter()).subscribe({
      next: () => {
        this.applySubmitting.set(false);
        this.applySuccess.set(true);
        this.appliedJobIds.update((ids) => [...ids, jobId]);
        setTimeout(() => this.closeApplyJob(), 1200);
      },
      error: (err) => {
        this.applySubmitting.set(false);
        this.applyError.set(
          extractApiError(err, 'Could not submit your application. Try again.'),
        );
      },
    });
  }

  protected openJobTeam(job: TeamJob, event?: Event): void {
    event?.stopPropagation();
    if (!job.teamId) return;
    void this.router.navigateByUrl(`/developer/teams/${job.teamId}`);
  }

  protected selectCategory(category: string): void {
    this.activeCategory.set(category);
    if (this.activeTab() === 'discover') {
      this.loadDiscoverTeams(1);
    }
  }

  protected onDiscoverSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.discoverSearch.set(value);
    if (this.discoverSearchTimer) clearTimeout(this.discoverSearchTimer);
    this.discoverSearchTimer = setTimeout(() => {
      if (this.activeTab() === 'discover') {
        this.loadDiscoverTeams(1);
      }
    }, 350);
  }

  protected goDiscoverPage(page: number): void {
    if (page < 1 || page > this.discoverTotalPages() || page === this.discoverPage()) return;
    this.loadDiscoverTeams(page);
  }

  protected openFilters(): void {
    this.filtersOpen.set(true);
  }

  protected closeFilters(): void {
    this.filtersOpen.set(false);
  }

  protected openCreateTeam(): void {
    void this.router.navigateByUrl('/developer/teams/create');
  }

  protected openTeam(team: Team): void {
    void this.router.navigateByUrl(`/developer/teams/${team.id}`);
  }

  protected openJoinModal(): void {
    this.joinModalOpen.set(true);
    this.joinError.set(null);
    this.joinSuccess.set(false);
  }

  protected closeJoinModal(): void {
    if (this.joinSubmitting()) return;
    this.joinModalOpen.set(false);
    this.joinCode.set('');
    this.joinNote.set('');
    this.joinError.set(null);
    this.joinSuccess.set(false);
  }

  protected onJoinCodeInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    this.joinCode.set(raw.slice(0, 16));
    this.joinError.set(null);
    this.joinSuccess.set(false);
    (event.target as HTMLInputElement).value = this.joinCode();
  }

  protected onJoinNoteInput(event: Event): void {
    let value = (event.target as HTMLTextAreaElement).value;
    if (value.length > 300) value = value.slice(0, 300);
    this.joinNote.set(value);
  }

  protected submitJoin(event: Event): void {
    event.preventDefault();
    if (!this.canSubmitJoin() || this.joinSubmitting()) return;

    this.joinSubmitting.set(true);
    this.joinError.set(null);
    this.joinSuccess.set(false);

    this.teamsApi
      .joinByCode(this.joinCode().trim(), this.joinNote().trim() || undefined)
      .pipe(finalize(() => this.joinSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.joinSuccess.set(true);
          this.loadActiveTeams();
          setTimeout(() => this.closeJoinModal(), 1400);
        },
        error: (err) => {
          this.joinError.set(
            extractApiError(err, 'Could not join with this code. Check the code and try again.'),
          );
        },
      });
  }

  protected initials(name: string): string {
    return this.cleanText(name, 'FG')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  protected isLeader(team: Team): boolean {
    if (team.myRole === 'TeamLeader') return true;
    if (team.myRole === 'TeamMember') return false;
    const userId = this.auth.session()?.id;
    return !!userId && team.ownerUserId === userId;
  }

  protected roleLabel(team: Team): string {
    if (team.myRole === 'TeamLeader' || this.isLeader(team)) return 'Team Leader';
    if (team.myRole === 'TeamMember') return 'Team Member';
    return 'Agency';
  }

  protected primaryCategory(team: Team): string {
    const primary = team.categories.find((c) => c.isPrimary) ?? team.categories[0];
    if (!primary) return 'Agency';

    const fromDto = this.cleanText(primary.nameEn ?? '');
    if (fromDto && !this.looksLikeArabic(fromDto)) return fromDto;

    const fromLookup = this.cleanText(this.categoryNameById()[primary.categoryId] ?? '');
    if (fromLookup) return fromLookup;

    // Never prefer Arabic `name` for UI labels.
    return 'Agency';
  }

  /** Compact badge label — short enough for a full pill, never CSS-truncated. */
  protected categoryBadgeLabel(team: Team): string {
    const full = this.primaryCategory(team);
    if (full.length <= 14) return full;

    const words = full.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const short = words[0];
      if (short.length <= 14) return short;
    }
    return full.slice(0, 12).trimEnd();
  }

  protected skillLabels(team: Team): string[] {
    return team.skills
      .map((skill) => this.cleanText(skill.name))
      .filter(Boolean)
      .slice(0, 3);
  }

  protected skillOverflow(team: Team): number {
    const total = team.skills
      .map((skill) => this.cleanText(skill.name))
      .filter(Boolean).length;
    return Math.max(total - 3, 0);
  }

  protected teamName(team: Team): string {
    return this.cleanText(team.name, 'Untitled Team');
  }

  protected teamAbout(team: Team, fallback: string): string {
    return this.cleanText(team.aboutUs ?? '', fallback);
  }

  protected ratingLabel(team: Team): string {
    if (team.ratingCount > 0 && team.averageRating > 0) {
      return team.averageRating.toFixed(1);
    }
    return 'New';
  }

  protected hasRating(team: Team): boolean {
    return team.ratingCount > 0 && team.averageRating > 0;
  }

  protected projectsLabel(team: Team): string {
    const count = team.projectsCount ?? 0;
    return count === 1 ? '1 Project' : `${count} Projects`;
  }

  protected memberAvatars(team: Team): TeamMemberAvatar[] {
    const avatars = team.memberAvatars ?? [];
    if (avatars.length > 0) return avatars.slice(0, 3);

    // Fallback placeholders so the card never looks empty when members exist.
    const count = Math.min(Math.max(team.membersCount, team.ownerName ? 1 : 0), 3);
    return Array.from({ length: count }, (_, index) => ({
      userId: `${team.id}-placeholder-${index}`,
      name: index === 0 ? team.ownerName || 'Member' : 'Member',
      imageUrl: null,
    }));
  }

  protected overflowMembers(team: Team): number {
    const shown = Math.min(3, this.memberAvatars(team).length);
    return Math.max(team.membersCount - shown, 0);
  }

  protected avatarInitials(name: string): string {
    return this.initials(name || 'FG');
  }

  private loadCategories(): void {
    this.categoriesApi.getCategories().subscribe({
      next: (categories) => this.applyCategories(categories),
      error: () => this.categoryOptions.set(['All']),
    });
  }

  private applyCategories(categories: CategoryDto[]): void {
    const labels = categories
      .map((c) => c.nameEn?.trim() || c.name?.trim())
      .filter((name): name is string => !!name && !this.looksLikeArabic(name));

    const lookup: Record<string, string> = {};
    const byName: Record<string, string> = {};
    for (const category of categories) {
      const english = category.nameEn?.trim();
      if (english) {
        lookup[category.id] = english;
        byName[english] = category.id;
      }
    }

    this.categoryNameById.set(lookup);
    this.categoryIdByName.set(byName);
    this.categoryOptions.set(['All', ...labels]);
  }

  private looksLikeArabic(value: string): boolean {
    return /[\u0600-\u06FF]/.test(value);
  }

  private cleanText(value: string | null | undefined, fallback = ''): string {
    const source = (value ?? '').trim();
    if (!source) return fallback;

    const decoded = this.decodeMojibake(source);
    return decoded || fallback;
  }

  private decodeMojibake(value: string): string {
    if (!this.looksLikeMojibake(value)) {
      return value;
    }

    try {
      const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
      return decoded || value;
    } catch {
      return value;
    }
  }

  private looksLikeMojibake(value: string): boolean {
    const hasArabic = /[\u0600-\u06FF]/.test(value);
    const hasLatin1Artifacts = /[ØÙ][\u0080-\u00FFA-Za-z]/.test(value);
    return !hasArabic && hasLatin1Artifacts;
  }

  private loadActiveTeams(): void {
    this.loadingActive.set(true);
    this.activeError.set(null);

    this.teamsApi.getMine().subscribe({
      next: (teams) => {
        this.activeTeams.set(teams);
        this.loadingActive.set(false);
      },
      error: () => {
        this.activeError.set('Could not load your teams right now.');
        this.loadingActive.set(false);
      },
    });
  }

  private loadDiscoverTeams(page = 1): void {
    this.loadingDiscover.set(true);
    this.discoverError.set(null);
    this.discoverPage.set(page);

    const category = this.activeCategory();
    const categoryId =
      category === 'All' ? null : this.categoryIdByName()[category] ?? null;

    this.teamsApi
      .browse({
        search: this.discoverSearch(),
        categoryId,
        pageNumber: page,
        pageSize: DISCOVER_PAGE_SIZE,
        excludeMine: true,
      })
      .subscribe({
        next: (result) => {
          this.discoverTeams.set(result.items);
          this.discoverTotalCount.set(result.totalCount);
          this.discoverPage.set(result.pageNumber);
          this.loadingDiscover.set(false);
        },
        error: () => {
          this.discoverError.set('Could not load discover teams right now.');
          this.loadingDiscover.set(false);
        },
      });
  }

  private loadOpenings(): void {
    this.loadingOpenings.set(true);
    this.openingsError.set(null);

    this.teamsApi.browseOpenJobs({ pageNumber: 1, pageSize: 12 }).subscribe({
      next: (result) => {
        this.openings.set(result);
        this.loadingOpenings.set(false);
      },
      error: () => {
        this.openingsError.set('Could not load open positions right now.');
        this.loadingOpenings.set(false);
      },
    });
  }
}
