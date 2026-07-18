import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { grantAuthFlow } from '../../../../core/auth/auth-flow';
import { extractApiError } from '../../../../core/http/api-error';
import { AuthAmbientBgComponent } from '../../../../shared/components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../shared/header/header.component';
import { OtpInputComponent } from '../../../../shared/components/otp-input/otp-input.component';

@Component({
  selector: 'app-verify-code',
  imports: [RouterLink, AuthAmbientBgComponent, HeaderComponent, OtpInputComponent],
  templateUrl: './verify-code.component.html',
})
export class VerifyCodeComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';
  protected code = '';
  protected readonly loading = signal(false);
  protected readonly resending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly infoMessage = signal<string | null>(null);

  protected onVerify(): void {
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    if (!this.email || this.code.length < 6 || this.loading()) return;

    this.loading.set(true);

    this.auth.confirmResetCode(this.email, this.code).subscribe({
      next: () => {
        this.loading.set(false);
        grantAuthFlow('create-new-password', this.email);
        this.router.navigate(['/auth/create-new-password'], {
          queryParams: { email: this.email },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiError(err, 'Invalid reset code.'));
      },
    });
  }

  protected onResend(): void {
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    if (!this.email || this.resending()) return;

    this.resending.set(true);

    this.auth.sendResetPassword(this.email).subscribe({
      next: () => {
        this.resending.set(false);
        this.infoMessage.set('A new code has been sent to your email.');
      },
      error: (err) => {
        this.resending.set(false);
        this.errorMessage.set(extractApiError(err));
      },
    });
  }
}
