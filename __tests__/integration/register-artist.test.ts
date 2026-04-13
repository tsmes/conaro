import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  cleanDatabase,
  findUserByEmail,
  findProfileByUserId,
  buildFormData,
} from "../helpers/db";
import { registerArtist } from "@/app/(public)/register/artist/actions";

// Mock next-auth signIn — it tries to redirect which throws in tests
vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
}));

describe("registerArtist", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  it("creates a user and artist profile with valid data", async () => {
    const formData = buildFormData({
      email: "artist@test.com",
      password: "password123",
      confirmPassword: "password123",
      displayName: "Test Artist",
    });

    const result = await registerArtist({}, formData);

    // signIn may throw NEXT_REDIRECT — if it returns, no errors
    expect(result.error).toBeUndefined();
    expect(result.fieldErrors).toBeUndefined();

    const user = await findUserByEmail("artist@test.com");
    expect(user).toBeDefined();
    expect(user!.email).toBe("artist@test.com");
    expect(user!.name).toBe("Test Artist");
    expect(user!.password).toBeDefined();
    expect(user!.password).not.toBe("password123"); // hashed

    const profile = await findProfileByUserId(user!.id);
    expect(profile).toBeDefined();
    expect(profile!.role).toBe("artist");
    expect(profile!.displayName).toBe("Test Artist");
  });

  it("normalizes email to lowercase", async () => {
    const formData = buildFormData({
      email: "Artist@Example.COM",
      password: "password123",
      confirmPassword: "password123",
      displayName: "Test Artist",
    });

    await registerArtist({}, formData);

    const user = await findUserByEmail("artist@example.com");
    expect(user).toBeDefined();
  });

  it("returns field errors for invalid input", async () => {
    const formData = buildFormData({
      email: "not-an-email",
      password: "short",
      confirmPassword: "short",
      displayName: "",
    });

    const result = await registerArtist({}, formData);

    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors!.email).toBeDefined();
    expect(result.fieldErrors!.password).toBeDefined();
    expect(result.fieldErrors!.displayName).toBeDefined();
  });

  it("returns error for duplicate email", async () => {
    const formData = buildFormData({
      email: "duplicate@test.com",
      password: "password123",
      confirmPassword: "password123",
      displayName: "First User",
    });

    await registerArtist({}, formData);

    const formData2 = buildFormData({
      email: "duplicate@test.com",
      password: "password456",
      confirmPassword: "password456",
      displayName: "Second User",
    });

    const result = await registerArtist({}, formData2);
    expect(result.error).toContain("already exists");
  });

  it("returns error for duplicate email with different casing", async () => {
    const formData = buildFormData({
      email: "user@test.com",
      password: "password123",
      confirmPassword: "password123",
      displayName: "First User",
    });

    await registerArtist({}, formData);

    const formData2 = buildFormData({
      email: "USER@TEST.COM",
      password: "password456",
      confirmPassword: "password456",
      displayName: "Second User",
    });

    const result = await registerArtist({}, formData2);
    expect(result.error).toContain("already exists");
  });

  it("returns field errors for mismatched passwords", async () => {
    const formData = buildFormData({
      email: "artist@test.com",
      password: "password123",
      confirmPassword: "different456",
      displayName: "Test Artist",
    });

    const result = await registerArtist({}, formData);

    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors!.confirmPassword).toBeDefined();
  });
});
