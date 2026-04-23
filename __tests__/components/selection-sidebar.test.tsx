import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SelectionSidebar } from "@/components/conventions/selection/selection-sidebar";

const counts = {
  all: 12,
  undecided: 5,
  pinned: 3,
  accepted: 4,
  waitlisted: 0,
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
        mediumsSummary={[]}
      />
    );
    expect(
      screen.getByRole("button", { name: /all applicants/i })
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "Pinned3" })
    ).toHaveAttribute("aria-pressed", "true");
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
        mediumsSummary={[]}
      />
    );
    await user.click(screen.getByRole("button", { name: /accepted/i }));
    expect(onChange).toHaveBeenCalledWith("accepted");
  });

  it("shows genre and medium tags with per-tag applied/accepted counts", () => {
    render(
      <SelectionSidebar
        counts={counts}
        active="all"
        onChange={() => {}}
        genresSummary={[{ tag: "Comics", applied: 5, accepted: 2 }]}
        mediumsSummary={[{ tag: "Ink", applied: 3, accepted: 1 }]}
      />
    );
    expect(screen.getByText("Comics")).toBeInTheDocument();
    expect(screen.getByText("Ink")).toBeInTheDocument();
  });

  it("collapses the tag section when the header toggle is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SelectionSidebar
        counts={counts}
        active="all"
        onChange={() => {}}
        genresSummary={[{ tag: "Comics", applied: 5, accepted: 2 }]}
        mediumsSummary={[]}
      />
    );
    expect(screen.getByText("Comics")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Genres/i }));
    expect(screen.queryByText("Comics")).toBeNull();
  });
});
