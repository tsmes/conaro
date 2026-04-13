import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import type { ProfileSnapshot } from "@/lib/db/schema/applications";
import { events } from "@/lib/db/schema/events";
import { storage } from "@/lib/storage";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { ApplicationDecisionControls } from "@/components/conventions/application-decision-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { styleForStatus } from "@/lib/applications/status-styles";

interface ApplicationDetailPageProps {
  params: Promise<{ eventId: string; applicationId: string }>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
}: ApplicationDetailPageProps) {
  const { eventId, applicationId } = await params;

  const session = await auth();
  if (!session?.user?.profileId || session.user.role !== "organizer") {
    redirect("/login");
  }

  const event = await getOrganizerEvent(session.user.profileId, eventId);
  if (!event) {
    notFound();
  }

  const [application] = await db
    .select()
    .from(applications)
    .where(
      and(eq(applications.id, applicationId), eq(applications.eventId, eventId))
    );

  if (!application) {
    notFound();
  }

  const snapshot = application.profileSnapshot as ProfileSnapshot;

  const snapshotImages = snapshot.images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => ({
      ...img,
      url: storage.getUrl(img.storagePath),
    }));

  const history = await db
    .select({
      id: applications.id,
      status: applications.status,
      createdAt: applications.createdAt,
      eventName: events.name,
      eventId: events.id,
    })
    .from(applications)
    .innerJoin(events, eq(events.id, applications.eventId))
    .where(
      and(
        eq(applications.profileId, application.profileId),
        eq(events.conventionId, event.conventionId)
      )
    );

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-6 py-10 md:px-8">
      <div>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={`/conventions/manage/events/${event.id}/applications`}
              className="inline-flex items-center gap-1"
            >
              <ArrowLeft className="size-4" />
              Back to applications
            </Link>
          }
        />
      </div>

      <header className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Applicant review · {event.name}
        </p>
        <h1 className="font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
          {snapshot.displayName}
        </h1>
      </header>

      <Card className="p-6 md:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Decision
        </p>
        <div className="mt-4">
          <ApplicationDecisionControls
            applicationId={application.id}
            eventId={event.id}
            currentStatus={application.status}
            eventStatus={event.status}
          />
        </div>
      </Card>

      <Card className="p-8 md:p-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Profile snapshot
        </p>
        <h2 className="mt-2 font-heading text-xl font-bold tracking-tight">
          Captured at submission
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Display name">{snapshot.displayName}</Field>
          {snapshot.realName && (
            <Field label="Real name">{snapshot.realName}</Field>
          )}
          {snapshot.contactEmail && (
            <Field label="Email">{snapshot.contactEmail}</Field>
          )}
          {snapshot.phone && <Field label="Phone">{snapshot.phone}</Field>}
          {snapshot.websiteUrl && (
            <Field label="Website">
              <a
                href={snapshot.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline underline-offset-4"
              >
                {snapshot.websiteUrl}
                <ExternalLink className="size-3" />
              </a>
            </Field>
          )}
          {snapshot.socialLinks && (
            <Field label="Social links">{snapshot.socialLinks}</Field>
          )}
          {snapshot.helpers !== null && (
            <Field label="Helpers">{snapshot.helpers}</Field>
          )}
          {snapshot.tableSizePreference && (
            <Field label="Table size preference">
              {snapshot.tableSizePreference}
            </Field>
          )}
          {snapshot.bio && (
            <div className="sm:col-span-2">
              <Field label="Bio">
                <p className="whitespace-pre-line text-muted-foreground">
                  {snapshot.bio}
                </p>
              </Field>
            </div>
          )}
          {snapshot.accessibilityNeeds && (
            <div className="sm:col-span-2">
              <Field label="Accessibility needs">
                {snapshot.accessibilityNeeds}
              </Field>
            </div>
          )}
          {snapshot.notes && (
            <div className="sm:col-span-2">
              <Field label="Notes">{snapshot.notes}</Field>
            </div>
          )}
        </div>
      </Card>

      {snapshotImages.length > 0 && (
        <Card className="p-8 md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Portfolio
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold tracking-tight">
            {snapshotImages.length}{" "}
            {snapshotImages.length === 1 ? "image" : "images"}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {snapshotImages.map((img) => (
              <a
                key={img.id}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-xl"
              >
                <img
                  src={img.url}
                  alt={img.filename}
                  className="aspect-square w-full object-cover transition-transform hover:scale-105"
                />
              </a>
            ))}
          </div>
        </Card>
      )}

      {history.length > 1 && (
        <Card className="p-8 md:p-10">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Convention history
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold tracking-tight">
            {history.length} applications across events
          </h2>
          <div className="mt-6 space-y-2">
            {history.map((h) => {
              const style = styleForStatus(h.status);
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-semibold">{h.eventName}</span>
                    <span className="ml-2 text-muted-foreground">
                      {h.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <Badge variant={style.variant}>{style.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
