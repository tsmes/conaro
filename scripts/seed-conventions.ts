/**
 * Seed all conventions (and their primary event) from
 * scripts/seed-assets/conventions/<slug>/manifest.json.
 *
 *   npm run db:seed:conventions
 *
 * Idempotent: re-running upserts the same convention rows keyed on
 * the seed-organizer email, and overwrites uploaded asset paths in
 * place. Guests + programme arrays are replaced wholesale on each
 * run so manifest edits show up next time the script is run.
 *
 * Each convention gets its own organizer account at
 *   seed-organizer-<slug>@seed-organizer.conaro.test
 * sharing the standard SEED_PASSWORD ("seed-pass-123").
 */

import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";

import { db } from "../src/lib/db";
import { conventions } from "../src/lib/db/schema/conventions";
import {
  events,
  type Guest,
  type ProgrammeItem,
} from "../src/lib/db/schema/events";
import { buildDefaultFieldRequirements } from "../src/lib/conventions/queries";
import { processImage } from "../src/lib/storage/image";
import { storage } from "../src/lib/storage";

import {
  ensureSeedOrganizer,
  getHashedSeedPassword,
  SEED_ORGANIZER_DOMAIN,
  SEED_PASSWORD,
} from "./lib/seed";
import {
  loadConventionManifests,
  resolveAssetPath,
  resolveGuestPhotoPath,
  type EventManifest,
  type GuestManifest,
} from "./lib/conventions-manifest";

interface UploadResult {
  uploaded: boolean;
  path: string | null;
}

async function uploadAssetIfPresent(
  storageKey: string,
  filePath: string | null
): Promise<UploadResult> {
  if (!filePath || !fs.existsSync(filePath)) {
    return { uploaded: false, path: null };
  }
  const raw = fs.readFileSync(filePath);
  const processed = await processImage(raw);
  await storage.upload(storageKey, processed.data, "image/webp");
  return { uploaded: true, path: storageKey };
}

async function uploadGuests(
  eventId: string,
  guests: GuestManifest[] | undefined
): Promise<Guest[]> {
  if (!guests || guests.length === 0) return [];
  const out: Guest[] = [];
  for (const g of guests) {
    const id = crypto.randomUUID();
    const photoFile = resolveGuestPhotoPath(g.photo);
    let imagePath: string | undefined;
    if (photoFile && fs.existsSync(photoFile)) {
      const key = `events/${eventId}/guests/${id}.webp`;
      const raw = fs.readFileSync(photoFile);
      const processed = await processImage(raw);
      await storage.upload(key, processed.data, "image/webp");
      imagePath = key;
    }
    out.push({
      id,
      name: g.name,
      title: g.title,
      role: g.role,
      pronouns: g.pronouns,
      bio: g.bio,
      imagePath,
      websiteUrl: g.websiteUrl,
      socialLinks: g.socialLinks,
    });
  }
  return out;
}

function buildProgramme(
  eventManifest: EventManifest
): ProgrammeItem[] | null {
  if (!eventManifest.programme || eventManifest.programme.length === 0) {
    return null;
  }
  // Validate each item falls within the event window.
  const start = eventManifest.startDate;
  const end = eventManifest.endDate ?? eventManifest.startDate;
  if (!start) return null;
  for (const item of eventManifest.programme) {
    if (item.date < start || (end && item.date > end)) {
      throw new Error(
        `Programme item "${item.title}" date ${item.date} is outside event window ${start}..${end}`
      );
    }
  }
  return eventManifest.programme.map((item) => ({
    id: crypto.randomUUID(),
    date: item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    title: item.title,
    room: item.room,
    speaker: item.speaker,
  }));
}

