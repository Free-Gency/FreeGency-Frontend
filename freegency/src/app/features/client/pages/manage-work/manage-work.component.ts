import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { MyProjectsComponent } from './my-projects/my-projects.component';
import { Proposals } from './proposals/proposals';
import { ManageWorkMilestonesComponent } from './milestones/milestones.component';
import { ManageWorkService } from '../../data-access/manage-work.service';

export type ManageWorkTab = 'my-projects' | 'proposals' | 'milestones' | 'members';

@Component({
  selector: 'app-manage-work',
  standalone: true,
  imports: [
    CommonModule,
    ClientViewNavbarComponent,
    MyProjectsComponent,
    Proposals,
    ManageWorkMilestonesComponent,
  ],
  templateUrl: './manage-work.component.html',
})
export class ManageWorkComponent implements OnInit {
  private readonly manageWorkService = inject(ManageWorkService);

  readonly activeTab = signal<ManageWorkTab>('my-projects');
  /** Full totals — not tied to current page size */
  readonly projectsTotal = signal(0);
  readonly proposalsTotal = signal(0);
  readonly milestonesNeedsAction = signal(0);

  ngOnInit(): void {
    this.loadProjectsTotal();
    this.loadProposalsTotal();
    this.loadMilestonesBadge();
  }

  loadProjectsTotal(): void {
    this.manageWorkService.getMyProjectsSummary('as-client').subscribe({
      next: (summary) => this.projectsTotal.set(summary.total),
      error: () => undefined,
    });
  }

  loadProposalsTotal(): void {
    this.manageWorkService.getProposals({ pageNumber: 1, pageSize: 1 }).subscribe({
      next: (page) => this.proposalsTotal.set(page.totalCount),
      error: () => undefined,
    });
  }

  loadMilestonesBadge(): void {
    this.manageWorkService.getMilestonesNeedsActionCount().subscribe({
      next: (count) => this.milestonesNeedsAction.set(count),
      error: () => this.milestonesNeedsAction.set(0),
    });
  }

  setTab(tab: ManageWorkTab): void {
    this.activeTab.set(tab);
  }

  onMilestonesNeedsAction(count: number): void {
    this.milestonesNeedsAction.set(count);
  }
}
