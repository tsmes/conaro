/**
 * Seed a new event on a convention so you have something to point the
 * apply-seed script at.
 *
 *   npm run db:seed:event -- [conventionIdOrName] [eventName]
 *
 * If no convention arg is supplied, picks the first convention in the
 * database. Useful when you only have one seed organizer. If multiple
 * conventions match the name, errors and lists them.
 *
 * The event is created in status=accepting_applications so artists can
 * immediately submit applications via the apply-seed script.
 */

import "./lib/env";

import { eq, ilike } from "drizzle-orm";
import { db } from "../src/lib/db";
import { conventions } from "../src/lib/db/schema/conventions";
import { events } from "../src/lib/db/schema/events";
import { buildDefaultFieldRequirements } from "../src/lib/conventions/queries";

async function pickConvention(arg: string | undefined) {
  if (!arg) {
    const all = await db.select().from(conventions).limit(2);
    if (all.length === 0) {
      throw new Error(
        "No conventions found. Create one through the organizer UI first, " +
          "or pass a convention id/name explicitly."
      );
    }
    if (all.length > 1) {
      const list = await db
        .select({ id: conventions.id, name: conventions.name })
        .from(conventions);
      throw new Error(
        `Multiple conventions exist; pass one explicitly:\n${list
          .map((c) => `  - ${c.name}  (${c.id})`)
          .join("\n")}`
      );
    }
    return all[0];
  }

  // Try id first, then name match.
  const [byId] = await db
    .select()
    .from(conventions)
    .where(eq(conventions.id, arg));
  if (byId) return byId;

  const matches = await db
    .select()
    .from(conventions)
    .where(ilike(conventions.name, arg));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new Error(`No convention matches "${arg}"`);
  }
  throw new Error(
    `Multiple conventions match "${arg}":\n${matches
      .map((c) => `  - ${c.name}  (${c.id})`)
      .join("\n")}`
  );
}

function isoDaysFromNow(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function run() {
  const conventionArg = process.argv[2];
  const eventNameArg = process.argv[3];

  const convention = await pickConvention(conventionArg);

  const name = eventNameArg ?? `${convention.name} · Seed Event`;

  const [event] = await db
    .insert(events)
    .values({
      conventionId: convention.id,
      name,
      description:
        "Seeded event for testing the application approval flow. " +
        "Delete from the organizer UI when you're done.",
      status: "accepting_applications",
      eventStartDate: isoDaysFromNow(60),
      eventEndDate: isoDaysFromNow(61),
      applicationOpenDate: isoDaysFromNow(-5),
      applicationCloseDate: isoDaysFromNow(30),
      venueName: "Hall C",
      venueCity: "Oslo",
      venueCountry: "NO",
      availableStands: 20,
      tableDimensions: "180 x 80 cm",
      fieldRequirements: buildDefaultFieldRequirements(),
      minPortfolioImages: 0,
      tableSizeOptions: [
        {
          id: crypto.randomUUID(),
          label: "Standard",
          priceNok: 280,
        },
        {
          id: crypto.randomUUID(),
          label: "Double",
          priceNok: 580,
        },
      ],
      maxAssistants: 1,
      assistantFeeNok: 300,
    })
    .returning();

  console.log("");
  console.log(`  Convention: ${convention.name} (${convention.id})`);
  console.log(`  Event:      ${event.name}`);
  console.log(`  Event ID:   ${event.id}`);
  console.log(`  Status:     ${event.status}`);
  console.log(
    `  Dates:      ${event.eventStartDate} \u2013 ${event.eventEndDate}`
  );
  console.log("");
  console.log(
    `  Next:       npm run db:seed:apply -- ${event.id} 20`
  );
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  });
