"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silently fail — polling will retry
    }
  }, []);

  useEffect(() => {
    fetchCount();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchCount();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full p-0 text-xs"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      )}
    </Link>
  );
}
