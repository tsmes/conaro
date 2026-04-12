"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Notification {
  id: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationListProps {
  notifications: Notification[];
  unreadCount: number;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toISOString().slice(0, 10);
}

export function NotificationList({
  notifications: initialNotifications,
  unreadCount: initialUnreadCount,
}: NotificationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const handleClick = useCallback(
    (notification: Notification) => {
      if (!notification.isRead) {
        startTransition(async () => {
          await fetch("/api/notifications/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationId: notification.id }),
          });
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, isRead: true } : n
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        });
      }
      if (notification.link) {
        router.push(notification.link);
      }
    },
    [router]
  );

  const handleMarkAllRead = useCallback(() => {
    startTransition(async () => {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    });
  }, []);

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No notifications yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
          >
            Mark all as read
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              !notification.isRead ? "border-primary/30 bg-primary/5" : ""
            }`}
            onClick={() => handleClick(notification)}
          >
            <CardContent className="flex items-start justify-between p-4">
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    !notification.isRead ? "font-medium" : ""
                  }`}
                >
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatRelativeTime(notification.createdAt)}
                </p>
              </div>
              {!notification.isRead && (
                <div className="ml-2 mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
