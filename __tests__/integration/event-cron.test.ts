import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
} from "../helpers/db";
import { GET } from "@/app/api/cron/events/tick/route";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("http://localhost:3000/api/cron/events/tick", {
    headers,
  });
}

describe("cron /api/cron/events/tick", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("returns 401 without authorization header", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("returns 401 with wrong secret", async () => {
    const response = await GET(makeRequest("Bearer wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("transitions published events to accepting_applications when open date reached", async () => {
    const { convention } = await createTestOrganizer();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const event = await createTestEvent(convention.id, {
      status: "published",
      applicationOpenDate: yesterday,
      applicationCloseDate: tomorrow,
    });

    const secret = process.env.CRON_SECRET!;
    const response = await GET(makeRequest(`Bearer ${secret}`));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.opened).toBe(1);

    const [updated] = await db
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(updated.status).toBe("accepting_applications");
  });

  it("transitions accepting_applications to reviewing when close date has passed", async () => {
    const { convention } = await createTestOrganizer();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const event = await createTestEvent(convention.id, {
      status: "accepting_applications",
      applicationOpenDate: twoDaysAgo,
      applicationCloseDate: yesterday,
    });

    const secret = process.env.CRON_SECRET!;
    const response = await GET(makeRequest(`Bearer ${secret}`));
    const data = await response.json();
    expect(data.closed).toBe(1);

    const [updated] = await db
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(updated.status).toBe("reviewing");
  });

  it("does not transition events whose dates have not arrived", async () => {
    const { convention } = await createTestOrganizer();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const event = await createTestEvent(convention.id, {
      status: "published",
      applicationOpenDate: tomorrow,
      applicationCloseDate: nextWeek,
    });

    const secret = process.env.CRON_SECRET!;
    const response = await GET(makeRequest(`Bearer ${secret}`));
    const data = await response.json();
    expect(data.opened).toBe(0);

    const [updated] = await db
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(updated.status).toBe("published");
  });

  it("is idempotent — running twice does not double-transition", async () => {
    const { convention } = await createTestOrganizer();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const event = await createTestEvent(convention.id, {
      status: "published",
      applicationOpenDate: yesterday,
      applicationCloseDate: tomorrow,
    });

    const secret = process.env.CRON_SECRET!;
    await GET(makeRequest(`Bearer ${secret}`));
    const secondResponse = await GET(makeRequest(`Bearer ${secret}`));
    const secondData = await secondResponse.json();
    expect(secondData.opened).toBe(0);
    expect(secondData.closed).toBe(0);

    const [updated] = await db
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(updated.status).toBe("accepting_applications");
  });

  describe("heartbeat log line", () => {
    it("logs a single info line with the run counters when work is performed", async () => {
      const { convention } = await createTestOrganizer();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      await createTestEvent(convention.id, {
        status: "published",
        applicationOpenDate: yesterday,
        applicationCloseDate: tomorrow,
      });

      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      try {
        const secret = process.env.CRON_SECRET!;
        const response = await GET(makeRequest(`Bearer ${secret}`));
        expect(response.status).toBe(200);

        const matchingCalls = infoSpy.mock.calls.filter(
          (args) =>
            typeof args[0] === "string" &&
            args[0].startsWith("[cron/events/tick]")
        );
        expect(matchingCalls).toHaveLength(1);
        const line = matchingCalls[0][0];
        expect(line).toContain("opened=1");
        expect(line).toContain("closed=0");
        expect(line).toContain("floorPlansPublished=0");
      } finally {
        infoSpy.mockRestore();
      }
    });

    it("logs the heartbeat line on no-op runs (all counters zero)", async () => {
      const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      try {
        const secret = process.env.CRON_SECRET!;
        const response = await GET(makeRequest(`Bearer ${secret}`));
        expect(response.status).toBe(200);

        const matchingCalls = infoSpy.mock.calls.filter(
          (args) =>
            typeof args[0] === "string" &&
            args[0].startsWith("[cron/events/tick]")
        );
        expect(matchingCalls).toHaveLength(1);
        const line = matchingCalls[0][0];
        expect(line).toContain("opened=0");
        expect(line).toContain("closed=0");
        expect(line).toContain("floorPlansPublished=0");
      } finally {
        infoSpy.mockRestore();
      }
    });
  });

  describe("auto-publish floor plan", () => {
    function ymdOffset(days: number): string {
      return new Date(Date.now() + days * 86_400_000)
        .toISOString()
        .slice(0, 10);
    }

    it("publishes the plan when the lead-time threshold has been reached", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
        eventStartDate: ymdOffset(1),
        floorPlanAutoPublishDaysBefore: 1,
      });

      const secret = process.env.CRON_SECRET!;
      const response = await GET(makeRequest(`Bearer ${secret}`));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.floorPlansPublished).toBe(1);

      const [row] = await db
        .select({
          publishedAt: events.floorPlanPublishedAt,
          daysBefore: events.floorPlanAutoPublishDaysBefore,
        })
        .from(events)
        .where(eq(events.id, event.id));
      expect(row.publishedAt).toBeInstanceOf(Date);
      expect(row.daysBefore).toBeNull();
    });

    it("does not publish before the lead-time threshold", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "results_published",
        eventStartDate: ymdOffset(5),
        floorPlanAutoPublishDaysBefore: 1,
      });

      const secret = process.env.CRON_SECRET!;
      const response = await GET(makeRequest(`Bearer ${secret}`));
      const data = await response.json();
      expect(data.floorPlansPublished).toBe(0);

      const [row] = await db
        .select({ publishedAt: events.floorPlanPublishedAt })
        .from(events)
        .where(eq(events.id, event.id));
      expect(row.publishedAt).toBeNull();
    });

    it("does not publish for events that aren't yet results_published", async () => {
      const { convention } = await createTestOrganizer();
      const event = await createTestEvent(convention.id, {
        status: "reviewing",
        eventStartDate: ymdOffset(1),
        floorPlanAutoPublishDaysBefore: 3,
      });

      const secret = process.env.CRON_SECRET!;
      const response = await GET(makeRequest(`Bearer ${secret}`));
      const data = await response.json();
      expect(data.floorPlansPublished).toBe(0);

      const [row] = await db
        .select({ publishedAt: events.floorPlanPublishedAt })
        .from(events)
        .where(eq(events.id, event.id));
      expect(row.publishedAt).toBeNull();
    });

    it("does not re-publish a plan that's already public", async () => {
      const { convention } = await createTestOrganizer();
      const alreadyPublishedAt = new Date("2026-01-01");
      const event = await createTestEvent(convention.id, {
        status: "results_published",
        eventStartDate: ymdOffset(1),
        floorPlanPublishedAt: alreadyPublishedAt,
        floorPlanAutoPublishDaysBefore: 1,
      });

      const secret = process.env.CRON_SECRET!;
      const response = await GET(makeRequest(`Bearer ${secret}`));
      const data = await response.json();
      expect(data.floorPlansPublished).toBe(0);

      const [row] = await db
        .select({ publishedAt: events.floorPlanPublishedAt })
        .from(events)
        .where(eq(events.id, event.id));
      // Original timestamp is preserved.
      expect(row.publishedAt?.toISOString()).toBe(
        alreadyPublishedAt.toISOString()
      );
    });
  });
});
