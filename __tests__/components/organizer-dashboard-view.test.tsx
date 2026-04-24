import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  OrganizerDashboardView,
  type OrganizerDashboardViewProps,
} from "@/components/conventions/organizer-dashboard-view";

function baseProps(
  overrides: Partial<OrganizerDashboardViewProps> = {}
): OrganizerDashboardViewProps {
  return {
    firstName: "Anna",
    conventionName: "Kawaiicon",
    currentEvent: null,
    recentAnnouncements: [],
    events: [],
    ...overrides,
  };
}

describe("OrganizerDashboardView", () => {
  it("renders the welcome hero with firstName + conventionName", () => {
    const { container } = render(<OrganizerDashboardView {...baseProps()} />);
    expect(screen.getByText(/Welcome back, Anna/)).toBeInTheDocument();
    expect(screen.getByText("Kawaiicon")).toBeInTheDocument();
    expect(
      container.querySelector('a[href="/conventions/manage/edit"]')
    ).not.toBeNull();
  });

  it("shows the empty-state card with Create event CTA when there is no current event", () => {
    const { container } = render(<OrganizerDashboardView {...baseProps()} />);
    expect(screen.getByText(/No upcoming event/)).toBeInTheDocument();
    expect(
      container.querySelectorAll('a[href="/conventions/manage/events/new"]')
        .length
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders the current-event card with counts and status badge", () => {
    const { container } = render(
      <OrganizerDashboardView
        {...baseProps({
          currentEvent: {
            id: "ev-1",
            name: "Kawaiicon 2026",
            status: "reviewing",
            eventStartDate: "2026-06-20",
            eventEndDate: "2026-06-21",
            applicationCount: 42,
            acceptedCount: 15,
            unreadThreadCount: 3,
          },
        })}
      />
    );
    expect(screen.getAllByText("Kawaiicon 2026").length).toBeGreaterThan(0);
    expect(screen.getByText("Reviewing")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(
      container.querySelector(
        'a[href="/conventions/manage/events/ev-1/applications"]'
      )
    ).not.toBeNull();
    expect(
      container.querySelector('a[href="/conventions/manage/events/ev-1"]')
    ).not.toBeNull();
  });

  it("shows the unread-thread callout when there are unread messages", () => {
    render(
      <OrganizerDashboardView
        {...baseProps({
          currentEvent: {
            id: "ev-1",
            name: "Kawaiicon 2026",
            status: "reviewing",
            eventStartDate: "2026-06-20",
            eventEndDate: "2026-06-21",
            applicationCount: 1,
            acceptedCount: 1,
            unreadThreadCount: 2,
          },
        })}
      />
    );
    expect(
      screen.getByText(/2 new questions from artists/i)
    ).toBeInTheDocument();
  });

  it("hides the messages section entirely when there are no announcements and zero unread", () => {
    render(
      <OrganizerDashboardView
        {...baseProps({
          currentEvent: {
            id: "ev-1",
            name: "X",
            status: "reviewing",
            eventStartDate: "2026-06-20",
            eventEndDate: null,
            applicationCount: 0,
            acceptedCount: 0,
            unreadThreadCount: 0,
          },
        })}
      />
    );
    expect(screen.queryByText(/^Messages$/)).not.toBeInTheDocument();
  });

  it("lists up to N announcements with subject + event name + relative time", () => {
    render(
      <OrganizerDashboardView
        {...baseProps({
          recentAnnouncements: [
            {
              id: "a1",
              subject: "Move-in time",
              eventId: "ev-1",
              eventName: "Kawaiicon 2026",
              createdAt: new Date(Date.now() - 60_000),
            },
            {
              id: "a2",
              subject: "Vendor list",
              eventId: "ev-2",
              eventName: "Kawaiicon 2025",
              createdAt: new Date(Date.now() - 3 * 3600_000),
            },
          ],
        })}
      />
    );
    expect(screen.getByText("Move-in time")).toBeInTheDocument();
    expect(screen.getByText(/Posted to Kawaiicon 2026/)).toBeInTheDocument();
    expect(screen.getByText("Vendor list")).toBeInTheDocument();
  });

  it("renders the three quick-action tiles with correct hrefs", () => {
    const { container } = render(<OrganizerDashboardView {...baseProps()} />);
    expect(
      container.querySelectorAll('a[href="/conventions/manage/edit"]').length
    ).toBeGreaterThanOrEqual(1);
    expect(
      container.querySelectorAll(
        'a[href="/conventions/manage/events/new"]'
      ).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      container.querySelector('a[href="/conventions/manage/lists"]')
    ).not.toBeNull();
  });

  it("lists every event from the `events` prop", () => {
    render(
      <OrganizerDashboardView
        {...baseProps({
          events: [
            {
              id: "e1",
              name: "Kawaiicon 2026",
              status: "reviewing",
              eventStartDate: "2026-06-20",
              eventEndDate: "2026-06-21",
              venueCity: "Oslo",
              venueCountry: "NO",
              availableStands: 60,
            },
            {
              id: "e2",
              name: "Kawaiicon 2025",
              status: "results_published",
              eventStartDate: "2025-06-20",
              eventEndDate: "2025-06-21",
              venueCity: null,
              venueCountry: null,
              availableStands: null,
            },
          ],
        })}
      />
    );
    expect(screen.getByText("Kawaiicon 2026")).toBeInTheDocument();
    expect(screen.getByText("Kawaiicon 2025")).toBeInTheDocument();
    expect(screen.getByText("Results Published")).toBeInTheDocument();
  });
});
