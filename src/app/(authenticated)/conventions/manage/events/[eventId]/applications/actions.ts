"use server";

import { and, eq, inArray, ne, count, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { conventions } from "@/lib/db/schema/conventions";
import { applications } from "@/lib/db/schema/applications";
import { profiles } from "@/lib/db/schema/profiles";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import {
  buildTemplateContext,
  renderTemplate,
} from "@/lib/messaging/template";
import {
  notifyResultsPublished,
  notifyApplicationRevoked,
} from "@/lib/notifications/triggers";

export async function setApplicationDecision(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const applicationId = formData.get("applicationId")?.toString();
  const decision = formData.get("decision")?.toString();
  const eventId = formData.get("eventId")?.toString();

  if (!applicationId || !eventId) {
    return { error: "Application ID and Event ID are required" };
  }

  if (decision !== "accepted" && decision !== "rejected") {
    return { error: "Decision must be 'accepted' or 'rejected'" };
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (
    event.status !== "reviewing" &&
    event.status !== "accepting_applications"
  ) {
    return {
      error: "Decisions can only be made before results are published",
    };
  }

  const [application] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(eq(applications.id, applicationId), eq(applications.eventId, eventId))
    );

  if (!application) {
    return { error: "Application not found" };
  }

  await db
    .update(applications)
    .set({ status: decision, updatedAt: new Date() })
    .where(eq(applications.id, applicationId));

  revalidatePath(`/conventions/manage/events/${eventId}/applications`);
  return { success: true };
}

export async function toggleApplicationPin(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const applicationId = formData.get("applicationId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  const pinnedRaw = formData.get("pinned")?.toString();

  if (!applicationId || !eventId) {
    return { error: "Application ID and Event ID are required" };
  }

  if (pinnedRaw !== "true" && pinnedRaw !== "false") {
    return { error: "Pinned must be 'true' or 'false'" };
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (
    event.status !== "reviewing" &&
    event.status !== "accepting_applications"
  ) {
    return {
      error: "Pinning is only available before results are published",
    };
  }

  const [application] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(eq(applications.id, applicationId), eq(applications.eventId, eventId))
    );

  if (!application) {
    return { error: "Application not found" };
  }

  await db
    .update(applications)
    .set({ pinned: pinnedRaw === "true", updatedAt: new Date() })
    .where(eq(applications.id, applicationId));

  revalidatePath(`/conventions/manage/events/${eventId}/applications`);
  return { success: true };
}

export async function setBulkDecision(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const eventId = formData.get("eventId")?.toString();
  const decision = formData.get("decision")?.toString();
  const applicationIds = formData
    .getAll("applicationIds")
    .map((value) => value.toString())
    .filter((value) => value.length > 0);

  if (!eventId) {
    return { error: "Event ID is required" };
  }

  if (decision !== "accepted" && decision !== "rejected") {
    return { error: "Decision must be 'accepted' or 'rejected'" };
  }

  if (applicationIds.length === 0) {
    return { error: "At least one application must be selected" };
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (
    event.status !== "reviewing" &&
    event.status !== "accepting_applications"
  ) {
    return {
      error: "Bulk decisions can only be made before results are published",
    };
  }

  const matching = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.eventId, eventId),
        inArray(applications.id, applicationIds)
      )
    );

  if (matching.length !== applicationIds.length) {
    return { error: "One or more applications do not belong to this event" };
  }

  await db
    .update(applications)
    .set({ status: decision, updatedAt: new Date() })
    .where(
      and(
        eq(applications.eventId, eventId),
        inArray(applications.id, applicationIds)
      )
    );

  revalidatePath(`/conventions/manage/events/${eventId}/applications`);
  return { success: true };
}

