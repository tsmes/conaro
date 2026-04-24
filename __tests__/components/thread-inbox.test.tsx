import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ThreadInbox,
  type InboxThreadRow,
} from "@/components/conventions/thread-inbox";

vi.mock(
  "@/app/(authenticated)/conventions/manage/events/[eventId]/thread-actions",
  () => ({
    replyToThread: vi.fn(async () => ({})),
    markThreadReadAsOrganizer: vi.fn(async () => ({})),
  })
);

function makeRow(overrides: Partial<InboxThreadRow> = {}): InboxThreadRow {
  return {
    threadId: overrides.threadId ?? "th-1",
    artistProfileId: overrides.artistProfileId ?? "artist-1",
    artistDisplayName: overrides.artistDisplayName ?? "Elena Kim",
    lastMessageAt: overrides.lastMessageAt ?? new Date("2026-04-24T10:00:00Z"),
    lastMessagePreview: overrides.lastMessagePreview ?? "When is move-in?",
    unreadForOrganizer: overrides.unreadForOrganizer ?? false,
    messages: overrides.messages ?? [
      {
        id: "m1",
        body: "When is move-in?",
        authorIsArtist: true,
        createdAt: new Date("2026-04-24T10:00:00Z"),
      },
    ],
  };
}

describe("ThreadInbox", () => {
  it("shows the empty state when there are no threads", () => {
    render(<ThreadInbox eventId="e1" threads={[]} />);
    expect(screen.getByText(/No questions yet/i)).toBeInTheDocument();
  });

  it("renders one row per thread with the last message preview", () => {
    render(
      <ThreadInbox
        eventId="e1"
        threads={[
          makeRow({ artistDisplayName: "Alice", lastMessagePreview: "hi" }),
          makeRow({
            threadId: "th-2",
            artistProfileId: "a2",
            artistDisplayName: "Bob",
            lastMessagePreview: "ping",
          }),
        ]}
      />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("hi")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("ping")).toBeInTheDocument();
  });

  it("marks an unread thread with an aria-labelled dot", () => {
    render(
      <ThreadInbox
        eventId="e1"
        threads={[
          makeRow({ unreadForOrganizer: true }),
          makeRow({
            threadId: "th-2",
            artistProfileId: "a2",
            unreadForOrganizer: false,
          }),
        ]}
      />
    );
    expect(screen.getAllByLabelText("Unread")).toHaveLength(1);
  });

  it("opens the dialog when a row is clicked and shows the message timeline", () => {
    render(
      <ThreadInbox
        eventId="e1"
        threads={[
          makeRow({
            messages: [
              {
                id: "m1",
                body: "When is move-in?",
                authorIsArtist: true,
                createdAt: new Date(),
              },
            ],
          }),
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Elena Kim/i }));
    expect(screen.getAllByText("When is move-in?").length).toBeGreaterThan(0);
    expect(
      screen.getAllByLabelText(/Also post this reply as an announcement/i)
        .length
    ).toBeGreaterThan(0);
    // Subject input is hidden until the checkbox is ticked.
    expect(
      screen.queryByLabelText(/Announcement subject/i)
    ).not.toBeInTheDocument();
  });

  it("reveals the announcement-subject input only when the checkbox is ticked", () => {
    render(
      <ThreadInbox
        eventId="e1"
        threads={[makeRow()]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Elena Kim/i }));
    const checkboxes = screen.getAllByLabelText(
      /Also post this reply as an announcement/i
    );
    fireEvent.click(checkboxes[0]);
    expect(
      screen.getAllByLabelText(/Announcement subject/i).length
    ).toBeGreaterThan(0);
  });
});
