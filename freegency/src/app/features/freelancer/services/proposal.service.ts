import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CreateProposalDto, ProjectDetail, TeamOption } from '../model/proposal.model';
import { ProjectsApiService } from '../../auth/data-access/projects-api.service';
import { TeamsService } from '../../developer/data-access/teams.service';
import { AuthService } from '../../../core/auth/auth.service';
import { ProposalsApiService } from '../data-access/proposals-api.service';

const DEFAULT_PROJECT: ProjectDetail = {
  id: 'unknown',
  title: 'Project details unavailable',
  description: 'We could not find details for this project. It may have been closed or removed.',
  clientName: 'Unknown client',
  postedAt: new Date().toISOString(),
  budgetMin: 0,
  budgetMax: 0,
  duration: '—',
  skills: [],
  proposalCount: 0,
};

@Injectable({ providedIn: 'root' })
export class ProposalsService {
  private readonly projectsApiService = inject(ProjectsApiService);
  private readonly teamsService = inject(TeamsService);
  private readonly authService = inject(AuthService);
  private readonly proposalsApiService = inject(ProposalsApiService);

  /**
   * Fetches project details from the API.
   * Falls back to DEFAULT_PROJECT if the project is not found.
   */
  getProjectById(projectId: string): Observable<ProjectDetail> {
    return this.projectsApiService.getDetails(projectId).pipe(
      map((dto) => ({
        id: dto.id,
        title: dto.title,
        description: dto.description,
        clientName: dto.clientName,
        postedAt: dto.createdAt,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        duration: dto.estimatedDurationDays
          ? `${dto.estimatedDurationDays} days`
          : '—',
        skills: dto.skills ?? [],
        proposalCount: dto.proposalCount,
      })),
      catchError(() => {
        console.error(`Failed to load project ${projectId}`);
        return of({ ...DEFAULT_PROJECT, id: projectId });
      }),
    );
  }

  /**
   * Fetches teams the current user is a member of.
   * Maps Team to TeamOption (id and name only).
   */
  getMyTeams(): Observable<TeamOption[]> {
    return this.teamsService.getMine().pipe(
      map((teams) =>
        teams.map((team) => ({
          id: team.id,
          name: team.name,
        })),
      ),
      catchError(() => {
        console.error('Failed to load user teams');
        return of([]);
      }),
    );
  }

  /**
   * Fetches only teams that the current user OWNS (is the creator of).
   * Only owners can submit proposals on behalf of a team.
   * Maps Team to TeamOption (id and name only).
   */
  getTeamsIOwn(): Observable<TeamOption[]> {
    const currentUserId = this.authService.session()?.id;
    if (!currentUserId) {
      return of([]);
    }

    return this.teamsService.getMine().pipe(
      map((teams) =>
        teams
          .filter((team) => team.ownerUserId === currentUserId)
          .map((team) => ({
            id: team.id,
            name: team.name,
          })),
      ),
      catchError(() => {
        console.error('Failed to load owned teams');
        return of([]);
      }),
    );
  }

  /**
   * Submits a proposal to the backend API.
   * Sends the proposal DTO and file attachments via FormData.
   */
  submitProposal(dto: CreateProposalDto, attachments: File[]): Observable<string> {
    return this.proposalsApiService.create(dto, attachments).pipe(
      catchError((error) => {
        console.error('Failed to submit proposal:', error);
        throw error;
      }),
    );
  }
}