function isoDaysFromNow(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function run() {
  const manifests = loadConventionManifests();
  console.log(
    `Found ${manifests.length} convention manifest(s) under scripts/seed-assets/conventions/`
  );

  const passwordHash = await getHashedSeedPassword();
  let organizersCreated = 0;
  let conventionsCreated = 0;
  let eventsUpserted = 0;
  let assetsUploaded = 0;
  let guestsSeeded = 0;
  let programmeItemsSeeded = 0;

  for (const { manifest, folder } of manifests) {
    const orgName = `${manifest.name} organizers`;
    const organizer = await ensureSeedOrganizer(
      { slug: manifest.slug, name: orgName },
      passwordHash
    );
    if (organizer.created) organizersCreated += 1;

    const [existingConvention] = await db
      .select()
      .from(conventions)
      .where(eq(conventions.organizerId, organizer.profileId));

    let conventionRow:
      | (typeof conventions.$inferSelect & { id: string })
      | undefined = existingConvention;

    if (!conventionRow) {
      const [created] = await db
        .insert(conventions)
        .values({
          organizerId: organizer.profileId,
          name: manifest.name,
          description: manifest.description ?? null,
          websiteUrl: manifest.websiteUrl ?? null,
          headerColor: manifest.headerColor ?? null,
        })
        .returning();
      conventionRow = created;
      conventionsCreated += 1;
    } else {
      await db
        .update(conventions)
        .set({
          name: manifest.name,
          description: manifest.description ?? null,
          websiteUrl: manifest.websiteUrl ?? null,
          headerColor: manifest.headerColor ?? null,
          updatedAt: new Date(),
        })
        .where(eq(conventions.id, conventionRow.id));
    }

    const conventionId = conventionRow.id;

    // Upload logos / banners. Storage keys are stable so re-runs
    // overwrite existing files in place.
    const logoUpload = await uploadAssetIfPresent(
      `conventions/${conventionId}/logo.webp`,
      resolveAssetPath(folder, manifest.assets.logo)
    );
    const bannerUpload = await uploadAssetIfPresent(
      `conventions/${conventionId}/banner.webp`,
      resolveAssetPath(folder, manifest.assets.banner)
    );
    const bannerMobileUpload = await uploadAssetIfPresent(
      `conventions/${conventionId}/banner-mobile.webp`,
      resolveAssetPath(folder, manifest.assets.bannerMobile)
    );

    if (logoUpload.uploaded) assetsUploaded += 1;
    if (bannerUpload.uploaded) assetsUploaded += 1;
    if (bannerMobileUpload.uploaded) assetsUploaded += 1;

    await db
      .update(conventions)
      .set({
        logoPath: logoUpload.path,
        bannerPath: bannerUpload.path,
        bannerMobilePath: bannerMobileUpload.path,
        updatedAt: new Date(),
      })
      .where(eq(conventions.id, conventionId));

    for (const eventManifest of manifest.events) {
      if (!eventManifest.startDate) continue; // informational-only

      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.conventionId, conventionId));

      // Apply window: opens 60 days before, closes 14 days before.
      const opens = shiftDate(eventManifest.startDate, -60);
      const closes = shiftDate(eventManifest.startDate, -14);
      const status =
        opens <= isoDaysFromNow(0)
          ? "accepting_applications"
          : "draft";

      const programme = buildProgramme(eventManifest);

      let eventId: string;
      if (existingEvent) {
        eventId = existingEvent.id;
        await db
          .update(events)
          .set({
            name: eventManifest.name,
            eventStartDate: eventManifest.startDate,
            eventEndDate: eventManifest.endDate ?? null,
            applicationOpenDate: opens,
            applicationCloseDate: closes,
            venueName: eventManifest.venueName ?? null,
            venueCity: eventManifest.venueCity ?? null,
            venueCountry: eventManifest.venueCountry ?? null,
            status,
            programme,
            updatedAt: new Date(),
          })
          .where(eq(events.id, eventId));
      } else {
        const [created] = await db
          .insert(events)
          .values({
            conventionId,
            name: eventManifest.name,
            eventStartDate: eventManifest.startDate,
            eventEndDate: eventManifest.endDate ?? null,
            applicationOpenDate: opens,
            applicationCloseDate: closes,
            venueName: eventManifest.venueName ?? null,
            venueCity: eventManifest.venueCity ?? null,
            venueCountry: eventManifest.venueCountry ?? null,
            status,
            fieldRequirements: buildDefaultFieldRequirements(),
            tableSizeOptions: [
              {
                id: crypto.randomUUID(),
                label: "Standard",
                priceNok: 350,
              },
              {
                id: crypto.randomUUID(),
                label: "Double",
                priceNok: 650,
              },
            ],
            maxAssistants: 1,
            assistantFeeNok: 250,
            programme,
          })
          .returning();
        eventId = created.id;
      }
      eventsUpserted += 1;

      const seededGuests = await uploadGuests(eventId, eventManifest.guests);
      await db
        .update(events)
        .set({ guests: seededGuests, updatedAt: new Date() })
        .where(eq(events.id, eventId));
      guestsSeeded += seededGuests.length;
      programmeItemsSeeded += programme?.length ?? 0;

      console.log(
        `  ${manifest.slug.padEnd(28)} ${eventManifest.name} (${eventManifest.startDate})  ` +
          `guests=${seededGuests.length}  programme=${programme?.length ?? 0}`
      );
    }
  }

  console.log("");
  console.log(`  Manifests:        ${manifests.length}`);
  console.log(`  Organizers added: ${organizersCreated}`);
  console.log(`  Conventions new:  ${conventionsCreated}`);
  console.log(`  Events upserted:  ${eventsUpserted}`);
  console.log(`  Assets uploaded:  ${assetsUploaded}`);
  console.log(`  Guests seeded:    ${guestsSeeded}`);
  console.log(`  Programme items:  ${programmeItemsSeeded}`);
  console.log(`  Domain:           @${SEED_ORGANIZER_DOMAIN}`);
  console.log(`  Password:         ${SEED_PASSWORD}`);
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
