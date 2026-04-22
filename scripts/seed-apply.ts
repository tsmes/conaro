/**
 * Submit applications from seed artists to a specific event so the organizer
 * can exercise the selection / approval flow.
 *
 *   npm run db:seed:apply -- <eventId> [count=20]
 *
 * - All applications are written in status="submitted" with pinned=false
 *   (nothing pre-decided) so you can test accept/reject/pin in the UI.
 * - Any seed artist who has already applied to this event is skipped.
 * - If fewer seed artists exist than requested, new ones are seeded on the
 *   fly (same rules as npm run db:seed:artists).
 * - Every application includes the new answers payload (table size,
 *   assistants, sharing, placement, comments, promo consent) so the
 *   organizer review UI has something to render.
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../src/lib/db";
import { applications } from "../src/lib/db/schema/applications";
import type {
  ApplicationAnswers,
  ProfileSnapshot,
} from "../src/lib/db/schema/applications";
import { artistProfiles } from "../src/lib/db/schema/artist-profiles";
import { events } from "../src/lib/db/schema/events";
import type { TableSizeOption } from "../src/lib/db/schema/events";
import { profiles } from "../src/lib/db/schema/profiles";
import {
  ensureSeedArtist,
  getHashedSeedPassword,
  parseCountArg,
  planArtist,
} from "./lib/seed";

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
      names: count === 0 ? [] : Array.from({ length: count }, (_, i) => `Helper ${i + 1}`),
    };
  }

  // Only sprinkle the other fields on some applications so the review UI
  // exercises both "present" and "absent" paths.
  if (index % 3 === 0) {
    answers.sharingStand = { sharing: false };
  } else if (index % 7 === 0) {
    answers.sharingStand = { sharing: true, with: "A friend" };
  }

  if (index % 2 === 0) {
    answers.placementPreference = pick(
      [
        "Near the entrance if possible.",
        "I'd like to be placed next to Bizziton Crafts.",
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
  artistProfile: typeof artistProfiles.$inferSelect
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
    images: [],
  };
}

async function run() {
  const eventId = process.argv[2];
  if (!eventId) {
    throw new Error(
      "Usage: npm run db:seed:apply -- <eventId> [count=20]\n" +
        "Run  npm run db:seed:event  first to get an eventId."
    );
  }
  const count = parseCountArg(process.argv[3], 20);

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) {
    throw new Error(`No event with id "${eventId}"`);
  }

  const tableSizeOptions = (event.tableSizeOptions ??
    []) as TableSizeOption[];
  const maxAssistants = event.maxAssistants ?? 0;

  console.log(
    `Seeding ${count} application(s) to "${event.name}" (${event.id})…`
  );

  const passwordHash = await getHashedSeedPassword();

  // Ensure `count` seed artists exist; collect their profile ids.
  const profileIds: string[] = [];
  const nameByProfileId = new Map<string, string>();
  for (let i = 0; i < count; i += 1) {
    const plan = planArtist(i);
    const ids = await ensureSeedArtist(plan, passwordHash);
    profileIds.push(ids.profileId);
    nameByProfileId.set(ids.profileId, ids.fullName);
  }

  // Find which of these have already applied so we skip them.
  const existing = await db
    .select({ profileId: applications.profileId })
    .from(applications)
    .where(
      and(
        eq(applications.eventId, event.id),
        inArray(applications.profileId, profileIds)
      )
    );
  const alreadyApplied = new Set(existing.map((r) => r.profileId));

  let created = 0;
  let skipped = 0;
  for (let i = 0; i < profileIds.length; i += 1) {
    const profileId = profileIds[i];
    if (alreadyApplied.has(profileId)) {
      skipped += 1;
      continue;
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId));
    const [artistProfile] = await db
      .select()
      .from(artistProfiles)
      .where(eq(artistProfiles.profileId, profileId));

    const snapshot = buildSnapshotFromArtistProfile(
      profile.displayName,
      artistProfile
    );
    const answers = buildAnswers(i, tableSizeOptions, maxAssistants);

    await db.insert(applications).values({
      eventId: event.id,
      profileId,
      status: "submitted",
      pinned: false,
      profileSnapshot: snapshot,
      answers,
      guidelinesAcknowledgedAt: new Date(),
    });
    created += 1;
  }

  console.log("");
  console.log(`  Event:    ${event.name}`);
  console.log(`  Created:  ${created} application(s)`);
  console.log(`  Skipped:  ${skipped} (already applied)`);
  console.log("");
  console.log(
    `  Review at: /conventions/manage/events/${event.id}/applications`
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
