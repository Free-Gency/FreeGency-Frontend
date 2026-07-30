import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectDetailsApiService } from '../../data-access/project-details-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { ProjectOverviewComponent } from '../../components/project-overview/project-overview.component';
import { ProjectProposalsComponent } from '../../components/project-proposals/project-proposals.component';
import { ProjectMilestonesComponent } from '../../components/project-milestones/project-milestones.component';
import { ProjectFilesComponent } from '../../components/project-files/project-files.component';
import { ProjectActivityComponent } from '../../components/project-activity/project-activity.component';
import { ProjectEditModalComponent } from '../../components/project-edit-modal/project-edit-modal.component';
import { ProjectDeleteDialogComponent } from '../../components/project-delete-dialog/project-delete-dialog.component';
import { ProjectDetail } from '../../models/project-detail';

type ProjectTab = 'overview' | 'proposals' | 'milestones' | 'files' | 'activity';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [
    ClientViewNavbarComponent,
    ProjectOverviewComponent,
    ProjectProposalsComponent,
    ProjectMilestonesComponent,
    ProjectFilesComponent,
    ProjectActivityComponent,
    ProjectEditModalComponent,
    ProjectDeleteDialogComponent,
  ],
  templateUrl: './project-details.component.html',
  styleUrl: './project-details.component.css',
})
export class ProjectDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly projectApi = inject(ProjectDetailsApiService);
  private readonly auth = inject(AuthService);

  protected readonly project = signal<ProjectDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly showEdit = signal(false);
  protected readonly showDelete = signal(false);

  protected readonly proposalsCount = signal(0);
  protected readonly filesCount = signal(0);

  protected readonly activeTab = signal<ProjectTab>('overview');

  protected readonly tabs: { key: ProjectTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'proposals', label: 'Proposals' },
    { key: 'milestones', label: 'Milestones' },
    { key: 'files', label: 'Files' },
    { key: 'activity', label: 'Activity' },
  ];

  protected readonly isOwner = computed(() => {
    const p = this.project();
    const userId = this.auth.session()?.id;
    return !!p && !!userId && p.clientId === userId;
  });

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProject(id);
    }

    effect(() => {
      const open = this.showEdit() || this.showDelete();
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  protected loadProject(id?: string) {
    id = id ?? this.route.snapshot.paramMap.get('id') ?? '';

    this.loading.set(true);
    this.error.set(null);

    this.projectApi.getById(id).subscribe({
      next: (project) => {
        this.project.set(project);
        this.proposalsCount.set(project.proposalCount ?? this.proposalsCount());
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load project.');
        this.loading.set(false);
      },
    });
  }

  protected onProposalsChanged() {
    this.loadProject();
  }

  protected onEditSaved(updated: ProjectDetail) {
    this.project.set(updated);
    this.showEdit.set(false);
    // Refresh from server so category/budget stay in sync after save
    this.projectApi.getById(updated.id).subscribe({
      next: (project) => this.project.set(project),
      error: () => {},
    });
  }
}
