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

import { TableLayout } from "@/components/conventions/selection/table-layout";
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
    helpers: 1,
    accessibilityNeeds: null,
    genres: ["Comics", "Zines"],
    mediums: ["Ink"],
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

const applicants: SelectionApplicantView[] = [makeApplicant()];

function defaultProps(
  overrides: Partial<React.ComponentProps<typeof TableLayout>> = {}
) {
  return {
    applicants,
    bulkMode: false,
    selected: new Set<string>(),
    onToggleSelect: () => {},
    onTogglePin: () => {},
    onOpenDeep: () => {},
    onConfirmPayment: () => {},
    onRevoke: () => {},
    readOnly: false,
    eventStatus: "reviewing" as const,
    eventId: "e1",
    waitlistEnabled: false,
    ...overrides,
  };
}

describe("TableLayout", () => {
  it("renders a row per applicant with status", () => {
    render(<TableLayout {...defaultProps()} />);
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Undecided")).toBeInTheDocument();
  });

  it("fires onOpenDeep when the applicant name button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenDeep = vi.fn();
    render(<TableLayout {...defaultProps({ onOpenDeep })} />);
    await user.click(screen.getByRole("button", { name: /Artist One/ }));
    expect(onOpenDeep).toHaveBeenCalledWith("a1");
  });

  it("triggers only onTogglePin when pin button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenDeep = vi.fn();
    const onTogglePin = vi.fn();
    render(
      <TableLayout {...defaultProps({ onTogglePin, onOpenDeep })} />
    );
    await user.click(screen.getByRole("button", { name: "Pin" }));
    expect(onTogglePin).toHaveBeenCalledWith("a1", true);
    expect(onOpenDeep).not.toHaveBeenCalled();
  });

  it("disables the open-deep button when bulkMode is on so checkboxes are the primary interaction", () => {
    render(<TableLayout {...defaultProps({ bulkMode: true })} />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Artist One/ })).toBeDisabled();
  });

  it("post-publish: shows Mark paid + Revoke icons for accepted rows only", async () => {
    const user = userEvent.setup();
    const onConfirmPayment = vi.fn();
    const onRevoke = vi.fn();
    const twoRows: SelectionApplicantView[] = [
      makeApplicant({ id: "a1", status: "accepted", displayName: "A1" }),
      makeApplicant({ id: "a2", status: "rejected", displayName: "A2" }),
    ];
    render(
      <TableLayout
        {...defaultProps({
          applicants: twoRows,
          eventStatus: "results_published",
          readOnly: true,
          onConfirmPayment,
          onRevoke,
        })}
      />
    );
    const markPaid = screen.getAllByRole("button", { name: /Mark paid/i });
    const revoke = screen.getAllByRole("button", { name: /Revoke acceptance/i });
    expect(markPaid).toHaveLength(1);
    expect(revoke).toHaveLength(1);
    await user.click(markPaid[0]);
    expect(onConfirmPayment).toHaveBeenCalledWith("a1");
    await user.click(revoke[0]);
    expect(onRevoke).toHaveBeenCalledWith("a1");
  });

  it("post-publish + waitlistEnabled: renders waitlist controls on accepted rows", () => {
    render(
      <TableLayout
        {...defaultProps({
          applicants: [
            makeApplicant({ id: "a1", status: "accepted", displayName: "A1" }),
          ],
          eventStatus: "results_published",
          readOnly: true,
          waitlistEnabled: true,
        })}
      />
    );
    expect(
      screen.getByRole("button", { name: /Move to waitlist/i })
    ).toBeInTheDocument();
  });
});
