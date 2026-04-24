"use client";

import dynamic from "next/dynamic";

// Konva requires a real canvas context; never SSR it. Loading skeleton
// keeps layout stable while the chunk arrives.
export const FloorPlanCanvasDynamic = dynamic(
  () =>
    import("./floor-plan-canvas").then((mod) => ({
      default: mod.FloorPlanCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-[3/2] w-full animate-pulse rounded-lg border border-border bg-muted" />
    ),
  }
);
