import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import type { UserMode } from './auth.models';

function modeGuard(expectedMode: UserMode): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const mode = auth.session()?.activeProfileMode;

    if (mode === expectedMode) return true;
    if (mode === 'Client') return router.createUrlTree(['/client/home']);
    if (mode === 'Developer') return router.createUrlTree(['/developer/home']);
    return router.createUrlTree(['/auth/login']);
  };
}

export const clientModeGuard = modeGuard('Client');
export const developerModeGuard = modeGuard('Developer');
