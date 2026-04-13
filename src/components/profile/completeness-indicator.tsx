import { Check } from "lucide-react";
import type { CompletenessResult } from "@/lib/profile/completeness";
import { cn } from "@/lib/utils";

interface CompletenessIndicatorProps {
  completeness: CompletenessResult;
}

interface SectionStatus {
  complete: boolean;
  filled: number;
  total: number;
}

function SectionPill({
  label,
  section,
}: {
  label: string;
  section: SectionStatus;
}) {
  const complete = section.complete;
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-semibold",
        complete ? "text-primary" : "text-muted-foreground"
      )}
    >
      {complete ? (
        <Check className="size-3" strokeWidth={3} />
      ) : (
        <span className="size-3 rounded-full border border-current opacity-50" />
      )}
      <span>{label}</span>
    </div>
  );
}

// Curator's Canvas completeness widget — segmented progress bar across all
// profile fields, with section pills underneath tracking per-section state.
export function CompletenessIndicator({
  completeness,
}: CompletenessIndicatorProps) {
  const totalSegments =
    completeness.basic.total +
    completeness.logistics.total +
    completeness.portfolio.total;
  const filledSegments =
    completeness.basic.filled +
    completeness.logistics.filled +
    completeness.portfolio.filled;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Completeness
        </span>
        <span className="rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-bold text-on-primary-container">
          {filledSegments}/{totalSegments} fields completed
        </span>
      </div>
      <div
        className="flex h-1.5 w-full gap-1"
        role="progressbar"
        aria-valuenow={filledSegments}
        aria-valuemin={0}
        aria-valuemax={totalSegments}
        aria-label="Profile completeness"
      >
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-full",
              i < filledSegments ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <SectionPill label="Basic Info" section={completeness.basic} />
        <SectionPill label="Logistics" section={completeness.logistics} />
        <SectionPill label="Portfolio" section={completeness.portfolio} />
      </div>
    </div>
  );
}
