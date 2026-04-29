"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import { applications } from "@/lib/db/schema/applications";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import type { FloorPlan } from "@/lib/db/schema/events";
import { type ActionState } from "@/lib/validations/auth";

const vertexSchema = z.object({
  xCm: z.number().int().min(0).max(10000),
  yCm: z.number().int().min(0).max(10000),
});

const roomSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Room name is required").max(60),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  widthCm: z.number().int().min(10).max(10000),
  heightCm: z.number().int().min(10).max(10000),
  // Optional polygon outline drawn inside the canvas rect. A polygon needs
  // at least 3 vertices to enclose any area; we cap at 24 to keep the
  // editor interactions and clamp loops bounded.
  vertices: z.array(vertexSchema).min(3).max(24).optional(),
});

const tableSchema = z.object({
  id: z.string().min(1),
  label: z.string().trim().min(1, "Table label is required").max(10),
  tableSizeOptionId: z.string().min(1),
  roomId: z.string().min(1),
  rotationDeg: z
    .number()
    .finite()
    .transform((n) => ((n % 360) + 360) % 360),
  x: z.number().int().min(0).max(10000),
  y: z.number().int().min(0).max(10000),
  assignedApplicationId: z.string().min(1).nullable(),
});

const labelSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  text: z.string().trim().min(1, "Label text is required").max(40),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  rotationDeg: z.union([
    z.literal(0),
    z.literal(90),
    z.literal(180),
    z.literal(270),
  ]),
});

const planSchema = z.object({
  rooms: z.array(roomSchema).max(50),
  tables: z.array(tableSchema).max(500),
  labels: z.array(labelSchema).max(200).optional(),
});

// Organizer saves the whole floor plan atomically. The action accepts a
// single `floorPlan` form field containing the JSON-stringified plan and
// replaces whatever was stored. Validations go beyond schema shape:
//  - every tableSizeOptionId must reference a size on the event that has
//    both widthCm and depthCm set (planner can't render a sizeless table)
//  - every non-null assignedApplicationId must reference an application
//    owned by this event and currently status=accepted
//  - no two tables may share an assignedApplicationId
export async function saveFloorPlan(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    return { error: "Unauthorized" };
  }

  const eventId = formData.get("eventId")?.toString();
  if (!eventId) return { error: "Event ID is required" };

  const raw = formData.get("floorPlan")?.toString() ?? "";
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "Invalid floor plan payload" };
  }

  const parsed = planSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: "Floor plan validation failed" };
  }
  const plan = parsed.data satisfies FloorPlan;

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) return { error: "Event not found" };

  // Every table and label must live in a room that's part of the same
  // plan.
  const roomIds = new Set(plan.rooms.map((r) => r.id));
  for (const table of plan.tables) {
    if (!roomIds.has(table.roomId)) {
      return {
        error: `Table ${table.label} is not assigned to a room`,
      };
    }
  }
  for (const label of plan.labels ?? []) {
    if (!roomIds.has(label.roomId)) {
      return {
        error: `Label "${label.text}" references an unknown room`,
      };
    }
  }

  // Every referenced tableSizeOptionId must live on this event + have
  // numeric width/depth.
  const sizeById = new Map(
    (event.tableSizeOptions ?? []).map((s) => [s.id, s])
  );
  for (const table of plan.tables) {
    const size = sizeById.get(table.tableSizeOptionId);
    if (!size) {
      return {
        error: `Table ${table.label} references an unknown size`,
      };
    }
    if (typeof size.widthCm !== "number" || typeof size.depthCm !== "number") {
      return {
        error: `Table ${table.label}: size "${size.label}" has no width/depth set`,
      };
    }
  }

  // Every non-null assignedApplicationId must belong to this event and
  // be in accepted status. Duplicates rejected.
  const assignedIds = plan.tables
    .map((t) => t.assignedApplicationId)
    .filter((id): id is string => id !== null);
  const uniqueAssigned = new Set(assignedIds);
  if (uniqueAssigned.size !== assignedIds.length) {
    return { error: "An artist cannot be assigned to more than one table" };
  }
  if (uniqueAssigned.size > 0) {
    const rows = await db
      .select({ id: applications.id, status: applications.status })
      .from(applications)
      .where(
        and(
          inArray(applications.id, Array.from(uniqueAssigned)),
          eq(applications.eventId, eventId)
        )
      );
    const acceptedIds = new Set(
      rows.filter((r) => r.status === "accepted").map((r) => r.id)
    );
    for (const id of uniqueAssigned) {
      if (!acceptedIds.has(id)) {
        return {
          error:
            "One or more assigned artists are not accepted on this event",
        };
      }
    }
  }

  try {
    await db
      .update(events)
      .set({ floorPlan: plan, updatedAt: new Date() })
      .where(eq(events.id, eventId));
  } catch (error) {
    console.error("Failed to save floor plan:", error);
    return { error: "Failed to save floor plan. Please try again." };
  }

  revalidatePath(`/conventions/manage/events/${eventId}`);
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}
