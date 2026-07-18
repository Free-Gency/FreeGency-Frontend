import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import allCountries from 'intl-tel-input/data';
import { AuthService } from '../../../../core/auth/auth.service';
import type { UserMode } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import { HeaderComponent } from '../../../../shared/header/header.component';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input.component';

const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });
const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&*!])[A-Za-z\d@#$%^&*!]{8,}$/;

@Component({
  selector: 'app-sign-up',
  imports: [FormsModule, RouterLink, HeaderComponent, PhoneInputComponent],
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent {
  private readonly router = inject(Router);
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

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected selectMode(mode: UserMode): void {
    this.mode = mode;
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
