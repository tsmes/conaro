"use client";

import { useCallback, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

interface BannerUploadProps {
  /** Endpoint that handles POST (multipart `file`) and DELETE. */
  endpoint: string;
  currentBannerUrl: string | null;
  altLabel: string;
  /** Tailwind aspect class for the preview + placeholder, e.g. "aspect-[4/1]". */
  previewAspectClass: string;
  hint: string;
  placeholderHint: string;
}

export function BannerUpload({
  endpoint,
  currentBannerUrl,
  altLabel,
  previewAspectClass,
  hint,
  placeholderHint,
}: BannerUploadProps) {
  const [bannerUrl, setBannerUrl] = useState(currentBannerUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Invalid file type. Accepted: JPEG, PNG, WebP, AVIF");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("File too large. Maximum size is 8 MB");
        return;
      }

      setBusy(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Upload failed");
          return;
        }

        // The server reuses the same storage path on replace, so
        // the URL doesn't change and the browser keeps the cached
        // bytes. Append a per-upload version param so React's
        // <img src> changes and the browser re-fetches.
        setBannerUrl(`${data.url}?v=${Date.now()}`);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setBusy(false);
      }
    },
    [endpoint]
  );

  const handleRemove = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Remove failed");
        return;
      }
      setBannerUrl(null);
    } catch {
      setError("Remove failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, [endpoint]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleUpload]
  );

  return (
    <div className="space-y-3">
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bannerUrl}
          alt={altLabel}
          // Anchor the preview to the top edge — mirrors how the
          // public hero crops the photo so the editor preview
          // accurately reflects what visitors will see.
          className={cn(
            "w-full rounded-lg object-cover object-top",
            previewAspectClass
          )}
        />
      ) : (
        <div
          className={cn(
            "grid w-full place-items-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 px-4 text-center text-[12px] text-muted-foreground",
            previewAspectClass
          )}
        >
          {placeholderHint}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={busy}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {busy
            ? "Working..."
            : bannerUrl
              ? "Replace banner"
              : "Upload banner"}
        </Button>
        {bannerUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={handleRemove}
          >
            <Trash2 className="size-3.5" />
            Remove
          </Button>
        )}
      </div>

      <p className="text-[11.5px] text-muted-foreground">{hint}</p>

      {error && (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
