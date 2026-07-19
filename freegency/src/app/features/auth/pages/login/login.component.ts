import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { tap } from 'rxjs';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { AuthApiService } from '../../data-access/auth-api.service';
import { AuthAmbientBgComponent } from '../../components/auth-ambient-bg/auth-ambient-bg.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AuthAmbientBgComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);

  protected email = '';
  protected password = '';
  protected keepLoggedIn = false;
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  protected loginWithGoogle(): void {
    this.auth.loginWithGoogle('login');
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Email and password are required.');
      return;
    }

    this.loading.set(true);

    this.authApi
      .login({ email: this.email.trim(), password: this.password })
      .pipe(tap((response) => this.auth.completeLogin(response, this.keepLoggedIn)))
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          const name = response.firstName?.trim() || response.email;
          this.successMessage.set(`Welcome back, ${name}! You're signed in.`);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(extractApiError(err));
        },
      });
  }
}
