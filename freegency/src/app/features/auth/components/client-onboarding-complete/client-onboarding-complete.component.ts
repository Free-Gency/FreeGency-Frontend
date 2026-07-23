import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProfileApiService } from '../../data-access/profile-api.service';

@Component({
  selector: 'app-client-onboarding-complete',
  templateUrl: './client-onboarding-complete.component.html',
  styleUrl: './client-onboarding-complete.component.css',
})
export class ClientOnboardingCompleteComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly profileApi = inject(ProfileApiService);

  private readonly firstName = signal(this.auth.session()?.firstName?.trim() || null);

  protected readonly greetingName = computed(() => this.firstName() || 'there');

  ngOnInit(): void {
    this.profileApi
      .getClientProfile()
      .pipe(catchError(() => of(null)))
      .subscribe((profile) => {
        const name = profile?.firstName?.trim();
        if (name) this.firstName.set(name);
      });
  }

  protected goToDashboard(): void {
    void this.router.navigateByUrl('/');
  }
}
