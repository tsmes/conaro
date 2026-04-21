"use client";

import Link from "next/link";
import { Compass, LayoutGrid, UserPen, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompletenessIndicator } from "@/components/profile/completeness-indicator";
import { styleForStatus } from "@/lib/applications/status-styles";
import type { CompletenessResult } from "@/lib/profile/completeness";
import { cn } from "@/lib/utils";
import { formatDateNo } from "@/lib/utils/format-date-no";

export interface DashboardApplication {
  id: string;
  status: string;
  eventStatus: string;
  createdAtISO: string; // pre-serialized for client rendering
  eventName: string;
  eventId: string;
  conventionName: string;
}

export interface DashboardFollow {
  id: string;
  conventionId: string;
  conventionName: string;
  conventionLogoUrl: string | null;
}

export interface DashboardViewProps {
  firstName: string;
  unreadNotifications: number;
  completeness: CompletenessResult;
  applications: DashboardApplication[];
  follows: DashboardFollow[];
}

// Collapse the masking logic that used to live inline on the page: while an
// event is in "reviewing" status the artist sees "Under Review" for any
// status other than plain "submitted", so pending decisions aren't leaked
// before the results are published.
function displayStatusFor(app: DashboardApplication) {
  if (app.eventStatus === "reviewing" && app.status !== "submitted") {
    return "under_review";
  }
  return app.status;
}

function formatDate(iso: string): string {
  // Application createdAt is a full ISO timestamp; extract the date component
  // so the Norwegian formatter sees YYYY-MM-DD.
  return formatDateNo(iso.slice(0, 10));
}

function conventionInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return letters || "?";
}

function QuickAction({
  href,
  title,
  description,
  tileClassName,
  Icon,
}: {
  href: string;
  title: string;
  description: string;
  tileClassName: string;
  Icon: typeof Compass;
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
        <h3 className="font-heading text-lg font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </Card>
    </Link>
  );
}

function ApplicationRowDesktop({
  app,
}: {
  app: DashboardApplication;
}) {
  const status = styleForStatus(displayStatusFor(app));
  return (
    <TableRow className="cursor-pointer">
      <TableCell className="py-5">
        <Link href={`/events/${app.eventId}`} className="flex items-center gap-3">
          <Avatar className="size-10 rounded-lg">
            <AvatarFallback className="rounded-lg bg-secondary text-xs font-semibold">
              {conventionInitials(app.conventionName)}
            </AvatarFallback>
          </Avatar>
          <span className="font-semibold">{app.conventionName}</span>
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {app.eventName}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(app.createdAtISO)}
      </TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
    </TableRow>
  );
}

function ApplicationCardMobile({ app }: { app: DashboardApplication }) {
  const status = styleForStatus(displayStatusFor(app));
  return (
    <Link href={`/events/${app.eventId}`} className="block">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="size-10 rounded-lg shrink-0">
              <AvatarFallback className="rounded-lg bg-secondary text-xs font-semibold">
                {conventionInitials(app.conventionName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-semibold text-sm">
                {app.conventionName}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {app.eventName}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {formatDate(app.createdAtISO)}
              </div>
            </div>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </Card>
    </Link>
  );
}

export function DashboardView({
  firstName,
  unreadNotifications,
  completeness,
  applications,
  follows,
}: DashboardViewProps) {
  const subtitle =
    unreadNotifications > 0
      ? `You have ${unreadNotifications} new notification${unreadNotifications === 1 ? "" : "s"} regarding your applications.`
      : "Your creative journey continues.";

  const hasAnything = applications.length > 0 || follows.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-6 py-8 md:px-8">
      {/* Section A — welcome hero + completeness widget */}
      <section className="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Overview
          </p>
          <h1 className="font-heading text-display-md font-extrabold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="max-w-md text-muted-foreground">{subtitle}</p>
        </div>
        <Card className="w-full p-6 md:w-80">
          <CompletenessIndicator completeness={completeness} />
        </Card>
      </section>

      {/* Section B — three quick-action cards */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <QuickAction
          href="/dashboard/profile"
          title="Edit Profile"
          description="Update your artist bio, social links, and contact information."
          tileClassName="bg-secondary-container text-on-secondary-container"
          Icon={UserPen}
        />
        <QuickAction
          href="/dashboard/profile#portfolio"
          title="View Portfolio"
          description="Curate and organize your best work for convention reviewers."
          tileClassName="bg-primary-container text-on-primary-container"
          Icon={LayoutGrid}
        />
        <QuickAction
          href="/events"
          title="Browse Events"
          description="Discover upcoming conventions and application deadlines."
          tileClassName="bg-tertiary-container text-on-tertiary-container"
          Icon={Compass}
        />
      </section>

      {/* Section C — applications */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <h2 className="font-heading text-2xl font-bold tracking-tight">
            My Applications
          </h2>
          {applications.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {applications.length} total
            </span>
          )}
        </div>

        {applications.length === 0 ? (
          <Card className="p-10 text-center">
            <CardContent className="space-y-4">
              <p className="font-heading text-lg font-semibold">
                No applications yet
              </p>
              <p className="text-sm text-muted-foreground">
                Browse the directory to find conventions accepting artist
                applications.
              </p>
              <div className="flex justify-center pt-2">
                <Button
                  nativeButton={false}
                  render={<Link href="/events">Browse Events</Link>}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="hidden overflow-hidden p-0 md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-4 text-[10px] uppercase tracking-wider">
                      Convention
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase tracking-wider">
                      Event
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase tracking-wider">
                      Date Applied
                    </TableHead>
                    <TableHead className="px-6 py-4 text-[10px] uppercase tracking-wider">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <ApplicationRowDesktop key={app.id} app={app} />
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Mobile stacked */}
            <div className="space-y-3 md:hidden">
              {applications.map((app) => (
                <ApplicationCardMobile key={app.id} app={app} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Section D — following */}
      {hasAnything && (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-bold tracking-tight">
            Following
          </h2>
          {follows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Follow conventions from{" "}
              <Link
                href="/conventions"
                className="text-primary underline underline-offset-4"
              >
                the directory
              </Link>{" "}
              to track them here.
            </p>
          ) : (
            <>
              {/* Desktop: horizontal scroll row */}
              <div className="hidden gap-3 overflow-x-auto md:flex">
                {follows.map((f) => (
                  <Link
                    key={f.id}
                    href={`/conventions/${f.conventionId}`}
                    className="shrink-0"
                  >
                    <Card className="flex items-center gap-3 p-3 transition-all hover:bg-surface-bright">
                      <Avatar className="size-10 rounded-lg">
                        {f.conventionLogoUrl && (
                          <AvatarImage src={f.conventionLogoUrl} alt="" />
                        )}
                        <AvatarFallback className="rounded-lg bg-secondary text-xs font-semibold">
                          {conventionInitials(f.conventionName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="pr-2 text-sm font-semibold">
                        {f.conventionName}
                      </span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Card>
                  </Link>
                ))}
              </div>
              {/* Mobile: vertical list */}
              <div className="space-y-2 md:hidden">
                {follows.map((f) => (
                  <Link
                    key={f.id}
                    href={`/conventions/${f.conventionId}`}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted"
                  >
                    <Avatar className="size-8 rounded-lg">
                      {f.conventionLogoUrl && (
                        <AvatarImage src={f.conventionLogoUrl} alt="" />
                      )}
                      <AvatarFallback className="rounded-lg bg-secondary text-[10px] font-semibold">
                        {conventionInitials(f.conventionName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {f.conventionName}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
