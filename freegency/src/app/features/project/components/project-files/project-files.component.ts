import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectFilesApiService } from '../../data-access/project-files-api.service';
import { ProjectFile } from '../../models/project-file';
import { FileKind } from '../../models/project-milestone';

type KindFilter = 'All' | FileKind;
export type FileIconKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'archive' | 'code' | 'generic';

@Component({
  selector: 'app-project-files',
  imports: [FormsModule],
  templateUrl: './project-files.component.html',
  styleUrl: './project-files.component.css',
})
export class ProjectFilesComponent implements OnInit {
  readonly projectId = input.required<string>();
  readonly isOwner = input(false);
  readonly countChanged = output<number>();

  protected readonly files = signal<ProjectFile[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly kindFilter = signal<KindFilter>('All');
  protected readonly dragOver = signal(false);
  protected readonly uploadError = signal<string | null>(null);

  private readonly filesApi = inject(ProjectFilesApiService);

  protected readonly kindLabels: Record<FileKind, string> = {
    Brief: 'Brief',
    Deliverable: 'Deliverables',
    Shared: 'Shared',
    Other: 'Other',
  };

  protected readonly kindOrder: FileKind[] = ['Brief', 'Deliverable', 'Shared', 'Other'];
  protected readonly filterOptions: KindFilter[] = ['All', 'Brief', 'Deliverable', 'Shared', 'Other'];

  private readonly kindByIndex: FileKind[] = ['Brief', 'Deliverable', 'Shared', 'Other'];

  protected uploadKind: FileKind = 'Brief';

  private readonly extensionMap: Record<string, FileIconKind> = {
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', svg: 'image', bmp: 'image',
    pdf: 'pdf',
    doc: 'doc', docx: 'doc', rtf: 'doc', txt: 'doc',
    xls: 'sheet', xlsx: 'sheet', csv: 'sheet',
    zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
    js: 'code', ts: 'code', tsx: 'code', jsx: 'code', json: 'code', html: 'code', css: 'code', py: 'code', cs: 'code', java: 'code',
  };

  ngOnInit() {
    this.loadFiles();
  }

  protected loadFiles() {
    this.loading.set(true);
    this.filesApi.getByProjectId(this.projectId()).subscribe({
      next: (files) => {
        const normalized = files.map((f) => ({ ...f, fileKind: this.normalizeKind(f.fileKind) }));
        this.files.set(normalized);
        this.countChanged.emit(normalized.length);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.countChanged.emit(0);
      },
    });
  }

  private normalizeKind(raw: unknown): FileKind {
    if (typeof raw === 'number') {
      return this.kindByIndex[raw] ?? 'Other';
    }
    if (typeof raw === 'string' && (this.kindOrder as string[]).includes(raw)) {
      return raw as FileKind;
    }
    return 'Other';
  }

  protected setKindFilter(kind: KindFilter) {
    this.kindFilter.set(kind);
  }

  protected get visibleKinds(): FileKind[] {
    return this.kindFilter() === 'All' ? this.kindOrder : [this.kindFilter() as FileKind];
  }

  protected filesByKind(kind: FileKind): ProjectFile[] {
    return this.files().filter((f) => f.fileKind === kind);
  }

  protected get hasVisibleFiles(): boolean {
    return this.visibleKinds.some((k) => this.filesByKind(k).length > 0);
  }

  protected fileIconKind(fileName: string): FileIconKind {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    return this.extensionMap[ext] ?? 'generic';
  }

  protected fileIconBg(fileName: string): string {
    const kind = this.fileIconKind(fileName);
    switch (kind) {
      case 'image':
        return 'bg-[#E3DFFF] text-[#4130D7]';
      case 'pdf':
        return 'bg-error-container text-error';
      case 'sheet':
        return 'bg-[#EFF7DF] text-[#3D4C00]';
      default:
        return 'bg-[#F0EDEF] text-on-surface-variant';
    }
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  protected onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    const fileList = event.dataTransfer?.files;
    if (fileList?.length) {
      this.uploadFileList(fileList);
    }
  }

  protected uploadFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.uploadFileList(input.files, input);
  }

  private uploadFileList(fileList: FileList, input?: HTMLInputElement) {
    this.uploadError.set(null);
    const formData = new FormData();
    for (const file of Array.from(fileList)) {
      formData.append('files', file);
    }
    formData.append('fileKind', this.uploadKind);

    this.uploading.set(true);
    this.filesApi.upload(this.projectId(), formData).subscribe({
      next: () => {
        this.uploading.set(false);
        this.loadFiles();
        if (input) input.value = '';
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err.message || 'Failed to upload files.');
        if (input) input.value = '';
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
