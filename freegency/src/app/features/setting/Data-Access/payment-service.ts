import { inject, Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { TopUpResponse, Wallet } from '../../../shared/models/Wallet';
import { Observable } from 'rxjs';
import { LedgerEntry } from '../../../shared/models/LedgerEntry';
import { PagedResponse } from '../../../shared/models/PagedResponse';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiBaseUrl;
  getWallet(): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.apiUrl}/api/v1/wallet/me`);
  }
  createTopUp(amount: number): Observable<TopUpResponse> {
    return this.http.post<TopUpResponse>(`${this.apiUrl}/api/v1/wallet/topup`, {
      amount,
    });
  }
  getLedger(pageNumber = 1, pageSize = 10) {
  return this.http.get<PagedResponse<LedgerEntry>>(
    `${this.apiUrl}/api/v1/LedgerEntry/me`,
    {
      params: {
        pageNumber,
        pageSize,
      },
    },
  );
}
}
