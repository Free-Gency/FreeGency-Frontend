import { Injectable } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { environment } from '../../../environments/environment.development';
import { RoomMessage, RoomUpdated } from '../../shared/models/ChatModel/chat';

@Injectable({
  providedIn: 'root',
})
export class ChatSignalrService {
   hubUrl = environment.hubChatUrl;
  hubConnection?: HubConnection;
 

  CreateHubConnection() {
    if (this.hubConnection && this.hubConnection.state !== HubConnectionState.Disconnected) {
      return;
    }
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => {
          const session = sessionStorage.getItem('freegency.auth.session');
          if (!session) return '';
          return JSON.parse(session).token;
        },
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch((erorr: any) => console.log(erorr));
  }
  stopHubConnection() {
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      this.hubConnection.stop().catch((error: any) => console.log(error));
    }
  }
  listenReceiveMessage(
  callback:(message:RoomMessage)=>void
){

  this.hubConnection?.on(
    "ReceiveMessage",
    (message:RoomMessage)=>{

      callback(message);

    }
  );

}
listenRoomUpdated(
  callback:(room:RoomUpdated)=>void
)
{
  this.hubConnection?.off("RoomUpdated");

  this.hubConnection?.on(
    "RoomUpdated",
    callback
  );
}
}
