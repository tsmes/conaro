"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ArtistEventTabsNavProps {
  eventId: string;
  showFloorPlan: boolean;
  showMessages: boolean;
  showArtists?: boolean;
  showPractical?: boolean;
  showProgramme?: boolean;
  showGuests?: boolean;
  artistsCount?: number;
  programmeCount?: number;
  guestsCount?: number;
}

interface Tab {
  href: string;
  label: string;
  count?: number;
  matchPath: (pathname: string) => boolean;
}

export function ArtistEventTabsNav({
  eventId,
  showFloorPlan,
  showMessages,
  showArtists = false,
  showPractical = false,
  showProgramme = false,
  showGuests = false,
  artistsCount,
  programmeCount,
  guestsCount,
}: ArtistEventTabsNavProps) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;

  // Strip a single trailing slash so a "/events/x/" pathname still
  // matches the bare-base "Overview" tab.
  const normalized = pathname.endsWith("/") && pathname !== "/"
    ? pathname.slice(0, -1)
    : pathname;

  const tabs: Tab[] = [
    {
      href: base,
      label: "Overview",
      matchPath: (p) => p === base,
    },
  ];
  if (showProgramme) {
    tabs.push({
      href: `${base}/programme`,
      label: "Programme",
      count: programmeCount,
      matchPath: (p) => p === `${base}/programme`,
    });
  }
  if (showGuests) {
    tabs.push({
      href: `${base}/guests`,
      label: "Guests",
      count: guestsCount,
      matchPath: (p) => p === `${base}/guests`,
    });
  }
  if (showArtists) {
    tabs.push({
      href: `${base}/artists`,
      label: "Artists",
      count: artistsCount,
      matchPath: (p) => p === `${base}/artists`,
    });
  }
  if (showFloorPlan) {
    tabs.push({
      href: `${base}/floor-plan`,
      label: "Floor plan",
      matchPath: (p) => p === `${base}/floor-plan`,
    });
  }
  if (showPractical) {
    tabs.push({
      href: `${base}/practical`,
      label: "Practical info",
      matchPath: (p) => p === `${base}/practical`,
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
    <nav
      aria-label="Event sections"
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <div className="inline-flex gap-0.5 rounded-[11px] bg-muted p-[3px]">
        {tabs.map((tab) => {
          const active = tab.matchPath(normalized);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-[8px] px-3.5 py-2 text-[13px] font-semibold transition-colors",
                active
                  ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
