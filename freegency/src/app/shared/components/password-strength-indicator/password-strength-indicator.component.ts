import { Component, input, computed } from '@angular/core';
import { PasswordValidators } from '../../utils/password-validator';

@Component({
  selector: 'app-password-strength-indicator',
  standalone: true,
  templateUrl: './password-strength-indicator.component.html',
  styleUrls: ['./password-strength-indicator.component.css']
})
export class PasswordStrengthIndicatorComponent {
  readonly password = input<string>('');
  readonly showLabel = input<boolean>(true);
  
  readonly strength = computed<'weak' | 'medium' | 'strong'>(() => 
    PasswordValidators.getPasswordStrength(this.password())
  );
  
  readonly strengthLabel = computed<string>(() => {
    const map = {
      weak: 'Weak',
      medium: 'Medium',
      strong: 'Strong'
    };
    return map[this.strength()];
  });
  
  readonly strengthColor = computed<string>(() => {
    const map = {
      weak: 'var(--color-error, #ef4444)',
      medium: 'var(--color-warning, #f59e0b)',
      strong: 'var(--color-success, #22c55e)'
    };
    return map[this.strength()];
  });
  
  readonly segments = computed(() => {
    const activeSegments = this.strength() === 'weak' ? 1 : this.strength() === 'medium' ? 2 : 3;
    return [1, 2, 3].map(segment => ({
      active: segment <= activeSegments,
      color: this.getSegmentColor(segment, activeSegments)
    }));
  });
  
  readonly requirements = computed(() => {
    const pwd = this.password();
    return [
      { met: pwd.length >= 8, text: 'At least 8 characters' },
      { met: /[A-Z]/.test(pwd), text: 'One uppercase letter' },
      { met: /[a-z]/.test(pwd), text: 'One lowercase letter' },
      { met: /\d/.test(pwd), text: 'One number' },
      { met: /[!@#$%^&*(),.?":{}|<>]/.test(pwd), text: 'One special character' }
    ];
  });
  
  private getSegmentColor(segment: number, active: number): string {
    if (segment > active) return 'var(--color-border-light, #e2e8f0)';
    
    const colors = {
      1: 'var(--color-error, #ef4444)',
      2: 'var(--color-warning, #f59e0b)',
      3: 'var(--color-success, #22c55e)'
    };
    
    return colors[active as keyof typeof colors] || colors[3];
  }
}