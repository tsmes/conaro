/**
 * Seed a bunch of artist accounts with populated profiles.
 *
 *   npm run db:seed:artists -- [count] [--with-portfolios]
 *
 * Defaults to 50 artists. Idempotent: existing
 * seed-artist-*@seed-artist.conaro.test accounts are reused, new ones
 * are filled in to reach the requested total.
 *
 * `--with-portfolios` (or `-p`) additionally uploads ~5 portfolio
 * images per artist from the bundled CC0 pool under
 * scripts/seed-assets/portfolios/. Existing portfolio_images rows for
 * the artist are dropped first so re-runs don't duplicate.
 *
 * All accounts use password "seed-pass-123".
 */

import "./lib/env";

import fs from "node:fs";
import path from "node:path";

import {
  SEED_ARTIST_DOMAIN,
  SEED_PASSWORD,
  ensureSeedArtist,
  getHashedSeedPassword,
  loadPortfolioPool,
  parseCountArg,
  planArtist,
  seedArtistPortfolio,
} from "./lib/seed";

interface ParsedArgs {
  count: number;
  withPortfolios: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let count: number | undefined;
  let withPortfolios = false;
  for (const arg of args) {
    if (arg === "--with-portfolios" || arg === "-p") {
      withPortfolios = true;
    } else if (count === undefined) {
      count = parseCountArg(arg, 50);
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  return { count: count ?? 50, withPortfolios };
}

export interface RunSeedArtistsOptions {
  count?: number;
  withPortfolios?: boolean;
  writeCredentialsFile?: boolean;
  logger?: (msg: string) => void;
}

export interface RunSeedArtistsResult {
  total: number;
  created: number;
  existing: number;
  portfoliosSeeded: number;
  imagesUploaded: number;
}

interface ArtistCredential {
  index: number;
  email: string;
  fullName: string;
}

export async function runSeedArtists(
  opts: RunSeedArtistsOptions = {}
): Promise<RunSeedArtistsResult> {
  const count = opts.count ?? 50;
  const withPortfolios = opts.withPortfolios ?? false;
  const shouldWriteCredentialsFile = opts.writeCredentialsFile ?? false;
  const log = opts.logger ?? (() => {});

  log(
    `Seeding ${count} artist account(s)${withPortfolios ? " with portfolios" : ""}…`
  );

  const passwordHash = await getHashedSeedPassword();
  const pool = withPortfolios ? loadPortfolioPool() : null;

  let created = 0;
  let existed = 0;
  let portfoliosSeeded = 0;
  let imagesUploaded = 0;
  const credentials: ArtistCredential[] = [];
  for (let i = 0; i < count; i += 1) {
    const plan = planArtist(i);
    const result = await ensureSeedArtist(plan, passwordHash);
    if (result.created) created += 1;
    else existed += 1;
    credentials.push({
      index: i + 1,
      email: result.email,
      fullName: result.fullName,
    });

    let portfolioSummary = "";
    if (pool) {
      const portfolio = await seedArtistPortfolio(result.profileId, i, pool);
      portfoliosSeeded += 1;
      imagesUploaded += portfolio.inserted;
      portfolioSummary =
        ` portfolio=${portfolio.inserted} ` +
        `(promo:${portfolio.bySection.promo} ` +
        `product:${portfolio.bySection.product} ` +
        `stand:${portfolio.bySection.previous_stand})`;
    }

    log(
      `  ${result.created ? "+" : "="} ${result.email}  (${result.fullName})${portfolioSummary}`
    );
  }

  log("");
  log(`  Total:    ${count}`);
  log(`  Created:  ${created}`);
  log(`  Existing: ${existed}`);
  if (pool) {
    log(`  Portfolios:       ${portfoliosSeeded}`);
    log(`  Images uploaded:  ${imagesUploaded}`);
  }
  log(`  Domain:   @${SEED_ARTIST_DOMAIN}`);
  log(`  Password: ${SEED_PASSWORD}`);

  if (shouldWriteCredentialsFile) {
    upsertArtistCredentialsSection(credentials, log);
  }

  return {
    total: count,
    created,
    existing: existed,
    portfoliosSeeded,
    imagesUploaded,
  };
}

// Write the artists section of scripts/seed-credentials.md, replacing
// any prior artists section between the marker comments below.
// `seed-conventions.ts` writes the conventions section first; this
// helper appends to that file or creates a fresh one with just the
// artists section if it doesn't exist.
const ARTISTS_SECTION_START = "<!-- ARTISTS:start -->";
const ARTISTS_SECTION_END = "<!-- ARTISTS:end -->";

function upsertArtistCredentialsSection(
  entries: ArtistCredential[],
  log: (msg: string) => void
) {
  const filePath = path.resolve(
    process.cwd(),
    "scripts",
    "seed-credentials.md"
  );

  let existing = "";
  try {
    existing = fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }

  const sectionRe = new RegExp(
    `\\n*${escapeRegExp(ARTISTS_SECTION_START)}[\\s\\S]*?${escapeRegExp(ARTISTS_SECTION_END)}\\n*`,
    "g"
  );
  const baseline = existing.replace(sectionRe, "\n").replace(/\n+$/, "");

  const indexWidth = String(entries.length).length;
  const rows = entries.map((e) => {
    const idx = String(e.index).padStart(indexWidth, "0");
    return `| ${idx} | ${e.fullName} | \`${e.email}\` |`;
  });

  const sectionLines = [
    ARTISTS_SECTION_START,
    "## Artists",
    "",
    `${entries.length} artist accounts. Re-seeds produce the same name → email mapping (deterministic via \`planArtist\` in \`scripts/lib/seed.ts\`).`,
    "",
    `**Password (all accounts):** \`${SEED_PASSWORD}\``,
    "",
    "| # | Name | Email |",
    "| --- | --- | --- |",
    ...rows,
    "",
    ARTISTS_SECTION_END,
  ];

  // If the file was empty (no conventions section), give it a header
  // so it stands on its own when only db:seed:artists has run.
  const header =
    baseline.trim() === ""
      ? "# Seed Login Credentials\n\nGenerated by the seed scripts. Re-run to refresh.\n"
      : "";

  const next =
    (header || baseline + "\n") +
    (header ? "" : "\n") +
    sectionLines.join("\n") +
    "\n";

  fs.writeFileSync(filePath, next, "utf-8");
  log(`  Credentials:      scripts/seed-credentials.md (artists section)`);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const isDirectInvocation =
  typeof process !== "undefined" &&
  process.argv[1] &&
  path.basename(process.argv[1]) === "seed-artists.ts";

if (isDirectInvocation) {
  const { count, withPortfolios } = parseArgs();
  runSeedArtists({
    count,
    withPortfolios,
    writeCredentialsFile: true,
    logger: (msg) => console.log(msg),
  })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
