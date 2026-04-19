/**
 * Seed a convention with ~25 artists and applications in varied states so the
 * Selection workspace has something to render.
 *
 * Run:  npm run db:seed
 *
 * Safe to re-run: deletes and recreates data belonging to the known seed
 * organizer (seed-organizer@conaro.test) only.
 */

import { eq } from "drizzle-orm";

import { hashPassword } from "../src/lib/auth/helpers";
import { db } from "../src/lib/db";
import { applications } from "../src/lib/db/schema/applications";
import type { ProfileSnapshot } from "../src/lib/db/schema/applications";
import { artistProfiles } from "../src/lib/db/schema/artist-profiles";
import { users } from "../src/lib/db/schema/auth";
import { conventions } from "../src/lib/db/schema/conventions";
import { events } from "../src/lib/db/schema/events";
import { profiles } from "../src/lib/db/schema/profiles";
import { buildDefaultFieldRequirements } from "../src/lib/conventions/queries";
import { GENRES, MEDIUMS } from "../src/lib/artist-profile/tags";

const ORGANIZER_EMAIL = "seed-organizer@conaro.test";
const ARTIST_EMAIL_DOMAIN = "seed-artist.conaro.test";
const SEED_PASSWORD = "seed-pass-123";

const ARTIST_NAMES = [
  "Mika Aaltonen",
  "Jun Sato",
  "Clara Vorwerk",
  "Marcus Oduya",
  "Isolde Bergman",
  "Rafael Souza",
  "Fenna van Dijk",
  "Priya Chatterjee",
  "Leo Marchetti",
  "Ines Tremblay",
  "Otto Halvorsen",
  "Amaya Okafor",
  "Deva Rao",
  "Sana Ghorbani",
  "Nils Lindqvist",
  "Rosa Paredes",
  "Theo Korhonen",
  "Elena Dimitrova",
  "Kenji Watanabe",
  "Nadia Fakhoury",
  "August Reinholt",
  "Mariana Alves",
  "Hiro Tanaka",
  "Juno Byrne",
  "Beatrix Varga",
];

const CITIES = [
  "Oslo",
  "Tokyo",
  "Berlin",
  "Lagos",
  "Reykjavík",
  "São Paulo",
  "Amsterdam",
  "Kolkata",
  "Milan",
  "Montréal",
];

const TABLE_SIZES = ["small", "medium", "large", "shared"];

const BIOS = [
  "Narrative illustrator working in ink and risograph; stories about queer joy and slow mornings.",
  "Watercolourist chasing folk-horror aesthetics. Zines printed in small runs.",
  "Digital comics artist. Slice-of-life with a sci-fi undercurrent.",
  "Screenprinted gig posters and botanical studies — mostly at 1am.",
  "Gouache and pastel pieces exploring memory, family, and immigration.",
  "Self-published horror comics. Black ink, lots of it.",
  "Fantasy illustration with a queer folk sensibility.",
  "Process-first practitioner — every piece starts on a Riso drum.",
  "Sci-fi landscape painter; the machine is a character.",
  "Nature studies in acrylic. Field sketches turned into full pieces.",
];

const HELPER_OPTIONS = [0, 1, 2];

function pick<T>(list: readonly T[], seed: number): T {
  return list[seed % list.length];
}

function sampleSome<T>(list: readonly T[], count: number, seed: number): T[] {
  const arr = [...list];
  const out: T[] = [];
  for (let i = 0; i < count && arr.length > 0; i++) {
    const idx = (seed * (i + 7)) % arr.length;
    out.push(arr.splice(idx, 1)[0]);
  }
  return out;
}

type ApplicantPlan = {
  name: string;
  email: string;
  bio: string;
  helpers: number;
  tableSize: string;
  location: string;
  genres: string[];
  mediums: string[];
  status: "submitted" | "accepted" | "rejected";
  pinned: boolean;
};

function planApplicants(): ApplicantPlan[] {
  return ARTIST_NAMES.map((name, index) => {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, ".");
    // Distribute statuses: ~60% submitted, 20% accepted, 10% rejected, 10% pinned submitted
    const bucket = index % 10;
    let status: ApplicantPlan["status"] = "submitted";
    let pinned = false;
    if (bucket < 2) status = "accepted";
    else if (bucket < 3) status = "rejected";
    else if (bucket < 6) {
      status = "submitted";
      pinned = true;
    }
    return {
      name,
      email: `${slug}@${ARTIST_EMAIL_DOMAIN}`,
      bio: pick(BIOS, index),
      helpers: pick(HELPER_OPTIONS, index + 3),
      tableSize: pick(TABLE_SIZES, index + 1),
      location: pick(CITIES, index + 2),
      genres: sampleSome(GENRES, 2 + (index % 3), index + 11),
      mediums: sampleSome(MEDIUMS, 1 + (index % 3), index + 5),
      status,
      pinned,
    };
  });
}

