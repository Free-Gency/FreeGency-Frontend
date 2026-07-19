import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { extractApiError } from '../../../../core/http/api-error';
import { AuthApiService } from '../../data-access/auth-api.service';
import { AuthAmbientBgComponent } from '../../components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../core/theme/header/header.component';
import { grantAuthFlow } from '../../utils/auth-flow';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink, AuthAmbientBgComponent, HeaderComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);

  protected email = '';
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected onSubmit(): void {
    this.errorMessage.set(null);

    if (!this.email.trim()) {
      this.errorMessage.set('Email is required.');
      return;
    }

    this.loading.set(true);

    this.authApi.sendResetPassword(this.email.trim()).subscribe({
      next: () => {
        this.loading.set(false);
        const email = this.email.trim();
        grantAuthFlow('verify-code', email);
        this.router.navigate(['/auth/verify-code'], {
          queryParams: { email },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiError(err));
      },
    });
  }
}
