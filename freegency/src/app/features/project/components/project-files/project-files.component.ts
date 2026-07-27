import { Component, inject, input, OnInit, signal } from '@angular/core';
import { ProjectFilesApiService } from '../../data-access/project-files-api.service';
import { ProjectFile } from '../../models/project-file';
import { FileKind } from '../../models/project-milestone';


@Component({
  selector: 'app-project-files',
  imports: [],
  templateUrl: './project-files.component.html',
  styleUrl: './project-files.component.css',
})
export class ProjectFilesComponent implements OnInit {
  readonly projectId = input.required<string>();

  protected readonly files = signal<ProjectFile[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly deletingId = signal<string | null>(null);

  private readonly filesApi = inject(ProjectFilesApiService);

  protected readonly kindLabels: Record<FileKind, string> = {
    Brief: 'Brief',
    Deliverable: 'Deliverables',
    Shared: 'Shared',
    Other: 'Other',
  };

  protected readonly kindOrder: FileKind[] = ['Brief', 'Deliverable', 'Shared', 'Other'];

  ngOnInit() {
    this.loadFiles();
  }

  protected loadFiles() {
    this.loading.set(true);
    this.filesApi.getByProjectId(this.projectId()).subscribe({
      next: (files) => {
        this.files.set(files);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  protected filesByKind(kind: FileKind): ProjectFile[] {
    return this.files().filter((f) => f.fileKind === kind);
  }

  protected uploadFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const formData = new FormData();
    for (const file of Array.from(input.files)) {
      formData.append('files', file);
    }

    this.uploading.set(true);
    this.filesApi.upload(this.projectId(), formData).subscribe({
      next: () => {
        this.uploading.set(false);
        this.loadFiles();
        input.value = '';
      },
      error: () => {
        this.uploading.set(false);
      },
    });
  }

  protected deleteFile(id: string) {
    this.deletingId.set(id);
    this.filesApi.delete(id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.loadFiles();
      },
      error: () => {
        this.deletingId.set(null);
      },
    });
  }
}