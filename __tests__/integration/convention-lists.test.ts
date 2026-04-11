import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  findListEntriesByConventionId,
  buildFormData,
} from "../helpers/db";
import {
  addToList,
  removeFromList,
} from "@/app/conventions/manage/lists/actions";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("convention lists", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  describe("addToList", () => {
    it("adds artist to allow list", async () => {
      const { profile, convention } = await createTestOrganizer();
      const artist = await createTestArtist();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await addToList(
        {},
        buildFormData({ profileId: artist.profile.id, listType: "allow" })
      );

      expect(result.success).toBe(true);

      const entries = await findListEntriesByConventionId(convention.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].profileId).toBe(artist.profile.id);
      expect(entries[0].listType).toBe("allow");
    });

    it("adds artist to block list", async () => {
      const { profile, convention } = await createTestOrganizer();
      const artist = await createTestArtist();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      const result = await addToList(
        {},
        buildFormData({ profileId: artist.profile.id, listType: "block" })
      );

      expect(result.success).toBe(true);

      const entries = await findListEntriesByConventionId(convention.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].listType).toBe("block");
    });

    it("moves artist between lists on re-add", async () => {
      const { profile, convention } = await createTestOrganizer();
      const artist = await createTestArtist();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      // Add to allow list
      await addToList(
        {},
        buildFormData({ profileId: artist.profile.id, listType: "allow" })
      );

      // Move to block list
      await addToList(
        {},
        buildFormData({ profileId: artist.profile.id, listType: "block" })
      );

      const entries = await findListEntriesByConventionId(convention.id);
      expect(entries).toHaveLength(1);
      expect(entries[0].listType).toBe("block");
    });

    it("rejects adding non-artist profile", async () => {
      const organizer = await createTestOrganizer();
      const otherOrganizer = await createTestOrganizer(
        "other@test.com",
        "Other Con"
      );
      mockAuth.mockResolvedValue({
        user: {
          id: "u",
          role: "organizer",
          profileId: organizer.profile.id,
        },
      });

      const result = await addToList(
        {},
        buildFormData({
          profileId: otherOrganizer.profile.id,
          listType: "allow",
        })
      );

      expect(result.error).toBe("Artist not found");
    });
  });

  describe("removeFromList", () => {
    it("removes artist from list", async () => {
      const { profile, convention } = await createTestOrganizer();
      const artist = await createTestArtist();
      mockAuth.mockResolvedValue({
        user: { id: "u", role: "organizer", profileId: profile.id },
      });

      await addToList(
        {},
        buildFormData({ profileId: artist.profile.id, listType: "allow" })
      );

      const result = await removeFromList(
        {},
        buildFormData({ profileId: artist.profile.id })
      );

      expect(result.success).toBe(true);

      const entries = await findListEntriesByConventionId(convention.id);
      expect(entries).toHaveLength(0);
    });
  });
});
