import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";

import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
  buildFormData,
} from "../helpers/db";
import { saveProgramme } from "@/app/(authenticated)/conventions/manage/events/[eventId]/programme/actions";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const VALID_ITEM = {
  id: "p1",
  date: "2026-07-15",
  startTime: "10:00",
  endTime: "11:00",
  title: "Welcome talk",
  room: "Stage",
  speaker: "Lena",
};

describe("saveProgramme", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  async function setupAuthorized() {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      eventStartDate: "2026-07-15",
      eventEndDate: "2026-07-16",
    });
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });
    return event;
  }

  it("rejects unauthenticated callers", async () => {
    mockAuth.mockResolvedValue(null);
    const event = await setupAuthorizedThenLogout();
    const result = await saveProgramme(
      {},
      buildFormData({
        eventId: event.id,
        programme: JSON.stringify([VALID_ITEM]),
      })
    );
    expect(result.error).toBe("Unauthorized");
  });

  async function setupAuthorizedThenLogout() {
    const { convention } = await createTestOrganizer();
    return createTestEvent(convention.id, {
      eventStartDate: "2026-07-15",
      eventEndDate: "2026-07-16",
    });
  }

  it("writes a valid programme", async () => {
    const event = await setupAuthorized();
    const result = await saveProgramme(
      {},
      buildFormData({
        eventId: event.id,
        programme: JSON.stringify([VALID_ITEM]),
      })
    );
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ programme: events.programme })
      .from(events)
      .where(eq(events.id, event.id));
    expect(Array.isArray(row.programme)).toBe(true);
    expect(row.programme).toHaveLength(1);
    expect(row.programme?.[0]?.title).toBe("Welcome talk");
  });

  it("clears the programme when given an empty array", async () => {
    const event = await setupAuthorized();
    // First save a valid item.
    await saveProgramme(
      {},
      buildFormData({
        eventId: event.id,
        programme: JSON.stringify([VALID_ITEM]),
      })
    );
    // Then save empty.
    const result = await saveProgramme(
      {},
      buildFormData({ eventId: event.id, programme: "[]" })
    );
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ programme: events.programme })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row.programme).toBeNull();
  });

  it("rejects calendar-invalid dates like 2026-13-99", async () => {
    const event = await setupAuthorized();
    const result = await saveProgramme(
      {},
      buildFormData({
        eventId: event.id,
        programme: JSON.stringify([
          { ...VALID_ITEM, date: "2026-13-99" },
        ]),
      })
    );
    expect(result.fieldErrors?.["0.date"]).toBeDefined();
  });

  it("normalises empty optional fields to undefined", async () => {
    const event = await setupAuthorized();
    await saveProgramme(
      {},
      buildFormData({
        eventId: event.id,
        programme: JSON.stringify([
          {
            id: "p1",
            date: "2026-07-15",
            startTime: "10:00",
            title: "Welcome",
            endTime: "",
            room: "",
            speaker: "",
          },
        ]),
      })
    );
    const [row] = await db
      .select({ programme: events.programme })
      .from(events)
      .where(eq(events.id, event.id));
    const stored = row.programme?.[0];
    expect(stored?.endTime).toBeUndefined();
    expect(stored?.room).toBeUndefined();
    expect(stored?.speaker).toBeUndefined();
  });

  it("rejects items with bad time format", async () => {
    const event = await setupAuthorized();
    const result = await saveProgramme(
      {},
      buildFormData({
        eventId: event.id,
        programme: JSON.stringify([
          { ...VALID_ITEM, startTime: "10am" },
        ]),
      })
    );
    expect(result.fieldErrors?.["0.startTime"]).toBeDefined();
  });

  it("rejects items where endTime <= startTime", async () => {
    const event = await setupAuthorized();
    const result = await saveProgramme(
      {},
      buildFormData({
        eventId: event.id,
        programme: JSON.stringify([
          { ...VALID_ITEM, startTime: "11:00", endTime: "10:00" },
        ]),
      })
    );
    expect(result.fieldErrors?.["0.endTime"]).toBeDefined();
  });

  it("rejects items dated outside the event range", async () => {
    const event = await setupAuthorized();
    const result = await saveProgramme(
      {},
      buildFormData({
        eventId: event.id,
        programme: JSON.stringify([
          { ...VALID_ITEM, date: "2026-08-01" },
        ]),
      })
    );
    expect(result.fieldErrors?.["0.date"]).toBeDefined();
    expect(result.fieldErrors?.["0.date"]?.[0]).toMatch(/event/i);
  });

  it("rejects malformed JSON payload", async () => {
    const event = await setupAuthorized();
    const result = await saveProgramme(
      {},
      buildFormData({ eventId: event.id, programme: "not json" })
    );
    expect(result.error).toMatch(/invalid programme/i);
  });
});