export async function publishResults(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) {
    return { error: "Event ID is required" };
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (event.status !== "reviewing") {
    return { error: "Results can only be published for events in reviewing status" };
  }

  // Check for undecided applications
  const [{ value: undecidedCount }] = await db
    .select({ value: count() })
    .from(applications)
    .where(
      and(
        eq(applications.eventId, eventId),
        ne(applications.status, "accepted"),
        ne(applications.status, "rejected")
      )
    );

  if (undecidedCount > 0) {
    return {
      error: `Cannot publish: ${undecidedCount} application(s) still need a decision`,
    };
  }

  // Resolve decision templates: fall back to the convention default when
  // the event hasn't set its own. Also load the organizer-side data the
  // template renderer needs.
  const [convention] = await db
    .select({
      id: conventions.id,
      name: conventions.name,
      organizerId: conventions.organizerId,
      acceptanceMessage: conventions.acceptanceMessage,
      rejectionMessage: conventions.rejectionMessage,
    })
    .from(conventions)
    .where(eq(conventions.id, event.conventionId));

  const resolvedAcceptance =
    event.acceptanceMessage ?? convention?.acceptanceMessage ?? null;
  const resolvedRejection =
    event.rejectionMessage ?? convention?.rejectionMessage ?? null;

  const [organizerProfile] = convention
    ? await db
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, convention.organizerId))
    : [undefined];

  // Pull every accepted/rejected applicant so we can render the resolved
  // template against each one's context (displayName, pronouns, etc.).
  const artistProfileColumns = {
    applicationId: applications.id,
    status: applications.status,
    profileDisplayName: profiles.displayName,
    artistPronouns: artistProfiles.pronouns,
  };

  const decidedApplicants = await db
    .select(artistProfileColumns)
    .from(applications)
    .innerJoin(profiles, eq(profiles.id, applications.profileId))
    .leftJoin(
      artistProfiles,
      eq(artistProfiles.profileId, applications.profileId)
    )
    .where(
      and(
        eq(applications.eventId, eventId),
        or(
          eq(applications.status, "accepted"),
          eq(applications.status, "rejected")
        )
      )
    );

  try {
    await db.transaction(async (tx) => {
      // Render the template per-applicant so placeholders like
      // {{ artist_name }} are substituted with that applicant's data.
      for (const app of decidedApplicants) {
        const template =
          app.status === "accepted" ? resolvedAcceptance : resolvedRejection;
        if (!template) continue;

        const ctx = buildTemplateContext({
          artistDisplayName: app.profileDisplayName,
          artistPronouns: app.artistPronouns ?? null,
          eventName: event.name,
          eventStartDate: event.eventStartDate,
          eventEndDate: event.eventEndDate,
          venueName: event.venueName,
          venueCity: event.venueCity,
          venueCountry: event.venueCountry,
          conventionName: convention?.name ?? "",
          organizerName: organizerProfile?.displayName ?? "",
        });
        const rendered = renderTemplate(template, ctx);

        await tx
          .update(applications)
          .set({ responseMessage: rendered, updatedAt: new Date() })
          .where(eq(applications.id, app.applicationId));
      }

      // Update event status
      await tx
        .update(events)
        .set({ status: "results_published", updatedAt: new Date() })
        .where(eq(events.id, eventId));
    });
  } catch {
    return { error: "Failed to publish results. Please try again." };
  }

  // Notify all applicants
  try {
    await notifyResultsPublished(eventId, event.name);
  } catch (error) {
    console.error("Failed to send results published notifications:", error);
  }

  revalidatePath("/conventions/manage");
  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/conventions/manage/events/${eventId}/applications`);
  return { success: true };
}

export async function confirmPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const applicationId = formData.get("applicationId")?.toString();
  const eventId = formData.get("eventId")?.toString();

  if (!applicationId || !eventId) {
    return { error: "Application ID and Event ID are required" };
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event || event.status !== "results_published") {
    return { error: "Payment can only be confirmed after results are published" };
  }

  const [application] = await db
    .select({ id: applications.id, status: applications.status, paymentConfirmed: applications.paymentConfirmed })
    .from(applications)
    .where(
      and(eq(applications.id, applicationId), eq(applications.eventId, eventId))
    );

  if (!application || application.status !== "accepted") {
    return { error: "Payment can only be confirmed for accepted applications" };
  }

  await db
    .update(applications)
    .set({
      paymentConfirmed: !application.paymentConfirmed,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));

  revalidatePath(`/conventions/manage/events/${eventId}/applications`);
  return { success: true };
}

export async function revokeApplication(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const applicationId = formData.get("applicationId")?.toString();
  const eventId = formData.get("eventId")?.toString();
  const message = formData.get("message")?.toString() ?? "";

  if (!applicationId || !eventId) {
    return { error: "Application ID and Event ID are required" };
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event || event.status !== "results_published") {
    return { error: "Applications can only be revoked after results are published" };
  }

  const [application] = await db
    .select({
      id: applications.id,
      status: applications.status,
      profileId: applications.profileId,
    })
    .from(applications)
    .where(
      and(eq(applications.id, applicationId), eq(applications.eventId, eventId))
    );

  if (!application || application.status !== "accepted") {
    return { error: "Only accepted applications can be revoked" };
  }

  await db
    .update(applications)
    .set({
      status: "revoked",
      responseMessage: message || null,
      updatedAt: new Date(),
    })
    .where(eq(applications.id, applicationId));

  // Notify the affected artist
  try {
    await notifyApplicationRevoked(application.profileId, event.name);
  } catch (error) {
    console.error("Failed to send revocation notification:", error);
  }

  revalidatePath(`/conventions/manage/events/${eventId}/applications`);
  return { success: true };
}

export async function updateResponseTemplates(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) {
    return { error: "Event ID is required" };
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  const acceptanceMessage =
    formData.get("acceptanceMessage")?.toString() ?? "";
  const rejectionMessage =
    formData.get("rejectionMessage")?.toString() ?? "";

  await db
    .update(events)
    .set({
      acceptanceMessage: acceptanceMessage || null,
      rejectionMessage: rejectionMessage || null,
      updatedAt: new Date(),
    })
    .where(eq(events.id, eventId));

  revalidatePath(`/conventions/manage/events/${eventId}/applications`);
  return { success: true };
}
