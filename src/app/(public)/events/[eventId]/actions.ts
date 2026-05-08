"use server";

import { and, eq, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type {
  FieldRequirements,
  TableSizeOption,
} from "@/lib/db/schema/events";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { portfolioImages } from "@/lib/db/schema/portfolio-images";
import { applications } from "@/lib/db/schema/applications";
import type {
  ApplicationAnswers,
  ProfileSnapshot,
  SnapshotImage,
} from "@/lib/db/schema/applications";
import { buildApplicationAnswersSchema } from "@/lib/validations/application";
import { conventions } from "@/lib/db/schema/conventions";
import { conventionArtistLists } from "@/lib/db/schema/convention-artist-lists";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { type ActionState } from "@/lib/validations/auth";
import {
  validateProfileForEvent,
  type MissingField,
} from "@/lib/applications/validation";
import { notifyNewApplication } from "@/lib/notifications/triggers";
import { isUniqueViolation } from "@/lib/db/errors";

export interface ApplyResult extends ActionState {
  missingFields?: MissingField[];
}

// Self-service waitlist opt-in for a rejected applicant. Only available
// when the event's convention has waitlistEnabled and results have been
// published. Flips the artist's own application status from 'rejected'
// to 'waitlisted'.
export async function joinWaitlist(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return { error: "Unauthorized" };
  }
  const profileId = session.user.profileId;

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) return { error: "Event ID is required" };

  const [event] = await db
    .select({
      id: events.id,
      status: events.status,
      conventionId: events.conventionId,
    })
    .from(events)
    .where(eq(events.id, eventId));
  if (!event) return { error: "Event not found" };
  if (event.status !== "results_published") {
    return { error: "Waitlist is only available once results are published" };
  }

  const [convention] = await db
    .select({ waitlistEnabled: conventions.waitlistEnabled })
    .from(conventions)
    .where(eq(conventions.id, event.conventionId));
  if (!convention?.waitlistEnabled) {
    return { error: "This convention doesn't have a waitlist" };
  }

  const result = await db
    .update(applications)
    .set({ status: "waitlisted", updatedAt: new Date() })
    .where(
      and(
        eq(applications.eventId, eventId),
        eq(applications.profileId, profileId),
        eq(applications.status, "rejected")
      )
    )
    .returning({ id: applications.id });

  if (result.length === 0) {
    return {
      error: "You can only join the waitlist from a rejected application",
    };
  }

  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function applyToEvent(
  _prevState: ApplyResult,
  formData: FormData
): Promise<ApplyResult> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "artist") {
    return { error: "Unauthorized" };
  }

  const profileId = session.user.profileId;
  const eventId = formData.get("eventId")?.toString();
  if (!eventId) {
    return { error: "Event ID is required" };
  }

  // Fetch event and verify it's accepting applications
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!event) {
    return { error: "Event not found" };
  }

  if (event.status !== "accepting_applications") {
    return { error: "This event is not currently accepting applications" };
  }

  // Mandatory guidelines acknowledgment gate.
  const guidelinesAcknowledged =
    formData.get("guidelinesAcknowledged")?.toString() === "true";
  if (!guidelinesAcknowledged) {
    return { error: "Please confirm you have read and understood the guidelines." };
  }

  // Parse and validate the artist's per-application answers against the
  // event's field requirements.
  const rawAnswers = formData.get("answers")?.toString() || "{}";
  let parsedRaw: unknown;
  try {
    parsedRaw = JSON.parse(rawAnswers);
  } catch {
    return { error: "Could not read your application answers." };
  }
  const answersSchema = buildApplicationAnswersSchema({
    fieldRequirements: event.fieldRequirements as FieldRequirements | null,
    tableSizeOptions: (event.tableSizeOptions ?? []) as TableSizeOption[],
    maxAssistants: event.maxAssistants ?? 0,
  });
  const answersResult = answersSchema.safeParse(parsedRaw);
  if (!answersResult.success) {
    const first = answersResult.error.issues[0];
    return { error: first?.message ?? "Some answers are invalid." };
  }
  const answers: ApplicationAnswers = answersResult.data;

  // Fetch artist data
  const [[profile], [artistProfile], images] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, profileId)),
    db
      .select()
      .from(artistProfiles)
      .where(eq(artistProfiles.profileId, profileId)),
    db
      .select()
      .from(portfolioImages)
      .where(eq(portfolioImages.profileId, profileId))
      .orderBy(asc(portfolioImages.sortOrder)),
  ]);

  if (!profile || !artistProfile) {
    return { error: "Profile not found" };
  }

  // Validate profile against event requirements
  const fieldRequirements = event.fieldRequirements as FieldRequirements | null;
  const validation = validateProfileForEvent(
    fieldRequirements,
    event.minPortfolioImages,
    profile,
    artistProfile,
    images.length
  );

  if (!validation.valid) {
    return { error: "missing_fields", missingFields: validation.missingFields };
  }

  // Check block-list
  const [blockEntry] = await db
    .select({ id: conventionArtistLists.id })
    .from(conventionArtistLists)
    .where(
      and(
        eq(conventionArtistLists.conventionId, event.conventionId),
        eq(conventionArtistLists.profileId, profileId),
        eq(conventionArtistLists.listType, "block")
      )
    );

  const isBlockListed = !!blockEntry;

  // Build profile snapshot. Snapshot paths are deterministic from
  // (eventId, applicationId, image.id) so we can compute them up
  // front, embed them in the DB row, and copy the bytes after.
  const applicationId = crypto.randomUUID();
  const snapshotImages: SnapshotImage[] = images.map((image) => ({
    id: image.id,
    filename: image.filename,
    storagePath: `snapshots/${eventId}/${applicationId}/${image.id}.webp`,
    width: image.width,
    height: image.height,
    sortOrder: image.sortOrder,
    caption: image.caption ?? null,
  }));

  const profileSnapshot: ProfileSnapshot = {
    displayName: profile.displayName,
    realName: artistProfile.realName,
    pronouns: artistProfile.pronouns,
    contactEmail: artistProfile.contactEmail,
    phone: artistProfile.phone,
    bio: artistProfile.bio,
    websiteUrl: artistProfile.websiteUrl,
    socialLinks: artistProfile.socialLinks,
    helpers: artistProfile.helpers,
    accessibilityNeeds: artistProfile.accessibilityNeeds,
    notes: artistProfile.notes,
    priceRangeMinNok: artistProfile.priceRangeMinNok,
    priceRangeMaxNok: artistProfile.priceRangeMaxNok,
    genres: artistProfile.genres ?? [],
    mediums: artistProfile.mediums ?? [],
    images: snapshotImages,
  };

  // Insert the application row, then copy portfolio image bytes,
  // both inside a single SQL transaction. If any storage.copy throws
  // — or the insert fails for any reason (e.g. duplicate apply) —
  // the transaction rolls back and the row never persists. Already
  // copied snapshot bytes are best-effort cleaned up afterward.
  // Insert-first ordering means we fail fast on a duplicate apply
  // without doing any storage I/O.
  const copiedPaths: string[] = [];
  try {
    await db.transaction(async (tx) => {
      await tx.insert(applications).values({
        id: applicationId,
        eventId,
        profileId,
        profileSnapshot,
        answers,
        guidelinesAcknowledgedAt: new Date(),
        isBlockListed,
      });

      for (const image of images) {
        const snapshotPath = `snapshots/${eventId}/${applicationId}/${image.id}.webp`;
        await storage.copy(image.storagePath, snapshotPath);
        copiedPaths.push(snapshotPath);
      }
    });
  } catch (error: unknown) {
    for (const path of copiedPaths) {
      await storage.delete(path).catch((cleanupError) => {
        console.error("Failed to clean up snapshot image:", cleanupError);
      });
    }
    if (isUniqueViolation(error)) {
      return { error: "You have already applied to this event" };
    }
    console.error("Failed to submit application:", error);
    return { error: "Failed to submit application. Please try again." };
  }

  // Notify the convention organizer of the new application
  try {
    const [convention] = await db
      .select({ organizerId: conventions.organizerId })
      .from(conventions)
      .where(eq(conventions.id, event.conventionId));

    if (convention) {
      await notifyNewApplication(
        convention.organizerId,
        profile.displayName,
        eventId,
        event.name
      );
    }
  } catch (error) {
    console.error("Failed to send new application notification:", error);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
