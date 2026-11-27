import { describe, expect, it } from "vitest";
import reducer, { notificationReceived as received, toNotification } from "./notificationsSlice";

describe("live notifications", () => {
  it("drops payloads without a text message", () => {
    for (const raw of [null, undefined, "hi", 42, {}, { message: 5 }, { message: "   " }]) {
      expect(toNotification(raw)).toBeNull();
      expect(reducer({ items: [] }, received(raw)).items).toEqual([]);
    }
  });

  it("gives live events a unique id and a valid timestamp", () => {
    const a = toNotification({ message: "New expense", isRead: false, createdAt: "not a date" });
    const b = toNotification({ message: "New expense" });
    expect(a?._id).toMatch(/^live-/);
    expect(a?._id).not.toBe(b?._id);
    expect(Number.isNaN(Date.parse(a!.createdAt))).toBe(false);
    expect(a?.isRead).toBe(false);
  });

  it("keeps the server's id and time when present, newest first", () => {
    const state = reducer(
      { items: [{ _id: "n1", message: "old", isRead: true, createdAt: "2026-11-01T00:00:00.000Z" }] },
      received({ _id: "n2", message: "new", isRead: false, createdAt: "2026-11-27T10:00:00.000Z" })
    );
    expect(state.items.map((n) => n._id)).toEqual(["n2", "n1"]);
    expect(state.items[0]?.createdAt).toBe("2026-11-27T10:00:00.000Z");
  });
});
