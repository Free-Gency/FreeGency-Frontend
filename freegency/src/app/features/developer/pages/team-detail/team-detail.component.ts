import { DecimalPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  ArrowLeft01Icon,
  Briefcase01Icon,
  Camera01Icon,
  Cancel01Icon,
  ChartHistogramIcon,
  Copy01Icon,
  DashboardSquare01Icon,
  Delete02Icon,
  Folder01Icon,
  Message01Icon,
  PencilEdit01Icon,
  StarIcon,
  Tick02Icon,
  UserGroupIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { CategoriesApiService } from '../../../auth/data-access/categories-api.service';
import { TaxonomyApiService } from '../../../auth/data-access/taxonomy-api.service';
import { Project } from '../../../../shared/models/Project';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { DeveloperManageWorkService } from '../../data-access/developer-manage-work.service';
import { TeamsService, type TeamReview } from '../../data-access/teams.service';
import {
  Team,
  TeamDetailTab,
  TeamJob,
  TeamJobDetails,
  TeamJoinRequest,
  TeamMemberRow,
  TeamPortfolioProject,
  TeamRoleLabel,
} from '../../models/team';
import { TaskAssigneeOption } from '../../models/task';
import { ProjectMilestone } from '../../../project/models/project-milestone';
import { ProjectMilestonesApiService } from '../../../project/data-access/project-milestones-api.service';
import { MessagesPanelComponent } from '../../../chat/messages-panel/messages-panel.component';
import { TeamTaskBoardComponent } from '../team-task-board/team-task-board.component';
import { MyTasksComponent } from '../../components/my-tasks/my-tasks.component';

type SidebarKey = TeamDetailTab;
type ExpertiseFocus = 'categories' | 'specialties' | 'skills';

interface ChipOption {
  id: string;
  label: string;
}

interface FinanceDemoRow {
  project: string;
  role: string;
  share: string;
  amount: string;
  status: 'Released' | 'Pending';
}

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [
    HugeiconsIconComponent,
    RouterLink,
    FormsModule,
    DecimalPipe,
    DatePipe,
    DeveloperViewNavbarComponent,
    MessagesPanelComponent,
    TeamTaskBoardComponent,
    MyTasksComponent,
  ],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.css',
})
export class TeamDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamsApi = inject(TeamsService);
  private readonly projectsApi = inject(DeveloperManageWorkService);
  private readonly milestonesApi = inject(ProjectMilestonesApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly taxonomyApi = inject(TaxonomyApiService);
  protected readonly auth = inject(AuthService);

  protected readonly backIcon = ArrowLeft01Icon as IconSvgObject;
  protected readonly starIcon = StarIcon as IconSvgObject;
  protected readonly groupIcon = UserGroupIcon as IconSvgObject;
  protected readonly copyIcon = Copy01Icon as IconSvgObject;
  protected readonly addIcon = Add01Icon as IconSvgObject;
  protected readonly editIcon = PencilEdit01Icon as IconSvgObject;
  protected readonly deleteIcon = Delete02Icon as IconSvgObject;
  protected readonly dashIcon = DashboardSquare01Icon as IconSvgObject;
  protected readonly folderIcon = Folder01Icon as IconSvgObject;
  protected readonly chartIcon = ChartHistogramIcon as IconSvgObject;
  protected readonly messageIcon = Message01Icon as IconSvgObject;
  protected readonly walletIcon = Wallet01Icon as IconSvgObject;
  protected readonly cameraIcon = Camera01Icon as IconSvgObject;
  protected readonly tickIcon = Tick02Icon as IconSvgObject;
  protected readonly briefcaseIcon = Briefcase01Icon as IconSvgObject;
  protected readonly closeIcon = Cancel01Icon as IconSvgObject;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly team = signal<Team | null>(null);
  protected readonly portfolio = signal<TeamPortfolioProject[]>([]);
  protected readonly projects = signal<Project[]>([]);
  protected readonly projectsLoading = signal(false);
  protected readonly activeTab = signal<TeamDetailTab>('overview');
  protected readonly codeCopied = signal(false);
  protected readonly inviteOpen = signal(false);
  protected readonly expandedFinance = signal<string | null>('lumina');
  protected readonly mobileNavOpen = signal(false);
  protected readonly projectsLoaded = signal(false);

  protected readonly jobs = signal<TeamJob[]>([]);
  protected readonly jobsLoading = signal(false);
  protected readonly jobsLoaded = signal(false);
  protected readonly jobsError = signal<string | null>(null);
  protected readonly selectedJobId = signal<string | null>(null);

  protected readonly joinRequests = signal<TeamJoinRequest[]>([]);
  protected readonly joinRequestsLoading = signal(false);
  protected readonly joinRequestsLoaded = signal(false);
  protected readonly joinRequestsError = signal<string | null>(null);
  protected readonly requestActionId = signal<string | null>(null);

  /** Expanded job card (inline details, no popup). */
  protected readonly expandedJobId = signal<string | null>(null);
  protected readonly expandedJobDetails = signal<TeamJobDetails | null>(null);
  protected readonly expandedJobLoading = signal(false);
  /** Which job's requests accordion is open. */
  protected readonly requestsOpenJobId = signal<string | null>(null);

  /** Client-side jobs pagination (team jobs API returns full list). */
  protected readonly jobsPage = signal(1);
  protected readonly jobsPageSize = 5;

  /** Per-job applications pagination + status filter. */
  protected readonly appsPageByJob = signal<Record<string, number>>({});
  protected readonly appsPageSize = 5;
  protected readonly appsFilterByJob = signal<Record<string, 'pending' | 'all' | 'accepted' | 'rejected'>>({});

  /**
   * Future: AI ranks applicants by profile + CV for the open role.
   * When the ranking API lands, toggle will call it and fill matchScore/matchRank.
   */
  protected readonly aiRankByJob = signal<Record<string, boolean>>({});
  protected readonly aiRankLoadingJobId = signal<string | null>(null);
  protected readonly aiRankHintByJob = signal<Record<string, string | null>>({});

  protected readonly joinRequestsTotal = signal(0);
  protected readonly joinRequestsPage = signal(1);
  protected readonly joinRequestsHasMore = signal(false);

  protected readonly jobDetailOpen = signal(false);
  protected readonly jobDetailLoading = signal(false);
  protected readonly jobDetail = signal<TeamJobDetails | null>(null);
  protected readonly jobDetailError = signal<string | null>(null);

  protected readonly jobFormOpen = signal(false);
  protected readonly jobFormSaving = signal(false);
  protected readonly jobFormError = signal<string | null>(null);
  protected readonly jobFormTitle = signal('');
  protected readonly jobFormDescription = signal('');
  protected readonly jobFormSkillIds = signal<string[]>([]);
  protected readonly editingJobId = signal<string | null>(null);

  protected readonly applyJobOpen = signal(false);
  protected readonly applyJobId = signal<string | null>(null);
  protected readonly applyJobTitle = signal('');
  protected readonly applyCoverLetter = signal('');
  protected readonly applySubmitting = signal(false);
  protected readonly applyError = signal<string | null>(null);
  protected readonly applySuccess = signal(false);
  protected readonly appliedJobIds = signal<string[]>([]);

  protected readonly teamReviews = signal<TeamReview[]>([]);
  protected readonly teamReviewsLoading = signal(false);
  protected readonly teamReviewRating = signal(0);
  protected readonly teamReviewHover = signal(0);
  protected readonly teamReviewComment = signal('');
  protected readonly teamReviewSubmitting = signal(false);
  protected readonly teamReviewError = signal<string | null>(null);
  protected readonly starChoices = [1, 2, 3, 4, 5] as const;

  protected readonly profileModalOpen = signal(false);
  protected readonly profileSaving = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly editName = signal('');
  protected readonly editAbout = signal('');

  protected readonly members = signal<TeamMemberRow[]>([]);
  protected readonly membersLoading = signal(false);
  protected readonly membersLoaded = signal(false);
  protected readonly membersError = signal<string | null>(null);
  protected readonly memberRoleUpdating = signal<string | null>(null);

  /** Task Management tab — selected project/milestone driving the task board. */
  protected readonly taskProjectId = signal<string | null>(null);
  protected readonly taskMilestoneId = signal<string | null>(null);
  protected readonly taskMilestones = signal<ProjectMilestone[]>([]);
  protected readonly taskMilestonesLoading = signal(false);
  protected readonly taskMilestonesLoaded = signal(false);
  protected readonly taskMilestonesError = signal<string | null>(null);

  protected readonly expertiseModalOpen = signal(false);
  protected readonly expertiseFocus = signal<ExpertiseFocus>('categories');
  protected readonly expertiseSaving = signal(false);
  protected readonly expertiseError = signal<string | null>(null);
  protected readonly expertiseLoading = signal(false);
  protected readonly allCategories = signal<ChipOption[]>([]);
  protected readonly allSpecialties = signal<ChipOption[]>([]);
  protected readonly allSkills = signal<ChipOption[]>([]);
  protected readonly selectedCategoryIds = signal<string[]>([]);
  protected readonly primaryCategoryId = signal<string | null>(null);
  protected readonly selectedSpecialtyIds = signal<string[]>([]);
  protected readonly selectedSkillIds = signal<string[]>([]);

  protected readonly role = computed<TeamRoleLabel | null>(() => {
    const t = this.team();
    if (!t) return null;
    if (t.myRole === 'TeamLeader' || t.myRole === 'TeamMember') return t.myRole;
    const uid = this.auth.session()?.id;
    if (uid && t.ownerUserId === uid) return 'TeamLeader';
    return null;
  });

  protected readonly isTeamMember = computed(() => this.role() != null);

  protected readonly isLeader = computed(() => this.role() === 'TeamLeader');

  protected readonly teamAverageRating = computed(() => {
    const list = this.teamReviews();
    if (list.length) {
      return list.reduce((sum, r) => sum + this.starRating(r.rating), 0) / list.length;
    }
    return this.team()?.averageRating ?? 0;
  });

  protected readonly teamRoundedAverage = computed(() => Math.round(this.teamAverageRating()));

  protected readonly canReviewTeam = computed(() => {
    if (!this.auth.session()?.id) return false;
    if (this.isTeamMember()) return false;
    const uid = this.auth.session()!.id;
    return !this.teamReviews().some((r) => r.reviewerUserId === uid);
  });

  protected readonly openJobs = computed(() =>
    this.jobs().filter((j) => this.isJobOpen(j.status)),
  );

  protected readonly tabs = computed(() => {
    const items: { id: TeamDetailTab; label: string }[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'projects', label: 'Projects' },
      { id: 'tasks', label: 'Task Management' },
      { id: 'finance', label: 'Finance' },
      { id: 'messages', label: 'Messages' },
      { id: 'members', label: 'Members' },
    ];
    return items;
  });

  protected readonly openJobsCount = computed(
    () => this.jobs().filter((j) => this.isJobOpen(j.status)).length,
  );

  protected readonly pendingRequestsCount = computed(
    () => this.joinRequests().filter((r) => this.isRequestPending(r.status)).length,
  );

  protected readonly jobsTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.jobs().length / this.jobsPageSize)),
  );

  protected readonly pagedJobs = computed(() => {
    const page = this.jobsPage();
    const start = (page - 1) * this.jobsPageSize;
    return this.jobs().slice(start, start + this.jobsPageSize);
  });

  protected readonly selectedJob = computed(() => {
    const id = this.selectedJobId();
    if (!id) return null;
    return this.jobs().find((j) => j.id === id) ?? null;
  });

  protected readonly filteredJoinRequests = computed(() => {
    const jobId = this.selectedJobId();
    const all = this.joinRequests();
    if (!jobId) return all;
    return all.filter((r) => r.teamJobId === jobId);
  });

  protected readonly teamSkillOptions = computed(() => {
    const t = this.team();
    if (!t) return [] as ChipOption[];
    return (t.skills ?? [])
      .map((s) => ({
        id: s.skillId,
        label: (s.name || '').trim() || 'Skill',
      }))
      .filter((s) => !!s.id);
  });

  protected readonly categoryLabels = computed(() => {
    const t = this.team();
    if (!t) return [] as { id: string; label: string; primary: boolean }[];
    return (t.categories ?? [])
      .map((c) => ({
        id: c.categoryId,
        label: (c.nameEn || c.name || '').trim() || 'Category',
        primary: !!c.isPrimary,
      }))
      .filter((c) => !!c.label);
  });

  protected readonly specialtyLabels = computed(() => {
    const t = this.team();
    if (!t) return [] as string[];
    return (t.specialties ?? [])
      .map((s) => (s.nameEn || s.nameAr || '').trim())
      .filter(Boolean);
  });

  protected readonly skillLabels = computed(() => {
    const t = this.team();
    if (!t) return [] as string[];
    return (t.skills ?? [])
      .map((s) => (s.name || '').trim())
      .filter(Boolean);
  });

  protected readonly teamProjects = computed(() => {
    const id = this.team()?.id;
    if (!id) return [];
    return this.projects().filter((p) => (p.assignedTeamId ?? null) === id);
  });

  protected readonly assigneeOptions = computed<TaskAssigneeOption[]>(() =>
    this.members().map((m) => ({
      userId: m.userId,
      name: m.name,
      imageUrl: m.imageUrl,
    })),
  );

  protected readonly financeMemberRows = computed<FinanceDemoRow[]>(() => [
    { project: 'Lumina Finance App', role: 'Contributor · 25% share', share: '25%', amount: '$1,000.00', status: 'Released' },
    { project: 'Aether AI Engine', role: 'Contributor · 25% share', share: '25%', amount: '$1,500.00', status: 'Pending' },
  ]);

  protected readonly sidebarItems: {
    key: SidebarKey;
    label: string;
    icon: IconSvgObject;
  }[] = [
    { key: 'overview', label: 'Overview', icon: this.dashIcon },
    { key: 'projects', label: 'Projects', icon: this.folderIcon },
    { key: 'tasks', label: 'Task Management', icon: this.chartIcon },
    { key: 'finance', label: 'Finance', icon: this.walletIcon },
    { key: 'messages', label: 'Messages', icon: this.messageIcon },
    { key: 'members', label: 'Members', icon: this.groupIcon },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('teamId');
    const rawTab = this.route.snapshot.queryParamMap.get('tab');
    this.activeTab.set(this.normalizeTab(rawTab));
    if (!id) {
      this.error.set('Team not found.');
      this.loading.set(false);
      return;
    }
    this.loadTeam(id);
  }

  protected sidebarActive(key: SidebarKey): boolean {
    return this.activeTab() === key;
  }

  protected onSidebar(item: (typeof this.sidebarItems)[number]): void {
    this.mobileNavOpen.set(false);
    this.setTab(item.key);
  }

  protected goMyTeams(): void {
    void this.router.navigateByUrl('/developer/teams');
  }

  protected setTab(tab: TeamDetailTab): void {
    if (!this.isTeamMember()) {
      this.activeTab.set('overview');
      return;
    }
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (tab === 'projects' && !this.projectsLoaded()) {
      const id = this.team()?.id;
      if (id) this.loadProjects(id);
    }
    if (tab === 'tasks') {
      const id = this.team()?.id;
      if (id && !this.projectsLoaded()) this.loadProjects(id);
      if (id && !this.membersLoaded()) this.loadMembers(id);
      if (!this.taskProjectId()) {
        const first = this.teamProjects()[0];
        if (first) this.selectTaskProject(first.id);
      }
    }
    if (tab === 'jobs' && !this.jobsLoaded()) {
      const id = this.team()?.id;
      if (id) this.loadJobs(id);
    }
    if (tab === 'jobs' && this.isLeader() && !this.joinRequestsLoaded()) {
      const id = this.team()?.id;
      if (id) this.loadJoinRequests(id);
    }
    if (tab === 'members' && !this.membersLoaded()) {
      const id = this.team()?.id;
      if (id) this.loadMembers(id);
    }
  }

  protected openInvite(): void {
    this.inviteOpen.set(true);
    this.codeCopied.set(false);
  }

  protected closeInvite(): void {
    this.inviteOpen.set(false);
  }

  protected copyCode(): void {
    const code = this.team()?.teamCode;
    if (!code || !navigator.clipboard) return;
    void navigator.clipboard.writeText(code).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 1600);
    });
  }

  protected categoryTone(label: string): { bg: string; fg: string; border: string } {
    const palette = [
      { bg: '#EEF2FF', fg: '#4338CA', border: '#C7D2FE' },
      { bg: '#ECFDF5', fg: '#047857', border: '#A7F3D0' },
      { bg: '#FFF7ED', fg: '#C2410C', border: '#FED7AA' },
      { bg: '#FDF2F8', fg: '#BE185D', border: '#FBCFE8' },
      { bg: '#F0F9FF', fg: '#0369A1', border: '#BAE6FD' },
      { bg: '#FEF3C7', fg: '#B45309', border: '#FDE68A' },
      { bg: '#F5F3FF', fg: '#6D28D9', border: '#DDD6FE' },
      { bg: '#F0FDFA', fg: '#0F766E', border: '#99F6E4' },
    ] as const;
    const key = (label || 'Agency').trim().toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
  }

  protected openProfileEdit(): void {
    if (!this.isLeader()) return;
    const t = this.team();
    if (!t) return;
    this.editName.set(t.name);
    this.editAbout.set(t.aboutUs ?? '');
    this.profileError.set(null);
    this.profileModalOpen.set(true);
  }

  protected closeProfileEdit(): void {
    if (this.profileSaving()) return;
    this.profileModalOpen.set(false);
  }

  protected quickPickCover(event: Event): void {
    event.stopPropagation();
    if (!this.isLeader()) return;
    const input = document.getElementById('tw-quick-cover') as HTMLInputElement | null;
    input?.click();
  }

  protected quickPickLogo(event: Event): void {
    event.stopPropagation();
    if (!this.isLeader()) return;
    const input = document.getElementById('tw-quick-logo') as HTMLInputElement | null;
    input?.click();
  }

  protected onQuickCoverChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    const team = this.team();
    if (!file || !team || !this.isLeader()) return;
    this.teamsApi
      .updateTeam(team.id, { name: team.name, aboutUs: team.aboutUs, cover: file }, { skipLoading: true })
      .subscribe({
        next: () => this.refreshTeam(team.id),
        error: () => this.profileError.set('Could not update cover.'),
      });
  }

  protected onQuickLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    const team = this.team();
    if (!file || !team || !this.isLeader()) return;
    this.teamsApi
      .updateTeam(team.id, { name: team.name, aboutUs: team.aboutUs, logo: file }, { skipLoading: true })
      .subscribe({
        next: () => this.refreshTeam(team.id),
        error: () => this.profileError.set('Could not update logo.'),
      });
  }

  protected saveProfileEdit(): void {
    const team = this.team();
    const name = this.editName().trim();
    if (!team || !name) {
      this.profileError.set('Team name is required.');
      return;
    }
    this.profileSaving.set(true);
    this.profileError.set(null);
    this.teamsApi
      .updateTeam(
        team.id,
        {
          name,
          aboutUs: this.editAbout(),
        },
        { skipLoading: true },
      )
      .subscribe({
        next: () => {
          this.profileSaving.set(false);
          this.profileModalOpen.set(false);
          this.refreshTeam(team.id);
        },
        error: () => {
          this.profileSaving.set(false);
          this.profileError.set('Could not save team profile.');
        },
      });
  }

  protected openExpertiseEdit(focus: ExpertiseFocus = 'categories'): void {
    if (!this.isLeader()) return;
    const t = this.team();
    if (!t) return;
    this.expertiseFocus.set(focus);
    this.expertiseError.set(null);
    this.selectedCategoryIds.set((t.categories ?? []).map((c) => c.categoryId));
    this.primaryCategoryId.set(
      (t.categories ?? []).find((c) => c.isPrimary)?.categoryId ??
        t.categories?.[0]?.categoryId ??
        null,
    );
    this.selectedSpecialtyIds.set((t.specialties ?? []).map((s) => s.specialtyId));
    this.selectedSkillIds.set((t.skills ?? []).map((s) => s.skillId));
    this.expertiseModalOpen.set(true);
    this.loadExpertiseTaxonomy();
  }

  protected closeExpertiseEdit(): void {
    if (this.expertiseSaving()) return;
    this.expertiseModalOpen.set(false);
  }

  protected toggleEditCategory(id: string): void {
    const selected = this.selectedCategoryIds();
    if (selected.includes(id)) {
      const next = selected.filter((x) => x !== id);
      this.selectedCategoryIds.set(next);
      if (this.primaryCategoryId() === id) {
        this.primaryCategoryId.set(next[0] ?? null);
      }
    } else {
      this.selectedCategoryIds.set([...selected, id]);
      if (!this.primaryCategoryId()) this.primaryCategoryId.set(id);
    }
    this.reloadEditSpecialties();
  }

  protected setPrimaryCategory(id: string): void {
    if (!this.selectedCategoryIds().includes(id)) return;
    this.primaryCategoryId.set(id);
  }

  protected toggleEditSpecialty(id: string): void {
    const selected = this.selectedSpecialtyIds();
    this.selectedSpecialtyIds.set(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
    this.reloadEditSkills();
  }

  protected toggleEditSkill(id: string): void {
    const selected = this.selectedSkillIds();
    this.selectedSkillIds.set(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  }

  protected categoryLabelById(id: string): string {
    return this.allCategories().find((c) => c.id === id)?.label || id;
  }

  protected saveExpertiseEdit(): void {
    const team = this.team();
    if (!team) return;
    const categoryIds = this.selectedCategoryIds();
    if (!categoryIds.length) {
      this.expertiseError.set('Select at least one category.');
      return;
    }
    const primary = this.primaryCategoryId() ?? categoryIds[0];
    this.expertiseSaving.set(true);
    this.expertiseError.set(null);

    this.teamsApi
      .replaceCategories(
        team.id,
        categoryIds.map((categoryId) => ({
          categoryId,
          isPrimary: categoryId === primary,
        })),
      )
      .subscribe({
        next: () => {
          this.teamsApi.replaceSpecialties(team.id, this.selectedSpecialtyIds()).subscribe({
            next: () => {
              this.teamsApi.replaceSkills(team.id, this.selectedSkillIds()).subscribe({
                next: () => {
                  this.expertiseSaving.set(false);
                  this.expertiseModalOpen.set(false);
                  this.refreshTeam(team.id);
                },
                error: () => {
                  this.expertiseSaving.set(false);
                  this.expertiseError.set('Could not update skills.');
                },
              });
            },
            error: () => {
              this.expertiseSaving.set(false);
              this.expertiseError.set('Could not update specialties.');
            },
          });
        },
        error: () => {
          this.expertiseSaving.set(false);
          this.expertiseError.set('Could not update categories.');
        },
      });
  }

  private loadExpertiseTaxonomy(): void {
    this.expertiseLoading.set(true);
    this.categoriesApi
      .getCategories()
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (categories) => {
          this.allCategories.set(
            categories.map((c) => ({
              id: c.id,
              label: (c.nameEn || c.name || '').trim() || 'Category',
            })),
          );
          this.expertiseLoading.set(false);
          this.reloadEditSpecialties();
        },
        error: () => {
          this.expertiseLoading.set(false);
          this.expertiseError.set('Could not load categories.');
        },
      });
  }

  private reloadEditSpecialties(): void {
    const ids = this.selectedCategoryIds();
    if (!ids.length) {
      this.allSpecialties.set([]);
      this.selectedSpecialtyIds.set([]);
      this.allSkills.set([]);
      this.selectedSkillIds.set([]);
      return;
    }

    forkJoin(ids.map((id) => this.taxonomyApi.getSpecialtiesByCategory(id))).subscribe({
      next: (lists) => {
        const byId = new Map<string, ChipOption>();
        for (const item of lists.flat()) {
          byId.set(item.id, {
            id: item.id,
            label: (item.nameEn || item.nameAr || '').trim() || 'Specialty',
          });
        }
        const next = [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
        this.allSpecialties.set(next);
        const valid = new Set(next.map((s) => s.id));
        this.selectedSpecialtyIds.update((selected) => selected.filter((id) => valid.has(id)));
        this.reloadEditSkills();
      },
      error: () => {
        this.allSpecialties.set([]);
        this.allSkills.set([]);
      },
    });
  }

  private reloadEditSkills(): void {
    const specialtyIds = this.selectedSpecialtyIds();
    if (!specialtyIds.length) {
      this.allSkills.set([]);
      this.selectedSkillIds.set([]);
      return;
    }

    this.taxonomyApi.getSkillsForSpecialties(specialtyIds).subscribe({
      next: (skills) => {
        const next = skills.map((s) => ({
          id: s.id,
          label: (s.name || '').trim() || 'Skill',
        }));
        this.allSkills.set(next);
        const valid = new Set(next.map((s) => s.id));
        this.selectedSkillIds.update((selected) => selected.filter((id) => valid.has(id)));
      },
      error: () => {
        this.allSkills.set([]);
        this.selectedSkillIds.set([]);
      },
    });
  }

  private refreshTeam(id: string): void {
    this.teamsApi.getById(id, { skipLoading: true }).subscribe({
      next: (team) => this.team.set(team),
    });
  }

  protected openAddPortfolio(): void {
    const id = this.team()?.id;
    if (!id) return;
    void this.router.navigateByUrl(`/developer/teams/${id}/portfolio/new`);
  }

  protected openEditPortfolio(item: TeamPortfolioProject): void {
    const id = this.team()?.id;
    if (!id) return;
    void this.router.navigateByUrl(`/developer/teams/${id}/portfolio/${item.id}/edit`);
  }

  protected openPortfolioDetail(item: TeamPortfolioProject): void {
    const teamId = this.team()?.id;
    void this.router.navigate(['/developer/portfolio', item.id], {
      state: { fromTeamId: teamId ?? null },
    });
  }

  protected selectJob(job: TeamJob): void {
    this.toggleJobExpand(job);
  }

  protected clearSelectedJob(): void {
    this.selectedJobId.set(null);
    this.expandedJobId.set(null);
    this.expandedJobDetails.set(null);
    this.requestsOpenJobId.set(null);
  }

  protected toggleJobExpand(job: TeamJob): void {
    if (this.expandedJobId() === job.id) {
      this.expandedJobId.set(null);
      this.expandedJobDetails.set(null);
      this.selectedJobId.set(null);
      this.requestsOpenJobId.set(null);
      return;
    }

    this.expandedJobId.set(job.id);
    this.selectedJobId.set(job.id);
    this.expandedJobLoading.set(true);
    this.expandedJobDetails.set(null);

    if (this.isLeader() && !this.joinRequestsLoaded()) {
      const teamId = this.team()?.id;
      if (teamId) this.loadJoinRequests(teamId);
    }

    this.teamsApi.getJobDetails(job.id, { skipLoading: true }).subscribe({
      next: (details) => {
        if (this.expandedJobId() !== job.id) return;
        this.expandedJobDetails.set(details);
        this.expandedJobLoading.set(false);
      },
      error: () => {
        if (this.expandedJobId() !== job.id) return;
        this.expandedJobDetails.set(null);
        this.expandedJobLoading.set(false);
      },
    });
  }

  protected toggleRequests(jobId: string, event?: Event): void {
    event?.stopPropagation();
    const opening = this.requestsOpenJobId() !== jobId;
    this.requestsOpenJobId.set(opening ? jobId : null);
    if (opening) {
      this.appsPageByJob.update((m) => ({ ...m, [jobId]: 1 }));
      if (!this.appsFilterByJob()[jobId]) {
        this.appsFilterByJob.update((m) => ({ ...m, [jobId]: 'pending' }));
      }
    }
    if (this.isLeader() && !this.joinRequestsLoaded()) {
      const teamId = this.team()?.id;
      if (teamId) this.loadJoinRequests(teamId);
    }
  }

  protected isRequestsOpen(jobId: string): boolean {
    return this.requestsOpenJobId() === jobId;
  }

  protected requestCountForJob(jobId: string): number {
    return this.joinRequests().filter(
      (r) => r.teamJobId === jobId && this.isRequestPending(r.status),
    ).length;
  }

  protected requestsForJob(jobId: string): TeamJoinRequest[] {
    return this.joinRequests().filter((r) => r.teamJobId === jobId);
  }

  protected appsFilterForJob(jobId: string): 'pending' | 'all' | 'accepted' | 'rejected' {
    return this.appsFilterByJob()[jobId] ?? 'pending';
  }

  protected setAppsFilter(
    jobId: string,
    filter: 'pending' | 'all' | 'accepted' | 'rejected',
    event?: Event,
  ): void {
    event?.stopPropagation();
    this.appsFilterByJob.update((m) => ({ ...m, [jobId]: filter }));
    this.appsPageByJob.update((m) => ({ ...m, [jobId]: 1 }));
  }

  protected filteredRequestsForJob(jobId: string): TeamJoinRequest[] {
    const filter = this.appsFilterForJob(jobId);
    let list = this.requestsForJob(jobId);

    if (filter === 'pending') {
      list = list.filter((r) => this.isRequestPending(r.status));
    } else if (filter === 'accepted') {
      list = list.filter((r) => this.requestStatusLabel(r.status) === 'Accepted');
    } else if (filter === 'rejected') {
      list = list.filter((r) => this.requestStatusLabel(r.status) === 'Rejected');
    }

    const aiOn = !!this.aiRankByJob()[jobId];
    const hasScores = list.some((r) => r.matchScore != null);

    return [...list].sort((a, b) => {
      if (aiOn || hasScores) {
        const sa = a.matchScore ?? -1;
        const sb = b.matchScore ?? -1;
        if (sb !== sa) return sb - sa;
        const ra = a.matchRank ?? Number.MAX_SAFE_INTEGER;
        const rb = b.matchRank ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
      }
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
  }

  protected appsTotalPages(jobId: string): number {
    return Math.max(1, Math.ceil(this.filteredRequestsForJob(jobId).length / this.appsPageSize));
  }

  protected appsPage(jobId: string): number {
    return this.appsPageByJob()[jobId] ?? 1;
  }

  protected pagedRequestsForJob(jobId: string): TeamJoinRequest[] {
    const page = this.appsPage(jobId);
    const start = (page - 1) * this.appsPageSize;
    return this.filteredRequestsForJob(jobId).slice(start, start + this.appsPageSize);
  }

  protected setAppsPage(jobId: string, page: number, event?: Event): void {
    event?.stopPropagation();
    const clamped = Math.min(Math.max(1, page), this.appsTotalPages(jobId));
    this.appsPageByJob.update((m) => ({ ...m, [jobId]: clamped }));
  }

  protected setJobsPage(page: number): void {
    const clamped = Math.min(Math.max(1, page), this.jobsTotalPages());
    this.jobsPage.set(clamped);
  }

  protected isAiRankEnabled(jobId: string): boolean {
    return !!this.aiRankByJob()[jobId];
  }

  protected aiRankHint(jobId: string): string | null {
    return this.aiRankHintByJob()[jobId] ?? null;
  }

  /** Placeholder until join-request ranking API (profile + CV) is wired. */
  protected toggleAiRank(jobId: string, event?: Event): void {
    event?.stopPropagation();
    const enabling = !this.aiRankByJob()[jobId];
    if (!enabling) {
      this.aiRankByJob.update((m) => ({ ...m, [jobId]: false }));
      this.aiRankHintByJob.update((m) => ({ ...m, [jobId]: null }));
      return;
    }

    const hasScores = this.requestsForJob(jobId).some((r) => r.matchScore != null);
    this.aiRankByJob.update((m) => ({ ...m, [jobId]: true }));
    this.appsPageByJob.update((m) => ({ ...m, [jobId]: 1 }));

    if (hasScores) {
      this.aiRankHintByJob.update((m) => ({
        ...m,
        [jobId]: 'Sorted by AI match score from profile and CV.',
      }));
      return;
    }

    this.aiRankLoadingJobId.set(jobId);
    this.aiRankHintByJob.update((m) => ({
      ...m,
      [jobId]: 'AI ranking for profile + CV is coming soon. Layout is ready for scores when the API ships.',
    }));
    // Simulate brief load so UI path is ready for a real service call.
    setTimeout(() => {
      if (this.aiRankLoadingJobId() === jobId) {
        this.aiRankLoadingJobId.set(null);
      }
    }, 600);
  }

  protected matchPercent(req: TeamJoinRequest): number | null {
    if (req.matchScore == null || Number.isNaN(req.matchScore)) return null;
    return Math.round(req.matchScore);
  }

  protected readonly codeJoinRequests = computed(() =>
    this.joinRequests().filter((r) => !r.teamJobId),
  );

  protected isRequestPending(status: string | null | undefined): boolean {
    return (status || '').toLowerCase() === 'pending';
  }

  protected requestStatusLabel(status: string | null | undefined): string {
    const raw = (status || 'pending').toString();
    if (raw.toLowerCase() === 'pending') return 'Pending';
    if (raw.toLowerCase() === 'accepted') return 'Accepted';
    if (raw.toLowerCase() === 'rejected') return 'Rejected';
    return raw;
  }

  protected acceptRequest(req: TeamJoinRequest): void {
    if (!this.isLeader() || !this.isRequestPending(req.status)) return;
    this.requestActionId.set(req.id);
    this.teamsApi.acceptJoinRequest(req.id, { skipLoading: true }).subscribe({
      next: () => {
        this.requestActionId.set(null);
        this.joinRequests.update((list) =>
          list.map((r) => (r.id === req.id ? { ...r, status: 'Accepted' } : r)),
        );
        const teamId = this.team()?.id;
        if (teamId) this.refreshTeam(teamId);
      },
      error: () => {
        this.requestActionId.set(null);
        this.joinRequestsError.set('Could not accept this request.');
      },
    });
  }

  protected rejectRequest(req: TeamJoinRequest): void {
    if (!this.isLeader() || !this.isRequestPending(req.status)) return;
    if (!confirm(`Reject application from ${req.fullName}?`)) return;
    this.requestActionId.set(req.id);
    this.teamsApi.rejectJoinRequest(req.id, { skipLoading: true }).subscribe({
      next: () => {
        this.requestActionId.set(null);
        this.joinRequests.update((list) =>
          list.map((r) => (r.id === req.id ? { ...r, status: 'Rejected' } : r)),
        );
      },
      error: () => {
        this.requestActionId.set(null);
        this.joinRequestsError.set('Could not reject this request.');
      },
    });
  }

  protected openAddJob(): void {
    if (!this.isLeader()) return;
    this.editingJobId.set(null);
    this.jobFormTitle.set('');
    this.jobFormDescription.set('');
    this.jobFormSkillIds.set([]);
    this.jobFormError.set(null);
    this.jobFormOpen.set(true);
  }

  protected openEditJob(job: TeamJob | TeamJobDetails, event?: Event): void {
    event?.stopPropagation();
    if (!this.isLeader()) return;
    this.editingJobId.set(job.id);
    this.jobFormTitle.set(job.title);
    this.jobFormDescription.set(job.description ?? '');
    this.jobFormError.set(null);
    this.jobFormOpen.set(true);

    const fromDetails = 'skills' in job && Array.isArray(job.skills) ? job.skills : null;
    if (fromDetails) {
      this.jobFormSkillIds.set(fromDetails.map((s) => s.id));
      return;
    }

    this.jobFormSkillIds.set([]);
    this.teamsApi.getJobDetails(job.id, { skipLoading: true }).subscribe({
      next: (details) => {
        this.jobFormSkillIds.set((details.skills ?? []).map((s) => s.id));
      },
    });
  }

  protected closeJobForm(): void {
    if (this.jobFormSaving()) return;
    this.jobFormOpen.set(false);
    this.editingJobId.set(null);
  }

  protected toggleJobFormSkill(id: string): void {
    const selected = this.jobFormSkillIds();
    this.jobFormSkillIds.set(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  }

  protected saveJobForm(): void {
    const team = this.team();
    const title = this.jobFormTitle().trim();
    const description = this.jobFormDescription().trim();
    if (!team || !this.isLeader()) return;
    if (!title) {
      this.jobFormError.set('Job title is required.');
      return;
    }
    if (!description) {
      this.jobFormError.set('Job description is required.');
      return;
    }

    this.jobFormSaving.set(true);
    this.jobFormError.set(null);
    const skillIds = this.jobFormSkillIds();
    const editingId = this.editingJobId();

    if (editingId) {
      this.teamsApi.updateTeamJob(editingId, { title, description }, { skipLoading: true }).subscribe({
        next: () => {
          this.teamsApi.updateTeamJobSkills(editingId, skillIds, { skipLoading: true }).subscribe({
            next: () => {
              this.jobFormSaving.set(false);
              this.jobFormOpen.set(false);
              this.editingJobId.set(null);
              this.reloadJobs(team.id);
              if (this.jobDetail()?.id === editingId) {
                this.openJobDetail(editingId);
              }
            },
            error: () => {
              this.jobFormSaving.set(false);
              this.jobFormError.set('Job saved, but skills could not be updated.');
              this.reloadJobs(team.id);
            },
          });
        },
        error: () => {
          this.jobFormSaving.set(false);
          this.jobFormError.set('Could not update this job.');
        },
      });
      return;
    }

    this.teamsApi
      .createTeamJob(team.id, { title, description, skillIds }, { skipLoading: true })
      .subscribe({
        next: () => {
          this.jobFormSaving.set(false);
          this.jobFormOpen.set(false);
          this.reloadJobs(team.id);
        },
        error: () => {
          this.jobFormSaving.set(false);
          this.jobFormError.set('Could not create this job.');
        },
      });
  }

  protected openJobDetailFromCard(job: TeamJob): void {
    this.toggleJobExpand(job);
  }

  protected openJobDetail(jobId: string): void {
    const job = this.jobs().find((j) => j.id === jobId);
    if (job) this.toggleJobExpand(job);
  }

  protected closeJobDetail(): void {
    this.clearSelectedJob();
    this.jobDetailOpen.set(false);
    this.jobDetail.set(null);
    this.jobDetailError.set(null);
  }

  protected closeJob(job: TeamJob | TeamJobDetails, event?: Event): void {
    event?.stopPropagation();
    const team = this.team();
    if (!team || !this.isLeader()) return;
    if (!this.isJobOpen(job.status)) return;
    if (!confirm(`Close “${job.title}”? Applicants will no longer see it as open.`)) return;

    this.teamsApi.closeTeamJob(job.id, { skipLoading: true }).subscribe({
      next: () => {
        this.reloadJobs(team.id);
        if (this.jobDetail()?.id === job.id) {
          this.openJobDetail(job.id);
        }
      },
    });
  }

  protected starRating(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.min(5, Math.max(0, Math.round(n)));
  }

  protected submitTeamReview(): void {
    const team = this.team();
    if (!team || this.teamReviewSubmitting() || !this.canReviewTeam()) return;

    if (!this.auth.session()) {
      void this.router.navigateByUrl('/auth/login');
      return;
    }

    const rating = this.teamReviewRating();
    if (rating < 1 || rating > 5) {
      this.teamReviewError.set('Please choose a star rating.');
      return;
    }

    this.teamReviewSubmitting.set(true);
    this.teamReviewError.set(null);

    this.teamsApi.addTeamReview(team.id, {
      rating,
      comment: this.teamReviewComment().trim() || null,
    }).subscribe({
      next: (review) => {
        const next = [review, ...this.teamReviews()];
        this.teamReviews.set(next);
        const avg = next.reduce((sum, r) => sum + this.starRating(r.rating), 0) / next.length;
        this.team.update((t) =>
          t ? { ...t, averageRating: avg, ratingCount: next.length } : t,
        );
        this.teamReviewRating.set(0);
        this.teamReviewComment.set('');
        this.teamReviewSubmitting.set(false);
      },
      error: (err) => {
        this.teamReviewError.set(extractApiError(err, 'Could not submit your review.'));
        this.teamReviewSubmitting.set(false);
      },
    });
  }

  protected onTeamReviewCommentInput(event: Event): void {
    this.teamReviewComment.set((event.target as HTMLTextAreaElement).value.slice(0, 500));
  }

  protected isJobOpen(status: string | null | undefined): boolean {
    return (status || '').toLowerCase() === 'open';
  }

  protected openApplyJob(job: TeamJob): void {
    if (this.isTeamMember() || !this.isJobOpen(job.status) || this.appliedJobIds().includes(job.id)) {
      return;
    }
    this.applyJobId.set(job.id);
    this.applyJobTitle.set(job.title);
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
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
    const diffWeek = Math.floor(diffDay / 7);
    if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  protected deletePortfolio(item: TeamPortfolioProject, event: Event): void {
    event.stopPropagation();
    const team = this.team();
    if (!team || !this.isLeader()) return;
    if (!confirm(`Delete “${item.title}”?`)) return;
    this.teamsApi.deleteTeamPortfolio(team.id, item.id).subscribe({
      next: () => this.reloadPortfolio(team.id),
    });
  }

  protected toggleFinanceAccordion(id: string): void {
    this.expandedFinance.set(this.expandedFinance() === id ? null : id);
  }

  protected openWorkspace(project: Project): void {
    void this.router.navigateByUrl(`/developer/manage-work`);
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'T';
  }

  protected statusLabel(status: string): string {
    switch (status) {
      case 'InProgress':
        return 'IN PROGRESS';
      case 'Open':
        return 'STARTING';
      case 'Completed':
        return 'COMPLETED';
      default:
        return status.toUpperCase();
    }
  }

  protected formatBudget(project: Project): string {
    const amount = project.budgetMax || project.budgetMin || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: project.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private normalizeTab(raw: string | null): TeamDetailTab {
    if (raw === 'portfolio' || raw === 'management' || raw === 'jobs') return 'overview';
    if (
      raw === 'overview' ||
      raw === 'projects' ||
      raw === 'tasks' ||
      raw === 'finance' ||
      raw === 'messages' ||
      raw === 'members'
    ) {
      return raw;
    }
    return 'overview';
  }

  private loadTeamReviews(teamId: string): void {
    this.teamReviewsLoading.set(true);
    this.teamsApi.getTeamReviews(teamId, { skipLoading: true }).subscribe({
      next: (reviews) => {
        this.teamReviews.set(reviews);
        this.teamReviewsLoading.set(false);
      },
      error: () => {
        this.teamReviews.set([]);
        this.teamReviewsLoading.set(false);
      },
    });
  }

  private loadTeam(id: string): void {
    this.loading.set(true);
    this.teamsApi.getById(id, { skipLoading: true }).subscribe({
      next: (team) => {
        this.team.set(team);
        this.loading.set(false);
        this.reloadPortfolio(id);
        this.loadTeamReviews(id);
        if (!this.isTeamMember()) {
          this.activeTab.set('overview');
          this.loadJobs(id);
          return;
        }
        if (this.activeTab() === 'projects') {
          this.loadProjects(id);
        }
        if (this.activeTab() === 'tasks') {
          this.loadProjects(id);
          this.loadMembers(id);
        }
        if (this.activeTab() === 'jobs') {
          this.loadJobs(id);
          if (this.isLeader()) this.loadJoinRequests(id);
        }
        if (this.activeTab() === 'members') {
          this.loadMembers(id);
        }
      },
      error: () => {
        this.error.set('Could not load this team.');
        this.loading.set(false);
      },
    });
  }

  protected loadMembers(teamId: string): void {
    this.membersLoading.set(true);
    this.membersError.set(null);
    this.teamsApi.getMembers(teamId).subscribe({
      next: (rows) => {
        this.members.set(rows);
        this.membersLoaded.set(true);
        this.membersLoading.set(false);
      },
      error: (err) => {
        // Fallback for older API builds / owners not yet in TeamMembers
        const avatars = this.team()?.memberAvatars ?? [];
        if (avatars.length) {
          this.members.set(
            avatars.map((a) => ({
              userId: a.userId,
              name: a.name,
              imageUrl: a.imageUrl,
              role: a.userId === this.team()?.ownerUserId ? 'TeamLeader' : 'TeamMember',
              isOwner: a.userId === this.team()?.ownerUserId,
              joinedAt: null,
            })),
          );
          this.membersLoaded.set(true);
          this.membersLoading.set(false);
          this.membersError.set(null);
          return;
        }
        this.membersError.set(extractApiError(err) || 'Failed to load members.');
        this.membersLoading.set(false);
      },
    });
  }

  protected changeMemberRole(member: TeamMemberRow, role: string): void {
    const teamId = this.team()?.id;
    const next = role === 'TeamLeader' ? 'TeamLeader' : 'TeamMember';
    if (!teamId || !this.isLeader() || member.role === next) return;
    if (member.isOwner && next !== 'TeamLeader') return;

    this.memberRoleUpdating.set(member.userId);
    this.membersError.set(null);
    this.teamsApi.updateMemberRole(teamId, member.userId, next).subscribe({
      next: () => {
        this.members.update((rows) =>
          rows.map((r) => (r.userId === member.userId ? { ...r, role: next } : r)),
        );
        this.memberRoleUpdating.set(null);
      },
      error: (err) => {
        this.membersError.set(extractApiError(err) || 'Failed to update role.');
        this.memberRoleUpdating.set(null);
      },
    });
  }

  protected roleLabel(role: string): string {
    return role === 'TeamLeader' ? 'Team Leader' : 'Team Member';
  }

  private reloadPortfolio(teamId: string): void {
    this.teamsApi.getTeamPortfolio(teamId, { skipLoading: true }).subscribe({
      next: (items) => this.portfolio.set(items),
      error: () => this.portfolio.set([]),
    });
  }

  private loadJobs(teamId: string): void {
    this.jobsLoading.set(true);
    this.jobsError.set(null);
    this.jobsPage.set(1);
    this.teamsApi.getTeamJobs(teamId, { skipLoading: true }).subscribe({
      next: (items) => {
        this.jobs.set(items ?? []);
        this.jobsLoaded.set(true);
        this.jobsLoading.set(false);
        if (this.isLeader() && !this.joinRequestsLoaded()) {
          this.loadJoinRequests(teamId);
        }
      },
      error: () => {
        this.jobs.set([]);
        this.jobsLoaded.set(true);
        this.jobsLoading.set(false);
        this.jobsError.set('Could not load team jobs.');
      },
    });
  }

  private reloadJobs(teamId: string): void {
    this.teamsApi.getTeamJobs(teamId, { skipLoading: true }).subscribe({
      next: (items) => {
        this.jobs.set(items ?? []);
        this.jobsLoaded.set(true);
        const max = Math.max(1, Math.ceil((items?.length ?? 0) / this.jobsPageSize));
        if (this.jobsPage() > max) this.jobsPage.set(max);
      },
      error: () => {
        this.jobsError.set('Could not refresh team jobs.');
      },
    });
  }

  protected retryJoinRequests(teamId: string, event?: Event): void {
    event?.stopPropagation();
    this.joinRequestsLoaded.set(false);
    this.loadJoinRequests(teamId, true);
  }

  protected loadMoreJoinRequests(event?: Event): void {
    event?.stopPropagation();
    const teamId = this.team()?.id;
    if (!teamId || !this.joinRequestsHasMore() || this.joinRequestsLoading()) return;
    this.loadJoinRequests(teamId, false, this.joinRequestsPage() + 1);
  }

  protected loadJoinRequests(teamId: string, reset = true, page = 1): void {
    this.joinRequestsLoading.set(true);
    this.joinRequestsError.set(null);
    this.teamsApi
      .getTeamJoinRequests(teamId, { pageNumber: page, pageSize: 40, skipLoading: true })
      .subscribe({
        next: (paged) => {
          const items = paged.items ?? [];
          if (reset || page <= 1) {
            this.joinRequests.set(items);
          } else {
            const existing = new Set(this.joinRequests().map((r) => r.id));
            this.joinRequests.update((list) => [
              ...list,
              ...items.filter((r) => !existing.has(r.id)),
            ]);
          }
          this.joinRequestsPage.set(paged.pageNumber ?? page);
          this.joinRequestsTotal.set(paged.totalCount ?? items.length);
          const totalPages =
            paged.totalPages ??
            Math.max(1, Math.ceil((paged.totalCount ?? items.length) / (paged.pageSize || 40)));
          this.joinRequestsHasMore.set(
            paged.hasNextPage ?? (paged.pageNumber ?? page) < totalPages,
          );
          this.joinRequestsLoaded.set(true);
          this.joinRequestsLoading.set(false);
        },
        error: (err) => {
          if (reset || page <= 1) this.joinRequests.set([]);
          this.joinRequestsLoaded.set(true);
          this.joinRequestsLoading.set(false);
          this.joinRequestsError.set(
            extractApiError(err, 'Could not load join requests. Restart the API if this persists.'),
          );
        },
      });
  }

  private loadProjects(teamId: string): void {
    this.projectsLoading.set(true);
    this.projectsApi
      .getMyProjects({ pageNumber: 1, pageSize: 50, skipLoading: true })
      .subscribe({
        next: (page) => {
          const items = (page.items ?? []).map((p) => {
            const raw = p as Project & { AssignedTeamId?: string | null };
            return {
              ...p,
              assignedTeamId: p.assignedTeamId ?? raw.AssignedTeamId ?? null,
            };
          });
          this.projects.set(items.filter((p) => p.assignedTeamId === teamId));
          this.projectsLoaded.set(true);
          this.projectsLoading.set(false);
          if (this.activeTab() === 'tasks' && !this.taskProjectId()) {
            const first = this.teamProjects()[0];
            if (first) this.selectTaskProject(first.id);
          }
        },
        error: () => {
          this.projects.set([]);
          this.projectsLoaded.set(true);
          this.projectsLoading.set(false);
        },
      });
  }

  protected selectTaskProject(projectId: string): void {
    this.taskProjectId.set(projectId);
    this.taskMilestoneId.set(null);
    this.taskMilestones.set([]);
    this.taskMilestonesLoaded.set(false);
    this.taskMilestonesError.set(null);
    this.loadTaskMilestones(projectId);
  }

  private loadTaskMilestones(projectId: string): void {
    this.taskMilestonesLoading.set(true);
    this.taskMilestonesError.set(null);
    this.milestonesApi.getMilestones(projectId).subscribe({
      next: (milestones) => {
        this.taskMilestones.set(milestones);
        this.taskMilestonesLoaded.set(true);
        this.taskMilestonesLoading.set(false);
        if (!this.taskMilestoneId() && milestones.length) {
          this.taskMilestoneId.set(milestones[0].id);
        }
      },
      error: (err) => {
        this.taskMilestones.set([]);
        this.taskMilestonesLoaded.set(true);
        this.taskMilestonesLoading.set(false);
        this.taskMilestonesError.set(extractApiError(err, 'Could not load milestones.'));
      },
    });
  }
}
