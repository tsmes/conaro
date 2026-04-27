import type { LandingEvent } from "@/lib/landing/data";
import { BrandCtaCard } from "./rail-cards/brand-cta-card";
import { JumpToMonthCard } from "./rail-cards/jump-to-month-card";
import { BrowseByCityCard } from "./rail-cards/browse-by-city-card";

export interface PublicRailProps {
  events: LandingEvent[];
  viewer: "public" | "organizer";
  activeCity: string | null;
  availableCities: string[];
}

// Right-rail composition shown to signed-out viewers and organizers.
export function PublicRail({
  events,
  viewer,
  activeCity,
  availableCities,
}: PublicRailProps) {
  return (
    <aside className="space-y-4">
      <BrandCtaCard viewer={viewer} />
      <JumpToMonthCard events={events} />
      <BrowseByCityCard cities={availableCities} activeCity={activeCity} />
    </aside>
  );
}
