import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { extractApiError } from '../../../../core/http/api-error';
import { AuthApiService } from '../../data-access/auth-api.service';
import { AuthAmbientBgComponent } from '../../components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../core/theme/header/header.component';
import { grantAuthFlow } from '../../utils/auth-flow';

@Component({
  selector: 'app-confirm-email',
  imports: [RouterLink, AuthAmbientBgComponent, HeaderComponent],
  templateUrl: './confirm-email.component.html',
})
export class ConfirmEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);

  protected readonly status = signal<'loading' | 'success' | 'error'>('loading');
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const userId = this.route.snapshot.queryParamMap.get('userId');
    const code = this.route.snapshot.queryParamMap.get('code');

    if (!userId || !code) {
      this.status.set('error');
      this.errorMessage.set('Invalid confirmation link.');
      return;
    }

    this.authApi.confirmEmail(userId, code).subscribe({
      next: () => {
        this.status.set('success');
        grantAuthFlow('registration-success');
        this.router.navigate(['/auth/registration-success']);
      },
      error: (err) => {
        this.status.set('error');
        this.errorMessage.set(extractApiError(err, 'Email confirmation failed.'));
      },
    });
  }
}
