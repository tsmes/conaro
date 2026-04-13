import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PublicNavLinks } from "@/components/layout/public-nav-links";
import { AvatarMenu } from "@/components/layout/avatar-menu";

// Chrome for all unauthenticated surfaces (homepage, login, register, public
// directory). Glass top nav only — individual pages own their own footer if
// they want one. Auth-aware: swap the Log in / Register buttons for an avatar
// menu when a session is present so signed-in users can still reach their
// authenticated areas from public pages.
export async function PublicShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <>
      <header className="glass-nav fixed top-0 left-0 right-0 z-50 h-16">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 md:px-8">
          <Link
            href="/"
            className="font-heading text-xl font-extrabold tracking-tighter text-primary"
          >
            Art Apply
          </Link>
          <PublicNavLinks />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session?.user?.role ? (
              <AvatarMenu
                name={session.user.name}
                email={session.user.email}
                role={session.user.role}
              />
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/login">Log in</Link>}
                />
                <Button
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/register">Register</Link>}
                />
              </>
            )}
          </div>
        </div>
      </header>
      <main className="pt-16">{children}</main>
    </>
  );
}