async function purgeExistingSeed() {
  // ON DELETE CASCADE walks users → profiles → artist_profiles / conventions /
  // applications, so removing the users is sufficient.
  const existing = await db
    .select({ id: users.id, email: users.email })
    .from(users);
  const toDelete = existing
    .filter(
      (u) =>
        u.email === ORGANIZER_EMAIL ||
        u.email.endsWith(`@${ARTIST_EMAIL_DOMAIN}`)
    )
    .map((u) => u.id);
  for (const id of toDelete) {
    await db.delete(users).where(eq(users.id, id));
  }
}

async function run() {
  console.log("Seeding Selection demo data…");

  await purgeExistingSeed();

  const passwordHash = await hashPassword(SEED_PASSWORD);

  // Organizer
  const [organizerUser] = await db
    .insert(users)
    .values({
      email: ORGANIZER_EMAIL,
      name: "Selection Demo Organizer",
      password: passwordHash,
    })
    .returning();

  const [organizerProfile] = await db
    .insert(profiles)
    .values({
      userId: organizerUser.id,
      role: "organizer",
      displayName: "Kawaiicon Selection Team",
    })
    .returning();

  const [convention] = await db
    .insert(conventions)
    .values({
      organizerId: organizerProfile.id,
      name: "Kawaiicon 2026",
      description:
        "Yearly convention for zines, comics, and queer illustration in the Nordics.",
      websiteUrl: "https://kawaiicon.example",
    })
    .returning();

  const fieldRequirements = buildDefaultFieldRequirements();

  const [event] = await db
    .insert(events)
    .values({
      conventionId: convention.id,
      name: "Kawaiicon 2026 · Artist Alley",
      description:
        "The curated artist alley. ~14 tables across two halls, weekend event.",
      status: "reviewing",
      eventStartDate: "2026-09-12",
      eventEndDate: "2026-09-13",
      venueName: "Hall C",
      venueCity: "Oslo",
      venueCountry: "Norway",
      availableStands: 14,
      tableDimensions: "1.8m × 0.8m",
      fieldRequirements,
      minPortfolioImages: 0,
      acceptanceMessage:
        "Congratulations! You're in Kawaiicon's artist alley this year.",
      rejectionMessage:
        "Thanks for applying — we couldn't fit everyone this time, but please apply again next year.",
    })
    .returning();

  let created = 0;
  const plans = planApplicants();
  for (const plan of plans) {
    const [artistUser] = await db
      .insert(users)
      .values({
        email: plan.email,
        name: plan.name,
        password: passwordHash,
      })
      .returning();

    const [artistProfile] = await db
      .insert(profiles)
      .values({
        userId: artistUser.id,
        role: "artist",
        displayName: plan.name,
      })
      .returning();

    await db.insert(artistProfiles).values({
      profileId: artistProfile.id,
      bio: plan.bio,
      contactEmail: plan.email,
      helpers: plan.helpers,
      tableSizePreference: plan.tableSize,
      genres: plan.genres,
      mediums: plan.mediums,
    });

    const snapshot: ProfileSnapshot = {
      displayName: plan.name,
      realName: null,
      contactEmail: plan.email,
      phone: null,
      bio: plan.bio,
      websiteUrl: null,
      socialLinks: null,
      helpers: plan.helpers,
      accessibilityNeeds: null,
      tableSizePreference: plan.tableSize,
      notes: null,
      genres: plan.genres,
      mediums: plan.mediums,
      images: [],
    };

    await db.insert(applications).values({
      eventId: event.id,
      profileId: artistProfile.id,
      status: plan.status,
      pinned: plan.pinned,
      profileSnapshot: snapshot,
    });
    created += 1;
  }

  console.log("");
  console.log(`  Convention: ${convention.name}`);
  console.log(`  Event:      ${event.name} (status: ${event.status})`);
  console.log(`  Stands:     ${event.availableStands}`);
  console.log(`  Applicants: ${created}`);
  console.log("");
  console.log(`  Sign in as: ${ORGANIZER_EMAIL}`);
  console.log(`  Password:   ${SEED_PASSWORD}`);
  console.log("");
  console.log(
    `  Selection URL: /conventions/manage/events/${event.id}/applications`
  );
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
