"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PortfolioSection } from "@/lib/db/schema/portfolio-images";
import { ImageUploadZone } from "./image-upload-zone";

export interface PortfolioImage {
  id: string;
  filename: string;
  url: string;
  width: number | null;
  height: number | null;
  caption: string | null;
}

interface PortfolioGalleryProps {
  section: PortfolioSection;
  images: PortfolioImage[];
  // Maximum images allowed across ALL sections (shared cap).
  totalCap: number;
  totalUsed: number;
  allowCaption?: boolean;
  captionPlaceholder?: string;
}

const DEFAULT_CAPTION_PLACEHOLDER: Record<PortfolioSection, string> = {
  promo: "Short description (e.g. brand logo, banner)",
  product: "Describe this piece (e.g. A4 giclée print)",
  previous_stand: "Convention name + year (optional)",
};

function SortableImage({
  image,
  onDelete,
  onCaptionChange,
  allowCaption,
  captionPlaceholder,
}: {
  image: PortfolioImage;
  onDelete: (id: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
  allowCaption: boolean;
  captionPlaceholder: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Local draft for the caption. The parent's `image.caption` can
  // change after a save round-trip and Base UI warns when an
  // uncontrolled FieldControl receives a different default after
  // mount — controlling the input here sidesteps that, and the
  // user's typed text remains source-of-truth until blur fires
  // onCaptionChange to push it up.
  const [captionDraft, setCaptionDraft] = useState(image.caption ?? "");

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt={image.filename}
            className="h-full w-full object-cover"
          />
        </div>
        <Button
          variant="destructive"
          size="icon-xs"
          className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(image.id);
          }}
        >
          <span className="sr-only">Delete {image.filename}</span>
          &times;
        </Button>
      </div>
      {allowCaption && (
        <Input
          aria-label={`Caption for ${image.filename}`}
          value={captionDraft}
          onChange={(e) => setCaptionDraft(e.target.value)}
          placeholder={captionPlaceholder}
          className="h-8 text-[12.5px]"
          onBlur={() => onCaptionChange(image.id, captionDraft)}
        />
      )}
    </div>
  );
}

export function PortfolioGallery({
  section,
  images: initialImages,
  totalCap,
  totalUsed,
  allowCaption = false,
  captionPlaceholder,
}: PortfolioGalleryProps) {
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState<string | null>(null);
  // Image to delete when the confirm dialog resolves. null while
  // the dialog is closed.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const resolvedCaptionPlaceholder =
    captionPlaceholder ?? DEFAULT_CAPTION_PLACEHOLDER[section];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sectionUsed = images.length;
  const totalReached = totalUsed + (sectionUsed - initialImages.length);
  const disableUpload = totalReached >= totalCap;

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("section", section);

      const response = await fetch("/api/portfolio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const newImage = await response.json();
      setImages((prev) => [
        ...prev,
        { ...newImage, caption: newImage.caption ?? null },
      ]);
    },
    [section]
  );

  // Tile click → open the confirm dialog. The actual delete runs
  // in `executeDelete` once the user confirms in the dialog.
  const handleDelete = useCallback((imageId: string) => {
    setConfirmDeleteId(imageId);
  }, []);

  const executeDelete = useCallback(async (imageId: string) => {
    setError(null);
    try {
      const response = await fetch("/api/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to delete image");
        return;
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      setError("Failed to delete image. Please try again.");
    }
  }, []);

  const handleCaptionChange = useCallback(
    async (imageId: string, caption: string) => {
      try {
        await fetch("/api/portfolio", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId, caption }),
        });
        setImages((prev) =>
          prev.map((img) =>
            img.id === imageId
              ? { ...img, caption: caption.trim() || null }
              : img
          )
        );
      } catch {
        setError("Failed to save caption.");
      }
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setError(null);
      let reordered: PortfolioImage[] = [];
      setImages((prev) => {
        const oldIndex = prev.findIndex((img) => img.id === active.id);
        const newIndex = prev.findIndex((img) => img.id === over.id);
        reordered = arrayMove(prev, oldIndex, newIndex);
        return reordered;
      });

      fetch("/api/portfolio/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageIds: reordered.map((img) => img.id),
          section,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            setError("Failed to save new order. Please try again.");
            setImages(initialImages);
          }
        })
        .catch(() => {
          setError("Failed to save new order. Please try again.");
          setImages(initialImages);
        });
    },
    [initialImages, section]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {sectionUsed} image{sectionUsed === 1 ? "" : "s"} in this section ·{" "}
        {totalReached} / {totalCap} total. Drag to reorder.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {images.length > 0 && (
        // Explicit id so dnd-kit's internal useUniqueId doesn't
        // produce a different "DndDescribedBy-N" between server and
        // client renders when multiple PortfolioGallery instances
        // mount on the same page (one per section).
        <DndContext
          id={`portfolio-${section}`}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((img) => img.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((image) => (
                <SortableImage
                  key={image.id}
                  image={image}
                  onDelete={handleDelete}
                  onCaptionChange={handleCaptionChange}
                  allowCaption={allowCaption}
                  captionPlaceholder={resolvedCaptionPlaceholder}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ImageUploadZone disabled={disableUpload} onUpload={handleUpload} />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete this image?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirmDeleteId) executeDelete(confirmDeleteId);
        }}
      />
    </div>
  );
}
