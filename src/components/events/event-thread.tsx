"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  sendThreadMessage,
  markThreadReadAsArtist,
} from "@/app/(public)/events/[eventId]/thread-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface EventThreadMessageView {
  id: string;
  body: string;
  authorIsArtist: boolean;
  createdAt: Date;
}

interface EventThreadProps {
  eventId: string;
  threadId: string | null;
  messages: EventThreadMessageView[];
  hasUnreadFromOrganizer: boolean;
}

function formatTime(date: Date): string {
  const iso = typeof date === "string" ? date : date.toISOString();
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function EventThread({
  eventId,
  threadId,
  messages,
  hasUnreadFromOrganizer,
}: EventThreadProps) {
  const [state, formAction, pending] = useActionState(sendThreadMessage, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the textarea after a successful send so the artist can follow up
  // without deleting their last message.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  // When the artist opens the event page with a thread that has unread
  // organizer messages, stamp artistLastReadAt server-side so the unread
  // indicator clears on the next render. Fire-and-forget.
  useEffect(() => {
    if (!threadId || !hasUnreadFromOrganizer) return;
    const fd = new FormData();
    fd.set("threadId", threadId);
    markThreadReadAsArtist({}, fd).catch((err) => {
      console.error("Failed to mark thread as read:", err);
    });
  }, [threadId, hasUnreadFromOrganizer]);

  return (
    <div id="thread" className="mt-5 border-t border-border pt-5 scroll-mt-20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Chat with the organizer
        </p>
        {hasUnreadFromOrganizer && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
            New reply
          </span>
        )}
      </div>

      {messages.length > 0 && (
        <ul className="space-y-3">
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
                  {m.authorIsArtist ? "You" : "Organizer"}
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

      <form ref={formRef} action={formAction} className="mt-4 space-y-2">
        <input type="hidden" name="eventId" value={eventId} />
        <label
          htmlFor="thread-body"
          className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          {messages.length === 0 ? "Ask the organizer" : "Send another message"}
        </label>
        <Textarea
          id="thread-body"
          name="body"
          rows={3}
          placeholder="Type your question…"
          aria-invalid={!!state.fieldErrors?.body}
          aria-describedby={
            state.fieldErrors?.body ? "thread-body-error" : undefined
          }
        />
        {state.fieldErrors?.body && (
          <p
            id="thread-body-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {state.fieldErrors.body[0]}
          </p>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </div>
  );
}
