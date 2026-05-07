import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import type { PortfolioSection } from "../../src/lib/db/schema/portfolio-images";

// Resolve via process.cwd() so this path works both from CLI tsx
// invocation (cwd = repo root) and from a Next.js route handler at
// runtime, where __dirname points into .next/server/... and would
// not reach the repo's scripts/ directory.
export const SEED_PORTFOLIOS_DIR = path.resolve(
  process.cwd(),
  "scripts",
  "seed-assets",
  "portfolios"
);

const sectionEnum = z.enum(["promo", "product", "previous_stand"]);

const portfolioImageEntrySchema = z.object({
  file: z.string().min(1),
  section: sectionEnum,
  caption: z.string().optional(),
});

const portfolioManifestSchema = z.object({
  images: z.array(portfolioImageEntrySchema).min(1),
});

export type PortfolioImageEntry = z.infer<typeof portfolioImageEntrySchema>;

export interface LoadedPortfolioPool {
  bySection: Record<PortfolioSection, PortfolioImageEntry[]>;
  all: PortfolioImageEntry[];
}

export function loadPortfolioPool(): LoadedPortfolioPool {
  const manifestPath = path.join(SEED_PORTFOLIOS_DIR, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      `Portfolio manifest not found at ${manifestPath}. ` +
        "Did you forget to run the curation step? See plan Phase C."
    );
  }
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const parsed = portfolioManifestSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `Invalid portfolio manifest at ${manifestPath}:\n${parsed.error.toString()}`
    );
  }

  const bySection: LoadedPortfolioPool["bySection"] = {
    promo: [],
    product: [],
    previous_stand: [],
  };
  for (const entry of parsed.data.images) {
    const filePath = path.join(SEED_PORTFOLIOS_DIR, entry.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Portfolio manifest references missing file: ${entry.file}`
      );
    }
    bySection[entry.section].push(entry);
  }

  for (const section of Object.keys(bySection) as PortfolioSection[]) {
    if (bySection[section].length === 0) {
      throw new Error(
        `Portfolio manifest has zero entries for section "${section}"`
      );
    }
  }

  return { bySection, all: parsed.data.images };
}

export function resolvePortfolioImagePath(file: string): string {
  return path.join(SEED_PORTFOLIOS_DIR, file);
}
