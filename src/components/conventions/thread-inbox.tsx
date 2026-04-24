"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils/format-relative-time";
import {
  ThreadDialogContents,
  type ThreadDialogMessage,
} from "./thread-dialog-contents";

export interface InboxThreadRow {
  threadId: string;
  artistProfileId: string;
  artistDisplayName: string;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  unreadForOrganizer: boolean;
  messages: ThreadDialogMessage[];
}

interface ThreadInboxProps {
  eventId: string;
  threads: InboxThreadRow[];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function ThreadInbox({ eventId, threads }: ThreadInboxProps) {
  if (threads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No questions yet. Artists can message you once they&apos;ve been
        accepted.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {threads.map((t) => (
        <InboxRow key={t.threadId} eventId={eventId} row={t} />
      ))}
    </ul>
  );
}

function InboxRow({
  eventId,
  row,
}: {
  eventId: string;
  row: InboxThreadRow;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <button
              type="button"
              id={`thread-${row.artistProfileId}`}
              className="flex w-full items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-muted/50"
            />
          }
        >
          <Avatar className="size-10 shrink-0">
            <AvatarFallback className="bg-secondary text-xs font-semibold">
              {initialsOf(row.artistDisplayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">
                {row.artistDisplayName}
              </span>
              {row.unreadForOrganizer && (
                <span
                  aria-label="Unread"
                  className="inline-block size-2 shrink-0 rounded-full bg-primary"
                />
              )}
            </div>
            {row.lastMessagePreview && (
              <p className="truncate text-sm text-muted-foreground">
                {row.lastMessagePreview}
              </p>
            )}
          </div>
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {formatRelativeTime(row.lastMessageAt)}
          </span>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <ThreadDialogContents
            eventId={eventId}
            threadId={row.threadId}
            artistDisplayName={row.artistDisplayName}
            messages={row.messages}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </li>
  );
}
