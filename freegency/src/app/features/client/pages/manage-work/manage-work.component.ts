import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { MyProjectsComponent } from './my-projects/my-projects.component';
import { Proposals } from './proposals/proposals';
import { ManageWorkService } from '../../data-access/manage-work.service';
import { Project } from '../../../../shared/models/Project';

export type ManageWorkTab = 'my-projects' | 'proposals' | 'milestones' | 'members';

@Component({
  selector: 'app-manage-work',
  standalone: true,
  imports: [CommonModule, ClientViewNavbarComponent, MyProjectsComponent, Proposals],
  templateUrl: './manage-work.component.html',
})
export class ManageWorkComponent implements OnInit {
  private readonly manageWorkService = inject(ManageWorkService);

  readonly activeTab = signal<ManageWorkTab>('my-projects');
  readonly projects = signal<Project[]>([]);
  readonly selectedProjectId = signal<string | null>(null);
  readonly loadingProjects = signal(false);

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loadingProjects.set(true);
    this.manageWorkService.getMyProjects('as-client').subscribe({
      next: (projects) => {
        this.projects.set(projects);
        if (projects.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(projects[0].id);
        }
        this.loadingProjects.set(false);
      },
      error: () => this.loadingProjects.set(false),
    });
  }

  setTab(tab: ManageWorkTab): void {
    this.activeTab.set(tab);
  }

  selectProject(projectId: string): void {
    this.selectedProjectId.set(projectId);
  }

  get selectedProject(): Project | undefined {
    return this.projects().find((p) => p.id === this.selectedProjectId());
  }
}