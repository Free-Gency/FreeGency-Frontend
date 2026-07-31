import { Component, OnInit, inject, signal, computed, DestroyRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HugeiconsIconComponent } from '@hugeicons/angular';
import { Idea01Icon } from '@hugeicons/core-free-icons';
import {
  ManageWorkService,
  RankedProposal,
} from '../../../data-access/manage-work.service';
import { Proposal, PagedResponse } from '../../../../../shared/models/Proposal';
import { Project } from '../../../../../shared/models/Project';
import { ProposalAssistantComponent } from '../../../components/proposal-assistant/proposal-assistant.component';
import { ProposalDetailDrawerComponent } from '../../../../project/components/proposal-detail-drawer/proposal-detail-drawer.component';
import { ToastService } from '../../../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-proposals',
  standalone: true,
  imports: [
    CommonModule,
    HugeiconsIconComponent,
    ProposalAssistantComponent,
    ProposalDetailDrawerComponent,
  ],
  templateUrl: './proposals.html',
  styleUrl: './proposals.css',
})
export class Proposals implements OnInit {
  private readonly manageWorkService = inject(ManageWorkService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private rankingRequestId = 0;

  readonly ideaIcon = Idea01Icon;

  /** Sidebar projects (paginated) */
  readonly projects = signal<Project[]>([]);
  readonly projectsPage = signal(1);
  readonly projectsPageSize = 10;
  readonly projectsTotalPages = signal(1);
  readonly projectsTotal = signal(0);
  readonly allProposalsTotal = signal(0);
  readonly loadingProjects = signal(false);

  /** Optional filter — empty means all proposals across projects */
  readonly selectedProjectId = signal<string | null>(null);

  readonly actionInProgress = signal<string | null>(null);
  readonly aiRankingEnabled = signal(false);
  readonly rankingLoading = signal(false);
  readonly rankingError = signal<string | null>(null);
  readonly rankingById = signal<Record<string, RankedProposal>>({});
  readonly aiSummary = signal<string | null>(null);
  /** Soft tip after accept — shown once in the assistant */
  readonly assistantAcceptTip = signal(false);
  readonly selectedProposal = signal<Proposal | null>(null);
  readonly detailOpen = signal(false);
  /** Project IDs that already have an InDiscussion proposal (one discussion at a time). */
  readonly discussionProjectIds = signal<ReadonlySet<string>>(new Set());

  readonly page = signal(1);
  readonly pageSize = 10;
  readonly search = signal('');
  readonly sortBy = signal<'AppliedAt' | 'ProposedBudget'>('AppliedAt');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  /** UI value for the sort select */
  readonly sortOption = signal<'newest' | 'oldest' | 'budget-high' | 'budget-low'>('newest');

  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;

  readonly activeProjectId = computed(() => this.selectedProjectId() ?? '');

  readonly selectedProject = computed(() => {
    const id = this.selectedProjectId();
    if (!id) return null;
    return this.projects().find((p) => p.id === id) ?? null;
  });

  readonly proposalsResource = rxResource<
    PagedResponse<Proposal>,
    {
      id: string;
      page: number;
      search: string;
      sortBy: 'AppliedAt' | 'ProposedBudget';
      sortDirection: 'asc' | 'desc';
    }
  >({
    params: () => ({
      id: this.activeProjectId(),
      page: this.page(),
      search: this.search(),
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
    }),
    stream: ({ params }) =>
      this.manageWorkService.getProposals({
        projectId: params.id || undefined,
        pageNumber: params.page,
        pageSize: this.pageSize,
        search: params.search || null,
        sortBy: params.sortBy,
        sortDirection: params.sortDirection,
      }),
  });

  readonly proposals = computed(() => {
    const list = this.proposalsResource.value()?.items ?? [];
    if (!this.aiRankingEnabled()) return list;

    const ranks = this.rankingById();
    return [...list].sort((a, b) => {
      const ra = ranks[a.id.toLowerCase()]?.rank ?? Number.MAX_SAFE_INTEGER;
      const rb = ranks[b.id.toLowerCase()]?.rank ?? Number.MAX_SAFE_INTEGER;
      if (ra !== rb) return ra - rb;
      return (ranks[b.id.toLowerCase()]?.overallScore ?? 0) - (ranks[a.id.toLowerCase()]?.overallScore ?? 0);
    });
  });

  readonly totalPages = computed(() => Math.max(1, this.proposalsResource.value()?.totalPages ?? 1));
  readonly totalCount = computed(() => this.proposalsResource.value()?.totalCount ?? 0);
  readonly rankedCount = computed(() => Object.keys(this.rankingById()).length);

  ngOnInit(): void {
    this.loadProjects();
    this.loadAllProposalsTotal();
  }

  private discussionLockRequestId = 0;

  constructor() {
    effect(() => {
      const enabled = this.aiRankingEnabled();
      const projectId = this.activeProjectId();
      if (enabled && projectId) {
        this.loadRanking(projectId);
      } else if (!enabled) {
        this.rankingById.set({});
        this.aiSummary.set(null);
        this.rankingError.set(null);
      }
    });

    effect(() => {
      this.activeProjectId();
      this.refreshDiscussionLock();
    });

    effect(() => {
      const list = this.proposals();
      if (!list.length) return;
      const current = this.discussionProjectIds();
      let next: Set<string> | null = null;
      for (const p of list) {
        if (p.status === 'InDiscussion' && !current.has(p.projectId)) {
          if (!next) next = new Set(current);
          next.add(p.projectId);
        }
      }
      if (next) this.discussionProjectIds.set(next);
    });
  }

  private refreshDiscussionLock(): void {
    const requestId = ++this.discussionLockRequestId;
    const projectId = this.activeProjectId() || undefined;
    this.manageWorkService
      .getProposals({
        projectId,
        status: 'InDiscussion',
        pageNumber: 1,
        pageSize: 100,
      })
      .subscribe({
        next: (page) => {
          if (requestId !== this.discussionLockRequestId) return;
          const ids = new Set(page.items.map((p) => p.projectId));
          for (const p of this.proposals()) {
            if (p.status === 'InDiscussion') ids.add(p.projectId);
          }
          this.discussionProjectIds.set(ids);
        },
        error: () => undefined,
      });
  }

  hasActiveDiscussionFor(proposal: Proposal): boolean {
    return this.discussionProjectIds().has(proposal.projectId);
  }

  canStartDiscussion(proposal: Proposal): boolean {
    return (
      (proposal.status === 'Pending' || proposal.status === 'Viewed') &&
      !this.hasActiveDiscussionFor(proposal)
    );
  }

  cleanDisplayText(value: string | null | undefined): string {
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

  getSkills(proposal: Proposal): string[] {
    const fromApi = (proposal.skills ?? []).map((s) => s.trim()).filter(Boolean);
    if (fromApi.length) return fromApi.slice(0, 6);
    return this.tagsFromApproach(proposal.approach).slice(0, 6);
  }

  getSpecialties(proposal: Proposal): string[] {
    return (proposal.specialties ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 4);
  }

  tagsFromApproach(approach: string | null | undefined): string[] {
    const cleaned = this.cleanDisplayText(approach);
    if (!cleaned) return [];
    return cleaned
      .split(/[·•|,+/]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && t.length < 40);
  }

  statusChipClass(status: string): string {
    const map: Record<string, string> = {
      Pending: 'status-pending',
      Viewed: 'status-viewed',
      InDiscussion: 'status-discussion',
      Rejected: 'status-rejected',
      Withdrawn: 'status-withdrawn',
      Expired: 'status-expired',
    };
    return map[status] ?? 'status-pending';
  }

  statusLabel(status: string): string {
    return status === 'InDiscussion' ? 'IN DISCUSSION' : status.toUpperCase();
  }

  canOpenMessages(proposal: Proposal): boolean {
    return proposal.status === 'InDiscussion' && !!proposal.chatRoomId;
  }

  goToMessages(chatRoomId: string): void {
    void this.router.navigate(['/client/messages'], {
      queryParams: { room: chatRoomId },
    });
  }

  onDrawerGoToMessages(chatRoomId: string): void {
    this.closeDetail();
    this.goToMessages(chatRoomId);
  }

  loadProjects(): void {
    this.loadingProjects.set(true);
    this.manageWorkService
      .getMyProjects({
        role: 'as-client',
        pageNumber: this.projectsPage(),
        pageSize: this.projectsPageSize,
      })
      .subscribe({
        next: (page) => {
          this.projects.set(page.items);
          this.projectsTotalPages.set(Math.max(1, page.totalPages));
          this.projectsTotal.set(page.totalCount);
          this.loadingProjects.set(false);
        },
        error: () => this.loadingProjects.set(false),
      });
  }

  loadAllProposalsTotal(): void {
    this.manageWorkService.getProposals({ pageNumber: 1, pageSize: 1 }).subscribe({
      next: (page) => this.allProposalsTotal.set(page.totalCount),
      error: () => undefined,
    });
  }

  goProjectsPage(delta: number): void {
    const next = this.projectsPage() + delta;
    if (next < 1 || next > this.projectsTotalPages()) return;
    this.projectsPage.set(next);
    this.loadProjects();
  }

  selectProject(id: string): void {
    this.selectedProjectId.update((current) => (current === id ? null : id));
    // Always reset AI ranking when switching projects — user opts in per project
    this.aiRankingEnabled.set(false);
    this.rankingById.set({});
    this.aiSummary.set(null);
    this.rankingError.set(null);
    this.assistantAcceptTip.set(false);
    this.page.set(1);
  }

  goToPage(delta: number): void {
    const next = this.page() + delta;
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
  }

  onSearchInput(value: string): void {
    if (this.searchDebounceHandle) clearTimeout(this.searchDebounceHandle);
    this.searchDebounceHandle = setTimeout(() => {
      this.search.set(value.trim());
      this.page.set(1);
    }, 300);
  }

  onSortChange(value: string): void {
    const option = value as 'newest' | 'oldest' | 'budget-high' | 'budget-low';
    this.sortOption.set(option);

    switch (option) {
      case 'oldest':
        this.sortBy.set('AppliedAt');
        this.sortDirection.set('asc');
        break;
      case 'budget-high':
        this.sortBy.set('ProposedBudget');
        this.sortDirection.set('desc');
        break;
      case 'budget-low':
        this.sortBy.set('ProposedBudget');
        this.sortDirection.set('asc');
        break;
      case 'newest':
      default:
        this.sortBy.set('AppliedAt');
        this.sortDirection.set('desc');
        break;
    }

    this.page.set(1);
  }

  toggleAiRanking(): void {
    if (!this.aiRankingEnabled() && !this.activeProjectId()) {
      this.rankingError.set('Select a project first to enable AI ranking.');
      return;
    }
    this.rankingError.set(null);
    this.aiRankingEnabled.update((v) => !v);
  }

  loadRanking(projectId: string): void {
    const requestId = ++this.rankingRequestId;
    this.rankingLoading.set(true);
    this.rankingError.set(null);

    this.manageWorkService.getProposalRanking(projectId, 50).subscribe({
      next: (res) => {
        if (requestId !== this.rankingRequestId) return;
        const map: Record<string, RankedProposal> = {};
        for (const ranked of res.rankedProposals) {
          map[ranked.candidateId.toLowerCase()] = ranked;
        }
        this.rankingById.set(map);
        this.aiSummary.set(res.aiSummary ?? null);
        this.rankingLoading.set(false);

        const warnings = res.metadata?.warnings?.filter(Boolean) ?? [];
        if (res.rankedProposals.length === 0) {
          this.rankingError.set(
            warnings[0] ?? 'No proposals available to rank for this project.',
          );
        } else {
          this.rankingError.set(null);
        }
      },
      error: (err) => {
        if (requestId !== this.rankingRequestId) return;
        this.rankingById.set({});
        const apiMsg =
          err?.error?.message ||
          err?.error?.errors?.[0] ||
          err?.message ||
          'Failed to load AI ranking.';
        this.rankingError.set(apiMsg);
        this.rankingLoading.set(false);
      },
    });
  }

  getMatch(proposal: Proposal): number | null {
    const ranked = this.rankingById()[proposal.id.toLowerCase()];
    if (!ranked) return null;
    const score = ranked.overallScore <= 1 ? ranked.overallScore * 100 : ranked.overallScore;
    return Math.round(score);
  }

  getAiReasoning(proposal: Proposal): string | null {
    return this.rankingById()[proposal.id.toLowerCase()]?.aiReasoning ?? null;
  }

  getRank(proposal: Proposal): number | null {
    return this.rankingById()[proposal.id.toLowerCase()]?.rank ?? null;
  }

  openDetail(proposal: Proposal): void {
    this.selectedProposal.set(proposal);
    this.detailOpen.set(true);
    if (proposal.status === 'Pending') {
      this.manageWorkService
        .viewProposal(proposal.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.selectedProposal.update((p) =>
              p && p.id === proposal.id ? { ...p, status: 'Viewed' } : p,
            );
            this.proposalsResource.reload();
          },
        });
    }
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.selectedProposal.set(null);
  }

