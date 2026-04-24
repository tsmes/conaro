import { describe, it, expect, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  createTestEvent,
  findApplicationsByEventId,
  buildFormData,
} from "../helpers/db";
import { applyToEvent } from "@/app/(public)/events/[eventId]/actions";
import { db } from "@/lib/db";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { conventionArtistLists } from "@/lib/db/schema/convention-artist-lists";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import type { ProfileSnapshot } from "@/lib/db/schema/applications";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  storage: {
    copy: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    getUrl: vi.fn((key: string) => `/api/uploads/${key}`),
  },
}));

describe("applyToEvent", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  async function setupArtistWithProfile(email = "artist@test.com") {
    const artist = await createTestArtist(email);
    // Fill in required profile fields
    await db
      .update(artistProfiles)
      .set({ contactEmail: email })
      .where(eq(artistProfiles.profileId, artist.profile.id));
    return artist;
  }

  it("creates application with profile snapshot on happy path", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await setupArtistWithProfile();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await applyToEvent({}, buildFormData({ eventId: event.id, guidelinesAcknowledged: "true" }));
    expect(result.success).toBe(true);

    const apps = await findApplicationsByEventId(event.id);
    expect(apps).toHaveLength(1);
    expect(apps[0].profileId).toBe(artist.profile.id);
    expect(apps[0].status).toBe("submitted");

    const snapshot = apps[0].profileSnapshot as ProfileSnapshot;
    expect(snapshot.displayName).toBe("Test Artist");
    expect(snapshot.contactEmail).toBe("artist@test.com");
    expect(snapshot.genres).toEqual([]);
    expect(snapshot.mediums).toEqual([]);
  });

  it("captures genres and mediums in the profile snapshot", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await setupArtistWithProfile();
    await db
      .update(artistProfiles)
      .set({ genres: ["Comics", "Zines"], mediums: ["Ink", "Risograph"] })
      .where(eq(artistProfiles.profileId, artist.profile.id));

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await applyToEvent({}, buildFormData({ eventId: event.id, guidelinesAcknowledged: "true" }));
    expect(result.success).toBe(true);

    const apps = await findApplicationsByEventId(event.id);
    const snapshot = apps[0].profileSnapshot as ProfileSnapshot;
    expect(snapshot.genres).toEqual(["Comics", "Zines"]);
    expect(snapshot.mediums).toEqual(["Ink", "Risograph"]);
  });

  it("snapshots portfolio image captions into profileSnapshot.images", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await setupArtistWithProfile();

    await db.insert(portfolioImages).values([
      {
        id: "img-promo-1",
        profileId: artist.profile.id,
        filename: "promo.webp",
        storagePath: `portfolios/${artist.profile.id}/img-promo-1.webp`,
        mimeType: "image/webp",
        width: 800,
        height: 600,
        sortOrder: 0,
        section: "promo",
        caption: "Booth 2024 at Kawaiicon",
      },
      {
        id: "img-product-1",
        profileId: artist.profile.id,
        filename: "product.webp",
        storagePath: `portfolios/${artist.profile.id}/img-product-1.webp`,
        mimeType: "image/webp",
        width: 800,
        height: 600,
        sortOrder: 1,
        section: "product",
        caption: null,
      },
    ]);

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await applyToEvent(
      {},
      buildFormData({ eventId: event.id, guidelinesAcknowledged: "true" })
    );
    expect(result.success).toBe(true);

    const apps = await findApplicationsByEventId(event.id);
    const snapshot = apps[0].profileSnapshot as ProfileSnapshot;
    expect(snapshot.images).toHaveLength(2);
    const promo = snapshot.images.find((i) => i.id === "img-promo-1");
    const product = snapshot.images.find((i) => i.id === "img-product-1");
    expect(promo?.caption).toBe("Booth 2024 at Kawaiicon");
    expect(product?.caption).toBeNull();
  });

  it("rejects when event is not accepting applications", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, { status: "draft" });
    const artist = await setupArtistWithProfile();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await applyToEvent({}, buildFormData({ eventId: event.id, guidelinesAcknowledged: "true" }));
    expect(result.error).toContain("not currently accepting");
  });

  it("rejects duplicate application to same event", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await setupArtistWithProfile();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    await applyToEvent({}, buildFormData({ eventId: event.id, guidelinesAcknowledged: "true" }));
    const result = await applyToEvent(
      {},
      buildFormData({ eventId: event.id, guidelinesAcknowledged: "true" })
    );
    expect(result.error).toContain("already applied");
  });

  it("returns missing fields when profile is incomplete", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      fieldRequirements: {
        displayName: "required",
        contactEmail: "required",
        bio: "required",
        realName: "not_requested",
        phone: "not_requested",
        websiteUrl: "not_requested",
        socialLinks: "not_requested",
        helpers: "not_requested",
        accessibilityNeeds: "not_requested",
        notes: "not_requested",
        portfolioImages: "not_requested",
      },
    });
    const artist = await setupArtistWithProfile();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await applyToEvent({}, buildFormData({ eventId: event.id, guidelinesAcknowledged: "true" }));
    expect(result.error).toBe("missing_fields");
    expect(result.missingFields).toBeDefined();
    expect(result.missingFields!.some((f) => f.key === "bio")).toBe(true);
  });

  it("sets isBlockListed when artist is on block list", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await setupArtistWithProfile();

    // Block the artist
    await db.insert(conventionArtistLists).values({
      conventionId: convention.id,
      profileId: artist.profile.id,
      listType: "block",
    });

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await applyToEvent({}, buildFormData({ eventId: event.id, guidelinesAcknowledged: "true" }));
    expect(result.success).toBe(true);

    const apps = await findApplicationsByEventId(event.id);
    expect(apps[0].isBlockListed).toBe(true);
  });

  it("blocks submission when guidelines are not acknowledged", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id);
    const artist = await setupArtistWithProfile();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await applyToEvent(
      {},
      buildFormData({ eventId: event.id })
    );
    expect(result.error).toContain("read and understood");

    const apps = await findApplicationsByEventId(event.id);
    expect(apps).toHaveLength(0);
  });

  it("persists application answers and the acknowledgment timestamp", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [
        { id: "size-a", label: "Standard", priceNok: 280 },
      ],
      maxAssistants: 1,
      assistantFeeNok: 300,
      fieldRequirements: {
        displayName: "required",
        contactEmail: "required",
        realName: "not_requested",
        phone: "not_requested",
        bio: "not_requested",
        websiteUrl: "not_requested",
        socialLinks: "not_requested",
        helpers: "not_requested",
        accessibilityNeeds: "not_requested",
        notes: "not_requested",
        portfolioImages: "not_requested",
        tableSize: "required",
        assistants: "optional",
        sharingStand: "optional",
        placementPreference: "optional",
        additionalComments: "optional",
        promotionConsent: "optional",
      },
    });
    const artist = await setupArtistWithProfile();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await applyToEvent(
      {},
      buildFormData({
        eventId: event.id,
        guidelinesAcknowledged: "true",
        answers: JSON.stringify({
          tableSizeOptionId: "size-a",
          assistants: { count: 1, names: ["Sofie"] },
          sharingStand: { sharing: false },
          placementPreference: "Next to Bizziton",
          additionalComments: "Looking forward!",
          promotionConsent: true,
        }),
      })
    );
    expect(result.success).toBe(true);

    const apps = await findApplicationsByEventId(event.id);
    expect(apps).toHaveLength(1);
    const stored = apps[0];
    expect(stored.guidelinesAcknowledgedAt).toBeInstanceOf(Date);
    expect(stored.answers).toEqual({
      tableSizeOptionId: "size-a",
      assistants: { count: 1, names: ["Sofie"] },
      sharingStand: { sharing: false },
      placementPreference: "Next to Bizziton",
      additionalComments: "Looking forward!",
      promotionConsent: true,
    });
  });

  it("rejects an invalid table size option id", async () => {
    const { convention } = await createTestOrganizer();
    const event = await createTestEvent(convention.id, {
      tableSizeOptions: [
        { id: "size-a", label: "Standard", priceNok: 280 },
      ],
      maxAssistants: 0,
      fieldRequirements: {
        displayName: "required",
        contactEmail: "required",
        realName: "not_requested",
        phone: "not_requested",
        bio: "not_requested",
        websiteUrl: "not_requested",
        socialLinks: "not_requested",
        helpers: "not_requested",
        accessibilityNeeds: "not_requested",
        notes: "not_requested",
        portfolioImages: "not_requested",
        tableSize: "required",
      },
    });
    const artist = await setupArtistWithProfile();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await applyToEvent(
      {},
      buildFormData({
        eventId: event.id,
        guidelinesAcknowledged: "true",
        answers: JSON.stringify({ tableSizeOptionId: "bogus" }),
      })
    );
    expect(result.error).toContain("no longer available");
  });

  it("rejects non-artist role", async () => {
    const { profile } = await createTestOrganizer();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await applyToEvent(
      {},
      buildFormData({ eventId: "some-event-id" })
    );
    expect(result.error).toBe("Unauthorized");
  });
});
