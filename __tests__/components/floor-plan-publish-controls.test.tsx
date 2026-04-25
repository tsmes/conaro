import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { FloorPlanPublishControls } from "@/components/floor-plans/floor-plan-publish-controls";

vi.mock(
  "@/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan/actions",
  () => ({
    publishFloorPlan: vi.fn(),
    unpublishFloorPlan: vi.fn(),
    setFloorPlanAutoPublish: vi.fn(),
  })
);

describe("FloorPlanPublishControls", () => {
  it("disables the publish button and shows a hint when results are not yet published", () => {
    render(
      <FloorPlanPublishControls
        eventId="ev"
        eventStatus="reviewing"
        floorPlanPublishedAt={null}
        floorPlanAutoPublishDaysBefore={null}
      />
    );
    const button = screen.getByRole("button", {
      name: /publish floor plan/i,
    });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/publish results first/i)
    ).toBeInTheDocument();
  });

  it("enables the publish button once results are published", () => {
    render(
      <FloorPlanPublishControls
        eventId="ev"
        eventStatus="results_published"
        floorPlanPublishedAt={null}
        floorPlanAutoPublishDaysBefore={null}
      />
    );
    expect(
      screen.getByRole("button", { name: /publish floor plan/i })
    ).not.toBeDisabled();
  });

  it("shows the unpublish button and the public-since timestamp once published", () => {
    render(
      <FloorPlanPublishControls
        eventId="ev"
        eventStatus="results_published"
        floorPlanPublishedAt={new Date("2026-04-01")}
        floorPlanAutoPublishDaysBefore={null}
      />
    );
    expect(
      screen.getByRole("button", { name: /unpublish/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/public since/i)).toBeInTheDocument();
  });

  it("shows the days-before input when auto-publish is on", () => {
    render(
      <FloorPlanPublishControls
        eventId="ev"
        eventStatus="results_published"
        floorPlanPublishedAt={null}
        floorPlanAutoPublishDaysBefore={3}
      />
    );
    expect(
      screen.getByLabelText(/days before event start/i)
    ).toHaveValue(3);
  });

  it("hides the days-before input when auto-publish is off", () => {
    render(
      <FloorPlanPublishControls
        eventId="ev"
        eventStatus="results_published"
        floorPlanPublishedAt={null}
        floorPlanAutoPublishDaysBefore={null}
      />
    );
    expect(
      screen.queryByLabelText(/days before event start/i)
    ).not.toBeInTheDocument();
  });
});
