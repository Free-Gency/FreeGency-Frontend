import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { extractApiError } from '../../../../../core/http/api-error';
import { ManageWorkService } from '../../../data-access/manage-work.service';
import { ProjectMilestonesApiService } from '../../../../project/data-access/project-milestones-api.service';
import { Project } from '../../../../../shared/models/Project';
import { ProjectMilestone } from '../../../../project/models/project-milestone';
import { ProjectEscrow } from '../../../../project/models/project-escrow';
import {
  MilestoneProgressSummary,
  buildMilestoneProgressSummary,
  getPrimaryMilestone,
} from './milestone-progress.util';

type ListFilter = 'needs-action' | 'in-progress' | 'all';

interface ProjectMilestoneCard {
  project: Project;
  milestones: ProjectMilestone[];
  escrow: ProjectEscrow | null;
  summary: MilestoneProgressSummary;
  primary: ProjectMilestone | null;
}

interface ProjectNavItem {
  projectId: string;
  title: string;
  count: number;
  needsAction: boolean;
}

@Component({
  selector: 'app-manage-work-milestones',
  standalone: true,
  imports: [CommonModule, FormsModule, NgTemplateOutlet],
  templateUrl: './milestones.component.html',
})
export class ManageWorkMilestonesComponent implements OnInit {
  private readonly manageWork = inject(ManageWorkService);
  private readonly milestonesApi = inject(ProjectMilestonesApiService);
  private readonly router = inject(Router);

  readonly needsActionCountChange = output<number>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly cards = signal<ProjectMilestoneCard[]>([]);
  readonly filter = signal<ListFilter>('needs-action');
  /** `null` = all projects */
  readonly selectedProjectId = signal<string | null>(null);
  readonly actionBusy = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly changeCommentByMilestone = signal<Record<string, string>>({});
  readonly openChangeFormId = signal<string | null>(null);

