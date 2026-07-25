import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectFilesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

  upload(projectId: string, files: File[]): Observable<void> {
    if (!files.length) return of(undefined);

    const form = new FormData();
    for (const file of files) {
      form.append('files', file);
    }
    form.append('fileKind', 'Brief');

    return this.http
      .post<{ isSuccess: boolean; message?: string | null }>(
        `${this.baseUrl}/projects/${projectId}/files`,
        form,
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess) {
            throw new Error(res.message || 'Failed to upload files.');
          }
        }),
      );
  }
}
