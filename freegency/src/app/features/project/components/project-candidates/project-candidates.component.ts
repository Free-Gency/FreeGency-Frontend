import { CommonModule } from '@angular/common';
import { Component, input, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { ProjectCandidatesApiService } from '../../data-access/project-candidates-api.service';
import { ProjectCandidatesResponse } from '../../models/project-candidates';

@Component({
  selector: 'app-project-candidates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-candidates.component.html',
})
export class ProjectCandidatesComponent {
  private readonly api = inject(ProjectCandidatesApiService);

  readonly projectId = input.required<string>();
  readonly projectStatus = input<string>('');

  readonly candidates = rxResource<ProjectCandidatesResponse | null, string>({
    params: () => this.projectId(),
    stream: ({ params: id }) => {
      if (!id) return of(null);
      return this.api.getCandidatesForProject(id);
    },
  });

  retry(): void {
    this.candidates.reload();
  }

  matchPercent(score: number): number {
    return Math.round(Math.min(1, Math.max(0, score)) * 100);
  }

  typeLabel(type: string): string {
    return type === 'Team' ? 'Team' : 'Developer';
  }
}
