import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  createTestEvent,
  createTestApplication,
  buildFormData,
} from "../helpers/db";
import {
  setApplicationDecision,
  publishResults,
  updateResponseTemplates,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import { events } from "@/lib/db/schema/events";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("publishResults", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("publishes when all applications have decisions", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "reviewing",
    });
    const artist1 = await createTestArtist("a1@test.com", "Artist 1");
    const artist2 = await createTestArtist("a2@test.com", "Artist 2");

    const app1 = await createTestApplication(event.id, artist1.profile.id);
    const app2 = await createTestApplication(event.id, artist2.profile.id);

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    // Accept one, reject one
    await setApplicationDecision(
      {},
      buildFormData({
        applicationId: app1.id,
        eventId: event.id,
        decision: "accepted",
      })
    );
    await setApplicationDecision(
      {},
      buildFormData({
        applicationId: app2.id,
        eventId: event.id,
        decision: "rejected",
      })
    );

    const result = await publishResults(
      {},
      buildFormData({ eventId: event.id })
    );
    expect(result.success).toBe(true);

    // Verify event status changed
    const [updatedEvent] = await db
      .select()
      .from(events)
      .where(eq(events.id, event.id));
    expect(updatedEvent.status).toBe("results_published");
  });

  it("rejects publish when undecided applications exist", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "reviewing",
    });
    const artist = await createTestArtist();
    await createTestApplication(event.id, artist.profile.id);

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await publishResults(
      {},
      buildFormData({ eventId: event.id })
    );
    expect(result.error).toContain("1 application(s) still need a decision");
  });

  it("sets response messages from templates on publish", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "reviewing",
    });

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    // Set templates
    await updateResponseTemplates(
      {},
      buildFormData({
        eventId: event.id,
        acceptanceMessage: "Welcome aboard!",
        rejectionMessage: "Sorry, not this time.",
      })
    );

    const artist1 = await createTestArtist("a1@test.com", "Artist 1");
    const artist2 = await createTestArtist("a2@test.com", "Artist 2");

    const app1 = await createTestApplication(event.id, artist1.profile.id);
    const app2 = await createTestApplication(event.id, artist2.profile.id);

    await setApplicationDecision(
      {},
      buildFormData({
        applicationId: app1.id,
        eventId: event.id,
        decision: "accepted",
      })
    );
    await setApplicationDecision(
      {},
      buildFormData({
        applicationId: app2.id,
        eventId: event.id,
        decision: "rejected",
      })
    );

    await publishResults({}, buildFormData({ eventId: event.id }));

    const [updatedApp1] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, app1.id));
    expect(updatedApp1.responseMessage).toBe("Welcome aboard!");

    const [updatedApp2] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, app2.id));
    expect(updatedApp2.responseMessage).toBe("Sorry, not this time.");
  });

  it("preserves Markdown syntax and substitutes placeholders in stored responseMessage", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "reviewing",
    });

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    await updateResponseTemplates(
      {},
      buildFormData({
        eventId: event.id,
        acceptanceMessage: "Hi **{{ artist_name }}**, welcome!",
        rejectionMessage: "Thanks for applying.",
      })
    );

    const artist = await createTestArtist("elena@test.com", "Elena");
    const app = await createTestApplication(event.id, artist.profile.id);
    await setApplicationDecision(
      {},
      buildFormData({
        applicationId: app.id,
        eventId: event.id,
        decision: "accepted",
      })
    );
    await publishResults({}, buildFormData({ eventId: event.id }));

    const [updated] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, app.id));
    // The Markdown markers survive template rendering; Elena's name is
    // substituted. The read-side renderer (public event page) applies the
    // Markdown formatting; the DB just holds the raw source.
    expect(updated.responseMessage).toBe("Hi **Elena**, welcome!");
  });

  it("rejects publish for non-reviewing events", async () => {
    const { profile, convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      status: "accepting_applications",
    });

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await publishResults(
      {},
      buildFormData({ eventId: event.id })
    );
    expect(result.error).toContain("reviewing");
  });
});
