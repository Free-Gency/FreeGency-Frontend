import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectDetailsApiService } from '../../data-access/project-details-api.service';
import { ProjectDetail } from '../../models/project-detail';
import { UpdateProjectRequest } from '../../models/update-project-request';


@Component({
  selector: 'app-project-edit-modal',
  imports: [FormsModule],
  templateUrl: './project-edit-modal.component.html',
  styleUrl: './project-edit-modal.component.css',
})
export class ProjectEditModalComponent {
  readonly project = input.required<ProjectDetail>();
  readonly isOpen = input(false);

  readonly closed = output<void>();
  readonly saved = output<ProjectDetail>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected title = '';
  protected description = '';
  protected budgetMin: number | null = null;
  protected budgetMax: number | null = null;
  protected currency = '';
  protected deadline = '';
  protected estimatedDurationDays: number | null = null;
  protected visibility = 'Public';

  private readonly projectApi = inject(ProjectDetailsApiService);

  ngOnChanges() {
    if (this.isOpen()) {
      const p = this.project();
      this.title = p.title;
      this.description = p.description;
      this.budgetMin = p.budgetMin;
      this.budgetMax = p.budgetMax;
      this.currency = p.currency;
      this.deadline = p.deadline ? p.deadline.split('T')[0] : '';
      this.estimatedDurationDays = p.estimatedDurationDays;
      this.visibility = p.visibility;
      this.error.set(null);
    }
  }

  protected close() {
    this.closed.emit();
  }

  protected save() {
    this.saving.set(true);
    this.error.set(null);

    const request: UpdateProjectRequest = {
      title: this.title,
      description: this.description,
      budgetMin: this.budgetMin ?? undefined,
      budgetMax: this.budgetMax ?? undefined,
      currency: this.currency || undefined,
      deadline: this.deadline || null,
      estimatedDurationDays: this.estimatedDurationDays,
      visibility: this.visibility,
    };

    this.projectApi.update(this.project().id, request).subscribe({
      next: () => {
        this.saving.set(false);
        const p = this.project();
        const updated: ProjectDetail = {
          ...p,
          title: this.title,
          description: this.description,
          budgetMin: this.budgetMin ?? p.budgetMin,
          budgetMax: this.budgetMax ?? p.budgetMax,
          currency: this.currency || p.currency,
          deadline: this.deadline || null,
          estimatedDurationDays: this.estimatedDurationDays,
          visibility: this.visibility as ProjectDetail['visibility'],
        };
        this.saved.emit(updated);
        this.closed.emit();
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to update project.');
        this.saving.set(false);
      },
    });
  }
}