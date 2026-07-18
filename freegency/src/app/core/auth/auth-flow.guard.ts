import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { type AuthFlowStep, hasAuthFlowAccess } from './auth-flow';

/**
 * Blocks direct URL access to intermediate auth screens.
 * Access is allowed only after grantAuthFlow() from a previous step.
 */
export function authFlowGuard(step: AuthFlowStep, options?: { requireEmail?: boolean }): CanActivateFn {
  return (route) => {
    const router = inject(Router);
    const email = options?.requireEmail ? route.queryParamMap.get('email') : null;

    if (options?.requireEmail && !email) {
      return router.createUrlTree(['/auth/login']);
    }

    if (!hasAuthFlowAccess(step, options?.requireEmail ? email : undefined)) {
      return router.createUrlTree(['/auth/login']);
    }

    return true;
  };
}
