"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserCircle,
  CalendarDays,
  Bell,
  Settings,
  LogOut,
  Building2,
  Palette,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const ARTIST_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/notifications", label: "Notifications", icon: Bell },
  // TODO(messaging): add Messages nav item here when the messaging feature
  // ships. Data model, delivery, and artist <-> organizer permissions are
  // deferred — see the Phase 8 spec and project memory for context.
];

const ORGANIZER_NAV: NavItem[] = [
  { href: "/conventions/manage", label: "Overview", icon: LayoutDashboard },
  { href: "/conventions/manage", label: "Conventions", icon: Building2 },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

// Pick the single nav item whose href is the longest prefix of the current
// pathname — prevents parent routes from staying active when a more
// specific child nav item is present (e.g. /dashboard shouldn't show active
// when the user is on /dashboard/profile if Profile is also a nav item).
function findActiveHref(pathname: string, items: NavItem[]): string | null {
  let bestHref: string | null = null;
  let bestLen = -1;
  for (const item of items) {
    const href = item.href;
    const matches =
      pathname === href ||
      (href !== "/" && pathname.startsWith(`${href}/`));
    if (matches && href.length > bestLen) {
      bestHref = href;
      bestLen = href.length;
    }
  }
  return bestHref;
}

// Client portion of AuthShell's sidebar — owns the nav items, active state,
// footer, and logout dispatch. Accepts role from the server shell so it
// doesn't need to re-query the session on the client.
export function AuthSidebarNav({
  role,
  titleOverride,
}: {
  role: "artist" | "organizer";
  titleOverride?: string;
}) {
  const pathname = usePathname();
  const items = role === "artist" ? ARTIST_NAV : ORGANIZER_NAV;
  const activeHref = findActiveHref(pathname, items);
  const studioTitle =
    titleOverride ??
    (role === "artist" ? "Artist Studio" : "Convention Studio");

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary-container">
            <Palette className="size-5 text-on-primary-container" />
          </div>
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-extrabold leading-tight text-primary">
              {studioTitle}
            </h2>
            <p className="font-heading text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              The Digital Curator
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {items.map((item) => {
            const Icon = item.icon;
            const active = item.href === activeHref;
            return (
              <SidebarMenuItem key={`${item.href}-${item.label}`}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={item.label}
                  render={
                    <Link href={item.href}>
                      <Icon />
                      <span>{item.label}</span>
                    </Link>
                  }
                />
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              isActive={pathname.startsWith("/settings")}
              render={
                <Link href="/settings/notifications">
                  <Settings />
                  <span>Settings</span>
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Log out"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
