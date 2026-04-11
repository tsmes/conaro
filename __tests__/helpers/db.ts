import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/auth";
import { profiles } from "@/lib/db/schema/profiles";
import { conventions } from "@/lib/db/schema/conventions";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";

export async function cleanDatabase() {
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

export function buildFormData(data: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(data)) {
    formData.set(key, value);
  }
  return formData;
}
