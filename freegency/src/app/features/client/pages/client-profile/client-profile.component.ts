import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { DeveloperViewNavbarComponent } from '../../../../shared/components/developer-view-navbar/developer-view-navbar.component';
import { ClientPortfolioService } from '../../data-access/client-portfolio.service';
import { ClientAccount } from '../../../../shared/models/client-account.model';

@Component({
  selector: 'app-client-portfolio',
  standalone: true,
  imports: [DeveloperViewNavbarComponent],
  templateUrl: './client-profile.component.html',
  styleUrl: './client-profile.component.css',
})

export class ClientPortfolioComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ClientPortfolioService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly profile = signal<ClientAccount | null>(null);

  protected readonly fullName = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return `${p.firstName} ${p.lastName}`.trim();
  });

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('clientId');
    if (!clientId) {
      this.error.set('Client profile not found.');
      this.loading.set(false);
      return;
    }
    this.load(clientId);
  }

  private load(clientId: string): void {
    this.api
      .getPublicClientProfile(clientId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.error.set('Could not load this client profile.');
          this.loading.set(false);
          return of(null);
        }),
      )
      .subscribe((res) => {
        if (!res) return;
        this.profile.set(res);
        this.loading.set(false);
      });
  }
}
