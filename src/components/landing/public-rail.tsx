import type { LandingEvent } from "@/lib/landing/data";
import { BrandCtaCard } from "./rail-cards/brand-cta-card";
import { JumpToMonthCard } from "./rail-cards/jump-to-month-card";
import { BrowseByRegionCard } from "./rail-cards/browse-by-region-card";

export interface PublicRailProps {
  events: LandingEvent[];
  viewer: "public" | "organizer";
  activeCountry: string | null;
}

// Right-rail composition shown to signed-out viewers and organizers.
export function PublicRail({ events, viewer, activeCountry }: PublicRailProps) {
  return (
    <aside className="space-y-4">
      <BrandCtaCard viewer={viewer} />
      <JumpToMonthCard events={events} />
      <BrowseByRegionCard activeCountry={activeCountry} />
    </aside>
  );
}
