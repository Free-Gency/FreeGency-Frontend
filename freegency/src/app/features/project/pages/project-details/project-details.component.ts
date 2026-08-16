import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectDetailsApiService } from '../../data-access/project-details-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { ProjectOverviewComponent } from '../../components/project-overview/project-overview.component';
import { ProjectProposalsComponent } from '../../components/project-proposals/project-proposals.component';
import { ProjectMilestonesComponent } from '../../components/project-milestones/project-milestones.component';
import { ProjectFilesComponent } from '../../components/project-files/project-files.component';
import { ProjectActivityComponent } from '../../components/project-activity/project-activity.component';
import { ProjectEditModalComponent } from '../../components/project-edit-modal/project-edit-modal.component';
import { ProjectDeleteDialogComponent } from '../../components/project-delete-dialog/project-delete-dialog.component';
import { ProjectDetail } from '../../models/project-detail';
import {
  HiringAgentApiService,
  HiringAgentRun,
} from '../../../client/data-access/hiring-agent-api.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { extractApiError } from '../../../../core/http/api-error';

type ProjectTab = 'overview' | 'proposals' | 'milestones' | 'files' | 'activity';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [
    RouterLink,
    ClientViewNavbarComponent,
    DeveloperViewNavbarComponent,
    ProjectOverviewComponent,
    ProjectProposalsComponent,
    ProjectMilestonesComponent,
    ProjectFilesComponent,
    ProjectActivityComponent,
    ProjectEditModalComponent,
    ProjectDeleteDialogComponent,
  ],
  templateUrl: './project-details.component.html',
  styleUrl: './project-details.component.css',
})
export class ProjectDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly projectApi = inject(ProjectDetailsApiService);
  private readonly auth = inject(AuthService);

  protected readonly isDeveloper = computed(
    () => this.auth.session()?.activeProfileMode === 'Developer',
  );

  protected readonly project = signal<ProjectDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showEdit = signal(false);
  protected readonly showDelete = signal(false);

  protected readonly proposalsCount = signal(0);
  protected readonly filesCount = signal(0);

  protected readonly activeTab = signal<ProjectTab>('overview');

  private readonly hiringAgentApi = inject(HiringAgentApiService);
  private readonly toast = inject(ToastService);

  protected readonly scoutRun = signal<HiringAgentRun | null>(null);
  protected readonly scoutStarting = signal(false);
  protected readonly scoutTimingOpen = signal(false);
  protected readonly inviteWindowHours = signal(24);
  protected readonly discussionWindowHours = signal(48);
  protected readonly invitePresets = [6, 12, 24, 48] as const;
  protected readonly discussionPresets = [24, 48, 72, 96] as const;

  protected readonly scoutActive = computed(() =>
    this.hiringAgentApi.isActive(this.scoutRun()?.status),
  );

  protected readonly canStartScout = computed(() => {
    const p = this.project();
    return this.isOwner() && !!p && p.status === 'Open';
  });

  protected readonly expectedInviteClose = computed(() => {
    const at = new Date(Date.now() + this.inviteWindowHours() * 3600_000);
    return at.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  });

  protected readonly expectedReportBy = computed(() => {
    const at = new Date(Date.now() + this.discussionWindowHours() * 3600_000);
    return at.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  });

  protected readonly tabs: { key: ProjectTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'proposals', label: 'Proposals' },
    { key: 'milestones', label: 'Milestones' },
    { key: 'files', label: 'Files' },
    { key: 'activity', label: 'Activity' },
  ];

  protected readonly isOwner = computed(() => {
    const p = this.project();
    const userId = this.auth.session()?.id;
    return !!p && !!userId && p.clientId === userId;
  });

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id');
        if (id) this.loadProject(id);
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.activeTab.set(this.normalizeTab(params.get('tab')));
      });

    effect(() => {
      const open = this.showEdit() || this.showDelete();
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  protected setTab(tab: ProjectTab): void {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private normalizeTab(raw: string | null): ProjectTab {
    const allowed: ProjectTab[] = [
      'overview',
      'proposals',
      'milestones',
      'files',
      'activity',
    ];
    return raw && (allowed as string[]).includes(raw)
      ? (raw as ProjectTab)
      : 'overview';
  }

  protected loadProject(id?: string) {
    id = id ?? this.route.snapshot.paramMap.get('id') ?? '';

    this.loading.set(true);
    this.error.set(null);

    this.projectApi.getById(id).subscribe({
      next: (project) => {
        this.project.set(project);
        this.proposalsCount.set(project.proposalCount ?? this.proposalsCount());
        this.loading.set(false);
        this.loadScoutRun(project.id);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load project.');
        this.loading.set(false);
      },
    });
  }

  protected onProposalsChanged() {
    this.loadProject();
  }

  protected onEditSaved(updated: ProjectDetail) {
    this.project.set(updated);
    this.showEdit.set(false);
    // Refresh from server so category/budget stay in sync after save
    this.projectApi.getById(updated.id).subscribe({
      next: (project) => this.project.set(project),
      error: () => {},
    });
  }

  protected onScoutBadgeClick(): void {
    if (!this.canStartScout()) return;
    if (this.scoutActive()) {
      const run = this.scoutRun();
      if (run) void this.router.navigate(['/client/reports/hiring-agent', run.id]);
      return;
    }
    this.scoutTimingOpen.set(true);
  }

  protected closeScoutTiming(): void {
    if (this.scoutStarting()) return;
    this.scoutTimingOpen.set(false);
  }

  protected confirmStartScout(): void {
    const p = this.project();
    if (!p || !this.canStartScout() || this.scoutActive() || this.scoutStarting()) return;
    if (this.discussionWindowHours() < this.inviteWindowHours()) {
      this.toast.error('Discussion time must be at least as long as the invite window.');
      return;
    }

    this.scoutStarting.set(true);
    this.hiringAgentApi
      .start({
        projectId: p.id,
        topK: 5,
        inviteWindowHours: this.inviteWindowHours(),
        discussionWindowHours: this.discussionWindowHours(),
      })
      .subscribe({
        next: (run) => {
          this.scoutStarting.set(false);
          this.scoutTimingOpen.set(false);
          this.scoutRun.set(run);
          this.toast.success(
            'Scout started. Track invites and discussions on the Reports page.',
          );
          void this.router.navigate(['/client/reports/hiring-agent', run.id]);
        },
        error: (err) => {
          this.scoutStarting.set(false);
          this.toast.error(extractApiError(err, 'Could not start Scout.'));
          this.loadScoutRun(p.id);
        },
      });
  }

  private loadScoutRun(projectId: string): void {
    if (!this.isOwner()) {
      this.scoutRun.set(null);
      return;
    }
    this.hiringAgentApi.getByProject(projectId).subscribe({
      next: (run) => this.scoutRun.set(run),
      error: () => this.scoutRun.set(null),
    });
  }
}
