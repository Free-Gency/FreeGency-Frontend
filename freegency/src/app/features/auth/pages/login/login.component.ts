import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { AuthApiService } from '../../data-access/auth-api.service';
import { AuthAmbientBgComponent } from '../../components/auth-ambient-bg/auth-ambient-bg.component';
import { SignalrService } from '../../../../core/Signalr/signalr-service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, AuthAmbientBgComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  signalrService=inject(SignalrService);
  protected email = '';
  protected password = '';
  protected keepLoggedIn = false;
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  private returnUrl: string | null = null;

  ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    this.returnUrl = raw?.startsWith('/') ? raw : null;
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected loginWithGoogle(): void {
    this.auth.loginWithGoogle('login');
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);

    if (!this.email.trim() || !this.password) {
      this.errorMessage.set('Email and password are required.');
      return;
    }

    this.loading.set(true);

    this.authApi.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: (response) => {
        this.auth.completeLogin(response, this.keepLoggedIn);
        this.loading.set(false);
        this.signalrService.CreateHubConnection();
        void this.router.navigateByUrl(this.auth.resolvePostAuthPath(response, this.returnUrl));
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiError(err));
      },
    });
  }
}
