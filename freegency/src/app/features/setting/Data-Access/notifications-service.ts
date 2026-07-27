import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, map, of } from 'rxjs';
import { 
  NotificationPreferences, 
  DigestFrequency 
} from '../../../shared/utils/notification-preferences.interface';

export interface NotificationUpdateResponse {
  message: string;
  preferences: NotificationPreferences;
}

export interface ApiError {
  code: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/settings/notifications';
  
  readonly isLoading = signal<boolean>(false);
  readonly preferences = signal<NotificationPreferences>({
    email: {
      newMessages: true,
      newProjects: true,
      projectUpdates: false,
      paymentReceived: true,
      marketingEmails: false,
      weeklyDigest: true
    },
    push: {
      newMessages: true,
      projectUpdates: true,
      paymentReceived: true,
      applicationUpdates: false
    },
    digestFrequency: 'weekly',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00'
  });

  fetchPreferences(): Observable<NotificationPreferences> {
    this.isLoading.set(true);
    
    return this.http.get<NotificationPreferences>(this.apiUrl).pipe(
      map((response) => {
        this.preferences.set(response);
        this.isLoading.set(false);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);
        // Return current preferences as fallback
        console.error('Failed to fetch notification preferences:', error);
        return of(this.preferences());
      })
    );
  }

  updateEmailPreference(key: string, enabled: boolean): Observable<NotificationUpdateResponse> {
    return this.updatePreferences({ email: { [key]: enabled } } as any);
  }

  updatePushPreference(key: string, enabled: boolean): Observable<NotificationUpdateResponse> {
    return this.updatePreferences({ push: { [key]: enabled } } as any);
  }

  updateDigestFrequency(frequency: DigestFrequency): Observable<NotificationUpdateResponse> {
    return this.updatePreferences({ digestFrequency: frequency });
  }

  updateQuietHours(enabled: boolean, start?: string, end?: string): Observable<NotificationUpdateResponse> {
    const update: any = { quietHoursEnabled: enabled };
    if (start) update.quietHoursStart = start;
    if (end) update.quietHoursEnd = end;
    return this.updatePreferences(update);
  }

  private updatePreferences(update: Partial<NotificationPreferences>): Observable<NotificationUpdateResponse> {
    this.isLoading.set(true);
    
    return this.http.put<NotificationUpdateResponse>(this.apiUrl, update).pipe(
      map((response) => {
        this.preferences.set(response.preferences);
        this.isLoading.set(false);
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
        message: error.error?.message || 'Invalid notification preferences.'
      };
    }
    
    if (error.status === 422) {
      return {
        code: 'UNPROCESSABLE_ENTITY',
        message: error.error?.message || 'Unable to update preferences.'
      };
    }
    
    return {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.'
    };
  }
}