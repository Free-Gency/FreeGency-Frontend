import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { TeamSuggestionsApiService } from '../../data-access/team-suggestions-api.service';
import { TeamSuggestionResponse } from '../../models/team-suggestion';

@Component({
  selector: 'app-team-suggestions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-suggestions.component.html',
  styleUrl: './team-suggestions.component.css',
})
export class TeamSuggestionsComponent {
  private readonly api = inject(TeamSuggestionsApiService);

  readonly suggestions = rxResource<TeamSuggestionResponse, void>({
    stream: () => this.api.getSuggestions(),
  });

  readonly applyingTeamId = signal<string | null>(null);
  readonly applyError = signal<string | null>(null);

  retry(): void {
    this.suggestions.reload();
  }

  apply(teamId: string, jobId: string): void {
    this.applyingTeamId.set(teamId);
    this.applyError.set(null);
    this.api.applyToTeamJob(jobId).subscribe({
      next: () => {
        this.suggestions.reload();
      },
      error: (err) => {
        const pd = err?.error as { title?: string; extensions?: { errors?: string[] } } | undefined;
        this.applyError.set(
          pd?.extensions?.errors?.[1] ?? pd?.extensions?.errors?.[0] ?? pd?.title ?? err?.message ?? 'Apply failed.',
        );
      },
      complete: () => this.applyingTeamId.set(null),
    });
  }
}
