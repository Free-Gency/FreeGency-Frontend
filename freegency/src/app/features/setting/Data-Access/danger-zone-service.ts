import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError, map, of } from 'rxjs';
import { 
  AccountStatus, 
  BlockingCondition, 
  DeactivationRequest, 
  DeletionRequest, 
  ApiResponse,
  AccountBlocks 
} from '../../../shared/utils/danger-zone.interface';

export interface ApiError {
  code: string;
  message: string;
  errors?: Record<string, string[]>;
}

@Injectable({
  providedIn: 'root'
})
export class DangerZoneService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/settings/account';
  
  readonly isLoading = signal<boolean>(false);
  readonly accountStatus = signal<AccountStatus>({
    isActive: true
  });
  
  readonly blockingConditions = signal<BlockingCondition[]>([
    {
      type: 'active_projects',
      label: 'Active Projects',
      description: 'You have 2 active projects that need to be completed or cancelled.',
      count: 2,
      actionLabel: 'View Projects',
      actionRoute: '/projects',
      resolved: false
    },
    {
      type: 'wallet_balance',
      label: 'Wallet Balance',
      description: 'You have $850.00 in your wallet that needs to be withdrawn first.',
      amount: 850,
      actionLabel: 'Withdraw Funds',
      actionRoute: '/wallet',
      resolved: false
    }
  ]);

  fetchAccountBlocks(): Observable<AccountBlocks> {
    this.isLoading.set(true);
    
    return this.http.get<AccountBlocks>(`${this.apiUrl}/blocks`).pipe(
      map((response) => {
        this.blockingConditions.set(response.blockingConditions);
        this.isLoading.set(false);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);
        // Return existing blocking conditions as fallback
        return of({
          canDelete: false,
          blockingConditions: this.blockingConditions()
        });
      })
    );
  }

  deactivateAccount(data: DeactivationRequest): Observable<ApiResponse> {
    this.isLoading.set(true);
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/deactivate`, data).pipe(
      map((response) => {
        this.isLoading.set(false);
        this.accountStatus.set({
          isActive: false,
          deactivationDate: new Date().toISOString()
        });
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);
        return throwError(() => this.handleError(error));
      })
    );
  }

  reactivateAccount(): Observable<ApiResponse> {
    this.isLoading.set(true);
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/reactivate`, {}).pipe(
      map((response) => {
        this.isLoading.set(false);
        this.accountStatus.set({ isActive: true });
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isLoading.set(false);
        return throwError(() => this.handleError(error));
      })
    );
  }

  deleteAccount(data: DeletionRequest): Observable<ApiResponse> {
    this.isLoading.set(true);
    
    return this.http.post<ApiResponse>(`${this.apiUrl}/delete`, data).pipe(
      map((response) => {
        this.isLoading.set(false);
        this.accountStatus.set({
          isActive: false,
          scheduledDeletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
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
        message: error.error?.message || 'Invalid request data.',
        errors: error.error?.errors
      };
    }
    
    if (error.status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Password is incorrect. Please try again.',
        errors: { password: ['The password you entered is incorrect.'] }
      };
    }
    
    if (error.status === 403) {
      return {
        code: 'FORBIDDEN',
        message: error.error?.message || 'You cannot perform this action right now.',
      };
    }
    
    if (error.status === 409) {
      return {
        code: 'CONFLICT',
        message: error.error?.message || 'There are conditions blocking this action.',
      };
    }
    
    return {
      code: 'SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}