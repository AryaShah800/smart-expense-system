import { describe, expect, it } from "vitest";
import { startOfLocalDay, startOfNextLocalDay, todayLocal } from "./localDate";

describe("local dates", () => {
  it("today is the local calendar day, padded", () => {
    expect(todayLocal(new Date(2026, 0, 5, 0, 30))).toBe("2026-01-05");
    expect(todayLocal(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("a day filter covers local midnight up to (not including) the next local midnight", () => {
    const start = startOfLocalDay("2026-11-27");
    const end = startOfNextLocalDay("2026-11-27");
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([2026, 10, 27, 0]);
    expect([end.getMonth(), end.getDate(), end.getHours()]).toEqual([10, 28, 0]);
    // Month and year roll over.
    expect(startOfNextLocalDay("2026-12-31").getFullYear()).toBe(2027);
  });
});
