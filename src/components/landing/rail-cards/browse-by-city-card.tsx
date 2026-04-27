import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface BrowseByCityCardProps {
  /** Distinct cities present on the currently displayed events. */
  cities: string[];
  activeCity: string | null;
}

// Right-rail directory card. The list is data-driven (cities derive
// from venueCity on the visible events) — no curated list, since the
// dataset will grow. "All Norway" clears the city filter.
export function BrowseByCityCard({ cities, activeCity }: BrowseByCityCardProps) {
  if (cities.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
          Directory
        </p>
        <h3 className="font-heading text-base font-extrabold tracking-tight">
          Browse by city
        </h3>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors",
              !activeCity
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-surface-bright"
            )}
          >
            All Norway
          </Link>
          {cities.map((city) => {
            const isActive = city === activeCity;
            return (
              <Link
                key={city}
                href={`/?city=${encodeURIComponent(city)}`}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-surface-bright"
                )}
              >
                {city}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
