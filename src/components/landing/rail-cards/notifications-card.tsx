import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NotificationList } from "@/components/notifications/notification-list";
import type { LandingNotification } from "@/lib/landing/data";

export interface NotificationsCardProps {
  notifications: LandingNotification[];
  unreadCount: number;
}

export function NotificationsCard({
  notifications,
  unreadCount,
}: NotificationsCardProps) {
  // Slice safety — even if more come in, we only ever show 3 in the rail.
  const recent = notifications.slice(0, 3);
  const recentUnread = recent.reduce(
    (sum, n) => (n.isRead ? sum : sum + 1),
    0
  );
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
              Notifications
            </p>
            <h3 className="font-heading text-base font-extrabold tracking-tight">
              Latest updates
            </h3>
          </div>
          <Link
            href="/notifications"
            className="text-[11.5px] font-semibold text-primary hover:underline"
          >
            See all{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-2 text-[13px] text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <NotificationList
            notifications={recent.map((n) => ({
              id: n.id,
              message: n.message,
              link: n.link,
              isRead: n.isRead,
              createdAt: n.createdAtISO,
            }))}
            unreadCount={recentUnread}
          />
        )}
      </CardContent>
    </Card>
  );
}
