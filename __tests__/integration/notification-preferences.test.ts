import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestArtist,
  createTestOrganizer,
  buildFormData,
} from "../helpers/db";
import { updateNotificationPreferences } from "@/app/settings/notifications/actions";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema/notifications";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("updateNotificationPreferences", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("saves artist preferences", async () => {
    const artist = await createTestArtist();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const formData = buildFormData({
      email_event_opened: "on",
      email_results_published: "on",
    });

    const result = await updateNotificationPreferences({}, formData);
    expect(result.success).toBe(true);

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.profileId, artist.profile.id));

    // Should have entries for all 4 artist types
    expect(prefs).toHaveLength(4);

    const eventOpenedPref = prefs.find(
      (p) => p.notificationType === "event_opened"
    );
    expect(eventOpenedPref?.emailEnabled).toBe(true);

    const resultsPublishedPref = prefs.find(
      (p) => p.notificationType === "results_published"
    );
    expect(resultsPublishedPref?.emailEnabled).toBe(true);

    const newEventPref = prefs.find(
      (p) => p.notificationType === "new_event"
    );
    expect(newEventPref?.emailEnabled).toBe(false);
  });

  it("saves organizer preferences", async () => {
    const { profile } = await createTestOrganizer();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const formData = buildFormData({
      email_new_application: "on",
    });

    const result = await updateNotificationPreferences({}, formData);
    expect(result.success).toBe(true);

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.profileId, profile.id));

    expect(prefs).toHaveLength(1);
    expect(prefs[0].notificationType).toBe("new_application");
    expect(prefs[0].emailEnabled).toBe(true);
  });

  it("updates existing preferences on re-save", async () => {
    const artist = await createTestArtist();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    // Save with email on
    await updateNotificationPreferences(
      {},
      buildFormData({ email_event_opened: "on" })
    );

    // Save with email off
    await updateNotificationPreferences({}, buildFormData({}));

    const prefs = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.profileId, artist.profile.id));

    const eventOpenedPref = prefs.find(
      (p) => p.notificationType === "event_opened"
    );
    expect(eventOpenedPref?.emailEnabled).toBe(false);
  });
});
