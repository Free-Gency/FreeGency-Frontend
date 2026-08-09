
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../shared/models/ApiResponse';
import {
  AddChecklistItemPayload,
  AddSubtaskPayload,
  AddTaskCommentPayload,
  AddTimeLogPayload,
  AssignTaskPayload,
  ChangeSubtaskStatusPayload,
  ChangeTaskStatusPayload,
  CreateTaskPayload,
  TaskAssigneeOption,
  TaskAttachmentDto,
  TaskChecklistItemDto,
  TaskCommentDto,
  TaskDto,
  TaskStatus,
  TaskSubtaskDto,
  TaskTimeLogDto,
  ToggleChecklistItemPayload,
  UpdateTaskPayload,
} from '../models/task';

@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;
  private readonly tasksUrl = `${this.baseUrl}/tasks`;

  // ---- Task CRUD ----

  getMilestoneTasks(milestoneId: string): Observable<TaskDto[]> {
    return this.getTasks(`${this.baseUrl}/milestones/${milestoneId}/tasks`);
  }

  getProjectTasks(projectId: string): Observable<TaskDto[]> {
    return this.getTasks(`${this.baseUrl}/projects/${projectId}/tasks`);
  }

  getMyTasks(): Observable<TaskDto[]> {
    return this.getTasks(`${this.tasksUrl}/mine`);
  }

  getTask(taskId: string): Observable<TaskDto> {
    return this.http
      .get<ApiResponse<TaskDto>>(`${this.tasksUrl}/${taskId}`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load task.')));
  }

  createTask(milestoneId: string, payload: CreateTaskPayload): Observable<TaskDto> {
    return this.http
      .post<ApiResponse<TaskDto>>(`${this.baseUrl}/milestones/${milestoneId}/tasks`, payload)
      .pipe(map((res) => this.unwrap(res, 'Failed to create task.')));
  }

  updateTask(taskId: string, payload: UpdateTaskPayload): Observable<TaskDto> {
    return this.http
      .put<ApiResponse<TaskDto>>(`${this.tasksUrl}/${taskId}`, payload)
      .pipe(map((res) => this.unwrap(res, 'Failed to update task.')));
  }

  deleteTask(taskId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.tasksUrl}/${taskId}`).pipe(map(() => void 0));
  }

  changeStatus(taskId: string, status: TaskStatus): Observable<TaskDto> {
    return this.http
      .patch<ApiResponse<TaskDto>>(`${this.tasksUrl}/${taskId}/status`, {
        status,
      } satisfies ChangeTaskStatusPayload)
      .pipe(map((res) => this.unwrap(res, 'Failed to change status.')));
  }

  assign(taskId: string, assigneeUserId: string | null): Observable<TaskDto> {
    return this.http
      .patch<ApiResponse<TaskDto>>(`${this.tasksUrl}/${taskId}/assignee`, {
        assigneeUserId,
      } satisfies AssignTaskPayload)
      .pipe(map((res) => this.unwrap(res, 'Failed to assign task.')));
  }

  /** Per-task candidate list (team members eligible for this task's milestone/team). */
  getAssignees(taskId: string): Observable<TaskAssigneeOption[]> {
    return this.http
      .get<ApiResponse<TaskAssigneeOption[]>>(`${this.tasksUrl}/${taskId}/assignees`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load assignees.')));
  }

  // ---- Comments ----

  getComments(taskId: string): Observable<TaskCommentDto[]> {
    return this.http
      .get<ApiResponse<TaskCommentDto[]>>(`${this.tasksUrl}/${taskId}/comments`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load comments.')));
  }

  addComment(taskId: string, content: string): Observable<TaskCommentDto> {
    return this.http
      .post<ApiResponse<TaskCommentDto>>(`${this.tasksUrl}/${taskId}/comments`, {
        content,
      } satisfies AddTaskCommentPayload)
      .pipe(map((res) => this.unwrap(res, 'Failed to post comment.')));
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.tasksUrl}/comments/${commentId}`)
      .pipe(map(() => void 0));
  }

  // ---- Checklist ----

  getChecklist(taskId: string): Observable<TaskChecklistItemDto[]> {
    return this.http
      .get<ApiResponse<TaskChecklistItemDto[]>>(`${this.tasksUrl}/${taskId}/checklist`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load checklist.')));
  }

  addChecklistItem(taskId: string, title: string): Observable<TaskChecklistItemDto> {
    return this.http
      .post<ApiResponse<TaskChecklistItemDto>>(`${this.tasksUrl}/${taskId}/checklist`, {
        title,
      } satisfies AddChecklistItemPayload)
      .pipe(map((res) => this.unwrap(res, 'Failed to add checklist item.')));
  }

  toggleChecklistItem(itemId: string, isCompleted: boolean): Observable<TaskChecklistItemDto> {
    return this.http
      .patch<ApiResponse<TaskChecklistItemDto>>(`${this.tasksUrl}/checklist/${itemId}/toggle`, {
        isCompleted,
      } satisfies ToggleChecklistItemPayload)
      .pipe(map((res) => this.unwrap(res, 'Failed to update checklist item.')));
  }

  deleteChecklistItem(itemId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.tasksUrl}/checklist/${itemId}`)
      .pipe(map(() => void 0));
  }

  // ---- Subtasks ----

  getSubtasks(taskId: string): Observable<TaskSubtaskDto[]> {
    return this.http
      .get<ApiResponse<TaskSubtaskDto[]>>(`${this.tasksUrl}/${taskId}/subtasks`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load subtasks.')));
  }

  addSubtask(taskId: string, title: string): Observable<TaskSubtaskDto> {
    return this.http
      .post<ApiResponse<TaskSubtaskDto>>(`${this.tasksUrl}/${taskId}/subtasks`, {
        title,
      } satisfies AddSubtaskPayload)
      .pipe(map((res) => this.unwrap(res, 'Failed to add subtask.')));
  }

  changeSubtaskStatus(subtaskId: string, status: TaskStatus): Observable<TaskSubtaskDto> {
    return this.http
      .patch<ApiResponse<TaskSubtaskDto>>(`${this.tasksUrl}/subtasks/${subtaskId}/status`, {
        status,
      } satisfies ChangeSubtaskStatusPayload)
      .pipe(map((res) => this.unwrap(res, 'Failed to update subtask.')));
  }

  deleteSubtask(subtaskId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.tasksUrl}/subtasks/${subtaskId}`)
      .pipe(map(() => void 0));
  }

  // ---- Time logs ----

  getTimeLogs(taskId: string): Observable<TaskTimeLogDto[]> {
    return this.http
      .get<ApiResponse<TaskTimeLogDto[]>>(`${this.tasksUrl}/${taskId}/time-logs`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load time logs.')));
  }

  logTime(taskId: string, payload: AddTimeLogPayload): Observable<TaskTimeLogDto> {
    return this.http
      .post<ApiResponse<TaskTimeLogDto>>(`${this.tasksUrl}/${taskId}/time-log`, payload)
      .pipe(map((res) => this.unwrap(res, 'Failed to log time.')));
  }

  // ---- Attachments (multipart) ----

  getAttachments(taskId: string): Observable<TaskAttachmentDto[]> {
    return this.http
      .get<ApiResponse<TaskAttachmentDto[]>>(`${this.tasksUrl}/${taskId}/attachments`)
      .pipe(map((res) => this.unwrap(res, 'Failed to load attachments.')));
  }

  uploadAttachments(taskId: string, files: File[]): Observable<TaskAttachmentDto[]> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return this.http
      .post<ApiResponse<TaskAttachmentDto[]>>(`${this.tasksUrl}/${taskId}/attachments`, form)
      .pipe(map((res) => this.unwrap(res, 'Failed to upload attachments.')));
  }

  deleteAttachment(attachmentId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.tasksUrl}/attachments/${attachmentId}`)
      .pipe(map(() => void 0));
  }

  // ---- Helpers ----

  private getTasks(url: string): Observable<TaskDto[]> {
    return this.http.get<ApiResponse<TaskDto[]>>(url).pipe(map((res) => this.unwrap(res, 'Failed to load tasks.')));
  }

  private unwrap<T>(res: ApiResponse<T>, fallback: string): T {
    if (!res.isSuccess || res.data === undefined || res.data === null) {
      throw new Error(res.message || fallback);
    }
    return res.data as T;
  }
}