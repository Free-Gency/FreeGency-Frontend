import { Injectable } from '@angular/core';
import type { StoredSession, UserMode } from './auth.models';

const SESSION_KEY = 'freegency.auth.session';

function asUserMode(value: unknown): UserMode | null {
  return value === 'Client' || value === 'Developer' ? value : null;
}

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  save(session: StoredSession, persist: boolean): void {
    this.clear();
    (persist ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  }

  /** Update session in whichever storage currently holds it. */
  update(session: StoredSession): void {
    const storage = localStorage.getItem(SESSION_KEY) !== null ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  get(): StoredSession | null {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (!parsed.token || !parsed.refreshToken || !parsed.email || !parsed.id) {
        this.clear();
        return null;
      }

      return {
        id: parsed.id,
        email: parsed.email,
        firstName: parsed.firstName ?? null,
        lastName: parsed.lastName ?? null,
        activeProfileMode: asUserMode(parsed.activeProfileMode),
        hasCompletedOnboarding: !!parsed.hasCompletedOnboarding,
        token: parsed.token,
        refreshToken: parsed.refreshToken,
        refreshTokenExpiration: parsed.refreshTokenExpiration ?? '',
      };
    } catch {
      this.clear();
      return null;
    }
  }

  getAccessToken(): string | null {
    return this.get()?.token ?? null;
  }

  getRefreshToken(): string | null {
    return this.get()?.refreshToken ?? null;
  }

  clear(): void {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }
}
