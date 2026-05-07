/**
 * Seed applications across every event that's currently accepting or
 * reviewing applications. Tops up to a target count per event so re-runs
 * just fill in any missing applications without disturbing existing ones.
 *
 *   npm run db:seed:applications
 *
 * Tunables live at the top of this file — adjust the status mix, the
 * count range, or the per-convention overrides and re-run.
 */

import "./lib/env";

import path from "node:path";
import { asc, eq } from "drizzle-orm";

import { db } from "../src/lib/db";
import {
  applications,
  type ApplicationAnswers,
  type ProfileSnapshot,
  type SnapshotImage,
} from "../src/lib/db/schema/applications";
import { artistProfiles } from "../src/lib/db/schema/artist-profiles";
import { conventions } from "../src/lib/db/schema/conventions";
import { events, type TableSizeOption } from "../src/lib/db/schema/events";
import { portfolioImages } from "../src/lib/db/schema/portfolio-images";
import { profiles } from "../src/lib/db/schema/profiles";
import { storage } from "../src/lib/storage";
import {
  ensureSeedArtist,
  getHashedSeedPassword,
  planArtist,
} from "./lib/seed";

// ── Tunables ─────────────────────────────────────────────────────────────

// Waitlisting is artist-driven (chosen after rejection), so it's never
// produced by this seed.
type SeededStatus = "submitted" | "under_review" | "accepted" | "rejected";

// Probability mix for newly-created applications. Adjust to taste — the
// values are weights and don't need to sum to exactly 1, but it's clearer
// if they do.
const STATUS_WEIGHTS: Record<SeededStatus, number> = {
  submitted: 0.65,
  under_review: 0.1,
  accepted: 0.15,
  rejected: 0.1,
};

// Chance that a still-undecided application (submitted / under_review) is
// pinned in the organizer review UI.
const PINNED_PROBABILITY = 0.05;

// Default per-event target count. Seeded as a deterministic value in this
// range based on the event id, so re-runs hit the same target.
const DEFAULT_COUNT_RANGE = { min: 15, max: 40 };

// Overrides keyed by a regex matched against the convention name. First
// match wins. Useful when a specific convention should look busier in
// demos.
const COUNT_OVERRIDES: { match: RegExp; count: number }[] = [
  { match: /magicon/i, count: 75 },
];

// Event statuses we'll seed applications for. Events outside this set
// (drafts, future events, results published) are skipped.
const SEED_FOR_EVENT_STATUSES = new Set([
  "accepting_applications",
  "reviewing",
]);

// Upper bound on how many seed-artist indices we'll probe per event when
// looking for unused applicants. Has to comfortably exceed the largest
// per-event target.
const ARTIST_INDEX_PROBE_LIMIT = 200;

// ─────────────────────────────────────────────────────────────────────────

