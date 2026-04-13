import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema/notifications";
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { Separator } from "@/components/ui/separator";

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
];

const ORGANIZER_PREFERENCE_TYPES = [
  {
    type: "new_application",
    label: "New application received",
    description: "When an artist applies to one of your events.",
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
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Notification Settings</h1>
      <p className="mt-2 text-muted-foreground">
        Choose how you want to be notified.
      </p>

      <Separator className="my-6" />

      <NotificationPreferencesForm types={types} />
    </div>
  );
}
