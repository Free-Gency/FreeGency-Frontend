import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  Calendar01Icon,
  Cancel01Icon,
  FilterVerticalIcon,
  Money01Icon,
  MoreHorizontalIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  CategoriesApiService,
  type CategoryDto,
} from '../../../auth/data-access/categories-api.service';
import {
  PortfolioApiService,
  type PortfolioProjectDto,
  type RecentlyViewedPortfolioDto,
} from '../../../auth/data-access/portfolio-api.service';
import {
  ProjectsApiService,
  type MyProjectsSummaryDto,
  type ProjectDto,
} from '../../../auth/data-access/projects-api.service';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';

type HomeTab = 'inspiration' | 'my-projects';
type ProjectStatusUi = 'draft' | 'in-progress' | 'completed' | 'open' | 'cancelled';
type ProjectStatusFilter = 'all' | 'in-progress' | 'draft' | 'completed' | 'cancelled';
type DeadlineTone = 'urgent' | 'soon' | 'neutral' | 'planned';

interface InspirationCard {
  id: string;
  title: string;
  author: string;
  category: string;
  image: string;
}

interface RecentItem {
  id: string;
  title: string;
  meta: string;
  image: string;
}

interface ClientProjectCard {
  id: string;
  status: ProjectStatusUi;
  statusLabel: string;
  category: string;
  editedLabel: string;
  title: string;
  description: string;
  rate: string;
  timeline: string;
  successScore: number | null;
}

interface DeadlineItem {
  id: string;
  title: string;
  project: string;
  dueLabel: string;
  tone: DeadlineTone;
  showConnector: boolean;
}

