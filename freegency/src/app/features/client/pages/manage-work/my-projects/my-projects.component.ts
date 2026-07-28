import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ManageWorkService } from '../../../data-access/manage-work.service';
import { Project } from '../../../../../shared/models/Project';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { Calendar03Icon, Money01Icon, UserGroupIcon, Clock01Icon } from '@hugeicons/core-free-icons';

@Component({
  selector: 'app-my-projects',
  standalone: true,
  imports: [CommonModule, HugeiconsIconComponent],
  templateUrl: './my-projects.component.html',
})
export class MyProjectsComponent implements OnInit {
  private readonly manageWorkService = inject(ManageWorkService);

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  protected readonly calendarIcon = Calendar03Icon as IconSvgObject;
  protected readonly budgetIcon = Money01Icon as IconSvgObject;
  protected readonly proposalIcon = UserGroupIcon as IconSvgObject;
  protected readonly clockIcon = Clock01Icon as IconSvgObject;

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.manageWorkService.getMyProjects('as-client').subscribe({
      next: (projects: Project[]) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.message || 'Failed to load projects');
        this.loading.set(false);
      },
    });
  }

  getBudgetDisplay(project: Project): string {
    if (project.budgetMin === project.budgetMax) {
      return `${project.budgetMin} ${project.currency}`;
    }
    return `${project.budgetMin}–${project.budgetMax} ${project.currency}`;
  }

  getDaysLeft(deadline: string): number {
    const today = new Date();
    const target = new Date(deadline);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getTotalEscrow(): number { return 5100; }
  getActiveProjectCount(): number {
    return this.projects().filter((p) => p.status === 'InProgress').length;
  }
  getReleasedToDate(): number { return 2450; }
  getAvailableBalance(): number { return 850; }

  readonly statusFilter = signal<'All' | 'Draft' | 'Open' | 'InProgress' | 'Completed' | 'Cancelled'>('All');

  readonly filteredProjects = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'All') return this.projects();
    return this.projects().filter((p) => p.status === filter);
  });

  setStatusFilter(status: typeof this.statusFilter extends () => infer T ? T : never): void {
    this.statusFilter.set(status);
  }
  
  getProposalsAwaitingReview(): number { return 4; }
  getMilestonesAwaitingApproval(): number { return 2; }
  goToProposals(): void { /* wire to parent tab switch later */ }
  goToMilestones(): void { /* wire to parent tab switch later */ }
  getCount(status: string): number {
    return this.projects().filter((p) => p.status === status).length;
  }
}
