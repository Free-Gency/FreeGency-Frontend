

export interface ProjectEvent {
  id: string;
  projectId: string;
  milestoneId: string | null;
  milestoneTitle: string | null;
  actorUserId: string;
  actorUserName: string;
  eventType: string;
  createdAt: string;
}