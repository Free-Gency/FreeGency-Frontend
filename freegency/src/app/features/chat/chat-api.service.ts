import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse } from '../../shared/models/PagedResponse';
import {
  ChatRoom,
  ChatRoomFilter,
  RoomMessage,
  chatRoomSortKey,
} from '../../shared/models/ChatModel/chat';

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/api/v1/Chat`;

  getChatRooms(filter?: ChatRoomFilter): Observable<PagedResponse<ChatRoom>> {
    let params = new HttpParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }

    return this.http.get<PagedResponse<ChatRoom>>(this.apiUrl, { params }).pipe(
      map((res) => {
        const items = (res.items ?? [])
          .map((r) => this.normalizeRoom(r))
          .sort((a, b) => chatRoomSortKey(b) - chatRoomSortKey(a));
        return { ...res, items };
      }),
    );
  }

  getMessages(
    roomId: string,
    pageNumber = 1,
    pageSize = 50,
  ): Observable<PagedResponse<RoomMessage>> {
    return this.http
      .get<PagedResponse<RoomMessage>>(`${this.apiUrl}/rooms/${roomId}/messages`, {
        params: {
          pageNumber,
          pageSize,
        },
      })
      .pipe(
        map((res) => ({
          ...res,
          items: (res.items ?? []).map((m) => this.normalizeMessage(m, roomId)),
        })),
      );
  }

  sendMessage(roomId: string, text?: string, file?: File | null): Observable<RoomMessage> {
    const form = new FormData();
    if (text?.trim()) form.append('Text', text.trim());
    if (file) form.append('File', file);
    return this.http.post<RoomMessage>(`${this.apiUrl}/Send-message/${roomId}`, form).pipe(
      map((raw) => this.normalizeMessage(raw, roomId)),
    );
  }

  markAsRead(roomId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/rooms/${roomId}/read`, {});
  }

  private normalizeMessage(raw: RoomMessage, fallbackRoomId: string): RoomMessage {
    return {
      id: String(raw.id || ''),
      chatRoomId: raw.chatRoomId ?? fallbackRoomId,
      senderId: raw.senderId ?? null,
      senderName: raw.senderName ?? null,
      senderProfileType: raw.senderProfileType ?? null,
      text: raw.text ?? null,
      fileName: raw.fileName ?? null,
      fileUrl: raw.fileUrl ?? null,
      planVersionId: raw.planVersionId ?? null,
      messageType: raw.messageType || 'Text',
      createdAt: raw.createdAt || new Date().toISOString(),
      isMine: raw.isMine ?? true,
      otherProfileId: raw.otherProfileId ?? null,
    };
  }

  private normalizeRoom(raw: ChatRoom): ChatRoom {
    const empty = '00000000-0000-0000-0000-000000000000';
    const pick = (...vals: Array<string | null | undefined>) => {
      for (const v of vals) {
        if (v && String(v).trim() && String(v).toLowerCase() !== empty) return String(v);
      }
      return null;
    };
    return {
      ...raw,
      projectId: pick(raw.projectId),
      proposalId: pick(raw.proposalId),
    };
  }
}
