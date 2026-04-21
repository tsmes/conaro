import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";

const REF = new Date("2026-04-21T12:00:00Z");

describe("formatRelativeTime", () => {
  it("returns 'Just now' for events less than a minute old", () => {
    expect(formatRelativeTime(new Date("2026-04-21T11:59:30Z"), REF)).toBe(
      "Just now"
    );
  });

  it("returns minutes for events less than an hour old", () => {
    expect(formatRelativeTime(new Date("2026-04-21T11:45:00Z"), REF)).toBe(
      "15m ago"
    );
  });

  it("returns hours for events less than a day old", () => {
    expect(formatRelativeTime(new Date("2026-04-21T04:00:00Z"), REF)).toBe(
      "8h ago"
    );
  });

  it("returns days for events within the last week", () => {
    expect(formatRelativeTime(new Date("2026-04-18T12:00:00Z"), REF)).toBe(
      "3d ago"
    );
  });

  it("returns a Norwegian date once the event is a week or more old", () => {
    expect(formatRelativeTime(new Date("2026-04-10T12:00:00Z"), REF)).toBe(
      "10. April 2026"
    );
  });

  it("accepts ISO strings as input", () => {
    expect(formatRelativeTime("2026-04-21T11:30:00Z", REF)).toBe("30m ago");
  });
});
