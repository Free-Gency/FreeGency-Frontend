import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import{HubConnection, HubConnectionBuilder, HubConnectionState} from '@microsoft/signalr'
import { Wallet } from '../../shared/models/Wallet';
import { PaymentService } from '../../features/setting/Data-Access/payment-service';
@Injectable({
  providedIn: 'root',
})
export class SignalrService {
  hubUrl=environment.hubUrl;
  hubConnection?:HubConnection;
  WalletSignal=signal<Wallet | null>(null);

  CreateHubConnection(){
    if (
    this.hubConnection &&
    this.hubConnection.state !== HubConnectionState.Disconnected) {
    return;
  }
    this.hubConnection = new HubConnectionBuilder()
    .withUrl(environment.hubUrl, {
      accessTokenFactory: ()=>{
        const session = sessionStorage.getItem("freegency.auth.session");
        if (!session) return "";
        return JSON.parse(session).token;
      }
    })
    .withAutomaticReconnect()
    .build();

    this.hubConnection.start().catch(erorr=>console.log(erorr));
    this.hubConnection.on("WalletUpdated",(value:Wallet)=>{
      this.WalletSignal.set(value);
      console.log(this.WalletSignal());
    })
  }
  stopHubConnection(){
    if(this.hubConnection?.state===HubConnectionState.Connected){
      this.hubConnection.stop().catch(error=>console.log(error));
    }
  }
}
