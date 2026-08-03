export interface ChatRoom {

  id: string;

  roomType: string;

  status: string;

  title: string;

  lastMessage?: string | null;

  lastMessageType?: string | null;

  lastMessageAt?: string | null;

  unreadCount: number;

  lastMessageSender?: string | null;

  archivedAt?: string | null;

}
export interface ChatRoomFilter {

  pageNumber?: number;

  pageSize?: number;

  roomType?: string | null;

  status?: string | null;

  search?: string | null;

}
export interface RoomMessageFilter {

  pageNumber?: number;

  pageSize?: number;

}
export interface RoomMessage {

  id: string;

  senderId?: string | null;

  senderProfileType?: string | null;

  senderName?: string | null;

  messageType: string;

  text?: string | null;

  fileName?: string | null;

  fileUrl?: string | null;

  createdAt: string;

  isMine: boolean;

}
export interface RoomUpdated {

  roomId: string;

  lastMessage?: string | null;

  lastMessageType?: string | null;

  lastMessageAt: string;

  lastMessageSender: string;

  senderId: string;

}