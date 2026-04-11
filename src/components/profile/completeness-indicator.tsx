import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CompletenessResult } from "@/lib/profile/completeness";

interface CompletenessIndicatorProps {
  completeness: CompletenessResult;
}

function SectionBadge({
  label,
  complete,
  filled,
  total,
}: {
  label: string;
  complete: boolean;
  filled: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{complete ? "\u2705" : "\u26A0\uFE0F"}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Badge variant={complete ? "default" : "secondary"}>
        {filled}/{total}
      </Badge>
    </div>
  );
}

export function CompletenessIndicator({
  completeness,
}: CompletenessIndicatorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Profile Completeness</h3>
        <span className="text-sm text-muted-foreground">
          {completeness.overall}%
        </span>
      </div>
      <div className="space-y-2">
        <SectionBadge
          label="Basic Info"
          complete={completeness.basic.complete}
          filled={completeness.basic.filled}
          total={completeness.basic.total}
        />
        <SectionBadge
          label="Logistics"
          complete={completeness.logistics.complete}
          filled={completeness.logistics.filled}
          total={completeness.logistics.total}
        />
        <SectionBadge
          label="Portfolio"
          complete={completeness.portfolio.complete}
          filled={completeness.portfolio.filled}
          total={completeness.portfolio.total}
        />
      </div>
      <Link
        href="/dashboard/profile"
        className="block text-center text-sm text-primary underline underline-offset-4"
      >
        Edit Profile
      </Link>
    </div>
  );
}
