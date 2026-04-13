import Link from "next/link";

// Rendered only by the homepage — other public pages intentionally have no
// footer so they stay focused. About / Terms / Privacy pages don't exist yet;
// the links point at "#" with a TODO marker so the wiring is already in
// place when the real pages ship.
export function HomepageFooter() {
  return (
    <footer className="border-t-0 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row md:px-12">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          © {new Date().getFullYear()} Art Apply. All rights reserved.
        </p>
        <nav className="flex gap-8">
          {/* TODO: link to real pages when they exist. */}
          <Link
            href="#"
            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground underline decoration-primary/30 underline-offset-4 transition-colors hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="#"
            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground underline decoration-primary/30 underline-offset-4 transition-colors hover:text-foreground"
          >
            Terms
          </Link>
          <Link
            href="#"
            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground underline decoration-primary/30 underline-offset-4 transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
