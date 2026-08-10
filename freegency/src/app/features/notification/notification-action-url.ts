/** Normalize backend ActionUrl values into real Angular routes. */
export function resolveNotificationActionUrl(
  actionUrl: string | null | undefined,
  profileMode?: 'Client' | 'Developer' | string | null,
): string | null {
  if (!actionUrl) return null;

  let url = actionUrl.trim();
  if (!url) return null;

  // Absolute / API URLs → path only
  try {
    if (/^https?:\/\//i.test(url)) {
      url = new URL(url).pathname + new URL(url).search;
    }
  } catch {
    /* keep as-is */
  }

  url = url.replace(/^\/+/, '/');

  // Legacy API chat path → chat room query
  const apiChat = url.match(
    /(?:^|\/)api\/v1\/Chat\/rooms\/([^/?#]+)(?:\/messages)?\/?(?:\?.*)?$/i,
  );
  if (apiChat) {
    return messagesPath(profileMode, apiChat[1]);
  }

  // /chat/{roomId} → /chat?room= or role messages
  const chatPath = url.match(/^\/chat\/([^/?#]+)\/?(?:\?.*)?$/i);
  if (chatPath) {
    return messagesPath(profileMode, chatPath[1]);
  }

  // Already /chat?room=… — prefer role-specific messages pages
  const chatQuery = url.match(/^\/chat\/?\?([^#]*)$/i);
  if (chatQuery) {
    const params = new URLSearchParams(chatQuery[1]);
    const room = params.get('room');
    if (room) return messagesPath(profileMode, room);
  }

  // /teams/{id}/join-requests → team jobs tab (join requests live there)
  const joinRequests = url.match(
    /^\/teams\/([^/?#]+)\/join-requests\/?(?:\?.*)?$/i,
  );
  if (joinRequests) {
    return `/developer/teams/${joinRequests[1]}?tab=jobs`;
  }

  // /teams/{id} → developer team page
  const team = url.match(/^\/teams\/([^/?#]+)\/?(?:\?.*)?$/i);
  if (team) {
    const qs = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    return `/developer/teams/${team[1]}${qs}`;
  }

  // /projects/{id}/proposals/{proposalId} → proposals tab
  const proposal = url.match(
    /^\/projects\/([^/?#]+)\/proposals(?:\/[^/?#]+)?\/?(?:\?.*)?$/i,
  );
  if (proposal) {
    return `/projects/${proposal[1]}?tab=proposals`;
  }

  // /projects/{id}/milestones → milestones tab
  const milestones = url.match(
    /^\/projects\/([^/?#]+)\/milestones\/?(?:\?.*)?$/i,
  );
  if (milestones) {
    return `/projects/${milestones[1]}?tab=milestones`;
  }

  return url.startsWith('/') ? url : `/${url}`;
}

function messagesPath(
  profileMode: string | null | undefined,
  roomId: string,
): string {
  if (profileMode === 'Developer') {
    return `/developer/messages?room=${roomId}`;
  }
  if (profileMode === 'Client') {
    return `/client/messages?room=${roomId}`;
  }
  return `/chat?room=${roomId}`;
}
