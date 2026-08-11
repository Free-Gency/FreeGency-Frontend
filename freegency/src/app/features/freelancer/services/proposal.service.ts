import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CreateProposalDto, ProjectDetail, TeamOption } from '../model/proposal.model';

const MOCK_TEAMS: TeamOption[] = [
  { id: 'team-1', name: 'Pixel Forge Studio' },
  { id: 'team-2', name: 'North Star Devs' },
];

const MOCK_PROJECTS: Record<string, ProjectDetail> = {
  '1': {
    id: '1',
    title: 'React Dashboard for Analytics',
    description:
      'Build a modern analytics dashboard with charts, filters, and role-based access. Prefer React + TypeScript. Clean, data-dense UI with exportable reports and a dark mode toggle.',
    clientName: 'Abdulrahman Salah',
    postedAt: '2026-07-23',
    budgetMin: 800,
    budgetMax: 1500,
    duration: '1 to 3 months',
    skills: ['React', 'Tailwind CSS', 'TypeScript'],
    proposalCount: 0,
  },
  '2': {
    id: '2',
    title: 'Landing Page for Startup Launch',
    description:
      'Design and build a single-page marketing site for a new SaaS product launch, including a waitlist form and an animated hero section.',
    clientName: 'Abdulrahman Salah',
    postedAt: '2026-07-23',
    budgetMin: 300,
    budgetMax: 600,
    duration: '< 1 month',
    skills: ['HTML', 'CSS', 'JavaScript'],
    proposalCount: 4,
  },
};

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
  /**
   * MOCKED — returns a project by id from the in-memory list above.
   * Swap the `of(...)` for `this.http.get<ProjectDetail>(...)` once the
   * real endpoint (e.g. GET /api/projects/{id}) is ready.
   */
  getProjectById(projectId: string): Observable<ProjectDetail> {
    const project = MOCK_PROJECTS[projectId] ?? { ...DEFAULT_PROJECT, id: projectId };
    return of(project).pipe(delay(400));
  }

  /** MOCKED — teams the current user belongs to. */
  getMyTeams(): Observable<TeamOption[]> {
    return of(MOCK_TEAMS).pipe(delay(300));
  }

  /**
   * MOCKED — logs what would be sent to the API and resolves as success
   * after a short delay, so the submit flow (loading state, success
   * screen) can be tested end to end.
   */
  submitProposal(dto: CreateProposalDto, attachments: File[]): Observable<{ success: true }> {
    console.log('[MOCK] submitProposal payload:', dto);
    console.log(
      '[MOCK] submitProposal attachments:',
      attachments.map((f) => f.name),
    );
    return of({ success: true as const }).pipe(delay(800));
  }
}