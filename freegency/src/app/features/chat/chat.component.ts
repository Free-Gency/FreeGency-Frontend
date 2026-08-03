import { Component, inject, signal } from '@angular/core';
import { PagedResponse } from '../../shared/models/PagedResponse';
import { ChatRoom, ChatRoomFilter, RoomMessage, RoomUpdated } from '../../shared/models/ChatModel/chat';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment.development';
import { DatePipe } from '@angular/common';
import { ClientViewNavbarComponent } from "../../shared/components/client-view-navbar/client-view-navbar.component";
import { ChatSignalrService } from '../../core/Signalr/chat-signalr-service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-chat',
  imports: [DatePipe, ClientViewNavbarComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent {
  private http = inject(HttpClient);
private auth = inject(AuthService);
private chatSignalr = inject(ChatSignalrService);
  private apiUrl =
    `${environment.apiBaseUrl}/api/v1/Chat`;
    selectedRoom = signal<ChatRoom | null>(null);
isOtherOnline = signal(false);
messages = signal<RoomMessage[]>([]);

messageText = signal<string>("");

selectedFile = signal<File | null>(null);


  // state
  chatRooms = signal<ChatRoom[]>([]);

  loading = signal<boolean>(false);

  error = signal<string | null>(null);



  ngOnInit(): void {
    this.chatSignalr.listenProfileOnline(profileId => {

  if (profileId === this.messages()[0]?.otherProfileId) {
    this.isOtherOnline.set(true);
  }

});

this.chatSignalr.listenProfileOffline(profileId => {

  if (profileId === this.messages()[0]?.otherProfileId) {
    this.isOtherOnline.set(false);
  }

});
    this.chatSignalr.listenOnlineStatus((online) => {

  this.isOtherOnline.set(online);

});
     this.chatSignalr.listenReceiveMessage(
    (message)=>{
       message.isMine =
    message.senderId === this.auth.session()?.profileId;

      this.messages.update(old=>[
        ...old,
        message
      ]);


    }
  );
this.chatSignalr.listenRoomUpdated((update: RoomUpdated) => {

  this.chatRooms.update(rooms => {

    const index = rooms.findIndex(r => r.id === update.roomId);

    if (index === -1)
      return rooms;

    const room = {
      ...rooms[index],

      lastMessage: update.lastMessage,
      lastMessageType: update.lastMessageType,
      lastMessageAt: update.lastMessageAt,
      lastMessageSender: update.lastMessageSender,

      unreadCount:
        this.selectedRoom()?.id === update.roomId
          ? 0
          : rooms[index].unreadCount + 1
    };

    const updated = [...rooms];

    updated.splice(index, 1);

    updated.unshift(room);

    return updated;

  });

});
    this.loadChatRooms();

  }




  loadChatRooms(){


    const filter: ChatRoomFilter = {

      pageNumber: 1,

      pageSize: 20

    };


    this.loading.set(true);


    this.getChatRooms(filter)
    .subscribe({

      next:(res)=>{


        this.chatRooms.set(
          res.items
        );


        this.loading.set(false);


      },


      error:(err)=>{


        console.log(err);


        this.error.set(
          "Failed to load chats"
        );


        this.loading.set(false);

      }

    });


  }




  getChatRooms(
    filter?: ChatRoomFilter
  ){


    let params = new HttpParams();


    if(filter){

      Object.entries(filter)
      .forEach(([key,value])=>{


        if(value !== undefined &&
           value !== null)
        {

          params =
          params.set(
            key,
            value
          );

        }


      });

    }


    return this.http.get<PagedResponse<ChatRoom>>(
      this.apiUrl,
      {
        params
      }
    );


  }
  openChat(room:ChatRoom)
{
  this.selectedRoom.set(room);

  this.loadMessages(room.id);
}
loadMessages(roomId:string)
{

 this.http.get<PagedResponse<RoomMessage>>(
 `${this.apiUrl}/rooms/${roomId}/messages`,
 {
   params:{
     pageNumber:1,
     pageSize:50
   }
 })
 .subscribe({

  next:(res)=>{

    this.messages.set(res.items);
    const otherProfileId = res.items[0]?.otherProfileId;

if (otherProfileId) {

  this.chatSignalr.invoke(
    "IsOnline",
    otherProfileId
  );

}

  }

 });

}
sendMessage()
{

 const room = this.selectedRoom();

 if(!room)
   return;


 const form = new FormData();


 if(this.messageText())
 {
   form.append(
    "Text",
    this.messageText()
   );
 }


 if(this.selectedFile())
 {
   form.append(
    "File",
    this.selectedFile()!
   );
 }



 this.http.post<RoomMessage>(

 `${this.apiUrl}/Send-message/${room.id}`,

 form

 )
 .subscribe({

  next:()=>{


     this.messageText.set("");

    this.selectedFile.set(null);

  }


 });


}
onFileSelected(event:any)
{

 const file =
 event.target.files[0];


 if(file)
 {
   this.selectedFile.set(file);
 }

}
startDiscussion(proposalId: string) {

  return this.http.post<string>(
    `${this.apiUrl}/Start-Discussion`,
    {
      proposalId
    }
  );

}
moveRoomToTop(roomId: string, lastMessage: string, lastMessageAt: string) {

  this.chatRooms.update(rooms => {

    const index = rooms.findIndex(r => r.id === roomId);

    if (index === -1)
      return rooms;

    const room = {
      ...rooms[index],
      lastMessage,
      lastMessageAt
    };

    const updated = [...rooms];

    updated.splice(index, 1);

    updated.unshift(room);

    return updated;

  });

}
}