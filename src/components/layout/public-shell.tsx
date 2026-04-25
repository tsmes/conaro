import Link from "next/link";
import { Bell, Palette } from "lucide-react";

import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PublicNavLinks } from "@/components/layout/public-nav-links";
import { PublicMobileMenu } from "@/components/layout/public-mobile-menu";
import { AvatarMenu } from "@/components/layout/avatar-menu";

// Chrome for all unauthenticated surfaces (homepage, login, register, public
// directory). Sticky glass topbar with a polished mark on the left, nav links
// (lg+), and a right cluster that adapts to viewer state. Auth-aware so
// signed-in users still reach their authenticated areas via the avatar menu.
export async function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);
  const isArtist = session?.user?.role === "artist";

  return (
    <>
      <header className="glass-nav sticky top-0 z-50 border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6">
          {/* Mark */}
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Palette className="size-4" />
            </div>
            <span className="font-heading text-[16px] font-extrabold tracking-tight sm:text-[17px]">
              conaro<span className="text-primary">.</span>
            </span>
            <Badge
              variant="outline"
              className="ml-1 hidden uppercase tracking-wider md:inline-flex"
            >
              beta
            </Badge>
          </Link>

          {/* Nav (desktop) */}
          <div className="hidden lg:ml-2 lg:flex">
            <PublicNavLinks />
          </div>

          {/* Right cluster */}
          <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
            {isArtist && (
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative grid size-9 place-items-center rounded-[10px] border border-border transition hover:bg-muted active:scale-95 sm:size-9"
              >
                <Bell className="size-4" />
              </Link>
            )}
            <ThemeToggle />
            {isAuthenticated ? (
              <div className="hidden items-center gap-2 border-l border-border pl-2 sm:flex">
                <AvatarMenu
                  name={session?.user?.name ?? null}
                  email={session?.user?.email ?? null}
                  role={session?.user?.role ?? "artist"}
                />
              </div>
            ) : (
              <div className="hidden items-center gap-2 border-l border-border pl-2 md:flex">
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/login">Sign in</Link>}
                />
              </div>
            )}
            <PublicMobileMenu
              isAuthenticated={isAuthenticated}
              isArtist={Boolean(isArtist)}
            />
          </div>
        </div>
      </header>
      <main className="pt-0">{children}</main>
    </>
  );
}
