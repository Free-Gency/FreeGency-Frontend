import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { DeveloperManageWorkService } from '../../data-access/developer-manage-work.service';
import { AssignedProjectsComponent } from '../../components/assigned-projects/assigned-projects.component';
import { MyProposalsComponent } from '../../components/my-proposals/my-proposals.component';
import { MyMilestonesComponent } from '../../components/my-milestones/my-milestones.component';

export type DeveloperManageWorkTab = 'assigned-projects' | 'proposals' | 'milestones';

@Component({
  selector: 'app-developer-manage-work',
  standalone: true,
  imports: [
    CommonModule,
    DeveloperViewNavbarComponent,
    AssignedProjectsComponent,
    MyProposalsComponent,
    MyMilestonesComponent,
  ],
  templateUrl: './developer-manage-work.component.html',
})
export class DeveloperManageWorkComponent implements OnInit {
  private readonly service = inject(DeveloperManageWorkService);

  readonly activeTab = signal<DeveloperManageWorkTab>('assigned-projects');
  readonly projectsTotal = signal(0);
  readonly proposalsTotal = signal(0);

  ngOnInit(): void {
    this.service.getMyProjectsSummary().subscribe({
      next: (summary) => this.projectsTotal.set(summary.total),
      error: () => undefined,
    });
    this.service.getMyProposals({ pageNumber: 1, pageSize: 1 }).subscribe({
      next: (page) => this.proposalsTotal.set(page.totalCount),
      error: () => undefined,
    });
  }

  setTab(tab: DeveloperManageWorkTab): void {
    this.activeTab.set(tab);
  }
}
