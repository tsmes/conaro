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
  Palette,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
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
      {/* Brand header — uses SidebarMenuButton size="lg" so the text half
          collapses automatically when the sidebar switches to icon mode.
          The menu-button wrapper also truncates the last span so long
          titles don't spill when space is tight. */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="hover:bg-transparent">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-container">
                <Palette className="size-5 text-on-primary-container" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-heading text-sm font-extrabold text-primary">
                  {studioTitle}
                </span>
                <span className="truncate font-heading text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Conaro
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = item.href === activeHref;
                return (
                  <SidebarMenuItem key={`${item.href}-${item.label}`}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      size="default"
                      className="h-10"
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              className="h-10"
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
              className="h-10"
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
