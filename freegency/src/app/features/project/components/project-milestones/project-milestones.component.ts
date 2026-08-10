import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { ProjectMilestonesApiService } from '../../data-access/project-milestones-api.service';
import { ProjectFilesApiService } from '../../data-access/project-files-api.service';
import { ProjectMilestone } from '../../models/project-milestone';
import { ProjectEscrow } from '../../models/project-escrow';
import { MilestonePlanVersion } from '../../models/milestone-plan';
import { ProjectFile } from '../../models/project-file';
import {
  SubmitWorkModalComponent,
  SubmitWorkMilestoneOption,
} from '../submit-work-modal/submit-work-modal.component';
import {
  buildMilestoneProgressSummary,
  getPrimaryMilestone,
} from '../../../client/pages/manage-work/milestones/milestone-progress.util';

@Component({
  selector: 'app-project-milestones',
  imports: [DecimalPipe, DatePipe, FormsModule, SubmitWorkModalComponent],
  templateUrl: './project-milestones.component.html',
  styleUrl: './project-milestones.component.css',
})
export class ProjectMilestonesComponent implements OnInit {
  readonly projectId = input.required<string>();
  readonly isOwner = input(false);
  /** Hide outer chrome when nested in Team Project Workspace. */
  readonly embedded = input(false);

  protected readonly milestones = signal<ProjectMilestone[]>([]);
  protected readonly escrow = signal<ProjectEscrow | null>(null);
  protected readonly latestPlan = signal<MilestonePlanVersion | null>(null);
  protected readonly planVersions = signal<MilestonePlanVersion[]>([]);
  protected readonly files = signal<ProjectFile[]>([]);
  protected readonly loading = signal(true);
  protected readonly actionBusy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly changeComment = signal('');
  protected readonly workChangeComment = signal('');
  protected readonly openWorkChangeForm = signal(false);
  protected readonly submitOpen = signal(false);

  private readonly milestonesApi = inject(ProjectMilestonesApiService);
  private readonly filesApi = inject(ProjectFilesApiService);
  private readonly router = inject(Router);

  protected readonly sortedMilestones = computed(() =>
    [...this.milestones()].sort((a, b) => a.sortOrder - b.sortOrder),
  );

  protected readonly summary = computed(() =>
    buildMilestoneProgressSummary(this.sortedMilestones(), this.escrow()),
  );

  protected readonly currentMilestone = computed(() =>
    getPrimaryMilestone(this.summary(), this.sortedMilestones()),
  );

  protected readonly currentFiles = computed(() => {
    const current = this.currentMilestone();
    if (!current) return [] as ProjectFile[];
    return this.files().filter((f) => f.milestoneId === current.id);
  });

  protected readonly nextUnfunded = computed(() => this.summary().nextUnfunded);

  protected readonly submitOptions = computed<SubmitWorkMilestoneOption[]>(() => {
    const current = this.currentMilestone();
    if (!current) return [];
    if (
      current.isFunded &&
      (current.workStatus === 'InProgress' || current.workStatus === 'ChangesRequested')
    ) {
      return [
        {
          id: current.id,
          projectId: this.projectId(),
          title: current.title,
          sortOrder: current.sortOrder,
          amount: current.amount,
        },
      ];
    }
    return [];
  });

  ngOnInit() {
    this.loadData();
  }

