import { HttpBackend, HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthResponse, StoredSession, UserMode } from './auth.models';
import { CLIENT_HOME_PATH, CLIENT_ONBOARDING_PATH, DEVELOPER_DASHBOARD_PATH, DEVELOPER_ONBOARDING_PATH, DEVELOPER_SETUP_PENDING_KEY } from './auth.models';
import { TokenStorageService } from './token-storage.service';

const GOOGLE_AUTH_INTENT_KEY = 'freegency_google_intent';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokens = inject(TokenStorageService);
  private readonly baseUrl = `${environment.apiBaseUrl}/Auth`;
  private readonly externalBaseUrl = `${environment.apiBaseUrl}/External`;

  /** Bypasses interceptors so refresh never loops on itself. */
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

  private refreshRequest$: Observable<string> | null = null;

  readonly session = signal<StoredSession | null>(this.tokens.get());
  readonly isLoggedIn = computed(() => !!this.session());
  readonly profileImage = signal<string | null>(null);

  loginWithGoogle(intent: 'login' | 'signup', mode?: UserMode): void {
    sessionStorage.setItem(GOOGLE_AUTH_INTENT_KEY, intent);
    const params = new URLSearchParams({ intent });
    if (mode) params.set('mode', mode);
    window.location.assign(`${this.externalBaseUrl}/google-login?${params}`);
  }

  consumeGoogleAuthIntent(): 'login' | 'signup' | null {
    const value = sessionStorage.getItem(GOOGLE_AUTH_INTENT_KEY);
    sessionStorage.removeItem(GOOGLE_AUTH_INTENT_KEY);
    return value === 'login' || value === 'signup' ? value : null;
  }

  completeLogin(response: AuthResponse, keepLoggedIn = true): void {
    const session = this.toSession(response);
    this.tokens.save(session, keepLoggedIn);
    this.session.set(session);
  }

  markOnboardingComplete(): void {
    const current = this.session();
    if (!current || current.hasCompletedOnboarding) return;
    const updated = { ...current, hasCompletedOnboarding: true };
    this.tokens.update(updated);
    this.session.set(updated);
  }

  /** Keep session name in sync after profile load/save. */
  patchSessionNames(firstName: string | null, lastName: string | null): void {
    const current = this.session();
    if (!current) return;
    const updated = {
      ...current,
      firstName: firstName?.trim() || current.firstName,
      lastName: lastName?.trim() || current.lastName,
    };
    this.tokens.update(updated);
    this.session.set(updated);
  }

  /** After mode switch — update active mode + profile id in the stored session. */
  patchActiveMode(mode: UserMode, profileId?: string | null): void {
    const current = this.session();
    if (!current) return;
    const updated = {
      ...current,
      activeProfileMode: mode,
      profileId: profileId ?? current.profileId,
      // New client profiles still need onboarding interests.
      hasCompletedOnboarding:
        mode === 'Client' ? current.hasCompletedOnboarding : current.hasCompletedOnboarding,
    };
    this.tokens.update(updated);
    this.session.set(updated);
  }

  setProfileImage(profileImage: string | null): void {
    this.profileImage.set(profileImage);
  }

  needsClientOnboarding(
    auth: Pick<
      AuthResponse,
      'activeProfileMode' | 'hasCompletedOnboarding'
    > | null = this.session(),
  ): boolean {
    if (!auth) return false;
    return auth.activeProfileMode === 'Client' && !auth.hasCompletedOnboarding;
  }

  /** Single post-auth destination used by login + Google callback. */
  resolvePostAuthPath(
    auth: Pick<AuthResponse, 'activeProfileMode' | 'hasCompletedOnboarding'>,
    returnUrl?: string | null,
  ): string {
    if (this.needsClientOnboarding(auth)) return CLIENT_ONBOARDING_PATH;
    if (this.needsDeveloperOnboarding(auth)) return DEVELOPER_ONBOARDING_PATH;
    if (returnUrl?.startsWith('/')) return returnUrl;
    if (auth.activeProfileMode === 'Client') return CLIENT_HOME_PATH;
    if (auth.activeProfileMode === 'Developer') return DEVELOPER_DASHBOARD_PATH;
    return '/';
  }

  needsDeveloperOnboarding(
    auth: Pick<AuthResponse, 'activeProfileMode' | 'hasCompletedOnboarding'> | null = this.session(),
  ): boolean {
    if (!auth) return false;
    if (auth.activeProfileMode !== 'Developer') return false;
    if (!auth.hasCompletedOnboarding) return true;
    try {
      return sessionStorage.getItem(DEVELOPER_SETUP_PENDING_KEY) === '1';
    } catch {
      return false;
    }
  }

  refreshAccessToken(): Observable<string> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const current = this.tokens.get();
    if (!current?.token || !current.refreshToken) {
      this.clearSession();
      return throwError(() => new Error('No refresh token'));
    }

    this.refreshRequest$ = this.rawHttp
      .post<AuthResponse>(`${this.baseUrl}/refresh`, {
        token: current.token,
        refreshToken: current.refreshToken,
      })
      .pipe(
        map((response) => {
          const session = this.toSession(response);
          this.tokens.update(session);
          this.session.set(session);
          return response.token;
        }),
        catchError((err) => {
          this.clearSession();
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
      );

    return this.refreshRequest$;
  }

  logout(): void {
    const current = this.tokens.get();
    this.clearSession();

    if (!current) return;

    this.rawHttp
      .put(this.baseUrl, {
        token: current.token,
        refreshToken: current.refreshToken,
      })
      .subscribe({ error: () => undefined });
  }

  clearSession(): void {
    this.tokens.clear();
    this.session.set(null);
    this.profileImage.set(null);
  }

  private toSession(response: AuthResponse): StoredSession {
    const mode = response.activeProfileMode;
    return {
      id: response.id,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      activeProfileMode: mode === 'Client' || mode === 'Developer' ? mode : null,
      hasCompletedOnboarding: !!response.hasCompletedOnboarding,
      token: response.token,
      refreshToken: response.refreshToken,
      refreshTokenExpiration: response.refreshTokenExpiration,
      profileId: response.profileId
    };
  }
}
