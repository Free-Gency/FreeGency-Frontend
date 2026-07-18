import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-password-rules',
  templateUrl: './password-rules.component.html',
})
export class PasswordRulesComponent {
  readonly password = input('');

  protected readonly rules = computed(() => {
    const value = this.password();
    return [
      { label: 'Be at least 8 characters long', met: value.length >= 8 },
      { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(value) },
      { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(value) },
      { label: 'At least one number (0-9)', met: /\d/.test(value) },
      { label: 'At least one special character (@#$%^&*!)', met: /[@#$%^&*!]/.test(value) },
    ];
  });

  protected readonly metCount = computed(() => this.rules().filter((rule) => rule.met).length);
  protected readonly segments = computed(() => this.rules().map((_, index) => index));
}
