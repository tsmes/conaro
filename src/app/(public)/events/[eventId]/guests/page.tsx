import Link from "next/link";
import { notFound } from "next/navigation";

import { getEventViewerContext } from "@/lib/events/event-context";
import type { Guest } from "@/lib/db/schema/events";
import { storage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { pickCoverGradient } from "@/lib/landing/cover-gradient";
import { cn } from "@/lib/utils";

interface GuestsPageProps {
  params: Promise<{ eventId: string }>;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function GuestsPage({ params }: GuestsPageProps) {
  const { eventId } = await params;
  const ctx = await getEventViewerContext(eventId);
  const guests = ctx.event.guests;

  if (!Array.isArray(guests) || guests.length === 0) notFound();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {guests.map((guest) => (
        <GuestCard key={guest.id} guest={guest} eventId={eventId} />
      ))}
    </div>
  );
}

function GuestCard({ guest, eventId }: { guest: Guest; eventId: string }) {
  const { id, name, title, role, pronouns, imagePath } = guest;
  const portraitUrl = imagePath ? storage.getUrl(imagePath) : null;
  const fallbackGradient = pickCoverGradient(id);
  const initials = initialsFor(name);
  return (
    <Link
      href={`/events/${eventId}/guests/${id}`}
      className="group block focus:outline-none"
    >
      <Card className="flex flex-col overflow-hidden p-0 transition group-hover:border-primary/50 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <div
          className={cn(
            "relative aspect-[4/5] overflow-hidden",
            !portraitUrl && fallbackGradient
          )}
        >
          {portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={portraitUrl}
              alt={`${name} portrait`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center">
              <span className="font-heading text-[64px] font-extrabold tracking-tight text-white opacity-90">
                {initials}
              </span>
            </div>
          )}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent"
          />
          {/* Backdrop-blur + soft border keeps the badge legible on
              both bright and dark portraits — bare bg-white/90
              disappears against light photos. */}
          <Badge
            variant="default"
            className="absolute left-3 top-3 border border-black/10 bg-white/85 text-foreground backdrop-blur-sm dark:border-white/15 dark:bg-card/85 dark:text-foreground"
          >
            {title}
          </Badge>
        </div>
        <div className="flex flex-col gap-1 p-4">
          <h3 className="font-heading text-[16px] font-extrabold leading-tight">
            {name}
          </h3>
          {(role || pronouns) && (
            <p className="text-[12px] text-muted-foreground">
              {role}
              {role && pronouns && " · "}
              {pronouns}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
