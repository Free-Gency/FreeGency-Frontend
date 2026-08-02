import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ArrowLeft01Icon,
  Copy01Icon,
  StarIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../../core/auth/auth.service';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { TeamsService } from '../../data-access/teams.service';
import {
  Team,
  TeamDetailTab,
  TeamJob,
  TeamPortfolioProject,
  TeamRoleLabel,
} from '../../models/team';

@Component({
  selector: 'app-team-detail',
  standalone: true,
  imports: [DeveloperViewNavbarComponent, HugeiconsIconComponent, RouterLink],
  templateUrl: './team-detail.component.html',
})
export class TeamDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamsApi = inject(TeamsService);
  private readonly auth = inject(AuthService);

  protected readonly backIcon = ArrowLeft01Icon as IconSvgObject;
  protected readonly starIcon = StarIcon as IconSvgObject;
  protected readonly groupIcon = UserGroupIcon as IconSvgObject;
  protected readonly copyIcon = Copy01Icon as IconSvgObject;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly team = signal<Team | null>(null);
  protected readonly portfolio = signal<TeamPortfolioProject[]>([]);
  protected readonly teamJobs = signal<TeamJob[]>([]);
  protected readonly activeTab = signal<TeamDetailTab>('overview');
  protected readonly codeCopied = signal(false);

  protected readonly role = computed<TeamRoleLabel>(() => {
    const t = this.team();
    const uid = this.auth.session()?.id;
    if (!t || !uid) return 'TeamMember';
    return t.ownerUserId === uid ? 'TeamLeader' : 'TeamMember';
  });

  protected readonly isLeader = computed(() => this.role() === 'TeamLeader');

  protected readonly visibleTabs = computed(() => {
    const leader = this.isLeader();
    const tabs: { id: TeamDetailTab; label: string }[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'portfolio', label: 'Portfolio' },
      { id: 'projects', label: 'Projects' },
      { id: 'tasks', label: 'Tasks' },
    ];
    if (leader) {
      tabs.push({ id: 'management', label: 'Management' });
    }
    tabs.push({ id: 'finance', label: 'Finance' });
    tabs.push({ id: 'messages', label: 'Messages' });
    return tabs;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('teamId');
    const tab = this.route.snapshot.queryParamMap.get('tab') as TeamDetailTab | null;
    if (tab) {
      this.activeTab.set(tab);
    }
    if (!id) {
      this.error.set('Team not found.');
      this.loading.set(false);
      return;
    }
    this.loadTeam(id);
  }

  protected setTab(tab: TeamDetailTab): void {
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected copyCode(): void {
    const code = this.team()?.teamCode;
    if (!code || !navigator.clipboard) return;
    void navigator.clipboard.writeText(code).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 1600);
    });
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  protected portfolioCover(project: TeamPortfolioProject): string | null {
    return project.imageCover ?? null;
  }

  private loadTeam(id: string): void {
    this.loading.set(true);
    this.teamsApi.getById(id).subscribe({
      next: (team) => {
        this.team.set(team);
        this.loading.set(false);
        this.teamsApi.getTeamPortfolio(id).subscribe({
          next: (items) => this.portfolio.set(items),
          error: () => this.portfolio.set([]),
        });
        this.teamsApi.getTeamJobs(id).subscribe({
          next: (jobs) => this.teamJobs.set(jobs),
          error: () => this.teamJobs.set([]),
        });
      },
      error: () => {
        this.error.set('Could not load this team.');
        this.loading.set(false);
      },
    });
  }
}
