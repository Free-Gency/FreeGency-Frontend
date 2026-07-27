
import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ProjectProposalsApiService } from '../../data-access/project-proposals-api.service';
import { ProjectStatus } from '../../models/project-detail';
import { ProjectProposal } from '../../models/project-proposal';


@Component({
  selector: 'app-project-proposals',
  imports: [DecimalPipe],
  templateUrl: './project-proposals.component.html',
  styleUrl: './project-proposals.component.css',
})
export class ProjectProposalsComponent implements OnInit {
  readonly projectId = input.required<string>();
  readonly projectStatus = input.required<ProjectStatus>();
  readonly isOwner = input(false);

  readonly proposalsChanged = output<void>();
  readonly countChanged = output<number>();

  protected readonly proposals = signal<ProjectProposal[]>([]);
  protected readonly loading = signal(true);
  protected readonly actionId = signal<string | null>(null);

  private readonly proposalsApi = inject(ProjectProposalsApiService);

  ngOnInit() {
    this.loadProposals();
  }

  protected loadProposals() {
    this.loading.set(true);
    this.proposalsApi.getByProjectId(this.projectId()).subscribe({
      next: (proposals) => {
        this.proposals.set(proposals);
        this.loading.set(false);
        this.countChanged.emit(proposals.length);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  protected acceptProposal(id: string) {
    this.actionId.set(id);
    this.proposalsApi.accept(id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.proposalsChanged.emit();
        this.loadProposals();
      },
      error: () => {
        this.actionId.set(null);
      },
    });
  }

  protected rejectProposal(id: string) {
    this.actionId.set(id);
    this.proposalsApi.reject(id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.proposalsChanged.emit();
        this.loadProposals();
      },
      error: () => {
        this.actionId.set(null);
      },
    });
  }

  protected get showSection(): boolean {
    const status = this.projectStatus();
    return status === 'Open' || status === 'InProgress';
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected statusClass(status: string): string {
    const map: Record<string, string> = {
      Pending: 'status-pending',
      Accepted: 'status-accepted',
      Rejected: 'status-rejected',
      Withdrawn: 'status-withdrawn',
    };
    return map[status] ?? '';
  }
}