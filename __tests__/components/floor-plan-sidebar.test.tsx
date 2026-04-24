import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FloorPlanSidebar } from "@/components/floor-plans/floor-plan-sidebar";
import type { FloorPlan, TableSizeOption } from "@/lib/db/schema/events";

function sizedOption(
  overrides: Partial<TableSizeOption> = {}
): TableSizeOption {
  return {
    id: "ts-std",
    label: "Standard",
    dimensions: "120x80 cm",
    priceNok: 1200,
    widthCm: 120,
    depthCm: 80,
    ...overrides,
  };
}

function sizelessOption(
  overrides: Partial<TableSizeOption> = {}
): TableSizeOption {
  return {
    id: "ts-nodims",
    label: "Corner",
    dimensions: "",
    priceNok: null,
    ...overrides,
  };
}

const emptyPlan: FloorPlan = { rooms: [], tables: [] };

describe("FloorPlanSidebar", () => {
  it("adds a room via the inline form", () => {
    const onChange = vi.fn();
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={emptyPlan}
        tableSizeOptions={[sizedOption()]}
        onChange={onChange}
        onSelectTable={() => {}}
      />
    );
    fireEvent.change(screen.getByLabelText(/^Name$/i), {
      target: { value: "Main hall" },
    });
    fireEvent.change(screen.getByLabelText(/^Width \(m\)$/i), {
      target: { value: "8.5" },
    });
    fireEvent.change(screen.getByLabelText(/^Depth \(m\)$/i), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add room/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as FloorPlan;
    expect(next.rooms).toHaveLength(1);
    expect(next.rooms[0]).toMatchObject({
      name: "Main hall",
      widthCm: 850,
      heightCm: 500,
    });
  });

  it("refuses to add a room when inputs are incomplete", () => {
    const onChange = vi.fn();
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={emptyPlan}
        tableSizeOptions={[sizedOption()]}
        onChange={onChange}
        onSelectTable={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Add room/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("appends a new table with an auto-generated label", () => {
    const onChange = vi.fn();
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={{
          rooms: [],
          tables: [
            {
              id: "existing",
              label: "T1",
              tableSizeOptionId: "ts-std",
              x: 0,
              y: 0,
              assignedApplicationId: null,
            },
          ],
        }}
        tableSizeOptions={[sizedOption()]}
        onChange={onChange}
        onSelectTable={() => {}}
      />
    );
    fireEvent.change(screen.getByLabelText(/Table size/i), {
      target: { value: "ts-std" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add table/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as FloorPlan;
    expect(next.tables).toHaveLength(2);
    expect(next.tables[1].label).toBe("T2");
    expect(next.tables[1].tableSizeOptionId).toBe("ts-std");
  });

  it("shows a Set dimensions link when the catalog has sizeless options", () => {
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={emptyPlan}
        tableSizeOptions={[sizelessOption()]}
        onChange={() => {}}
        onSelectTable={() => {}}
      />
    );
    // The option is rendered but disabled with the "set dimensions" hint.
    const option = screen
      .getByLabelText(/Table size/i)
      .querySelector(`option[value="ts-nodims"]`) as HTMLOptionElement;
    expect(option).not.toBeNull();
    expect(option.textContent).toMatch(/set dimensions/i);
    expect(option.disabled).toBe(true);
  });

  it("fires onSelectTable when the Assign button on a table row is clicked", () => {
    const onSelectTable = vi.fn();
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={{
          rooms: [],
          tables: [
            {
              id: "tbl-1",
              label: "T1",
              tableSizeOptionId: "ts-std",
              x: 0,
              y: 0,
              assignedApplicationId: null,
            },
          ],
        }}
        tableSizeOptions={[sizedOption()]}
        onChange={() => {}}
        onSelectTable={onSelectTable}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Assign artist to T1/i })
    );
    expect(onSelectTable).toHaveBeenCalledWith("tbl-1");
  });

  it("deletes rooms and tables via their row delete buttons", () => {
    const onChange = vi.fn();
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={{
          rooms: [
            {
              id: "r-1",
              name: "Hall",
              x: 0,
              y: 0,
              widthCm: 500,
              heightCm: 400,
            },
          ],
          tables: [
            {
              id: "t-1",
              label: "T1",
              tableSizeOptionId: "ts-std",
              x: 0,
              y: 0,
              assignedApplicationId: null,
            },
          ],
        }}
        tableSizeOptions={[sizedOption()]}
        onChange={onChange}
        onSelectTable={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Delete Hall/i }));
    expect(onChange).toHaveBeenLastCalledWith({
      rooms: [],
      tables: expect.any(Array),
    });
    fireEvent.click(screen.getByRole("button", { name: /Delete T1/i }));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.tables).toHaveLength(0);
  });
});