  readonly projects = computed<ProjectNavItem[]>(() =>
    this.cards()
      .map((c) => ({
        projectId: c.project.id,
        title: c.project.title,
        count: c.milestones.length || 1,
        needsAction: c.summary.needsAction,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)),
  );

  readonly selectedProjectTitle = computed(() => {
    const id = this.selectedProjectId();
    if (!id) return null;
    return this.projects().find((p) => p.projectId === id)?.title ?? null;
  });

  readonly projectScopedCards = computed(() => {
    const id = this.selectedProjectId();
    const all = this.cards();
    return id ? all.filter((c) => c.project.id === id) : all;
  });

  readonly filteredCards = computed(() => {
    const scoped = this.projectScopedCards();
    const f = this.filter();
    if (f === 'all') return scoped;
    if (f === 'needs-action') return scoped.filter((c) => c.summary.needsAction);
    return scoped.filter((c) => !c.summary.needsAction && c.summary.total > 0);
  });

  readonly needsActionCount = computed(
    () => this.projectScopedCards().filter((c) => c.summary.needsAction).length,
  );

  readonly inProgressCount = computed(
    () =>
      this.projectScopedCards().filter((c) => !c.summary.needsAction && c.summary.total > 0)
        .length,
  );

  readonly allCount = computed(() => this.projectScopedCards().length);

  /** Total across all projects — for Manage Work tab badge */
  readonly totalNeedsActionCount = computed(
    () => this.cards().filter((c) => c.summary.needsAction).length,
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.actionError.set(null);

    this.manageWork
      .getMyProjects({
        role: 'as-client',
        status: 'in-progress',
        pageNumber: 1,
        pageSize: 50,
        sortBy: 'CreatedAt',
        sortDirection: 'desc',
      })
      .pipe(
        switchMap((page) => {
          const projects = page.items ?? [];
          if (projects.length === 0) {
            return of([] as ProjectMilestoneCard[]);
          }

          return forkJoin(
            projects.map((project) =>
              forkJoin({
                milestones: this.milestonesApi.getMilestones(project.id).pipe(
                  catchError(() => of([] as ProjectMilestone[])),
                ),
                escrow: this.milestonesApi.getEscrow(project.id).pipe(
                  catchError(() => of(null as ProjectEscrow | null)),
                ),
              }).pipe(
                map(({ milestones, escrow }) => {
                  const sorted = [...milestones].sort(
                    (a, b) => a.sortOrder - b.sortOrder,
                  );
                  const summary = buildMilestoneProgressSummary(sorted, escrow);
                  return {
                    project,
                    milestones: sorted,
                    escrow,
                    summary,
                    primary: getPrimaryMilestone(summary, sorted),
                  } satisfies ProjectMilestoneCard;
                }),
              ),
            ),
          );
        }),
      )
      .subscribe({
        next: (cards) => {
          this.cards.set(cards);
          this.loading.set(false);
          this.needsActionCountChange.emit(this.totalNeedsActionCount());
        },
        error: (err: unknown) => {
          this.error.set(
            err instanceof Error ? err.message : 'Failed to load milestones.',
          );
          this.loading.set(false);
          this.needsActionCountChange.emit(0);
        },
      });
  }

  setFilter(filter: ListFilter): void {
    this.filter.set(filter);
  }

  selectProject(projectId: string | null): void {
    this.selectedProjectId.set(projectId);
  }

  openProject(projectId: string): void {
    void this.router.navigate(['/projects', projectId], {
      queryParams: { tab: 'milestones' },
    });
  }

  openChat(projectId: string): void {
    void this.router.navigate(['/client/messages'], {
      queryParams: { project: projectId },
    });
  }

  urgencyLabel(card: ProjectMilestoneCard): string {
    if (card.summary.awaitingApproval) return 'Awaiting Review';
    if (card.summary.canFundNext) return 'Ready to Fund';
    if (card.summary.activeFunded) return 'In Progress';
    return 'In Progress';
  }

  urgencyBadgeClass(card: ProjectMilestoneCard): string {
    if (card.summary.awaitingApproval) return 'bg-[#FFF3D6] text-[#8A5A00]';
    if (card.summary.canFundNext) return 'bg-[#E3F2FD] text-[#1565C0]';
    return 'bg-[#E8F5E9] text-[#2E7D32]';
  }

  cardIconBg(card: ProjectMilestoneCard): string {
    if (card.summary.awaitingApproval) return 'bg-[#EDE7F6]';
    if (card.summary.canFundNext) return 'bg-[#E3F2FD]';
    return 'bg-[#E8F5E9]';
  }

  cardIconColor(card: ProjectMilestoneCard): string {
    if (card.summary.awaitingApproval) return 'text-[#5E35B1]';
    if (card.summary.canFundNext) return 'text-[#1565C0]';
    return 'text-[#2E7D32]';
  }

  /** Simple heroicons-style paths for card left icon */
  cardIconPath(card: ProjectMilestoneCard): string {
    if (card.summary.canFundNext) {
      // server
      return 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01';
    }
    if (card.summary.awaitingApproval) {
      // device phone
      return 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z';
    }
    // chart / progress
    return 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z';
  }

  readonly totalFundedInEscrow = computed(() =>
    this.cards().reduce((sum, c) => sum + (c.summary.escrowRemaining || 0), 0),
  );

  readonly totalPendingRelease = computed(() =>
    this.cards().reduce((sum, c) => {
      const awaiting = c.summary.awaitingApproval;
      return sum + (awaiting?.amount ?? 0);
    }, 0),
  );

  formatEscrow(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  fundNext(card: ProjectMilestoneCard): void {
    this.actionBusy.set(true);
    this.actionError.set(null);
    this.milestonesApi.fundNext(card.project.id).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.load();
      },
      error: (err: unknown) => {
        this.actionBusy.set(false);
        this.actionError.set(extractApiError(err, 'Failed to fund milestone.'));
      },
    });
  }

  approveRelease(milestoneId: string): void {
    this.actionBusy.set(true);
    this.actionError.set(null);
    this.milestonesApi.approveRelease(milestoneId).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.load();
      },
      error: (err: unknown) => {
        this.actionBusy.set(false);
        this.actionError.set(extractApiError(err, 'Failed to release funds.'));
      },
    });
  }

  toggleChangeForm(milestoneId: string): void {
    this.openChangeFormId.update((id) => (id === milestoneId ? null : milestoneId));
  }

  setChangeComment(milestoneId: string, value: string): void {
    this.changeCommentByMilestone.update((map) => ({ ...map, [milestoneId]: value }));
  }

  requestWorkChanges(milestoneId: string): void {
    const comment = (this.changeCommentByMilestone()[milestoneId] ?? '').trim();
    if (!comment) {
      this.actionError.set('Add a short comment describing the changes.');
      return;
    }
    this.actionBusy.set(true);
    this.actionError.set(null);
    this.milestonesApi.requestWorkChanges(milestoneId, comment).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.openChangeFormId.set(null);
        this.load();
      },
      error: (err: unknown) => {
        this.actionBusy.set(false);
        this.actionError.set(extractApiError(err, 'Failed to request work changes.'));
      },
    });
  }

  isStepDone(card: ProjectMilestoneCard, index: number): boolean {
    return card.milestones[index]?.releaseStatus === 'Released';
  }

  isStepCurrent(card: ProjectMilestoneCard, index: number): boolean {
    if (this.isStepDone(card, index)) return false;
    const primaryId = card.primary?.id;
    return !!primaryId && card.milestones[index]?.id === primaryId;
  }

  formatMoney(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  }

  formatDeadline(deadline: string | null | undefined): string {
    if (!deadline) return '—';
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /** Short due label like Bruno: "Oct 24" */
  formatDueShort(deadline: string | null | undefined): string {
    if (!deadline) return '—';
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  deliverables(m: ProjectMilestone) {
    return (m.files ?? []).filter(
      (f) => f.fileKind === 'Deliverable' || f.fileKind === 'Shared' || f.fileKind === 'Other',
    );
  }

  fileKindLabel(fileName: string, fileKind: string): string {
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
    if (ext === 'fig' || ext === 'figma') return 'Figma Prototype';
    if (ext === 'pdf') return 'PDF Document';
    if (ext === 'zip' || ext === 'rar') return 'Archive';
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'Image';
    if (fileKind === 'Deliverable') return 'Deliverable';
    return fileKind || 'File';
  }

  dueRelative(dueDate: string | null | undefined): string {
    if (!dueDate) return '—';
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return '—';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'In 1 day';
    if (days > 1) return `In ${days} days`;
    if (days === -1) return '1 day ago';
    return `${Math.abs(days)} days ago`;
  }

  primaryStatusLabel(
    m: ProjectMilestone,
    summary: MilestoneProgressSummary,
  ): string {
    if (summary.awaitingApproval?.id === m.id) return 'Awaiting review';
    if (summary.canFundNext && summary.nextUnfunded?.id === m.id) return 'Needs funding';
    if (m.workStatus === 'InProgress') return 'Active';
    if (m.workStatus === 'ChangesRequested') return 'Changes requested';
    if (m.workStatus === 'Approved' || m.releaseStatus === 'Released') return 'Done';
    if (m.workStatus === 'Submitted') return 'Submitted';
    return m.isFunded ? 'Funded' : 'Queued';
  }

  primaryStatusTone(m: ProjectMilestone): string {
    if (m.workStatus === 'InProgress') return 'text-emerald-600';
    if (m.workStatus === 'Submitted') return 'text-amber-600';
    if (m.workStatus === 'ChangesRequested') return 'text-error';
    if (m.releaseStatus === 'Released') return 'text-emerald-700';
    return 'text-[#4130D7]';
  }
}
