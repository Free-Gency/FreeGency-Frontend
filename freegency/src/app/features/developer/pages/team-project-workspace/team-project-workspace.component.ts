import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Message01Icon,
  StarIcon,
  Task01Icon,
  Tick02Icon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import {
  buildMilestoneProgressSummary,
  getPrimaryMilestone,
} from '../../../client/pages/manage-work/milestones/milestone-progress.util';
import { ProjectMilestonesApiService } from '../../../project/data-access/project-milestones-api.service';
import { ProjectDetailsApiService } from '../../../project/data-access/project-details-api.service';
import { ProjectDetail } from '../../../project/models/project-detail';
import { ProjectEscrow } from '../../../project/models/project-escrow';
import { ProjectMilestone } from '../../../project/models/project-milestone';
import { ProjectMilestonesComponent } from '../../../project/components/project-milestones/project-milestones.component';
import { TaskApiService } from '../../data-access/task-api.service';
import { TeamsService } from '../../data-access/teams.service';
import { Team, TeamMemberRow, TeamRoleLabel } from '../../models/team';
import {
  MilestonePayoutSplitItem,
  ProjectMemberDto,
} from '../../models/team-project';
import { TaskAssigneeOption, TaskDto } from '../../models/task';
import { MyTasksComponent } from '../../components/my-tasks/my-tasks.component';
import { TeamTaskBoardComponent } from '../team-task-board/team-task-board.component';

type WorkspaceTab = 'overview' | 'milestones' | 'tasks' | 'my-tasks' | 'my-work';

interface MemberTaskStat {
  member: TeamMemberRow;
  done: number;
  total: number;
  percent: number;
}

interface AssignmentDraftRow {
  userId: string;
  name: string;
  imageUrl: string | null;
  percentage: number;
}

