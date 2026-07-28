import { Component, inject, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProjectProposalsApiService } from '../../data-access/project-proposals-api.service';
import { ProjectStatus } from '../../models/project-detail';
import { ProjectProposal, ProposalStatus } from '../../models/project-proposal';

type SortOption = 'newest' | 'budget-high' | 'budget-low';
type StatusFilter = 'All' | ProposalStatus;

@Component({
  selector: 'app-project-proposals',
  imports: [DecimalPipe, FormsModule],
  templateUrl: './project-proposals.component.html',
  styleUrl: './project-proposals.component.css',
})
export class ProjectProposalsComponent implements OnInit, OnDestroy {
  readonly projectId = input.required<string>();
  readonly projectStatus = input.required<ProjectStatus>();
  readonly isOwner = input(false);

  readonly proposalsChanged = output<void>();
  readonly countChanged = output<number>();

  protected readonly proposals = signal<ProjectProposal[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly actionId = signal<string | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<StatusFilter>('All');
  protected readonly sort = signal<SortOption>('newest');

  protected readonly pageSize = 5;
  protected readonly page = signal(1);

  protected readonly statusOptions: StatusFilter[] = ['All', 'Pending', 'Accepted', 'Rejected', 'Withdrawn'];
  protected readonly sortOptions: { key: SortOption; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'budget-high', label: 'Highest Budget' },
    { key: 'budget-low', label: 'Lowest Budget' },
  ];

  private readonly proposalsApi = inject(ProjectProposalsApiService);
  private readonly search$ = new Subject<string>();

  ngOnInit() {
    this.loadProposals();
    this.search$.pipe(debounceTime(350), distinctUntilChanged()).subscribe((term) => {
      this.searchTerm.set(term);
      this.page.set(1);
      this.loadProposals();
    });
  }

  ngOnDestroy() {
    this.search$.complete();
  }

  protected onSearchInput(value: string) {
    this.search$.next(value);
  }

  protected setStatusFilter(status: StatusFilter) {
    if (this.statusFilter() === status) return;
    this.statusFilter.set(status);
    this.page.set(1);
    this.loadProposals();
  }

  protected setSort(sort: SortOption) {
    if (this.sort() === sort) return;
    this.sort.set(sort);
    this.page.set(1);
    this.loadProposals();
  }

  protected goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.page.set(page);
    this.loadProposals();
  }

  protected get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount() / this.pageSize));
  }

  protected get isDefaultFilter(): boolean {
    return this.searchTerm() === '' && this.statusFilter() === 'All';
  }

  protected loadProposals() {
    this.loading.set(true);

    const { sortBy, sortDirection } = this.sortToApi(this.sort());
    const status = this.statusFilter();

    this.proposalsApi
      .getByProjectId({
        projectId: this.projectId(),
        search: this.searchTerm() || undefined,
        status: status === 'All' ? undefined : status,
        sortBy,
        sortDirection,
        pageNumber: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (result) => {
          this.proposals.set(result.items);
          this.totalCount.set(result.totalCount);
          this.loading.set(false);
          // Only reflect into the parent's overall count/badge when no filter is active,
          // so the tab badge always shows the true total, not a filtered subset.
          if (this.isDefaultFilter) {
            this.countChanged.emit(result.totalCount);
          }
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  protected acceptProposal(id: string) {
    this.actionId.set(id);
    this.proposalsApi.accept(id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.proposalsChanged.emit();
        this.loadProposals();
      },
      error: () => {
        this.actionId.set(null);
      },
    });
  }

  protected rejectProposal(id: string) {
    this.actionId.set(id);
    this.proposalsApi.reject(id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.proposalsChanged.emit();
        this.loadProposals();
      },
      error: () => {
        this.actionId.set(null);
      },
    });
  }

  protected get showSection(): boolean {
    const status = this.projectStatus();
    return status === 'Open' || status === 'InProgress';
  }

  protected formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected statusClass(status: string): string {
    const map: Record<string, string> = {
      Pending: 'status-pending',
      Accepted: 'status-accepted',
      Rejected: 'status-rejected',
      Withdrawn: 'status-withdrawn',
    };
    return map[status] ?? '';
  }

  private sortToApi(sort: SortOption): { sortBy: 'AppliedAt' | 'ProposedBudget'; sortDirection: 'asc' | 'desc' } {
    switch (sort) {
      case 'budget-high':
        return { sortBy: 'ProposedBudget', sortDirection: 'desc' };
      case 'budget-low':
        return { sortBy: 'ProposedBudget', sortDirection: 'asc' };
      default:
        return { sortBy: 'AppliedAt', sortDirection: 'desc' };
    }
  }
}