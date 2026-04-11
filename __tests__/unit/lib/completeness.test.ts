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

  it("computes overall percentage correctly", () => {
    // All three complete
    const allComplete = computeCompleteness(filledProfile, {
      ...emptyArtistProfile,
      contactEmail: "test@example.com",
      helpers: 2,
    }, 1);
    expect(allComplete.overall).toBe(100);

    // Two of three complete
    const twoComplete = computeCompleteness(filledProfile, {
      ...emptyArtistProfile,
      contactEmail: "test@example.com",
    }, 1);
    expect(twoComplete.overall).toBe(67);

    // One of three complete
    const oneComplete = computeCompleteness(filledProfile, {
      ...emptyArtistProfile,
      contactEmail: "test@example.com",
    }, 0);
    expect(oneComplete.overall).toBe(33);
  });

  it("handles undefined profile and artist profile", () => {
    const result = computeCompleteness(undefined, undefined, 0);
    expect(result.basic.complete).toBe(false);
    expect(result.logistics.complete).toBe(false);
    expect(result.portfolio.complete).toBe(false);
  });
});
