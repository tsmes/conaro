import Link from "next/link";
import { cn } from "@/lib/utils";

const COUNTRY_LABELS: Record<string, string> = {
  NO: "Norway",
  SE: "Sweden",
  DK: "Denmark",
  FI: "Finland",
  IS: "Iceland",
  CH: "Switzerland",
  DE: "Germany",
  FR: "France",
  UK: "United Kingdom",
  US: "United States",
};

function labelFor(code: string): string {
  return COUNTRY_LABELS[code] ?? code;
}

export interface CountryChipsProps {
  availableCountries: string[];
  activeCountry: string | null;
}

// Country sub-chips shown when the public viewer chooses 'By country'.
// Built from distinct venueCountry values present on the current event set.
export function CountryChips({
  availableCountries,
  activeCountry,
}: CountryChipsProps) {
  if (availableCountries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/?filter=country"
        aria-current={!activeCountry ? "page" : undefined}
        className={cn(
          "rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors",
          !activeCountry
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground hover:bg-surface-bright"
        )}
      >
        All
      </Link>
      {availableCountries.map((code) => {
        const active = code === activeCountry;
        return (
          <Link
            key={code}
            href={`/?filter=country&country=${code}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-surface-bright"
            )}
          >
            {labelFor(code)}
          </Link>
        );
      })}
    </div>
  );
}
