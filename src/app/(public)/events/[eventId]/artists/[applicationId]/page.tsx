import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { and, eq } from "drizzle-orm";

import { getCachedFloorPlan, getEventViewerContext } from "@/lib/events/event-context";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import {
  parseSocialLinks,
  type SocialLink,
} from "@/lib/artist-profile/social-links";
import { storage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { pickCoverGradient } from "@/lib/landing/cover-gradient";
import { cn } from "@/lib/utils";

interface ArtistDetailPageProps {
  params: Promise<{ eventId: string; applicationId: string }>;
}

interface PortfolioImage {
  id: string;
  url: string;
  caption: string | null;
}

interface ArtistDetail {
  applicationId: string;
  displayName: string;
  pronouns: string | null;
  bio: string | null;
  websiteUrl: string | null;
  socialLinks: SocialLink[];
  images: PortfolioImage[];
}

const PORTFOLIO_SECTION_RANK: Record<string, number> = {
  promo: 0,
  product: 1,
  previous_stand: 2,
};

// Loads the rich artist detail for one accepted application on this
// event. Returns null if the application doesn't exist, isn't on
// this event, or hasn't been accepted — covers the unauthorised
// deep-link case in one branch.
async function loadArtistDetail(
  eventId: string,
  applicationId: string
): Promise<ArtistDetail | null> {
  const [row] = await db
    .select({
      applicationId: applications.id,
      profileId: applications.profileId,
      displayName: profiles.displayName,
      pronouns: artistProfiles.pronouns,
      bio: artistProfiles.bio,
      websiteUrl: artistProfiles.websiteUrl,
      socialLinks: artistProfiles.socialLinks,
    })
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.profileId))
    .leftJoin(
      artistProfiles,
      eq(artistProfiles.profileId, applications.profileId)
    )
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.eventId, eventId),
        eq(applications.status, "accepted")
      )
    )
    .limit(1);

  if (!row) return null;

  const imageRows = await db
    .select({
      id: portfolioImages.id,
      storagePath: portfolioImages.storagePath,
      caption: portfolioImages.caption,
      section: portfolioImages.section,
      sortOrder: portfolioImages.sortOrder,
    })
    .from(portfolioImages)
    .where(eq(portfolioImages.profileId, row.profileId));

  const images = imageRows
    .sort((a, b) => {
      const ra = PORTFOLIO_SECTION_RANK[a.section] ?? 9;
      const rb = PORTFOLIO_SECTION_RANK[b.section] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.sortOrder - b.sortOrder;
    })
    .map((i) => ({
      id: i.id,
      url: storage.getUrl(i.storagePath),
      caption: i.caption,
    }));

  return {
    applicationId: row.applicationId,
    displayName: row.displayName,
    pronouns: row.pronouns ?? null,
    bio: row.bio ?? null,
    websiteUrl: row.websiteUrl ?? null,
    socialLinks: parseSocialLinks(row.socialLinks),
    images,
  };
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function ArtistDetailPage({
  params,
}: ArtistDetailPageProps) {
  const { eventId, applicationId } = await params;
  const ctx = await getEventViewerContext(eventId);

  // The Artists tab itself is hidden until results are published —
  // mirror that here so deep links don't expose accepted artists
  // before the public reveal.
  if (ctx.event.status !== "results_published") notFound();

  const [artist, plan] = await Promise.all([
    loadArtistDetail(ctx.event.id, applicationId),
    getCachedFloorPlan(ctx.event.id),
  ]);
  if (!artist) notFound();

  const standLabel =
    plan?.tables.find(
      (t) => t.assignment?.applicationId === artist.applicationId
    )?.label ?? null;

  const fallbackGradient = pickCoverGradient(artist.applicationId);
  const initials = initialsFor(artist.displayName);
  const hasLinks = Boolean(artist.websiteUrl) || artist.socialLinks.length > 0;
  // Use the top-ranked portfolio image as the hero on the left;
  // fall back to the gradient + initials when the artist hasn't
  // uploaded a portfolio yet. The grid below the card then renders
  // the rest, so the same image isn't shown twice.
  const heroImage = artist.images[0] ?? null;
  const galleryImages = heroImage ? artist.images.slice(1) : artist.images;

  return (
    <div className="space-y-6">
      <Link
        href={`/events/${eventId}/artists`}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All artists
      </Link>

      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 md:grid-cols-[minmax(0,360px)_1fr]">
          <div
            className={cn(
              "relative aspect-[4/5] overflow-hidden md:aspect-auto md:h-full md:min-h-[420px]",
              heroImage ? "bg-muted" : fallbackGradient
            )}
          >
            {heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage.url}
                alt={
                  heroImage.caption ?? `${artist.displayName} portfolio cover`
                }
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-heading text-[88px] font-extrabold tracking-tight text-white opacity-90">
                  {initials}
                </span>
              </div>
            )}
            {standLabel && (
              <Badge
                variant="default"
                className="absolute left-3 top-3 border border-black/10 bg-white/85 text-foreground backdrop-blur-sm dark:border-white/15 dark:bg-card/85 dark:text-foreground"
              >
                Stand {standLabel}
              </Badge>
            )}
          </div>
          <div className="flex flex-col gap-4 p-6 md:p-8">
            <div>
              <h1 className="font-heading text-[clamp(1.6rem,3vw,2.2rem)] font-extrabold leading-tight tracking-tight">
                {artist.displayName}
              </h1>
              {artist.pronouns && (
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {artist.pronouns}
                </p>
              )}
            </div>
            {/* Deep-link to the floor plan with this artist's table
                pulsing. Only render when the plan is published and
                the artist actually has a stand on it. */}
            {standLabel && ctx.event.floorPlanPublishedAt && (
              <Link
                href={`/events/${eventId}/floor-plan?artist=${artist.applicationId}&focus=table`}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-foreground transition hover:bg-muted"
              >
                <MapPin className="size-3.5" />
                Show on floor plan
              </Link>
            )}
            {artist.bio && (
              <div className="text-[14.5px] leading-relaxed text-foreground">
                <Markdown source={artist.bio} />
              </div>
            )}
            {hasLinks && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {artist.websiteUrl && (
                  <li>
                    <SocialChip label="Website" url={artist.websiteUrl} />
                  </li>
                )}
                {artist.socialLinks.map((s, i) => (
                  <li key={`${s.type}-${i}`}>
                    <SocialChip label={s.type} url={s.url} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      {galleryImages.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-[18px] font-extrabold tracking-tight">
            Portfolio
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {galleryImages.map((img) => (
              <a
                key={img.id}
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="group relative block aspect-square overflow-hidden rounded-[12px] bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption ?? `${artist.displayName} portfolio`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SocialChip({ label, url }: { label: string; url: string }) {
  // Mirror the guests SocialChip: honour mailto + http(s) as saved,
  // only prepend https:// for bare-domain inputs.
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
