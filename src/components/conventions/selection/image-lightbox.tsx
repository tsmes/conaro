/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface LightboxImage {
  id: string;
  url: string;
  caption?: string | null;
}

interface ImageLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  displayName: string;
}

export function ImageLightbox({
  open,
  onOpenChange,
  images,
  index,
  onIndexChange,
  displayName,
}: ImageLightboxProps) {
  const total = images.length;
  const safeIndex =
    total === 0 ? 0 : Math.min(Math.max(index, 0), total - 1);

  useEffect(() => {
    if (!open || total <= 1) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndexChange(Math.max(0, safeIndex - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndexChange(Math.min(total - 1, safeIndex + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, safeIndex, total, onIndexChange]);

  if (total === 0) return null;
  const image = images[safeIndex];
  const caption = image.caption?.trim();
  const altText =
    caption && caption.length > 0
      ? caption
      : `Portfolio image ${safeIndex + 1} from ${displayName}`;
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < total - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "block w-[min(96vw,80rem)] max-w-none gap-0 bg-black/95 p-0",
          "sm:max-w-none"
        )}
      >
        <DialogTitle className="sr-only">
          {displayName} portfolio — image {safeIndex + 1} of {total}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Use the left and right arrow keys to navigate, or press Escape to close.
        </DialogDescription>

        <div className="relative flex items-center justify-center">
          <img
            src={image.url}
            alt={altText}
            className="block max-h-[85vh] w-auto max-w-full object-contain"
          />

          {total > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onIndexChange(Math.max(0, safeIndex - 1))}
                disabled={!canPrev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="size-6" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onIndexChange(Math.min(total - 1, safeIndex + 1))}
                disabled={!canNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="size-6" />
              </Button>
            </>
          )}

          <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/55 px-2 py-1 font-mono text-xs text-white">
            {safeIndex + 1} / {total}
          </div>
        </div>

        {caption && caption.length > 0 && (
          <div className="border-t border-white/10 px-4 py-3 text-sm text-white/90">
            {caption}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
