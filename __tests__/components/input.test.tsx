import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

describe("Input", () => {
  it("renders with filled background, no border, and primary focus ring", () => {
    render(<Input placeholder="Your name" />);
    const input = screen.getByPlaceholderText("Your name");
    expect(input).toBeInTheDocument();
    expect(input.className).toMatch(/bg-secondary/);
    expect(input.className).toMatch(/border-0/);
    expect(input.className).toMatch(/focus-visible:ring-2/);
    expect(input.className).toMatch(/focus-visible:ring-offset-4/);
  });

  it("spreads HTML input props (type, value, etc.)", () => {
    render(<Input type="email" defaultValue="a@b.co" aria-label="email" />);
    const input = screen.getByLabelText("email") as HTMLInputElement;
    expect(input.type).toBe("email");
    expect(input.value).toBe("a@b.co");
  });
});

describe("Textarea", () => {
  it("renders with matching filled-fill focus treatment", () => {
    render(<Textarea placeholder="Artist bio" />);
    const ta = screen.getByPlaceholderText("Artist bio");
    expect(ta.className).toMatch(/bg-secondary/);
    expect(ta.className).toMatch(/border-0/);
    expect(ta.className).toMatch(/focus-visible:ring-offset-4/);
  });
});
