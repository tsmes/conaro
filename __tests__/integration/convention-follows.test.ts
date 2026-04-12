import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  findFollowsByProfileId,
  buildFormData,
} from "../helpers/db";
import { toggleFollow } from "@/app/conventions/[conventionId]/actions";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("convention follows", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("creates a follow record when not following", async () => {
    const { convention } = await createTestOrganizer();
    const artist = await createTestArtist();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    const result = await toggleFollow(
      {},
      buildFormData({ conventionId: convention.id })
    );
    expect(result.success).toBe(true);

    const follows = await findFollowsByProfileId(artist.profile.id);
    expect(follows).toHaveLength(1);
    expect(follows[0].conventionId).toBe(convention.id);
  });

  it("removes follow record when already following (toggle off)", async () => {
    const { convention } = await createTestOrganizer();
    const artist = await createTestArtist();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    // Follow
    await toggleFollow(
      {},
      buildFormData({ conventionId: convention.id })
    );

    // Toggle off
    const result = await toggleFollow(
      {},
      buildFormData({ conventionId: convention.id })
    );
    expect(result.success).toBe(true);

    const follows = await findFollowsByProfileId(artist.profile.id);
    expect(follows).toHaveLength(0);
  });

  it("can re-follow after unfollowing (toggle on-off-on)", async () => {
    const { convention } = await createTestOrganizer();
    const artist = await createTestArtist();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: artist.profile.id },
    });

    // Follow -> unfollow -> follow
    await toggleFollow({}, buildFormData({ conventionId: convention.id }));
    await toggleFollow({}, buildFormData({ conventionId: convention.id }));
    await toggleFollow({}, buildFormData({ conventionId: convention.id }));

    const follows = await findFollowsByProfileId(artist.profile.id);
    expect(follows).toHaveLength(1);
  });

  it("rejects non-artist role", async () => {
    const { profile, convention } = await createTestOrganizer();

    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const result = await toggleFollow(
      {},
      buildFormData({ conventionId: convention.id })
    );
    expect(result.error).toBe("Unauthorized");
  });
});