@Component({
  selector: 'app-client-home',
  imports: [HugeiconsIconComponent, ClientViewNavbarComponent, RouterLink, NgClass],
  templateUrl: './client-home.component.html',
  styleUrl: './client-home.component.css',
})
export class ClientHomeComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly createIcon = Add01Icon as IconSvgObject;
  protected readonly searchIcon = Search01Icon as IconSvgObject;
  protected readonly filterIcon = FilterVerticalIcon as IconSvgObject;
  protected readonly closeIcon = Cancel01Icon as IconSvgObject;
  protected readonly moneyIcon = Money01Icon as IconSvgObject;
  protected readonly calendarIcon = Calendar01Icon as IconSvgObject;
  protected readonly moreIcon = MoreHorizontalIcon as IconSvgObject;

  protected readonly activeTab = signal<HomeTab>('inspiration');
  protected readonly projectStatusFilter = signal<ProjectStatusFilter>('all');
  protected readonly activeCategory = signal('All');
  protected readonly searchQuery = signal('');
  protected readonly filtersOpen = signal(false);
  protected readonly loadingInspiration = signal(true);
  protected readonly loadingProjects = signal(true);
  protected readonly publishingId = signal<string | null>(null);

  protected readonly projectStatusOptions: ReadonlyArray<{
    value: ProjectStatusFilter;
    label: string;
  }> = [
    { value: 'all', label: 'All' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'draft', label: 'Draft' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Canceled' },
  ];

  protected readonly categoryOptions = signal<string[]>(['All']);
  protected readonly categoryLookup = signal<Record<string, string>>({});
  protected readonly trendingCategories = signal<string[]>([]);
  protected readonly inspirationCards = signal<InspirationCard[]>([]);
  protected readonly myProjects = signal<ClientProjectCard[]>([]);
  protected readonly recentlyViewed = signal<RecentItem[]>([]);
  protected readonly upcomingDeadlines = signal<DeadlineItem[]>([]);

  protected readonly firstName = computed(
    () => this.auth.session()?.firstName?.trim() || 'there',
  );

  protected readonly inspirationPage = signal(1);
  protected readonly projectsPage = signal(1);
  protected readonly inspirationPageSize = 6;
  protected readonly projectsPageSize = 4;
  protected readonly inspirationTotalPages = signal(1);
  protected readonly projectsTotalPages = signal(1);

  protected readonly pagedCards = computed(() => this.inspirationCards());
  protected readonly pagedProjects = computed(() => this.myProjects());

  protected readonly projectSummary = signal({
    total: 0,
    inProgress: 0,
    draft: 0,
    completed: 0,
    cancelled: 0,
    overallProgress: 0,
  });

  protected readonly activeFiltersCount = computed(() => {
    let count = 0;
    if (this.searchQuery().trim()) count += 1;

    if (this.activeTab() === 'inspiration') {
      if (this.activeCategory() !== 'All') count += 1;
    } else if (this.projectStatusFilter() !== 'all') {
      count += 1;
    }

    return count;
  });

  ngOnInit(): void {
    this.loadHomeData();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }

  protected openFilters(): void {
    this.filtersOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  protected closeFilters(): void {
    this.filtersOpen.set(false);
    document.body.style.overflow = '';
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.inspirationPage.set(1);
    this.projectsPage.set(1);

    if (this.activeTab() === 'inspiration') {
      this.activeCategory.set('All');
      this.reloadInspiration();
    } else {
      this.projectStatusFilter.set('all');
      this.reloadProjects();
    }
  }

  protected selectTab(tab: HomeTab): void {
    this.activeTab.set(tab);
    if (tab === 'inspiration') {
      this.reloadInspiration();
    } else {
      this.reloadProjects();
    }
  }

  protected selectProjectStatusFilter(filter: ProjectStatusFilter): void {
    this.projectStatusFilter.set(filter);
    this.projectsPage.set(1);
    if (this.activeTab() !== 'my-projects') {
      this.activeTab.set('my-projects');
    }
    this.reloadProjects();
  }

  protected summaryTabClass(filter: ProjectStatusFilter): string {
    const base =
      'flex flex-col gap-1 rounded-2xl px-4 py-3.5 text-left transition-colors cursor-pointer';
    return this.projectStatusFilter() === filter
      ? `${base} bg-[rgba(73,75,214,0.35)]`
      : `${base} bg-white/8 hover:bg-white/12`;
  }

  protected selectCategory(category: string): void {
    this.activeCategory.set(category);
    this.inspirationPage.set(1);
    if (this.activeTab() !== 'inspiration') {
      this.activeTab.set('inspiration');
    }
    this.reloadInspiration();
  }

  protected selectTrending(tag: string): void {
    this.selectTab('inspiration');
    const match = this.categoryOptions().find((c) => c === tag);
    this.activeCategory.set(match ?? 'All');
    this.inspirationPage.set(1);
    this.reloadInspiration();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.inspirationPage.set(1);
    this.projectsPage.set(1);

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      if (this.activeTab() === 'inspiration') {
        this.reloadInspiration();
      } else {
        this.reloadProjects();
      }
    }, 350);
  }

  protected goInspirationPage(delta: number): void {
    const next = this.inspirationPage() + delta;
    if (next < 1 || next > this.inspirationTotalPages()) return;
    this.inspirationPage.set(next);
    this.reloadInspiration();
  }

  protected goProjectsPage(delta: number): void {
    const next = this.projectsPage() + delta;
    if (next < 1 || next > this.projectsTotalPages()) return;
    this.projectsPage.set(next);
    this.reloadProjects();
  }

  protected onInspirationCardClick(card: InspirationCard): void {
    void this.router.navigate(['/client/inspiration', card.id]);
  }

  protected onRecentItemClick(item: RecentItem): void {
    void this.router.navigate(['/client/inspiration', item.id]);
  }

  protected onPrimaryAction(project: ClientProjectCard): void {
    if (project.status === 'draft') {
      this.publishProject(project.id);
    }
  }

  protected onViewDetails(project: ClientProjectCard): void {
    void this.router.navigate(['/projects', project.id]);
  }

  protected onProjectMore(_project: ClientProjectCard): void {
    // Menu actions (edit / archive) are not wired yet.
  }

  /** Badge colors aligned with Figma states + distinct Completed / Canceled. */
  protected statusBadgeClass(status: ProjectStatusUi): string {
    switch (status) {
      case 'draft':
        return 'bg-[#dce2f3] text-[#464556]';
      case 'in-progress':
        return 'bg-[#ebe9ff] text-[#4036e0]';
      case 'open':
        return 'bg-[#e7eefe] text-[#494bd6]';
      case 'completed':
        return 'bg-[#e4f7ed] text-[#0d8a4a]';
      case 'cancelled':
        return 'bg-[#fde8e8] text-[#c62828]';
    }
  }

  protected deadlineDotClass(tone: DeadlineTone): string {
    switch (tone) {
      case 'urgent':
        return 'bg-[#ff6b6b]';
      case 'soon':
        return 'bg-[#4036e0]';
      case 'neutral':
        return 'bg-[#00b894]';
      case 'planned':
        return 'bg-[#fdcb6e]';
    }
  }

  protected deadlineBadgeClass(tone: DeadlineTone): string {
    switch (tone) {
      case 'urgent':
        return 'bg-[rgba(255,107,107,0.15)] text-[#ff6b6b]';
      case 'soon':
        return 'bg-white/8 text-[#fdcb6e]';
      case 'neutral':
      case 'planned':
        return 'bg-white/8 text-[#d3d3d3]';
    }
  }

  private loadHomeData(): void {
    this.categoriesApi
      .getCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.applyCategories(categories),
        error: () => undefined,
      });

    this.reloadInspiration();
    this.reloadProjects();
    this.loadProjectsSummary();
    this.loadRecentlyViewed();
  }

  private loadRecentlyViewed(): void {
    this.portfolioApi
      .getRecentlyViewed(5)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.applyRecentlyViewed(items),
        error: () => this.recentlyViewed.set([]),
      });
  }

  private loadProjectsSummary(): void {
    this.projectsApi
      .getMineSummary('as-client')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => this.applyProjectsSummary(summary),
        error: () => undefined,
      });
  }

  private reloadInspiration(): void {
    this.loadingInspiration.set(true);
    const category = this.activeCategory();
    const categoryId =
      category === 'All' ? null : this.categoryLookup()[category] ?? null;

    this.portfolioApi
      .getInspiration({
        categoryId,
        search: this.searchQuery().trim() || null,
        pageNumber: this.inspirationPage(),
        pageSize: this.inspirationPageSize,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.applyInspiration(page.items);
          this.inspirationTotalPages.set(Math.max(1, page.totalPages));
          this.loadingInspiration.set(false);
        },
        error: () => this.loadingInspiration.set(false),
      });
  }

  private reloadProjects(): void {
    this.loadingProjects.set(true);
    const statusFilter = this.projectStatusFilter();

    this.projectsApi
      .getMine({
        role: 'as-client',
        pageNumber: this.projectsPage(),
        pageSize: this.projectsPageSize,
        status: statusFilter === 'all' ? null : statusFilter,
        search: this.searchQuery().trim() || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.applyProjects(page.items);
          this.projectsTotalPages.set(Math.max(1, page.totalPages));
          this.loadingProjects.set(false);
        },
        error: () => this.loadingProjects.set(false),
      });
  }

  private publishProject(projectId: string): void {
    this.publishingId.set(projectId);
    this.projectsApi
      .publish(projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.publishingId.set(null);
          this.reloadProjects();
          this.loadProjectsSummary();
        },
        error: () => this.publishingId.set(null),
      });
  }

  private applyCategories(categories: CategoryDto[]): void {
    const labels = categories
      .map((c) => c.nameEn?.trim() || c.name?.trim())
      .filter((name): name is string => !!name);

    const lookup: Record<string, string> = {};
    for (const category of categories) {
      const label = category.nameEn?.trim() || category.name?.trim();
      if (label) lookup[label] = category.id;
    }

    this.categoryLookup.set(lookup);
    this.categoryOptions.set(['All', ...labels]);
    this.trendingCategories.set(labels.slice(0, 5));
  }

  private applyInspiration(items: PortfolioProjectDto[]): void {
    const cards: InspirationCard[] = items.map((item) => ({
      id: item.id,
      title: item.title,
      author: item.ownerName?.trim() || 'Freelancer',
      category: item.categoryName?.trim() || 'Portfolio',
      image: item.imageCover || '/assets/client-home/e-learning-dashboard.jpg',
    }));

    this.inspirationCards.set(cards);
  }

  private applyRecentlyViewed(items: RecentlyViewedPortfolioDto[]): void {
    this.recentlyViewed.set(
      items.map((item) => ({
        id: item.id,
        title: item.title,
        meta: `${item.categoryName?.trim() || 'Portfolio'} • ${this.relativeViewedLabel(item.viewedAt)}`,
        image: item.imageCover || '/assets/client-home/e-learning-dashboard.jpg',
      })),
    );
  }

  private relativeViewedLabel(viewedAt: string): string {
    const viewed = new Date(viewedAt).getTime();
    if (Number.isNaN(viewed)) return 'recently';

    const diffMs = Date.now() - viewed;
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return 'recently';
  }

  private applyProjects(projects: ProjectDto[]): void {
    this.myProjects.set(projects.map((project) => this.mapProjectCard(project)));
  }

  private applyProjectsSummary(summary: MyProjectsSummaryDto): void {
    const inProgress = summary.inProgress + summary.open;
    const total = summary.total;
    const overallProgress =
      total === 0
        ? 0
        : Math.round(((inProgress * 0.5 + summary.completed) / total) * 100);

    this.projectSummary.set({
      total,
      inProgress,
      draft: summary.draft,
      completed: summary.completed,
      cancelled: summary.cancelled,
      overallProgress,
    });

    this.upcomingDeadlines.set(this.buildDeadlines(summary.upcomingDeadlines));
  }

  private mapProjectCard(project: ProjectDto): ClientProjectCard {
    const status = this.normalizeStatus(project.status);

    return {
      id: project.id,
      status,
      statusLabel: this.statusLabel(status),
      category: project.categoryName || project.specialties?.[0] || 'General',
      editedLabel: this.relativeEditedLabel(project.createdAt),
      title: project.title,
      description: project.description,
      rate: this.formatRate(project),
      timeline: this.formatTimeline(project),
      successScore: this.successScoreFor(status, project.proposalCount),
    };
  }

  private normalizeStatus(status: string): ProjectStatusUi {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'draft';
      case 'inprogress':
      case 'in-progress':
        return 'in-progress';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'open';
    }
  }

  private statusLabel(status: ProjectStatusUi): string {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'in-progress':
        return 'in progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Canceled';
      case 'open':
        return 'Open';
    }
  }

  private formatRate(project: ProjectDto): string {
    const currency = project.currency || 'USD';
    const min = project.budgetMin;
    const max = project.budgetMax;

    if (project.isFixedPrice) {
      return `Fixed · ${currency} ${min}`;
    }

    return `Range · ${currency} ${min} – ${max}`;
  }

  private formatTimeline(project: ProjectDto): string {
    if (project.deadline) {
      const date = new Date(project.deadline);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    if (project.estimatedDurationDays) {
      return `${project.estimatedDurationDays} days`;
    }

    return 'Flexible';
  }

  private relativeEditedLabel(createdAt: string): string {
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return 'Updated recently';

    const diffMs = Date.now() - created.getTime();
    const hours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
    if (hours < 24) return `Edited ${hours}h ago`;

    const days = Math.round(hours / 24);
    return `Edited ${days}d ago`;
  }

  private successScoreFor(
    status: ProjectStatusUi,
    proposalCount: number,
  ): number | null {
    switch (status) {
      case 'draft':
      case 'open':
      case 'cancelled':
        return null;
      case 'completed':
        return 100;
      case 'in-progress':
        return Math.min(95, 40 + proposalCount * 8);
    }
  }

  private buildDeadlines(projects: ProjectDto[]): DeadlineItem[] {
    const now = Date.now();
    const withDeadline = projects
      .filter((p) => !!p.deadline)
      .map((p) => ({ project: p, date: new Date(p.deadline!) }))
      .filter((x) => !Number.isNaN(x.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 4);

    return withDeadline.map((item, index) => {
      const daysLeft = Math.ceil(
        (item.date.getTime() - now) / (1000 * 60 * 60 * 24),
      );
      let tone: DeadlineTone = 'planned';
      let dueLabel = item.date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      if (daysLeft <= 3) {
        tone = 'urgent';
        dueLabel = `${Math.max(daysLeft, 0)}d left`;
      } else if (daysLeft <= 14) {
        tone = 'soon';
      } else if (daysLeft <= 45) {
        tone = 'neutral';
      }

      return {
        id: `deadline-${item.project.id}`,
        title:
          item.project.status === 'InProgress'
            ? 'Next milestone'
            : 'Project deadline',
        project: item.project.title,
        dueLabel,
        tone,
        showConnector: index < withDeadline.length - 1,
      };
    });
  }
}
