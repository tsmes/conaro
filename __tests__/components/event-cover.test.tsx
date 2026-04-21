import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventCover } from "@/components/landing/event-cover";

vi.mock("@/lib/storage", () => ({
  storage: {
    getUrl: (path: string) => `https://cdn.test/${path}`,
  },
}));

describe("EventCover", () => {
  it("renders the gradient class when no logo is provided", () => {
    render(
      <EventCover
        conventionId="kawaiicon"
        conventionName="Kawaiicon"
        logoPath={null}
        eventStartDate="2026-05-15"
        variant="card"
      />
    );
    const cover = screen.getByTestId("event-cover");
    expect(cover.dataset.hasLogo).toBe("false");
    expect(cover.className).toMatch(/cover-[a-f]/);
  });

  it("uses the logo path as a background image when provided", () => {
    render(
      <EventCover
        conventionId="kawaiicon"
        conventionName="Kawaiicon"
        logoPath="logos/kawaiicon.png"
        eventStartDate="2026-05-15"
        variant="card"
      />
    );
    const cover = screen.getByTestId("event-cover");
    expect(cover.dataset.hasLogo).toBe("true");
    expect(cover.style.backgroundImage).toContain(
      "https://cdn.test/logos/kawaiicon.png"
    );
  });

  it("formats the date stamp from ISO YYYY-MM-DD without timezone shift", () => {
    render(
      <EventCover
        conventionId="kc"
        conventionName="K"
        logoPath={null}
        eventStartDate="2026-01-03"
        variant="card"
      />
    );
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("uses Norwegian month abbreviations (Mai, not May)", () => {
    render(
      <EventCover
        conventionId="kc"
        conventionName="K"
        logoPath={null}
        eventStartDate="2026-05-03"
        variant="card"
      />
    );
    expect(screen.getByText("Mai")).toBeInTheDocument();
  });

  it("shows the 'Next up' badge in hero variant only", () => {
    const { rerender } = render(
      <EventCover
        conventionId="kc"
        conventionName="K"
        logoPath={null}
        eventStartDate="2026-05-15"
        variant="card"
      />
    );
    expect(screen.queryByText("Next up")).not.toBeInTheDocument();

    rerender(
      <EventCover
        conventionId="kc"
        conventionName="K"
        logoPath={null}
        eventStartDate="2026-05-15"
        variant="hero"
      />
    );
    expect(screen.getByText("Next up")).toBeInTheDocument();
  });

  it("renders convention initials", () => {
    render(
      <EventCover
        conventionId="kc"
        conventionName="Draw Day Nordic"
        logoPath={null}
        eventStartDate="2026-05-15"
        variant="card"
      />
    );
    expect(screen.getByText("DD")).toBeInTheDocument();
  });
});
