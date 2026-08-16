/** Shared countdown helpers for Hire by AI run tracking. */

export function formatRemaining(ms: number): string {
  if (ms <= 0) return '0s';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function remainingMs(deadlineIso: string, nowMs = Date.now()): number {
  const end = Date.parse(deadlineIso);
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - nowMs);
}

export function progressRatio(
  startIso: string,
  deadlineIso: string,
  nowMs = Date.now(),
): number {
  const start = Date.parse(startIso);
  const end = Date.parse(deadlineIso);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.min(1, Math.max(0, (nowMs - start) / (end - start)));
}

export function formatShortRemaining(ms: number): string {
  if (ms <= 0) return 'ending';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m left`;
  return `${totalSec}s left`;
}
