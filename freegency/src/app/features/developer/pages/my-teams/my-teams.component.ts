import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  ArrowRight01Icon,
  Link01Icon,
  StarIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { AuthService } from '../../../../core/auth/auth.service';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { TeamsService } from '../../data-access/teams.service';
import {
  MyTeamsHubTab,
  Team,
  TeamCardVm,
  TeamJob,
} from '../../models/team';

@Component({
  selector: 'app-my-teams',
  standalone: true,
  imports: [DeveloperViewNavbarComponent, HugeiconsIconComponent, FormsModule, RouterLink],
  templateUrl: './my-teams.component.html',
})
export class MyTeamsComponent implements OnInit {
  private readonly teamsApi = inject(TeamsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly starIcon = StarIcon as IconSvgObject;
  protected readonly groupIcon = UserGroupIcon as IconSvgObject;
  protected readonly arrowIcon = ArrowRight01Icon as IconSvgObject;
  protected readonly addIcon = Add01Icon as IconSvgObject;
  protected readonly linkIcon = Link01Icon as IconSvgObject;

  protected readonly activeTab = signal<MyTeamsHubTab>('my-team');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly myTeams = signal<TeamCardVm[]>([]);
  protected readonly discoverTeams = signal<Team[]>([]);
  protected readonly openings = signal<TeamJob[]>([]);

  protected readonly joinOpen = signal(false);
  protected readonly createOpen = signal(false);
  protected readonly joinCode = signal('');
  protected readonly joinCover = signal('');
  protected readonly joinPreview = signal<Team | null>(null);
  protected readonly joinBusy = signal(false);
  protected readonly joinMessage = signal<string | null>(null);

  protected readonly createName = signal('');
  protected readonly createAbout = signal('');
  protected readonly createBusy = signal(false);
  protected readonly createError = signal<string | null>(null);

  protected readonly hubTabs = [
    { id: 'my-team' as const, label: 'My Team' },
    { id: 'discover' as const, label: 'Discover' },
    { id: 'openings' as const, label: 'Team Openings' },
  ];

  protected readonly userId = computed(() => this.auth.session()?.id ?? '');

  ngOnInit(): void {
    this.loadActiveTab();
  }

  protected setTab(tab: MyTeamsHubTab): void {
    this.activeTab.set(tab);
    this.loadActiveTab();
  }

  protected openTeam(teamId: string): void {
    void this.router.navigate(['/developer/my-teams', teamId]);
  }

  protected openJoin(): void {
    this.joinOpen.set(true);
    this.joinCode.set('');
    this.joinCover.set('');
    this.joinPreview.set(null);
    this.joinMessage.set(null);
  }

  protected openCreate(): void {
    this.createOpen.set(true);
    this.createName.set('');
    this.createAbout.set('');
    this.createError.set(null);
  }

  protected closeModals(): void {
    this.joinOpen.set(false);
    this.createOpen.set(false);
  }

  protected previewJoinCode(): void {
    const code = this.joinCode().trim();
    if (!code) return;
    this.joinBusy.set(true);
    this.joinMessage.set(null);
    this.teamsApi.getByCode(code).subscribe({
      next: (team) => {
        this.joinPreview.set(team);
        this.joinBusy.set(false);
      },
      error: () => {
        this.joinPreview.set(null);
        this.joinBusy.set(false);
        this.joinMessage.set('No team found for this code.');
      },
    });
  }

  protected submitJoin(): void {
    const code = this.joinCode().trim();
    if (!code) return;
    this.joinBusy.set(true);
    this.joinMessage.set(null);
    this.teamsApi.joinByCode(code, this.joinCover()).subscribe({
      next: () => {
        this.joinBusy.set(false);
        this.joinMessage.set('Request sent. A team leader will review your join request.');
        this.joinPreview.set(null);
      },
      error: () => {
        this.joinBusy.set(false);
        this.joinMessage.set('Could not send join request. Try again.');
      },
    });
  }

  protected submitCreate(): void {
    const name = this.createName().trim();
    if (!name) {
      this.createError.set('Team name is required.');
      return;
    }
    this.createBusy.set(true);
    this.createError.set(null);
    this.teamsApi
      .createTeam({ name, aboutUs: this.createAbout().trim() || undefined })
      .subscribe({
        next: (id) => {
          this.createBusy.set(false);
          this.createOpen.set(false);
          void this.router.navigate(['/developer/my-teams', id]);
        },
        error: () => {
          this.createBusy.set(false);
          this.createError.set('Could not create team. Try again.');
        },
      });
  }

  protected ratingLabel(team: Team): string {
    return team.averageRating > 0 ? team.averageRating.toFixed(1) : 'New';
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('');
  }

  private loadActiveTab(): void {
    this.error.set(null);
    this.loading.set(true);
    const tab = this.activeTab();

    if (tab === 'my-team') {
      this.teamsApi.getMine().subscribe({
        next: (teams) => {
          const uid = this.userId();
          this.myTeams.set(
            teams.map((t) => ({
              ...t,
              role: t.ownerUserId === uid ? 'TeamLeader' : 'TeamMember',
            })),
          );
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load your teams.');
          this.loading.set(false);
        },
      });
      return;
    }

    if (tab === 'discover') {
      this.teamsApi.browse().subscribe({
        next: (teams) => {
          this.discoverTeams.set(teams);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Could not load teams.');
          this.loading.set(false);
        },
      });
      return;
    }

    this.teamsApi.browseOpenJobs({ pageSize: 24 }).subscribe({
      next: (page) => {
        this.openings.set(page.items.filter((j) => j.status?.toLowerCase() === 'open' || !j.status));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Could not load team openings.');
        this.loading.set(false);
      },
    });
  }
}
