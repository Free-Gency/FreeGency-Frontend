import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { interval, take } from 'rxjs';
import { AuthAmbientBgComponent } from '../../components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../core/theme/header/header.component';

@Component({
  selector: 'app-registration-success',
  imports: [AuthAmbientBgComponent, HeaderComponent],
  templateUrl: './registration-success.component.html',
})
export class RegistrationSuccessComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly countdown = signal(5);

  ngOnInit(): void {
    interval(1000)
      .pipe(take(5), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const next = this.countdown() - 1;
        this.countdown.set(next);
        if (next <= 0) {
          this.router.navigate(['/auth/login']);
        }
      });
  }

  protected continueNow(): void {
    this.router.navigate(['/auth/login']);
  }
}
