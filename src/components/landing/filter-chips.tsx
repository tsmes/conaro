import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  href: string;
}

export interface FilterChipsProps {
  options: FilterOption[];
  activeValue: string;
}

// Segmented-control-style filter chips. Each option is a Link so the page
// stays server-rendered; the active option highlights via aria-current.
export function FilterChips({ options, activeValue }: FilterChipsProps) {
  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-0.5 rounded-[12px] bg-muted p-1"
    >
      {options.map((o) => {
        const active = o.value === activeValue;
        return (
          <Link
            key={o.value}
            href={o.href}
            role="tab"
            aria-current={active ? "page" : undefined}
            aria-selected={active}
            className={cn(
              "inline-flex h-8 items-center rounded-[9px] px-3 text-[12.5px] font-semibold whitespace-nowrap transition-colors",
              active
                ? "bg-card text-foreground shadow-gallery"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
