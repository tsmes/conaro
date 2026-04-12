import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markAsRead } from "@/lib/notifications/service";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { notificationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.notificationId) {
    return NextResponse.json(
      { error: "Notification ID is required" },
      { status: 400 }
    );
  }

  await markAsRead(body.notificationId, session.user.profileId);

  return NextResponse.json({ success: true });
}
