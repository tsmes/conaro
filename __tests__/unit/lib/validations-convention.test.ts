import { describe, it, expect } from "vitest";
import {
  conventionProfileSchema,
  eventSchema,
  fieldConfigSchema,
} from "@/lib/validations/convention";

describe("conventionProfileSchema", () => {
  it("accepts valid input", () => {
    const result = conventionProfileSchema.safeParse({
      name: "My Convention",
      description: "A great con",
      websiteUrl: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const result = conventionProfileSchema.safeParse({
      name: "",
      description: "",
      websiteUrl: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid URL", () => {
    const result = conventionProfileSchema.safeParse({
      name: "Test",
      description: "",
      websiteUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty URL", () => {
    const result = conventionProfileSchema.safeParse({
      name: "Test",
      description: "",
      websiteUrl: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("eventSchema", () => {
  it("accepts valid input with required fields only", () => {
    const result = eventSchema.safeParse({
      name: "Summer 2026",
      eventStartDate: "2026-07-15",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with all fields", () => {
    const result = eventSchema.safeParse({
      name: "Full Event",
      description: "Detailed",
      eventStartDate: "2026-07-15",
      eventEndDate: "2026-07-17",
      applicationOpenDate: "2026-05-01",
      applicationCloseDate: "2026-06-30",
      venueName: "Hall A",
      venueAddress: "123 Street",
      venueCity: "Oslo",
      venueCountry: "Norway",
      mapEmbedUrl: "https://maps.google.com/embed?q=test",
      availableStands: "50",
      tableDimensions: "2m x 1m",
      priceInfo: "$100",
      setupTime: "8 AM",
      teardownTime: "6 PM",
      amenities_electricity: "on",
      amenities_wifi: "on",
      amenities_other: "Racks",
    });
    expect(result.success).toBe(true);
  });

  it("requires name", () => {
    const result = eventSchema.safeParse({
      name: "",
      eventStartDate: "2026-07-15",
    });
    expect(result.success).toBe(false);
  });

  it("requires eventStartDate", () => {
    const result = eventSchema.safeParse({
      name: "Test",
      eventStartDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects end date before start date", () => {
    const result = eventSchema.safeParse({
      name: "Test",
      eventStartDate: "2026-07-15",
      eventEndDate: "2026-07-14",
    });
    expect(result.success).toBe(false);
  });

  it("rejects close date before open date", () => {
    const result = eventSchema.safeParse({
      name: "Test",
      eventStartDate: "2026-07-15",
      applicationOpenDate: "2026-06-01",
      applicationCloseDate: "2026-05-01",
    });
    expect(result.success).toBe(false);
  });

  it("transforms checkbox values to booleans", () => {
    const result = eventSchema.safeParse({
      name: "Test",
      eventStartDate: "2026-07-15",
      amenities_electricity: "on",
      amenities_wifi: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amenities_electricity).toBe(true);
      expect(result.data.amenities_wifi).toBe(false);
    }
  });
});

describe("fieldConfigSchema", () => {
  it("accepts valid config", () => {
    const result = fieldConfigSchema.safeParse({
      displayName: "required",
      contactEmail: "required",
      bio: "optional",
      minPortfolioImages: "3",
    });
    expect(result.success).toBe(true);
  });

  it("defaults missing fields to not_requested", () => {
    const result = fieldConfigSchema.safeParse({
      minPortfolioImages: "0",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("not_requested");
    }
  });
});
