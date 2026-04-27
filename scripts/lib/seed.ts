// Shared helpers for the three seed scripts:
//   - scripts/seed-artists.ts
//   - scripts/seed-event.ts
//   - scripts/seed-apply.ts
//
// All seed accounts share the same password and use the seed-* email
// domains so purgeSeedArtists / purgeSeedOrganizer know what they own.

import { eq } from "drizzle-orm";
import { hashPassword } from "../../src/lib/auth/helpers";
import { db } from "../../src/lib/db";
import { artistProfiles } from "../../src/lib/db/schema/artist-profiles";
import { users } from "../../src/lib/db/schema/auth";
import { profiles } from "../../src/lib/db/schema/profiles";
import { serializeSocialLinks } from "../../src/lib/artist-profile/social-links";
import {
  GENRE_SUGGESTIONS,
  MEDIUM_SUGGESTIONS,
} from "../../src/lib/artist-profile/tags";

export const SEED_PASSWORD = "seed-pass-123";
export const SEED_ARTIST_DOMAIN = "seed-artist.conaro.test";
export const SEED_ORGANIZER_DOMAIN = "seed-organizer.conaro.test";

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
  const slug = firstName.toLowerCase();
  const socialLinksJson = serializeSocialLinks(
    platforms.map((type) => ({
      type,
      url: `https://${type.toLowerCase().replace(/[^a-z]/g, "")}.example/${slug}`,
    }))
  );

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
  const email = `seed-organizer-${args.slug}@${SEED_ORGANIZER_DOMAIN}`;

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
