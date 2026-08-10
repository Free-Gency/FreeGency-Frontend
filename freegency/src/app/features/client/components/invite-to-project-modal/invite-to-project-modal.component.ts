import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { extractApiError } from '../../../../core/http/api-error';
import {
  ProjectsApiService,
  type ProjectDto,
} from '../../../auth/data-access/projects-api.service';
import { ProjectInvitationsApiService } from '../../data-access/project-invitations-api.service';
import type { InviteTarget } from '../../models/project-invitation';

@Component({
  selector: 'app-invite-to-project-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './invite-to-project-modal.component.html',
  styleUrl: './invite-to-project-modal.component.css',
})
export class InviteToProjectModalComponent implements OnInit {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly invitationsApi = inject(ProjectInvitationsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly target = input.required<InviteTarget>();
  readonly preferredProjectId = input<string | null>(null);
  readonly closed = output<void>();
  readonly sent = output<void>();

  protected readonly projects = signal<ProjectDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly projectId = signal<string>('');
  protected readonly message = signal('');

  ngOnInit(): void {
    this.projectsApi
      .getMine({ pageNumber: 1, pageSize: 50, status: 'Open' })
      .pipe(
        catchError(() => of({ items: [] as ProjectDto[] })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        const open = (page.items ?? []).filter(
          (p) => (p.status || '').toLowerCase() === 'open',
        );
        this.projects.set(open.length ? open : (page.items ?? []));
        const preferred = this.preferredProjectId();
        const initial =
          (preferred && open.find((p) => p.id === preferred)?.id) ||
          open[0]?.id ||
          page.items?.[0]?.id ||
          '';
        this.projectId.set(initial);
        this.loading.set(false);
      });
  }

  protected close(): void {
    this.closed.emit();
  }

  protected submit(): void {
    const projectId = this.projectId();
    const message = this.message().trim();
    const target = this.target();
    if (!projectId) {
      this.error.set('Select a project first.');
      return;
    }
    if (!message) {
      this.error.set('Write a short message for the invitation.');
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.invitationsApi
      .create({
        projectId,
        inviteeType: target.inviteeType,
        inviteeUserId: target.inviteeType === 'User' ? target.inviteeUserId : null,
        inviteeTeamId: target.inviteeType === 'Team' ? target.inviteeTeamId : null,
        message,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.sent.emit();
          this.closed.emit();
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(extractApiError(err) || 'Could not send invitation.');
        },
      });
  }
}