  canStartFromDetail(proposal: Proposal | null): boolean {
    return !!proposal && this.canStartDiscussion(proposal);
  }

  canCloseFromDetail(proposal: Proposal | null): boolean {
    return !!proposal && proposal.status === 'InDiscussion';
  }

  canRejectFromDetail(proposal: Proposal | null): boolean {
    return (
      !!proposal &&
      (proposal.status === 'Pending' ||
        proposal.status === 'Viewed' ||
        proposal.status === 'InDiscussion')
    );
  }

  startDiscussion(proposal: Proposal): void {
    this.actionInProgress.set(proposal.id);
    this.manageWorkService.startDiscussion(proposal.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionInProgress.set(null);
          this.assistantAcceptTip.set(true);
          this.closeDetail();
          this.proposalsResource.reload();
          this.refreshDiscussionLock();
          if (this.aiRankingEnabled() && this.activeProjectId()) {
            this.loadRanking(this.activeProjectId());
          }
        },
        error: () => this.actionInProgress.set(null),
      });
  }

  onDrawerStartDiscussion(id: string): void {
    const proposal = this.selectedProposal() ?? this.proposals().find((p) => p.id === id);
    if (proposal) this.startDiscussion(proposal);
  }

  onDrawerCloseDiscussion(id: string): void {
    const proposal = this.selectedProposal() ?? this.proposals().find((p) => p.id === id);
    if (proposal) this.closeDiscussion(proposal);
  }

  onDrawerReject(id: string): void {
    const proposal = this.selectedProposal() ?? this.proposals().find((p) => p.id === id);
    if (proposal) this.reject(proposal);
  }

  viewProposal(proposal: Proposal): void {
    this.openDetail(proposal);
  }

  closeDiscussion(proposal: Proposal): void {
    this.actionInProgress.set(proposal.id);
    this.manageWorkService.closeDiscussion(proposal.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionInProgress.set(null);
          this.closeDetail();
          this.proposalsResource.reload();
          this.refreshDiscussionLock();
        },
        error: () => this.actionInProgress.set(null),
      });
  }

  dismissAssistantAcceptTip(): void {
    this.assistantAcceptTip.set(false);
  }

  onDrawerViewProfile(event: {
    userId?: string | null;
    teamId?: string | null;
    name: string;
  }): void {
    this.onAssistantViewProfile(event);
  }

  onAssistantViewProfile(event: { userId?: string | null; teamId?: string | null; name?: string }): void {
    if (event.teamId) {
      this.toast.success(
        `Team profile for ${event.name ?? 'this team'} will open once the public profile page is connected.`,
      );
      return;
    }
    this.toast.success(
      `Profile for ${event.name ?? 'this applicant'} will open once the public profile page is connected.`,
    );
  }

  onAssistantMessage(event: {
    proposalId?: string | null;
    chatRoomId?: string | null;
    name: string;
  }): void {
    if (event.chatRoomId) {
      this.goToMessages(event.chatRoomId);
      return;
    }
    this.toast.success(`Start a discussion with ${event.name} first to open messages.`);
  }

  reject(proposal: Proposal): void {
    this.actionInProgress.set(proposal.id);
    this.manageWorkService.rejectProposal(proposal.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.actionInProgress.set(null);
          this.closeDetail();
          this.proposalsResource.reload();
          this.refreshDiscussionLock();
          if (this.aiRankingEnabled() && this.activeProjectId()) {
            this.loadRanking(this.activeProjectId());
          }
        },
        error: () => this.actionInProgress.set(null),
      });
  }

  getApplicantDisplayName(proposal: Proposal): string {
    return proposal.applicantType === 'Team'
      ? proposal.teamName ?? 'Unknown team'
      : proposal.applicantName ?? 'Unknown applicant';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  getFakeRating(proposal: Proposal): number {
    return 4.5 + (proposal.id.charCodeAt(0) % 5) / 10;
  }

  getFakeReviewCount(proposal: Proposal): number {
    return 20 + (proposal.id.charCodeAt(0) % 100);
  }

  getAvgBid(): number {
    const list = this.proposals();
    if (list.length === 0) return 0;
    return list.reduce((sum, p) => sum + p.proposedBudget, 0) / list.length;
  }
}
