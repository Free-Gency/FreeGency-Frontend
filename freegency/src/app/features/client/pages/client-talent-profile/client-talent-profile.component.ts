import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';
import { ApiResponse } from '../../../../shared/models/ApiResponse';
import { TeamsService } from '../../../developer/data-access/teams.service';
import type { Team, TeamPortfolioProject } from '../../../developer/models/team';
import { InviteToProjectModalComponent } from '../../components/invite-to-project-modal/invite-to-project-modal.component';
import type { InviteTarget } from '../../models/project-invitation';

export interface TalentNavState {
  name?: string;
  about?: string | null;
  avatarUrl?: string | null;
  averageRating?: number;
  ratingCount?: number;
  skills?: string[];
  specialties?: string[];
  memberCount?: number | null;
  portfolioProjectCount?: number;
  completedProjectsCount?: number;
  projectId?: string;
}

interface PortfolioCard {
  id: string;
  title: string;
  description?: string | null;
  imageCover?: string | null;
  categoryName?: string | null;
}

@Component({
  selector: 'app-client-talent-profile',
  standalone: true,
  imports: [ClientViewNavbarComponent, RouterLink, DecimalPipe, InviteToProjectModalComponent],
  templateUrl: './client-talent-profile.component.html',
  styleUrl: './client-talent-profile.component.css',
})
export class ClientTalentProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly teamsApi = inject(TeamsService);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly profilesUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly kind = signal<'team' | 'developer'>('team');
  protected readonly id = signal('');
  protected readonly preview = signal<TalentNavState>({});
  protected readonly team = signal<Team | null>(null);
  protected readonly portfolio = signal<PortfolioCard[]>([]);
  protected readonly inviteOpen = signal(false);

  ngOnInit(): void {
    const kind = (this.route.snapshot.paramMap.get('kind') || '').toLowerCase();
    const id = this.route.snapshot.paramMap.get('id') || '';
    const nav = (this.router.getCurrentNavigation()?.extras?.state ??
      history.state) as TalentNavState | null;

    if (!id || (kind !== 'team' && kind !== 'developer')) {
      this.error.set('Talent profile not found.');
      this.loading.set(false);
      return;
    }

    this.kind.set(kind);
    this.id.set(id);
    this.preview.set(nav ?? {});

    if (kind === 'team') this.loadTeam(id);
    else this.loadDeveloper(id);
  }

  protected displayName(): string {
    return (
      this.preview().name ||
      this.team()?.name ||
      (this.kind() === 'team' ? 'Team' : 'Developer')
    );
  }

  protected skillLabels(): string[] {
    const fromPreview = this.preview().skills ?? [];
    if (fromPreview.length) return fromPreview;
    return (this.team()?.skills ?? []).map((s) => s.name).filter(Boolean);
  }

  protected aboutText(): string {
    return (
      this.preview().about ||
      this.team()?.aboutUs ||
      'No bio available yet.'
    );
  }

  protected avatarUrl(): string | null {
    return this.preview().avatarUrl || this.team()?.logo || null;
  }

  protected initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'FG';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  protected openPortfolio(projectId: string): void {
    void this.router.navigate(['/client/inspiration', projectId]);
  }

  protected invite(): void {
    this.inviteOpen.set(true);
  }

  protected inviteTarget(): InviteTarget {
    const isTeam = this.kind() === 'team';
    return {
      inviteeType: isTeam ? 'Team' : 'User',
      inviteeTeamId: isTeam ? this.id() : null,
      inviteeUserId: isTeam ? null : this.id(),
      displayName: this.displayName(),
    };
  }

  protected closeInvite(): void {
    this.inviteOpen.set(false);
  }

  protected backHome(): void {
    void this.router.navigateByUrl('/client/hire-talent');
  }

  private loadTeam(teamId: string): void {
    forkJoin({
      team: this.teamsApi.getById(teamId, { skipLoading: true }).pipe(catchError(() => of(null))),
      portfolio: this.teamsApi
        .getTeamPortfolio(teamId, { skipLoading: true })
        .pipe(catchError(() => of([] as TeamPortfolioProject[]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ team, portfolio }) => {
        if (!team && !this.preview().name) {
          this.error.set('Could not load this team profile.');
          this.loading.set(false);
          return;
        }
        this.team.set(team);
        this.portfolio.set(
          (portfolio ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            imageCover: p.imageCover,
            categoryName: null,
          })),
        );
        this.loading.set(false);
      });
  }

  private loadDeveloper(userId: string): void {
    this.http
      .get<ApiResponse<PortfolioCard[]>>(
        `${this.profilesUrl}/developers/${userId}/portfolio-projects`,
      )
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((res) => (res.isSuccess ? (res.data ?? []) : [])),
        catchError(() => of([] as PortfolioCard[])),
      )
      .subscribe((items) => {
        this.portfolio.set(items);
        this.loading.set(false);
      });
  }
}
