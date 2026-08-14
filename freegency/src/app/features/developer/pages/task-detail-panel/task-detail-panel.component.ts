import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TaskApiService } from '../../data-access/task-api.service';
import {
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  TaskDto,
  TaskStatus,
  allowedTransitions,
  priorityChipClass,
} from '../../models/task';
import { ToastService } from '../../../../shared/services/toast.service';
import { extractErrorMessage } from '../../utils/error.util';



@Component({
  selector: 'app-task-detail-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './task-detail-panel.component.html',
  styleUrl: './task-detail-panel.component.css',
})
export class TaskDetailPanelComponent {
  private readonly api = inject(TaskApiService);
  private readonly toast = inject(ToastService);

  readonly task = input.required<TaskDto>();
  readonly currentUserId = input.required<string>();
  /** Leader / project manager for this task's milestone. Assignee-only users get read/limited actions. */
  readonly canManage = input<boolean>(false);

  readonly changed = output<void>();
  readonly closed = output<void>();

  private readonly taskId = computed(() => this.task().id);

  protected readonly isAssignee = computed(() => this.task().assigneeUserId === this.currentUserId());
  /** Assignees may only edit the task while it is in progress; managers can always edit. */
  protected readonly canEdit = computed(
    () => this.canManage() || (this.isAssignee() && this.task().status === 'InProgress'),
  );
  protected readonly transitions = computed(() => allowedTransitions(this.task(), this.isAssignee()));
  protected readonly statuses = TASK_STATUSES;
  protected readonly labels = TASK_STATUS_LABELS;
  protected readonly priorityClassOf = priorityChipClass;

  readonly comments = rxResource({
    params: () => this.taskId(),
    stream: ({ params }) => this.api.getComments(params),
  });
  readonly checklist = rxResource({
    params: () => this.taskId(),
    stream: ({ params }) => this.api.getChecklist(params),
  });
  readonly subtasks = rxResource({
    params: () => this.taskId(),
    stream: ({ params }) => this.api.getSubtasks(params),
  });
  readonly timeLogs = rxResource({
    params: () => this.taskId(),
    stream: ({ params }) => this.api.getTimeLogs(params),
  });
  readonly attachments = rxResource({
    params: () => this.taskId(),
    stream: ({ params }) => this.api.getAttachments(params),
  });

  protected readonly loggedHours = computed(() =>
    (this.timeLogs.value() ?? []).reduce((sum, l) => sum + l.hours, 0),
  );

  // ---- Composer state ----
  protected readonly newComment = signal('');
  protected readonly newChecklistTitle = signal('');
  protected readonly newSubtaskTitle = signal('');
  protected readonly logHours = signal<number | null>(null);
  protected readonly logNote = signal('');
  protected readonly uploading = signal(false);

  close(): void {
    this.closed.emit();
  }

  changeStatus(to: TaskStatus): void {
    this.api.changeStatus(this.taskId(), to).subscribe({
      next: () => {
        this.toast.success(`Moved to ${TASK_STATUS_LABELS[to]}.`);
        this.changed.emit();
      },
      error: (err) => this.toast.error(extractErrorMessage(err, 'Status change failed.')),
    });
  }

  // ---- Comments ----
  addComment(): void {
    const content = this.newComment().trim();
    if (!content) return;
    this.api.addComment(this.taskId(), content).subscribe({
      next: () => {
        this.newComment.set('');
        this.comments.reload();
      },
      error: (err) => this.toast.error(extractErrorMessage(err, 'Could not post comment.')),
    });
  }

  deleteComment(commentId: string): void {
    this.api.deleteComment(commentId).subscribe({
      next: () => this.comments.reload(),
      error: (err) => this.toast.error(extractErrorMessage(err, 'Could not delete comment.')),
    });
  }

  // ---- Checklist ----
  addChecklistItem(): void {
    const title = this.newChecklistTitle().trim();
    if (!title) return;
    this.api.addChecklistItem(this.taskId(), title).subscribe({
      next: () => {
        this.newChecklistTitle.set('');
        this.checklist.reload();
      },
      error: (err) => this.toast.error(extractErrorMessage(err, 'Could not add checklist item.')),
    });
  }

  toggleChecklistItem(itemId: string, isCompleted: boolean): void {
    this.api.toggleChecklistItem(itemId, isCompleted).subscribe({
      next: () => this.checklist.reload(),
      error: (err) => this.toast.error(extractErrorMessage(err, 'Could not update checklist item.')),
    });
  }

  deleteChecklistItem(itemId: string): void {
    this.api.deleteChecklistItem(itemId).subscribe({
      next: () => this.checklist.reload(),
      error: (err) => this.toast.error(extractErrorMessage(err, 'Could not remove checklist item.')),
    });
  }

  // ---- Subtasks ----
  addSubtask(): void {
    const title = this.newSubtaskTitle().trim();
    if (!title) return;
    this.api.addSubtask(this.taskId(), title).subscribe({
      next: () => {
        this.newSubtaskTitle.set('');
        this.subtasks.reload();
        this.changed.emit(); // subtasks drive the parent progress bar
      },
      error: (err) => this.toast.error(extractErrorMessage(err, 'Could not add subtask.')),
    });
  }

  toggleSubtaskDone(subtaskId: string, currentlyDone: boolean): void {
    this.api.changeSubtaskStatus(subtaskId, currentlyDone ? 'Todo' : 'Done').subscribe({
      next: () => {
        this.subtasks.reload();
        this.changed.emit();
      },
      error: (err) => this.toast.error(extractErrorMessage(err, 'Could not update subtask.')),
    });
  }

  deleteSubtask(subtaskId: string): void {
    this.api.deleteSubtask(subtaskId).subscribe({
      next: () => {
        this.subtasks.reload();
        this.changed.emit();
      },
      error: (err) => this.toast.error(extractErrorMessage(err, 'Could not remove subtask.')),
    });
  }

  // ---- Time log ----
  submitTimeLog(): void {
    const loggedHours = this.logHours();
    if (!loggedHours || loggedHours <= 0) return;
    this.api
      .logTime(this.taskId(), {
        hours: loggedHours,
        note: this.logNote().trim() || null,
      })
      .subscribe({
        next: () => {
          this.logHours.set(null);
          this.logNote.set('');
          this.timeLogs.reload();
          this.changed.emit(); // spentHours is server-maintained on the task
        },
        error: (err) => this.toast.error(extractErrorMessage(err, 'Could not log time.')),
      });
  }

  // ---- Attachments ----
  onFilesSelected(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;
    this.uploading.set(true);
    this.api.uploadAttachments(this.taskId(), files).subscribe({
      next: () => {
        this.uploading.set(false);
        this.attachments.reload();
        this.changed.emit();
      },
      error: (err) => {
        this.uploading.set(false);
        this.toast.error(extractErrorMessage(err, 'Could not upload attachment(s).'));
      },
    });
    (event.target as HTMLInputElement).value = '';
  }

  deleteAttachment(attachmentId: string): void {
    this.api.deleteAttachment(attachmentId).subscribe({
      next: () => {
        this.attachments.reload();
        this.changed.emit();
      },
      error: (err) => this.toast.error(extractErrorMessage(err, 'Could not remove attachment.')),
    });
  }
}