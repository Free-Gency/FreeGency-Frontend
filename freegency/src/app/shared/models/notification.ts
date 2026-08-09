export type NotificationType =
  | 'System'
  | 'NewProposal'
  | 'ProposalAccepted'
  | 'ProposalRejected'
  | 'JoinRequestReceived'
  | 'JoinRequestAccepted'
  | 'JoinRequestRejected'
  | 'MilestonePlanProposed'
  | 'MilestonePlanChangesRequested'
  | 'MilestonePlanAgreed'
  | 'MilestoneFunded'
  | 'EscrowLocked'
  | 'MilestoneSubmitted'
  | 'MilestoneChangesRequested'
  | 'MilestoneApproved'
  | 'MilestoneReleased'
  | 'NewChatMessage'
  | 'ReviewReminder'
  | 'ProjectPublished'
  | 'Wallet'
  | 'TaskAssigned'
  | 'TaskStatusChanged'
  | 'TaskCommentAdded'
  | string;

/** Mirrors FreeGency.Application.Features.NotificationFeature.Dtos.NotificationDto (SignalR push payload). */
export interface NotificationDto {
  title: string;
  body: string;
  type: NotificationType;
  imageUrl: string | null;
  actionUrl: string | null;
  data: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
