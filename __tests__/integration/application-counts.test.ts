import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestEvent,
  createTestArtist,
  createTestApplication,
} from "../helpers/db";
import { getApplicationCounts } from "@/lib/conventions/queries";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";

describe("getApplicationCounts", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("returns zeros when there are no applications", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const counts = await getApplicationCounts(event.id);
    expect(counts).toEqual({ total: 0, accepted: 0 });
  });

  it("counts total + accepted across mixed statuses", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const a1 = await createTestArtist("a1@test.com", "A1");
    const a2 = await createTestArtist("a2@test.com", "A2");
    const a3 = await createTestArtist("a3@test.com", "A3");
    const app1 = await createTestApplication(event.id, a1.profile.id);
    const app2 = await createTestApplication(event.id, a2.profile.id);
    const app3 = await createTestApplication(event.id, a3.profile.id);
    await db
      .update(applications)
      .set({ status: "accepted" })
      .where(eq(applications.id, app1.id));
    await db
      .update(applications)
      .set({ status: "rejected" })
      .where(eq(applications.id, app2.id));
    // app3 stays submitted
    void app3;

    const counts = await getApplicationCounts(event.id);
    expect(counts).toEqual({ total: 3, accepted: 1 });
  });

  it("scopes counts to the given event only", async () => {
    const { convention } = await createTestOrganizer();
    const eventA = await createTestEvent(convention.id);
    const eventB = await createTestEvent(convention.id);
    const artist = await createTestArtist();

    const appA = await createTestApplication(eventA.id, artist.profile.id);
    await db
      .update(applications)
      .set({ status: "accepted" })
      .where(eq(applications.id, appA.id));

    // eventB gets no applications.
    const countsA = await getApplicationCounts(eventA.id);
    const countsB = await getApplicationCounts(eventB.id);
    expect(countsA).toEqual({ total: 1, accepted: 1 });
    expect(countsB).toEqual({ total: 0, accepted: 0 });
  });
});
