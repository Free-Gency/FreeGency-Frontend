import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { grantAuthFlow } from '../../../../core/auth/auth-flow';
import { isPasswordValid } from '../../../../core/auth/password-rules';
import { extractApiError } from '../../../../core/http/api-error';
import { AuthAmbientBgComponent } from '../../../../shared/components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../shared/header/header.component';
import { PasswordRulesComponent } from '../../../../shared/components/password-rules/password-rules.component';

@Component({
  selector: 'app-create-new-password',
  imports: [FormsModule, RouterLink, AuthAmbientBgComponent, HeaderComponent, PasswordRulesComponent],
  templateUrl: './create-new-password.component.html',
})
export class CreateNewPasswordComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  private readonly email = this.route.snapshot.queryParamMap.get('email') ?? '';

  protected password = '';
  protected confirmPassword = '';
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected canSubmit(): boolean {
    return !!this.email && isPasswordValid(this.password) && this.password === this.confirmPassword;
  }

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected toggleConfirmPassword(): void {
    this.showConfirmPassword.update((visible) => !visible);
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);

    if (!this.canSubmit() || this.loading()) return;

    this.loading.set(true);

    this.auth
      .resetPassword({
        email: this.email,
        password: this.password,
        confirmPassword: this.confirmPassword,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          grantAuthFlow('reset-confirmed');
          this.router.navigate(['/auth/reset-confirmed']);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(extractApiError(err));
        },
      });
  }
}
