import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectFile } from '../models/project-file';


@Injectable({ providedIn: 'root' })
export class ProjectFilesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;

  getByProjectId(projectId: string): Observable<ProjectFile[]> {
    return this.http
      .get<{ isSuccess: boolean; data?: ProjectFile[]; message?: string | null }>(
        `${this.baseUrl}/${projectId}/files`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error(res.message || 'Failed to load files.');
          }
          return res.data;
        }),
      );
  }

  upload(projectId: string, formData: FormData): Observable<void> {
    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/${projectId}/files`,
        formData,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to upload file.');
          }
        }),
      );
  }

  delete(fileId: string): Observable<void> {
    return this.http
      .delete<{ isSuccess: boolean; message?: string | null }>(
        `${environment.apiBaseUrl}/api/v1/files/${fileId}`,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to delete file.');
          }
        }),
      );
  }
}