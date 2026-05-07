"use client";

import { useEffect, useRef, useState } from "react";
import {
  type LayoutModel,
  type Photo,
  StaticPhotoAlbum,
  computeRowsLayout,
} from "react-photo-album";
import "react-photo-album/rows.css";

import { cn } from "@/lib/utils";

type PortfolioPhoto = Photo & { caption: string | null };

interface PortfolioRowsImage {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  caption?: string | null;
}

interface PortfolioRowsProps {
  images: PortfolioRowsImage[];
  displayName: string;
  /**
   * Pixel height the album must fill exactly. Cells are scaled
   * uniformly to hit this height, which means a small amount of
   * `object-cover` cropping when scale ≠ 1.
   */
  containerHeight: number;
  className?: string;
  onImageClick?: (index: number) => void;
}

const SPACING = 2;
const PADDING = 0;
const MAX_ROWS = 5;
const FALLBACK_WIDTH = 600;

function getRowsAlbumHeight(layout: LayoutModel<PortfolioPhoto>): number {
  if (layout.tracks.length === 0) return 0;
  const rowsHeight = layout.tracks.reduce(
    (sum, track) => sum + (track.photos[0]?.height ?? 0),
    0
  );
  return rowsHeight + SPACING * (layout.tracks.length - 1);
}

// Pick the targetRowHeight whose natural album height is closest to
// the desired height — that minimises the scale factor we need to
// apply, which in turn minimises object-cover cropping.
function pickTargetRowHeight(
  photos: PortfolioPhoto[],
  containerWidth: number,
  desiredHeight: number
): number {
  let bestTarget = desiredHeight / 2;
  let bestDiff = Infinity;
  const upperBound = Math.min(MAX_ROWS, photos.length);
  for (let numRows = 1; numRows <= upperBound; numRows += 1) {
    const candidate = (desiredHeight - SPACING * (numRows - 1)) / numRows;
    if (candidate <= 0) continue;
    const layout = computeRowsLayout(
      photos,
      SPACING,
      PADDING,
      containerWidth,
      candidate
    );
    if (!layout) continue;
    const diff = Math.abs(getRowsAlbumHeight(layout) - desiredHeight);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestTarget = candidate;
    }
  }
  return bestTarget;
}

// Uniformly scales every cell's height so the album's total height
// matches `desiredHeight` exactly. Cell widths are unchanged, so each
// row continues to span the container width — only the per-cell aspect
// drifts (which `object-cover` on the rendered <img> compensates for).
function fitLayoutToHeight(
  layout: LayoutModel<PortfolioPhoto>,
  desiredHeight: number
): LayoutModel<PortfolioPhoto> {
  if (layout.tracks.length === 0) return layout;
  const totalSpacing = SPACING * (layout.tracks.length - 1);
  const totalRowHeights = layout.tracks.reduce(
    (sum, track) => sum + (track.photos[0]?.height ?? 0),
    0
  );
  if (totalRowHeights <= 0) return layout;
  const scale = (desiredHeight - totalSpacing) / totalRowHeights;
  if (!Number.isFinite(scale) || scale <= 0) return layout;
  return {
    ...layout,
    tracks: layout.tracks.map((track) => ({
      ...track,
      photos: track.photos.map((cell) => ({
        ...cell,
        height: cell.height * scale,
      })),
    })),
  };
}

export function PortfolioRows({
  images,
  displayName,
  containerHeight,
  className,
  onImageClick,
}: PortfolioRowsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(FALLBACK_WIDTH);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const measure = () => {
      const w = node.clientWidth;
      if (w > 0) setContainerWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (images.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "grid place-items-center bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground",
          className
        )}
        style={{ height: containerHeight || undefined }}
      >
        No portfolio
      </div>
    );
  }

  const photos: PortfolioPhoto[] = images.map((image, index) => {
    const caption = image.caption?.trim() || null;
    return {
      key: image.id,
      src: image.url,
      width: image.width ?? 4,
      height: image.height ?? 3,
      alt: caption || `Portfolio image ${index + 1} from ${displayName}`,
      caption,
    };
  });

  const target = pickTargetRowHeight(photos, containerWidth, containerHeight);
  const naturalLayout = computeRowsLayout(
    photos,
    SPACING,
    PADDING,
    containerWidth,
    target
  );
  const fittedLayout = naturalLayout
    ? fitLayoutToHeight(naturalLayout, containerHeight)
    : undefined;

  return (
    <div ref={containerRef} className={cn("bg-muted", className)}>
      <StaticPhotoAlbum<PortfolioPhoto>
        layout="rows"
        model={fittedLayout}
        onClick={
          onImageClick ? ({ index }) => onImageClick(index) : undefined
        }
        render={{
          // The image's display aspect drifts from its native aspect
          // when we scale heights to fill, so cover-crop instead of
          // letterboxing.
          image: ({ style, ...rest }) => (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              {...rest}
              style={{ ...style, objectFit: "cover" }}
            />
          ),
          extras: (_, { photo }) =>
            photo.caption ? (
              <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-2 py-1 text-[10px] font-medium leading-tight text-white">
                {photo.caption}
              </figcaption>
            ) : null,
        }}
      />
    </div>
  );
}
