/**
 * Wipe every row owned by a seed-* user account, then exit.
 *
 *   npm run db:seed:reset
 *
 * Targets users whose email ends with `@conaro.test`,
 * `@seed-artist.conaro.test`, or matches the legacy seed-selection
 * organizer email. ON DELETE CASCADE walks through profiles into
 * conventions, events, applications, and portfolio_images, so deleting
 * the users row is enough to nuke the whole seed surface.
 *
 * For a full DB wipe (schema + data, all users including non-seed),
 * use the docker volume reset:
 *
 *   docker compose down -v && docker compose up -d && npm run db:migrate
 *
 * That blows away pgdata entirely. This script is the gentler option.
 */

import "./lib/env";

import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { users } from "../src/lib/db/schema/auth";
import {
  SEED_ARTIST_DOMAIN,
  SEED_ORGANIZER_DOMAIN,
} from "./lib/seed";

// The pre-existing seed-selection.ts script uses a single hardcoded
// organizer email; mirror it here so this reset cleans up demos from
// before the per-convention organizer split.
const LEGACY_SELECTION_ORGANIZER_EMAIL = "demo-organizer@conaro.test";

export interface RunResetSeedDataOptions {
  logger?: (msg: string) => void;
}

export interface RunResetSeedDataResult {
  deleted: number;
  total: number;
  emails: string[];
}

export async function runResetSeedData(
  opts: RunResetSeedDataOptions = {}
): Promise<RunResetSeedDataResult> {
  const log = opts.logger ?? (() => {});

  const all = await db.select({ id: users.id, email: users.email }).from(users);

  const targets = all.filter(
    (u) =>
      u.email.endsWith(`@${SEED_ORGANIZER_DOMAIN}`) ||
      u.email.endsWith(`@${SEED_ARTIST_DOMAIN}`) ||
      u.email === LEGACY_SELECTION_ORGANIZER_EMAIL
  );

  log(
    `Found ${targets.length} seed user(s) to delete (of ${all.length} total)…`
  );

  for (const target of targets) {
    await db.delete(users).where(eq(users.id, target.id));
    log(`  - ${target.email}`);
  }

  log("");
  log(`  Deleted: ${targets.length} user(s)`);
  log(
    "  Storage: convention/event/portfolio files in storage are NOT removed."
  );
  log("  Re-run db:seed:conventions / db:seed:artists to re-populate.");

  return {
    deleted: targets.length,
    total: all.length,
    emails: targets.map((t) => t.email),
  };
}

// Run when invoked directly via `tsx scripts/seed-reset.ts`.
// Stricter than endsWith: a path like /tmp/foo-seed-reset.ts would
// match endsWith("seed-reset.ts") but not basename === "seed-reset.ts".
const isDirectInvocation =
  typeof process !== "undefined" &&
  process.argv[1] &&
  path.basename(process.argv[1]) === "seed-reset.ts";

if (isDirectInvocation) {
  runResetSeedData({ logger: (msg) => console.log(msg) })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
