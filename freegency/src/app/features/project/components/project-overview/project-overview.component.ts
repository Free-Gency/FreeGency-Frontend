
import { DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectDetail, ProjectStatus } from '../../models/project-detail';

@Component({
  selector: 'app-project-overview',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './project-overview.component.html',
  styleUrl: './project-overview.component.css',
})
export class ProjectOverviewComponent {
  readonly project = input.required<ProjectDetail>();
  readonly isOwner = input(false);
  readonly proposalsCount = input(0);

  readonly edit = output<void>();
  readonly delete = output<void>();

  protected get statusClass(): string {
    const map: Record<ProjectStatus, string> = {
      Draft: 'status-draft',
      Open: 'status-open',
      InProgress: 'status-in-progress',
      Completed: 'status-completed',
      Cancelled: 'status-cancelled',
    };
    return map[this.project().status] ?? 'status-draft';
  }

  protected get canEdit(): boolean {
    return this.isOwner() && (this.project().status === 'Draft' || this.project().status === 'Open');
  }

  protected get canDelete(): boolean {
    return this.isOwner() && this.project().status === 'Draft';
  }

  protected formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}