"use client";

import { useCallback, useRef, useState } from "react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ImageUploadZoneProps {
  disabled: boolean;
  onUpload: (file: File) => Promise<void>;
}

export function ImageUploadZone({ disabled, onUpload }: ImageUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = useCallback(
    async (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Invalid file type. Accepted: JPEG, PNG, WebP");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("File too large. Maximum size is 10 MB");
        return;
      }

      setUploading(true);
      try {
        await onUpload(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled || uploading) return;

      const file = e.dataTransfer.files[0];
      if (file) validateAndUpload(file);
    },
    [disabled, uploading, validateAndUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndUpload(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [validateAndUpload]
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-label="Upload image"
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onKeyDown={(e) => {
          if (
            (e.key === "Enter" || e.key === " ") &&
            !disabled &&
            !uploading
          ) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        } ${disabled || uploading ? "opacity-50" : "cursor-pointer"}`}
        onClick={() => {
          if (!disabled && !uploading) inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
        {uploading ? (
          <p className="text-sm text-muted-foreground">Uploading...</p>
        ) : disabled ? (
          <p className="text-sm text-muted-foreground">
            Maximum of 20 images reached
          </p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Drop an image here or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, or WebP up to 10 MB
            </p>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
