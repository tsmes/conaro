import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturedEvent } from "@/components/landing/featured-event";
import type { LandingEvent } from "@/lib/landing/data";

vi.mock("@/lib/storage", () => ({
  storage: { getUrl: (p: string) => `https://cdn.test/${p}` },
}));

const baseEvent: LandingEvent = {
  id: "evt-1",
  conventionId: "con-1",
  conventionName: "Kawaiicon",
  conventionLogoPath: null,
  name: "Kawaiicon 2026",
  status: "accepting_applications",
  eventStartDate: "2026-05-15",
  eventEndDate: "2026-05-16",
  applicationOpenDate: "2026-04-01",
  applicationCloseDate: "2026-05-01",
  venueCity: "Oslo",
  venueCountry: "NO",
  availableStands: 60,
};

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-04-21T12:00:00Z"));
});

afterAll(() => {
  vi.useRealTimers();
});

describe("FeaturedEvent", () => {
  it("renders the countdown to event start", () => {
    render(<FeaturedEvent event={baseEvent} viewer="public" />);
    expect(screen.getByTestId("featured-countdown")).toHaveTextContent(
      "24 days"
    );
  });

  it("renders 'Today' for an event starting today", () => {
    render(
      <FeaturedEvent
        event={{ ...baseEvent, eventStartDate: "2026-04-21" }}
        viewer="public"
      />
    );
    expect(screen.getByTestId("featured-countdown")).toHaveTextContent("Today");
  });

  it("renders 'Tomorrow' for an event starting tomorrow", () => {
    render(
      <FeaturedEvent
        event={{ ...baseEvent, eventStartDate: "2026-04-22" }}
        viewer="public"
      />
    );
    expect(screen.getByTestId("featured-countdown")).toHaveTextContent(
      "Tomorrow"
    );
  });

  it("shows venue city and country", () => {
    render(<FeaturedEvent event={baseEvent} viewer="public" />);
    expect(screen.getByText("Oslo, NO")).toBeInTheDocument();
  });

  it("hides artist status badge for public viewer even if context provided", () => {
    render(
      <FeaturedEvent
        event={baseEvent}
        viewer="public"
        artistContext={{
          applicationStatus: "accepted",
          isFollowingConvention: false,
        }}
      />
    );
    expect(screen.queryByText("Accepted")).not.toBeInTheDocument();
  });

  it("shows the artist status badge when viewer is artist with an accepted application", () => {
    render(
      <FeaturedEvent
        event={baseEvent}
        viewer="artist"
        artistContext={{
          applicationStatus: "accepted",
          isFollowingConvention: true,
        }}
      />
    );
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("renders the View event CTA", () => {
    render(<FeaturedEvent event={baseEvent} viewer="public" />);
    expect(screen.getByText(/View event/i)).toBeInTheDocument();
  });
});
