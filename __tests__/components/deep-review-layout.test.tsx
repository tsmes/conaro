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

import { DeepReviewLayout } from "@/components/conventions/selection/deep-review-layout";
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
    bio: "A short statement",
    helpers: 1,
    accessibilityNeeds: null,
    genres: ["Comics"],
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

describe("DeepReviewLayout", () => {
  it("shows the applicant at the given index with position indicator", () => {
    const applicants = [
      makeApplicant({ id: "a1", displayName: "One" }),
      makeApplicant({ id: "a2", displayName: "Two" }),
    ];
    render(
      <DeepReviewLayout
        applicants={applicants}
        index={1}
        onIndexChange={() => {}}
        onTogglePin={() => {}}
        onSetStatus={() => {}}
        onConfirmPayment={() => {}}
        onRevoke={() => {}}
        readOnly={false}
        eventStatus="reviewing"
        eventId="e1"
        waitlistEnabled={false}
      />
    );
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("2/2")).toBeInTheDocument();
  });

  it("disables Prev at the start and Next at the end", () => {
    const applicants = [
      makeApplicant({ id: "a1" }),
      makeApplicant({ id: "a2" }),
    ];
    const { rerender } = render(
      <DeepReviewLayout
        applicants={applicants}
        index={0}
        onIndexChange={() => {}}
        onTogglePin={() => {}}
        onSetStatus={() => {}}
        onConfirmPayment={() => {}}
        onRevoke={() => {}}
        readOnly={false}
        eventStatus="reviewing"
        eventId="e1"
        waitlistEnabled={false}
      />
    );
    expect(screen.getByRole("button", { name: /prev/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();

    rerender(
      <DeepReviewLayout
        applicants={applicants}
        index={1}
        onIndexChange={() => {}}
        onTogglePin={() => {}}
        onSetStatus={() => {}}
        onConfirmPayment={() => {}}
        onRevoke={() => {}}
        readOnly={false}
        eventStatus="reviewing"
        eventId="e1"
        waitlistEnabled={false}
      />
    );
    expect(screen.getByRole("button", { name: /prev/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("fires onSetStatus when Accept is clicked", async () => {
    const user = userEvent.setup();
    const onSetStatus = vi.fn();
    render(
      <DeepReviewLayout
        applicants={[makeApplicant()]}
        index={0}
        onIndexChange={() => {}}
        onTogglePin={() => {}}
        onSetStatus={onSetStatus}
        onConfirmPayment={() => {}}
        onRevoke={() => {}}
        readOnly={false}
        eventStatus="reviewing"
        eventId="e1"
        waitlistEnabled={false}
      />
    );
    await user.click(screen.getByRole("button", { name: /^accept$/i }));
    expect(onSetStatus).toHaveBeenCalledWith("a1", "accepted");
  });

  it("hides pin / accept / reject when readOnly and shows paid + revoke for accepted post-publish", () => {
    render(
      <DeepReviewLayout
        applicants={[
          makeApplicant({ status: "accepted", paymentConfirmed: false }),
        ]}
        index={0}
        onIndexChange={() => {}}
        onTogglePin={() => {}}
        onSetStatus={() => {}}
        onConfirmPayment={() => {}}
        onRevoke={() => {}}
        readOnly={true}
        eventStatus="results_published"
        eventId="e1"
        waitlistEnabled={false}
      />
    );
    expect(screen.queryByRole("button", { name: /^accept$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /not this year/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /^pin$/i })
    ).toBeNull();
    expect(screen.getByRole("button", { name: /mark paid/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revoke/i })).toBeInTheDocument();
  });

  it("shows empty state when there are no applicants", () => {
    render(
      <DeepReviewLayout
        applicants={[]}
        index={0}
        onIndexChange={() => {}}
        onTogglePin={() => {}}
        onSetStatus={() => {}}
        onConfirmPayment={() => {}}
        onRevoke={() => {}}
        readOnly={false}
        eventStatus="reviewing"
        eventId="e1"
        waitlistEnabled={false}
      />
    );
    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
  });
});
