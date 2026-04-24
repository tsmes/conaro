import type React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock(
  "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/waitlist-actions",
  () => ({
    promoteFromWaitlist: vi.fn(),
    demoteToWaitlist: vi.fn(),
    removeFromWaitlist: vi.fn(),
  })
);

import { GalleryLayout } from "@/components/conventions/selection/gallery-layout";
import type { SelectionApplicantView } from "@/components/conventions/selection/types";

function makeApplicant(
  overrides: Partial<SelectionApplicantView> = {}
): SelectionApplicantView {
  return {
    id: "a1",
    profileId: "p1",
    status: "submitted",
    pinned: false,
    paymentConfirmed: false,
    createdAt: new Date("2026-01-05"),
    displayName: "Artist One",
    bio: null,
    helpers: 0,
    accessibilityNeeds: null,
    genres: [],
    mediums: [],
    images: [],
    answers: {
      tableSizeLabel: null,
      tableSizeDimensions: null,
      tableSizePriceNok: null,
      assistantsCount: null,
      assistantsNames: [],
      sharingStand: null,
      placementPreference: null,
      additionalComments: null,
      promotionConsent: null,
      guidelinesAcknowledgedAt: null,
    },
    ...overrides,
  };
}

const applicants: SelectionApplicantView[] = [
  makeApplicant({
    id: "a1",
    status: "submitted",
    displayName: "Artist One",
    genres: ["Comics", "Zines"],
    mediums: ["Ink"],
    images: [
      { id: "img1", url: "/test.webp", sortOrder: 0, caption: null },
    ],
  }),
  makeApplicant({
    id: "a2",
    profileId: "p2",
    status: "accepted",
    pinned: true,
    createdAt: new Date("2026-01-06"),
    displayName: "Artist Two",
  }),
];

function defaultProps(overrides: Partial<React.ComponentProps<typeof GalleryLayout>> = {}) {
  return {
    applicants,
    bulkMode: false,
    selected: new Set<string>(),
    onToggleSelect: () => {},
    onTogglePin: () => {},
    onSetStatus: () => {},
    onConfirmPayment: () => {},
    onRevoke: () => {},
    readOnly: false,
    eventStatus: "reviewing" as const,
    eventId: "e1",
    waitlistEnabled: false,
    ...overrides,
  };
}

describe("GalleryLayout", () => {
  it("renders a card per applicant with name and status badge", () => {
    render(<GalleryLayout {...defaultProps()} />);
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Artist Two")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Undecided")).toBeInTheDocument();
  });

  it("fires onSetStatus with 'accepted' when Accept button is clicked", async () => {
    const user = userEvent.setup();
    const onSetStatus = vi.fn();
    render(<GalleryLayout {...defaultProps({ onSetStatus })} />);
    const acceptButtons = screen.getAllByRole("button", { name: "Accept" });
    await user.click(acceptButtons[0]);
    expect(onSetStatus).toHaveBeenCalledWith("a1", "accepted");
  });

  it("hides pin and decision buttons when readOnly is true", () => {
    render(<GalleryLayout {...defaultProps({ readOnly: true })} />);
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    expect(screen.queryByRole("button", { name: /pin/i })).toBeNull();
  });

  it("shows bulk-mode checkboxes when bulkMode is on", async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    render(
      <GalleryLayout {...defaultProps({ bulkMode: true, onToggleSelect })} />
    );
    const boxes = screen.getAllByRole("button", { name: /select applicant/i });
    expect(boxes).toHaveLength(2);
    await user.click(boxes[0]);
    expect(onToggleSelect).toHaveBeenCalledWith("a1");
  });

  it("renders empty state when there are no applicants", () => {
    render(<GalleryLayout {...defaultProps({ applicants: [] })} />);
    expect(screen.getByText(/Nothing in this bucket/)).toBeInTheDocument();
  });

  it("post-publish: shows Mark paid + Revoke on accepted artists only", async () => {
    const user = userEvent.setup();
    const onConfirmPayment = vi.fn();
    const onRevoke = vi.fn();
    render(
      <GalleryLayout
        {...defaultProps({
          readOnly: true,
          eventStatus: "results_published",
          onConfirmPayment,
          onRevoke,
        })}
      />
    );
    // Only the accepted artist gets Mark paid / Revoke.
    const markPaid = screen.getAllByRole("button", { name: /Mark paid/i });
    const revoke = screen.getAllByRole("button", { name: /Revoke/i });
    expect(markPaid).toHaveLength(1);
    expect(revoke).toHaveLength(1);

    await user.click(markPaid[0]);
    expect(onConfirmPayment).toHaveBeenCalledWith("a2");
    await user.click(revoke[0]);
    expect(onRevoke).toHaveBeenCalledWith("a2");
  });

  it("post-publish + waitlistEnabled: renders waitlist controls on accepted cards", () => {
    render(
      <GalleryLayout
        {...defaultProps({
          readOnly: true,
          eventStatus: "results_published",
          waitlistEnabled: true,
        })}
      />
    );
    // WaitlistControls renders a "Waitlist" label + a "Move to waitlist"
    // button for accepted applicants.
    expect(screen.getAllByText("Waitlist").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /Move to waitlist/i })
    ).toBeInTheDocument();
  });
});
