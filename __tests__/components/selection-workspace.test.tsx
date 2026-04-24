import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SelectionWorkspace } from "@/components/conventions/selection/selection-workspace";
import type { SelectionApplicantView } from "@/components/conventions/selection/types";

const toggleMock = vi.fn();
const decisionMock = vi.fn();
const bulkMock = vi.fn();
const confirmMock = vi.fn();
const revokeMock = vi.fn();

vi.mock(
  "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/waitlist-actions",
  () => ({
    promoteFromWaitlist: vi.fn(),
    demoteToWaitlist: vi.fn(),
    removeFromWaitlist: vi.fn(),
  })
);

vi.mock(
  "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions",
  () => ({
    toggleApplicationPin: (
      _prev: unknown,
      formData: FormData
    ): Promise<{ success?: boolean; error?: string }> =>
      Promise.resolve(toggleMock(formData)),
    setApplicationDecision: (
      _prev: unknown,
      formData: FormData
    ): Promise<{ success?: boolean; error?: string }> =>
      Promise.resolve(decisionMock(formData)),
    setBulkDecision: (
      _prev: unknown,
      formData: FormData
    ): Promise<{ success?: boolean; error?: string }> =>
      Promise.resolve(bulkMock(formData)),
    confirmPayment: (
      _prev: unknown,
      formData: FormData
    ): Promise<{ success?: boolean; error?: string }> =>
      Promise.resolve(confirmMock(formData)),
    revokeApplication: (
      _prev: unknown,
      formData: FormData
    ): Promise<{ success?: boolean; error?: string }> =>
      Promise.resolve(revokeMock(formData)),
  })
);

const emptyAnswers = {
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
};

function buildApplicants(): SelectionApplicantView[] {
  return [
    {
      id: "a1",
      profileId: "p1",
      status: "submitted",
      pinned: false,
      paymentConfirmed: false,
      createdAt: new Date("2026-01-01"),
      displayName: "Artist One",
      bio: null,
      helpers: 0,
      accessibilityNeeds: null,
      genres: ["Comics"],
      mediums: ["Ink"],
      images: [],
      answers: emptyAnswers,
    },
    {
      id: "a2",
      profileId: "p2",
      status: "submitted",
      pinned: false,
      paymentConfirmed: false,
      createdAt: new Date("2026-01-02"),
      displayName: "Artist Two",
      bio: null,
      helpers: 0,
      accessibilityNeeds: null,
      genres: [],
      mediums: [],
      images: [],
      answers: emptyAnswers,
    },
  ];
}

describe("SelectionWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toggleMock.mockReturnValue({ success: true });
    decisionMock.mockReturnValue({ success: true });
    bulkMock.mockReturnValue({ success: true });
    confirmMock.mockReturnValue({ success: true });
    revokeMock.mockReturnValue({ success: true });
  });

  it("renders the gallery layout by default with each applicant", () => {
    render(
      <SelectionWorkspace
        eventId="e1"
        eventStatus="reviewing"
        availableStands={10}
        applicants={buildApplicants()}
        waitlistEnabled={false}
      />
    );
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Artist Two")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /gallery/i })
    ).toHaveAttribute("aria-checked", "true");
  });

  it("updates counts after accepting an applicant", async () => {
    const user = userEvent.setup();
    render(
      <SelectionWorkspace
        eventId="e1"
        eventStatus="reviewing"
        availableStands={10}
        applicants={buildApplicants()}
        waitlistEnabled={false}
      />
    );
    const acceptButtons = screen.getAllByRole("button", { name: "Accept" });
    await user.click(acceptButtons[0]);

    await waitFor(() => {
      expect(decisionMock).toHaveBeenCalled();
    });

    expect(
      screen.getByText(/1 accepted/)
    ).toBeInTheDocument();
  });

  it("sends bulk accept with the selected application ids", async () => {
    const user = userEvent.setup();
    render(
      <SelectionWorkspace
        eventId="e1"
        eventStatus="reviewing"
        availableStands={10}
        applicants={buildApplicants()}
        waitlistEnabled={false}
      />
    );

    await user.click(screen.getByRole("button", { name: /bulk actions/i }));

    const selectButtons = screen.getAllByRole("button", {
      name: /select applicant/i,
    });
    await user.click(selectButtons[0]);
    await user.click(selectButtons[1]);

    await user.click(screen.getByRole("button", { name: /accept all/i }));

    await waitFor(() => {
      expect(bulkMock).toHaveBeenCalled();
    });
    const formData = bulkMock.mock.calls[0][0] as FormData;
    expect(formData.get("decision")).toBe("accepted");
    expect(formData.getAll("applicationIds").sort()).toEqual(["a1", "a2"]);
  });

  it("hides pin, accept/reject, and bulk when event is results_published", () => {
    render(
      <SelectionWorkspace
        eventId="e1"
        eventStatus="results_published"
        availableStands={10}
        applicants={buildApplicants()}
        waitlistEnabled={false}
      />
    );
    expect(
      screen.queryByRole("button", { name: /bulk actions/i })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  });
});
