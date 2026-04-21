import type { CompletenessResult } from "@/lib/profile/completeness";
import type { LandingNotification } from "@/lib/landing/data";
import {
  QuickStatusCard,
  type QuickStatusCounts,
} from "./rail-cards/quick-status-card";
import { ProfileCompletenessCard } from "./rail-cards/profile-completeness-card";
import { NotificationsCard } from "./rail-cards/notifications-card";

export interface ArtistRailProps {
  counts: QuickStatusCounts;
  completeness: CompletenessResult;
  notifications: LandingNotification[];
  unreadNotificationCount: number;
}

// Right-rail composition shown to signed-in artists.
export function ArtistRail({
  counts,
  completeness,
  notifications,
  unreadNotificationCount,
}: ArtistRailProps) {
  return (
    <aside className="space-y-4">
      <QuickStatusCard counts={counts} />
      <ProfileCompletenessCard completeness={completeness} />
      <NotificationsCard
        notifications={notifications}
        unreadCount={unreadNotificationCount}
      />
    </aside>
  );
}
