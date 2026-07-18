import { Component, computed, input } from '@angular/core';
import { getPasswordRules } from '../../../core/auth/password-rules';

@Component({
  selector: 'app-password-rules',
  templateUrl: './password-rules.component.html',
})
export class PasswordRulesComponent {
  readonly password = input('');

  protected readonly rules = computed(() => getPasswordRules(this.password()));
  protected readonly metCount = computed(() => this.rules().filter((rule) => rule.met).length);
  protected readonly segments = computed(() => this.rules().map((_, index) => index));
}
