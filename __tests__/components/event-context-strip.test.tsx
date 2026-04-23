import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventContextStrip } from "@/components/landing/event-context-strip";
import type { LandingEvent } from "@/lib/landing/data";

const baseEvent: LandingEvent = {
  id: "e1",
  conventionId: "c1",
  conventionName: "Kawaiicon",
  conventionLogoPath: null,
  name: "Kawaiicon 2026",
  // Results-published so a concrete 'accepted' / 'rejected' status is
  // visible to the artist. The 'masked as pending' path is covered in a
  // dedicated test below.
  status: "results_published",
  eventStartDate: "2026-09-01",
  eventEndDate: "2026-09-02",
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

describe("EventContextStrip", () => {
  it("renders nothing when there's no application and no open call", () => {
    const { container } = render(
      <EventContextStrip
        event={baseEvent}
        applicationStatus={null}
        isOpenCallToFollowedConvention={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the accepted message", () => {
    render(
      <EventContextStrip
        event={baseEvent}
        applicationStatus="accepted"
        isOpenCallToFollowedConvention={false}
      />
    );
    expect(screen.getByText(/in the show/i)).toBeInTheDocument();
  });

  it("shows the under-review message", () => {
    render(
      <EventContextStrip
        event={baseEvent}
        applicationStatus="under_review"
        isOpenCallToFollowedConvention={false}
      />
    );
    expect(screen.getByText(/under review/i)).toBeInTheDocument();
  });

  it("shows the submitted message with countdown when applications are still open", () => {
    render(
      <EventContextStrip
        event={baseEvent}
        applicationStatus="submitted"
        isOpenCallToFollowedConvention={false}
      />
    );
    expect(screen.getByText(/Application sent/i)).toBeInTheDocument();
    expect(screen.getByText("10d")).toBeInTheDocument();
  });

  it("shows the rejected message", () => {
    render(
      <EventContextStrip
        event={baseEvent}
        applicationStatus="rejected"
        isOpenCallToFollowedConvention={false}
      />
    );
    expect(screen.getByText(/Not selected/i)).toBeInTheDocument();
  });

  it("masks a pre-publish decision as a pending message", () => {
    render(
      <EventContextStrip
        event={{ ...baseEvent, status: "reviewing" }}
        applicationStatus="accepted"
        isOpenCallToFollowedConvention={false}
      />
    );
    expect(screen.queryByText(/in the show/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Decision pending/i)).toBeInTheDocument();
  });

  it("shows the open-call message when artist follows the convention and hasn't applied", () => {
    render(
      <EventContextStrip
        event={baseEvent}
        applicationStatus={null}
        isOpenCallToFollowedConvention={true}
      />
    );
    expect(screen.getByText(/Open call/i)).toBeInTheDocument();
  });
});
