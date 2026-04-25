import { notFound } from "next/navigation";

import {
  getCachedFloorPlan,
  getEventViewerContext,
} from "@/lib/events/event-context";
import { getAcceptedArtistsForEvent } from "@/lib/floor-plans/queries";
import { Card } from "@/components/ui/card";
import { pickCoverGradient } from "@/lib/landing/cover-gradient";
import { cn } from "@/lib/utils";

interface ArtistsPageProps {
  params: Promise<{ eventId: string }>;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function ArtistsPage({ params }: ArtistsPageProps) {
  const { eventId } = await params;
  const ctx = await getEventViewerContext(eventId);

  if (ctx.event.status !== "results_published") notFound();

  const [artists, plan] = await Promise.all([
    getAcceptedArtistsForEvent(ctx.event.id),
    getCachedFloorPlan(ctx.event.id),
  ]);

  if (artists.length === 0) notFound();

  const standByApplication = new Map<string, string>();
  if (plan) {
    for (const table of plan.tables) {
      if (table.assignment) {
        standByApplication.set(table.assignment.applicationId, table.label);
      }
    }
  }

  // Sort: artists with a stand assigned first (by stand label), then
  // the rest alphabetically. Keeps the gallery legible whether or
  // not the floor plan is in.
  const sorted = [...artists].sort((a, b) => {
    const sa = standByApplication.get(a.applicationId);
    const sb = standByApplication.get(b.applicationId);
    if (sa && sb) return sa.localeCompare(sb);
    if (sa) return -1;
    if (sb) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary">
            Artists
          </p>
          <h2 className="mt-1 font-heading text-[22px] font-extrabold tracking-tight sm:text-[26px]">
            {artists.length} confirmed for this edition
          </h2>
        </div>
        <span className="font-mono text-[12px] text-muted-foreground">
          {standByApplication.size} on the floor plan
        </span>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((a) => {
          const stand = standByApplication.get(a.applicationId);
          const coverClass = pickCoverGradient(a.applicationId);
          return (
            <Card
              key={a.applicationId}
              className="overflow-hidden p-3 transition hover:shadow-lg"
            >
              <div
                className={cn(
                  "relative aspect-square overflow-hidden rounded-[10px]",
                  coverClass
                )}
              >
                <div className="absolute bottom-2 left-2 font-heading text-[28px] font-extrabold leading-none tracking-tight text-white">
                  {initialsFor(a.displayName)}
                </div>
              </div>
              <div className="mt-3">
                <div className="font-heading text-[14px] font-extrabold leading-tight">
                  {a.displayName}
                </div>
              </div>
              {stand && (
                <div className="mt-2 font-mono text-[11.5px] text-muted-foreground">
                  Stand {stand}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
