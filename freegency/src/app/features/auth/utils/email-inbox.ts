/** Web inbox URLs by email domain. Falls back to mailto for unknown providers. */
const INBOX_BY_DOMAIN: Record<string, { url: string; label: string }> = {
  'gmail.com': { url: 'https://mail.google.com', label: 'Open Gmail' },
  'googlemail.com': { url: 'https://mail.google.com', label: 'Open Gmail' },
  'outlook.com': { url: 'https://outlook.live.com', label: 'Open Outlook' },
  'hotmail.com': { url: 'https://outlook.live.com', label: 'Open Outlook' },
  'live.com': { url: 'https://outlook.live.com', label: 'Open Outlook' },
  'msn.com': { url: 'https://outlook.live.com', label: 'Open Outlook' },
  'yahoo.com': { url: 'https://mail.yahoo.com', label: 'Open Yahoo Mail' },
  'ymail.com': { url: 'https://mail.yahoo.com', label: 'Open Yahoo Mail' },
  'icloud.com': { url: 'https://www.icloud.com/mail', label: 'Open iCloud Mail' },
  'me.com': { url: 'https://www.icloud.com/mail', label: 'Open iCloud Mail' },
  'mac.com': { url: 'https://www.icloud.com/mail', label: 'Open iCloud Mail' },
  'proton.me': { url: 'https://mail.proton.me', label: 'Open Proton Mail' },
  'protonmail.com': { url: 'https://mail.proton.me', label: 'Open Proton Mail' },
  'aol.com': { url: 'https://mail.aol.com', label: 'Open AOL Mail' },
  'zoho.com': { url: 'https://mail.zoho.com', label: 'Open Zoho Mail' },
};

function resolveInbox(email: string): { url: string; label: string } {
  const domain = email.split('@')[1]?.trim().toLowerCase() ?? '';
  return (
    INBOX_BY_DOMAIN[domain] ?? {
      url: `mailto:${email}`,
      label: 'Open email app',
    }
  );
}

export function getEmailInboxUrl(email: string): string {
  return resolveInbox(email).url;
}

export function getEmailInboxLabel(email: string): string {
  return resolveInbox(email).label;
}
