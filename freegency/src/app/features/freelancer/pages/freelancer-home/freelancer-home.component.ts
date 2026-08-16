import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FreelancerHome } from '../../data-access/freelancer-home';
import { DeveloperProfileSummary } from '../../../../shared/models/developer-profile.model';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { ApplyProjectButtonComponent } from '../../../../shared/components/apply-project-button/apply-project-button.component';
import { ProjectInvitationsApiService } from '../../../client/data-access/project-invitations-api.service';
import type { ProjectInvitation } from '../../../client/models/project-invitation';
import { extractApiError } from '../../../../core/http/api-error';

export type ActiveTab = 'feed' | 'applications' | 'saved' | 'invitations';

@Component({
  selector: 'app-freelancer-home',
  standalone: true,
  imports: [CommonModule, FormsModule, DeveloperViewNavbarComponent, ApplyProjectButtonComponent],
  templateUrl: './freelancer-home.component.html',
  styleUrls: ['./freelancer-home.component.css'],
})
export class FreelancerHomeComponent implements OnInit {
  private readonly homeService = inject(FreelancerHome);
  private readonly invitationsApi = inject(ProjectInvitationsApiService);
  private readonly router = inject(Router);

  activeTab = signal<ActiveTab>('feed');
  isFilterOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  profileSummary = signal<DeveloperProfileSummary | null>(null);
  categories = signal<any[]>([]);
  projects = signal<any[]>([]);
  totalCount = signal<number>(0);

  invitations = signal<ProjectInvitation[]>([]);
  invitationsError = signal<string | null>(null);
  inviteActionError = signal<string | null>(null);
  inviteActionId = signal<string | null>(null);
  confirmDeclineId = signal<string | null>(null);

  selectedCategory = signal<string>('ALL');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  readonly pageSize = 6;

  readonly pendingInviteCount = computed(
    () => this.invitations().filter((i) => i.status === 'Pending').length,
  );

  ngOnInit(): void {
    this.loadProfile();
    this.loadCategories();
    this.loadInvitations(false);
    this.loadActiveTabData();
  }

  totalPages(): number {
    return Math.max(1, Math.ceil((this.totalCount() ?? 0) / this.pageSize));
  }

  startIndex(): number {
    if (this.totalCount() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize + 1;
  }

  endIndex(): number {
    return Math.min(this.totalCount(), this.currentPage() * this.pageSize);
  }

  goToPage(page: number): void {
    const tp = this.totalPages();
    if (page < 1 || page > tp) return;
    this.currentPage.set(page);
    this.loadActiveTabData();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      this.loadActiveTabData();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
      this.loadActiveTabData();
    }
  }

  pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  loadProfile(): void {
    this.homeService.getProfileSummary().subscribe((data) => {
      this.profileSummary.set(data);
    });
  }

  loadCategories(): void {
    this.homeService.getCategories().subscribe((cats) => {
      this.categories.set(Array.isArray(cats) ? cats : []);
    });
  }

  loadActiveTabData(): void {
    const tab = this.activeTab();
    if (tab === 'invitations') {
      this.loadInvitations(true);
      return;
    }

    this.isLoading.set(true);

    if (tab === 'feed') {
      this.homeService
        .getProjectsFeed({
          page: this.currentPage(),
          pageSize: this.pageSize,
          category: this.selectedCategory(),
          search: this.searchQuery(),
        })
        .subscribe((res) => {
          this.projects.set(res?.data || []);
          this.totalCount.set(res?.totalCount || 0);
          this.isLoading.set(false);
        });
    } else if (tab === 'applications') {
      this.homeService
        .getMyApplications(this.currentPage(), this.pageSize)
        .subscribe((res) => {
          this.projects.set(res?.data || []);
          this.totalCount.set(res?.totalCount || 0);
          this.isLoading.set(false);
        });
    } else if (tab === 'saved') {
      this.homeService.getSavedProjects().subscribe((list) => {
        this.projects.set(list || []);
        this.totalCount.set(list?.length || 0);
        this.isLoading.set(false);
      });
    }
  }

  onTabChange(tab: ActiveTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.currentPage.set(1);
    this.loadActiveTabData();
  }

