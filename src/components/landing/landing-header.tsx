import { FilterChips, type FilterOption } from "./filter-chips";
import { CountryChips } from "./country-chips";

export type LandingViewer = "public" | "artist" | "organizer";

export interface LandingHeaderProps {
  viewer: LandingViewer;
  firstName: string | null;
  activeFilter: string;
  activeCountry: string | null;
  availableCountries: string[];
}

const ARTIST_FILTERS: FilterOption[] = [
  { value: "all", label: "All events", href: "/" },
  { value: "following", label: "Following", href: "/?filter=following" },
  { value: "open", label: "Open to apply", href: "/?filter=open" },
  {
    value: "applications",
    label: "My applications",
    href: "/?filter=applications",
  },
];

const PUBLIC_FILTERS: FilterOption[] = [
  { value: "all", label: "All upcoming", href: "/" },
  { value: "3m", label: "Next 3 months", href: "/?filter=3m" },
  { value: "country", label: "By country", href: "/?filter=country" },
];

export function LandingHeader({
  viewer,
  firstName,
  activeFilter,
  activeCountry,
  availableCountries,
}: LandingHeaderProps) {
  const isArtist = viewer === "artist";
  const overline = isArtist
    ? `Welcome back${firstName ? `, ${firstName}` : ""}`
    : "Events";
  const subhead = isArtist
    ? "Open calls, your applications and the shows you're following \u2014 all in one place."
    : "Upcoming conventions across the Nordics. Browse freely \u2014 no account needed.";

  const options = isArtist ? ARTIST_FILTERS : PUBLIC_FILTERS;
  const showCountryChips =
    !isArtist && (activeFilter === "country" || activeCountry !== null);

  return (
    <section className="space-y-5 pt-8 pb-2">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl space-y-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary">
            {overline}
          </p>
          <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tighter md:text-display-md">
            What&apos;s coming up
          </h1>
          <p className="text-[14px] text-muted-foreground">{subhead}</p>
        </div>
        <FilterChips options={options} activeValue={activeFilter} />
      </div>
      {showCountryChips && (
        <CountryChips
          availableCountries={availableCountries}
          activeCountry={activeCountry}
        />
      )}
    </section>
  );
}
