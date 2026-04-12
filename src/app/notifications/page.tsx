import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  getNotificationsForProfile,
  getUnreadCount,
} from "@/lib/notifications/service";
import { NotificationList } from "@/components/notifications/notification-list";
import { Separator } from "@/components/ui/separator";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.profileId) {
    redirect("/login");
  }

  const [notificationList, unreadCount] = await Promise.all([
    getNotificationsForProfile(session.user.profileId, 50),
    getUnreadCount(session.user.profileId),
  ]);

  // Serialize dates for client component
  const serialized = notificationList.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Notifications</h1>
      <p className="mt-2 text-muted-foreground">
        {unreadCount > 0
          ? `You have ${unreadCount} unread notification(s).`
          : "You're all caught up."}
      </p>

      <Separator className="my-6" />

      <NotificationList
        notifications={serialized}
        unreadCount={unreadCount}
      />
    </div>
  );
}
