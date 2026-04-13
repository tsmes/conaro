import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Control usePathname() for active-state assertions.
const mockPathname = vi.fn(() => "/dashboard");
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<object>("next/navigation");
  return { ...actual, usePathname: () => mockPathname() };
});

import { SidebarProvider, Sidebar } from "@/components/ui/sidebar";
import { AuthSidebarNav } from "@/components/layout/auth-sidebar-nav";

function renderNav(role: "artist" | "organizer", pathname = "/dashboard") {
  mockPathname.mockReturnValue(pathname);
  return render(
    <SidebarProvider>
      <Sidebar>
        <AuthSidebarNav role={role} />
      </Sidebar>
    </SidebarProvider>
  );
}

describe("AuthSidebarNav", () => {
  it("renders the artist nav set", () => {
    renderNav("artist");
    expect(screen.getByText("Artist Studio")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    // Organizer-only items should NOT appear for the artist role
    expect(screen.queryByText("Conventions")).not.toBeInTheDocument();
  });

  it("renders the organizer nav set", () => {
    renderNav("organizer", "/conventions/manage");
    expect(screen.getByText("Convention Studio")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Conventions")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
    expect(screen.queryByText("Events")).not.toBeInTheDocument();
  });

  it("highlights the nav item whose href matches the current pathname", () => {
    renderNav("artist", "/dashboard/profile");
    // SidebarMenuButton renders its `isActive` state as data-active="true"
    // on the wrapping element (via Base UI useRender slot state). Active-state
    // styling uses that attribute as the selector.
    const profileLink = screen.getByText("Profile").closest("a");
    expect(profileLink).not.toBeNull();
    // The link itself (render prop target) carries the data-active
    // attribute (Base UI useRender sets it as an empty-value boolean
    // attribute when state.active is true — hasAttribute is the correct
    // check, not getAttribute("true")).
    expect(profileLink?.hasAttribute("data-active")).toBe(true);

    const overviewLink = screen.getByText("Overview").closest("a");
    expect(overviewLink?.hasAttribute("data-active")).toBe(false);
  });

  it("includes a TODO for messaging in the artist nav source", () => {
    // The code comment is load-bearing (captures the deferred decision
    // alongside the nav items) — regression-protect it with a direct source
    // check so future edits don't silently drop the marker.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    const src = fs.readFileSync(
      "src/components/layout/auth-sidebar-nav.tsx",
      "utf8"
    );
    expect(src).toMatch(/TODO\(messaging\)/);
  });
});
