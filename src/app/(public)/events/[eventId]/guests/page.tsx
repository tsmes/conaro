import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { getEventViewerContext } from "@/lib/events/event-context";
import type { Guest } from "@/lib/db/schema/events";
import { storage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
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
        <GuestCard key={guest.id} guest={guest} />
      ))}
    </div>
  );
}

function GuestCard({ guest }: { guest: Guest }) {
  const {
    id,
    name,
    title,
    role,
    pronouns,
    bio,
    imagePath,
    websiteUrl,
    socialLinks,
  } = guest;
  const portraitUrl = imagePath ? storage.getUrl(imagePath) : null;
  const fallbackGradient = pickCoverGradient(id);
  const initials = initialsFor(name);
  return (
    <Card className="flex flex-col overflow-hidden p-0">
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
            className="absolute inset-0 h-full w-full object-cover"
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
      <div className="flex flex-col gap-2 p-4">
        <div className="min-w-0">
          <h3 className="font-heading text-[16px] font-extrabold leading-tight">
            {name}
          </h3>
          {(role || pronouns) && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {role}
              {role && pronouns && " · "}
              {pronouns}
            </p>
          )}
        </div>
        {bio && (
          <div className="text-[13px] leading-relaxed text-foreground">
            <Markdown source={bio} />
          </div>
        )}
        {(websiteUrl || (socialLinks && socialLinks.length > 0)) && (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {websiteUrl && (
              <li>
                <SocialChip label="Website" url={websiteUrl} />
              </li>
            )}
            {socialLinks?.map((s, i) => (
              <li key={`${s.type}-${i}`}>
                <SocialChip label={s.type} url={s.url} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function SocialChip({ label, url }: { label: string; url: string }) {
  // Zod now rejects URLs that aren't http(s)/mailto, so anything
  // that lands here is one of those three. Honour the scheme as-is
  // — the previous "prepend https://" fallback turned mailto into
  // "https://mailto:…" (broken) and could have prefixed surprises.
  const trimmed = url.trim();
  const safe = /^(https?:\/\/|mailto:)/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-semibold text-foreground transition hover:bg-muted"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}
