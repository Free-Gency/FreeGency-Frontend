import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import type { AuthResponse } from '../../../../core/auth/auth.models';
import { AuthAmbientBgComponent } from '../../components/auth-ambient-bg/auth-ambient-bg.component';

@Component({
  selector: 'app-google-callback',
  imports: [RouterLink, AuthAmbientBgComponent],
  templateUrl: './google-callback.component.html',
})
export class GoogleCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly status = signal<'loading' | 'success' | 'error'>('loading');
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const error = this.route.snapshot.queryParamMap.get('error');
    if (error) {
      this.status.set('error');
      this.errorMessage.set(error);
      return;
    }

    const session = this.route.snapshot.queryParamMap.get('session');
    if (!session) {
      this.status.set('error');
      this.errorMessage.set('Missing Google sign-in data. Please try again.');
      return;
    }

    try {
      const json = this.decodeBase64Url(session);
      const response = JSON.parse(json) as AuthResponse;

      if (!response.token || !response.refreshToken || !response.email) {
        throw new Error('Invalid session payload');
      }

      this.auth.completeGoogleLogin(response);
      this.status.set('success');
      this.router.navigate(['/']);
    } catch {
      this.status.set('error');
      this.errorMessage.set('Could not complete Google sign-in. Please try again.');
    }
  }

  private decodeBase64Url(value: string): string {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return decodeURIComponent(
      Array.from(atob(padded), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    );
  }
}
