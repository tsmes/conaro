import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cleanDatabase,
  createTestOrganizer,
  createTestArtist,
  buildFormData,
} from "../helpers/db";
import { updateConventionProfile } from "@/app/conventions/manage/actions";
import { db } from "@/lib/db";
import { conventions } from "@/lib/db/schema/conventions";
import { eq } from "drizzle-orm";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("updateConventionProfile", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("updates convention name, description, and websiteUrl", async () => {
    const { profile, convention } = await createTestOrganizer();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const formData = buildFormData({
      name: "Updated Convention",
      description: "A great convention",
      websiteUrl: "https://example.com",
    });

    const result = await updateConventionProfile({}, formData);

    expect(result.success).toBe(true);

    const [updated] = await db
      .select()
      .from(conventions)
      .where(eq(conventions.id, convention.id));

    expect(updated.name).toBe("Updated Convention");
    expect(updated.description).toBe("A great convention");
    expect(updated.websiteUrl).toBe("https://example.com");
  });

  it("returns field errors for empty name", async () => {
    const { profile } = await createTestOrganizer();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const formData = buildFormData({
      name: "",
      description: "",
      websiteUrl: "",
    });

    const result = await updateConventionProfile({}, formData);
    expect(result.fieldErrors?.name).toBeDefined();
  });

  it("returns field errors for invalid URL", async () => {
    const { profile } = await createTestOrganizer();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const formData = buildFormData({
      name: "Test Con",
      description: "",
      websiteUrl: "not-a-url",
    });

    const result = await updateConventionProfile({}, formData);
    expect(result.fieldErrors?.websiteUrl).toBeDefined();
  });

  it("returns Unauthorized for non-organizer", async () => {
    const { profile } = await createTestArtist();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "artist", profileId: profile.id },
    });

    const formData = buildFormData({
      name: "Test",
      description: "",
      websiteUrl: "",
    });

    const result = await updateConventionProfile({}, formData);
    expect(result.error).toBe("Unauthorized");
  });

  it("stores empty optional fields as null", async () => {
    const { profile, convention } = await createTestOrganizer();
    mockAuth.mockResolvedValue({
      user: { id: "u", role: "organizer", profileId: profile.id },
    });

    const formData = buildFormData({
      name: "Test Con",
      description: "",
      websiteUrl: "",
    });

    await updateConventionProfile({}, formData);

    const [updated] = await db
      .select()
      .from(conventions)
      .where(eq(conventions.id, convention.id));

    expect(updated.description).toBeNull();
    expect(updated.websiteUrl).toBeNull();
  });
});