@Component({
  selector: 'app-team-project-workspace',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    HugeiconsIconComponent,
    DeveloperViewNavbarComponent,
    ProjectMilestonesComponent,
    MyTasksComponent,
    TeamTaskBoardComponent,
  ],
  templateUrl: './team-project-workspace.component.html',
  styleUrl: './team-project-workspace.component.css',
})
export class TeamProjectWorkspaceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly teamsApi = inject(TeamsService);
  private readonly projectApi = inject(ProjectDetailsApiService);
  private readonly milestonesApi = inject(ProjectMilestonesApiService);
  private readonly taskApi = inject(TaskApiService);
  protected readonly auth = inject(AuthService);

  protected readonly backIcon = ArrowLeft01Icon as IconSvgObject;
  protected readonly starIcon = StarIcon as IconSvgObject;
  protected readonly chatIcon = Message01Icon as IconSvgObject;
  protected readonly tickIcon = Tick02Icon as IconSvgObject;
  protected readonly checkIcon = CheckmarkCircle02Icon as IconSvgObject;
  protected readonly addIcon = Add01Icon as IconSvgObject;
  protected readonly taskIcon = Task01Icon as IconSvgObject;
  protected readonly walletIcon = Wallet01Icon as IconSvgObject;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly team = signal<Team | null>(null);
  protected readonly project = signal<ProjectDetail | null>(null);
  /** Full team roster (for staffing picker). */
  protected readonly teamMembers = signal<TeamMemberRow[]>([]);
  /** Staffed on this project (Mohamed API). */
  protected readonly projectMembers = signal<ProjectMemberDto[]>([]);
  protected readonly clientAvatarBroken = signal(false);
  protected readonly activeTab = signal<WorkspaceTab>('overview');
  protected readonly showAddMember = signal(false);
  protected readonly memberActionBusy = signal(false);
  protected readonly memberActionError = signal<string | null>(null);

  protected readonly overviewMilestones = signal<ProjectMilestone[]>([]);
  protected readonly overviewEscrow = signal<ProjectEscrow | null>(null);
  protected readonly projectTasks = signal<TaskDto[]>([]);
  protected readonly overviewReady = signal(false);

  protected readonly taskMilestoneId = signal<string | null>(null);
  protected readonly taskMilestones = signal<ProjectMilestone[]>([]);
  protected readonly taskMilestonesLoading = signal(false);
  protected readonly taskMilestonesError = signal<string | null>(null);
  protected readonly milestoneAssignees = signal<TaskAssigneeOption[]>([]);
  protected readonly assignmentDraft = signal<AssignmentDraftRow[]>([]);
  protected readonly assignmentSaving = signal(false);
  protected readonly assignmentError = signal<string | null>(null);
  protected readonly assignmentSavedFlash = signal(false);

  protected readonly myWork = signal<ProjectMilestone[]>([]);
  protected readonly myWorkLoading = signal(false);
  protected readonly myWorkError = signal<string | null>(null);

  protected readonly teamId = computed(() => this.team()?.id ?? null);
  protected readonly projectId = computed(() => this.project()?.id ?? null);

  /** Prefer project staff; fall back to full team until anyone is staffed. */
  protected readonly members = computed<TeamMemberRow[]>(() => {
    const staffed = this.projectMembers();
    if (staffed.length) {
      return staffed.map((m) => ({
        userId: m.userId,
        name: m.name,
        imageUrl: m.imageUrl,
        role: 'TeamMember' as const,
        job: m.roleInProject || 'Contributor',
        isOwner: false,
        joinedAt: m.assignedAt,
      }));
    }
    return this.teamMembers();
  });

  protected readonly addableMembers = computed(() => {
    const onProject = new Set(this.projectMembers().map((m) => m.userId));
    return this.teamMembers().filter((m) => !onProject.has(m.userId));
  });

  protected readonly assignmentTotal = computed(() =>
    this.assignmentDraft().reduce((sum, row) => sum + (Number(row.percentage) || 0), 0),
  );

  protected readonly role = computed<TeamRoleLabel | null>(() => {
    const t = this.team();
    if (!t) return null;
    if (t.myRole === 'TeamLeader' || t.myRole === 'TeamMember') return t.myRole;
    const uid = this.auth.session()?.id;
    if (uid && t.ownerUserId === uid) return 'TeamLeader';
    return null;
  });

  protected readonly isLeader = computed(() => this.role() === 'TeamLeader');

  protected readonly firstName = computed(() => {
    const s = this.auth.session();
    return s?.firstName?.trim() || s?.email?.split('@')[0] || 'there';
  });

  protected readonly projectCode = computed(() => {
    const id = this.project()?.id ?? '';
    return id ? `#${id.slice(0, 8).toUpperCase()}` : '';
  });

  protected readonly tags = computed(() => {
    const p = this.project();
    if (!p) return [] as string[];
    const fromSkills = (p.skills ?? []).slice(0, 4);
    if (fromSkills.length) return fromSkills;
    return (p.specialties ?? []).slice(0, 4);
  });

  protected readonly scopeItems = computed(() => {
    const p = this.project();
    if (!p) return [] as string[];
    const items = [...(p.specialties ?? []), ...(p.skills ?? [])];
    return [...new Set(items)].slice(0, 5);
  });

  protected readonly tabs = computed(() => {
    if (this.isLeader()) {
      return [
        { id: 'overview' as const, label: 'Overview' },
        { id: 'milestones' as const, label: 'Milestones' },
        { id: 'tasks' as const, label: 'Tasks' },
      ];
    }
    return [
      { id: 'overview' as const, label: 'Overview' },
      { id: 'my-tasks' as const, label: 'My tasks' },
      { id: 'my-work' as const, label: 'Delivery' },
    ];
  });

  protected readonly assigneeOptions = computed<TaskAssigneeOption[]>(() => {
    const fromApi = this.milestoneAssignees();
    if (fromApi.length) return fromApi;
    return this.members().map((m) => ({
      userId: m.userId,
      name: m.name,
      imageUrl: m.imageUrl,
    }));
  });

  protected readonly progress = computed(() =>
    buildMilestoneProgressSummary(this.overviewMilestones(), this.overviewEscrow()),
  );

  protected readonly primaryMilestone = computed(() =>
    getPrimaryMilestone(this.progress(), this.overviewMilestones()),
  );

  protected readonly sortedMilestones = computed(() =>
    [...this.overviewMilestones()].sort((a, b) => a.sortOrder - b.sortOrder),
  );

  protected readonly teamLeader = computed(
    () =>
      this.teamMembers().find((m) => m.role === 'TeamLeader' || m.isOwner) ??
      this.teamMembers().find((m) => m.userId === this.team()?.ownerUserId) ??
      null,
  );

  protected readonly myMember = computed(() => {
    const uid = this.auth.session()?.id;
    if (!uid) return null;
    return this.members().find((m) => m.userId === uid) ?? null;
  });

  protected readonly myPendingTasks = computed(() => {
    const uid = this.auth.session()?.id;
    if (!uid) return [] as TaskDto[];
    return this.projectTasks().filter(
      (t) => t.assigneeUserId === uid && t.status !== 'Done',
    );
  });

  protected readonly myTaskStats = computed(() => {
    const uid = this.auth.session()?.id;
    if (!uid) return { done: 0, total: 0, pending: 0 };
    const mine = this.projectTasks().filter((t) => t.assigneeUserId === uid);
    const done = mine.filter((t) => t.status === 'Done').length;
    return { done, total: mine.length, pending: mine.length - done };
  });

  protected readonly memberStats = computed<MemberTaskStat[]>(() => {
    const tasks = this.projectTasks();
    return this.members().map((member) => {
      const mine = tasks.filter((t) => t.assigneeUserId === member.userId);
      const done = mine.filter((t) => t.status === 'Done').length;
      const total = mine.length;
      return {
        member,
        done,
        total,
        percent: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    });
  });

  protected readonly teamOverallPercent = computed(() => {
    const stats = this.memberStats();
    if (!stats.length) return 0;
    return Math.round(stats.reduce((sum, s) => sum + s.percent, 0) / stats.length);
  });

  protected readonly deliveryMilestones = computed(() =>
    this.myWork().filter(
      (m) =>
        m.isFunded &&
        m.releaseStatus !== 'Released' &&
        (m.workStatus === 'InProgress' ||
          m.workStatus === 'Submitted' ||
          m.workStatus === 'ChangesRequested'),
    ),
  );

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const teamId = params.get('teamId');
      const projectId = params.get('projectId');
      if (!teamId || !projectId) {
        this.error.set('Project not found.');
        this.loading.set(false);
        return;
      }
      this.load(teamId, projectId);
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((q) => {
      const tab = this.normalizeTab(q.get('tab'));
      if (tab) this.activeTab.set(tab);
    });
  }

  protected setTab(tab: WorkspaceTab): void {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (tab === 'tasks' && this.isLeader()) {
      const existing = this.overviewMilestones();
      if (existing.length && !this.taskMilestones().length) {
        this.taskMilestones.set(existing);
        if (!this.taskMilestoneId()) {
          this.selectTaskMilestone(existing[0].id);
        } else {
          this.refreshMilestoneStaffing(this.taskMilestoneId()!);
        }
      } else {
        this.ensureTaskMilestones();
      }
    }
    if (tab === 'my-work' && !this.isLeader()) this.loadMyWork();
  }

  protected selectTaskMilestone(milestoneId: string): void {
    this.taskMilestoneId.set(milestoneId);
    this.refreshMilestoneStaffing(milestoneId);
  }

  protected openAddMemberPanel(): void {
    this.memberActionError.set(null);
    this.showAddMember.set(true);
  }

  protected closeAddMemberPanel(): void {
    this.showAddMember.set(false);
    this.memberActionError.set(null);
  }

  protected addProjectMember(userId: string): void {
    const projectId = this.projectId();
    if (!projectId || this.memberActionBusy()) return;
    this.memberActionBusy.set(true);
    this.memberActionError.set(null);
    this.teamsApi.addProjectMember(projectId, userId).subscribe({
      next: () => {
        this.memberActionBusy.set(false);
        this.reloadProjectMembers(projectId, () => {
          const mid = this.taskMilestoneId();
          if (mid) this.refreshMilestoneStaffing(mid);
        });
      },
      error: (err) => {
        this.memberActionBusy.set(false);
        this.memberActionError.set(extractApiError(err, 'Could not add member to project.'));
      },
    });
  }

  protected removeProjectMember(userId: string): void {
    const projectId = this.projectId();
    if (!projectId || this.memberActionBusy() || !this.isLeader()) return;
    if (!confirm('Remove this member from the project?')) return;
    this.memberActionBusy.set(true);
    this.memberActionError.set(null);
    this.teamsApi.removeProjectMember(projectId, userId).subscribe({
      next: () => {
        this.memberActionBusy.set(false);
        this.reloadProjectMembers(projectId);
        const mid = this.taskMilestoneId();
        if (mid) this.refreshMilestoneStaffing(mid);
      },
      error: (err) => {
        this.memberActionBusy.set(false);
        this.memberActionError.set(extractApiError(err, 'Could not remove member.'));
      },
    });
  }

  protected setAssignmentPercent(userId: string, raw: string | number): void {
    const percentage = Math.max(0, Math.min(100, Number(raw) || 0));
    this.assignmentDraft.update((rows) =>
      rows.map((r) => (r.userId === userId ? { ...r, percentage } : r)),
    );
    this.assignmentSavedFlash.set(false);
  }

  protected saveMilestoneAssignments(): void {
    const milestoneId = this.taskMilestoneId();
    if (!milestoneId || this.assignmentSaving()) return;
    const total = this.assignmentTotal();
    if (total !== 100) {
      this.assignmentError.set('Pay share must total exactly 100%.');
      return;
    }
    const payload = this.assignmentDraft()
      .filter((r) => r.percentage > 0)
      .map((r) => ({ userId: r.userId, value: r.percentage }));
    if (!payload.length) {
      this.assignmentError.set('Add at least one member with a share greater than 0.');
      return;
    }
    this.assignmentSaving.set(true);
    this.assignmentError.set(null);
    this.teamsApi.putMilestonePayoutSplits(milestoneId, payload).subscribe({
      next: () => {
        this.assignmentSaving.set(false);
        this.assignmentSavedFlash.set(true);
        this.refreshMilestoneStaffing(milestoneId);
      },
      error: (err) => {
        this.assignmentSaving.set(false);
        this.assignmentError.set(extractApiError(err, 'Could not save payout split.'));
      },
    });
  }

  protected openTeamChat(): void {
    const projectId = this.projectId();
    void this.router.navigate(['/developer/messages'], {
      queryParams: projectId ? { project: projectId } : {},
    });
  }

  protected openTeamMembers(): void {
    this.openAddMemberPanel();
  }

  protected openTeamFinance(): void {
    const teamId = this.teamId();
    if (!teamId) return;
    void this.router.navigate(['/developer/teams', teamId], {
      queryParams: { tab: 'finance' },
    });
  }

  protected formatBudgetRange(p: ProjectDetail): string {
    const currency = p.currency || 'USD';
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        notation: n >= 1000 ? 'compact' : 'standard',
        maximumFractionDigits: 0,
      }).format(n);
    if (p.budgetMin && p.budgetMax && p.budgetMin !== p.budgetMax) {
      return `${fmt(p.budgetMin)} — ${fmt(p.budgetMax)}`;
    }
    return fmt(p.budgetMax || p.budgetMin || 0);
  }

  protected formatMoney(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  protected statusLabel(status: string): string {
    switch (status) {
      case 'InProgress':
        return 'In progress';
      case 'Open':
        return 'Open';
      case 'Completed':
        return 'Completed';
      case 'Cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  protected workStatusLabel(status: string): string {
    switch (status) {
      case 'ChangesRequested':
        return 'Changes requested';
      case 'InProgress':
        return 'In progress';
      case 'Submitted':
        return 'Awaiting client review';
      case 'Approved':
        return 'Approved';
      default:
        return status;
    }
  }

  protected initials(name: string): string {
    return (
      name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('') || '?'
    );
  }

  /** API sometimes returns the literal "Default" instead of a real URL. */
  protected clientAvatarSrc(url: string | null | undefined): string | null {
    const v = (url ?? '').trim();
    if (!v || v.toLowerCase() === 'default' || v === 'null' || v === 'undefined') return null;
    if (!/^https?:\/\//i.test(v) && !v.startsWith('/') && !v.startsWith('data:')) return null;
    return v;
  }

  protected onClientAvatarError(): void {
    this.clientAvatarBroken.set(true);
  }

  protected milestoneStepState(
    m: ProjectMilestone,
  ): 'done' | 'current' | 'upcoming' {
    if (m.releaseStatus === 'Released') return 'done';
    const primary = this.primaryMilestone();
    if (primary?.id === m.id || m.isFunded) return 'current';
    return 'upcoming';
  }

  private load(teamId: string, projectId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.overviewReady.set(false);

    forkJoin({
      team: this.teamsApi.getById(teamId, { skipLoading: true }),
      project: this.projectApi.getById(projectId),
      members: this.teamsApi.getMembers(teamId).pipe(catchError(() => of([] as TeamMemberRow[]))),
      projectMembers: this.teamsApi
        .getProjectMembers(projectId)
        .pipe(catchError(() => of([] as ProjectMemberDto[]))),
    }).subscribe({
      next: ({ team, project, members, projectMembers }) => {
        const role =
          team.myRole === 'TeamLeader' || team.myRole === 'TeamMember'
            ? team.myRole
            : this.auth.session()?.id && team.ownerUserId === this.auth.session()!.id
              ? 'TeamLeader'
              : null;

        if (!role) {
          this.error.set('You are not a member of this team.');
          this.loading.set(false);
          return;
        }

        if ((project.assignedTeamId ?? null) !== teamId) {
          this.error.set('This project is not assigned to this team.');
          this.loading.set(false);
          return;
        }

        this.team.set(team);
        this.project.set(project);
        this.clientAvatarBroken.set(false);
        this.teamMembers.set(members);
        this.projectMembers.set(projectMembers);
        this.loading.set(false);

        const requested = this.normalizeTab(this.route.snapshot.queryParamMap.get('tab'));
        const allowed = this.isLeader()
          ? (['overview', 'milestones', 'tasks'] as WorkspaceTab[])
          : (['overview', 'my-tasks', 'my-work'] as WorkspaceTab[]);
        const tab = requested && allowed.includes(requested) ? requested : 'overview';
        this.activeTab.set(tab);

        this.loadOverviewData(projectId);
        if (tab === 'tasks') this.ensureTaskMilestones();
        if (tab === 'my-work') this.loadMyWork();
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Could not load project workspace.'));
        this.loading.set(false);
      },
    });
  }

  private loadOverviewData(projectId: string): void {
    forkJoin({
      milestones: this.milestonesApi.getMilestones(projectId).pipe(catchError(() => of([]))),
      escrow: this.milestonesApi.getEscrow(projectId).pipe(catchError(() => of(null))),
      tasks: this.taskApi.getProjectTasks(projectId).pipe(catchError(() => of([] as TaskDto[]))),
    }).subscribe({
      next: ({ milestones, escrow, tasks }) => {
        this.overviewMilestones.set(milestones);
        this.overviewEscrow.set(escrow);
        this.projectTasks.set(tasks);
        this.myWork.set(milestones);
        this.overviewReady.set(true);
        if (!this.taskMilestones().length) {
          this.taskMilestones.set(milestones);
          if (!this.taskMilestoneId() && milestones.length) {
            this.selectTaskMilestone(milestones[0].id);
          }
        }
      },
    });
  }

  private ensureTaskMilestones(): void {
    const projectId = this.projectId();
    if (!projectId || this.taskMilestones().length || this.taskMilestonesLoading()) return;

    this.taskMilestonesLoading.set(true);
    this.taskMilestonesError.set(null);
    this.milestonesApi.getMilestones(projectId).subscribe({
      next: (milestones) => {
        this.taskMilestones.set(milestones);
        this.taskMilestonesLoading.set(false);
        if (!this.taskMilestoneId() && milestones.length) {
          this.selectTaskMilestone(milestones[0].id);
        } else if (this.taskMilestoneId()) {
          this.refreshMilestoneStaffing(this.taskMilestoneId()!);
        }
      },
      error: (err) => {
        this.taskMilestones.set([]);
        this.taskMilestonesLoading.set(false);
        this.taskMilestonesError.set(extractApiError(err, 'Could not load milestones.'));
      },
    });
  }

  private reloadProjectMembers(projectId: string, after?: () => void): void {
    this.teamsApi.getProjectMembers(projectId).subscribe({
      next: (members) => {
        this.projectMembers.set(members);
        after?.();
      },
      error: () => undefined,
    });
  }

  private refreshMilestoneStaffing(milestoneId: string): void {
    if (!this.isLeader()) return;

    forkJoin({
      assignees: this.teamsApi.getMilestoneAssignees(milestoneId).pipe(catchError(() => of([]))),
      splits: this.teamsApi.getMilestonePayoutSplits(milestoneId).pipe(
        catchError(() =>
          of({
            teamId: '',
            projectId: null,
            milestoneId,
            splitType: 'Percent',
            items: [] as MilestonePayoutSplitItem[],
          }),
        ),
      ),
    }).subscribe({
      next: ({ assignees, splits }) => {
        this.milestoneAssignees.set(
          assignees.map((a) => ({
            userId: a.userId,
            name: a.name,
            imageUrl: a.imageUrl,
          })),
        );

        const pctByUser = new Map(splits.items.map((a) => [a.userId, Number(a.value) || 0]));
        const basePeople = this.projectMembers().map((m) => ({
          userId: m.userId,
          name: m.name,
          imageUrl: m.imageUrl,
        }));

        for (const a of splits.items) {
          if (!basePeople.some((p) => p.userId === a.userId)) {
            const fromAssignee = assignees.find((x) => x.userId === a.userId);
            basePeople.push({
              userId: a.userId,
              name: fromAssignee?.name ?? 'Member',
              imageUrl: fromAssignee?.imageUrl ?? null,
            });
          }
        }

        this.assignmentDraft.set(
          basePeople.map((p) => ({
            ...p,
            percentage: pctByUser.get(p.userId) ?? 0,
          })),
        );
        this.assignmentError.set(null);
      },
    });
  }

  private loadMyWork(): void {
    const projectId = this.projectId();
    if (!projectId) return;
    if (this.overviewMilestones().length) {
      this.myWork.set(this.overviewMilestones());
      return;
    }
    this.myWorkLoading.set(true);
    this.myWorkError.set(null);
    this.milestonesApi.getMilestones(projectId).subscribe({
      next: (all) => {
        this.myWork.set(all);
        this.myWorkLoading.set(false);
      },
      error: (err) => {
        this.myWork.set([]);
        this.myWorkLoading.set(false);
        this.myWorkError.set(extractApiError(err, 'Could not load delivery status.'));
      },
    });
  }

  private normalizeTab(raw: string | null): WorkspaceTab | null {
    if (
      raw === 'overview' ||
      raw === 'milestones' ||
      raw === 'tasks' ||
      raw === 'my-tasks' ||
      raw === 'my-work'
    ) {
      return raw;
    }
    return null;
  }
}
