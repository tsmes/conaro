import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

// Resolve via process.cwd() so these paths work both from CLI tsx
// invocation (cwd = repo root) and from a Next.js route handler at
// runtime, where __dirname points into .next/server/... and would
// not reach the repo's scripts/ directory.
export const SEED_ASSETS_DIR = path.resolve(
  process.cwd(),
  "scripts",
  "seed-assets",
  "conventions"
);

export const SEED_GUESTS_DIR = path.resolve(
  process.cwd(),
  "scripts",
  "seed-assets",
  "guests"
);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:mm");

const assetEntrySchema = z
  .object({
    file: z.string().min(1),
    source: z.string().url().nullable().optional(),
  })
  .nullable();

const socialLinkSchema = z.object({
  type: z.string().min(1),
  url: z.string().url(),
});

export const guestManifestSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  role: z.string().optional(),
  pronouns: z.string().optional(),
  bio: z.string().optional(),
  photo: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  socialLinks: z.array(socialLinkSchema).optional(),
});

export const programmeItemManifestSchema = z.object({
  date: isoDate,
  startTime: hhmm,
  endTime: hhmm.optional(),
  title: z.string().min(1),
  room: z.string().optional(),
  speaker: z.string().optional(),
});

export const eventManifestSchema = z.object({
  name: z.string().min(1),
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable().optional(),
  venueName: z.string().nullable().optional(),
  venueCity: z.string().nullable().optional(),
  venueCountry: z.string().nullable().optional(),
  guests: z.array(guestManifestSchema).optional(),
  programme: z.array(programmeItemManifestSchema).optional(),
});

export const conventionManifestSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  websiteUrl: z.string().url().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  headerColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  events: z.array(eventManifestSchema),
  assets: z.object({
    logo: assetEntrySchema,
    banner: assetEntrySchema,
    bannerMobile: assetEntrySchema,
  }),
  scrapedFrom: z.array(z.string()).optional(),
  scrapedAt: z.string().optional(),
  notes: z.string().optional(),
  skip: z.boolean().optional(),
});

export type ConventionManifest = z.infer<typeof conventionManifestSchema>;
export type EventManifest = z.infer<typeof eventManifestSchema>;
export type GuestManifest = z.infer<typeof guestManifestSchema>;
export type ProgrammeItemManifest = z.infer<typeof programmeItemManifestSchema>;

export interface LoadedManifest {
  manifest: ConventionManifest;
  folder: string;
}

export function loadConventionManifests(): LoadedManifest[] {
  const slugs = fs
    .readdirSync(SEED_ASSETS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const out: LoadedManifest[] = [];
  for (const slug of slugs) {
    const folder = path.join(SEED_ASSETS_DIR, slug);
    const manifestPath = path.join(folder, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    const raw = fs.readFileSync(manifestPath, "utf-8");
    const json = JSON.parse(raw) as { skip?: boolean; slug?: string };
    if (json.skip) continue;
    const parsed = conventionManifestSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(
        `Invalid manifest at ${manifestPath}:\n${parsed.error.toString()}`
      );
    }
    if (parsed.data.slug !== slug) {
      throw new Error(
        `Slug mismatch: folder is "${slug}" but manifest.slug is "${parsed.data.slug}"`
      );
    }
    out.push({ manifest: parsed.data, folder });
  }
  return out;
}

export function resolveAssetPath(
  folder: string,
  entry: { file: string } | null | undefined
): string | null {
  if (!entry) return null;
  return path.join(folder, entry.file);
}

export function resolveGuestPhotoPath(filename: string | undefined): string | null {
  if (!filename) return null;
  return path.join(SEED_GUESTS_DIR, filename);
}
