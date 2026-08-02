import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DeveloperManageWorkService, MyProjectsSummary } from '../../data-access/developer-manage-work.service';
import { Project } from '../../../../shared/models/Project';

type StatusFilter = 'All' | 'Draft' | 'Open' | 'InProgress' | 'Completed' | 'Cancelled';
type SortOption =
  | 'newest'
  | 'oldest'
  | 'deadline'
  | 'title-asc'
  | 'title-desc'
  | 'budget-high'
  | 'budget-low';

@Component({
  selector: 'app-assigned-projects',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './assigned-projects.component.html',
})
export class AssignedProjectsComponent implements OnInit {
  private readonly service = inject(DeveloperManageWorkService);
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly page = signal(1);
  readonly pageSize = 10;
  readonly totalPages = signal(1);
  readonly totalCount = signal(0);
  readonly summary = signal<MyProjectsSummary | null>(null);

  readonly search = signal('');
  readonly sortOption = signal<SortOption>('deadline');
  readonly sortBy = signal<'CreatedAt' | 'Title' | 'Budget' | 'Deadline'>('Deadline');
  readonly sortDirection = signal<'asc' | 'desc'>('asc');

  readonly statusFilter = signal<StatusFilter>('All');

  ngOnInit(): void {
    this.loadSummary();
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter = this.statusFilter();
    this.service
      .getMyProjects({
        pageNumber: this.page(),
        pageSize: this.pageSize,
        status: filter === 'All' ? null : this.toApiStatus(filter),
        search: this.search() || null,
        sortBy: this.sortBy(),
        sortDirection: this.sortDirection(),
      })
      .subscribe({
        next: (page) => {
          this.projects.set(page.items);
          this.totalPages.set(Math.max(1, page.totalPages));
          this.totalCount.set(page.totalCount);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(err.message || 'Failed to load projects');
          this.loading.set(false);
        },
      });
  }

  loadSummary(): void {
    this.service.getMyProjectsSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => undefined,
    });
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadProjects();
  }

  onSearchInput(value: string): void {
    if (this.searchDebounceHandle) clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = setTimeout(() => {
      this.search.set(value.trim());
      this.page.set(1);
      this.loadProjects();
    }, 300);
  }

  onSortChange(value: string): void {
    const option = value as SortOption;
    this.sortOption.set(option);

    switch (option) {
      case 'oldest':
        this.sortBy.set('CreatedAt');
        this.sortDirection.set('asc');
        break;
      case 'deadline':
        this.sortBy.set('Deadline');
        this.sortDirection.set('asc');
        break;
      case 'title-asc':
        this.sortBy.set('Title');
        this.sortDirection.set('asc');
        break;
      case 'title-desc':
        this.sortBy.set('Title');
        this.sortDirection.set('desc');
        break;
      case 'budget-high':
        this.sortBy.set('Budget');
        this.sortDirection.set('desc');
        break;
      case 'budget-low':
        this.sortBy.set('Budget');
        this.sortDirection.set('asc');
        break;
      case 'newest':
      default:
        this.sortBy.set('CreatedAt');
        this.sortDirection.set('desc');
        break;
    }

    this.page.set(1);
    this.loadProjects();
  }

  goToPage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
    this.loadProjects();
  }

  getBudgetDisplay(project: Project): string {
    if (project.budgetMin === project.budgetMax) {
      return `${project.budgetMin} ${project.currency}`;
    }
    return `${project.budgetMin}–${project.budgetMax} ${project.currency}`;
  }

  getCount(status: string): number {
    const s = this.summary();
    if (!s) return 0;
    switch (status) {
      case 'Draft':
        return s.draft;
      case 'Open':
        return s.open;
      case 'InProgress':
        return s.inProgress;
      case 'Completed':
        return s.completed;
      case 'Cancelled':
        return s.cancelled;
      default:
        return s.total;
    }
  }

  private toApiStatus(status: Exclude<StatusFilter, 'All'>): string {
    switch (status) {
      case 'Draft':
        return 'draft';
      case 'Open':
        return 'open';
      case 'InProgress':
        return 'in-progress';
      case 'Completed':
        return 'completed';
      case 'Cancelled':
        return 'cancelled';
    }
  }
}
