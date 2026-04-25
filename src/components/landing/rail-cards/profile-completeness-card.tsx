import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CompletenessIndicator } from "@/components/profile/completeness-indicator";
import type { CompletenessResult } from "@/lib/profile/completeness";

export interface ProfileCompletenessCardProps {
  completeness: CompletenessResult;
}

export function ProfileCompletenessCard({
  completeness,
}: ProfileCompletenessCardProps) {
  const isComplete = completeness.overall >= 100;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
            Profile
          </p>
          <span className="font-mono text-[11px] text-muted-foreground">
            {Math.round(completeness.overall)}%
          </span>
        </div>
        <h3 className="font-heading text-base font-extrabold tracking-tight">
          {isComplete ? "Ready to apply" : "Almost ready to apply"}
        </h3>
      </CardHeader>
      <CardContent>
        <CompletenessIndicator completeness={completeness} />
        {!isComplete && (
          <Link
            href="/dashboard/profile"
            className="mt-4 inline-block text-[12px] font-semibold text-primary hover:underline"
          >
            Finish your profile →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
