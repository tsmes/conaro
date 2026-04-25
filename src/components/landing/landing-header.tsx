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
    <section className="space-y-4 pb-3 pt-5 sm:space-y-5 sm:pb-4 sm:pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="max-w-2xl space-y-1.5 sm:space-y-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary">
            {overline}
          </p>
          <h1 className="font-heading text-[clamp(1.7rem,6vw,2.6rem)] font-extrabold leading-[1.05] tracking-[-0.025em]">
            What&apos;s coming up
          </h1>
          <p
            className="text-[13.5px] text-muted-foreground sm:text-[14px]"
            style={{ textWrap: "pretty" }}
          >
            {subhead}
          </p>
        </div>
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
          <FilterChips options={options} activeValue={activeFilter} />
        </div>
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
