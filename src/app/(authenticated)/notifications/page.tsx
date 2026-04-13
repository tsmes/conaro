import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getNotificationsForProfile,
  getUnreadCount,
} from "@/lib/notifications/service";
import { NotificationList } from "@/components/notifications/notification-list";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.profileId) {
    redirect("/login");
  }

  const [notificationList, unreadCount] = await Promise.all([
    getNotificationsForProfile(session.user.profileId, 50),
    getUnreadCount(session.user.profileId),
  ]);

  const serialized = notificationList.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10 md:px-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Inbox
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
          Notifications
        </h1>
        <p className="mt-3 text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} unread ${unreadCount === 1 ? "notification" : "notifications"}.`
            : "You're all caught up."}
        </p>
      </header>

      <NotificationList
        notifications={serialized}
        unreadCount={unreadCount}
      />
    </div>
  );
}