  onCategorySelect(catId: string): void {
    if (this.selectedCategory() === catId) {
      this.selectedCategory.set('ALL');
    } else {
      this.selectedCategory.set(catId);
    }
    this.currentPage.set(1);
    this.loadActiveTabData();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadActiveTabData();
  }

  onToggleBookmark(project: any): void {
    const isSaved = project.isSaved ?? false;

    project.isSaved = !isSaved;

    this.homeService.toggleSaveProject(project.id, isSaved).subscribe((success) => {
      if (!success) {
        project.isSaved = isSaved;
      } else if (this.activeTab() === 'saved' && isSaved) {
        this.projects.update((list) => list.filter((p) => p.id !== project.id));
      }
    });
  }

  onApplyFilters(): void {
    this.isFilterOpen.set(false);
    this.onSearch();
  }

  onProposalSubmitted(project: any): void {
    project.proposalCount = (project.proposalCount ?? project.proposalsCount ?? 0) + 1;
  }

  invitationStatusClass(status: string): string {
    const key = (status || 'pending').toLowerCase();
    return `fh-invite-status fh-invite-status--${key}`;
  }

  clientInitials(name: string | null | undefined): string {
    const parts = (name || 'C').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'C';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  resolveProjectId(item: {
    id?: string;
    projectId?: string;
    project?: { id?: string };
  } | null | undefined): string | null {
    const id = (item?.projectId || item?.project?.id || item?.id || '').trim();
    return id || null;
  }

  viewProject(projectId: string | null | undefined, event?: Event): void {
    event?.stopPropagation();
    if (!projectId) return;
    void this.router.navigate(['/projects', projectId]);
  }

  askDecline(id: string): void {
    this.confirmDeclineId.set(id);
  }

  cancelDecline(): void {
    this.confirmDeclineId.set(null);
  }

  acceptInvitation(inv: ProjectInvitation): void {
    if (inv.status !== 'Pending' || this.inviteActionId()) return;
    this.confirmDeclineId.set(null);
    this.inviteActionError.set(null);
    this.inviteActionId.set(inv.id);
    this.invitationsApi.accept(inv.id).subscribe({
      next: (roomId) => {
        this.inviteActionId.set(null);
        this.loadInvitations(false);
        this.openInvitationDiscussion(inv, roomId);
      },
      error: (err) => {
        this.inviteActionId.set(null);
        this.inviteActionError.set(extractApiError(err) || 'Could not accept invitation.');
      },
    });
  }

  rejectInvitation(inv: ProjectInvitation): void {
    if (inv.status !== 'Pending' || this.inviteActionId()) return;
    this.inviteActionError.set(null);
    this.inviteActionId.set(inv.id);
    this.invitationsApi.reject(inv.id).subscribe({
      next: () => {
        this.inviteActionId.set(null);
        this.confirmDeclineId.set(null);
        this.loadInvitations(false);
      },
      error: (err) => {
        this.inviteActionId.set(null);
        this.inviteActionError.set(extractApiError(err) || 'Could not reject invitation.');
      },
    });
  }

  openInvitationChat(inv: ProjectInvitation): void {
    if (!inv.chatRoomId) return;
    this.openInvitationDiscussion(inv, inv.chatRoomId);
  }

  private openInvitationDiscussion(inv: ProjectInvitation, roomId: string): void {
    if (inv.inviteeType === 'Team' && inv.inviteeTeamId) {
      void this.router.navigate(['/developer/teams', inv.inviteeTeamId], {
        queryParams: { tab: 'messages', room: roomId },
      });
      return;
    }
    void this.router.navigate(['/developer/messages'], { queryParams: { room: roomId } });
  }

  private loadInvitations(showLoading: boolean): void {
    if (showLoading) this.isLoading.set(true);
    this.invitationsError.set(null);
    this.inviteActionError.set(null);
    this.invitationsApi.getReceived().subscribe({
      next: (items) => {
        this.invitations.set(items);
        if (showLoading) this.isLoading.set(false);
      },
      error: (err) => {
        if (showLoading) this.isLoading.set(false);
        this.invitationsError.set(extractApiError(err) || 'Could not load invitations.');
      },
    });
  }
}
