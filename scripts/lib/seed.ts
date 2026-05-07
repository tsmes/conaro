// Shared helpers for the three seed scripts:
//   - scripts/seed-artists.ts
//   - scripts/seed-event.ts
//   - scripts/seed-apply.ts
//
// All seed accounts share the same password and use the seed-* email
// domains so purgeSeedArtists / purgeSeedOrganizer know what they own.

import fs from "node:fs";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../src/lib/auth/helpers";
import { db } from "../../src/lib/db";
import { artistProfiles } from "../../src/lib/db/schema/artist-profiles";
import { users } from "../../src/lib/db/schema/auth";
import { profiles } from "../../src/lib/db/schema/profiles";
import {
  portfolioImages,
  type PortfolioSection,
} from "../../src/lib/db/schema/portfolio-images";
import { serializeSocialLinks } from "../../src/lib/artist-profile/social-links";
import {
  GENRE_SUGGESTIONS,
  MEDIUM_SUGGESTIONS,
} from "../../src/lib/artist-profile/tags";
import { processImage } from "../../src/lib/storage/image";
import { storage } from "../../src/lib/storage";
import {
  loadPortfolioPool,
  resolvePortfolioImagePath,
  type LoadedPortfolioPool,
  type PortfolioImageEntry,
} from "./portfolio-manifest";

export const SEED_PASSWORD = "seed-pass-123";
export const SEED_ARTIST_DOMAIN = "conaro.test";
export const SEED_ORGANIZER_DOMAIN = "conaro.test";

const FIRST_NAMES = [
  "Mika", "Jun", "Clara", "Marcus", "Isolde", "Rafael", "Fenna", "Priya",
  "Leo", "Ines", "Otto", "Amaya", "Deva", "Sana", "Nils", "Rosa", "Theo",
  "Elena", "Kenji", "Nadia", "August", "Mariana", "Hiro", "Juno", "Beatrix",
  "Sofie", "Eirik", "Linnea", "Yuki", "Tomas", "Ingrid", "Aki", "Vera",
  "Bastian", "Astrid", "Olav", "Signe", "Runa", "Haakon", "Iselin",
];

const LAST_NAMES = [
  "Aaltonen", "Sato", "Vorwerk", "Oduya", "Bergman", "Souza", "van Dijk",
  "Chatterjee", "Marchetti", "Tremblay", "Halvorsen", "Okafor", "Rao",
  "Ghorbani", "Lindqvist", "Paredes", "Korhonen", "Dimitrova", "Watanabe",
  "Fakhoury", "Reinholt", "Alves", "Tanaka", "Byrne", "Varga", "Holm",
  "Lund", "Dahl", "Berg", "Moen", "Solheim", "Hagen", "Strand",
];

const PRONOUNS = ["she/her", "he/him", "they/them", "she/they", "he/they"];

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
  "3D-printed props and busts. Commissions open for larger cosplay work.",
  "Embroidered patches with mythological motifs; small-batch only.",
  "Enamel pin designer. Chibi furry cats, mostly.",
  "Plushies and soft sculpture. Original characters and fanart.",
  "Hand-bound zines printed at home. Queer diary comics.",
];

const SOCIAL_PLATFORMS = [
  "Instagram",
  "TikTok",
  "Cara",
  "BlueSky",
  "Artdeck",
] as const;

export interface SeedArtistPlan {
  index: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  pronouns: string;
  bio: string;
  helpers: number;
  priceRangeMinNok: number | null;
  priceRangeMaxNok: number | null;
  genres: string[];
  mediums: string[];
  socialLinksJson: string;
  websiteUrl: string | null;
  phone: string | null;
  accessibilityNeeds: string | null;
  notes: string | null;
}

function sampleSome<T>(list: readonly T[], count: number, seed: number): T[] {
  const arr = [...list];
  const out: T[] = [];
  for (let i = 0; i < count && arr.length > 0; i += 1) {
    const idx = (seed * (i + 7) + 3) % arr.length;
    out.push(arr.splice(idx, 1)[0]);
  }
  return out;
}

