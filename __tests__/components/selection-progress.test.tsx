import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SelectionProgress } from "@/components/conventions/selection/selection-progress";

describe("SelectionProgress", () => {
  it("renders the summary with accepted, pinned, and open counts when target is set", () => {
    render(<SelectionProgress accepted={3} pinned={5} target={10} />);
    expect(
      screen.getByText("3 accepted · 5 pinned · 7 open")
    ).toBeInTheDocument();
    expect(screen.getByText(/target/i)).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("omits open count and the bar when target is null", () => {
    render(<SelectionProgress accepted={3} pinned={5} target={null} />);
    expect(screen.getByText("3 accepted · 5 pinned")).toBeInTheDocument();
    expect(screen.queryByText(/target/i)).toBeNull();
  });

  it("clamps open count at zero when accepted exceeds target", () => {
    render(<SelectionProgress accepted={12} pinned={0} target={10} />);
    expect(screen.getByText(/0 open/)).toBeInTheDocument();
  });
});
