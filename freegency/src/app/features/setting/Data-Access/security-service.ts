import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { signal } from '@angular/core';

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordChangeResponse {
  message: string;
  lastChangedAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/v1/profiles';
  
  readonly isLoading = signal<boolean>(false);
  readonly lastPasswordChangeDate = signal<string>('3 months ago');

  changePassword(data: PasswordChangeRequest): Observable<PasswordChangeResponse> {
    this.isLoading.set(true);
    
    return this.http.post<PasswordChangeResponse>(
      `${this.apiUrl}/changepassword`, 
      data,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map((response) => {
        this.isLoading.set(false);
        this.lastPasswordChangeDate.set('Just now');
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);
        return throwError(() => this.handleError(error));
      })
    );
  }

  private handleError(error: HttpErrorResponse): ApiError {
    if (error.status === 400) {
      return {
        code: 'VALIDATION_ERROR',
        message: error.error?.message || 'Invalid password data provided.',
        errors: error.error?.errors
      };
    }
    
    if (error.status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Current password is incorrect.',
        errors: { currentPassword: ['The password you entered is incorrect.'] }
      };
    }
    
    if (error.status === 422) {
      return {
        code: 'UNPROCESSABLE_ENTITY',
        message: error.error?.message || 'Password does not meet requirements.',
        errors: error.error?.errors
      };
    }
    
    if (error.status === 429) {
      return {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many attempts. Please try again later.',
      };
    }
    
    return {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}