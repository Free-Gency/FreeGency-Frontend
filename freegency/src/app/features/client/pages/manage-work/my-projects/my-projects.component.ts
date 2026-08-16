import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  ManageWorkService,
  MyProjectsSummary,
  type ClientFinanceSnapshot,
} from '../../../data-access/manage-work.service';
import { Project } from '../../../../../shared/models/Project';
import type { IconSvgObject } from '@hugeicons/angular';
import { Calendar03Icon, Money01Icon, UserGroupIcon, Clock01Icon } from '@hugeicons/core-free-icons';
import type { MilestoneProgressSummary } from '../milestones/milestone-progress.util';

type StatusFilter = 'All' | 'Draft' | 'Open' | 'InProgress' | 'Completed' | 'Cancelled';
type SortOption =
  | 'newest'
  | 'oldest'
  | 'title-asc'
  | 'title-desc'
  | 'budget-high'
  | 'budget-low'
  | 'proposals-high'
  | 'proposals-low';
type ManageWorkTab = 'my-projects' | 'proposals' | 'milestones';

@Component({
  selector: 'app-my-projects',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-projects.component.html',
})
export class MyProjectsComponent implements OnInit {
  private readonly manageWorkService = inject(ManageWorkService);
  private readonly router = inject(Router);
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  readonly switchTab = output<ManageWorkTab>();

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly progressByProjectId = signal<Record<string, MilestoneProgressSummary>>({});

  readonly page = signal(1);
  readonly pageSize = 10;
  readonly totalPages = signal(1);
  readonly totalCount = signal(0);
  readonly summary = signal<MyProjectsSummary | null>(null);

  readonly finance = signal<ClientFinanceSnapshot | null>(null);
  readonly proposalsToReview = signal(0);
  readonly milestonesAwaitingApproval = signal(0);

  readonly search = signal('');
  readonly sortOption = signal<SortOption>('newest');
  readonly sortBy = signal<'CreatedAt' | 'Title' | 'Budget' | 'ProposalCount'>('CreatedAt');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  protected readonly calendarIcon = Calendar03Icon as IconSvgObject;
  protected readonly budgetIcon = Money01Icon as IconSvgObject;
  protected readonly proposalIcon = UserGroupIcon as IconSvgObject;
  protected readonly clockIcon = Clock01Icon as IconSvgObject;

  readonly statusFilter = signal<StatusFilter>('All');

  /** Current page items (status filter is applied server-side) */
  readonly filteredProjects = computed(() => this.projects());

  ngOnInit(): void {
    this.loadSummary();
    this.loadProjects();
    this.loadFinance();
    this.loadAttention();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.error.set(null);

    const filter = this.statusFilter();
    this.manageWorkService
      .getMyProjects({
        role: 'as-client',
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
          this.loadProgressForProjects(page.items);
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(err.message || 'Failed to load projects');
          this.loading.set(false);
        },
      });
  }

  private loadProgressForProjects(projects: Project[]): void {
    const inProgressIds = projects
      .filter((p) => p.status === 'InProgress')
      .map((p) => p.id);

    if (inProgressIds.length === 0) {
      this.progressByProjectId.set({});
      return;
    }

    this.manageWorkService.getMilestoneProgressByProjectIds(inProgressIds).subscribe({
      next: (map) => this.progressByProjectId.set(map),
      error: () => this.progressByProjectId.set({}),
    });
  }

  progressFor(projectId: string): MilestoneProgressSummary | null {
    return this.progressByProjectId()[projectId] ?? null;
  }

  loadSummary(): void {
    this.manageWorkService.getMyProjectsSummary('as-client').subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => undefined,
    });
  }

  private loadFinance(): void {
    this.manageWorkService.getClientFinanceSnapshot().subscribe({
      next: (snap) => this.finance.set(snap),
      error: () =>
        this.finance.set({
          availableBalance: 0,
          totalLockedInEscrow: 0,
          releasedToDate: 0,
          activeEscrowProjects: 0,
          currency: 'USD',
        }),
    });
  }

  private loadAttention(): void {
    this.manageWorkService.getAttentionSnapshot().subscribe({
      next: (snap) => {
        this.proposalsToReview.set(snap.proposalsToReview);
        this.milestonesAwaitingApproval.set(snap.milestonesAwaitingApproval);
      },
      error: () => {
        this.proposalsToReview.set(0);
        this.milestonesAwaitingApproval.set(0);
      },
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
      case 'proposals-high':
        this.sortBy.set('ProposalCount');
        this.sortDirection.set('desc');
        break;
      case 'proposals-low':
        this.sortBy.set('ProposalCount');
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

  openProject(project: Project): void {
    void this.router.navigate(['/projects', project.id]);
  }

  getBudgetDisplay(project: Project): string {
    const currency = (project.currency || 'USD').trim() || 'USD';
    if (project.budgetMin === project.budgetMax) {
      return `${this.formatMoney(project.budgetMin)} ${currency}`;
    }
    return `${this.formatMoney(project.budgetMin)}–${this.formatMoney(project.budgetMax)} ${currency}`;
  }

  formatMoney(amount: number | null | undefined): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  }

  formatEscrowAmount(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getDaysLeft(deadline: string): number {
    const today = new Date();
    const target = new Date(deadline);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getTotalEscrow(): number {
    return this.finance()?.totalLockedInEscrow ?? 0;
  }
  getActiveProjectCount(): number {
    return this.finance()?.activeEscrowProjects ?? this.summary()?.inProgress ?? 0;
  }
  getReleasedToDate(): number {
    return this.finance()?.releasedToDate ?? 0;
  }
  getAvailableBalance(): number {
    return this.finance()?.availableBalance ?? 0;
  }

  getProposalsAwaitingReview(): number {
    return this.proposalsToReview();
  }
  getMilestonesAwaitingApproval(): number {
    return this.milestonesAwaitingApproval();
  }
  goToProposals(): void {
    this.switchTab.emit('proposals');
  }
  goToMilestones(): void {
    this.switchTab.emit('milestones');
  }

  openWallet(): void {
    void this.router.navigate(['/settings/payments']);
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
