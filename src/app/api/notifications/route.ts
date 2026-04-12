import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getNotificationsForProfile,
  getUnreadCount,
} from "@/lib/notifications/service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [notificationList, unreadCount] = await Promise.all([
    getNotificationsForProfile(session.user.profileId, 50),
    getUnreadCount(session.user.profileId),
  ]);

  return NextResponse.json({
    notifications: notificationList,
    unreadCount,
  });
}
