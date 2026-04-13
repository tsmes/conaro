import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthError } from "next-auth";
import { cleanDatabase, buildFormData } from "../helpers/db";
import { registerArtist } from "@/app/(public)/register/artist/actions";
import { registerOrganizer } from "@/app/(public)/register/organizer/actions";
import { login } from "@/app/(public)/login/actions";

const mockSignIn = vi.fn();

vi.mock("@/lib/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

describe("login", () => {
  beforeEach(async () => {
    await cleanDatabase();
    vi.clearAllMocks();
  });

  async function createArtist(email = "artist@test.com") {
    await registerArtist(
      {},
      buildFormData({
        email,
        password: "password123",
        confirmPassword: "password123",
        displayName: "Test Artist",
      })
    );
  }

  async function createOrganizer(email = "organizer@test.com") {
    await registerOrganizer(
      {},
      buildFormData({
        email,
        password: "password123",
        confirmPassword: "password123",
        displayName: "Test Org",
        conventionName: "Test Con",
      })
    );
  }

  it("returns generic error for invalid email", async () => {
    const formData = buildFormData({
      email: "nonexistent@test.com",
      password: "password123",
    });

    const result = await login({}, formData);
    expect(result.error).toBe("Invalid email or password");
  });

  it("does not reveal whether email or password is wrong", async () => {
    await createArtist();

    // Wrong password
    mockSignIn.mockRejectedValueOnce(new AuthError("CredentialsSignin"));
    const result = await login(
      {},
      buildFormData({
        email: "artist@test.com",
        password: "wrongpassword",
      })
    );
    expect(result.error).toBe("Invalid email or password");

    // Wrong email
    const result2 = await login(
      {},
      buildFormData({
        email: "wrong@test.com",
        password: "password123",
      })
    );
    expect(result2.error).toBe("Invalid email or password");
  });

  it("returns error for empty fields", async () => {
    const result = await login(
      {},
      buildFormData({
        email: "",
        password: "",
      })
    );
    expect(result.error).toBe("Invalid email or password");
  });

  it("calls signIn with correct redirectTo for artist", async () => {
    await createArtist();
    mockSignIn.mockResolvedValueOnce(undefined);

    // login will call redirect() which throws NEXT_REDIRECT
    try {
      await login(
        {},
        buildFormData({
          email: "artist@test.com",
          password: "password123",
        })
      );
    } catch {
      // redirect throws — expected
    }

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "artist@test.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });

  it("calls signIn with correct redirectTo for organizer", async () => {
    await createOrganizer();
    mockSignIn.mockResolvedValueOnce(undefined);

    try {
      await login(
        {},
        buildFormData({
          email: "organizer@test.com",
          password: "password123",
        })
      );
    } catch {
      // redirect throws — expected
    }

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "organizer@test.com",
      password: "password123",
      redirectTo: "/conventions",
    });
  });

  it("normalizes email to lowercase for login", async () => {
    await createArtist("user@test.com");
    mockSignIn.mockResolvedValueOnce(undefined);

    try {
      await login(
        {},
        buildFormData({
          email: "USER@TEST.COM",
          password: "password123",
        })
      );
    } catch {
      // redirect throws
    }

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "user@test.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });
});
