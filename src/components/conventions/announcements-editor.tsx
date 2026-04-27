"use client";

import { useActionState, useRef, useState } from "react";
import { Megaphone, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/ui/markdown";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { formatDateNo } from "@/lib/utils/format-date-no";
import {
  createEventAnnouncement,
  deleteEventAnnouncement,
  updateEventAnnouncement,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/announcements/actions";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

export interface AnnouncementListItem {
  id: string;
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AnnouncementsEditorProps {
  eventId: string;
  announcements: AnnouncementListItem[];
}

function isoDate(d: Date): string {
  return formatDateNo(d.toISOString().slice(0, 10));
}

function CreateForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(
    createEventAnnouncement,
    {}
  );
  const [resetKey, setResetKey] = useState(0);

  if (state.success) {
    // Reset the form so the next announcement starts fresh.
    setTimeout(() => setResetKey((k) => k + 1), 0);
  }

  return (
    <form
      key={resetKey}
      action={formAction}
      className="space-y-3 rounded-md border border-border p-4"
    >
      <input type="hidden" name="eventId" value={eventId} />
      {!pending && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {!pending && state.success && (
        <p role="status" className="text-sm text-success">
          Announcement posted. Accepted artists have been notified.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="new-subject" className={LABEL_CLASS}>
          Subject
        </Label>
        <Input
          id="new-subject"
          name="subject"
          placeholder="e.g. Load-in details &amp; on-site contacts"
        />
        {state.fieldErrors?.subject && (
          <p role="alert" className="text-sm text-destructive">
            {state.fieldErrors.subject[0]}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-body" className={LABEL_CLASS}>
          Message
        </Label>
        <RichTextEditor
          id="new-body"
          name="body"
          placeholder="Contact info, logistics, schedule changes, etc."
        />
        {state.fieldErrors?.body && (
          <p role="alert" className="text-sm text-destructive">
            {state.fieldErrors.body[0]}
          </p>
        )}
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Posting\u2026" : "Post announcement"}
        </Button>
      </div>
    </form>
  );
}

function EditRow({
  announcement,
  eventId,
  onDone,
}: {
  announcement: AnnouncementListItem;
  eventId: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateEventAnnouncement,
    {}
  );
  if (state.success) setTimeout(onDone, 0);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="announcementId" value={announcement.id} />
      <Input
        name="subject"
        defaultValue={announcement.subject}
        aria-label="Subject"
      />
      <RichTextEditor name="body" defaultValue={announcement.body} />
      {!pending && state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving\u2026" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDone}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DeleteButton({
  announcement,
  eventId,
}: {
  announcement: AnnouncementListItem;
  eventId: string;
}) {
  const [, formAction, pending] = useActionState(
    deleteEventAnnouncement,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <form ref={formRef} action={formAction}>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="announcementId" value={announcement.id} />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Delete announcement"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this announcement?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </>
  );
}

function AnnouncementRow({
  announcement,
  eventId,
}: {
  announcement: AnnouncementListItem;
  eventId: string;
}) {
  const [editing, setEditing] = useState(false);
  const edited =
    announcement.updatedAt.getTime() - announcement.createdAt.getTime() > 1000;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <EditRow
              announcement={announcement}
              eventId={eventId}
              onDone={() => setEditing(false)}
            />
          ) : (
            <>
              <h3 className="font-heading text-base font-bold leading-tight">
                {announcement.subject}
              </h3>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {isoDate(announcement.createdAt)}
                {edited && " \u00b7 edited"}
              </p>
              <Markdown
                source={announcement.body}
                className="mt-3 text-sm text-foreground"
              />
            </>
          )}
        </div>
        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing(true)}
              aria-label="Edit announcement"
            >
              <Pencil className="size-3.5" />
            </Button>
            <DeleteButton announcement={announcement} eventId={eventId} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function AnnouncementsEditor({
  eventId,
  announcements,
}: AnnouncementsEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Megaphone className="size-4" />
        <span>
          Announcements are visible to accepted artists on the event page and
          trigger an in-app notification when posted.
        </span>
      </div>
      <CreateForm eventId={eventId} />
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map((a) => (
            <AnnouncementRow
              key={a.id}
              announcement={a}
              eventId={eventId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
