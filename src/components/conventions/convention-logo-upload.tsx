"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

interface ConventionLogoUploadProps {
  currentLogoUrl: string | null;
  conventionName: string;
}

export function ConventionLogoUpload({
  currentLogoUrl,
  conventionName,
}: ConventionLogoUploadProps) {
  const [logoUrl, setLogoUrl] = useState(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid file type. Accepted: JPEG, PNG, WebP, AVIF");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File too large. Maximum size is 5 MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/conventions/logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }

      // The server reuses the same storage path on replace, so the
      // URL doesn't change and the browser keeps the cached bytes.
      // Append a per-upload version param so the <img src> changes
      // and the browser re-fetches.
      setLogoUrl(`${data.url}?v=${Date.now()}`);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleUpload]
  );

  return (
    <div className="space-y-4">
      {logoUrl && (
        <div>
          <img
            src={logoUrl}
            alt={`${conventionName} logo`}
            className="h-32 w-auto rounded-lg object-contain"
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading
          ? "Uploading..."
          : logoUrl
            ? "Replace Logo"
            : "Upload Logo"}
      </Button>

      <p className="text-xs text-muted-foreground">
        JPEG, PNG, WebP, or AVIF. Max 5 MB.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
