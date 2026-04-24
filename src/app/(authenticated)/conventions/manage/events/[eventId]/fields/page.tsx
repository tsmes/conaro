import { redirect, notFound } from "next/navigation";
import { eq, ne, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { FieldRequirements } from "@/lib/db/schema/events";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { FieldConfigForm } from "@/components/conventions/field-config-form";
import { Card } from "@/components/ui/card";

interface FieldConfigPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function FieldConfigPage({
  params,
}: FieldConfigPageProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    notFound();
  }

  const otherEvents = await db
    .select({
      id: events.id,
      name: events.name,
      fieldRequirements: events.fieldRequirements,
      minPortfolioImages: events.minPortfolioImages,
    })
    .from(events)
    .where(
      and(
        eq(events.conventionId, event.conventionId),
        ne(events.id, eventId)
      )
    );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h2 className="font-heading text-2xl font-bold tracking-tight">
          Field configuration
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Pick which profile fields artists must complete before they can
          apply to this event.
        </p>
      </header>

      <Card className="p-8 md:p-10">
        <FieldConfigForm
          eventId={event.id}
          currentConfig={event.fieldRequirements as FieldRequirements | null}
          minPortfolioImages={event.minPortfolioImages}
          otherEvents={otherEvents.map((e) => ({
            ...e,
            fieldRequirements: e.fieldRequirements as FieldRequirements | null,
          }))}
        />
      </Card>
    </div>
  );
}
