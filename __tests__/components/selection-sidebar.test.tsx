import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SelectionSidebar } from "@/components/conventions/selection/selection-sidebar";

const counts = {
  all: 12,
  undecided: 5,
  pinned: 3,
  accepted: 4,
  rejected: 0,
} as const;

describe("SelectionSidebar", () => {
  it("renders each filter row with its count and marks the active row", () => {
    render(
      <SelectionSidebar
        counts={counts}
        active="pinned"
        onChange={() => {}}
        genresSummary={[]}
        bulkMode={false}
        onToggleBulkMode={() => {}}
        canBulk={true}
      />
    );
    expect(screen.getByRole("button", { name: /all applicants/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: /^pinned/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("fires onChange with the selected filter value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectionSidebar
        counts={counts}
        active="all"
        onChange={onChange}
        genresSummary={[]}
        bulkMode={false}
        onToggleBulkMode={() => {}}
        canBulk={true}
      />
    );
    await user.click(screen.getByRole("button", { name: /accepted/i }));
    expect(onChange).toHaveBeenCalledWith("accepted");
  });

  it("hides the bulk-mode button when canBulk is false", () => {
    render(
      <SelectionSidebar
        counts={counts}
        active="all"
        onChange={() => {}}
        genresSummary={[]}
        bulkMode={false}
        onToggleBulkMode={() => {}}
        canBulk={false}
      />
    );
    expect(screen.queryByRole("button", { name: /bulk/i })).toBeNull();
  });

  it("shows genres summary when provided", () => {
    render(
      <SelectionSidebar
        counts={counts}
        active="all"
        onChange={() => {}}
        genresSummary={["Comics", "Zines"]}
        bulkMode={false}
        onToggleBulkMode={() => {}}
        canBulk={true}
      />
    );
    expect(screen.getByText("Comics")).toBeInTheDocument();
    expect(screen.getByText("Zines")).toBeInTheDocument();
  });
});
