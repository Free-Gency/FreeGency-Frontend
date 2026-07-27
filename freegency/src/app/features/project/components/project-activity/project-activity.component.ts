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

  private readonly eventsApi = inject(ProjectEventsApiService);

  ngOnInit() {
    this.loadEvents();
  }

  protected loadEvents() {
    this.loading.set(true);
    this.eventsApi.getByProjectId(this.projectId()).subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
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

  protected eventIcon(type: string): string {
    const map: Record<string, string> = {
      ProposalAccepted: 'check',
      MilestonePlanProposed: 'plan',
      MilestonePlanChangesRequested: 'edit',
      MilestonePlanAgreed: 'agree',
      EscrowLocked: 'lock',
      MemberAdded: 'person',
      MemberRemoved: 'person-remove',
      FileUploaded: 'file',
      MilestoneSubmitted: 'submit',
      MilestoneChangesRequested: 'edit',
      MilestoneApproved: 'check',
      MilestoneReleased: 'release',
      ProjectCompleted: 'flag',
    };
    return map[type] ?? 'event';
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