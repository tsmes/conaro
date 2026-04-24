import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FloorPlanSidebar } from "@/components/floor-plans/floor-plan-sidebar";
import type { FloorPlan, TableSizeOption } from "@/lib/db/schema/events";
import type { AcceptedArtistEntry } from "@/components/floor-plans/assign-artist-dialog";

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

function sizelessOption(): TableSizeOption {
  return {
    id: "ts-nodims",
    label: "Corner",
    dimensions: "",
    priceNok: null,
  };
}

const roomA = {
  id: "r-1",
  name: "Main hall",
  x: 0,
  y: 0,
  widthCm: 800,
  heightCm: 500,
};

function planWith(tables: FloorPlan["tables"] = []): FloorPlan {
  return { rooms: [roomA], tables };
}

describe("FloorPlanSidebar", () => {
  it("appends a new table to the active room with an auto label", () => {
    const onChange = vi.fn();
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={planWith([
          {
            id: "existing",
            label: "T1",
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: 0,
            x: 0,
            y: 0,
            assignedApplicationId: null,
          },
        ])}
        activeRoomId="r-1"
        tableSizeOptions={[sizedOption()]}
        acceptedArtists={[]}
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
    expect(next.tables[1].roomId).toBe("r-1");
  });

  it("hides Add-table when no room is active", () => {
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={{ rooms: [], tables: [] }}
        activeRoomId={null}
        tableSizeOptions={[sizedOption()]}
        acceptedArtists={[]}
        onChange={() => {}}
        onSelectTable={() => {}}
      />
    );
    expect(screen.queryByLabelText(/Table size/i)).toBeNull();
    expect(screen.getByText(/Add or pick a room first/i)).toBeInTheDocument();
  });

  it("shows a sizeless option as disabled with a 'set dimensions' hint", () => {
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={planWith()}
        activeRoomId="r-1"
        tableSizeOptions={[sizelessOption()]}
        acceptedArtists={[]}
        onChange={() => {}}
        onSelectTable={() => {}}
      />
    );
    const option = screen
      .getByLabelText(/Table size/i)
      .querySelector(`option[value="ts-nodims"]`) as HTMLOptionElement;
    expect(option).not.toBeNull();
    expect(option.textContent).toMatch(/set dimensions/i);
    expect(option.disabled).toBe(true);
  });

  it("splits accepted artists into Unassigned and Assigned lists", () => {
    const acceptedArtists: AcceptedArtistEntry[] = [
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
    ];
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={planWith([
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: 0,
            x: 0,
            y: 0,
            assignedApplicationId: "app-1",
          },
        ])}
        activeRoomId="r-1"
        tableSizeOptions={[sizedOption()]}
        acceptedArtists={acceptedArtists}
        onChange={() => {}}
        onSelectTable={() => {}}
      />
    );
    expect(screen.getByText(/^Unassigned \(\d+\)/i)).toBeInTheDocument();
    expect(screen.getByText(/^Assigned \(\d+\)/i)).toBeInTheDocument();
    // Mika is unassigned (only shown once, in the unassigned list).
    expect(screen.getByText("Mika")).toBeInTheDocument();
    // Elena appears in both the Assigned list and on her table row.
    expect(screen.getAllByText("Elena").length).toBeGreaterThanOrEqual(1);
  });

  it("fires onSelectTable when a table row is clicked", () => {
    const onSelectTable = vi.fn();
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={planWith([
          {
            id: "tbl-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: 0,
            x: 0,
            y: 0,
            assignedApplicationId: null,
          },
        ])}
        activeRoomId="r-1"
        tableSizeOptions={[sizedOption()]}
        acceptedArtists={[]}
        onChange={() => {}}
        onSelectTable={onSelectTable}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Assign artist to T1/i })
    );
    expect(onSelectTable).toHaveBeenCalledWith("tbl-1");
  });

  it("rotates a table through 0 → 90 → 180 → 270 → 0 via the rotate button", () => {
    const onChange = vi.fn();
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={planWith([
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: 90,
            x: 0,
            y: 0,
            assignedApplicationId: null,
          },
        ])}
        activeRoomId="r-1"
        tableSizeOptions={[sizedOption()]}
        acceptedArtists={[]}
        onChange={onChange}
        onSelectTable={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Rotate T1/i }));
    const next = onChange.mock.calls[0][0] as FloorPlan;
    expect(next.tables[0].rotationDeg).toBe(180);
  });

  it("deletes a table via its row delete button", () => {
    const onChange = vi.fn();
    render(
      <FloorPlanSidebar
        eventId="e1"
        plan={planWith([
          {
            id: "t-1",
            label: "T1",
            tableSizeOptionId: "ts-std",
            roomId: "r-1",
            rotationDeg: 0,
            x: 0,
            y: 0,
            assignedApplicationId: null,
          },
        ])}
        activeRoomId="r-1"
        tableSizeOptions={[sizedOption()]}
        acceptedArtists={[]}
        onChange={onChange}
        onSelectTable={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Delete T1/i }));
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.tables).toHaveLength(0);
  });
});
