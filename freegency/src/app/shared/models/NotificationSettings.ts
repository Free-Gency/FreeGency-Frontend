export interface NotificationSettings {
  id: string;

  newMessageInApp: boolean;
  newMessageEmail: boolean;

  proposalReceivedInApp: boolean;
  proposalReceivedEmail: boolean;

  milestoneAddedInApp: boolean;
  milestoneAddedEmail: boolean;

  walletUpdatedInApp: boolean;
  walletUpdatedEmail: boolean;
}

export interface UpdateNotificationSettings {
  id: string;
  newMessageInApp: boolean;
  newMessageEmail: boolean;

  proposalReceivedInApp: boolean;
  proposalReceivedEmail: boolean;

  milestoneAddedInApp: boolean;
  milestoneAddedEmail: boolean;

  walletUpdatedInApp: boolean;
  walletUpdatedEmail: boolean;
}

export interface DeveloperNotificationSettings {
  id: string;

  messagesInApp: boolean;
  messagesEmail: boolean;

  projectsInApp: boolean;
  projectsEmail: boolean;

  milestonesInApp: boolean;
  milestonesEmail: boolean;

  walletInApp: boolean;
  walletEmail: boolean;

  teamsInApp: boolean;
  teamsEmail: boolean;
}

export interface UpdateDeveloperNotificationSettings {
  id: string;

  messagesInApp: boolean;
  messagesEmail: boolean;

  projectsInApp: boolean;
  projectsEmail: boolean;

  milestonesInApp: boolean;
  milestonesEmail: boolean;

  walletInApp: boolean;
  walletEmail: boolean;

  teamsInApp: boolean;
  teamsEmail: boolean;
}