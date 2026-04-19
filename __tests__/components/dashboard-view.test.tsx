import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DashboardView,
  type DashboardApplication,
  type DashboardFollow,
} from "@/components/dashboard/dashboard-view";
import type { CompletenessResult } from "@/lib/profile/completeness";

function baseCompleteness(): CompletenessResult {
  return {
    basic: { complete: false, filled: 0, total: 2 },
    logistics: { complete: false, filled: 0, total: 4 },
    portfolio: { complete: false, filled: 0, total: 1 },
    overall: 0,
  };
}

function app(overrides: Partial<DashboardApplication> = {}): DashboardApplication {
  return {
    id: overrides.id ?? "app-1",
    status: overrides.status ?? "submitted",
    eventStatus: overrides.eventStatus ?? "accepting_applications",
    createdAtISO:
      overrides.createdAtISO ?? new Date("2025-10-12T12:00:00Z").toISOString(),
    eventName: overrides.eventName ?? "Artist Alley",
    eventId: overrides.eventId ?? "ev-1",
    conventionName: overrides.conventionName ?? "Anime Expo 2025",
  };
}

function follow(overrides: Partial<DashboardFollow> = {}): DashboardFollow {
  return {
    id: overrides.id ?? "f-1",
    conventionId: overrides.conventionId ?? "c-1",
    conventionName: overrides.conventionName ?? "Anime Expo",
    conventionLogoUrl: overrides.conventionLogoUrl ?? null,
  };
}

describe("DashboardView", () => {
  it("greets the artist by first name and shows the quiet subtitle by default", () => {
    render(
      <DashboardView
        firstName="Elena"
        unreadNotifications={0}
        completeness={baseCompleteness()}
        applications={[]}
        follows={[]}
      />
    );
    expect(screen.getByText("Welcome back, Elena")).toBeInTheDocument();
    expect(
      screen.getByText("Your creative journey continues.")
    ).toBeInTheDocument();
  });

  it("uses a count-aware subtitle when there are unread notifications", () => {
    render(
      <DashboardView
        firstName="Elena"
        unreadNotifications={3}
        completeness={baseCompleteness()}
        applications={[]}
        follows={[]}
      />
    );
    expect(
      screen.getByText(/You have 3 new notifications regarding your applications\./)
    ).toBeInTheDocument();
  });

  it("renders the three quick-action cards", () => {
    render(
      <DashboardView
        firstName="E"
        unreadNotifications={0}
        completeness={baseCompleteness()}
        applications={[]}
        follows={[]}
      />
    );
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    expect(screen.getByText("View Portfolio")).toBeInTheDocument();
    // Browse Events appears both as a quick action and in the empty-state
    // CTA — either is fine for this "cards render" check.
    expect(screen.getAllByText("Browse Events").length).toBeGreaterThan(0);
  });

  it("shows the empty-state CTA when there are no applications", () => {
    render(
      <DashboardView
        firstName="E"
        unreadNotifications={0}
        completeness={baseCompleteness()}
        applications={[]}
        follows={[]}
      />
    );
    expect(screen.getByText("No applications yet")).toBeInTheDocument();
    // The "Browse Events" link appears twice (quick action + empty state CTA);
    // confirm at least one is reachable.
    expect(screen.getAllByText("Browse Events").length).toBeGreaterThan(0);
  });

  it("renders applications and maps 'Accepted' to the success variant", () => {
    render(
      <DashboardView
        firstName="E"
        unreadNotifications={0}
        completeness={baseCompleteness()}
        applications={[app({ status: "accepted" })]}
        follows={[]}
      />
    );
    const badge = screen.getAllByText("Accepted")[0];
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-success-container/);
  });

  it("masks decisions while the event is in review state", () => {
    render(
      <DashboardView
        firstName="E"
        unreadNotifications={0}
        completeness={baseCompleteness()}
        applications={[
          app({ status: "accepted", eventStatus: "reviewing" }),
        ]}
        follows={[]}
      />
    );
    // 'Accepted' should NOT show; the mask renders as 'Under Review'
    expect(screen.queryAllByText("Accepted")).toHaveLength(0);
    expect(screen.getAllByText("Under Review").length).toBeGreaterThan(0);
  });

  it("still shows 'Submitted' for submitted apps during review", () => {
    render(
      <DashboardView
        firstName="E"
        unreadNotifications={0}
        completeness={baseCompleteness()}
        applications={[
          app({ status: "submitted", eventStatus: "reviewing" }),
        ]}
        follows={[]}
      />
    );
    expect(screen.getAllByText("Submitted").length).toBeGreaterThan(0);
  });

  it("hides the Following section when both apps and follows are empty", () => {
    render(
      <DashboardView
        firstName="E"
        unreadNotifications={0}
        completeness={baseCompleteness()}
        applications={[]}
        follows={[]}
      />
    );
    expect(screen.queryByText("Following")).not.toBeInTheDocument();
  });

  it("renders the Following list when there are follows", () => {
    render(
      <DashboardView
        firstName="E"
        unreadNotifications={0}
        completeness={baseCompleteness()}
        applications={[]}
        follows={[follow({ conventionName: "Anime Expo" })]}
      />
    );
    expect(screen.getByText("Following")).toBeInTheDocument();
    expect(screen.getAllByText("Anime Expo").length).toBeGreaterThan(0);
  });
});
