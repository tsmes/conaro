import type { FloorPlan } from "@/lib/db/schema/events";

/**
 * Return the plan with any table assigned to `applicationId` unassigned,
 * plus whether anything changed. Used to keep floor-plan assignments
 * referentially consistent when an application leaves `accepted` status
 * (e.g. revocation), so the stored plan never retains a dead reference.
 *
 * `changed` lets callers skip a no-op DB write when the application was
 * never assigned to a table.
 */
export function unassignApplicationFromPlan(
  plan: FloorPlan,
  applicationId: string
): { plan: FloorPlan; changed: boolean } {
  let changed = false;
  const tables = plan.tables.map((table) => {
    if (table.assignedApplicationId === applicationId) {
      changed = true;
      return { ...table, assignedApplicationId: null };
    }
    return table;
  });
  return { plan: changed ? { ...plan, tables } : plan, changed };
}
