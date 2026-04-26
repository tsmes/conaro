import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { getEventViewerContext } from "@/lib/events/event-context";
import { storage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { pickCoverGradient } from "@/lib/landing/cover-gradient";
import { cn } from "@/lib/utils";

interface GuestDetailPageProps {
  params: Promise<{ eventId: string; guestId: string }>;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function GuestDetailPage({ params }: GuestDetailPageProps) {
  const { eventId, guestId } = await params;
  const ctx = await getEventViewerContext(eventId);
  const guest = ctx.event.guests?.find((g) => g.id === guestId);
  if (!guest) notFound();

  const portraitUrl = guest.imagePath ? storage.getUrl(guest.imagePath) : null;
  const fallbackGradient = pickCoverGradient(guest.id);
  const initials = initialsFor(guest.name);
  const hasLinks =
    Boolean(guest.websiteUrl) ||
    (guest.socialLinks && guest.socialLinks.length > 0);

  return (
    <div className="space-y-6">
      <Link
        href={`/events/${eventId}/guests`}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All guests
      </Link>

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 md:grid-cols-[minmax(0,360px)_1fr]">
          <div
            className={cn(
              "relative aspect-[4/5] overflow-hidden md:aspect-auto md:h-full md:min-h-[420px]",
              !portraitUrl && fallbackGradient
            )}
          >
            {portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portraitUrl}
                alt={`${guest.name} portrait`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-heading text-[88px] font-extrabold tracking-tight text-white opacity-90">
                  {initials}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4 p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="bg-primary/10 text-primary">
                {guest.title}
              </Badge>
              {guest.pronouns && (
                <span className="text-[12px] text-muted-foreground">
                  {guest.pronouns}
                </span>
              )}
            </div>
            <div>
              <h1 className="font-heading text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-tight tracking-tight">
                {guest.name}
              </h1>
              {guest.role && (
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {guest.role}
                </p>
              )}
            </div>
            {guest.bio && (
              <div className="text-[14.5px] leading-relaxed text-foreground">
                <Markdown source={guest.bio} />
              </div>
            )}
            {hasLinks && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {guest.websiteUrl && (
                  <li>
                    <SocialChip label="Website" url={guest.websiteUrl} />
                  </li>
                )}
                {guest.socialLinks?.map((s, i) => (
                  <li key={`${s.type}-${i}`}>
                    <SocialChip label={s.type} url={s.url} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function SocialChip({ label, url }: { label: string; url: string }) {
  // Mirror the public guests-grid chip: honour mailto + http(s) as
  // saved (Zod rejects other schemes), only prepend https:// for
  // bare-domain inputs that slipped through.
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

