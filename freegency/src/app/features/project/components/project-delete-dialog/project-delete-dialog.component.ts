import { Component, inject, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectDetailsApiService } from '../../data-access/project-details-api.service';


@Component({
  selector: 'app-project-delete-dialog',
  imports: [],
  templateUrl: './project-delete-dialog.component.html',
  styleUrl: './project-delete-dialog.component.css',
})
export class ProjectDeleteDialogComponent {
  readonly projectId = input.required<string>();
  readonly isOpen = input(false);

  readonly closed = output<void>();
  readonly deleted = output<void>();

  protected readonly deleting = signal(false);

  private readonly projectApi = inject(ProjectDetailsApiService);
  private readonly router = inject(Router);

  protected close() {
    this.closed.emit();
  }

  protected deleteProject() {
    this.deleting.set(true);
    this.projectApi.delete(this.projectId()).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleted.emit();
        this.router.navigate(['/client/home']);
      },
      error: () => {
        this.deleting.set(false);
      },
    });
  }
}