import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomepageView } from "@/components/homepage/homepage-view";

describe("HomepageView", () => {
  it("renders the hero and key section headings", () => {
    render(<HomepageView />);
    expect(screen.getByText("The Digital Curator")).toBeInTheDocument();
    // Hero headline — split across a text node and a styled span, so use a
    // regex match against the substring.
    expect(screen.getByText(/Apply to conventions\./)).toBeInTheDocument();
    expect(screen.getByText("Designed for Focus")).toBeInTheDocument();
    expect(
      screen.getByText("Spend more time creating, less time applying.")
    ).toBeInTheDocument();
  });

  it("points logged-out CTAs at the registration flows", () => {
    render(<HomepageView />);
    const artistCta = screen.getByText("Join as Creator").closest("a");
    const organizerCta = screen.getByText("Manage Events").closest("a");
    expect(artistCta).toHaveAttribute("href", "/register/artist");
    expect(organizerCta).toHaveAttribute("href", "/register/organizer");

    const finalStart = screen.getByText("Get Started").closest("a");
    expect(finalStart).toHaveAttribute("href", "/register/artist");
  });

  it("swaps CTAs to Dashboard when the session is an artist", () => {
    render(<HomepageView role="artist" />);
    const links = screen
      .getAllByText("Go to Dashboard")
      .map((el) => el.closest("a"));
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/dashboard");
    }
  });

  it("swaps CTAs to Manage Conventions when the session is an organizer", () => {
    render(<HomepageView role="organizer" />);
    const links = screen
      .getAllByText("Manage Conventions")
      .map((el) => el.closest("a"));
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/conventions/manage");
    }
  });

  it("renders the footer with About / Terms / Privacy links", () => {
    render(<HomepageView />);
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Terms")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
    // Support dropped per PRD cut list
    expect(screen.queryByText("Support")).not.toBeInTheDocument();
  });
});
