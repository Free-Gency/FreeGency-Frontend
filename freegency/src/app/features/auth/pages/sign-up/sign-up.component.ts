import { Component, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import allCountries from 'intl-tel-input/data';
import type { UserMode } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthApiService } from '../../data-access/auth-api.service';
import { AuthAmbientBgComponent } from '../../components/auth-ambient-bg/auth-ambient-bg.component';
import { PhoneInputComponent } from '../../../../shared/components/phone-input/phone-input.component';
import { grantAuthFlow } from '../../utils/auth-flow';
import { isPasswordValid, PASSWORD_RULE_MESSAGE } from '../../utils/password-rules';
import { readSignupMode, storeSignupMode } from '../../utils/signup-mode';

const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' });

@Component({
  selector: 'app-sign-up',
  imports: [FormsModule, RouterLink, AuthAmbientBgComponent, PhoneInputComponent],
  templateUrl: './sign-up.component.html',
})
export class SignUpComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApiService);
  private readonly phoneInput = viewChild(PhoneInputComponent);

  protected firstName = '';
  protected lastName = '';
  protected email = '';
  protected phone = '';
  protected password = '';
  protected country = 'EG';
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
    const mode = readSignupMode(this.route.snapshot.queryParamMap.get('mode'));

    if (!mode) {
      this.router.navigate(['/auth/onboarding']);
      return;
    }

    this.mode = mode;
    storeSignupMode(mode);
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected loginWithGoogle(): void {
    this.auth.loginWithGoogle('signup', this.mode);
  }

  protected onPhoneValidityChange(valid: boolean): void {
    this.phoneValid = valid;
  }

  protected onPhoneCountryChange(iso2: string): void {
    if (iso2 && !this.country) {
      this.country = iso2;
    }
  }

  protected onSubmit(): void {
    this.errorMessage.set(null);

    if (!this.agreedToTerms || this.loading()) return;

    if (this.firstName.trim().length < 3 || this.lastName.trim().length < 3) {
      this.errorMessage.set('First and last name must be at least 3 characters.');
      return;
    }

    const phoneState = this.phoneInput()?.syncFromWidget();
    const phone = (phoneState?.number ?? this.phone).trim();
    const phoneValid = phoneState?.valid ?? this.phoneValid;

    if (phoneState?.countryIso && !this.country) {
      this.country = phoneState.countryIso;
    }

    if (!this.email.trim()) {
      this.errorMessage.set('Please enter your email address.');
      return;
    }

    if (!this.country) {
      this.errorMessage.set('Please select your country.');
      return;
    }

    if (!phone) {
      this.errorMessage.set('Please enter your phone number.');
      return;
    }

    if (!phoneValid) {
      this.errorMessage.set('Please enter a valid phone number.');
      return;
    }

    if (!isPasswordValid(this.password)) {
      this.errorMessage.set(PASSWORD_RULE_MESSAGE);
      return;
    }

    this.phone = phone;
    this.phoneValid = phoneValid;
    this.loading.set(true);

    this.authApi
      .register({
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        email: this.email.trim(),
        password: this.password,
        country: this.country,
        phoneNumber: phone,
        mode: this.mode,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          const email = this.email.trim();
          grantAuthFlow('check-email', email);
          this.router.navigate(['/auth/check-email'], {
            queryParams: { email },
          });
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(extractApiError(err));
        },
      });
  }
}
