import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import allCountries from 'intl-tel-input/data';
import { AuthService } from '../../../../core/auth/auth.service';
import type { UserMode } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import { AuthAmbientBgComponent } from '../../../../shared/components/auth-ambient-bg/auth-ambient-bg.component';
import { HeaderComponent } from '../../../../shared/header/header.component';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input.component';
import { SIGNUP_MODE_KEY } from '../onboarding/onboarding.component';

const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });
const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&*!])[A-Za-z\d@#$%^&*!]{8,}$/;

function isUserMode(value: string | null): value is UserMode {
  return value === 'Client' || value === 'Developer';
}

@Component({
  selector: 'app-sign-up',
  imports: [FormsModule, RouterLink, AuthAmbientBgComponent, HeaderComponent, PhoneInputComponent],
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  protected firstName = '';
  protected lastName = '';
  protected email = '';
  protected phone = '';
  protected password = '';
  protected country = '';
  protected mode: UserMode = 'Client';
  protected agreedToTerms = false;
  protected phoneValid = false;
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly countries = allCountries
    .map((c) => {
      const code = c.iso2.toUpperCase();
      return {
        code,
        name: countryDisplayNames.of(code) ?? code,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  ngOnInit(): void {
    const fromQuery = this.route.snapshot.queryParamMap.get('mode');
    const fromStorage = sessionStorage.getItem(SIGNUP_MODE_KEY);
    const mode = isUserMode(fromQuery) ? fromQuery : isUserMode(fromStorage) ? fromStorage : null;

    if (!mode) {
      this.router.navigate(['/auth/onboarding']);
      return;
    }

    this.mode = mode;
    sessionStorage.setItem(SIGNUP_MODE_KEY, mode);
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected onPhoneValidityChange(valid: boolean): void {
    this.phoneValid = valid;
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);

    if (!this.agreedToTerms || this.loading()) return;

    if (this.firstName.trim().length < 3 || this.lastName.trim().length < 3) {
      this.errorMessage.set('First and last name must be at least 3 characters.');
      return;
    }

    if (!this.email.trim() || !this.country || !this.phone.trim()) {
      this.errorMessage.set('Please fill in all required fields.');
      return;
    }

    if (!this.phoneValid) {
      this.errorMessage.set('Please enter a valid phone number.');
      return;
    }

    if (!passwordPattern.test(this.password)) {
      this.errorMessage.set(
        'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@#$%^&*!).',
      );
      return;
    }

    this.loading.set(true);

    this.auth
      .register({
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        email: this.email.trim(),
        password: this.password,
        country: this.country,
        phoneNumber: this.phone.trim(),
        mode: this.mode,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/auth/check-email'], {
            queryParams: { email: this.email.trim() },
          });
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(extractApiError(err));
        },
      });
  }
}
