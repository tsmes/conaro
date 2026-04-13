import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children and applies primary gradient by default", () => {
    render(<Button>Apply</Button>);
    const btn = screen.getByRole("button", { name: "Apply" });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toMatch(/bg-primary-gradient/);
    expect(btn.className).toMatch(/rounded-\[10px\]/);
    expect(btn.className).toMatch(/font-semibold/);
  });

  it("applies outline variant (ghost border, primary text, no background)", () => {
    render(<Button variant="outline">More</Button>);
    const btn = screen.getByRole("button", { name: "More" });
    expect(btn.className).toMatch(/bg-transparent/);
    expect(btn.className).toMatch(/border-border/);
    expect(btn.className).toMatch(/text-primary/);
  });

  it("applies lg size with generous hero padding", () => {
    render(<Button size="lg">Get started</Button>);
    const btn = screen.getByRole("button", { name: "Get started" });
    expect(btn.className).toMatch(/h-12/);
    expect(btn.className).toMatch(/px-8/);
  });

  it("preserves the existing xs and icon sizes", () => {
    render(
      <>
        <Button size="xs">xs</Button>
        <Button size="icon" aria-label="ic" />
      </>
    );
    expect(screen.getByRole("button", { name: "xs" }).className).toMatch(/h-6/);
    expect(screen.getByRole("button", { name: "ic" }).className).toMatch(/size-8/);
  });
});
