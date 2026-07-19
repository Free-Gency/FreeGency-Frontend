import { HttpBackend, HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { AuthResponse, StoredSession, UserMode } from './auth.models';
import { TokenStorageService } from './token-storage.service';

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

  /** Full-page redirect to the API Google OAuth challenge endpoint. */
  loginWithGoogle(intent: 'login' | 'signup', mode?: UserMode): void {
    const params = new URLSearchParams({ intent });
    if (mode) params.set('mode', mode);
    window.location.assign(`${this.externalBaseUrl}/google-login?${params}`);
  }

  completeGoogleLogin(response: AuthResponse, keepLoggedIn = true): void {
    this.persistSession(response, keepLoggedIn);
  }

  completeLogin(response: AuthResponse, keepLoggedIn: boolean): void {
    this.persistSession(response, keepLoggedIn);
  }

  /** Exchange the stored refresh token for a new access token. Shared across concurrent 401s. */
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
          this.replaceSession(response);
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
  }

  private persistSession(response: AuthResponse, keepLoggedIn: boolean): void {
    const session = this.toSession(response);
    this.tokens.save(session, keepLoggedIn);
    this.session.set(session);
  }

  private replaceSession(response: AuthResponse): void {
    const session = this.toSession(response);
    this.tokens.update(session);
    this.session.set(session);
  }

  private toSession(response: AuthResponse): StoredSession {
    return {
      id: response.id,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      token: response.token,
      refreshToken: response.refreshToken,
      refreshTokenExpiration: response.refreshTokenExpiration,
    };
  }
}
