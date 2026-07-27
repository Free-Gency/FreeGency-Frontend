import { Component, input, computed } from '@angular/core';
import { VerificationStatus } from '../../utils/identity-verification.interface';

@Component({
  selector: 'app-verification-status-badge',
  standalone: true,
  templateUrl: './verification-status-badge.component.html',
  styleUrls: ['./verification-status-badge.component.css']
})
export class VerificationStatusBadgeComponent {
  readonly status = input<VerificationStatus>('not_started');
  readonly showIcon = input<boolean>(true);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  
  readonly statusConfig = computed(() => {
    const configs: Record<VerificationStatus, {
      label: string;
      color: string;
      bgColor: string;
      borderColor: string;
      icon: string;
      animation: boolean;
    }> = {
      not_started: {
        label: 'Not submitted',
        color: 'var(--color-text-tertiary, #94a3b8)',
        bgColor: 'var(--color-bg-subtle, #f8fafc)',
        borderColor: 'var(--color-border-light, #e2e8f0)',
        icon: 'circle',
        animation: false
      },
      in_progress: {
        label: 'In Progress',
        color: 'var(--color-primary, #3b82f6)',
        bgColor: 'var(--color-primary-bg, #eff6ff)',
        borderColor: 'var(--color-primary-light, #93c5fd)',
        icon: 'clock',
        animation: true
      },
      under_review: {
        label: 'Under Review',
        color: 'var(--color-warning, #f59e0b)',
        bgColor: 'var(--color-warning-bg, #fffbeb)',
        borderColor: 'var(--color-warning-border, #fde68a)',
        icon: 'search',
        animation: true
      },
      verified: {
        label: 'Verified',
        color: 'var(--color-success, #22c55e)',
        bgColor: 'var(--color-success-bg, #f0fdf4)',
        borderColor: 'var(--color-success-light, #86efac)',
        icon: 'check',
        animation: false
      },
      rejected: {
        label: 'Rejected',
        color: 'var(--color-error, #ef4444)',
        bgColor: 'var(--color-error-bg, #fef2f2)',
        borderColor: 'var(--color-error-border, #fecaca)',
        icon: 'x',
        animation: false
      },
      expired: {
        label: 'Expired',
        color: 'var(--color-error, #ef4444)',
        bgColor: 'var(--color-error-bg, #fef2f2)',
        borderColor: 'var(--color-error-border, #fecaca)',
        icon: 'warning',
        animation: false
      }
    };
    
    return configs[this.status()];
  });
}