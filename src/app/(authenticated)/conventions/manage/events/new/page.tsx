import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOrganizerConvention } from "@/lib/conventions/queries";
import { createEvent } from "@/app/(authenticated)/conventions/manage/events/actions";
import { EventForm } from "@/components/conventions/event-form";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

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
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href="/conventions/manage">
          <Button variant="ghost" size="sm">
            &larr; Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Create Event</h1>
      </div>

      <Separator className="my-6" />

      <EventForm action={createEvent} submitLabel="Create Event" />
    </div>
  );
}
