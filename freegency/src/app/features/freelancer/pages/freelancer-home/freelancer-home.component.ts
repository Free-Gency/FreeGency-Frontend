import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FreelancerHome } from '../../data-access/freelancer-home';
import { DeveloperProfileSummary } from '../../../../shared/models/developer-profile.model';
import { DeveloperViewNavbarComponent } from "../../../../shared/components/developer-view-navbar/developer-view-navbar.component";
import { ApplyProjectButtonComponent } from "../../../../shared/components/apply-project-button/apply-project-button.component";

export type ActiveTab = 'feed' | 'applications' | 'saved';

@Component({
  selector: 'app-freelancer-home',
  standalone: true,
  imports: [CommonModule, FormsModule, DeveloperViewNavbarComponent, ApplyProjectButtonComponent],
  templateUrl: './freelancer-home.component.html',
  styleUrls: ['./freelancer-home.component.css'],
})
export class FreelancerHomeComponent implements OnInit {
  private readonly homeService = inject(FreelancerHome);

  activeTab = signal<ActiveTab>('feed');
  isFilterOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  profileSummary = signal<DeveloperProfileSummary | null>(null);
  categories = signal<any[]>([]);
  projects = signal<any[]>([]);
  totalCount = signal<number>(0);

  selectedCategory = signal<string>('ALL');
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  readonly pageSize = 6;

  ngOnInit(): void {
    this.loadProfile();
    this.loadCategories();
    this.loadActiveTabData();
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
    this.isLoading.set(true);
    const tab = this.activeTab();

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
    // Toggle logic: click again to deselect back to ALL
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
}