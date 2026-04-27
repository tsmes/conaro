import { notFound } from "next/navigation";

import {
  getCachedFloorPlan,
  getEventViewerContext,
} from "@/lib/events/event-context";
import { getArtistsForFloorPlan } from "@/lib/floor-plans/queries";
import { PublicFloorPlanView } from "@/components/floor-plans/public-floor-plan-view";
import { Card } from "@/components/ui/card";

interface FloorPlanPageProps {
  params: Promise<{ eventId: string }>;
  /** `artist` deep-links to a specific artist's table (used by the
   *  artist detail page's "Show on floor plan" button). `focus=table`
   *  triggers the initial pulse animation. */
  searchParams: Promise<{ focus?: string; artist?: string }>;
}

export default async function FloorPlanPage({
  params,
  searchParams,
}: FloorPlanPageProps) {
  const [{ eventId }, { focus, artist }] = await Promise.all([
    params,
    searchParams,
  ]);
  const ctx = await getEventViewerContext(eventId);

  if (!ctx.event.floorPlanPublishedAt) notFound();
  const plan = await getCachedFloorPlan(ctx.event.id);
  if (!plan || plan.tables.length === 0) notFound();

  // Deep-link override (?artist=<applicationId>) wins over the
  // viewer-self heuristic; only honour it when the application is
  // actually placed on this plan.
  const artistOnPlan =
    artist &&
    plan.tables.some((t) => t.assignment?.applicationId === artist)
      ? artist
      : null;
  const highlightApplicationId =
    artistOnPlan ??
    (ctx.ownApplicationStatus === "accepted" && ctx.ownApplicationId
      ? ctx.ownApplicationId
      : undefined);
  const artists = await getArtistsForFloorPlan(plan);

  return (
    <Card className="p-6 md:p-8">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Floor plan
      </p>
      {highlightApplicationId && (
        <p className="mb-3 text-sm text-muted-foreground">
          {artistOnPlan
            ? "Highlighted table is outlined in violet."
            : "Your table is outlined in violet."}
        </p>
      )}
      <PublicFloorPlanView
        plan={plan}
        tableSizeOptions={ctx.event.tableSizeOptions ?? []}
        artists={artists}
        highlightApplicationId={highlightApplicationId}
        initialPulse={focus === "table"}
      />
    </Card>
  );
}
