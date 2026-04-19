import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("renders pill-shaped with uppercase tracked text by default", () => {
    render(<Badge>Submitted</Badge>);
    const badge = screen.getByText("Submitted");
    expect(badge.className).toMatch(/rounded-full/);
    expect(badge.className).toMatch(/uppercase/);
    expect(badge.className).toMatch(/tracking-wider/);
  });

  it("applies each status variant's tone", () => {
    render(
      <>
        <Badge variant="default">a</Badge>
        <Badge variant="secondary">b</Badge>
        <Badge variant="success">c</Badge>
        <Badge variant="warning">d</Badge>
        <Badge variant="destructive">e</Badge>
      </>
    );
    expect(screen.getByText("a").className).toMatch(/bg-primary\/10/);
    expect(screen.getByText("b").className).toMatch(/bg-amber-100/);
    expect(screen.getByText("c").className).toMatch(/bg-success-container/);
    expect(screen.getByText("d").className).toMatch(/bg-warning-container/);
    expect(screen.getByText("e").className).toMatch(/bg-tertiary-container/);
  });
});
