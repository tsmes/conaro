import { describe, it, expect } from "vitest";
import {
  artistRegistrationSchema,
  organizerRegistrationSchema,
  loginSchema,
} from "@/lib/validations/auth";

describe("artistRegistrationSchema", () => {
  const validInput = {
    email: "artist@example.com",
    password: "password123",
    confirmPassword: "password123",
    displayName: "Test Artist",
  };

  it("accepts valid input", () => {
    const result = artistRegistrationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = artistRegistrationSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty email", () => {
    const result = artistRegistrationSchema.safeParse({
      ...validInput,
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = artistRegistrationSchema.safeParse({
      ...validInput,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordErrors = result.error.flatten().fieldErrors.password;
      expect(passwordErrors).toBeDefined();
      expect(passwordErrors![0]).toContain("at least 8 characters");
    }
  });

  it("rejects password longer than 72 characters", () => {
    const longPassword = "a".repeat(73);
    const result = artistRegistrationSchema.safeParse({
      ...validInput,
      password: longPassword,
      confirmPassword: longPassword,
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = artistRegistrationSchema.safeParse({
      ...validInput,
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors.confirmPassword;
      expect(errors).toBeDefined();
      expect(errors![0]).toContain("do not match");
    }
  });

  it("rejects empty display name", () => {
    const result = artistRegistrationSchema.safeParse({
      ...validInput,
      displayName: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("organizerRegistrationSchema", () => {
  const validInput = {
    email: "organizer@example.com",
    password: "password123",
    confirmPassword: "password123",
    displayName: "Test Organizer",
    conventionName: "Test Convention",
  };

  it("accepts valid input", () => {
    const result = organizerRegistrationSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty convention name", () => {
    const result = organizerRegistrationSchema.safeParse({
      ...validInput,
      conventionName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = organizerRegistrationSchema.safeParse({
      ...validInput,
      confirmPassword: "different123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = organizerRegistrationSchema.safeParse({
      ...validInput,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid input", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "mypassword",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
