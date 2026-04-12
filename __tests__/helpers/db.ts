import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { profiles } from "@/lib/db/schema/profiles";
import { conventions } from "@/lib/db/schema/conventions";
import { events } from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import { conventionFollows } from "@/lib/db/schema/convention-follows";
import { conventionArtistLists } from "@/lib/db/schema/convention-artist-lists";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { hashPassword } from "@/lib/auth/helpers";

export async function cleanDatabase() {
  await db.delete(applications);
  await db.delete(conventionFollows);
  await db.delete(conventionArtistLists);
  await db.delete(events);
  await db.delete(portfolioImages);
  await db.delete(artistProfiles);
  await db.delete(conventions);
  await db.delete(profiles);
  await db.delete(users);
}

export async function findUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user ?? undefined;
}

export async function findProfileByUserId(userId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId));
  return profile ?? undefined;
}

export async function findArtistProfileByProfileId(profileId: string) {
  const [artistProfile] = await db
    .select()
    .from(artistProfiles)
    .where(eq(artistProfiles.profileId, profileId));
  return artistProfile ?? undefined;
}

export async function findConventionByOrganizerId(organizerId: string) {
  const [convention] = await db
    .select()
    .from(conventions)
    .where(eq(conventions.organizerId, organizerId));
  return convention ?? undefined;
}

export async function findEventsByConventionId(conventionId: string) {
  return db.select().from(events).where(eq(events.conventionId, conventionId));
}

export async function findListEntriesByConventionId(conventionId: string) {
  return db
    .select()
    .from(conventionArtistLists)
    .where(eq(conventionArtistLists.conventionId, conventionId));
}

export async function findApplicationsByEventId(eventId: string) {
  return db
    .select()
    .from(applications)
    .where(eq(applications.eventId, eventId));
}

export async function findFollowsByProfileId(profileId: string) {
  return db
    .select()
    .from(conventionFollows)
    .where(eq(conventionFollows.profileId, profileId));
}

export async function createTestOrganizer(
  email = "organizer@test.com",
  conventionName = "Test Convention"
) {
  const hashedPassword = await hashPassword("password123");

  const [user] = await db
    .insert(users)
    .values({ email, name: "Test Organizer", password: hashedPassword })
    .returning();

  const [profile] = await db
    .insert(profiles)
    .values({ userId: user.id, role: "organizer", displayName: "Test Organizer" })
    .returning();

  const [convention] = await db
    .insert(conventions)
    .values({ organizerId: profile.id, name: conventionName })
    .returning();

  return { user, profile, convention };
}

export async function createTestArtist(
  email = "artist@test.com",
  displayName = "Test Artist"
) {
  const hashedPassword = await hashPassword("password123");

  const [user] = await db
    .insert(users)
    .values({ email, name: displayName, password: hashedPassword })
    .returning();

  const [profile] = await db
    .insert(profiles)
    .values({ userId: user.id, role: "artist", displayName })
    .returning();

  const [artistProfile] = await db
    .insert(artistProfiles)
    .values({ profileId: profile.id })
    .returning();

  return { user, profile, artistProfile };
}

export async function createTestEvent(
  conventionId: string,
  overrides: Partial<typeof events.$inferInsert> = {}
) {
  const [event] = await db
    .insert(events)
    .values({
      conventionId,
      name: "Test Event",
      eventStartDate: "2026-07-15",
      status: "accepting_applications",
      fieldRequirements: {
        displayName: "required",
        contactEmail: "required",
        realName: "not_requested",
        phone: "not_requested",
        bio: "not_requested",
        websiteUrl: "not_requested",
        socialLinks: "not_requested",
        helpers: "not_requested",
        accessibilityNeeds: "not_requested",
        tableSizePreference: "not_requested",
        notes: "not_requested",
        portfolioImages: "not_requested",
      },
      minPortfolioImages: 0,
      ...overrides,
    })
    .returning();

  return event;
}

export function buildFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}
