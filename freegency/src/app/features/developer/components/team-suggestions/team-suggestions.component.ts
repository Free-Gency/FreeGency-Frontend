import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { extractApiError } from '../../../../core/http/api-error';
import { TeamSuggestionsApiService } from '../../data-access/team-suggestions-api.service';
import { TeamsForMeResponse } from '../../models/team-suggestion';

@Component({
  selector: 'app-team-suggestions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './team-suggestions.component.html',
  styleUrl: './team-suggestions.component.css',
})
export class TeamSuggestionsComponent {
  private readonly api = inject(TeamSuggestionsApiService);

  readonly suggestions = rxResource<TeamsForMeResponse, void>({
    stream: () => this.api.getSuggestions(),
  });

  readonly applyingTeamId = signal<string | null>(null);
  readonly applyError = signal<string | null>(null);

  readonly loadErrorMessage = computed(() => {
    const err = this.suggestions.error();
    if (!err) return null;
    return extractApiError(err, 'Failed to load suggestions.');
  });

  retry(): void {
    this.suggestions.reload();
  }

  matchPercent(score: number): number {
    return Math.round(Math.min(1, Math.max(0, score)) * 100);
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'FG';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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
