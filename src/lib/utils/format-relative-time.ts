import { formatDateNo } from "./format-date-no";

// Compact relative-time formatter used for notification timestamps and any
// other UI that needs a "Xm ago / Xh ago / Xd ago" treatment. Falls back to
// a Norwegian absolute date once the event is a week or more in the past.
export function formatRelativeTime(
  input: string | Date,
  now: Date = new Date()
): string {
  const date = input instanceof Date ? input : new Date(input);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateNo(date.toISOString().slice(0, 10));
}
