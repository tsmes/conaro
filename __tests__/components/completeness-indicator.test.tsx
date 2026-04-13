import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompletenessIndicator } from "@/components/profile/completeness-indicator";
import type { CompletenessResult } from "@/lib/profile/completeness";

function build(overrides: Partial<CompletenessResult> = {}): CompletenessResult {
  return {
    basic: { complete: false, filled: 0, total: 2 },
    logistics: { complete: false, filled: 0, total: 4 },
    portfolio: { complete: false, filled: 0, total: 1 },
    overall: 0,
    ...overrides,
  };
}

describe("CompletenessIndicator", () => {
  it("renders zero-filled state with total segments from all sections", () => {
    render(<CompletenessIndicator completeness={build()} />);
    expect(screen.getByText("0/7 fields completed")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "7");
  });

  it("fills segments equal to the sum of filled fields across sections", () => {
    render(
      <CompletenessIndicator
        completeness={build({
          basic: { complete: true, filled: 2, total: 2 },
          logistics: { complete: false, filled: 1, total: 4 },
          portfolio: { complete: false, filled: 0, total: 1 },
          overall: 43,
        })}
      />
    );
    expect(screen.getByText("3/7 fields completed")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
  });

  it("renders section pills for all three sections", () => {
    render(<CompletenessIndicator completeness={build()} />);
    expect(screen.getByText("Basic Info")).toBeInTheDocument();
    expect(screen.getByText("Logistics")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
  });

  it("highlights completed section pills in primary color", () => {
    render(
      <CompletenessIndicator
        completeness={build({
          basic: { complete: true, filled: 2, total: 2 },
        })}
      />
    );
    // The pill label sits inside a parent div whose color classes reflect
    // completion state; query by text and inspect the wrapper.
    const pill = screen.getByText("Basic Info").closest("div");
    expect(pill?.className).toMatch(/text-primary/);
    const other = screen.getByText("Logistics").closest("div");
    expect(other?.className).toMatch(/text-muted-foreground/);
  });
});
