import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { ProjectMilestonesApiService } from '../../data-access/project-milestones-api.service';
import { ProjectMilestone } from '../../models/project-milestone';
import { ProjectEscrow } from '../../models/project-escrow';


@Component({
  selector: 'app-project-milestones',
  imports: [DecimalPipe],
  templateUrl: './project-milestones.component.html',
  styleUrl: './project-milestones.component.css',
})
export class ProjectMilestonesComponent implements OnInit {
  readonly projectId = input.required<string>();

  protected readonly milestones = signal<ProjectMilestone[]>([]);
  protected readonly escrow = signal<ProjectEscrow | null>(null);
  protected readonly loading = signal(true);

  private readonly milestonesApi = inject(ProjectMilestonesApiService);

  ngOnInit() {
    this.loadData();
  }

  protected loadData() {
    this.loading.set(true);

    forkJoin({
      milestones: this.milestonesApi.getMilestones(this.projectId()),
      escrow: this.milestonesApi.getEscrow(this.projectId()),
    }).subscribe({
      next: (result) => {
        this.milestones.set(result.milestones);
        this.escrow.set(result.escrow);
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
    const e = this.escrow();
    return e !== null || this.milestones().length > 0;
  }
}