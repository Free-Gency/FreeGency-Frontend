import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { HeaderComponent } from '../../../../shared/header/header.component';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, HeaderComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

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

  protected onSubmit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Email and password are required.');
      return;
    }

    this.loading.set(true);

    this.auth.login({ email: this.email.trim(), password: this.password }, this.keepLoggedIn).subscribe({
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
