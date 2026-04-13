import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { applications } from "@/lib/db/schema/applications";
import type { ProfileSnapshot } from "@/lib/db/schema/applications";
import { events } from "@/lib/db/schema/events";
import { conventions } from "@/lib/db/schema/conventions";
import { storage } from "@/lib/storage";
import { getOrganizerEvent } from "@/lib/conventions/queries";
import { ApplicationDecisionControls } from "@/components/conventions/application-decision-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ApplicationDetailPageProps {
  params: Promise<{ eventId: string; applicationId: string }>;
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

  // Resolve snapshot image URLs
  const snapshotImages = snapshot.images
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => ({
      ...img,
      url: storage.getUrl(img.storagePath),
    }));

  // Application history: this artist's applications across this convention's events
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
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-4">
        <Link href={`/conventions/manage/events/${event.id}/applications`}>
          <Button variant="ghost" size="sm">
            &larr; Back to Applications
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{snapshot.displayName}</h1>
      </div>

      <div className="mt-4">
        <ApplicationDecisionControls
          applicationId={application.id}
          eventId={event.id}
          currentStatus={application.status}
          eventStatus={event.status}
        />
      </div>

      <Separator className="my-6" />

      {/* Profile Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <span className="font-medium">Display Name: </span>
            {snapshot.displayName}
          </div>
          {snapshot.realName && (
            <div>
              <span className="font-medium">Real Name: </span>
              {snapshot.realName}
            </div>
          )}
          {snapshot.contactEmail && (
            <div>
              <span className="font-medium">Email: </span>
              {snapshot.contactEmail}
            </div>
          )}
          {snapshot.phone && (
            <div>
              <span className="font-medium">Phone: </span>
              {snapshot.phone}
            </div>
          )}
          {snapshot.bio && (
            <div className="sm:col-span-2">
              <span className="font-medium">Bio: </span>
              <p className="mt-1 whitespace-pre-line text-muted-foreground">
                {snapshot.bio}
              </p>
            </div>
          )}
          {snapshot.websiteUrl && (
            <div>
              <span className="font-medium">Website: </span>
              <a
                href={snapshot.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-4"
              >
                {snapshot.websiteUrl}
              </a>
            </div>
          )}
          {snapshot.socialLinks && (
            <div>
              <span className="font-medium">Social Links: </span>
              {snapshot.socialLinks}
            </div>
          )}
          {snapshot.helpers !== null && (
            <div>
              <span className="font-medium">Helpers: </span>
              {snapshot.helpers}
            </div>
          )}
          {snapshot.accessibilityNeeds && (
            <div className="sm:col-span-2">
              <span className="font-medium">Accessibility Needs: </span>
              {snapshot.accessibilityNeeds}
            </div>
          )}
          {snapshot.tableSizePreference && (
            <div>
              <span className="font-medium">Table Size Preference: </span>
              {snapshot.tableSizePreference}
            </div>
          )}
          {snapshot.notes && (
            <div className="sm:col-span-2">
              <span className="font-medium">Notes: </span>
              {snapshot.notes}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Gallery */}
      {snapshotImages.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              Portfolio ({snapshotImages.length} images)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {snapshotImages.map((img) => (
                <a
                  key={img.id}
                  href={img.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={img.url}
                    alt={img.filename}
                    className="aspect-square w-full rounded-md object-cover transition-opacity hover:opacity-80"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application History */}
      {history.length > 1 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">
              Convention History ({history.length} applications)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-medium">{h.eventName}</span>
                    <span className="ml-2 text-muted-foreground">
                      {h.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </div>
                  <Badge
                    variant={
                      h.status === "accepted"
                        ? "default"
                        : h.status === "rejected" || h.status === "revoked"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {h.status === "submitted"
                      ? "Pending"
                      : h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
