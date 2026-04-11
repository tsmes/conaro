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
import { ImageUploadZone } from "./image-upload-zone";

interface PortfolioImage {
  id: string;
  filename: string;
  url: string;
  width: number | null;
  height: number | null;
}

interface PortfolioGalleryProps {
  images: PortfolioImage[];
}

function SortableImage({
  image,
  onDelete,
}: {
  image: PortfolioImage;
  onDelete: (id: string) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
    >
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
  );
}

export function PortfolioGallery({
  images: initialImages,
}: PortfolioGalleryProps) {
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleUpload = useCallback(async (file: File) => {
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/portfolio", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Upload failed");
    }

    const newImage = await response.json();
    setImages((prev) => [...prev, newImage]);
  }, []);

  const handleDelete = useCallback(async (imageId: string) => {
    if (!window.confirm("Delete this image? This cannot be undone.")) return;

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
        body: JSON.stringify({ imageIds: reordered.map((img) => img.id) }),
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
    [initialImages]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {images.length} / 20 images. Drag to reorder.
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <DndContext
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
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ImageUploadZone
        disabled={images.length >= 20}
        onUpload={handleUpload}
      />
    </div>
  );
}
