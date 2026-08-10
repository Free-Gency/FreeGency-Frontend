export type ProjectInvitationStatus =
  | 'Pending'
  | 'Accepted'
  | 'Rejected'
  | 'Cancelled'
  | 'Expired'
  | string;

export type InviteeType = 'User' | 'Team' | string;

export interface ProjectInvitation {
  id: string;
  projectId: string;
  projectTitle: string;
  clientUserId: string;
  clientName: string;
  inviteeType: InviteeType;
  inviteeUserId: string | null;
  inviteeUserName: string | null;
  inviteeTeamId: string | null;
  inviteeTeamName: string | null;
  message: string;
  status: ProjectInvitationStatus;
  createdAt: string;
  respondedAt: string | null;
  proposalId: string | null;
  chatRoomId: string | null;
}

export interface CreateProjectInvitationRequest {
  projectId: string;
  inviteeType: 'User' | 'Team';
  inviteeUserId?: string | null;
  inviteeTeamId?: string | null;
  message: string;
}

export interface InviteTarget {
  inviteeType: 'User' | 'Team';
  inviteeUserId?: string | null;
  inviteeTeamId?: string | null;
  displayName: string;
}
