"use client";

import { cn } from "@/lib/utils";

export interface TagSummary {
  tag: string;
  applied: number;
  accepted: number;
}

interface RepresentationCloudProps {
  tags: TagSummary[];
  // Optional target (e.g. available stands) used to compute an "expected
  // share" for each tag. Not rendered today — kept so future variants
  // (share-of-stands) can use it without changing the call site.
  target?: number | null;
}

// Visual weight (font size) bucket for a given tag count relative to the max
// count in the set. Five buckets so a dense category reads clearly without
// needing full CSS `font-size: proportional` math.
function sizeClass(count: number, max: number): string {
  if (max === 0) return "text-[11px]";
  const ratio = count / max;
  if (ratio >= 0.85) return "text-[17px]";
  if (ratio >= 0.6) return "text-[15px]";
  if (ratio >= 0.35) return "text-[13px]";
  if (ratio >= 0.15) return "text-[12px]";
  return "text-[11px]";
}

// Highlights an imbalance: a tag that's over- or under-represented among
// accepted applicants compared to the applicant pool. The subtle ring
// colour lets organizers spot outliers at a glance without being loud
// about it.
function balanceClass(applied: number, accepted: number): string {
  if (applied === 0) return "ring-border";
  const ratio = accepted / applied;
  if (accepted === 0) return "ring-border";
  // Heuristic thresholds; tuned against a small selection pool.
  if (ratio >= 0.6) return "ring-success/40";
  if (ratio >= 0.3) return "ring-primary/30";
  return "ring-border";
}

export function RepresentationCloud({ tags }: RepresentationCloudProps) {
  if (tags.length === 0) {
    return (
      <p className="text-[11.5px] text-muted-foreground">
        No tags yet.
      </p>
    );
  }

  const max = tags.reduce((m, t) => Math.max(m, t.applied), 0);
  const sorted = [...tags].sort((a, b) => b.applied - a.applied);

  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      {sorted.map((t) => (
        <span
          key={t.tag}
          title={`${t.applied} applied · ${t.accepted} accepted`}
          className={cn(
            "inline-flex items-baseline gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold leading-none ring-1",
            sizeClass(t.applied, max),
            balanceClass(t.applied, t.accepted)
          )}
        >
          <span>{t.tag}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {t.accepted}
            <span className="opacity-60">/{t.applied}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
