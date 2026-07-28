import { Component, inject, input, OnInit, signal } from '@angular/core';
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

  protected readonly files = signal<ProjectFile[]>([]);
  protected readonly loading = signal(true);
  protected readonly uploading = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly kindFilter = signal<KindFilter>('All');

  private readonly filesApi = inject(ProjectFilesApiService);

  protected readonly kindLabels: Record<FileKind, string> = {
    Brief: 'Brief',
    Deliverable: 'Deliverables',
    Shared: 'Shared',
    Other: 'Other',
  };

  protected readonly kindOrder: FileKind[] = ['Brief', 'Deliverable', 'Shared', 'Other'];
  protected readonly filterOptions: KindFilter[] = ['All', 'Brief', 'Deliverable', 'Shared', 'Other'];

  // Matches the C# enum's declaration order, used only as a fallback if the
  // API serializes FileKind as a number instead of a string.
  private readonly kindByIndex: FileKind[] = ['Brief', 'Deliverable', 'Shared', 'Other'];

  // Which kind the next upload will be tagged as. Previously this wasn't
  // exposed at all, so every upload silently landed in "Brief".
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
        // Previously this assumed fileKind always arrives as one of the
        // known string labels. If the API ever sends it as a raw enum
        // number (or an unrecognized string), the files loaded fine but
        // silently matched no group below and never rendered. Normalizing
        // here means the count and the list can never drift apart again.
        this.files.set(files.map((f) => ({ ...f, fileKind: this.normalizeKind(f.fileKind) })));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
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

  // Which section headers to render: every kind that has files when "All"
  // is selected, or just the one kind the user picked.
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

  protected uploadFiles(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const formData = new FormData();
    for (const file of Array.from(input.files)) {
      formData.append('files', file);
    }
    formData.append('fileKind', this.uploadKind);

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