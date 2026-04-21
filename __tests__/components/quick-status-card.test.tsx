import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuickStatusCard } from "@/components/landing/rail-cards/quick-status-card";

describe("QuickStatusCard", () => {
  it("renders all four counts with their labels", () => {
    render(
      <QuickStatusCard
        counts={{ total: 4, accepted: 1, underReview: 2, following: 5 }}
      />
    );
    expect(screen.getByText("Applications")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("In review")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Following")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders zero values without breaking", () => {
    render(
      <QuickStatusCard
        counts={{ total: 0, accepted: 0, underReview: 0, following: 0 }}
      />
    );
    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});
