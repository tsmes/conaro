import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";

import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
  buildFormData,
} from "../helpers/db";
import { saveGuests } from "@/app/(authenticated)/conventions/manage/events/[eventId]/guests/actions";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";

const mockAuth = vi.fn();
const mockStorageDelete = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: () => mockAuth() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/storage", () => ({
  storage: {
    delete: (...args: unknown[]) => mockStorageDelete(...args),
    upload: vi.fn(),
    getUrl: (key: string) => `/api/uploads/${key}`,
  },
}));

const VALID_GUEST = {
  id: "g1",
  name: "Maya Kallio",
  title: "Guest of honour",
  role: "Cartoonist · Helsinki",
  pronouns: "she/her",
  bio: "Quiet plant-strewn comics about loneliness.",
  websiteUrl: "https://example.com",
  socialLinks: [{ type: "Instagram", url: "https://instagram.com/maya" }],
};

describe("saveGuests", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
    mockStorageDelete.mockResolvedValue(undefined);
  });

  async function setupAuthorized() {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });
    return event;
  }

  it("rejects unauthenticated callers", async () => {
    mockAuth.mockResolvedValue(null);
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const result = await saveGuests(
      {},
      buildFormData({
        eventId: event.id,
        guests: JSON.stringify([VALID_GUEST]),
      })
    );
    expect(result.error).toBe("Unauthorized");
  });

  it("writes a valid guests list", async () => {
    const event = await setupAuthorized();
    const result = await saveGuests(
      {},
      buildFormData({
        eventId: event.id,
        guests: JSON.stringify([VALID_GUEST]),
      })
    );
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ guests: events.guests })
      .from(events)
      .where(eq(events.id, event.id));
    expect(Array.isArray(row.guests)).toBe(true);
    expect(row.guests).toHaveLength(1);
    expect(row.guests?.[0]?.name).toBe("Maya Kallio");
  });

  it("clears guests to null when given an empty array", async () => {
    const event = await setupAuthorized();
    await saveGuests(
      {},
      buildFormData({
        eventId: event.id,
        guests: JSON.stringify([VALID_GUEST]),
      })
    );
    const result = await saveGuests(
      {},
      buildFormData({ eventId: event.id, guests: "[]" })
    );
    expect(result.success).toBe(true);

    const [row] = await db
      .select({ guests: events.guests })
      .from(events)
      .where(eq(events.id, event.id));
    expect(row.guests).toBeNull();
  });

  it("normalises empty optional fields to undefined", async () => {
    const event = await setupAuthorized();
    await saveGuests(
      {},
      buildFormData({
        eventId: event.id,
        guests: JSON.stringify([
          {
            ...VALID_GUEST,
            role: "",
            pronouns: "",
            bio: "",
            imagePath: "",
            websiteUrl: "",
          },
        ]),
      })
    );
    const [row] = await db
      .select({ guests: events.guests })
      .from(events)
      .where(eq(events.id, event.id));
    const stored = row.guests?.[0];
    expect(stored?.role).toBeUndefined();
    expect(stored?.pronouns).toBeUndefined();
    expect(stored?.bio).toBeUndefined();
    expect(stored?.imagePath).toBeUndefined();
    expect(stored?.websiteUrl).toBeUndefined();
  });

  it("rejects social links with non-http/mailto schemes", async () => {
    const event = await setupAuthorized();
    const result = await saveGuests(
      {},
      buildFormData({
        eventId: event.id,
        guests: JSON.stringify([
          {
            ...VALID_GUEST,
            socialLinks: [
              { type: "Sneaky", url: "javascript:alert(1)" },
            ],
          },
        ]),
      })
    );
    expect(result.fieldErrors?.["0.socialLinks.0.url"]).toBeDefined();
  });

  it("rejects guests with empty name", async () => {
    const event = await setupAuthorized();
    const result = await saveGuests(
      {},
      buildFormData({
        eventId: event.id,
        guests: JSON.stringify([{ ...VALID_GUEST, name: "" }]),
      })
    );
    expect(result.fieldErrors?.["0.name"]).toBeDefined();
  });

  it("rejects guests with malformed website URL", async () => {
    const event = await setupAuthorized();
    const result = await saveGuests(
      {},
      buildFormData({
        eventId: event.id,
        guests: JSON.stringify([
          { ...VALID_GUEST, websiteUrl: "not-a-url" },
        ]),
      })
    );
    expect(result.fieldErrors?.["0.websiteUrl"]).toBeDefined();
  });

  it("deletes storage keys orphaned by a save", async () => {
    const event = await setupAuthorized();
    const removedPath = `events/${event.id}/guests/g1.webp`;
    await saveGuests(
      {},
      buildFormData({
        eventId: event.id,
        guests: JSON.stringify([{ ...VALID_GUEST, imagePath: removedPath }]),
      })
    );
    mockStorageDelete.mockClear();

    const replacedPath = `events/${event.id}/guests/g1.v2.webp`;
    await saveGuests(
      {},
      buildFormData({
        eventId: event.id,
        guests: JSON.stringify([{ ...VALID_GUEST, imagePath: replacedPath }]),
      })
    );

    expect(mockStorageDelete).toHaveBeenCalledWith(removedPath);
  });

  it("leaves storage alone for paths outside this event's guests dir", async () => {
    const event = await setupAuthorized();
    const sneakyPath = `events/other-event/guests/g1.webp`;
    // Seed the event with the suspicious path. (Bypass the action's
    // validation by writing directly — simulates a bug or rogue
    // payload that landed in the DB before this guard existed.)
    await db
      .update(events)
      .set({
        guests: [{ ...VALID_GUEST, imagePath: sneakyPath }],
      })
      .where(eq(events.id, event.id));

    await saveGuests(
      {},
      buildFormData({ eventId: event.id, guests: "[]" })
    );

    expect(mockStorageDelete).not.toHaveBeenCalled();
  });
});
