import { Injectable, inject } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../auth/token-storage.service';
import { RoomMessage, RoomUpdated } from '../../shared/models/ChatModel/chat';

@Injectable({
  providedIn: 'root',
})
export class ChatSignalrService {
  private readonly tokens = inject(TokenStorageService);

  hubUrl = environment.hubChatUrl;
  hubConnection?: HubConnection;
  private startPromise: Promise<void> | null = null;

  private receiveMessageHandlers = new Set<(message: RoomMessage) => void>();
  private roomUpdatedHandlers = new Set<(room: RoomUpdated) => void>();
  private onlineStatusHandlers = new Set<(online: boolean) => void>();
  private profileOnlineHandlers = new Set<(profileId: string) => void>();
  private profileOfflineHandlers = new Set<(profileId: string) => void>();

  CreateHubConnection(): void {
    if (
      this.hubConnection &&
      this.hubConnection.state !== HubConnectionState.Disconnected
    ) {
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.tokens.getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.bindHubHandlers();

    this.hubConnection.onreconnected(() => {
      this.bindHubHandlers();
    });

    void this.startConnection();
  }

  stopHubConnection(): void {
    this.startPromise = null;
    if (this.hubConnection?.state === HubConnectionState.Connected) {
      this.hubConnection.stop().catch((error: unknown) => console.log(error));
    }
  }

  async ensureConnected(): Promise<void> {
    const token = this.tokens.getAccessToken();
    if (!token) return;

    if (
      !this.hubConnection ||
      this.hubConnection.state === HubConnectionState.Disconnected
    ) {
      this.CreateHubConnection();
    }

    await this.startConnection();
  }

  listenReceiveMessage(callback: (message: RoomMessage) => void): void {
    this.receiveMessageHandlers.add(callback);
    this.CreateHubConnection();
    this.bindHubHandlers();
  }

  unlistenReceiveMessage(callback: (message: RoomMessage) => void): void {
    this.receiveMessageHandlers.delete(callback);
  }

  listenRoomUpdated(callback: (room: RoomUpdated) => void): void {
    this.roomUpdatedHandlers.add(callback);
    this.CreateHubConnection();
    this.bindHubHandlers();
  }

  unlistenRoomUpdated(callback: (room: RoomUpdated) => void): void {
    this.roomUpdatedHandlers.delete(callback);
  }

  listenOnlineStatus(callback: (online: boolean) => void): void {
    this.onlineStatusHandlers.add(callback);
    this.CreateHubConnection();
    this.bindHubHandlers();
  }

  unlistenOnlineStatus(callback: (online: boolean) => void): void {
    this.onlineStatusHandlers.delete(callback);
  }

  invoke(method: string, ...args: unknown[]): Promise<void> {
    return this.ensureConnected().then(() => {
      if (!this.hubConnection || this.hubConnection.state !== HubConnectionState.Connected) {
        return;
      }
      return this.hubConnection.invoke(method, ...args);
    });
  }
joinRoom(roomId: string): Promise<void> {
  return this.invoke("JoinRoom", roomId);
}

leaveRoom(roomId: string): Promise<void> {
  return this.invoke("LeaveRoom", roomId);
}
  listenProfileOnline(callback: (profileId: string) => void): void {
    this.profileOnlineHandlers.add(callback);
    this.CreateHubConnection();
    this.bindHubHandlers();
  }

  unlistenProfileOnline(callback: (profileId: string) => void): void {
    this.profileOnlineHandlers.delete(callback);
  }

  listenProfileOffline(callback: (profileId: string) => void): void {
    this.profileOfflineHandlers.add(callback);
    this.CreateHubConnection();
    this.bindHubHandlers();
  }

  unlistenProfileOffline(callback: (profileId: string) => void): void {
    this.profileOfflineHandlers.delete(callback);
  }

  private startConnection(): Promise<void> {
    if (!this.hubConnection) return Promise.resolve();
    if (this.hubConnection.state === HubConnectionState.Connected) {
      return Promise.resolve();
    }
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.hubConnection
      .start()
      .then(() => {
        this.bindHubHandlers();
      })
      .catch((error: unknown) => {
        console.log('Chat hub start failed', error);
        this.startPromise = null;
      });

    return this.startPromise ?? Promise.resolve();
  }

  private bindHubHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.off('ReceiveMessage');
    this.hubConnection.on('ReceiveMessage', (message: RoomMessage) => {
      const normalized = this.normalizeMessage(message);
      this.receiveMessageHandlers.forEach((cb) => cb(normalized));
    });

    this.hubConnection.off('RoomUpdated');
    this.hubConnection.on('RoomUpdated', (room: RoomUpdated) => {
      const normalized = this.normalizeRoomUpdated(room);
      this.roomUpdatedHandlers.forEach((cb) => cb(normalized));
    });

    this.hubConnection.off('OnlineStatus');
    this.hubConnection.on('OnlineStatus', (online: boolean) => {
      this.onlineStatusHandlers.forEach((cb) => cb(online));
    });

    this.hubConnection.off('ProfileOnline');
    this.hubConnection.on('ProfileOnline', (profileId: string | { toString(): string }) => {
      const id = String(profileId ?? '');
      if (!id) return;
      this.profileOnlineHandlers.forEach((cb) => cb(id));
    });

    this.hubConnection.off('ProfileOffline');
    this.hubConnection.on('ProfileOffline', (profileId: string | { toString(): string }) => {
      const id = String(profileId ?? '');
      if (!id) return;
      this.profileOfflineHandlers.forEach((cb) => cb(id));
    });
    
  }

