
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Todo' | 'InProgress' | 'InReview' | 'Done';

export interface TaskDto {
  id: string;
  milestoneId: string;
  projectId: string;
  milestoneTitle?: string;
  projectTitle?: string;
  title: string;
  description: string | null;
  requirements: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeUserId: string | null;
  assigneeName: string | null;
  assigneeImageUrl: string | null;
  dueDate: string | null; // ISO
  estimatedHours: number | null;
  spentHours: number;
  incompleteSubtasksCount: number;
  attachmentsCount: number;
  commentsCount: number;
  checklistItems: TaskChecklistItemDto[];
  subtasks: TaskSubtaskDto[];
  canManage: boolean; // leader || project manager
  createdAt: string;
  updatedAt: string | null;
}

export interface TaskCommentDto {
  id: string;
  taskId: string;
  content: string;
  userId: string;
  userName: string;
  userImageUrl: string | null;
  createdAt: string;
}

export interface TaskChecklistItemDto {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface TaskSubtaskDto {
  id: string;
  title: string;
  status: TaskStatus;
  assigneeUserId: string | null;
  dueDate: string | null;
  createdAt: string;
}

export interface TaskAttachmentDto {
  id: string;
  fileName: string;
  fileUrl: string;
  size: number;
  uploadedByName: string;
  createdAt: string;
}

export interface TaskTimeLogDto {
  id: string;
  taskId: string;
  hours: number;
  note: string | null;
  userId: string;
  userName: string;
  workDate: string;
}

export interface TaskAssigneeOption {
  userId: string;
  name: string;
  imageUrl: string | null;
}

// ---- Payloads (mirror the backend request DTOs) ----

export interface CreateTaskPayload {
  title: string;
  description?: string | null;
  requirements?: string | null;
  priority?: TaskPriority; // default 'Medium'
  status?: TaskStatus; // default 'Todo'
  assigneeUserId?: string | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  requirements?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
  estimatedHours?: number | null;
}

export interface ChangeTaskStatusPayload {
  status: TaskStatus;
}
export interface AssignTaskPayload {
  assigneeUserId: string | null;
}

export interface AddTaskCommentPayload {
  content: string;
}
export interface ToggleChecklistItemPayload {
  isCompleted: boolean;
}
export interface AddChecklistItemPayload {
  title: string;
}
export interface AddSubtaskPayload {
  title: string;
}
export interface ChangeSubtaskStatusPayload {
  status: TaskStatus;
}
export interface AddTimeLogPayload {
  hours: number;
  note?: string | null;
  workDate?: string | null;
}

// ---- Board / status helpers ----

export const TASK_STATUSES: TaskStatus[] = ['Todo', 'InProgress', 'InReview', 'Done'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  Todo: 'To Do',
  InProgress: 'In Progress',
  InReview: 'In Review',
  Done: 'Done',
};

export const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Critical: 3,
};

export function taskProgress(task: TaskDto): number {
  if (!task.subtasks?.length) return task.status === 'Done' ? 100 : 0;
  const done = task.subtasks.filter((s) => s.status === 'Done').length;
  return Math.round((done / task.subtasks.length) * 100);
}

export function isOverdue(dueDate: string | null | undefined, status?: TaskStatus): boolean {
  if (!dueDate) return false;
  if (status === 'Done') return false;
  return new Date(dueDate).getTime() < Date.now();
}

export function priorityChipClass(p: TaskPriority): string {
  switch (p) {
    case 'Critical':
      return 'bg-error-container text-on-error-container';
    case 'High':
      return 'bg-tertiary-container text-on-tertiary-container';
    case 'Medium':
      return 'bg-primary-fixed text-primary';
    case 'Low':
      return 'bg-surface-container-low text-on-surface-variant';
  }
}

// ---- Status-transition UX rules (client renders only allowed buttons, server re-validates) ----

export interface TaskTransition {
  from: TaskStatus;
  to: TaskStatus;
  label: string;
  actor: 'assignee' | 'manager';
}

export const TASK_TRANSITIONS: TaskTransition[] = [
  { from: 'Todo', to: 'InProgress', label: 'Start', actor: 'assignee' },
  { from: 'InProgress', to: 'InReview', label: 'Submit for review', actor: 'assignee' },
  { from: 'InReview', to: 'Done', label: 'Approve', actor: 'manager' },
  { from: 'InReview', to: 'InProgress', label: 'Return for fixes', actor: 'manager' },
  { from: 'Done', to: 'Todo', label: 'Reopen', actor: 'manager' },
];


/**
 * Returns the transitions the current user is allowed to trigger for this task.
 * `canManage` (leader / project manager) sees manager transitions; the assignee
 * sees assignee transitions. A leader who is also the assignee sees both.
 */
export function allowedTransitions(task: TaskDto, isAssignee: boolean): TaskTransition[] {
  return TASK_TRANSITIONS.filter((t) => {
    if (t.from !== task.status) return false;
    if (t.actor === 'manager') return task.canManage;
    return task.canManage || isAssignee;
  });
}