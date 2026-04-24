import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { createEvent } from "@/app/(authenticated)/conventions/manage/events/actions";
import { EventForm } from "@/components/conventions/event-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function NewEventPage() {
  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const convention = await getOrganizerConvention(session.user.profileId);
  if (!convention) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-10 md:px-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link href="/conventions/manage">
              <ArrowLeft className="size-4" />
              Back to workspace
            </Link>
          }
        />
      </div>
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          New event
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
          Create an event
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Draft the event now — you can open applications later from the
          event&apos;s status controls.
        </p>
      </header>
      <Card className="p-8 md:p-10">
        <EventForm action={createEvent} submitLabel="Create event" />
      </Card>
    </div>
  );
}
