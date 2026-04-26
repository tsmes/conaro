"use client";

import { useActionState, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, Upload, X } from "lucide-react";

import { saveGuests } from "@/app/(authenticated)/conventions/manage/events/[eventId]/guests/actions";
import type { Guest } from "@/lib/db/schema/events";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Client-safe URL helper. The storage adapter lives server-side
// (it imports fs/promises for the local backend), so we can't
// import it from a client component without breaking the build.
// Mirrors `LocalStorageAdapter#getUrl`.
function uploadUrl(key: string): string {
  return `/api/uploads/${key}`;
}

interface GuestsEditorProps {
  eventId: string;
  initialGuests: Guest[];
}

interface SocialDraft {
  type: string;
  url: string;
}

interface GuestDraft extends Guest {
  // socialLinks is optional on Guest; the editor materialises an
  // empty array when the guest has none, so the row UI can append.
  socialLinks: SocialDraft[];
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function toDraft(g: Guest): GuestDraft {
  return { ...g, socialLinks: g.socialLinks ?? [] };
}

function toGuest(d: GuestDraft): Guest {
  // Drop empty social rows on serialise so the server doesn't see
  // `{type: "Instagram", url: ""}` ghosts.
  const cleaned = d.socialLinks.filter(
    (s) => s.type.trim().length > 0 && s.url.trim().length > 0
  );
  return { ...d, socialLinks: cleaned.length > 0 ? cleaned : undefined };
}

export function GuestsEditor({
  eventId,
  initialGuests,
}: GuestsEditorProps) {
  const [guests, setGuests] = useState<GuestDraft[]>(() =>
    initialGuests.map(toDraft)
  );
  const [state, formAction, pending] = useActionState(saveGuests, {} as {
    error?: string;
    success?: boolean;
    fieldErrors?: Record<string, string[]>;
  });

  const updateGuest = (index: number, patch: Partial<GuestDraft>) => {
    setGuests((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...patch } : g))
    );
  };

  const moveGuest = (index: number, delta: -1 | 1) => {
    setGuests((prev) => {
      const next = prev.slice();
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeGuest = (index: number) => {
    setGuests((prev) => prev.filter((_, i) => i !== index));
  };

  const addGuest = () => {
    setGuests((prev) => [
      ...prev,
      {
        id: newId(),
        name: "",
        title: "Special guest",
        socialLinks: [],
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
            Guests
          </p>
          <h2 className="mt-1 font-heading text-[18px] font-extrabold tracking-tight">
            Featured guests
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Guests of honour, special speakers, workshop hosts. Each gets
            a card on the public event page.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addGuest}>
          <Plus className="size-4" />
          Add guest
        </Button>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input
          type="hidden"
          name="guests"
          value={JSON.stringify(guests.map(toGuest))}
        />

        {guests.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No guests yet. Add the first one above.
          </p>
        ) : (
          <ol className="space-y-4">
            {guests.map((guest, index) => (
              <li
                key={guest.id}
                className="rounded-md border border-border p-4"
              >
                <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                  <GuestImageField
                    eventId={eventId}
                    imagePath={guest.imagePath}
                    onChange={(imagePath) =>
                      updateGuest(index, { imagePath })
                    }
                  />
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Name"
                        error={fieldError(index, "name")}
                      >
                        <Input
                          type="text"
                          maxLength={200}
                          value={guest.name}
                          onChange={(e) =>
                            updateGuest(index, { name: e.target.value })
                          }
                        />
                      </Field>
                      <Field
                        label="Title (e.g. Guest of honour)"
                        error={fieldError(index, "title")}
                      >
                        <Input
                          type="text"
                          maxLength={80}
                          value={guest.title}
                          onChange={(e) =>
                            updateGuest(index, { title: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Role / origin"
                        error={fieldError(index, "role")}
                      >
                        <Input
                          type="text"
                          maxLength={200}
                          value={guest.role ?? ""}
                          onChange={(e) =>
                            updateGuest(index, {
                              role: e.target.value || undefined,
                            })
                          }
                        />
                      </Field>
                      <Field
                        label="Pronouns"
                        error={fieldError(index, "pronouns")}
                      >
                        <Input
                          type="text"
                          maxLength={40}
                          value={guest.pronouns ?? ""}
                          onChange={(e) =>
                            updateGuest(index, {
                              pronouns: e.target.value || undefined,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <Field
                      label="Bio (markdown, max 4 000 chars)"
                      error={fieldError(index, "bio")}
                    >
                      <Textarea
                        rows={4}
                        maxLength={4000}
                        value={guest.bio ?? ""}
                        onChange={(e) =>
                          updateGuest(index, {
                            bio: e.target.value || undefined,
                          })
                        }
                      />
                    </Field>
                    <Field
                      label="Website URL"
                      error={fieldError(index, "websiteUrl")}
                    >
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        maxLength={500}
                        value={guest.websiteUrl ?? ""}
                        onChange={(e) =>
                          updateGuest(index, {
                            websiteUrl: e.target.value || undefined,
                          })
                        }
                      />
                    </Field>
                    <SocialLinksField
                      links={guest.socialLinks}
                      onChange={(socialLinks) =>
                        updateGuest(index, { socialLinks })
                      }
                    />
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveGuest(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveGuest(index, 1)}
                        disabled={index === guests.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive"
                        onClick={() => removeGuest(index)}
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving..." : "Save guests"}
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

interface GuestImageFieldProps {
  eventId: string;
  imagePath?: string;
  onChange: (imagePath: string | undefined) => void;
}

function GuestImageField({
  eventId,
  imagePath,
  onChange,
}: GuestImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/image`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json()) as
        | { storagePath: string; url: string }
        | { error: string };
      if (!res.ok || !("storagePath" in data)) {
        setError("error" in data ? data.error : "Upload failed");
        return;
      }
      onChange(data.storagePath);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const previewUrl = imagePath ? uploadUrl(imagePath) : null;

  return (
    <div className="space-y-1.5">
      <Label className="text-[11.5px] font-semibold text-muted-foreground">
        Portrait
      </Label>
      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-dashed border-border bg-muted">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Guest portrait"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[11px] text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {uploading ? "Uploading..." : imagePath ? "Replace" : "Upload"}
        </Button>
        {imagePath && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(undefined)}
            className="text-destructive"
          >
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

interface SocialLinksFieldProps {
  links: SocialDraft[];
  onChange: (links: SocialDraft[]) => void;
}

function SocialLinksField({ links, onChange }: SocialLinksFieldProps) {
  const update = (idx: number, patch: Partial<SocialDraft>) =>
    onChange(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const remove = (idx: number) =>
    onChange(links.filter((_, i) => i !== idx));
  const add = () => onChange([...links, { type: "Instagram", url: "" }]);

  return (
    <div className="space-y-1.5">
      <Label className="text-[11.5px] font-semibold text-muted-foreground">
        Social links
      </Label>
      <div className="space-y-2">
        {links.map((link, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              type="text"
              value={link.type}
              onChange={(e) => update(idx, { type: e.target.value })}
              placeholder="Platform"
              className="w-32"
              maxLength={40}
            />
            <Input
              type="url"
              value={link.url}
              onChange={(e) => update(idx, { url: e.target.value })}
              placeholder="https://…"
              maxLength={500}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => remove(idx)}
              aria-label="Remove link"
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={add}>
          <Plus className="size-3.5" />
          Add link
        </Button>
      </div>
    </div>
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
