"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Settings, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsFor } from "@/lib/auth/initials";

// Shared avatar menu used by both shells. Role drives the primary dashboard
// destination: artists land on /dashboard; organizers land on
// /conventions/manage (their de-facto dashboard until a dedicated organizer
// dashboard ships in a later phase).
export function AvatarMenu({
  name,
  email,
  role,
}: {
  name?: string | null;
  email?: string | null;
  role: "artist" | "organizer";
}) {
  const initials = initialsFor({ name, email });
  const dashboardHref =
    role === "artist" ? "/dashboard" : "/conventions/manage";
  const dashboardLabel =
    role === "artist" ? "Dashboard" : "Manage Conventions";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <button
            {...props}
            aria-label="Account menu"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary-container text-on-primary-container text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        )}
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          render={
            <Link href={dashboardHref}>
              <LayoutDashboard className="size-4" />
              {dashboardLabel}
            </Link>
          }
        />
        <DropdownMenuItem
          render={
            <Link href="/settings/notifications">
              <Settings className="size-4" />
              Settings
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
