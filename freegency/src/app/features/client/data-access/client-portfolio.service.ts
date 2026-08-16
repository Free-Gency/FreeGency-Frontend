import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ClientAccount } from '../../../shared/models/client-account.model';

interface ApiResponse<T> {
  isSuccess?: boolean;
  data?: T | null;
}

@Injectable({ providedIn: 'root' })
export class ClientPortfolioService {
  private readonly http = inject(HttpClient);
  private readonly profilesUrl = `${environment.apiBaseUrl}/api/v1/profiles`;

  getPublicClientProfile(clientId: string): Observable<ClientAccount> {
    return this.http
      .get<ApiResponse<ClientAccount> | ClientAccount>(`${this.profilesUrl}/client/${clientId}`)
      .pipe(
        map((res) => {
          const raw = (res as ApiResponse<ClientAccount>)?.data ?? (res as ClientAccount);
          if (!raw) throw new Error('Client profile not found.');
          return raw;
        }),
      );
  }
}