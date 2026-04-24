import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventThread } from "@/components/events/event-thread";

vi.mock("@/app/(public)/events/[eventId]/thread-actions", () => ({
  sendThreadMessage: vi.fn(async () => ({})),
  markThreadReadAsArtist: vi.fn(async () => ({})),
}));

describe("EventThread", () => {
  it("renders the composer with empty-state label when there's no thread yet", () => {
    render(
      <EventThread
        eventId="evt-1"
        threadId={null}
        messages={[]}
        hasUnreadFromOrganizer={false}
      />
    );
    expect(screen.getByLabelText(/Ask the organizer/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send message/i })
    ).toBeInTheDocument();
  });

  it("renders prior messages with author labels and a follow-up composer", () => {
    render(
      <EventThread
        eventId="evt-1"
        threadId="th-1"
        messages={[
          {
            id: "m1",
            body: "When is move-in?",
            authorIsArtist: true,
            createdAt: new Date("2026-04-20T10:00:00Z"),
          },
          {
            id: "m2",
            body: "07:00 sharp",
            authorIsArtist: false,
            createdAt: new Date("2026-04-20T10:05:00Z"),
          },
        ]}
        hasUnreadFromOrganizer={false}
      />
    );
    expect(screen.getByText("When is move-in?")).toBeInTheDocument();
    expect(screen.getByText("07:00 sharp")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Organizer")).toBeInTheDocument();
    expect(screen.getByLabelText(/Send another message/i)).toBeInTheDocument();
  });

  it("shows the 'New reply' badge when there are unread organizer messages", () => {
    render(
      <EventThread
        eventId="evt-1"
        threadId="th-1"
        messages={[
          {
            id: "m1",
            body: "later reply",
            authorIsArtist: false,
            createdAt: new Date(),
          },
        ]}
        hasUnreadFromOrganizer={true}
      />
    );
    expect(screen.getByText(/New reply/i)).toBeInTheDocument();
  });

  it("hides the badge when nothing is unread", () => {
    render(
      <EventThread
        eventId="evt-1"
        threadId="th-1"
        messages={[]}
        hasUnreadFromOrganizer={false}
      />
    );
    expect(screen.queryByText(/New reply/i)).not.toBeInTheDocument();
  });
});
