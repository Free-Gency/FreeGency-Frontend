import { Component, computed, inject, input, output, signal, OnInit, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ProjectProposalsApiService } from '../../data-access/project-proposals-api.service';
import { ProjectStatus } from '../../models/project-detail';
import { ProjectProposal, ProposalStatus } from '../../models/project-proposal';
import { ProposalDetailDrawerComponent } from '../proposal-detail-drawer/proposal-detail-drawer.component';
import { ToastService } from '../../../../shared/components/toast/toast.service';

type SortOption = 'newest' | 'budget-high' | 'budget-low';
type StatusFilter = 'All' | ProposalStatus;

@Component({
  selector: 'app-project-proposals',
  imports: [DecimalPipe, FormsModule, ProposalDetailDrawerComponent],
  templateUrl: './project-proposals.component.html',
  styleUrl: './project-proposals.component.css',
})
export class ProjectProposalsComponent implements OnInit, OnDestroy {
  private readonly proposalsApi = inject(ProjectProposalsApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly projectId = input.required<string>();
  readonly projectStatus = input.required<ProjectStatus>();
  readonly isOwner = input(false);

  readonly proposalsChanged = output<void>();
  readonly countChanged = output<number>();

  protected readonly proposals = signal<ProjectProposal[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly loading = signal(true);
  protected readonly actionId = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly selectedProposal = signal<ProjectProposal | null>(null);
  protected readonly detailOpen = signal(false);
  protected readonly hasActiveDiscussion = signal(false);
  protected readonly isHired = computed(() => this.projectStatus() === 'InProgress');

  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<StatusFilter>('All');
  protected readonly sort = signal<SortOption>('newest');

  protected readonly pageSize = 5;
  protected readonly page = signal(1);

  protected readonly statusOptions: StatusFilter[] = [
    'All',
    'Pending',
    'Viewed',
    'InDiscussion',
    'Rejected',
    'Withdrawn',
    'Expired',
  ];
  protected readonly sortOptions: { key: SortOption; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'budget-high', label: 'Highest Budget' },
    { key: 'budget-low', label: 'Lowest Budget' },
  ];

  private readonly search$ = new Subject<string>();

  protected readonly canManageDiscussion = computed(
    () => this.isOwner() && this.projectStatus() === 'Open' && !this.isHired(),
  );

  protected readonly selectedCanStart = computed(() => {
    const p = this.selectedProposal();
    return !!p && this.canShowStartDiscussion(p);
  });

  protected readonly selectedCanClose = computed(() => {
    const p = this.selectedProposal();
    return !!p && this.canShowCloseDiscussion(p);
  });

  protected readonly selectedCanReject = computed(() => {
    const p = this.selectedProposal();
    return !!p && this.canShowReject(p);
  });

  ngOnInit() {
    this.refreshDiscussionLock();
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
    this.actionError.set(null);

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

          if (result.items.some((p) => p.status === 'InDiscussion')) {
            this.hasActiveDiscussion.set(true);
          }

          const selectedId = this.selectedProposal()?.id;
          if (selectedId) {
            const refreshed = result.items.find((p) => p.id === selectedId) ?? null;
            this.selectedProposal.set(refreshed);
            if (!refreshed) this.detailOpen.set(false);
          }

          if (this.isDefaultFilter) {
            this.countChanged.emit(result.totalCount);
          }
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  private refreshDiscussionLock() {
    this.proposalsApi
      .getByProjectId({
        projectId: this.projectId(),
        status: 'InDiscussion',
        pageNumber: 1,
        pageSize: 1,
      })
      .subscribe({
        next: (result) => {
          this.hasActiveDiscussion.set(result.totalCount > 0 || result.items.length > 0);
        },
        error: () => {},
      });
  }

  protected canShowStartDiscussion(p: ProjectProposal): boolean {
    return (
      this.canManageDiscussion() &&
      (p.status === 'Pending' || p.status === 'Viewed') &&
      !this.hasActiveDiscussion()
    );
  }

  protected cleanDisplayText(value: string | null | undefined): string {
    if (!value?.trim()) return '';
    return value
      .replace(/\u00C2·/g, '·')
      .replace(/Â·/g, '·')
      .replace(/â€"/g, '–')
      .replace(/â€“/g, '–')
      .replace(/\u00C2\u00A0/g, ' ')
      .replace(/[\u2013\u2014]/g, '–')
      .replace(/\s+/g, ' ')
      .trim();
  }

  protected goToMessages(chatRoomId: string): void {
    this.closeDetail();
    void this.router.navigate(['/client/messages'], {
      queryParams: { room: chatRoomId },
    });
  }

  protected onViewProfile(event: {
    userId?: string | null;
    teamId?: string | null;
    name: string;
  }): void {
    if (event.teamId) {
      this.toast.success(
        `Team profile for ${event.name} will open once the public profile page is connected.`,
      );
      return;
    }
    this.toast.success(
      `Profile for ${event.name} will open once the public profile page is connected.`,
    );
  }

  protected canShowCloseDiscussion(p: ProjectProposal): boolean {
    return this.canManageDiscussion() && p.status === 'InDiscussion';
  }

  protected canShowReject(p: ProjectProposal): boolean {
    return (
      this.canManageDiscussion() &&
      (p.status === 'Pending' || p.status === 'Viewed' || p.status === 'InDiscussion')
    );
  }

  protected openDetail(p: ProjectProposal) {
    this.selectedProposal.set(p);
    this.detailOpen.set(true);
    if (this.isOwner() && p.status === 'Pending') {
      this.markViewed(p.id);
    }
  }

  protected closeDetail() {
    this.detailOpen.set(false);
    this.selectedProposal.set(null);
  }

  private markViewed(id: string) {
    this.proposalsApi.view(id).subscribe({
      next: () => {
        this.proposals.update((list) =>
          list.map((p) => (p.id === id && p.status === 'Pending' ? { ...p, status: 'Viewed' } : p)),
        );
        this.selectedProposal.update((p) =>
          p && p.id === id && p.status === 'Pending' ? { ...p, status: 'Viewed' } : p,
        );
      },
      error: () => {},
    });
  }

  protected startDiscussion(id: string) {
    const target = this.proposals().find((p) => p.id === id) ?? this.selectedProposal();
    if (!target || !this.canShowStartDiscussion(target)) return;

    this.actionId.set(id);
    this.actionError.set(null);
    this.proposalsApi.startDiscussion(id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.hasActiveDiscussion.set(true);
        this.proposalsChanged.emit();
        this.closeDetail();
        this.loadProposals();
      },
      error: (err) => {
        this.actionId.set(null);
        this.actionError.set(err.message || 'Could not start discussion.');
        this.refreshDiscussionLock();
        this.loadProposals();
      },
    });
  }

  protected closeDiscussion(id: string) {
    this.actionId.set(id);
    this.actionError.set(null);
    this.proposalsApi.closeDiscussion(id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.hasActiveDiscussion.set(false);
        this.proposalsChanged.emit();
        this.closeDetail();
        this.loadProposals();
      },
      error: (err) => {
        this.actionId.set(null);
        this.actionError.set(err.message || 'Could not close discussion.');
      },
    });
  }

  protected rejectProposal(id: string) {
    this.actionId.set(id);
    this.actionError.set(null);
    this.proposalsApi.reject(id).subscribe({
      next: () => {
        this.actionId.set(null);
        this.proposalsChanged.emit();
        this.refreshDiscussionLock();
        this.closeDetail();
        this.loadProposals();
      },
      error: (err) => {
        this.actionId.set(null);
        this.actionError.set(err.message || 'Failed to reject proposal.');
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

  protected statusLabel(status: string): string {
    if (status === 'InDiscussion') return 'IN DISCUSSION';
    return status.toUpperCase();
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected statusClass(status: string): string {
    const map: Record<string, string> = {
      Pending: 'status-pending',
      Viewed: 'status-viewed',
      InDiscussion: 'status-discussion',
      Rejected: 'status-rejected',
      Withdrawn: 'status-withdrawn',
      Expired: 'status-expired',
    };
    return map[status] ?? '';
  }

  private sortToApi(sort: SortOption): {
    sortBy: 'AppliedAt' | 'ProposedBudget';
    sortDirection: 'asc' | 'desc';
  } {
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
