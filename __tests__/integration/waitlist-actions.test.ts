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
  demoteToWaitlist,
  removeFromWaitlist,
  promoteFromWaitlist,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/waitlist-actions";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import { conventions } from "@/lib/db/schema/conventions";
import { events } from "@/lib/db/schema/events";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Build a published event that seats `applicationId` on table t1 and a
// second accepted applicant on t2.
async function seatOnPlan(
  eventId: string,
  applicationId: string,
  otherApplicationId: string
) {
  await db
    .update(events)
    .set({
      floorPlan: {
        rooms: [
          { id: "r1", name: "Main", x: 0, y: 0, widthCm: 100, heightCm: 100 },
        ],
        tables: [
          {
            id: "t1",
            label: "A1",
            tableSizeOptionId: "s1",
            roomId: "r1",
            rotationDeg: 0,
            x: 0,
            y: 0,
            assignedApplicationId: applicationId,
          },
          {
            id: "t2",
            label: "A2",
            tableSizeOptionId: "s1",
            roomId: "r1",
            rotationDeg: 0,
            x: 10,
            y: 0,
            assignedApplicationId: otherApplicationId,
          },
        ],
        labels: [],
      },
    })
    .where(eq(events.id, eventId));
}

async function setup() {
  const { profile, convention } = await createTestOrganizer();
  await db
    .update(conventions)
    .set({ waitlistEnabled: true })
    .where(eq(conventions.id, convention.id));
  const event = await createTestEvent(convention.id, {
    status: "results_published",
  });
  const artist = await createTestArtist("seated@test.com", "Seated");
  const other = await createTestArtist("other@test.com", "Other");
  const app = await createTestApplication(event.id, artist.profile.id, {
    status: "accepted",
  });
  const otherApp = await createTestApplication(event.id, other.profile.id, {
    status: "accepted",
  });
  await seatOnPlan(event.id, app.id, otherApp.id);
  mockAuth.mockResolvedValue({
    user: { id: "u", role: "organizer", profileId: profile.id },
  });
  return { event, app, otherApp };
}

async function assignmentFor(eventId: string, tableId: string) {
  const [row] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));
  return (
    row.floorPlan?.tables.find((t) => t.id === tableId)
      ?.assignedApplicationId ?? null
  );
}

describe("waitlist actions", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("demoteToWaitlist clears the applicant's floor-plan seat", async () => {
    const { event, app, otherApp } = await setup();

    const result = await demoteToWaitlist(
      {},
      buildFormData({ applicationId: app.id, eventId: event.id })
    );

    expect(result.success).toBe(true);
    const [updated] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, app.id));
    expect(updated.status).toBe("waitlisted");
    expect(await assignmentFor(event.id, "t1")).toBeNull();
    // Co-seated applicant is untouched.
    expect(await assignmentFor(event.id, "t2")).toBe(otherApp.id);
  });

  it("removeFromWaitlist clears the applicant's floor-plan seat", async () => {
    const { event, app } = await setup();

    const result = await removeFromWaitlist(
      {},
      buildFormData({ applicationId: app.id, eventId: event.id })
    );

    expect(result.success).toBe(true);
    expect(await assignmentFor(event.id, "t1")).toBeNull();
  });

  it("promoteFromWaitlist keeps existing seats (no demotion)", async () => {
    const { event, app, otherApp } = await setup();

    const result = await promoteFromWaitlist(
      {},
      buildFormData({ applicationId: app.id, eventId: event.id })
    );

    expect(result.success).toBe(true);
    // Promotion is accepted→accepted here; seats stay intact.
    expect(await assignmentFor(event.id, "t1")).toBe(app.id);
    expect(await assignmentFor(event.id, "t2")).toBe(otherApp.id);
  });
});
