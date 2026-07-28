import { Component, inject, input, OnInit, signal } from '@angular/core';
import { ProjectEventsApiService } from '../../data-access/project-events-api.service';
import { ProjectEvent } from '../../models/project-event';

@Component({
  selector: 'app-project-activity',
  imports: [],
  templateUrl: './project-activity.component.html',
  styleUrl: './project-activity.component.css',
})
export class ProjectActivityComponent implements OnInit {
  readonly projectId = input.required<string>();

  protected readonly events = signal<ProjectEvent[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  protected readonly hasMore = signal(true);

  private readonly pageSize = 10;

  private readonly eventsApi = inject(ProjectEventsApiService);

  ngOnInit() {
    this.loadEvents();
  }

  protected loadEvents() {
    this.loading.set(true);
    this.eventsApi.getByProjectId(this.projectId(), 0, this.pageSize).subscribe({
      next: (events) => {
        this.events.set(events);
        this.hasMore.set(events.length === this.pageSize);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  protected loadMore() {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    this.eventsApi.getByProjectId(this.projectId(), this.events().length, this.pageSize).subscribe({
      next: (events) => {
        this.events.update((current) => [...current, ...events]);
        this.hasMore.set(events.length === this.pageSize);
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
      },
    });
  }

  protected eventLabel(type: string): string {
    const map: Record<string, string> = {
      ProposalAccepted: 'Proposal accepted',
      MilestonePlanProposed: 'Milestone plan proposed',
      MilestonePlanChangesRequested: 'Plan changes requested',
      MilestonePlanAgreed: 'Plan agreed',
      EscrowLocked: 'Escrow locked',
      MemberAdded: 'Member added',
      MemberRemoved: 'Member removed',
      FileUploaded: 'File uploaded',
      MilestoneSubmitted: 'Milestone submitted',
      MilestoneChangesRequested: 'Milestone changes requested',
      MilestoneApproved: 'Milestone approved',
      MilestoneReleased: 'Milestone released',
      ProjectCompleted: 'Project completed',
    };
    return map[type] ?? type;
  }

  /** Background + foreground pair for the icon badge, grouped by the kind of event. */
  protected eventColorClasses(type: string): string {
    const successEvents = ['MilestoneApproved', 'MilestoneReleased', 'ProjectCompleted', 'ProposalAccepted', 'MilestonePlanAgreed'];
    const warningEvents = ['MilestoneChangesRequested', 'MilestonePlanChangesRequested', 'MilestoneSubmitted'];
    const infoEvents = ['EscrowLocked', 'MemberAdded', 'MemberRemoved', 'FileUploaded', 'MilestonePlanProposed'];

    if (successEvents.includes(type)) return 'bg-secondary-container text-on-secondary-container';
    if (warningEvents.includes(type)) return 'bg-tertiary-container text-on-tertiary-container';
    if (infoEvents.includes(type)) return 'bg-primary-container text-on-primary-container';
    return 'bg-surface-container-high text-on-surface-variant';
  }

  protected eventIconPath(type: string): string {
    const paths: Record<string, string> = {
      ProposalAccepted: 'M4 8.5L6.5 11L12 5',
      MilestonePlanProposed: 'M3 8H13M3 4H13M3 12H9',
      MilestonePlanChangesRequested: 'M11 2L14 5L6 13H3V10L11 2Z',
      MilestonePlanAgreed: 'M4 8.5L6.5 11L12 5',
      EscrowLocked: 'M4 7V5A4 4 0 0 1 12 5V7M3 7H13V14H3V7Z',
      MemberAdded: 'M6.5 8A2.5 2.5 0 1 0 6.5 3A2.5 2.5 0 0 0 6.5 8ZM2 14C2 11 4 9.5 6.5 9.5C9 9.5 11 11 11 14M12 6H15M13.5 4.5V7.5',
      MemberRemoved: 'M6.5 8A2.5 2.5 0 1 0 6.5 3A2.5 2.5 0 0 0 6.5 8ZM2 14C2 11 4 9.5 6.5 9.5C9 9.5 11 11 11 14M12 5.5L15 8.5M15 5.5L12 8.5',
      FileUploaded: 'M9.75 1.5H4.5C3.67 1.5 3 2.17 3 3V15C3 15.83 3.67 16.5 4.5 16.5H13.5C14.33 16.5 15 15.83 15 15V6.75L9.75 1.5Z',
      MilestoneSubmitted: 'M8 3V11M8 3L4.5 6.5M8 3L11.5 6.5M3 13H13',
      MilestoneChangesRequested: 'M11 2L14 5L6 13H3V10L11 2Z',
      MilestoneApproved: 'M4 8.5L6.5 11L12 5',
      MilestoneReleased: 'M8 13V5M8 5L4.5 8.5M8 5L11.5 8.5M3 3H13',
      ProjectCompleted: 'M3 8.5L6.5 12L13 4',
    };
    return paths[type] ?? 'M8 4V8.5L11 10.5';
  }

  protected relativeTime(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
