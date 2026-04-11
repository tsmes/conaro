import { describe, it, expect } from "vitest";
import { computeCompleteness } from "@/lib/profile/completeness";

describe("computeCompleteness", () => {
  const emptyProfile = { displayName: "" };
  const filledProfile = { displayName: "Test Artist" };

  const emptyArtistProfile = {
    contactEmail: null,
    realName: null,
    phone: null,
    bio: null,
    websiteUrl: null,
    socialLinks: null,
    helpers: null,
    accessibilityNeeds: null,
    tableSizePreference: null,
    notes: null,
  };

  it("returns all incomplete for empty profile", () => {
    const result = computeCompleteness(emptyProfile, emptyArtistProfile, 0);
    expect(result.basic.complete).toBe(false);
    expect(result.logistics.complete).toBe(false);
    expect(result.portfolio.complete).toBe(false);
    expect(result.overall).toBe(0);
  });

  it("marks basic complete when display name and contact email are filled", () => {
    const result = computeCompleteness(filledProfile, {
      ...emptyArtistProfile,
      contactEmail: "test@example.com",
    }, 0);
    expect(result.basic.complete).toBe(true);
    expect(result.basic.filled).toBe(2);
  });

  it("marks basic incomplete when contact email is missing", () => {
    const result = computeCompleteness(filledProfile, emptyArtistProfile, 0);
    expect(result.basic.complete).toBe(false);
  });

  it("marks logistics complete when any field has a value", () => {
    const result = computeCompleteness(filledProfile, {
      ...emptyArtistProfile,
      tableSizePreference: "2m x 1m",
    }, 0);
    expect(result.logistics.complete).toBe(true);
    expect(result.logistics.filled).toBe(1);
  });

  it("marks logistics incomplete when all fields are empty", () => {
    const result = computeCompleteness(filledProfile, emptyArtistProfile, 0);
    expect(result.logistics.complete).toBe(false);
    expect(result.logistics.filled).toBe(0);
  });

  it("marks portfolio complete when at least 1 image exists", () => {
    const result = computeCompleteness(filledProfile, emptyArtistProfile, 3);
    expect(result.portfolio.complete).toBe(true);
    expect(result.portfolio.filled).toBe(3);
    expect(result.portfolio.total).toBe(20);
  });

  it("marks portfolio incomplete when no images", () => {
    const result = computeCompleteness(filledProfile, emptyArtistProfile, 0);
    expect(result.portfolio.complete).toBe(false);
  });

  it("computes overall percentage based on total fields filled", () => {
    // Total fields: 7 basic + 4 logistics + 1 portfolio = 12
    // displayName(1) + contactEmail(1) + helpers(1) + image(1) = 4/12 = 33%
    const partial = computeCompleteness(filledProfile, {
      ...emptyArtistProfile,
      contactEmail: "test@example.com",
      helpers: 2,
    }, 1);
    expect(partial.overall).toBe(33);

    // Empty profile = 0/12 = 0%
    const empty = computeCompleteness(emptyProfile, emptyArtistProfile, 0);
    expect(empty.overall).toBe(0);

    // All fields filled = 12/12 = 100%
    const full = computeCompleteness(filledProfile, {
      contactEmail: "test@example.com",
      realName: "Real Name",
      phone: "123",
      bio: "Bio",
      websiteUrl: "https://example.com",
      socialLinks: "@artist",
      helpers: 2,
      accessibilityNeeds: "Needs",
      tableSizePreference: "2m",
      notes: "Notes",
    }, 1);
    expect(full.overall).toBe(100);
  });

  it("handles undefined profile and artist profile", () => {
    const result = computeCompleteness(undefined, undefined, 0);
    expect(result.basic.complete).toBe(false);
    expect(result.logistics.complete).toBe(false);
    expect(result.portfolio.complete).toBe(false);
  });
});