  protected loadData() {
    this.loading.set(true);
    this.actionError.set(null);

    forkJoin({
      milestones: this.milestonesApi.getMilestones(this.projectId()),
      escrow: this.milestonesApi.getEscrow(this.projectId()).pipe(catchError(() => of(null))),
      plans: this.milestonesApi.getPlanVersions(this.projectId()).pipe(catchError(() => of([]))),
      latest: this.milestonesApi.getLatestPlan(this.projectId()).pipe(catchError(() => of(null))),
      files: this.filesApi.getByProjectId(this.projectId()).pipe(catchError(() => of([]))),
    }).subscribe({
      next: (result) => {
        this.milestones.set(result.milestones);
        this.escrow.set(result.escrow);
        this.planVersions.set(result.plans);
        this.latestPlan.set(result.latest);
        this.files.set(result.files);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  protected get releasePercent(): number {
    const e = this.escrow();
    if (!e || e.totalAmount === 0) return 0;
    return Math.round((e.totalReleased / Math.max(e.totalAmount, e.totalReleased)) * 100);
  }

  protected get showSection(): boolean {
    return true;
  }

  protected canAcceptPlan(): boolean {
    const plan = this.latestPlan();
    return this.isOwner() && !!plan && plan.status === 'Proposed';
  }

  protected canFundNext(): boolean {
    return this.isOwner() && this.summary().canFundNext;
  }

  protected canApproveCurrent(): boolean {
    const m = this.currentMilestone();
    return (
      this.isOwner() &&
      !!m &&
      m.workStatus === 'Submitted' &&
      m.releaseStatus === 'Pending'
    );
  }

  protected canSubmitCurrent(): boolean {
    return !this.isOwner() && this.submitOptions().length > 0;
  }

  protected timelineStatus(m: ProjectMilestone): string {
    if (m.releaseStatus === 'Released') return 'COMPLETED';
    if (this.currentMilestone()?.id === m.id) return 'CURRENT';
    if (!m.isFunded) return 'NOT FUNDED';
    if (m.workStatus === 'Submitted') return 'AWAITING REVIEW';
    if (m.workStatus === 'ChangesRequested') return 'CHANGES REQUESTED';
    if (m.workStatus === 'InProgress') return 'IN PROGRESS';
    return m.workStatus.toUpperCase();
  }

  protected openChat() {
    const path = this.isOwner() ? '/client/messages' : '/developer/messages';
    void this.router.navigate([path], {
      queryParams: { project: this.projectId() },
    });
  }

  protected acceptPlan() {
    const plan = this.latestPlan();
    if (!plan) return;
    this.actionBusy.set(true);
    this.milestonesApi.acceptPlan(plan.id).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.loadData();
      },
      error: (err) => {
        this.actionBusy.set(false);
        this.actionError.set(err.message || 'Failed to accept plan.');
      },
    });
  }

  protected requestChanges() {
    const plan = this.latestPlan();
    const comment = this.changeComment().trim();
    if (!plan || !comment) {
      this.actionError.set('Add a general comment for the whole plan.');
      return;
    }
    this.actionBusy.set(true);
    this.milestonesApi.requestPlanChanges({ planVersionId: plan.id, comment }).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.changeComment.set('');
        this.loadData();
      },
      error: (err) => {
        this.actionBusy.set(false);
        this.actionError.set(err.message || 'Failed to request changes.');
      },
    });
  }

  protected fundNext() {
    this.actionBusy.set(true);
    this.milestonesApi.fundNext(this.projectId()).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.loadData();
      },
      error: (err) => {
        this.actionBusy.set(false);
        this.actionError.set(err.message || 'Failed to fund milestone.');
      },
    });
  }

  protected approveRelease(milestoneId: string) {
    this.actionBusy.set(true);
    this.milestonesApi.approveRelease(milestoneId).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.loadData();
      },
      error: (err) => {
        this.actionBusy.set(false);
        this.actionError.set(err.message || 'Failed to release funds.');
      },
    });
  }

  protected requestWorkChanges() {
    const m = this.currentMilestone();
    const comment = this.workChangeComment().trim();
    if (!m || !comment) {
      this.actionError.set('Add a short comment describing the changes.');
      return;
    }
    this.actionBusy.set(true);
    this.milestonesApi.requestWorkChanges(m.id, comment).subscribe({
      next: () => {
        this.actionBusy.set(false);
        this.openWorkChangeForm.set(false);
        this.workChangeComment.set('');
        this.loadData();
      },
      error: (err) => {
        this.actionBusy.set(false);
        this.actionError.set(err.message || 'Failed to request work changes.');
      },
    });
  }

  protected openSubmit() {
    this.submitOpen.set(true);
  }

  protected formatMoney(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }
}
