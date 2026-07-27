export interface NotificationChannel {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface EmailNotifications {
  newMessages: boolean;
  newProjects: boolean;
  projectUpdates: boolean;
  paymentReceived: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
}

export interface PushNotifications {
  newMessages: boolean;
  projectUpdates: boolean;
  paymentReceived: boolean;
  applicationUpdates: boolean;
}

export type DigestFrequency = 'daily' | 'weekly' | 'never';

export interface NotificationPreferences {
  email: EmailNotifications;
  push: PushNotifications;
  digestFrequency: DigestFrequency;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface NotificationSetting {
  id: string;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}