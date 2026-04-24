"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface EventTabsNavProps {
  eventId: string;
  showMessaging: boolean;
  showFloorPlan: boolean;
}

export function EventTabsNav({
  eventId,
  showMessaging,
  showFloorPlan,
}: EventTabsNavProps) {
  const pathname = usePathname();
  const base = `/conventions/manage/events/${eventId}`;

  const tabs: Array<{ href: string; label: string; isActive: boolean }> = [
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
  ];
  if (showMessaging) {
    tabs.push({
      href: `${base}/messaging`,
      label: "Messaging",
      isActive: pathname.startsWith(`${base}/messaging`),
    });
  }
  if (showFloorPlan) {
    tabs.push({
      href: `${base}/floor-plan`,
      label: "Floor plan",
      isActive: pathname.startsWith(`${base}/floor-plan`),
    });
  }

  return (
    <nav className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
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
      ))}
    </nav>
  );
}
