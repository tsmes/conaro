import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq, ne, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema/events";
import type { FieldRequirements } from "@/lib/db/schema/events";
import {
  getOrganizerConvention,
  getOrganizerEvent,
} from "@/lib/conventions/queries";
import { FieldConfigForm } from "@/components/conventions/field-config-form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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

  const convention = await getOrganizerConvention(session.user.profileId);
  if (!convention) {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    notFound();
  }

  // Fetch other events for the "copy from" feature
  const otherEvents = await db
    .select({
      id: events.id,
      name: events.name,
      fieldRequirements: events.fieldRequirements,
      minPortfolioImages: events.minPortfolioImages,
    })
    .from(events)
    .where(
      and(eq(events.conventionId, convention.id), ne(events.id, eventId))
    );

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href={`/conventions/manage/events/${event.id}`}>
          <Button variant="ghost" size="sm">
            &larr; Back to Event
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Field Configuration</h1>
      </div>
      <p className="mt-1 text-muted-foreground">
        Configure which artist profile fields are required when applying to{" "}
        <strong>{event.name}</strong>.
      </p>

      <Separator className="my-6" />

      <FieldConfigForm
        eventId={event.id}
        currentConfig={event.fieldRequirements as FieldRequirements | null}
        minPortfolioImages={event.minPortfolioImages}
        otherEvents={otherEvents.map((e) => ({
          ...e,
          fieldRequirements: e.fieldRequirements as FieldRequirements | null,
        }))}
      />
    </div>
  );
}
