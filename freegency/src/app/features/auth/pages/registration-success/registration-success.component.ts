import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthAmbientBgComponent } from '../../../../shared/components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../shared/header/header.component';

@Component({
  selector: 'app-registration-success',
  imports: [AuthAmbientBgComponent, HeaderComponent],
  templateUrl: './registration-success.component.html',
})
export class RegistrationSuccessComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  protected readonly countdown = signal(5);
  private timerId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.timerId = setInterval(() => {
      const next = this.countdown() - 1;
      if (next <= 0) {
        this.clearTimer();
        this.router.navigate(['/auth/login']);
        return;
      }
      this.countdown.set(next);
    }, 1000);
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  protected continueNow(): void {
    this.clearTimer();
    this.router.navigate(['/auth/login']);
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
