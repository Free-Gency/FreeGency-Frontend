import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  DEVELOPER_DASHBOARD_PATH,
  DEVELOPER_SETUP_PENDING_KEY,
} from '../../../../core/auth/auth.models';
import { ProfileApiService } from '../../data-access/profile-api.service';
import { ProfileModeService } from '../../../../shared/services/profile-mode.service';

@Component({
  selector: 'app-developer-onboarding-complete',
  templateUrl: './developer-onboarding-complete.component.html',
  styleUrl: './developer-onboarding-complete.component.css',
})
export class DeveloperOnboardingCompleteComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly profileApi = inject(ProfileApiService);
  private readonly profileMode = inject(ProfileModeService);

  private readonly firstName = signal(this.auth.session()?.firstName?.trim() || null);
  protected readonly finishing = signal(false);

  protected readonly greetingName = computed(() => this.firstName() || 'there');

  ngOnInit(): void {
    this.profileApi
      .getDeveloperProfile()
      .pipe(catchError(() => of(null)))
      .subscribe((profile) => {
        const name = profile?.firstName?.trim();
        if (name) this.firstName.set(name);
      });
  }

  protected goToDashboard(): void {
    if (this.finishing()) return;
    this.finishing.set(true);

    try {
      sessionStorage.removeItem(DEVELOPER_SETUP_PENDING_KEY);
    } catch {
      /* ignore */
    }

    if (this.auth.session()?.activeProfileMode === 'Developer') {
      void this.router.navigateByUrl(DEVELOPER_DASHBOARD_PATH);
      return;
    }

    this.profileMode.switchToMode('Developer', {
      confirmCreate: () => false,
      skipNavigate: true,
    }).subscribe({
      next: () => {
        void this.router.navigateByUrl(DEVELOPER_DASHBOARD_PATH);
      },
      error: () => {
        this.finishing.set(false);
        void this.router.navigateByUrl(DEVELOPER_DASHBOARD_PATH);
      },
    });
  }
}
