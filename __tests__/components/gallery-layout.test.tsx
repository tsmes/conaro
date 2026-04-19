import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GalleryLayout } from "@/components/conventions/selection/gallery-layout";
import type { SelectionApplicantView } from "@/components/conventions/selection/types";

const applicants: SelectionApplicantView[] = [
  {
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
    tableSizePreference: "Small",
    genres: ["Comics", "Zines"],
    mediums: ["Ink"],
    images: [{ id: "img1", url: "/test.webp", sortOrder: 0 }],
  },
  {
    id: "a2",
    profileId: "p2",
    status: "accepted",
    pinned: true,
    paymentConfirmed: false,
    createdAt: new Date("2026-01-06"),
    displayName: "Artist Two",
    bio: null,
    helpers: 0,
    accessibilityNeeds: null,
    tableSizePreference: null,
    genres: [],
    mediums: [],
    images: [],
  },
];

describe("GalleryLayout", () => {
  it("renders a card per applicant with name and status badge", () => {
    render(
      <GalleryLayout
        applicants={applicants}
        bulkMode={false}
        selected={new Set()}
        onToggleSelect={() => {}}
        onTogglePin={() => {}}
        onSetStatus={() => {}}
        readOnly={false}
      />
    );
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Artist Two")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Undecided")).toBeInTheDocument();
  });

  it("fires onSetStatus with 'accepted' when Accept button is clicked", async () => {
    const user = userEvent.setup();
    const onSetStatus = vi.fn();
    render(
      <GalleryLayout
        applicants={applicants}
        bulkMode={false}
        selected={new Set()}
        onToggleSelect={() => {}}
        onTogglePin={() => {}}
        onSetStatus={onSetStatus}
        readOnly={false}
      />
    );
    const acceptButtons = screen.getAllByRole("button", { name: "Accept" });
    await user.click(acceptButtons[0]);
    expect(onSetStatus).toHaveBeenCalledWith("a1", "accepted");
  });

  it("hides pin and decision buttons when readOnly is true", () => {
    render(
      <GalleryLayout
        applicants={applicants}
        bulkMode={false}
        selected={new Set()}
        onToggleSelect={() => {}}
        onTogglePin={() => {}}
        onSetStatus={() => {}}
        readOnly={true}
      />
    );
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    expect(screen.queryByRole("button", { name: /pin/i })).toBeNull();
  });

  it("shows bulk-mode checkboxes when bulkMode is on", async () => {
    const user = userEvent.setup();
    const onToggleSelect = vi.fn();
    render(
      <GalleryLayout
        applicants={applicants}
        bulkMode={true}
        selected={new Set()}
        onToggleSelect={onToggleSelect}
        onTogglePin={() => {}}
        onSetStatus={() => {}}
        readOnly={false}
      />
    );
    const boxes = screen.getAllByRole("button", { name: /select applicant/i });
    expect(boxes).toHaveLength(2);
    await user.click(boxes[0]);
    expect(onToggleSelect).toHaveBeenCalledWith("a1");
  });

  it("renders empty state when there are no applicants", () => {
    render(
      <GalleryLayout
        applicants={[]}
        bulkMode={false}
        selected={new Set()}
        onToggleSelect={() => {}}
        onTogglePin={() => {}}
        onSetStatus={() => {}}
        readOnly={false}
      />
    );
    expect(screen.getByText(/Nothing in this bucket/)).toBeInTheDocument();
  });
});
