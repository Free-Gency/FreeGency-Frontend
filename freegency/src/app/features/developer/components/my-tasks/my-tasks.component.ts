import { CommonModule } from '@angular/common';
import { Component, Input, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TaskApiService } from '../../data-access/task-api.service';
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  TaskDto,
  TaskStatus,
  allowedTransitions,
  isOverdue,
  priorityChipClass,
  taskProgress,
} from '../../models/task';
import { ToastService } from '../../../../shared/services/toast.service';
import { extractErrorMessage } from '../../utils/error.util';
import { TaskDetailPanelComponent } from '../../pages/task-detail-panel/task-detail-panel.component';
import { SignalrService } from '../../../../core/Signalr/signalr-service';

type Filter = 'all' | TaskStatus;

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, TaskDetailPanelComponent],
  templateUrl: './my-tasks.component.html',
  styleUrl: './my-tasks.component.css',
})
export class MyTasksComponent {
  private readonly api = inject(TaskApiService);
  private readonly toast = inject(ToastService);
  private readonly signalr = inject(SignalrService);

  readonly currentUserId = input.required<string>();
  /** When set, only tasks on this team's hired projects (team workspace). */
  @Input() teamId: string | null = null;
  /** When set, further narrow to tasks on this project. */
  @Input() projectId: string | null = null;

  readonly tasks = rxResource({
    params: () => ({ teamId: this.teamId }),
    stream: ({ params }) => this.api.getMyTasks(params.teamId),
  });

  readonly filter = signal<Filter>('all');
  readonly query = signal('');
  readonly viewing = signal<TaskDto | null>(null);
  readonly busyId = signal<string | null>(null);

  constructor() {
    // Live refresh when a task is assigned to me or its status changes (SignalR).
    effect(() => {
      const notification = this.signalr.NotificationSignal();
      if (!notification) return;
      if (notification.type === 'TaskAssigned' || notification.type === 'TaskStatusChanged') {
        this.tasks.reload();
        this.toast.success(notification.title);
      }
    });
  }

  /** Live view of the open task that follows list reloads. */
  readonly viewingFresh = computed<TaskDto | null>(() => {
    const id = this.viewing()?.id;
    if (!id) return null;
    return this.scopedTasks().find((t) => t.id === id) ?? this.viewing();
  });

  private readonly scopedTasks = computed(() => {
    const all = this.tasks.value() ?? [];
    const pid = this.projectId;
    if (!pid) return all;
    return all.filter((t) => t.projectId === pid);
  });

  readonly filters = computed<{ id: Filter; label: string; count: number }[]>(() => {
    const all = this.scopedTasks();
    return [
      { id: 'all' as const, label: 'All', count: all.length },
      ...TASK_STATUSES.map((s) => ({
        id: s as Filter,
        label: TASK_STATUS_LABELS[s],
        count: all.filter((t) => t.status === s).length,
      })),
    ];
  });

  readonly filtered = computed(() => {
    const all = this.scopedTasks();
    const q = this.query().trim().toLowerCase();
    return all.filter((t) => {
      if (this.filter() !== 'all' && t.status !== this.filter()) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.milestoneTitle ?? '').toLowerCase().includes(q) ||
        (t.projectTitle ?? '').toLowerCase().includes(q)
      );
    });
  });

  readonly grouped = computed(() => {
    const list = this.filtered();
    if (this.filter() !== 'all') {
      return [{ status: this.filter() as TaskStatus, tasks: list }];
    }
    return TASK_STATUSES.map((status) => ({
      status,
      tasks: list.filter((t) => t.status === status),
    }));
  });

  readonly totalHours = computed(() =>
    (this.tasks.value() ?? []).reduce((sum, t) => sum + (t.spentHours || 0), 0),
  );

  protected readonly labels = TASK_STATUS_LABELS;
  protected readonly progressOf = taskProgress;
  protected readonly priorityChip = priorityChipClass;
  protected readonly overdueOf = (dueDate: string | null | undefined) => isOverdue(dueDate);
  protected readonly dotClassOf = (status: TaskStatus): string =>
    ({
      Todo: 'bg-outline',
      InProgress: 'bg-tertiary',
      InReview: 'bg-primary',
      Done: 'bg-secondary',
    })[status];
  // Only assignee-facing transitions here — "Approve"/"Reopen" are manager-only and never shown.
  protected readonly transitionsOf = (t: TaskDto) =>
    allowedTransitions(t, true).filter((tr) => tr.actor === 'assignee');

  readonly setFilter = (f: Filter): void => this.filter.set(f);
  readonly setQuery = (event: Event): void =>
    this.query.set((event.target as HTMLInputElement).value);

  changeStatus(task: TaskDto, to: TaskStatus, event: Event): void {
    event.stopPropagation();
    this.busyId.set(task.id);
    this.api.changeStatus(task.id, to).subscribe({
      next: () => {
        this.toast.success(`Moved to ${TASK_STATUS_LABELS[to]}.`);
        this.tasks.reload();
      },
      error: (err: unknown) => this.toast.error(extractErrorMessage(err, 'Status change failed.')),
      complete: () => this.busyId.set(null),
    });
  }

  onDetailChanged(): void {
    this.tasks.reload();
  }
}
