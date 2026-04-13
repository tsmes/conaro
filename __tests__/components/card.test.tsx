import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card", () => {
  it("renders with rounded-2xl, ambient shadow, and no border", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card.className).toMatch(/rounded-2xl/);
    expect(card.className).toMatch(/shadow-gallery/);
    expect(card.className).toMatch(/bg-card/);
    // No default border on the card root
    expect(card.className).not.toMatch(/ring-/);
  });

  it("applies hover styles when interactive is true", () => {
    render(
      <Card interactive data-testid="card">
        <CardContent>Clickable</CardContent>
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveAttribute("data-interactive", "true");
    expect(card.className).toMatch(/cursor-pointer/);
    expect(card.className).toMatch(/hover:bg-surface-bright/);
  });

  it("does not apply hover styles when interactive is not set", () => {
    render(
      <Card data-testid="card">
        <CardContent>Static</CardContent>
      </Card>
    );
    const card = screen.getByTestId("card");
    expect(card).not.toHaveAttribute("data-interactive");
    expect(card.className).not.toMatch(/cursor-pointer/);
  });

  it("CardFooter has no top border (no-line rule)", () => {
    render(
      <Card>
        <CardContent>Body</CardContent>
        <CardFooter data-testid="footer">Footer</CardFooter>
      </Card>
    );
    const footer = screen.getByTestId("footer");
    expect(footer.className).not.toMatch(/border-t/);
  });
});
