import { HttpBackend, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  StoredSession,
} from './auth.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokens = inject(TokenStorageService);
  private readonly baseUrl = `${environment.apiBaseUrl}/Auth`;

  /** Bypasses interceptors so refresh never loops on itself. */
  private readonly rawHttp = new HttpClient(inject(HttpBackend));

  private refreshRequest$: Observable<string> | null = null;

  readonly session = signal<StoredSession | null>(this.tokens.get());

  login(request: LoginRequest, keepLoggedIn: boolean): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(this.baseUrl, request)
      .pipe(tap((response) => this.persistSession(response, keepLoggedIn)));
  }

  register(request: RegisterRequest): Observable<void> {
    return this.http
      .post(`${this.baseUrl}/register`, request, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  confirmEmail(userId: string, code: string): Observable<string> {
    const params = new HttpParams().set('userId', userId).set('code', code);
    return this.http.get(`${this.baseUrl}/ConfirmEmail`, {
      params,
      responseType: 'text',
    });
  }

  sendResetPassword(email: string): Observable<string> {
    const params = new HttpParams().set('email', email);
    return this.http.post(`${this.baseUrl}/SendResetPassword`, null, {
      params,
      responseType: 'text',
    });
  }

  confirmResetCode(email: string, code: string): Observable<void> {
    const params = new HttpParams().set('email', email).set('code', code);
    return this.http
      .get(`${this.baseUrl}/ComfirmResetPassword`, {
        params,
        responseType: 'text',
      })
      .pipe(map(() => undefined));
  }

  resetPassword(request: ResetPasswordRequest): Observable<string> {
    return this.http.post(`${this.baseUrl}/ResetPassword`, request, {
      responseType: 'text',
    });
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
