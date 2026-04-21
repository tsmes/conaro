import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { LandingEvent } from "@/lib/landing/data";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface MonthBucket {
  key: string;
  label: string;
  count: number;
}

export function groupEventsByMonth(events: LandingEvent[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const e of events) {
    const [yearStr, monthStr] = e.eventStartDate.split("-");
    const year = Number.parseInt(yearStr ?? "1970", 10);
    const month = Number.parseInt(monthStr ?? "1", 10);
    const key = `${year}-${monthStr}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        key,
        label: `${MONTH_NAMES[month - 1] ?? ""} ${year}`,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export interface JumpToMonthCardProps {
  events: LandingEvent[];
}

export function JumpToMonthCard({ events }: JumpToMonthCardProps) {
  const buckets = groupEventsByMonth(events);
  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
          Jump to month
        </p>
        <h3 className="font-heading text-base font-extrabold tracking-tight">
          All upcoming
        </h3>
      </CardHeader>
      <CardContent>
        {buckets.length === 0 ? (
          <p className="py-2 text-[13px] text-muted-foreground">
            Nothing scheduled.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {buckets.map((b) => (
              <li
                key={b.key}
                className="flex items-center justify-between py-2.5 text-[13px]"
              >
                <span className="font-semibold">{b.label}</span>
                <span className="font-mono text-[11.5px] text-muted-foreground">
                  {b.count} event{b.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
