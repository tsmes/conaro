import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

import {
  requireProfile,
  requireOrganizer,
  requireArtist,
} from "@/lib/auth/guards";

describe("auth guards", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requireProfile rejects when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await requireProfile()).toEqual({ error: "Unauthorized" });
  });

  it("requireProfile rejects a session with a role but no profileId", async () => {
    mockAuth.mockResolvedValue({ user: { role: "artist" } });
    expect(await requireProfile()).toEqual({ error: "Unauthorized" });
  });

  it("requireProfile returns profileId and role for any authenticated role", async () => {
    mockAuth.mockResolvedValue({ user: { profileId: "p1", role: "organizer" } });
    expect(await requireProfile()).toEqual({ profileId: "p1", role: "organizer" });
  });

  it("requireOrganizer accepts an organizer and rejects an artist", async () => {
    mockAuth.mockResolvedValue({ user: { profileId: "p1", role: "organizer" } });
    expect(await requireOrganizer()).toEqual({ profileId: "p1", role: "organizer" });

    mockAuth.mockResolvedValue({ user: { profileId: "p2", role: "artist" } });
    expect(await requireOrganizer()).toEqual({ error: "Unauthorized" });
  });

  it("requireArtist accepts an artist and rejects an organizer", async () => {
    mockAuth.mockResolvedValue({ user: { profileId: "p2", role: "artist" } });
    expect(await requireArtist()).toEqual({ profileId: "p2", role: "artist" });

    mockAuth.mockResolvedValue({ user: { profileId: "p1", role: "organizer" } });
    expect(await requireArtist()).toEqual({ error: "Unauthorized" });
  });
});
