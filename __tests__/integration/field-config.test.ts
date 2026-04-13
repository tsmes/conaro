import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cleanDatabase,
  createTestOrganizer,
  findEventsByConventionId,
  buildFormData,
} from "../helpers/db";
import { createEvent } from "@/app/(authenticated)/conventions/manage/events/actions";
import { updateFieldConfig } from "@/app/(authenticated)/conventions/manage/events/[eventId]/fields/actions";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { FieldRequirements } from "@/lib/db/schema/events";
import { eq } from "drizzle-orm";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("updateFieldConfig", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  async function setupEventForOrganizer() {
    const { profile, convention } = await createTestOrganizer();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    await createEvent(
      {},
      buildFormData({ name: "Test Event", eventStartDate: "2026-07-01" })
    );

    const eventList = await findEventsByConventionId(convention.id);
    return { profile, convention, event: eventList[0] };
  }

  it("saves field requirements for all registry fields", async () => {
    const { event } = await setupEventForOrganizer();

    const formData = buildFormData({
      eventId: event.id,
      displayName: "required",
      realName: "optional",
      contactEmail: "required",
      phone: "not_requested",
      bio: "optional",
      websiteUrl: "not_requested",
      socialLinks: "not_requested",
      helpers: "optional",
      accessibilityNeeds: "not_requested",
      tableSizePreference: "not_requested",
      notes: "not_requested",
      portfolioImages: "required",
      minPortfolioImages: "3",
    });

    const result = await updateFieldConfig({}, formData);
    expect(result.success).toBe(true);

    const [updated] = await db
      .select()
      .from(events)
      .where(eq(events.id, event.id));

    const reqs = updated.fieldRequirements as FieldRequirements;
    expect(reqs.displayName).toBe("required");
    expect(reqs.realName).toBe("optional");
    expect(reqs.bio).toBe("optional");
    expect(reqs.phone).toBe("not_requested");
    expect(reqs.portfolioImages).toBe("required");
    expect(updated.minPortfolioImages).toBe(3);
  });

  it("returns error for invalid event", async () => {
    const { profile } = await createTestOrganizer();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const formData = buildFormData({
      eventId: "non-existent",
      displayName: "required",
      minPortfolioImages: "0",
    });

    const result = await updateFieldConfig({}, formData);
    expect(result.error).toBe("Event not found");
  });
});
