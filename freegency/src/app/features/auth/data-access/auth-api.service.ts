import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../../../core/auth/auth.models';
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/Auth`;
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, request);
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
}
