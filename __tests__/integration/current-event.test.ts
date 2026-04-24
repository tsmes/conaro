import { describe, it, expect, beforeEach } from "vitest";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
} from "../helpers/db";
import { getCurrentEventForConvention } from "@/lib/conventions/queries";

function iso(daysFromToday: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

describe("getCurrentEventForConvention", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("returns null when the convention has no events", async () => {
    const { convention } = await createTestOrganizer();
    expect(await getCurrentEventForConvention(convention.id)).toBeNull();
  });

  it("returns null when all events are in the past", async () => {
    const { convention } = await createTestOrganizer();
    await createTestEvent(convention.id, {
      eventStartDate: iso(-30),
      eventEndDate: iso(-28),
    });
    expect(await getCurrentEventForConvention(convention.id)).toBeNull();
  });

  it("returns an event whose start date is today", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      eventStartDate: iso(0),
    });
    const hit = await getCurrentEventForConvention(convention.id);
    expect(hit?.id).toBe(event.id);
  });

  it("picks the nearest upcoming event when multiple are in the future", async () => {
    const { convention } = await createTestOrganizer();
    const far = await createTestEvent(convention.id, {
      eventStartDate: iso(60),
      name: "far",
    });
    const soon = await createTestEvent(convention.id, {
      eventStartDate: iso(10),
      name: "soon",
    });
    const furthest = await createTestEvent(convention.id, {
      eventStartDate: iso(120),
      name: "furthest",
    });

    const hit = await getCurrentEventForConvention(convention.id);
    expect(hit?.id).toBe(soon.id);
    void far;
    void furthest;
  });

  it("ignores past events when a future event exists", async () => {
    const { convention } = await createTestOrganizer();
    await createTestEvent(convention.id, {
      eventStartDate: iso(-10),
      name: "past",
    });
    const future = await createTestEvent(convention.id, {
      eventStartDate: iso(5),
      name: "future",
    });
    const hit = await getCurrentEventForConvention(convention.id);
    expect(hit?.id).toBe(future.id);
  });

  it("includes an ongoing multi-day event whose start is in the past but whose end is today or later", async () => {
    const { convention } = await createTestOrganizer();
    const ongoing = await createTestEvent(convention.id, {
      eventStartDate: iso(-1),
      eventEndDate: iso(2),
      name: "ongoing",
    });
    // And a future event that starts later — shouldn't beat the ongoing one.
    await createTestEvent(convention.id, {
      eventStartDate: iso(30),
      eventEndDate: iso(31),
      name: "later",
    });
    const hit = await getCurrentEventForConvention(convention.id);
    expect(hit?.id).toBe(ongoing.id);
  });

  it("excludes a multi-day event that already ended", async () => {
    const { convention } = await createTestOrganizer();
    await createTestEvent(convention.id, {
      eventStartDate: iso(-10),
      eventEndDate: iso(-5),
    });
    expect(await getCurrentEventForConvention(convention.id)).toBeNull();
  });

  it("scopes to the given convention", async () => {
    const { convention: conA } = await createTestOrganizer();
    const { convention: conB } = await createTestOrganizer(
      "other@test.com",
      "Other con"
    );
    await createTestEvent(conB.id, { eventStartDate: iso(5) });
    expect(await getCurrentEventForConvention(conA.id)).toBeNull();
  });
});
