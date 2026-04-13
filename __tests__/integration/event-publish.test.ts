import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  createTestEvent,
  findNotificationsByProfileId,
  buildFormData,
} from "../helpers/db";
import { publishEvent } from "@/app/conventions/manage/events/actions";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { conventionFollows } from "@/lib/db/schema/convention-follows";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("publishEvent", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("transitions draft to published when both dates are set", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "draft",
      applicationOpenDate: "2026-06-01",
      applicationCloseDate: "2026-06-30",
    });

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await publishEvent(
      {},
      buildFormData({ eventId: event.id })
    );
    expect(result.success).toBe(true);

    const [updated] = await db
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(updated.status).toBe("published");
  });

  it("rejects publish when applicationOpenDate is missing", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "draft",
      applicationOpenDate: null,
      applicationCloseDate: "2026-06-30",
    });

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await publishEvent(
      {},
      buildFormData({ eventId: event.id })
    );
    expect(result.error).toContain("date");
  });

  it("rejects publish when applicationCloseDate is missing", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "draft",
      applicationOpenDate: "2026-06-01",
      applicationCloseDate: null,
    });

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await publishEvent(
      {},
      buildFormData({ eventId: event.id })
    );
    expect(result.error).toContain("date");
  });

  it("rejects publish when event is not in draft status", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "accepting_applications",
      applicationOpenDate: "2026-06-01",
      applicationCloseDate: "2026-06-30",
    });

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await publishEvent(
      {},
      buildFormData({ eventId: event.id })
    );
    expect(result.error).toContain("draft");
  });

  it("rejects non-organizer", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, { status: "draft" });
    const artist = await createTestArtist();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await publishEvent(
      {},
      buildFormData({ eventId: event.id })
    );
    expect(result.error).toBe("Unauthorized");
  });

  it("creates notifications for followers when published", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "draft",
      applicationOpenDate: "2026-06-01",
      applicationCloseDate: "2026-06-30",
    });
    const artist = await createTestArtist();

    await db.insert(conventionFollows).values({
      profileId: artist.profile.id,
      conventionId: convention.id,
    });

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    await publishEvent({}, buildFormData({ eventId: event.id }));

    const notifs = await findNotificationsByProfileId(artist.profile.id);
    expect(notifs).toHaveLength(1);
    expect(notifs[0].type).toBe("event_published");
  });
});
