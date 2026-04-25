import { notFound } from "next/navigation";

import {
  getCachedFloorPlan,
  getEventViewerContext,
} from "@/lib/events/event-context";
import { PublicFloorPlanView } from "@/components/floor-plans/public-floor-plan-view";
import { Card } from "@/components/ui/card";

interface FloorPlanPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ focus?: string }>;
}

export default async function FloorPlanPage({
  params,
  searchParams,
}: FloorPlanPageProps) {
  const [{ eventId }, { focus }] = await Promise.all([params, searchParams]);
  const ctx = await getEventViewerContext(eventId);

  if (ctx.event.status !== "results_published") notFound();
  const plan = await getCachedFloorPlan(ctx.event.id);
  if (!plan || plan.tables.length === 0) notFound();

  const highlightApplicationId =
    ctx.ownApplicationStatus === "accepted" && ctx.ownApplicationId
      ? ctx.ownApplicationId
      : undefined;

  return (
    <Card className="p-6 md:p-8">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Floor plan
      </p>
      {highlightApplicationId && (
        <p className="mb-3 text-sm text-muted-foreground">
          Your table is outlined in violet.
        </p>
      )}
      <PublicFloorPlanView
        plan={plan}
        tableSizeOptions={ctx.event.tableSizeOptions ?? []}
        highlightApplicationId={highlightApplicationId}
        pulseHighlight={focus === "table"}
      />
    </Card>
  );
}
