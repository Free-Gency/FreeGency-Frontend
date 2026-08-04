import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FreelancerHome } from '../../data-access/freelancer-home';
import { DeveloperProfileSummary } from '../../../../shared/models/developer-profile.model';
import { DeveloperViewNavbarComponent } from "../../../../shared/components/developer-view-navbar/developer-view-navbar.component";

export type ActiveTab = 'feed' | 'applications' | 'saved';

@Component({
  selector: 'app-freelancer-home',
  standalone: true,
  imports: [CommonModule, FormsModule, DeveloperViewNavbarComponent],
  templateUrl: './freelancer-home.component.html',
  styleUrls: ['./freelancer-home.component.css'],
})
export class FreelancerHomeComponent implements OnInit {
  private readonly homeService = inject(FreelancerHome);

  activeTab = signal<ActiveTab>('feed');
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
        const projectList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.projects.set(projectList);
        this.totalCount.set(res?.totalCount || projectList.length);
        this.isLoading.set(false);
      });
  } else if (tab === 'applications') {
    this.homeService
      .getMyApplications(this.currentPage(), this.pageSize)
      .subscribe((res) => {
        const appList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        this.projects.set(appList);
        this.totalCount.set(res?.totalCount || appList.length);
        this.isLoading.set(false);
      });
  } else if (tab === 'saved') {
    this.homeService.getSavedProjects().subscribe((list) => {
      this.projects.set(Array.isArray(list) ? list : []);
      this.totalCount.set(Array.isArray(list) ? list.length : 0);
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
    this.selectedCategory.set(catId);
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
}
