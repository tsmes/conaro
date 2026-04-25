"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";

import { FloorPlanCanvasDynamic } from "./floor-plan-canvas-dynamic";
import type { TableSizeOption } from "@/lib/db/schema/events";
import type {
  FloorPlanArtist,
  ResolvedFloorPlan,
} from "@/lib/floor-plans/queries";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PublicFloorPlanViewProps {
  plan: ResolvedFloorPlan;
  tableSizeOptions: TableSizeOption[];
  artists: FloorPlanArtist[];
  highlightApplicationId?: string;
  /** When true, focus the highlighted table on first mount (the
   *  "Show me my table" entry point uses this). */
  initialPulse?: boolean;
}

export function PublicFloorPlanView({
  plan,
  tableSizeOptions,
  artists,
  highlightApplicationId,
  initialPulse = false,
}: PublicFloorPlanViewProps) {
  // The own-table heuristic still picks the right starting room
  // when an artist deep-links to ?focus=table.
  const ownTable = highlightApplicationId
    ? plan.tables.find(
        (t) => t.assignment?.applicationId === highlightApplicationId
      )
    : null;
  const defaultRoomId = ownTable?.roomId ?? plan.rooms[0]?.id ?? null;

  const [activeRoomId, setActiveRoomId] = useState<string | null>(
    defaultRoomId
  );
  // The current focus target (highlighted artist) and a token that
  // bumps each time the user re-focuses, so the canvas re-runs the
  // centre+pulse effect even when the same artist is reselected.
  const [focusedId, setFocusedId] = useState<string | null>(
    highlightApplicationId ?? null
  );
  const [focusToken, setFocusToken] = useState(initialPulse ? 1 : 0);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const artistsById = useMemo(
    () => new Map(artists.map((a) => [a.applicationId, a])),
    [artists]
  );

  function focusArtist(applicationId: string) {
    const artist = artistsById.get(applicationId);
    if (!artist) return;
    if (artist.roomId !== activeRoomId) {
      setActiveRoomId(artist.roomId);
    }
    setFocusedId(applicationId);
    setFocusToken((t) => t + 1);
  }

  if (plan.rooms.length === 0) return null;

  return (
    <div className="space-y-3">
      {artists.length > 0 && (
        <ArtistSearch artists={artists} onPick={focusArtist} />
      )}

      {plan.rooms.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {plan.rooms.map((room) => {
            const active = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => setActiveRoomId(room.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                {room.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative">
        <FloorPlanCanvasDynamic
          plan={plan}
          activeRoomId={activeRoomId}
          tableSizeOptions={tableSizeOptions}
          editable={false}
          highlightApplicationId={focusedId ?? undefined}
          focusToken={focusToken}
          onAssignedTableTap={(applicationId) => setOpenCardId(applicationId)}
        />
        {openCardId && (
          <ArtistInfoCard
            artist={artistsById.get(openCardId) ?? null}
            onClose={() => setOpenCardId(null)}
            onFocus={() => {
              focusArtist(openCardId);
            }}
          />
        )}
      </div>
    </div>
  );
}

interface ArtistSearchProps {
  artists: FloorPlanArtist[];
  onPick: (applicationId: string) => void;
}

function ArtistSearch({ artists, onPick }: ArtistSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return artists
      .filter((a) => a.displayName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, artists]);

  return (
    <div ref={wrapRef} className="relative max-w-md">
      <div className="flex h-10 items-center gap-2 rounded-[10px] border border-border bg-background px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          placeholder="Search artists…"
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
          aria-label="Search artists on the floor plan"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {open && matches.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-12 z-20 max-h-[320px] overflow-y-auto rounded-[10px] border border-border bg-card shadow-lg"
        >
          {matches.map((a) => (
            <li key={a.applicationId} role="option">
              <button
                type="button"
                onClick={() => {
                  onPick(a.applicationId);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
                  {a.standLabel}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">
                    {a.displayName}
                  </span>
                  {a.pronouns && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {a.pronouns}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && matches.length === 0 && (
        <div className="absolute left-0 right-0 top-12 z-20 rounded-[10px] border border-border bg-card px-4 py-3 text-[12.5px] text-muted-foreground shadow-lg">
          No artists match &ldquo;{query}&rdquo;.
        </div>
      )}
    </div>
  );
}

interface ArtistInfoCardProps {
  artist: FloorPlanArtist | null;
  onClose: () => void;
  onFocus: () => void;
}

function ArtistInfoCard({ artist, onClose, onFocus }: ArtistInfoCardProps) {
  if (!artist) return null;
  const { displayName, pronouns, bio, websiteUrl, socialLinks, standLabel } =
    artist;
  return (
    <Card className="absolute right-3 top-3 z-20 w-[min(320px,calc(100%-1.5rem))] overflow-hidden p-0 shadow-lg">
      <div className="flex items-start gap-3 p-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-[12px] font-bold text-primary">
          {standLabel}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-heading text-[15px] font-extrabold leading-tight">
            {displayName}
          </h3>
          {pronouns && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {pronouns}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      {bio && (
        <p className="line-clamp-4 px-4 pb-3 text-[13px] leading-relaxed text-foreground">
          {bio}
        </p>
      )}
      {(websiteUrl || socialLinks.length > 0) && (
        <div className="border-t border-border bg-muted/30 px-4 py-3">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Links
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {websiteUrl && (
              <li>
                <SocialChip label="Website" url={websiteUrl} />
              </li>
            )}
            {socialLinks.map((s, i) => (
              <li key={`${s.type}-${i}`}>
                <SocialChip label={s.type} url={s.url} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={onFocus}
          className="text-[12.5px] font-semibold text-primary transition hover:underline"
        >
          Centre on table →
        </button>
      </div>
    </Card>
  );
}

function SocialChip({ label, url }: { label: string; url: string }) {
  const isHttp = /^https?:\/\//i.test(url);
  return (
    <a
      href={isHttp ? url : `https://${url}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-semibold text-foreground transition hover:bg-muted"
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
  );
}
