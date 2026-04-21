import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const REGIONS: { code: string | null; label: string }[] = [
  { code: "NO", label: "Norway" },
  { code: "SE", label: "Sweden" },
  { code: "DK", label: "Denmark" },
  { code: "FI", label: "Finland" },
  { code: "IS", label: "Iceland" },
  { code: null, label: "All Nordics" },
];

export interface BrowseByRegionCardProps {
  activeCountry: string | null;
}

function buildHref(code: string | null): string {
  return code ? `/?country=${code}` : "/";
}

export function BrowseByRegionCard({ activeCountry }: BrowseByRegionCardProps) {
  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
          Directory
        </p>
        <h3 className="font-heading text-base font-extrabold tracking-tight">
          Browse by region
        </h3>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => {
            const isActive =
              r.code === activeCountry ||
              (r.code === null && !activeCountry);
            return (
              <Link
                key={r.label}
                href={buildHref(r.code)}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-surface-bright"
                )}
              >
                {r.label}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
