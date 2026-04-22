import { Card } from "@/components/ui/card";

interface SelectionProgressProps {
  applied: number;
  accepted: number;
  pinned: number;
  target: number | null;
}

export function SelectionProgress({
  applied,
  accepted,
  pinned,
  target,
}: SelectionProgressProps) {
  const hasTarget = target != null && target > 0;
  const remaining = hasTarget ? Math.max(0, target - accepted) : null;
  const acceptedPct = hasTarget ? Math.min(100, (accepted / target) * 100) : 0;
  const pinnedPct = hasTarget
    ? Math.min(100 - acceptedPct, (pinned / target) * 100)
    : 0;

  return (
    <Card className="shadow-gallery p-5">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Selection progress
          </p>
          <h2 className="font-heading text-[20px] font-extrabold tracking-tight whitespace-nowrap">
            {applied} applied · {accepted} accepted · {pinned} pinned
            {hasTarget ? ` · ${remaining} open` : ""}
          </h2>
        </div>
      </div>
      {hasTarget && (
        <div className="relative h-3 overflow-hidden rounded-full bg-muted">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 bg-success"
            style={{ width: `${acceptedPct}%` }}
          />
          <div
            aria-hidden
            className="absolute inset-y-0 bg-warning"
            style={{ left: `${acceptedPct}%`, width: `${pinnedPct}%` }}
          />
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-success" />
          Accepted
          <span className="ml-0.5 font-mono font-semibold text-foreground">
            {accepted}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-warning" />
          Pinned
          <span className="ml-0.5 font-mono font-semibold text-foreground">
            {pinned}
          </span>
        </span>
        {hasTarget && (
          <span className="ml-auto font-mono">
            target{" "}
            <span className="font-semibold text-foreground">{target}</span>{" "}
            stands
          </span>
        )}
      </div>
    </Card>
  );
}
