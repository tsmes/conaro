import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CityChipsProps {
  availableCities: string[];
  activeCity: string | null;
}

// City sub-chips shown when the public viewer chooses 'By city'.
// Built from distinct venueCity values present on the current event
// set — no curated list, since cities vary per dataset and we want
// the chip row to mirror what's actually on offer.
export function CityChips({ availableCities, activeCity }: CityChipsProps) {
  if (availableCities.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/?filter=city"
        aria-current={!activeCity ? "page" : undefined}
        className={cn(
          "rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors",
          !activeCity
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground hover:bg-surface-bright"
        )}
      >
        All
      </Link>
      {availableCities.map((city) => {
        const active = city === activeCity;
        return (
          <Link
            key={city}
            href={`/?filter=city&city=${encodeURIComponent(city)}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-surface-bright"
            )}
          >
            {city}
          </Link>
        );
      })}
    </div>
  );
}
