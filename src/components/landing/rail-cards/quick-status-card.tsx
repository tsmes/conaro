import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export interface QuickStatusCounts {
  total: number;
  accepted: number;
  underReview: number;
  following: number;
}

function StatLine({
  label,
  value,
  href,
  accent = false,
}: {
  label: string;
  value: number;
  href?: string;
  accent?: boolean;
}) {
  const valueClass = accent
    ? "font-heading text-lg font-extrabold text-success"
    : "font-heading text-lg font-extrabold";
  const inner = (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block hover:text-primary">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function QuickStatusCard({ counts }: { counts: QuickStatusCounts }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
          Your Conaro
        </p>
        <h3 className="font-heading text-base font-extrabold tracking-tight">
          Quick status
        </h3>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <StatLine
          label="Applications"
          value={counts.total}
          href="/dashboard"
        />
        <StatLine label="Accepted" value={counts.accepted} accent />
        <StatLine label="In review" value={counts.underReview} />
        <StatLine label="Following" value={counts.following} />
      </CardContent>
    </Card>
  );
}
