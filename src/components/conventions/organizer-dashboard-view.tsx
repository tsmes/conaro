import Link from "next/link";
import {
  ArrowRight,
  Building,
  CalendarPlus,
  ListChecks,
  Megaphone,
  MessageSquare,
  Pencil,
  Plus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ORGANIZER_STATUS_LABELS } from "@/lib/events/status-display";
import { formatDateNo, formatDateRangeNo } from "@/lib/utils/format-date-no";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import { cn } from "@/lib/utils";

export interface DashboardCurrentEvent {
  id: string;
  name: string;
  status: string;
  eventStartDate: string;
  eventEndDate: string | null;
  applicationCount: number;
  acceptedCount: number;
  unreadThreadCount: number;
}

export interface DashboardAnnouncement {
  id: string;
  subject: string;
  eventId: string;
  eventName: string;
  createdAt: Date;
}

export interface DashboardEvent {
  id: string;
  name: string;
  status: string;
  eventStartDate: string;
  eventEndDate: string | null;
  venueCity: string | null;
  venueCountry: string | null;
  availableStands: number | null;
}

export interface OrganizerDashboardViewProps {
  firstName: string;
  conventionName: string;
  currentEvent: DashboardCurrentEvent | null;
  recentAnnouncements: DashboardAnnouncement[];
  events: DashboardEvent[];
}

function QuickAction({
  href,
  title,
  description,
  Icon,
  tileClassName,
}: {
  href: string;
  title: string;
  description: string;
  Icon: typeof Pencil;
  tileClassName: string;
}) {
  return (
    <Link href={href} className="block">
      <Card interactive className="h-full p-8">
        <div
          className={cn(
            "mb-6 flex size-12 items-center justify-center rounded-xl transition-transform group-hover/card:scale-110",
            tileClassName
          )}
        >
          <Icon className="size-6" />
        </div>
        <h3 className="font-heading text-lg font-bold tracking-tight">
          {title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </Card>
    </Link>
  );
}

function CurrentEventCard({ event }: { event: DashboardCurrentEvent }) {
  const statusLabel =
    ORGANIZER_STATUS_LABELS[event.status] ?? {
      label: event.status,
      variant: "secondary" as const,
    };
  return (
    <Card className="p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Current event
          </p>
          <h2 className="font-heading text-2xl font-bold tracking-tight">
            {event.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatDateRangeNo(event.eventStartDate, event.eventEndDate)}
          </p>
        </div>
        <Badge variant={statusLabel.variant}>{statusLabel.label}</Badge>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 rounded-[12px] bg-muted p-3">
        <Stat label="Applications" value={event.applicationCount} />
        <Stat label="Accepted" value={event.acceptedCount} />
        <Stat label="Unread" value={event.unreadThreadCount} accent />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={`/conventions/manage/events/${event.id}/applications`}
            >
              <ListChecks className="size-4" />
              Review applications
            </Link>
          }
        />
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link href={`/conventions/manage/events/${event.id}`}>
              Event settings
              <ArrowRight className="size-4" />
            </Link>
          }
        />
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "font-mono text-xl font-semibold tabular-nums",
          accent && value > 0 && "text-primary"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function NoCurrentEventCard() {
  return (
    <Card className="p-8 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Current event
      </p>
      <p className="mt-3 font-heading text-xl font-semibold">
        No upcoming event
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Once you create an event, its status + inbox will appear here.
      </p>
      <div className="mt-6 flex justify-center">
        <Button
          nativeButton={false}
          render={
            <Link href="/conventions/manage/events/new">
              <Plus className="size-4" />
              Create event
            </Link>
          }
        />
      </div>
    </Card>
  );
}

function MessagesWidget({
  announcements,
  currentUnread,
  currentEventId,
}: {
  announcements: DashboardAnnouncement[];
  currentUnread: number;
  currentEventId: string | null;
}) {
  if (announcements.length === 0 && currentUnread === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-2xl font-bold tracking-tight">
        Messages
      </h2>
      {currentUnread > 0 && currentEventId && (
        <Link
          href={`/conventions/manage/events/${currentEventId}#questions-from-artists`}
          className="block"
        >
          <Card
            interactive
            className="flex items-center gap-3 p-4"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
              <MessageSquare className="size-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">
                {currentUnread} new question{currentUnread === 1 ? "" : "s"} from
                artists
              </p>
              <p className="text-xs text-muted-foreground">
                Open the current event&apos;s inbox to reply.
              </p>
            </div>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Card>
        </Link>
      )}
      {announcements.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Recent announcements you&apos;ve posted
          </p>
          <ul className="space-y-2">
            {announcements.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/conventions/manage/events/${a.eventId}`}
                  className="block"
                >
                  <Card
                    interactive
                    className="flex items-start gap-3 p-4"
                  >
                    <Megaphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{a.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        Posted to {a.eventName}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {formatRelativeTime(a.createdAt)}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EventListItem({ event }: { event: DashboardEvent }) {
  const statusLabel =
    ORGANIZER_STATUS_LABELS[event.status] ?? {
      label: event.status,
      variant: "secondary" as const,
    };
  return (
    <Link href={`/conventions/manage/events/${event.id}`} className="block">
      <Card interactive className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="font-heading text-base font-bold tracking-tight">
              {event.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {formatDateRangeNo(event.eventStartDate, event.eventEndDate)}
              {event.venueCity || event.venueCountry
                ? ` · ${[event.venueCity, event.venueCountry]
                    .filter(Boolean)
                    .join(", ")}`
                : ""}
              {event.availableStands
                ? ` · ${event.availableStands} stand${
                    event.availableStands === 1 ? "" : "s"
                  }`
                : ""}
            </p>
          </div>
          <Badge variant={statusLabel.variant}>{statusLabel.label}</Badge>
        </div>
      </Card>
    </Link>
  );
}

export function OrganizerDashboardView({
  firstName,
  conventionName,
  currentEvent,
  recentAnnouncements,
  events,
}: OrganizerDashboardViewProps) {
  void formatDateNo;
  return (
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-10 md:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Overview
          </p>
          <h1 className="font-heading text-display-md font-extrabold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="max-w-md text-muted-foreground">
            {conventionName}
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link href="/conventions/manage/edit">
              <Pencil className="size-4" />
              Edit convention
            </Link>
          }
        />
      </section>

      {/* Current event / empty state */}
      {currentEvent ? (
        <CurrentEventCard event={currentEvent} />
      ) : (
        <NoCurrentEventCard />
      )}

      {/* Messages widget */}
      <MessagesWidget
        announcements={recentAnnouncements}
        currentUnread={currentEvent?.unreadThreadCount ?? 0}
        currentEventId={currentEvent?.id ?? null}
      />

      {/* Quick actions */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <QuickAction
          href="/conventions/manage/edit"
          title="Edit convention"
          description="Update description, guidelines, and default messaging."
          Icon={Building}
          tileClassName="bg-primary-container text-on-primary-container"
        />
        <QuickAction
          href="/conventions/manage/events/new"
          title="Create event"
          description="Spin up a new event and open applications when ready."
          Icon={CalendarPlus}
          tileClassName="bg-secondary-container text-on-secondary-container"
        />
        <QuickAction
          href="/conventions/manage/lists"
          title="Manage lists"
          description="Block-list repeat no-shows or curate your recurring invites."
          Icon={Users}
          tileClassName="bg-tertiary-container text-on-tertiary-container"
        />
      </section>

      {/* All events */}
      {events.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-2xl font-bold tracking-tight">
            All events
          </h2>
          <div className="space-y-3">
            {events.map((e) => (
              <EventListItem key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
