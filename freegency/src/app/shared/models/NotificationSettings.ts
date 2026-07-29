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
  id:string,
  newMessageInApp: boolean;
  newMessageEmail: boolean;

  proposalReceivedInApp: boolean;
  proposalReceivedEmail: boolean;

  milestoneAddedInApp: boolean;
  milestoneAddedEmail: boolean;

  walletUpdatedInApp: boolean;
  walletUpdatedEmail: boolean;
}