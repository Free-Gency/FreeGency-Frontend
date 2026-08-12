import { Injectable, computed, signal } from '@angular/core';
import type { ProjectDraftResponse } from './project-draft-api.service';

export interface ProjectScopeBudget {
  isFixedPrice: boolean;
  budgetFixed: string;
  budgetMin: string;
  budgetMax: string;
  currency: string;
  duration: string;
}

export const PROJECT_DURATIONS = [
  'Less than 1 month',
  '1-3 months',
  '3-6 months',
  'More than 6 months',
] as const;

export const PROJECT_CURRENCIES = ['USD', 'EUR', 'EGP'] as const;

const DURATION_DAYS: Record<string, number> = {
  'Less than 1 month': 30,
  '1-3 months': 90,
  '3-6 months': 150,
  'More than 6 months': 270,
};

/** Convert free-text duration (or legacy preset labels) into days for the API. */
export function durationToDays(duration: string | null | undefined): number {
  if (!duration?.trim()) return 90;

  const trimmed = duration.trim();
  const preset = DURATION_DAYS[trimmed];
  if (preset) return preset;

  const lower = trimmed.toLowerCase();
  const match = lower.match(/(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months|yr|year|years)?/);
  if (!match) return 90;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 90;

  const unit = match[2] ?? 'days';
  switch (unit) {
    case 'week':
    case 'weeks':
      return Math.max(1, Math.round(amount * 7));
    case 'month':
    case 'months':
      return Math.max(1, Math.round(amount * 30));
    case 'yr':
    case 'year':
    case 'years':
      return Math.max(1, Math.round(amount * 365));
    default:
      return Math.max(1, Math.round(amount));
  }
}

export type ProjectCreateMode = 'ai' | 'manual';

@Injectable({ providedIn: 'root' })
export class ProjectDraftStateService {
  private readonly draftSignal = signal<ProjectDraftResponse | null>(null);
  private readonly userInputSignal = signal('');
  private readonly scopeSignal = signal<ProjectScopeBudget | null>(null);
  private readonly modeSignal = signal<ProjectCreateMode>('ai');

  readonly draft = this.draftSignal.asReadonly();
  readonly userInput = this.userInputSignal.asReadonly();
  readonly scope = this.scopeSignal.asReadonly();
  readonly mode = this.modeSignal.asReadonly();

  readonly hasDraft = computed(() => this.draftSignal() != null);

  setMode(mode: ProjectCreateMode): void {
    this.modeSignal.set(mode);
  }

  setUserInput(value: string): void {
    this.userInputSignal.set(value);
  }

  setDraft(draft: ProjectDraftResponse): void {
    this.draftSignal.set(draft);
  }

  patchDraft(partial: Partial<ProjectDraftResponse>): void {
    const current = this.draftSignal();
    if (!current) return;
    this.draftSignal.set({ ...current, ...partial });
  }

  setScope(scope: ProjectScopeBudget): void {
    this.scopeSignal.set(scope);
  }

  patchScope(partial: Partial<ProjectScopeBudget>): void {
    const current = this.scopeSignal();
    if (!current) {
      this.scopeSignal.set({
        isFixedPrice: true,
        budgetFixed: '',
        budgetMin: '',
        budgetMax: '',
        currency: 'USD',
        duration: '',
        ...partial,
      });
      return;
    }
    this.scopeSignal.set({ ...current, ...partial });
  }

  clear(): void {
    this.draftSignal.set(null);
    this.userInputSignal.set('');
    this.scopeSignal.set(null);
    this.modeSignal.set('ai');
  }

  budgetLabel(): string {
    const scope = this.scopeSignal();
    if (!scope) return '—';

    const currency = scope.currency || 'USD';
    if (scope.isFixedPrice) {
      const amount = Number(scope.budgetFixed);
      if (!Number.isFinite(amount) || amount <= 0) return '—';
      return `$${amount.toLocaleString('en-US')} Fixed`;
    }

    const min = Number(scope.budgetMin);
    const max = Number(scope.budgetMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return '—';
    return `$${min.toLocaleString('en-US')} – $${max.toLocaleString('en-US')} (${currency})`;
  }
}
