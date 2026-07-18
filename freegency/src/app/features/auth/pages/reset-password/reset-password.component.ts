import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { HeaderComponent } from '../../../../shared/header/header.component';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink, HeaderComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

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

    this.auth.sendResetPassword(this.email.trim()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/auth/verify-code'], {
          queryParams: { email: this.email.trim() },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiError(err));
      },
    });
  }
}
