import Link from "next/link";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/logout-button";

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Art Apply
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2">
          {session?.user ? (
            <>
              {session.user.role === "artist" && (
                <>
                  <Link
                    href="/dashboard"
                    className={cn(buttonVariants({ variant: "ghost" }))}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/events"
                    className={cn(buttonVariants({ variant: "ghost" }))}
                  >
                    Events
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    className={cn(buttonVariants({ variant: "ghost" }))}
                  >
                    Profile
                  </Link>
                </>
              )}
              {session.user.role === "organizer" && (
                <Link
                  href="/conventions/manage"
                  className={cn(buttonVariants({ variant: "ghost" }))}
                >
                  Conventions
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/events"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                Events
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost" }))}
              >
                Log in
              </Link>
              <Link href="/register" className={cn(buttonVariants())}>
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
