import { describe, it, expect } from "vitest";
import { computeCompleteness } from "@/lib/profile/completeness";
import type { ArtistProfileData } from "@/lib/applications/validation";

describe("computeCompleteness", () => {
  const emptyProfile = { displayName: "" };
  const filledProfile = { displayName: "Test Artist" };

  // Empty fixture mirrors the artist-profile row shape registered
  // in FIELD_REGISTRY: displayName lives on the profile, everything
  // else lives on the artist profile (some fields are arrays).
  const emptyArtistProfile: ArtistProfileData = {
    contactEmail: null,
    realName: null,
    pronouns: null,
    phone: null,
    bio: null,
    websiteUrl: null,
    socialLinks: null,
    helpers: null,
    accessibilityNeeds: null,
    notes: null,
    priceRangeMinNok: null,
    priceRangeMaxNok: null,
    genres: null,
    mediums: null,
  };

  // 11 basic + 3 logistics + 1 portfolio = 15 total registry fields.
  const TOTAL = 15;

  it("returns all incomplete for empty profile", () => {
    const result = computeCompleteness(emptyProfile, emptyArtistProfile, 0);
    expect(result.basic.complete).toBe(false);
    expect(result.logistics.complete).toBe(false);
    expect(result.portfolio.complete).toBe(false);
    expect(result.overall).toBe(0);
  });

  it("marks basic complete when display name and contact email are filled", () => {
    const result = computeCompleteness(
      filledProfile,
      { ...emptyArtistProfile, contactEmail: "test@example.com" },
      0
    );
    expect(result.basic.complete).toBe(true);
    expect(result.basic.filled).toBe(2);
  });

  it("marks basic incomplete when contact email is missing", () => {
    const result = computeCompleteness(filledProfile, emptyArtistProfile, 0);
    expect(result.basic.complete).toBe(false);
  });

  it("counts new basic fields (pronouns, priceRange, genres, mediums)", () => {
    const result = computeCompleteness(
      filledProfile,
      {
        ...emptyArtistProfile,
        contactEmail: "test@example.com",
        pronouns: "they/them",
        priceRangeMinNok: 200,
        priceRangeMaxNok: 1500,
        genres: ["fantasy"],
        mediums: ["ink"],
      },
      0
    );
    // displayName + contactEmail + pronouns + priceRange + genres + mediums = 6
    expect(result.basic.filled).toBe(6);
  });

  it("priceRange needs both min AND max to count", () => {
    const result = computeCompleteness(
      filledProfile,
      {
        ...emptyArtistProfile,
        contactEmail: "test@example.com",
        priceRangeMinNok: 200,
      },
      0
    );
    // displayName + contactEmail only — priceRange not yet filled.
    expect(result.basic.filled).toBe(2);
  });

  it("marks logistics complete when any field has a value", () => {
    const result = computeCompleteness(
      filledProfile,
      { ...emptyArtistProfile, accessibilityNeeds: "Step-free access please" },
      0
    );
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
    // The registry has one "portfolioImages" entry — filled is 0 or 1.
    expect(result.portfolio.filled).toBe(1);
    expect(result.portfolio.total).toBe(1);
  });

  it("marks portfolio incomplete when no images", () => {
    const result = computeCompleteness(filledProfile, emptyArtistProfile, 0);
    expect(result.portfolio.complete).toBe(false);
  });

  it("computes overall percentage based on total fields filled", () => {
    // displayName + contactEmail + helpers + portfolio = 4 / 15 ≈ 27%
    const partial = computeCompleteness(
      filledProfile,
      { ...emptyArtistProfile, contactEmail: "test@example.com", helpers: 2 },
      1
    );
    expect(partial.overall).toBe(Math.round((4 / TOTAL) * 100));

    const empty = computeCompleteness(emptyProfile, emptyArtistProfile, 0);
    expect(empty.overall).toBe(0);

    // Every registry field filled: 15/15 = 100%.
    const full = computeCompleteness(
      filledProfile,
      {
        contactEmail: "test@example.com",
        realName: "Real Name",
        pronouns: "they/them",
        phone: "123",
        bio: "Bio",
        websiteUrl: "https://example.com",
        socialLinks: "@artist",
        helpers: 2,
        accessibilityNeeds: "Needs",
        notes: "Notes",
        priceRangeMinNok: 200,
        priceRangeMaxNok: 1500,
        genres: ["fantasy"],
        mediums: ["ink"],
      },
      1
    );
    expect(full.overall).toBe(100);
  });

  it("handles undefined profile and artist profile", () => {
    const result = computeCompleteness(undefined, undefined, 0);
    expect(result.basic.complete).toBe(false);
    expect(result.logistics.complete).toBe(false);
    expect(result.portfolio.complete).toBe(false);
  });
});
