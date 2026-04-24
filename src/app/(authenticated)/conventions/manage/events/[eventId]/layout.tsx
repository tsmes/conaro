import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { Button } from "@/components/ui/button";
import { EventTabsNav } from "@/components/conventions/event-tabs-nav";

interface EventLayoutProps {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}

export default async function EventLayout({
  children,
  params,
}: EventLayoutProps) {
  const { eventId } = await params;

  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    notFound();
  }

  const isPublished = event.status === "results_published";

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10 md:px-8">
      <div className="mb-6">
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

      <header className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Event
        </p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight md:text-4xl">
          {event.name}
        </h1>
      </header>

      <div className="mb-8">
        <EventTabsNav
          eventId={event.id}
          showMessaging={isPublished}
          showFloorPlan={isPublished}
        />
      </div>

      {children}
    </div>
  );
}
