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
  logger?: (msg: string) => void;
}

export interface RunSeedArtistsResult {
  total: number;
  created: number;
  existing: number;
  portfoliosSeeded: number;
  imagesUploaded: number;
}

export async function runSeedArtists(
  opts: RunSeedArtistsOptions = {}
): Promise<RunSeedArtistsResult> {
  const count = opts.count ?? 50;
  const withPortfolios = opts.withPortfolios ?? false;
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
  for (let i = 0; i < count; i += 1) {
    const plan = planArtist(i);
    const result = await ensureSeedArtist(plan, passwordHash);
    if (result.created) created += 1;
    else existed += 1;

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

  return {
    total: count,
    created,
    existing: existed,
    portfoliosSeeded,
    imagesUploaded,
  };
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
    logger: (msg) => console.log(msg),
  })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
