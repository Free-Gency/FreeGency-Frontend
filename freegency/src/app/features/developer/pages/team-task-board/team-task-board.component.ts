
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TaskApiService } from '../../data-access/task-api.service';
import {
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  TaskAssigneeOption,
  TaskDto,
  TaskStatus,
  allowedTransitions,
  isOverdue,
  priorityChipClass,
  taskProgress,
} from '../../models/task';
import { ToastService } from '../../../../shared/services/toast.service';
import { extractErrorMessage } from '../../utils/error.util';
import { TaskFormComponent } from '../../components/task-form/task-form.component';
import { TaskDetailPanelComponent } from '../task-detail-panel/task-detail-panel.component';
import { SignalrService } from '../../../../core/Signalr/signalr-service';


@Component({
  selector: 'app-team-task-board',
  imports: [CommonModule, FormsModule, TaskFormComponent, TaskDetailPanelComponent],
  templateUrl: './team-task-board.component.html',
  styleUrl: './team-task-board.component.css',
})
export class TeamTaskBoardComponent {
  private readonly api = inject(TaskApiService);
  private readonly toast = inject(ToastService);
  private readonly signalr = inject(SignalrService);

  readonly milestoneId = input.required<string>();
  readonly projectId = input.required<string>();
  readonly currentUserId = input.required<string>();
  /** True when the current user is the team leader / project manager for this milestone. */
  readonly isManager = input<boolean>(true);
  /** Team roster for the assignee picker (map from TeamMemberRow in team-detail). */
  readonly members = input<TaskAssigneeOption[]>([]);

  readonly tasks = rxResource<TaskDto[], string>({
    params: () => this.milestoneId(),
    stream: ({ params }) => this.api.getMilestoneTasks(params),
  });

  constructor() {
    // Live refresh when a task in this milestone changes elsewhere (SignalR).
    effect(() => {
      const notification = this.signalr.NotificationSignal();
      if (!notification) return;
      if (
        notification.type === 'TaskAssigned' ||
        notification.type === 'TaskStatusChanged' ||
        notification.type === 'TaskCommentAdded'
      ) {
        this.tasks.reload();
      }
    });
  }

  readonly search = signal('');

  readonly filteredTasks = computed(() => {
    const q = this.search().trim().toLowerCase();
    const all = this.tasks.value() ?? [];
    if (!q) return all;
    return all.filter(
      (t) =>
        t.title.toLowerCase().includes(q) || (t.assigneeName ?? '').toLowerCase().includes(q),
    );
  });

  readonly byStatus = computed(() => {
    const all = this.filteredTasks();
    return Object.fromEntries(
      TASK_STATUSES.map((s) => [s, all.filter((t) => t.status === s)]),
    ) as Record<TaskStatus, TaskDto[]>;
  });

  readonly doneCount = computed(() => (this.tasks.value() ?? []).filter((t) => t.status === 'Done').length);
  readonly totalCount = computed(() => (this.tasks.value() ?? []).length);
  readonly progress = computed(() =>
    this.totalCount() ? Math.round((this.doneCount() / this.totalCount()) * 100) : 0,
  );

  readonly showCreate = signal(false);
  readonly editing = signal<TaskDto | null>(null);
  readonly viewing = signal<TaskDto | null>(null);
  readonly busyId = signal<string | null>(null);

  protected readonly statuses = TASK_STATUSES;
  protected readonly labels = TASK_STATUS_LABELS;
  protected readonly progressOf = taskProgress;
  protected readonly transitionsOf = allowedTransitions;
  protected readonly priorityClassOf = priorityChipClass;
  protected readonly isAssignee = (t: TaskDto) => t.assigneeUserId === this.currentUserId();
  protected readonly overdue = (t: TaskDto) => isOverdue(t.dueDate, t.status);

  onCreated(): void {
    this.showCreate.set(false);
    this.tasks.reload();
  }

  onUpdated(): void {
    this.editing.set(null);
    this.tasks.reload();
  }

  onDetailChanged(): void {
    this.tasks.reload();
  }

  deleteTask(task: TaskDto, event?: Event): void {
    event?.stopPropagation();
    if (!confirm(`Delete "${task.title}"?`)) return;
    this.busyId.set(task.id);
    this.api.deleteTask(task.id).subscribe({
      next: () => {
        this.toast.success('Task deleted.');
        this.tasks.reload();
      },
      error: (err: unknown) => this.toast.error(extractErrorMessage(err, 'Delete failed.')),
      complete: () => this.busyId.set(null),
    });
  }

  changeStatus(task: TaskDto, to: TaskStatus, event?: Event): void {
    event?.stopPropagation();
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
}
