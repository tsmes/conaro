import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { and, eq, isNull, lte, lt, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { notifyEventOpened } from "@/lib/notifications/triggers";

export const dynamic = "force-dynamic";

function secureCompare(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!secureCompare(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayUtc = new Date().toISOString().slice(0, 10);

  // Transition published -> accepting_applications
  const toOpen = await db
    .select({
      id: events.id,
      name: events.name,
      conventionId: events.conventionId,
    })
    .from(events)
    .where(
      and(
        eq(events.status, "published"),
        isNotNull(events.applicationOpenDate),
        lte(events.applicationOpenDate, todayUtc)
      )
    );

  let opened = 0;
  for (const event of toOpen) {
    try {
      // Guard against races: only update if still in published status
      const updated = await db
        .update(events)
        .set({ status: "accepting_applications", updatedAt: new Date() })
        .where(
          and(eq(events.id, event.id), eq(events.status, "published"))
        )
        .returning({ id: events.id });

      if (updated.length === 0) {
        // Another process transitioned this event — skip notification
        continue;
      }

      opened += 1;

      try {
        await notifyEventOpened(event.id, event.name, event.conventionId);
      } catch (error) {
        console.error(
          `Failed to send event opened notifications for event ${event.id}:`,
          error
        );
      }
    } catch (error) {
      console.error(`Failed to open applications for event ${event.id}:`, error);
    }
  }

  // Transition accepting_applications -> reviewing
  const toClose = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.status, "accepting_applications"),
        isNotNull(events.applicationCloseDate),
        lt(events.applicationCloseDate, todayUtc)
      )
    );

  let closed = 0;
  for (const event of toClose) {
    try {
      const updated = await db
        .update(events)
        .set({ status: "reviewing", updatedAt: new Date() })
        .where(
          and(
            eq(events.id, event.id),
            eq(events.status, "accepting_applications")
          )
        )
        .returning({ id: events.id });

      if (updated.length > 0) {
        closed += 1;
      }
    } catch (error) {
      console.error(`Failed to close applications for event ${event.id}:`, error);
    }
  }

  // Auto-publish floor plans whose lead-time threshold has been
  // reached. Only events with results already published are eligible
  // (the public floor plan viewer assumes assignments are visible).
  const autoPublishCandidates = await db
    .select({
      id: events.id,
      eventStartDate: events.eventStartDate,
      daysBefore: events.floorPlanAutoPublishDaysBefore,
    })
    .from(events)
    .where(
      and(
        eq(events.status, "results_published"),
        isNull(events.floorPlanPublishedAt),
        isNotNull(events.floorPlanAutoPublishDaysBefore)
      )
    );

  let floorPlansPublished = 0;
  for (const event of autoPublishCandidates) {
    // Drizzle's isNotNull filter keeps null rows out at runtime but
    // doesn't propagate to the inferred TS type — narrow explicitly.
    if (event.daysBefore === null) continue;
    // Compute trigger date in UTC: eventStartDate − N days. Compared
    // against today (also UTC), so the publish fires the day the
    // threshold is reached or any cron tick after.
    const startMs = Date.parse(`${event.eventStartDate}T00:00:00Z`);
    if (Number.isNaN(startMs)) continue;
    const triggerMs = startMs - event.daysBefore * 86_400_000;
    const triggerYmd = new Date(triggerMs).toISOString().slice(0, 10);
    if (triggerYmd > todayUtc) continue;

    try {
      const updated = await db
        .update(events)
        .set({
          floorPlanPublishedAt: new Date(),
          floorPlanAutoPublishDaysBefore: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(events.id, event.id),
            eq(events.status, "results_published"),
            isNull(events.floorPlanPublishedAt),
            eq(events.floorPlanAutoPublishDaysBefore, event.daysBefore)
          )
        )
        .returning({ id: events.id });

      if (updated.length > 0) {
        floorPlansPublished += 1;
      }
    } catch (error) {
      console.error(
        `Failed to auto-publish floor plan for event ${event.id}:`,
        error
      );
    }
  }

  return NextResponse.json({ opened, closed, floorPlansPublished });
}
