/**
 * Seed a bunch of artist accounts with populated profiles.
 *
 *   npm run db:seed:artists -- [count]
 *
 * Defaults to 25. Idempotent: existing seed-artist-*@seed-artist.conaro.test
 * accounts are reused, new ones are filled in to reach the requested total.
 *
 * All accounts use password "seed-pass-123".
 */

import {
  SEED_ARTIST_DOMAIN,
  SEED_PASSWORD,
  ensureSeedArtist,
  getHashedSeedPassword,
  parseCountArg,
  planArtist,
} from "./lib/seed";

async function run() {
  const count = parseCountArg(process.argv[2], 25);
  console.log(`Seeding ${count} artist account(s)…`);

  const passwordHash = await getHashedSeedPassword();

  let created = 0;
  let existed = 0;
  for (let i = 0; i < count; i += 1) {
    const plan = planArtist(i);
    const result = await ensureSeedArtist(plan, passwordHash);
    if (result.created) created += 1;
    else existed += 1;
    console.log(
      `  ${result.created ? "+" : "="} ${result.email}  (${result.fullName})`
    );
  }

  console.log("");
  console.log(`  Total:    ${count}`);
  console.log(`  Created:  ${created}`);
  console.log(`  Existing: ${existed}`);
  console.log(`  Domain:   @${SEED_ARTIST_DOMAIN}`);
  console.log(`  Password: ${SEED_PASSWORD}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
