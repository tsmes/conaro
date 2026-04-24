"use client";

import { useActionState, useState } from "react";
import {
  replyToThread,
  markThreadReadAsOrganizer,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/thread-actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ThreadDialogMessage {
  id: string;
  body: string;
  authorIsArtist: boolean;
  createdAt: Date;
}

interface ThreadDialogContentsProps {
  eventId: string;
  threadId: string;
  artistDisplayName: string;
  messages: ThreadDialogMessage[];
  onClose: () => void;
}

function formatTime(date: Date): string {
  const iso = typeof date === "string" ? date : date.toISOString();
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function ThreadDialogContents({
  eventId,
  threadId,
  artistDisplayName,
  messages,
  onClose,
}: ThreadDialogContentsProps) {
  const [state, formAction, pending] = useActionState(replyToThread, {});
  const [alsoAsAnnouncement, setAlsoAsAnnouncement] = useState(false);

  // Mark the thread read on mount so the inbox row's unread dot clears
  // on the next render. Fire-and-forget — if it fails, the indicator
  // just stays until the next successful read, which is harmless.
  if (typeof window !== "undefined") {
    const fd = new FormData();
    fd.set("threadId", threadId);
    fd.set("eventId", eventId);
    markThreadReadAsOrganizer({}, fd).catch(() => {});
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{artistDisplayName}</DialogTitle>
        <DialogDescription>
          Private Q&A between you and this accepted artist.
        </DialogDescription>
      </DialogHeader>

      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages yet.
        </p>
      ) : (
        <ul className="max-h-[40vh] space-y-3 overflow-y-auto">
          {messages.map((m) => (
            <li
              key={m.id}
              className={
                m.authorIsArtist
                  ? "rounded-lg bg-secondary p-3"
                  : "rounded-lg bg-primary/5 p-3"
              }
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <span className="font-semibold">
                  {m.authorIsArtist ? artistDisplayName : "You"}
                </span>
                <span className="font-mono">{formatTime(m.createdAt)}</span>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {m.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="threadId" value={threadId} />

        <div className="space-y-2">
          <Label
            htmlFor="reply-body"
            className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
          >
            Your reply
          </Label>
          <Textarea
            id="reply-body"
            name="body"
            rows={4}
            placeholder="Type your reply…"
            aria-invalid={!!state.fieldErrors?.body}
          />
          {state.fieldErrors?.body && (
            <p role="alert" className="text-sm text-destructive">
              {state.fieldErrors.body[0]}
            </p>
          )}
        </div>

        <div className="flex items-start gap-3 rounded-md border border-border p-3">
          <Checkbox
            id="alsoAsAnnouncement"
            name="alsoAsAnnouncement"
            value="on"
            checked={alsoAsAnnouncement}
            onCheckedChange={(v) => setAlsoAsAnnouncement(v === true)}
          />
          <div className="space-y-2">
            <Label htmlFor="alsoAsAnnouncement">
              Also post this reply as an announcement
            </Label>
            <p className="text-xs text-muted-foreground">
              Posts the same body as a new announcement visible to all
              accepted artists. Useful when multiple people ask the same
              question.
            </p>
            {alsoAsAnnouncement && (
              <div className="pt-1">
                <Label
                  htmlFor="announcementSubject"
                  className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  Announcement subject
                </Label>
                <Input
                  id="announcementSubject"
                  name="announcementSubject"
                  placeholder="e.g. Move-in time confirmed"
                  aria-invalid={!!state.fieldErrors?.announcementSubject}
                  className="mt-1"
                />
                {state.fieldErrors?.announcementSubject && (
                  <p role="alert" className="mt-1 text-sm text-destructive">
                    {state.fieldErrors.announcementSubject[0]}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Sending…" : "Send reply"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
