import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { extractApiError } from '../../../../core/http/api-error';
import { HeaderComponent } from '../../../../shared/header/header.component';

@Component({
  selector: 'app-confirm-email',
  imports: [RouterLink, HeaderComponent],
  templateUrl: './confirm-email.component.html',
})
export class ConfirmEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

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

    this.auth.confirmEmail(userId, code).subscribe({
      next: () => {
        this.status.set('success');
        this.router.navigate(['/auth/registration-success']);
      },
      error: (err) => {
        this.status.set('error');
        this.errorMessage.set(extractApiError(err, 'Email confirmation failed.'));
      },
    });
  }
}
