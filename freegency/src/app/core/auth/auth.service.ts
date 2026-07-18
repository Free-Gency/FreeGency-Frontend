import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
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

  readonly session = signal<StoredSession | null>(this.tokens.get());

  login(request: LoginRequest, keepLoggedIn: boolean): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.baseUrl, request).pipe(
      tap((response) => this.persistSession(response, keepLoggedIn)),
    );
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

  logout(): void {
    const current = this.tokens.get();
    if (current) {
      this.http
        .put(this.baseUrl, {
          token: current.token,
          refreshToken: current.refreshToken,
        })
        .subscribe({ error: () => undefined });
    }

    this.tokens.clear();
    this.session.set(null);
  }

  private persistSession(response: AuthResponse, keepLoggedIn: boolean): void {
    const session: StoredSession = {
      id: response.id,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      token: response.token,
      refreshToken: response.refreshToken,
      refreshTokenExpiration: response.refreshTokenExpiration,
    };

    this.tokens.save(session, keepLoggedIn);
    this.session.set(session);
  }
}
