import { notFound } from "next/navigation";

import { getEventViewerContext } from "@/lib/events/event-context";
import type { ProgrammeItem } from "@/lib/db/schema/events";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDateNo } from "@/lib/utils/format-date-no";

interface ProgrammePageProps {
  params: Promise<{ eventId: string }>;
}

interface ProgrammeDay {
  date: string;
  items: ProgrammeItem[];
}

// Group programme items by date, preserving insertion order within
// the same start time so author-specified order survives.
function groupByDay(items: ProgrammeItem[]): ProgrammeDay[] {
  const buckets = new Map<string, ProgrammeItem[]>();
  items.forEach((item) => {
    const list = buckets.get(item.date);
    if (list) {
      list.push(item);
    } else {
      buckets.set(item.date, [item]);
    }
  });
  return [...buckets.entries()]
    .map(([date, dayItems]) => ({
      date,
      items: dayItems
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
          const cmp = a.item.startTime.localeCompare(b.item.startTime);
          return cmp !== 0 ? cmp : a.index - b.index;
        })
        .map((entry) => entry.item),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default async function ProgrammePage({ params }: ProgrammePageProps) {
  const { eventId } = await params;
  const ctx = await getEventViewerContext(eventId);
  const items = ctx.event.programme;

  if (!Array.isArray(items) || items.length === 0) notFound();

  const days = groupByDay(items);

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <Card key={day.date} className="overflow-hidden p-0">
          <div className="border-b border-border px-5 py-3.5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary">
              {formatDateNo(day.date)}
            </p>
            <div className="font-heading text-[16px] font-extrabold">
              {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <ul className="divide-y divide-border">
            {day.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="font-mono text-[14px] font-bold sm:w-24 sm:shrink-0 sm:pt-0.5">
                  {item.startTime}
                  {item.endTime && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      – {item.endTime}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-[14.5px] font-extrabold leading-tight">
                    {item.title}
                  </div>
                  {item.speaker && (
                    <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {item.speaker}
                    </div>
                  )}
                </div>
                {item.room && (
                  <Badge variant="secondary" className="self-start sm:self-auto">
                    {item.room}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
