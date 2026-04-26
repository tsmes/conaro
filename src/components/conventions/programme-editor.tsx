"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { saveProgramme } from "@/app/(authenticated)/conventions/manage/events/[eventId]/programme/actions";
import type { ProgrammeItem } from "@/lib/db/schema/events";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ProgrammeEditorProps {
  eventId: string;
  initialItems: ProgrammeItem[];
  eventStartDate: string;
  eventEndDate: string | null;
}

interface DraftItem extends ProgrammeItem {
  // Local UUID assigned on first add; survives the round-trip so
  // server fieldErrors keyed on `<index>.<field>` still map back.
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function ProgrammeEditor({
  eventId,
  initialItems,
  eventStartDate,
  eventEndDate,
}: ProgrammeEditorProps) {
  const [items, setItems] = useState<DraftItem[]>(() =>
    initialItems.map((item) => ({ ...item }))
  );
  const [state, formAction, pending] = useActionState(saveProgramme, {} as {
    error?: string;
    success?: boolean;
    fieldErrors?: Record<string, string[]>;
  });

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const moveItem = (index: number, delta: -1 | 1) => {
    setItems((prev) => {
      const next = prev.slice();
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: newId(),
        date: eventStartDate,
        startTime: "10:00",
        title: "",
      },
    ]);
  };

  const fieldError = (index: number, field: string): string | undefined =>
    state.fieldErrors?.[`${index}.${field}`]?.[0];

  return (
    <Card className="space-y-4 p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-primary">
            Programme
          </p>
          <h2 className="mt-1 font-heading text-[18px] font-extrabold tracking-tight">
            Schedule for {eventStartDate}
            {eventEndDate && eventEndDate !== eventStartDate
              ? ` – ${eventEndDate}`
              : ""}
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Add panels, workshops, signings — anything happening at a
            specific time and stage.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
        >
          <Plus className="size-4" />
          Add item
        </Button>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input
          type="hidden"
          name="programme"
          value={JSON.stringify(items)}
        />

        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No programme items yet. Add the first one above.
          </p>
        ) : (
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="rounded-md border border-border p-4"
              >
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
                  <Field
                    label="Date"
                    error={fieldError(index, "date")}
                  >
                    <Input
                      type="date"
                      min={eventStartDate}
                      max={eventEndDate ?? eventStartDate}
                      value={item.date}
                      onChange={(e) =>
                        updateItem(index, { date: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Start time (HH:mm)"
                    error={fieldError(index, "startTime")}
                  >
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="10:00"
                      pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                      maxLength={5}
                      value={item.startTime}
                      onChange={(e) =>
                        updateItem(index, { startTime: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="End time (HH:mm, optional)"
                    error={fieldError(index, "endTime")}
                  >
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="11:00"
                      pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
                      maxLength={5}
                      value={item.endTime ?? ""}
                      onChange={(e) =>
                        updateItem(index, {
                          endTime: e.target.value || undefined,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
                  <Field
                    label="Title"
                    error={fieldError(index, "title")}
                  >
                    <Input
                      type="text"
                      maxLength={200}
                      value={item.title}
                      onChange={(e) =>
                        updateItem(index, { title: e.target.value })
                      }
                    />
                  </Field>
                  <Field
                    label="Room / stage"
                    error={fieldError(index, "room")}
                  >
                    <Input
                      type="text"
                      maxLength={80}
                      value={item.room ?? ""}
                      onChange={(e) =>
                        updateItem(index, {
                          room: e.target.value || undefined,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Field
                    label="Speaker / host (optional)"
                    error={fieldError(index, "speaker")}
                  >
                    <Input
                      type="text"
                      maxLength={200}
                      value={item.speaker ?? ""}
                      onChange={(e) =>
                        updateItem(index, {
                          speaker: e.target.value || undefined,
                        })
                      }
                    />
                  </Field>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive"
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving..." : "Save programme"}
          </Button>
          {state.success && (
            <span className="text-xs text-muted-foreground">Saved.</span>
          )}
          {state.error && (
            <span className="text-xs text-destructive">{state.error}</span>
          )}
        </div>
      </form>
    </Card>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11.5px] font-semibold text-muted-foreground">
        {label}
      </Label>
      <div className={cn(error && "[&>*]:border-destructive")}>{children}</div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
