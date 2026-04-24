import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema/notifications";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { Card } from "@/components/ui/card";

const ARTIST_PREFERENCE_TYPES = [
  {
    type: "event_published",
    label: "Followed convention publishes a new event",
    description:
      "When a convention you follow publishes a new event (before applications open).",
  },
  {
    type: "event_opened",
    label: "Followed convention opens event",
    description:
      "When a convention you follow opens applications for a new event.",
  },
  {
    type: "new_event",
    label: "Any new event opens",
    description: "When any convention opens applications, even ones you don't follow.",
  },
  {
    type: "results_published",
    label: "Application results published",
    description: "When results are published for an event you applied to.",
  },
  {
    type: "application_revoked",
    label: "Application status changes",
    description: "When your application status is changed (e.g., revoked).",
  },
  {
    type: "thread_message_from_organizer",
    label: "Reply from the organizer",
    description:
      "When the organizer replies to your question on an event you've been accepted to.",
  },
];

const ORGANIZER_PREFERENCE_TYPES = [
  {
    type: "new_application",
    label: "New application received",
    description: "When an artist applies to one of your events.",
  },
  {
    type: "thread_message_from_artist",
    label: "New question from an applicant",
    description:
      "When an accepted artist sends you a question about one of your events.",
  },
];

export default async function NotificationPreferencesPage() {
  const session = await auth();
  if (!session?.user?.profileId || !session.user.role) {
    redirect("/login");
  }

  const profileId = session.user.profileId;
  const isArtist = session.user.role === "artist";
  const typeDefinitions = isArtist
    ? ARTIST_PREFERENCE_TYPES
    : ORGANIZER_PREFERENCE_TYPES;

  // Fetch current preferences
  const currentPrefs = await db
    .select({
      notificationType: notificationPreferences.notificationType,
      emailEnabled: notificationPreferences.emailEnabled,
    })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.profileId, profileId));

  const prefMap = new Map<string, boolean>(
    currentPrefs.map((p) => [p.notificationType, p.emailEnabled])
  );

  const types = typeDefinitions.map((t) => ({
    ...t,
    emailEnabled: prefMap.get(t.type) ?? false,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-6 py-10 md:px-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Settings
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight">
          Notifications
        </h1>
        <p className="mt-3 text-muted-foreground">
          Choose which events should arrive in your inbox and by email.
        </p>
      </header>
      <Card className="p-8 md:p-10">
        <NotificationPreferencesForm types={types} />
      </Card>
    </div>
  );
}
