import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskApiService } from '../../data-access/task-api.service';
import { TaskAssigneeOption, TaskDto, TaskPriority } from '../../models/task';
import { ToastService } from '../../../../shared/services/toast.service';
import { extractErrorMessage } from '../../utils/error.util';


@Component({
  selector: 'app-task-form',
  imports: [CommonModule, FormsModule],
  templateUrl: './task-form.component.html',
  styleUrl: './task-form.component.css',
})
export class TaskFormComponent {
  private readonly api = inject(TaskApiService);
  private readonly toast = inject(ToastService);

  readonly projectId = input.required<string>();
  readonly milestoneId = input.required<string>();
  /** When set, the form edits this task instead of creating a new one. */
  readonly task = input<TaskDto | null>(null);
  readonly assigneeOptions = input<TaskAssigneeOption[]>([]);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly priorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly requirements = signal('');
  protected readonly priority = signal<TaskPriority>('Medium');
  protected readonly assigneeUserId = signal<string | null>(null);
  protected readonly dueDate = signal<string | null>(null);
  protected readonly estimatedHours = signal<number | null>(null);

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly isEdit = () => !!this.task();

  /** Earliest selectable due date: the backend rejects dates that are not in the future. */
  protected readonly minDueDate = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  constructor() {
    effect(() => {
      const t = this.task();
      this.title.set(t?.title ?? '');
      this.description.set(t?.description ?? '');
      this.requirements.set(t?.requirements ?? '');
      this.priority.set(t?.priority ?? 'Medium');
      this.assigneeUserId.set(t?.assigneeUserId ?? null);
      this.dueDate.set(t?.dueDate ? t.dueDate.slice(0, 10) : null);
      this.estimatedHours.set(t?.estimatedHours ?? null);
      this.error.set(null);
    });
  }

  protected submit(): void {
    const title = this.title().trim();
    if (!title) {
      this.error.set('Task title is required.');
      return;
    }

    const due = this.dueDate();
    if (due && due < this.minDueDate()) {
      this.error.set('Due date must be a future date (tomorrow or later).');
      return;
    }

    const hours = this.estimatedHours();
    if (hours !== null && hours <= 0) {
      this.error.set('Estimated hours must be greater than zero.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const existing = this.task();
    if (existing) {
      this.api
        .updateTask(existing.id, {
          title,
          description: this.description().trim() || null,
          requirements: this.requirements().trim() || null,
          priority: this.priority(),
          dueDate: this.dueDate(),
          estimatedHours: this.estimatedHours(),
        })
        .subscribe({
          next: () => this.afterSave(existing.id),
          error: (err: unknown) => this.onError(err, 'Could not update task.'),
        });

      // Assignee changes go through the dedicated endpoint.
      if (this.assigneeUserId() !== (existing.assigneeUserId ?? null)) {
        this.api.assign(existing.id, this.assigneeUserId()).subscribe({
          error: () => this.toast.error('Task saved, but reassigning failed.'),
        });
      }
      return;
    }

    this.api
      .createTask(this.milestoneId(), {
        title,
        description: this.description().trim() || null,
        requirements: this.requirements().trim() || null,
        priority: this.priority(),
        assigneeUserId: this.assigneeUserId(),
        dueDate: this.dueDate(),
        estimatedHours: this.estimatedHours(),
      })
      .subscribe({
        next: () => this.afterSave(),
        error: (err: unknown) => this.onError(err, 'Could not create task.'),
      });
  }

  private afterSave(taskId?: string): void {
    this.saving.set(false);
    this.toast.success('Task saved.');
    this.saved.emit();
  }

  private onError(err: unknown, fallback: string): void {
    this.saving.set(false);
    const message = extractErrorMessage(err, fallback);
    this.error.set(message);
    this.toast.error(message);
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}