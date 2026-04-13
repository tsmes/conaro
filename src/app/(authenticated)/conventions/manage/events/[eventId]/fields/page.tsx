import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq, ne, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { FieldRequirements } from "@/lib/db/schema/events";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { FieldConfigForm } from "@/components/conventions/field-config-form";
import { Button } from "@/components/ui/button";
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
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-10 md:px-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={`/conventions/manage/events/${event.id}`}
              className="inline-flex items-center gap-1"
            >
              <ArrowLeft className="size-4" />
              Back to event
            </Link>
          }
        />
      </div>

      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          {event.name}
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
          Field Configuration
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
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
