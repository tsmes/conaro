"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Layout,
  LogIn,
  Menu,
  Palette,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PublicMobileMenuProps {
  isAuthenticated: boolean;
  isArtist: boolean;
}

interface NavItem {
  href: string;
  label: string;
  Icon: typeof Layout;
}

const ARTIST_LINKS: NavItem[] = [
  { href: "/", label: "Events", Icon: Sparkles },
  { href: "/dashboard", label: "Dashboard", Icon: Layout },
  { href: "/dashboard/profile", label: "Profile", Icon: User },
  { href: "/notifications", label: "Notifications", Icon: Bell },
];

const PUBLIC_LINKS: NavItem[] = [
  { href: "/for-artists", label: "For artists", Icon: Palette },
  { href: "/for-conventions", label: "For conventions", Icon: Users },
];

export function PublicMobileMenu({
  isAuthenticated,
  isArtist,
}: PublicMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = isArtist ? ARTIST_LINKS : PUBLIC_LINKS;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-[10px] border border-border transition active:scale-95 hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-[18px]" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 flex w-[86%] max-w-[340px] flex-col border-l border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Palette className="size-4" />
                </div>
                <span className="font-heading text-[17px] font-extrabold tracking-tight">
                  conaro<span className="text-primary">.</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-[10px] border border-border transition active:scale-95"
                aria-label="Close menu"
              >
                <X className="size-[18px]" />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-1">
              {links.map(({ href, label, Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex h-12 items-center gap-3 rounded-[10px] px-3 text-[14.5px] font-semibold",
                      active
                        ? "bg-muted text-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="size-[17px]" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            {!isAuthenticated && (
              <div className="mt-auto flex flex-col gap-2 border-t border-border pt-6">
                <Button
                  size="default"
                  className="w-full justify-center"
                  nativeButton={false}
                  render={
                    <Link href="/login" onClick={() => setOpen(false)}>
                      <LogIn className="size-4" />
                      Sign in
                    </Link>
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
