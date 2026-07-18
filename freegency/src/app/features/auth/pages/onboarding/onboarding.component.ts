import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { UserMode } from '../../../../core/auth/auth.models';
import { storeSignupMode } from '../../../../core/auth/signup-mode';
import { AuthAmbientBgComponent } from '../../../../shared/components/auth-ambient-bg/auth-ambient-bg.component';

@Component({
  selector: 'app-onboarding',
  imports: [RouterLink, AuthAmbientBgComponent],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent {
  private readonly router = inject(Router);

  protected selectMode(mode: UserMode): void {
    storeSignupMode(mode);
    this.router.navigate(['/auth/sign-up'], { queryParams: { mode } });
  }
}
