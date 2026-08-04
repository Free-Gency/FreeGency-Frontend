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
import { TeamsService } from '../../data-access/teams.service';
import {
  Team,
  TeamDetailTab,
  TeamJob,
  TeamJobDetails,
  TeamJoinRequest,
  TeamPortfolioProject,
  TeamRoleLabel,
} from '../../models/team';

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
  ],
  templateUrl: './team-detail.component.html',
  styleUrl: './team-detail.component.css',
})
export class TeamDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamsApi = inject(TeamsService);
  private readonly projectsApi = inject(DeveloperManageWorkService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly taxonomyApi = inject(TaxonomyApiService);
  private readonly auth = inject(AuthService);

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

  protected readonly profileModalOpen = signal(false);
  protected readonly profileSaving = signal(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly editName = signal('');
  protected readonly editAbout = signal('');

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

  protected readonly openJobs = computed(() =>
    this.jobs().filter((j) => this.isJobOpen(j.status)),
  );

  protected readonly tabs = computed(() => {
    const items: { id: TeamDetailTab; label: string }[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'projects', label: 'Projects' },
      { id: 'jobs', label: 'Team Jobs' },
      { id: 'tasks', label: 'Task Management' },
      { id: 'finance', label: 'Finance' },
      { id: 'messages', label: 'Messages' },
    ];
    return items;
  });

  protected readonly openJobsCount = computed(
    () => this.jobs().filter((j) => this.isJobOpen(j.status)).length,
  );

  protected readonly pendingRequestsCount = computed(
    () => this.joinRequests().filter((r) => this.isRequestPending(r.status)).length,
  );

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
    { key: 'jobs', label: 'Team Jobs', icon: this.briefcaseIcon },
    { key: 'tasks', label: 'Task Management', icon: this.chartIcon },
    { key: 'finance', label: 'Finance', icon: this.walletIcon },
    { key: 'messages', label: 'Messages', icon: this.messageIcon },
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
    if (tab === 'jobs' && !this.jobsLoaded()) {
      const id = this.team()?.id;
      if (id) this.loadJobs(id);
    }
    if (tab === 'jobs' && this.isLeader() && !this.joinRequestsLoaded()) {
      const id = this.team()?.id;
      if (id) this.loadJoinRequests(id);
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
    this.selectedJobId.set(this.selectedJobId() === job.id ? null : job.id);
  }

  protected clearSelectedJob(): void {
    this.selectedJobId.set(null);
  }

  protected requestCountForJob(jobId: string): number {
    return this.joinRequests().filter(
      (r) => r.teamJobId === jobId && this.isRequestPending(r.status),
    ).length;
  }

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
    this.openJobDetail(job.id);
  }

  protected openJobDetail(jobId: string): void {
    this.jobDetailOpen.set(true);
    this.jobDetailLoading.set(true);
    this.jobDetailError.set(null);
    this.jobDetail.set(null);
    this.teamsApi.getJobDetails(jobId, { skipLoading: true }).subscribe({
      next: (details) => {
        this.jobDetail.set(details);
        this.jobDetailLoading.set(false);
      },
      error: () => {
        this.jobDetailError.set('Could not load this job.');
        this.jobDetailLoading.set(false);
      },
    });
  }

  protected closeJobDetail(): void {
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

  protected isJobOpen(status: string | null | undefined): boolean {
    return (status || '').toLowerCase() === 'open';
  }

  protected openApplyJob(job: TeamJob): void {
    if (!this.isJobOpen(job.status) || this.appliedJobIds().includes(job.id)) return;
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
    if (raw === 'portfolio' || raw === 'management') return 'overview';
    if (
      raw === 'overview' ||
      raw === 'projects' ||
      raw === 'jobs' ||
      raw === 'tasks' ||
      raw === 'finance' ||
      raw === 'messages'
    ) {
      return raw;
    }
    return 'overview';
  }

  private loadTeam(id: string): void {
    this.loading.set(true);
    this.teamsApi.getById(id, { skipLoading: true }).subscribe({
      next: (team) => {
        this.team.set(team);
        this.loading.set(false);
        this.reloadPortfolio(id);
        if (!this.isTeamMember()) {
          this.activeTab.set('overview');
          this.loadJobs(id);
          return;
        }
        if (this.activeTab() === 'projects') {
          this.loadProjects(id);
        }
        if (this.activeTab() === 'jobs') {
          this.loadJobs(id);
          if (this.isLeader()) this.loadJoinRequests(id);
        }
      },
      error: () => {
        this.error.set('Could not load this team.');
        this.loading.set(false);
      },
    });
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
      },
      error: () => {
        this.jobsError.set('Could not refresh team jobs.');
      },
    });
  }

  private loadJoinRequests(teamId: string): void {
    this.joinRequestsLoading.set(true);
    this.joinRequestsError.set(null);
    this.teamsApi.getTeamJoinRequests(teamId, { pageSize: 20, skipLoading: true }).subscribe({
      next: (page) => {
        this.joinRequests.set(page.items ?? []);
        this.joinRequestsLoaded.set(true);
        this.joinRequestsLoading.set(false);
      },
      error: () => {
        this.joinRequests.set([]);
        this.joinRequestsLoaded.set(true);
        this.joinRequestsLoading.set(false);
        this.joinRequestsError.set('Could not load join requests.');
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
        },
        error: () => {
          this.projects.set([]);
          this.projectsLoaded.set(true);
          this.projectsLoading.set(false);
        },
      });
  }
}
