import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Wallet } from '../../shared/models/Wallet';
import { NotificationDto } from '../../shared/models/notification';
import { TokenStorageService } from '../auth/token-storage.service';

@Injectable({
  providedIn: 'root',
})
export class SignalrService {
  private readonly tokens = inject(TokenStorageService);
  hubUrl = environment.hubUrl;
  hubConnection?: HubConnection;
  WalletSignal = signal<Wallet | null>(null);
  NotificationSignal = signal<NotificationDto | null>(null);

  CreateHubConnection() {
    if (this.hubConnection && this.hubConnection.state !== HubConnectionState.Disconnected) {
      return;
    }
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.tokens.getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch((error: unknown) => console.log(error));
    this.hubConnection.on('WalletUpdated', (value: Wallet) => {
      this.WalletSignal.set(value);
    });
    this.hubConnection.on('NotificationCreated', (value: NotificationDto) => {
      this.NotificationSignal.set(value);
    });
  }

  stopHubConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      this.hubConnection.stop().catch((error: unknown) => console.log(error));
    }
  }
}
