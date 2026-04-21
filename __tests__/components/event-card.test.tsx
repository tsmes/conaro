import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCard } from "@/components/landing/event-card";
import type { LandingEvent } from "@/lib/landing/data";

vi.mock("@/lib/storage", () => ({
  storage: { getUrl: (p: string) => `https://cdn.test/${p}` },
}));

vi.mock("@/components/landing/follow-button", () => ({
  FollowButton: ({ isFollowing }: { isFollowing: boolean }) => (
    <button data-testid="follow-button">
      {isFollowing ? "Following" : "Follow"}
    </button>
  ),
}));

const baseEvent: LandingEvent = {
  id: "evt-1",
  conventionId: "con-1",
  conventionName: "Kawaiicon",
  conventionLogoPath: null,
  name: "Kawaiicon 2026",
  status: "accepting_applications",
  eventStartDate: "2026-09-15",
  eventEndDate: "2026-09-16",
  applicationOpenDate: "2026-04-01",
  applicationCloseDate: "2026-05-30",
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

describe("EventCard", () => {
  it("renders convention name, event name, date range, and venue", () => {
    render(<EventCard event={baseEvent} viewer="public" />);
    expect(screen.getByText("Kawaiicon")).toBeInTheDocument();
    expect(screen.getByText("Kawaiicon 2026")).toBeInTheDocument();
    expect(screen.getByText("Sep 15–16")).toBeInTheDocument();
    expect(screen.getByText("Oslo, NO")).toBeInTheDocument();
  });

  it("public viewer sees only the View event button (no Apply, no Follow)", () => {
    render(<EventCard event={baseEvent} viewer="public" />);
    expect(screen.getByText(/View event/i)).toBeInTheDocument();
    expect(screen.queryByText(/Apply/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("follow-button")).not.toBeInTheDocument();
  });

  it("public viewer sees the 'Applications open' badge for accepting events", () => {
    render(<EventCard event={baseEvent} viewer="public" />);
    expect(screen.getByText(/Applications open/i)).toBeInTheDocument();
  });

  it("artist viewer with no application sees Apply button on open events", () => {
    render(
      <EventCard
        event={baseEvent}
        viewer="artist"
        artistContext={{
          applicationStatus: null,
          isFollowingConvention: false,
        }}
      />
    );
    expect(screen.getByText(/Apply/)).toBeInTheDocument();
  });

  it("artist viewer with an application sees the status badge and View application button", () => {
    render(
      <EventCard
        event={baseEvent}
        viewer="artist"
        artistContext={{
          applicationStatus: "accepted",
          applicationId: "app-1",
          isFollowingConvention: true,
        }}
      />
    );
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText(/View application/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Apply$/)).not.toBeInTheDocument();
  });

  it("artist viewer always sees the Follow button", () => {
    render(
      <EventCard
        event={baseEvent}
        viewer="artist"
        artistContext={{
          applicationStatus: null,
          isFollowingConvention: false,
        }}
      />
    );
    expect(screen.getByTestId("follow-button")).toBeInTheDocument();
  });

  it("artist with application sees the context strip", () => {
    render(
      <EventCard
        event={baseEvent}
        viewer="artist"
        artistContext={{
          applicationStatus: "submitted",
          applicationId: "app-1",
          isFollowingConvention: false,
        }}
      />
    );
    expect(screen.getByTestId("event-context-strip")).toBeInTheDocument();
  });

  it("artist following an open-call convention sees the open-call strip", () => {
    render(
      <EventCard
        event={baseEvent}
        viewer="artist"
        artistContext={{
          applicationStatus: null,
          isFollowingConvention: true,
        }}
      />
    );
    expect(screen.getByTestId("event-context-strip")).toBeInTheDocument();
    expect(screen.getByText(/Open call/i)).toBeInTheDocument();
  });

  it("artist not following and no application sees no context strip", () => {
    render(
      <EventCard
        event={baseEvent}
        viewer="artist"
        artistContext={{
          applicationStatus: null,
          isFollowingConvention: false,
        }}
      />
    );
    expect(screen.queryByTestId("event-context-strip")).not.toBeInTheDocument();
  });
});
