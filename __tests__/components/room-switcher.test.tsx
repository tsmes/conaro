import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RoomSwitcher } from "@/components/floor-plans/room-switcher";
import type { FloorPlan } from "@/lib/db/schema/events";

const emptyPlan: FloorPlan = { rooms: [], tables: [] };

const twoRoomPlan: FloorPlan = {
  rooms: [
    { id: "r-1", name: "Main hall", x: 0, y: 0, widthCm: 800, heightCm: 500 },
    { id: "r-2", name: "Side room", x: 0, y: 0, widthCm: 400, heightCm: 300 },
  ],
  tables: [
    {
      id: "t-1",
      label: "T1",
      tableSizeOptionId: "ts-std",
      roomId: "r-2",
      x: 0,
      y: 0,
      assignedApplicationId: null,
    },
  ],
};

describe("RoomSwitcher", () => {
  it("adds a room through the dialog and makes it active", () => {
    const onChange = vi.fn();
    const onActiveRoomChange = vi.fn();
    render(
      <RoomSwitcher
        plan={emptyPlan}
        activeRoomId={null}
        onActiveRoomChange={onActiveRoomChange}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /New room/i }));
    fireEvent.change(screen.getByLabelText(/^Name$/i), {
      target: { value: "Main hall" },
    });
    fireEvent.change(screen.getByLabelText(/^Width \(m\)$/i), {
      target: { value: "8.5" },
    });
    fireEvent.change(screen.getByLabelText(/^Depth \(m\)$/i), {
      target: { value: "5" },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Add room$/i })[0]
    );

    const next = onChange.mock.calls[0][0] as FloorPlan;
    expect(next.rooms).toHaveLength(1);
    expect(next.rooms[0]).toMatchObject({
      name: "Main hall",
      widthCm: 850,
      heightCm: 500,
    });
    expect(onActiveRoomChange).toHaveBeenCalledWith(next.rooms[0].id);
  });

  it("switches the active room when another pill is clicked", () => {
    const onActiveRoomChange = vi.fn();
    render(
      <RoomSwitcher
        plan={twoRoomPlan}
        activeRoomId="r-1"
        onActiveRoomChange={onActiveRoomChange}
        onChange={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Side room/i }));
    expect(onActiveRoomChange).toHaveBeenCalledWith("r-2");
  });

  it("deletes the active room and its tables when confirmed", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onChange = vi.fn();
    const onActiveRoomChange = vi.fn();
    render(
      <RoomSwitcher
        plan={twoRoomPlan}
        activeRoomId="r-2"
        onActiveRoomChange={onActiveRoomChange}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Delete room/i }));

    const next = onChange.mock.calls[0][0] as FloorPlan;
    expect(next.rooms.map((r) => r.id)).toEqual(["r-1"]);
    // Tables in the deleted room go away too.
    expect(next.tables.some((t) => t.roomId === "r-2")).toBe(false);
    expect(onActiveRoomChange).toHaveBeenCalledWith("r-1");

    confirmSpy.mockRestore();
  });
});
