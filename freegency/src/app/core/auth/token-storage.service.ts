import { Injectable } from '@angular/core';
import type { StoredSession } from './auth.models';

const SESSION_KEY = 'freegency.auth.session';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  save(session: StoredSession, persist: boolean): void {
    this.clear();
    const storage = persist ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  /** Update tokens in whichever storage currently holds the session. */
  update(session: StoredSession): void {
    if (localStorage.getItem(SESSION_KEY) !== null) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return;
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  get(): StoredSession | null {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as StoredSession;
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
