"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface EventTabsNavProps {
  eventId: string;
  /**
   * When false the Messaging tab renders disabled and can't be navigated
   * to — messaging an empty accepted-artist list isn't useful. Floor
   * plan is always enabled so organizers can set up rooms and tables
   * ahead of accepting applications.
   */
  messagingEnabled: boolean;
}

interface Tab {
  href: string;
  label: string;
  isActive: boolean;
  disabled?: boolean;
  disabledHint?: string;
}

export function EventTabsNav({
  eventId,
  messagingEnabled,
}: EventTabsNavProps) {
  const pathname = usePathname();
  const base = `/conventions/manage/events/${eventId}`;

  const tabs: Tab[] = [
    {
      href: base,
      label: "Event details",
      isActive: pathname === base || pathname === `${base}/fields`,
    },
    {
      href: `${base}/applications`,
      label: "Artists",
      isActive: pathname.startsWith(`${base}/applications`),
    },
    {
      href: `${base}/programme`,
      label: "Programme",
      isActive: pathname.startsWith(`${base}/programme`),
    },
    {
      href: `${base}/guests`,
      label: "Guests",
      isActive: pathname.startsWith(`${base}/guests`),
    },
    {
      href: `${base}/messaging`,
      label: "Messaging",
      isActive: pathname.startsWith(`${base}/messaging`),
      disabled: !messagingEnabled,
      disabledHint: "Available after results are published",
    },
    {
      href: `${base}/floor-plan`,
      label: "Floor plan",
      isActive: pathname.startsWith(`${base}/floor-plan`),
    },
  ];

  return (
    <nav className="flex gap-1 border-b border-border">
      {tabs.map((tab) =>
        tab.disabled ? (
          <span
            key={tab.href}
            title={tab.disabledHint}
            aria-disabled="true"
            className="-mb-px cursor-not-allowed border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground/50"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab.isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      )}
    </nav>
  );
}
