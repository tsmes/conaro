"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ArtistEventTabsNavProps {
  eventId: string;
  showFloorPlan: boolean;
  showMessages: boolean;
}

interface Tab {
  href: string;
  label: string;
  matchPath: (pathname: string) => boolean;
}

export function ArtistEventTabsNav({
  eventId,
  showFloorPlan,
  showMessages,
}: ArtistEventTabsNavProps) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;

  // Strip a single trailing slash so a "/events/x/" pathname still
  // matches the bare-base "Details" tab.
  const normalized = pathname.endsWith("/") && pathname !== "/"
    ? pathname.slice(0, -1)
    : pathname;

  const tabs: Tab[] = [
    {
      href: base,
      label: "Details",
      matchPath: (p) => p === base,
    },
  ];
  if (showFloorPlan) {
    tabs.push({
      href: `${base}/floor-plan`,
      label: "Floor plan",
      matchPath: (p) => p === `${base}/floor-plan`,
    });
  }
  if (showMessages) {
    tabs.push({
      href: `${base}/messages`,
      label: "Messages",
      matchPath: (p) => p === `${base}/messages`,
    });
  }

  // Skip rendering the bar entirely when there's only one destination
  // — a single "Details" pill adds visual noise without giving the
  // user anywhere else to go.
  if (tabs.length <= 1) return null;

  return (
    <nav className="flex gap-1 border-b border-border">
      {tabs.map((tab) => {
        const active = tab.matchPath(normalized);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
