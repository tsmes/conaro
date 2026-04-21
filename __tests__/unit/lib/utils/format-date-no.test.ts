import { describe, it, expect } from "vitest";
import {
  formatDateNo,
  formatDateRangeNo,
  monthAbbrNo,
} from "@/lib/utils/format-date-no";

describe("formatDateNo", () => {
  it("formats a single date with Norwegian month name", () => {
    expect(formatDateNo("2026-06-20")).toBe("20. Juni 2026");
  });

  it("handles single-digit day without zero-padding", () => {
    expect(formatDateNo("2026-03-05")).toBe("5. Mars 2026");
  });
});

describe("formatDateRangeNo", () => {
  it("returns a single-day format when end is null", () => {
    expect(formatDateRangeNo("2026-06-20", null)).toBe("20. Juni 2026");
  });

  it("returns a single-day format when end equals start", () => {
    expect(formatDateRangeNo("2026-06-20", "2026-06-20")).toBe(
      "20. Juni 2026"
    );
  });

  it("condenses a range within the same month to one month name", () => {
    expect(formatDateRangeNo("2026-06-20", "2026-06-21")).toBe(
      "20. - 21. Juni 2026"
    );
  });

  it("spells out both months when the range crosses a month boundary", () => {
    expect(formatDateRangeNo("2026-06-30", "2026-07-02")).toBe(
      "30. Juni - 2. Juli 2026"
    );
  });

  it("includes both years when the range crosses a year boundary", () => {
    expect(formatDateRangeNo("2025-12-30", "2026-01-02")).toBe(
      "30. Desember 2025 - 2. Januar 2026"
    );
  });
});

describe("monthAbbrNo", () => {
  it("returns Norwegian three-letter month abbreviation", () => {
    expect(monthAbbrNo("2026-06-20")).toBe("Jun");
    expect(monthAbbrNo("2026-12-20")).toBe("Des");
    expect(monthAbbrNo("2026-05-20")).toBe("Mai");
  });
});