function hashStringToInt(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function targetCountForEvent(
  eventId: string,
  conventionName: string
): number {
  for (const override of COUNT_OVERRIDES) {
    if (override.match.test(conventionName)) return override.count;
  }
  const span = DEFAULT_COUNT_RANGE.max - DEFAULT_COUNT_RANGE.min + 1;
  return DEFAULT_COUNT_RANGE.min + (hashStringToInt(eventId) % span);
}

function pickStatus(seed: number): SeededStatus {
  const total = Object.values(STATUS_WEIGHTS).reduce((a, b) => a + b, 0);
  const r = ((seed * 2654435761) >>> 0) / 0x100000000;
  let acc = 0;
  for (const [status, weight] of Object.entries(STATUS_WEIGHTS)) {
    acc += weight / total;
    if (r < acc) return status as SeededStatus;
  }
  return "submitted";
}

function pinnedFor(seed: number, status: SeededStatus): boolean {
  if (status !== "submitted" && status !== "under_review") return false;
  const r = ((seed * 1597334677) >>> 0) / 0x100000000;
  return r < PINNED_PROBABILITY;
}

function pick<T>(list: readonly T[], seed: number): T {
  return list[seed % list.length];
}

function buildAnswers(
  index: number,
  tableSizeOptions: TableSizeOption[],
  maxAssistants: number
): ApplicationAnswers {
  const answers: ApplicationAnswers = {};

  if (tableSizeOptions.length > 0) {
    answers.tableSizeOptionId = pick(
      tableSizeOptions.map((o) => o.id),
      index
    );
  }

  if (maxAssistants > 0) {
    const count = index % (maxAssistants + 1);
    answers.assistants = {
      count,
      names:
        count === 0
          ? []
          : Array.from({ length: count }, (_, i) => `Helper ${i + 1}`),
    };
  }

  if (index % 3 === 0) {
    answers.sharingStand = { sharing: false };
  } else if (index % 7 === 0) {
    answers.sharingStand = { sharing: true, with: "A friend" };
  }

  if (index % 2 === 0) {
    answers.placementPreference = pick(
      [
        "Near the entrance if possible.",
        "I'd like to be placed next to a friend.",
        "Any spot with good light.",
        "Cosmos area, please.",
      ],
      index
    );
  }

  if (index % 4 === 0) {
    answers.additionalComments = pick(
      [
        "First time applying — excited to be here!",
        "I can help with load-in if needed.",
        "Available for a panel on 3D printing if you're interested.",
      ],
      index
    );
  }

  answers.promotionConsent = index % 5 !== 0;
  return answers;
}

function buildSnapshotFromArtistProfile(
  displayName: string,
  artistProfile: typeof artistProfiles.$inferSelect,
  images: SnapshotImage[]
): ProfileSnapshot {
  return {
    displayName,
    realName: artistProfile.realName,
    pronouns: artistProfile.pronouns,
    contactEmail: artistProfile.contactEmail,
    phone: artistProfile.phone,
    bio: artistProfile.bio,
    websiteUrl: artistProfile.websiteUrl,
    socialLinks: artistProfile.socialLinks,
    helpers: artistProfile.helpers,
    accessibilityNeeds: artistProfile.accessibilityNeeds,
    notes: artistProfile.notes,
    priceRangeMinNok: artistProfile.priceRangeMinNok,
    priceRangeMaxNok: artistProfile.priceRangeMaxNok,
    genres: artistProfile.genres ?? [],
    mediums: artistProfile.mediums ?? [],
    images,
  };
}

// Mirrors the production applyToEvent action: copies each portfolio
// image to a per-application snapshot path so the organizer review UI
// renders the artist's portfolio as it looked at apply time.
async function buildSnapshotImages(
  eventId: string,
  applicationId: string,
  profileId: string
): Promise<SnapshotImage[]> {
  const images = await db
    .select()
    .from(portfolioImages)
    .where(eq(portfolioImages.profileId, profileId))
    .orderBy(asc(portfolioImages.sortOrder));

  const snapshotImages: SnapshotImage[] = [];
  for (const image of images) {
    const snapshotPath = `snapshots/${eventId}/${applicationId}/${image.id}.webp`;
    await storage.copy(image.storagePath, snapshotPath);
    snapshotImages.push({
      id: image.id,
      filename: image.filename,
      storagePath: snapshotPath,
      width: image.width,
      height: image.height,
      sortOrder: image.sortOrder,
      caption: image.caption ?? null,
    });
  }
  return snapshotImages;
}

function responseMessageFor(status: SeededStatus): string | null {
  switch (status) {
    case "accepted":
      return "Welcome aboard — you're in!";
    case "rejected":
      return "Thanks for applying. Unfortunately we can't offer you a stand this year.";
    default:
      return null;
  }
}

export interface RunSeedApplicationsOptions {
  logger?: (msg: string) => void;
}

export interface RunSeedApplicationsResult {
  eventsSeeded: number;
  alreadyPresent: number;
  newlyCreated: number;
  byStatus: Record<SeededStatus, number>;
  imagesCopied: number;
  artistsCreatedOnTheFly: number;
}

export async function runSeedApplications(
  opts: RunSeedApplicationsOptions = {}
): Promise<RunSeedApplicationsResult> {
  const log = opts.logger ?? (() => {});

  const passwordHash = await getHashedSeedPassword();

  const eventRows = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      eventStatus: events.status,
      tableSizeOptions: events.tableSizeOptions,
      maxAssistants: events.maxAssistants,
      conventionName: conventions.name,
    })
    .from(events)
    .innerJoin(conventions, eq(events.conventionId, conventions.id));

  const seedable = eventRows.filter((row) =>
    SEED_FOR_EVENT_STATUSES.has(row.eventStatus)
  );

  log(
    `Found ${seedable.length} seedable event(s) ` +
      `(of ${eventRows.length} total).`
  );

  let totalCreated = 0;
  let totalAlreadyPresent = 0;
  let artistsCreatedOnTheFly = 0;
  let totalImagesSnapshotted = 0;
  const byStatus: Record<SeededStatus, number> = {
    submitted: 0,
    under_review: 0,
    accepted: 0,
    rejected: 0,
  };

  for (const row of seedable) {
    const target = targetCountForEvent(row.eventId, row.conventionName);

    const existing = await db
      .select({ profileId: applications.profileId })
      .from(applications)
      .where(eq(applications.eventId, row.eventId));
    const existingProfileIds = new Set(existing.map((r) => r.profileId));
    const needed = Math.max(0, target - existingProfileIds.size);

    if (needed === 0) {
      log(
        `  ${row.conventionName.padEnd(28)} ` +
          `${row.eventName} — ${existingProfileIds.size}/${target} (skip)`
      );
      totalAlreadyPresent += existingProfileIds.size;
      continue;
    }

    // Walk seed-artist indices in a deterministic-but-event-shifted order
    // so every event ends up with a different mix of artists.
    const startIndex = hashStringToInt(row.eventId) % ARTIST_INDEX_PROBE_LIMIT;
    const candidateProfileIds: { profileId: string; index: number }[] = [];

    for (
      let probe = 0;
      probe < ARTIST_INDEX_PROBE_LIMIT && candidateProfileIds.length < needed;
      probe += 1
    ) {
      const i = (startIndex + probe) % ARTIST_INDEX_PROBE_LIMIT;
      const plan = planArtist(i);
      const ids = await ensureSeedArtist(plan, passwordHash);
      if (ids.created) artistsCreatedOnTheFly += 1;
      if (existingProfileIds.has(ids.profileId)) continue;
      candidateProfileIds.push({ profileId: ids.profileId, index: i });
    }

    if (candidateProfileIds.length < needed) {
      log(
        `  ⚠ ${row.conventionName} ${row.eventName}: only found ` +
          `${candidateProfileIds.length} unused artist(s) of ${needed} ` +
          "needed; raise ARTIST_INDEX_PROBE_LIMIT."
      );
    }

    const tableSizeOptions = (row.tableSizeOptions ?? []) as TableSizeOption[];
    const maxAssistants = row.maxAssistants ?? 0;

    let createdForEvent = 0;
    let imagesForEvent = 0;
    const eventByStatus: Record<SeededStatus, number> = {
      submitted: 0,
      under_review: 0,
      accepted: 0,
      rejected: 0,
    };

    for (const { profileId, index } of candidateProfileIds) {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, profileId));
      const [artistProfile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.profileId, profileId));

      const applicationId = crypto.randomUUID();
      const snapshotImages = await buildSnapshotImages(
        row.eventId,
        applicationId,
        profileId
      );
      const snapshot = buildSnapshotFromArtistProfile(
        profile.displayName,
        artistProfile,
        snapshotImages
      );
      const answers = buildAnswers(index, tableSizeOptions, maxAssistants);

      const seedForRow = hashStringToInt(`${row.eventId}:${profileId}`);
      const status = pickStatus(seedForRow);
      const pinned = pinnedFor(seedForRow + 1, status);
      const responseMessage = responseMessageFor(status);

      await db.insert(applications).values({
        id: applicationId,
        eventId: row.eventId,
        profileId,
        status,
        pinned,
        profileSnapshot: snapshot,
        answers,
        responseMessage,
        guidelinesAcknowledgedAt: new Date(),
      });

      createdForEvent += 1;
      imagesForEvent += snapshotImages.length;
      eventByStatus[status] += 1;
      byStatus[status] += 1;
    }
    totalImagesSnapshotted += imagesForEvent;

    totalCreated += createdForEvent;
    totalAlreadyPresent += existingProfileIds.size;
    log(
      `  ${row.conventionName.padEnd(28)} ` +
        `${row.eventName} — +${createdForEvent} (now ` +
        `${existingProfileIds.size + createdForEvent}/${target})  ` +
        `S${eventByStatus.submitted} U${eventByStatus.under_review} ` +
        `A${eventByStatus.accepted} R${eventByStatus.rejected}  ` +
        `imgs=${imagesForEvent}`
    );
  }

  log("");
  log(`  Events seeded:    ${seedable.length}`);
  log(`  Already present:  ${totalAlreadyPresent}`);
  log(`  Newly created:    ${totalCreated}`);
  log(
    `  Status mix (new): ` +
      `S=${byStatus.submitted}  U=${byStatus.under_review}  ` +
      `A=${byStatus.accepted}  R=${byStatus.rejected}`
  );
  log(`  Images copied:    ${totalImagesSnapshotted}`);
  if (
    eventRows.length > seedable.length &&
    eventRows.length - seedable.length > 0
  ) {
    const skipped = eventRows.length - seedable.length;
    log(
      `  Skipped:          ${skipped} event(s) outside ` +
        `[${[...SEED_FOR_EVENT_STATUSES].join(", ")}]`
    );
  }
  if (artistsCreatedOnTheFly > 0) {
    log("");
    log(
      `  ⚠ Created ${artistsCreatedOnTheFly} new seed artist(s) without ` +
        "portfolios. Re-run\n    `npm run db:seed:artists -- --with-portfolios " +
        `${artistsCreatedOnTheFly + 50}\` (or higher) before next demo to give ` +
        "them art."
    );
  }

  return {
    eventsSeeded: seedable.length,
    alreadyPresent: totalAlreadyPresent,
    newlyCreated: totalCreated,
    byStatus,
    imagesCopied: totalImagesSnapshotted,
    artistsCreatedOnTheFly,
  };
}

const isDirectInvocation =
  typeof process !== "undefined" &&
  process.argv[1] &&
  path.basename(process.argv[1]) === "seed-applications.ts";

if (isDirectInvocation) {
  runSeedApplications({ logger: (msg) => console.log(msg) })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
