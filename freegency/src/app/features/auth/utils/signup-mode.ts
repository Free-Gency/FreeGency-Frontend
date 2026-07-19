import type { UserMode } from '../../../core/auth/auth.models';

export const SIGNUP_MODE_KEY = 'freegency_signup_mode';

export function isUserMode(value: string | null): value is UserMode {
  return value === 'Client' || value === 'Developer';
}

export function readSignupMode(fromQuery: string | null): UserMode | null {
  if (isUserMode(fromQuery)) {
    return fromQuery;
  }

  const fromStorage = sessionStorage.getItem(SIGNUP_MODE_KEY);
  return isUserMode(fromStorage) ? fromStorage : null;
}

export function storeSignupMode(mode: UserMode): void {
  sessionStorage.setItem(SIGNUP_MODE_KEY, mode);
}
