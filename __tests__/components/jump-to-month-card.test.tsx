import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  JumpToMonthCard,
  groupEventsByMonth,
} from "@/components/landing/rail-cards/jump-to-month-card";
import type { LandingEvent } from "@/lib/landing/data";

function event(id: string, eventStartDate: string): LandingEvent {
  return {
    id,
    conventionId: "c1",
    conventionName: "Test",
    conventionLogoPath: null,
    name: "n",
    status: "accepting_applications",
    eventStartDate,
    eventEndDate: null,
    applicationOpenDate: null,
    applicationCloseDate: null,
    venueCity: null,
    venueCountry: null,
    availableStands: null,
  };
}

describe("groupEventsByMonth", () => {
  it("groups events by year-month and counts them", () => {
    const buckets = groupEventsByMonth([
      event("a", "2026-04-10"),
      event("b", "2026-04-25"),
      event("c", "2026-05-01"),
    ]);
    expect(buckets).toEqual([
      { key: "2026-04", label: "April 2026", count: 2 },
      { key: "2026-05", label: "May 2026", count: 1 },
    ]);
  });

  it("returns an empty array for no events", () => {
    expect(groupEventsByMonth([])).toEqual([]);
  });
});

describe("JumpToMonthCard", () => {
  it("renders the buckets and pluralises the count", () => {
    render(
      <JumpToMonthCard
        events={[
          event("a", "2026-04-10"),
          event("b", "2026-04-25"),
          event("c", "2026-05-01"),
        ]}
      />
    );
    expect(screen.getByText("April 2026")).toBeInTheDocument();
    expect(screen.getByText("2 events")).toBeInTheDocument();
    expect(screen.getByText("May 2026")).toBeInTheDocument();
    expect(screen.getByText("1 event")).toBeInTheDocument();
  });

  it("shows the empty state when no events", () => {
    render(<JumpToMonthCard events={[]} />);
    expect(screen.getByText(/Nothing scheduled/i)).toBeInTheDocument();
  });
});
