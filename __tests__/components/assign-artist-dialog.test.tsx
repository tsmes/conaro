import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AssignArtistDialog } from "@/components/floor-plans/assign-artist-dialog";
import type {
  FloorPlan,
  FloorPlanTable,
  TableSizeOption,
} from "@/lib/db/schema/events";

const sizeStd: TableSizeOption = {
  id: "ts-std",
  label: "Standard",
  priceNok: 1200,
  widthCm: 120,
  depthCm: 80,
};

const sizeCorner: TableSizeOption = {
  id: "ts-corner",
  label: "Corner",
  priceNok: 1500,
  widthCm: 100,
  depthCm: 100,
};

function makeTable(
  overrides: Partial<FloorPlanTable> = {}
): FloorPlanTable {
  return {
    id: "t-1",
    label: "T1",
    tableSizeOptionId: "ts-std",
    roomId: "r-1",
    rotationDeg: 0,
    x: 0,
    y: 0,
    assignedApplicationId: null,
    ...overrides,
  };
}

describe("AssignArtistDialog", () => {
  it("renders nothing when no table is provided", () => {
    const { container } = render(
      <AssignArtistDialog
        open
        onOpenChange={() => {}}
        table={null}
        acceptedArtists={[]}
        tableSizeOptions={[sizeStd]}
        plan={{ rooms: [], tables: [] }}
        onAssign={() => {}}
      />
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("lists accepted artists and fires onAssign when one is picked", () => {
    const onAssign = vi.fn();
    const onOpenChange = vi.fn();
    const table = makeTable();
    const plan: FloorPlan = { rooms: [], tables: [table] };
    render(
      <AssignArtistDialog
        open
        onOpenChange={onOpenChange}
        table={table}
        acceptedArtists={[
          {
            applicationId: "app-1",
            displayName: "Elena",
            requestedTableSizeOptionId: "ts-std",
          },
          {
            applicationId: "app-2",
            displayName: "Mika",
            requestedTableSizeOptionId: "ts-std",
          },
        ]}
        tableSizeOptions={[sizeStd]}
        plan={plan}
        onAssign={onAssign}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Elena/i }));
    expect(onAssign).toHaveBeenCalledWith("app-1");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a Size mismatch badge when the artist's requested size differs", () => {
    const table = makeTable({ tableSizeOptionId: "ts-std" });
    render(
      <AssignArtistDialog
        open
        onOpenChange={() => {}}
        table={table}
        acceptedArtists={[
          {
            applicationId: "app-1",
            displayName: "Elena",
            requestedTableSizeOptionId: "ts-corner",
          },
        ]}
        tableSizeOptions={[sizeStd, sizeCorner]}
        plan={{ rooms: [], tables: [table] }}
        onAssign={() => {}}
      />
    );
    expect(screen.getByText(/Size mismatch/i)).toBeInTheDocument();
  });

  it("disables an artist already assigned to another table", () => {
    const tableA = makeTable({ id: "t-a", label: "T-A" });
    const tableB = makeTable({
      id: "t-b",
      label: "T-B",
      assignedApplicationId: "app-1",
    });
    render(
      <AssignArtistDialog
        open
        onOpenChange={() => {}}
        table={tableA}
        acceptedArtists={[
          {
            applicationId: "app-1",
            displayName: "Elena",
            requestedTableSizeOptionId: "ts-std",
          },
        ]}
        tableSizeOptions={[sizeStd]}
        plan={{ rooms: [], tables: [tableA, tableB] }}
        onAssign={() => {}}
      />
    );
    const btn = screen.getByRole("button", { name: /Elena/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/Assigned to T-B/i)).toBeInTheDocument();
  });

  it("shows a Clear assignment action only when the table currently has one, and fires onAssign(null)", () => {
    const onAssign = vi.fn();
    const onOpenChange = vi.fn();
    const table = makeTable({ assignedApplicationId: "app-1" });
    render(
      <AssignArtistDialog
        open
        onOpenChange={onOpenChange}
        table={table}
        acceptedArtists={[
          {
            applicationId: "app-1",
            displayName: "Elena",
            requestedTableSizeOptionId: "ts-std",
          },
        ]}
        tableSizeOptions={[sizeStd]}
        plan={{ rooms: [], tables: [table] }}
        onAssign={onAssign}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Clear assignment/i })
    );
    expect(onAssign).toHaveBeenCalledWith(null);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
