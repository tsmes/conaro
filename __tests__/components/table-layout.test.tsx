import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TableLayout } from "@/components/conventions/selection/table-layout";
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
    helpers: 1,
    accessibilityNeeds: null,
    tableSizePreference: "Small",
    genres: ["Comics", "Zines"],
    mediums: ["Ink"],
    images: [],
  },
];

describe("TableLayout", () => {
  it("renders a row per applicant with status", () => {
    render(
      <TableLayout
        applicants={applicants}
        bulkMode={false}
        selected={new Set()}
        onToggleSelect={() => {}}
        onTogglePin={() => {}}
        onOpenDeep={() => {}}
        readOnly={false}
      />
    );
    expect(screen.getByText("Artist One")).toBeInTheDocument();
    expect(screen.getByText("Undecided")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
  });

  it("fires onOpenDeep when a row is clicked outside interactive children", async () => {
    const user = userEvent.setup();
    const onOpenDeep = vi.fn();
    render(
      <TableLayout
        applicants={applicants}
        bulkMode={false}
        selected={new Set()}
        onToggleSelect={() => {}}
        onTogglePin={() => {}}
        onOpenDeep={onOpenDeep}
        readOnly={false}
      />
    );
    await user.click(screen.getByText("Artist One"));
    expect(onOpenDeep).toHaveBeenCalledWith("a1");
  });

  it("does not trigger onOpenDeep when pin button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenDeep = vi.fn();
    const onTogglePin = vi.fn();
    render(
      <TableLayout
        applicants={applicants}
        bulkMode={false}
        selected={new Set()}
        onToggleSelect={() => {}}
        onTogglePin={onTogglePin}
        onOpenDeep={onOpenDeep}
        readOnly={false}
      />
    );
    await user.click(screen.getByRole("button", { name: "Pin" }));
    expect(onTogglePin).toHaveBeenCalledWith("a1", true);
    expect(onOpenDeep).not.toHaveBeenCalled();
  });

  it("shows a checkbox and does not open deep review when bulkMode is on", async () => {
    const user = userEvent.setup();
    const onOpenDeep = vi.fn();
    render(
      <TableLayout
        applicants={applicants}
        bulkMode={true}
        selected={new Set()}
        onToggleSelect={() => {}}
        onTogglePin={() => {}}
        onOpenDeep={onOpenDeep}
        readOnly={false}
      />
    );
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    await user.click(screen.getByText("Artist One"));
    expect(onOpenDeep).not.toHaveBeenCalled();
  });
});