  private normalizeMessage(raw: RoomMessage): RoomMessage {
    const r = raw as RoomMessage & {
      ChatRoomId?: string;
      SenderId?: string;
      IsMine?: boolean;
      CreatedAt?: string;
      MessageType?: string;
      OtherProfileId?: string | null;
      Id?: string;
      Text?: string | null;
      SenderName?: string | null;
      FileName?: string | null;
      FileUrl?: string | null;
      SenderProfileType?: string | null;
      PlanVersionId?: string | null;
      ModerationStatus?: string | null;
      ModerationWarning?: string | null;
    };
    const planRaw = raw.planVersionId ?? r.PlanVersionId ?? null;
    return {
      id: String(raw.id || r.Id || ''),
      chatRoomId: raw.chatRoomId ?? r.ChatRoomId ?? null,
      senderId: raw.senderId ?? r.SenderId ?? null,
      senderName: raw.senderName ?? r.SenderName ?? null,
      senderProfileType: raw.senderProfileType ?? r.SenderProfileType ?? null,
      text: raw.text ?? r.Text ?? null,
      fileName: raw.fileName ?? r.FileName ?? null,
      fileUrl: raw.fileUrl ?? r.FileUrl ?? null,
      planVersionId: planRaw == null || planRaw === '' ? null : String(planRaw),
      isMine: raw.isMine ?? !!r.IsMine,
      createdAt: raw.createdAt || r.CreatedAt || new Date().toISOString(),
      messageType: raw.messageType || r.MessageType || 'Text',
      otherProfileId: raw.otherProfileId ?? r.OtherProfileId ?? null,
      moderationStatus: raw.moderationStatus ?? r.ModerationStatus ?? null,
      moderationWarning: raw.moderationWarning ?? r.ModerationWarning ?? null,
    };
  }

  private normalizeRoomUpdated(raw: RoomUpdated): RoomUpdated {
    const r = raw as RoomUpdated & {
      RoomId?: string;
      LastMessage?: string | null;
      LastMessageAt?: string;
      LastMessageSender?: string;
      SenderId?: string;
      LastMessageType?: string | null;
    };
    return {
      roomId: String(raw.roomId || r.RoomId || ''),
      lastMessage: raw.lastMessage ?? r.LastMessage ?? null,
      lastMessageType: raw.lastMessageType ?? r.LastMessageType ?? null,
      lastMessageAt: raw.lastMessageAt || r.LastMessageAt || new Date().toISOString(),
      lastMessageSender: raw.lastMessageSender || r.LastMessageSender || '',
      senderId: raw.senderId || r.SenderId || '',
    };
  }
}
