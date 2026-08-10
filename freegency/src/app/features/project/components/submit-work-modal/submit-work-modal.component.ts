import {
  Component,
  ElementRef,
  OnDestroy,
  Renderer2,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { extractApiError } from '../../../../core/http/api-error';
import { ProjectFilesApiService } from '../../data-access/project-files-api.service';
import { ProjectMilestonesApiService } from '../../data-access/project-milestones-api.service';

export interface SubmitWorkMilestoneOption {
  id: string;
  projectId: string;
  title: string;
  sortOrder: number;
  amount: number;
  currency?: string;
}

@Component({
  selector: 'app-submit-work-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './submit-work-modal.component.html',
  styleUrl: './submit-work-modal.component.css',
})
export class SubmitWorkModalComponent implements OnDestroy {
  private readonly filesApi = inject(ProjectFilesApiService);
  private readonly milestonesApi = inject(ProjectMilestonesApiService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  readonly open = input(false);
  readonly milestones = input<SubmitWorkMilestoneOption[]>([]);
  readonly initialMilestoneId = input<string | null>(null);
  readonly isRevision = input(false);

  readonly closed = output<void>();
  readonly submitted = output<string>();

  readonly selectedMilestoneId = signal<string>('');
  readonly note = signal('');
  readonly files = signal<File[]>([]);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly dragOver = signal(false);

  constructor() {
    // Portal to <body> so `position: fixed` is never clipped by a transformed/grid ancestor.
    effect(() => {
      const el = this.host.nativeElement;
      if (this.open()) {
        this.renderer.appendChild(document.body, el);
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    });

    effect(() => {
      if (!this.open()) return;
      const initial = this.initialMilestoneId();
      const opts = this.milestones();
      this.error.set(null);
      this.note.set('');
      this.files.set([]);
      this.selectedMilestoneId.set(
        initial && opts.some((m) => m.id === initial)
          ? initial
          : (opts[0]?.id ?? ''),
      );
    });
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-open');
  }

  selectedOption(): SubmitWorkMilestoneOption | null {
    const id = this.selectedMilestoneId();
    return this.milestones().find((m) => m.id === id) ?? null;
  }

  onFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const list = inputEl.files ? Array.from(inputEl.files) : [];
    this.files.update((prev) => [...prev, ...list].slice(0, 10));
    inputEl.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const list = event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : [];
    if (list.length) {
      this.files.update((prev) => [...prev, ...list].slice(0, 10));
    }
  }

  removeFile(index: number): void {
    this.files.update((prev) => prev.filter((_, i) => i !== index));
  }

  close(): void {
    if (this.busy()) return;
    this.closed.emit();
  }

  submit(): void {
    const option = this.selectedOption();
    if (!option) {
      this.error.set('Select a milestone.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    const upload$ =
      this.files().length === 0
        ? of(void 0)
        : (() => {
            const fd = new FormData();
            for (const file of this.files()) {
              fd.append('files', file);
            }
            fd.append('fileKind', 'Deliverable');
            fd.append('milestoneId', option.id);
            return this.filesApi.upload(option.projectId, fd);
          })();

    upload$
      .pipe(
        switchMap(() =>
          this.milestonesApi.submitMilestone(option.id, this.note().trim() || null),
        ),
        catchError((err: unknown) => {
          this.busy.set(false);
          this.error.set(extractApiError(err, 'Submit failed.'));
          return of(null);
        }),
      )
      .subscribe((result) => {
        if (result === null) return;
        this.busy.set(false);
        this.submitted.emit(option.id);
        this.closed.emit();
      });
  }
}
