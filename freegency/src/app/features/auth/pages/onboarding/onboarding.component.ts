import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { timer } from 'rxjs';
import type { UserMode } from '../../../../core/auth/auth.models';
import { AuthAmbientBgComponent } from '../../../../shared/components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../shared/header/header.component';

export const SIGNUP_MODE_KEY = 'freegency_signup_mode';

@Component({
  selector: 'app-onboarding',
  imports: [RouterLink, AuthAmbientBgComponent, HeaderComponent],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** false = question alone in the center; true = cards revealed */
  protected readonly ready = signal(false);

  constructor() {
    afterNextRender(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) {
        this.ready.set(true);
        return;
      }

      timer(2000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.ready.set(true));
    });
  }

  protected selectMode(mode: UserMode): void {
    sessionStorage.setItem(SIGNUP_MODE_KEY, mode);
    this.router.navigate(['/auth/sign-up'], { queryParams: { mode } });
  }
}
