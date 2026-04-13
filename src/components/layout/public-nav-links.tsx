"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/events", label: "Events" },
  { href: "/conventions", label: "Conventions" },
] as const;

// Center-aligned public nav links with active-state styling. Hidden below
// md — mobile users can reach the same pages via the homepage/footer.
export function PublicNavLinks() {
  const pathname = usePathname();
  return (
    <div className="hidden items-center gap-8 md:flex">
      {LINKS.map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "font-heading text-sm font-bold tracking-tight transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
