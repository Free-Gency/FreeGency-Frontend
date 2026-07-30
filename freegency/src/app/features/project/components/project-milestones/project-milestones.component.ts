import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, catchError } from 'rxjs';
import { ProjectMilestonesApiService } from '../../data-access/project-milestones-api.service';
import { ProjectMilestone } from '../../models/project-milestone';
import { ProjectEscrow } from '../../models/project-escrow';
import { MilestonePlanVersion } from '../../models/milestone-plan';

@Component({
  selector: 'app-project-milestones',
  imports: [DecimalPipe, DatePipe, FormsModule],
  templateUrl: './project-milestones.component.html',
  styleUrl: './project-milestones.component.css',
})
export class ProjectMilestonesComponent implements OnInit {
  readonly projectId = input.required<string>();
  /** When true, client can accept/request changes / fund / release */
  readonly isOwner = input(false);

  protected readonly milestones = signal<ProjectMilestone[]>([]);
  protected readonly escrow = signal<ProjectEscrow | null>(null);
  protected readonly latestPlan = signal<MilestonePlanVersion | null>(null);
  protected readonly planVersions = signal<MilestonePlanVersion[]>([]);
  protected readonly loading = signal(true);
  protected readonly actionBusy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly changeComment = signal('');

  private readonly milestonesApi = inject(ProjectMilestonesApiService);

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
    }).subscribe({
      next: (result) => {
        this.milestones.set(result.milestones);
        this.escrow.set(result.escrow);
        this.planVersions.set(result.plans);
        this.latestPlan.set(result.latest);
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
    return Math.round((e.totalReleased / e.totalAmount) * 100);
  }

  protected workStatusClass(status: string): string {
    const map: Record<string, string> = {
      NotStarted: 'ws-not-started',
      InProgress: 'ws-in-progress',
      Submitted: 'ws-submitted',
      ChangesRequested: 'ws-changes',
      Approved: 'ws-approved',
    };
    return map[status] ?? '';
  }

  protected releaseStatusClass(status: string): string {
    const map: Record<string, string> = {
      Locked: 'rs-locked',
      InReview: 'rs-review',
      Pending: 'rs-pending',
      Released: 'rs-released',
    };
    return map[status] ?? '';
  }

  protected get showSection(): boolean {
    return true;
  }

  protected canAcceptPlan(): boolean {
    const plan = this.latestPlan();
    return this.isOwner() && !!plan && plan.status === 'Proposed';
  }

  protected canFundNext(): boolean {
    return (
      this.isOwner() &&
      this.escrow()?.planStatus === 'PlanAgreed' &&
      this.milestones().some((m) => !m.isFunded)
    );
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
}
