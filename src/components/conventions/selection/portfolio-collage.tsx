/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

interface PortfolioCollageImage {
  id: string;
  url: string;
  caption?: string | null;
}

interface PortfolioCollageProps {
  images: PortfolioCollageImage[];
  displayName: string;
  className?: string;
  onImageClick?: (index: number) => void;
}

interface CollageLayout {
  container: string;
  cellClasses: string[];
}

// Maps image count → grid template + per-cell span classes so the
// collage fills its area cleanly regardless of how many images the
// artist has uploaded. For 7+ images we cap at 6 visible tiles; the
// full set is intended to be reachable via a lightbox.
function getCollageLayout(count: number): CollageLayout {
  switch (count) {
    case 1:
      return {
        container: "grid grid-cols-1 grid-rows-1",
        cellClasses: [""],
      };
    case 2:
      return {
        container: "grid grid-cols-2 grid-rows-1",
        cellClasses: ["", ""],
      };
    case 3:
      return {
        container: "grid grid-cols-2 grid-rows-2",
        cellClasses: ["row-span-2", "", ""],
      };
    case 4:
      return {
        container: "grid grid-cols-2 grid-rows-2",
        cellClasses: ["", "", "", ""],
      };
    case 5:
      return {
        container: "grid grid-cols-3 grid-rows-2",
        cellClasses: ["col-span-2", "", "", "", ""],
      };
    default:
      return {
        container: "grid grid-cols-3 grid-rows-2",
        cellClasses: ["", "", "", "", "", ""],
      };
  }
}

export function PortfolioCollage({
  images,
  displayName,
  className,
  onImageClick,
}: PortfolioCollageProps) {
  const cells = images.slice(0, 6);
  const layout = getCollageLayout(cells.length);

  return (
    <div
      className={cn(
        "relative aspect-[5/4] gap-[2px] bg-muted",
        layout.container,
        className
      )}
    >
      {cells.length === 0 && (
        <div className="grid place-items-center bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          No portfolio
        </div>
      )}
      {cells.map((image, index) => {
        const caption = image.caption?.trim();
        const altText =
          caption && caption.length > 0
            ? caption
            : `Portfolio image ${index + 1} from ${displayName}`;
        const cellSpan = layout.cellClasses[index] ?? "";
        const isHero = cellSpan.includes("col-span-2") || cellSpan.includes("row-span-2");

        const figureBody = (
          <>
            <img
              src={image.url}
              alt={altText}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {caption && caption.length > 0 && (
              <span
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-2 py-1 text-[10px] font-medium leading-tight text-white",
                  isHero && "text-[11px]"
                )}
              >
                {caption}
              </span>
            )}
          </>
        );

        if (onImageClick) {
          return (
            <button
              key={image.id}
              type="button"
              onClick={() => onImageClick(index)}
              aria-label={`Enlarge ${altText}`}
              className={cn(
                "group relative cursor-zoom-in overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                cellSpan
              )}
            >
              {figureBody}
            </button>
          );
        }

        return (
          <figure
            key={image.id}
            className={cn("relative overflow-hidden", cellSpan)}
          >
            {figureBody}
          </figure>
        );
      })}
    </div>
  );
}
