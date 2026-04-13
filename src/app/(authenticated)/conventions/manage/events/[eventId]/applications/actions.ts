"use server";

import { and, eq, ne, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";
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

  if (event.status !== "reviewing") {
    return { error: "Decisions can only be made while the event is in reviewing status" };
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
  revalidatePath(
    `/conventions/manage/events/${eventId}/applications/${applicationId}`
  );
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

  try {
    await db.transaction(async (tx) => {
      // Set response messages from templates
      if (event.acceptanceMessage) {
        await tx
          .update(applications)
          .set({ responseMessage: event.acceptanceMessage, updatedAt: new Date() })
          .where(
            and(
              eq(applications.eventId, eventId),
              eq(applications.status, "accepted")
            )
          );
      }

      if (event.rejectionMessage) {
        await tx
          .update(applications)
          .set({ responseMessage: event.rejectionMessage, updatedAt: new Date() })
          .where(
            and(
              eq(applications.eventId, eventId),
              eq(applications.status, "rejected")
            )
          );
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