export function planArtist(index: number): SeedArtistPlan {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[(index * 3 + 5) % LAST_NAMES.length];
  const fullName = `${firstName} ${lastName}`;
  const num = String(index + 1).padStart(3, "0");
  const email = `seed-artist-${num}@${SEED_ARTIST_DOMAIN}`;

  const priceMin = 100 + ((index * 37) % 200);
  const priceMax = priceMin + 200 + ((index * 113) % 1000);

  const socialCount = 1 + (index % 3);
  const platforms = sampleSome(SOCIAL_PLATFORMS, socialCount, index + 17);
  const slug = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const socialLinksJson = serializeSocialLinks(
    platforms.map((type) => ({
      type,
      url: `https://${type.toLowerCase().replace(/[^a-z]/g, "")}.example/${slug}`,
    }))
  );

  // Roughly half the artists publish a website, ~30 % share a phone
  // (organisers see this; the public profile doesn't), and a handful
  // leave accessibility notes and a private message for organisers.
  const websiteUrl = index % 2 === 0 ? `https://${slug}.example` : null;
  const phone =
    index % 3 === 0
      ? `+47 ${String(400_00_000 + ((index * 91347) % 99_999_999)).slice(0, 3)} ${String(400_00_000 + ((index * 91347) % 99_999_999)).slice(3, 5)} ${String(400_00_000 + ((index * 91347) % 99_999_999)).slice(5, 8)}`
      : null;
  const accessibilityNeeds =
    index % 7 === 0
      ? "Prefer a stand close to a quiet zone — sensory breaks needed."
      : index % 11 === 0
      ? "Wheelchair access required (no step at table edge)."
      : null;
  const notes =
    index % 5 === 0
      ? "Returning vendor; happy to share table space with a friend if that helps with layout."
      : null;

  return {
    index,
    firstName,
    lastName,
    fullName,
    email,
    pronouns: PRONOUNS[index % PRONOUNS.length],
    bio: BIOS[index % BIOS.length],
    helpers: index % 3,
    priceRangeMinNok: priceMin,
    priceRangeMaxNok: priceMax,
    genres: sampleSome(GENRE_SUGGESTIONS, 2 + (index % 3), index + 11),
    mediums: sampleSome(MEDIUM_SUGGESTIONS, 1 + (index % 3), index + 5),
    socialLinksJson,
    websiteUrl,
    phone,
    accessibilityNeeds,
    notes,
  };
}

export interface SeedArtistIds {
  userId: string;
  profileId: string;
  artistProfileId: string;
  email: string;
  fullName: string;
  created: boolean;
}

// Idempotent: looks up by email first; returns the existing row if present.
export async function ensureSeedArtist(
  plan: SeedArtistPlan,
  passwordHash: string
): Promise<SeedArtistIds> {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, plan.email));

  if (existingUser) {
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, existingUser.id));
    const [existingArtistProfile] = await db
      .select()
      .from(artistProfiles)
      .where(eq(artistProfiles.profileId, existingProfile.id));
    return {
      userId: existingUser.id,
      profileId: existingProfile.id,
      artistProfileId: existingArtistProfile.id,
      email: plan.email,
      fullName: plan.fullName,
      created: false,
    };
  }

  const [user] = await db
    .insert(users)
    .values({
      email: plan.email,
      name: plan.fullName,
      password: passwordHash,
    })
    .returning();

  const [profile] = await db
    .insert(profiles)
    .values({
      userId: user.id,
      role: "artist",
      displayName: plan.fullName,
    })
    .returning();

  const [artistProfile] = await db
    .insert(artistProfiles)
    .values({
      profileId: profile.id,
      realName: plan.fullName,
      pronouns: plan.pronouns,
      contactEmail: plan.email,
      bio: plan.bio,
      helpers: plan.helpers,
      priceRangeMinNok: plan.priceRangeMinNok,
      priceRangeMaxNok: plan.priceRangeMaxNok,
      genres: plan.genres,
      mediums: plan.mediums,
      socialLinks: plan.socialLinksJson || null,
      websiteUrl: plan.websiteUrl,
      phone: plan.phone,
      accessibilityNeeds: plan.accessibilityNeeds,
      notes: plan.notes,
    })
    .returning();

  return {
    userId: user.id,
    profileId: profile.id,
    artistProfileId: artistProfile.id,
    email: plan.email,
    fullName: plan.fullName,
    created: true,
  };
}

