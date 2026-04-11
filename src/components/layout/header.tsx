import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Art Apply
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost" }))}
          >
            Log in
          </Link>
          <Link href="/register" className={cn(buttonVariants())}>
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
