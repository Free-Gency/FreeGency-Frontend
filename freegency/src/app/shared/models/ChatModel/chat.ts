export interface ChatRoom {
  id: string;
  roomType: string;
  status: string;
  title: string;
  clientName?: string | null;
  teamId?: string | null;
  teamName?: string | null;
  teamLogo?: string | null;
  logo?: string | null;
  projectId?: string | null;
  proposalId?: string | null;
  lastMessage?: string | null;
  lastMessageType?: string | null;
  lastMessageAt?: string | null;
  createdAt?: string | null;
  unreadCount: number;
  lastMessageSender?: string | null;
  archivedAt?: string | null;
  canSend: boolean;
  roleLabel?: string | null;
  /** Other 1:1 peer profile id (for online presence). */
  otherProfileId?: string | null;
}

export interface ChatRoomFilter {
  pageNumber?: number;
  pageSize?: number;
  roomType?: string | null;
  status?: string | null;
  search?: string | null;
  teamId?: string | null;
}

export interface RoomMessageFilter {
  pageNumber?: number;
  pageSize?: number;
}

export interface RoomMessage {
  id: string;
  chatRoomId?: string | null;
  senderId?: string | null;
  senderProfileType?: string | null;
  senderName?: string | null;
  messageType: string;
  text?: string | null;
  fileName?: string | null;
  fileUrl?: string | null;
  planVersionId?: string | null;
  milestoneId?: string | null;
  createdAt: string;
  isMine: boolean;
  otherProfileId: string | null;
  moderationStatus?: string | null;
  moderationWarning?: string | null;
  isAgentGenerated?: boolean;
}

export interface RoomUpdated {
  roomId: string;
  lastMessage?: string | null;
  lastMessageType?: string | null;
  lastMessageAt: string;
  lastMessageSender: string;
  senderId: string;
  status?: string | null;
  archivedAt?: string | null;
}

export interface StartDiscussionRequest {
  proposalId: string;
}

export function chatRoomDisplayTitle(room: ChatRoom): string {
  if (room.roomType === 'TeamMain') {
    const name = (room.title || room.teamName || '').trim();
    return name || 'Team chat';
  }
  const title = (room.title || '').trim() || 'Conversation';
  const client = (room.clientName || '').trim();
  const team = (room.teamName || '').trim();
  if (client && (room.roomType === 'Proposal' || room.roomType === 'Project')) {
    return `${title} · ${client}`;
  }
  // Client inbox: show applicant team name on team proposal/project rooms.
  if (team && (room.roomType === 'Proposal' || room.roomType === 'Project')) {
    return `${title} · ${team}`;
  }
  return title;
}

export function chatRoomAvatarUrl(room: ChatRoom): string | null {
  const roomLogo = (room.logo || '').trim();
  if (roomLogo) return roomLogo;
  if (room.roomType === 'TeamMain' || room.roomType === 'TeamGroup') {
    return (room.teamLogo || '').trim() || null;
  }
  return null;
}

export function chatRoomSortKey(room: ChatRoom): number {
  const raw = room.lastMessageAt || room.createdAt;
  return raw ? new Date(raw).getTime() : 0;
}