export async function getHashedSeedPassword(): Promise<string> {
  return hashPassword(SEED_PASSWORD);
}

export interface SeedOrganizerIds {
  userId: string;
  profileId: string;
  email: string;
  created: boolean;
}

// Idempotent: looks up the organizer profile by email; creates the
// users + profiles rows if missing. Returns the profile id you'll use
// as the conventions.organizerId FK.
export async function ensureSeedOrganizer(
  args: { slug: string; name: string },
  passwordHash: string
): Promise<SeedOrganizerIds> {
  const email = `${args.slug}@${SEED_ORGANIZER_DOMAIN}`;

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existingUser) {
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, existingUser.id));
    return {
      userId: existingUser.id,
      profileId: existingProfile.id,
      email,
      created: false,
    };
  }

  const [user] = await db
    .insert(users)
    .values({ email, name: args.name, password: passwordHash })
    .returning();

  const [profile] = await db
    .insert(profiles)
    .values({
      userId: user.id,
      role: "organizer",
      displayName: args.name,
    })
    .returning();

  return {
    userId: user.id,
    profileId: profile.id,
    email,
    created: true,
  };
}

// Returns numeric arg or the default; e.g. parseCountArg("25", 10) -> 25.
export function parseCountArg(
  raw: string | undefined,
  fallback: number
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Expected a positive integer, got "${raw}"`);
  }
  return n;
}

export interface SeedArtistPortfolioResult {
  inserted: number;
  bySection: Record<PortfolioSection, number>;
}

// Picks a deterministic, repeatable selection from the bundled CC0
// portfolio pool, uploads each via processImage(), and replaces any
// existing portfolio_images rows for this artist.
export async function seedArtistPortfolio(
  profileId: string,
  index: number,
  pool: LoadedPortfolioPool
): Promise<SeedArtistPortfolioResult> {
  // Drop existing portfolio rows so re-runs don't pile up duplicates.
  // Storage objects from previous runs are left in place — the new
  // upload writes a fresh uuid path so there's no collision.
  await db.delete(portfolioImages).where(eq(portfolioImages.profileId, profileId));

  // Section counts vary by index for visual variety: every artist
  // gets 1–2 promo, 2–4 product, 1–2 previous_stand → 4–8 total.
  const promoCount = 1 + (index % 2);
  const productCount = 2 + (index % 3);
  const standCount = 1 + ((index + 1) % 2);

  const picks: { entry: PortfolioImageEntry; section: PortfolioSection }[] = [
    ...pickFromSection(pool, "promo", promoCount, index + 7),
    ...pickFromSection(pool, "product", productCount, index + 13),
    ...pickFromSection(pool, "previous_stand", standCount, index + 19),
  ];

  const bySection: Record<PortfolioSection, number> = {
    promo: 0,
    product: 0,
    previous_stand: 0,
  };

  for (let i = 0; i < picks.length; i += 1) {
    const { entry, section } = picks[i];
    const sourcePath = resolvePortfolioImagePath(entry.file);
    const raw = fs.readFileSync(sourcePath);
    const processed = await processImage(raw);
    const imageId = crypto.randomUUID();
    const storageKey = `portfolios/${profileId}/${imageId}.webp`;
    await storage.upload(storageKey, processed.data, "image/webp");

    await db.insert(portfolioImages).values({
      id: imageId,
      profileId,
      filename: entry.file,
      storagePath: storageKey,
      mimeType: "image/webp",
      width: processed.width,
      height: processed.height,
      sortOrder: i,
      section,
      caption: entry.caption ?? null,
    });

    bySection[section] += 1;
  }

  return { inserted: picks.length, bySection };
}

function pickFromSection(
  pool: LoadedPortfolioPool,
  section: PortfolioSection,
  count: number,
  seed: number
): { entry: PortfolioImageEntry; section: PortfolioSection }[] {
  const items = pool.bySection[section];
  const out: { entry: PortfolioImageEntry; section: PortfolioSection }[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = (seed * (i + 11) + 5) % items.length;
    out.push({ entry: items[idx], section });
  }
  return out;
}

export { loadPortfolioPool };
