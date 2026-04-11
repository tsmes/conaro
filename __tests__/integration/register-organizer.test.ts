import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cleanDatabase,
  findUserByEmail,
  findProfileByUserId,
  findConventionByOrganizerId,
  buildFormData,
} from "../helpers/db";
import { registerOrganizer } from "@/app/register/organizer/actions";

vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
}));

describe("registerOrganizer", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("creates a user, organizer profile, and convention with valid data", async () => {
    const formData = buildFormData({
      email: "organizer@test.com",
      password: "password123",
      confirmPassword: "password123",
      displayName: "Test Organizer",
      conventionName: "Test Con",
    });

    const result = await registerOrganizer({}, formData);

    expect(result.error).toBeUndefined();
    expect(result.fieldErrors).toBeUndefined();

    const user = await findUserByEmail("organizer@test.com");
    expect(user).toBeDefined();
    expect(user!.email).toBe("organizer@test.com");

    const profile = await findProfileByUserId(user!.id);
    expect(profile).toBeDefined();
    expect(profile!.role).toBe("organizer");
    expect(profile!.displayName).toBe("Test Organizer");

    const convention = await findConventionByOrganizerId(profile!.id);
    expect(convention).toBeDefined();
    expect(convention!.name).toBe("Test Con");
  });

  it("returns field errors for missing convention name", async () => {
    const formData = buildFormData({
      email: "organizer@test.com",
      password: "password123",
      confirmPassword: "password123",
      displayName: "Test Organizer",
      conventionName: "",
    });

    const result = await registerOrganizer({}, formData);

    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors!.conventionName).toBeDefined();
  });

  it("returns error for duplicate email", async () => {
    const formData = buildFormData({
      email: "dup@test.com",
      password: "password123",
      confirmPassword: "password123",
      displayName: "First",
      conventionName: "Con 1",
    });

    await registerOrganizer({}, formData);

    const formData2 = buildFormData({
      email: "dup@test.com",
      password: "password456",
      confirmPassword: "password456",
      displayName: "Second",
      conventionName: "Con 2",
    });

    const result = await registerOrganizer({}, formData2);
    expect(result.error).toContain("already exists");
  });
});
