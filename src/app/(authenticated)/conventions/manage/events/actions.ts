"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { Amenities, TableSizeOption } from "@/lib/db/schema/events";
import { auth } from "@/lib/auth";
import { type ActionState } from "@/lib/validations/auth";
import { eventSchema, type EventInput } from "@/lib/validations/convention";
import {
  getOrganizerConvention,
  getOrganizerEvent,
  buildDefaultFieldRequirements,
} from "@/lib/conventions/queries";
import {
  notifyEventOpened,
  notifyEventPublished,
} from "@/lib/notifications/triggers";

function extractAmenities(data: {
  amenities_electricity: boolean;
  amenities_wifi: boolean;
  amenities_tables: boolean;
  amenities_chairs: boolean;
  amenities_other: string;
}): Amenities {
  return {
    electricity: data.amenities_electricity,
    wifi: data.amenities_wifi,
    tables: data.amenities_tables,
    chairs: data.amenities_chairs,
    other: data.amenities_other,
  };
}

const EVENT_FIELD_NAMES = [
  "name",
  "description",
  "eventStartDate",
  "eventEndDate",
  "applicationOpenDate",
  "applicationCloseDate",
  "venueName",
  "venueAddress",
  "venueCity",
  "venueCountry",
  "mapEmbedUrl",
  "availableStands",
  "tableDimensions",
  "priceInfo",
  "setupTime",
  "teardownTime",
  "amenities_electricity",
  "amenities_wifi",
  "amenities_tables",
  "amenities_chairs",
  "amenities_other",
  "guidelinesOverride",
  "tableSizeOptions",
  "maxAssistants",
  "assistantFeeNok",
] as const;

function extractEventFormData(formData: FormData): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const name of EVENT_FIELD_NAMES) {
    raw[name] = (formData.get(name) ?? "").toString();
  }
  return raw;
}

function buildEventColumns(data: EventInput) {
  return {
    name: data.name,
    description: data.description || null,
    eventStartDate: data.eventStartDate,
    eventEndDate: data.eventEndDate || null,
    applicationOpenDate: data.applicationOpenDate || null,
    applicationCloseDate: data.applicationCloseDate || null,
    venueName: data.venueName || null,
    venueAddress: data.venueAddress || null,
    venueCity: data.venueCity || null,
    venueCountry: data.venueCountry || null,
    mapEmbedUrl: data.mapEmbedUrl || null,
    availableStands: data.availableStands,
    tableDimensions: data.tableDimensions || null,
    priceInfo: data.priceInfo || null,
    setupTime: data.setupTime || null,
    teardownTime: data.teardownTime || null,
    amenities: extractAmenities(data),
    guidelinesOverride: data.guidelinesOverride || null,
    tableSizeOptions: data.tableSizeOptions as TableSizeOption[],
    maxAssistants: data.maxAssistants,
    assistantFeeNok: data.assistantFeeNok,
  };
}

export async function createEvent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const profileId = session.user.profileId;
  if (!profileId) {
    return { error: "Profile not found" };
  }

  const convention = await getOrganizerConvention(profileId);
  if (!convention) {
    return { error: "Convention not found" };
  }

  const raw = extractEventFormData(formData);

  const result = eventSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  try {
    await db.insert(events).values({
      conventionId: convention.id,
      ...buildEventColumns(result.data),
      fieldRequirements: buildDefaultFieldRequirements(),
      minPortfolioImages: 0,
    });
  } catch {
    return { error: "Failed to create event. Please try again." };
  }

  revalidatePath("/conventions/manage");
  return { success: true };
}

export async function updateEvent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const profileId = session.user.profileId;
  if (!profileId) {
    return { error: "Profile not found" };
  }

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) {
    return { error: "Event ID is required" };
  }

  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  const raw = extractEventFormData(formData);

  const result = eventSchema.safeParse(raw);
  if (!result.success) {
    return { fieldErrors: result.error.flatten().fieldErrors };
  }

  try {
    await db
      .update(events)
      .set({
        ...buildEventColumns(result.data),
        updatedAt: new Date(),
      })
      .where(eq(events.id, event.id));
  } catch {
    return { error: "Failed to update event. Please try again." };
  }

  revalidatePath("/conventions/manage");
  revalidatePath(`/conventions/manage/events/${event.id}`);
  return { success: true };
}

export async function openApplications(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const profileId = session.user.profileId;
  if (!profileId) {
    return { error: "Profile not found" };
  }

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) {
    return { error: "Event ID is required" };
  }

  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (event.status !== "published") {
    return { error: "Applications can only be opened for published events. Publish the event first." };
  }

  try {
    await db
      .update(events)
      .set({ status: "accepting_applications", updatedAt: new Date() })
      .where(eq(events.id, event.id));
  } catch {
    return { error: "Failed to open applications. Please try again." };
  }

  // Notify convention followers that applications are now open
  try {
    await notifyEventOpened(event.id, event.name, event.conventionId);
  } catch (error) {
    console.error("Failed to send event opened notifications:", error);
  }

  revalidatePath("/conventions/manage");
  revalidatePath(`/conventions/manage/events/${event.id}`);
  return { success: true };
}

export async function closeApplications(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const profileId = session.user.profileId;
  if (!profileId) {
    return { error: "Profile not found" };
  }

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) {
    return { error: "Event ID is required" };
  }

  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (event.status !== "accepting_applications") {
    return {
      error:
        "Applications can only be closed for events currently accepting applications",
    };
  }

  try {
    await db
      .update(events)
      .set({ status: "reviewing", updatedAt: new Date() })
      .where(eq(events.id, event.id));
  } catch {
    return { error: "Failed to close applications. Please try again." };
  }

  revalidatePath("/conventions/manage");
  revalidatePath(`/conventions/manage/events/${event.id}`);
  return { success: true };
}

export async function publishEvent(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const profileId = session.user.profileId;
  if (!profileId) {
    return { error: "Profile not found" };
  }

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) {
    return { error: "Event ID is required" };
  }

  const event = await getOrganizerEvent(profileId, eventId);
  if (!event) {
    return { error: "Event not found" };
  }

  if (event.status !== "draft") {
    return { error: "Only draft events can be published" };
  }

  if (!event.applicationOpenDate || !event.applicationCloseDate) {
    return {
      error:
        "Both application open date and close date are required before publishing",
    };
  }

  try {
    await db
      .update(events)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(events.id, event.id));
  } catch {
    return { error: "Failed to publish event. Please try again." };
  }

  try {
    await notifyEventPublished(event.id, event.name, event.conventionId);
  } catch (error) {
    console.error("Failed to send event published notifications:", error);
  }

  revalidatePath("/conventions/manage");
  revalidatePath(`/conventions/manage/events/${event.id}`);
  revalidatePath("/events");
  revalidatePath(`/conventions/${event.conventionId}`);
  return { success: true };
}
