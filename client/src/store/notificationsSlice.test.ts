import { describe, it, expect, vi } from "vitest";
import api from "../api/axios";
import { makeStore } from "./index";
import { fetchNotifications, markAllRead, notificationReceived } from "./notificationsSlice";
import { selectUnreadCount } from "./hooks";
import { httpError, notification, user } from "../test/fixtures";

describe("notifications slice", () => {
  it("loads notifications, prepends real-time ones and counts unread", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: [notification("n1", true), notification("n2")] });
    const store = makeStore({ auth: { user } });

    await store.dispatch(fetchNotifications());
    store.dispatch(notificationReceived(notification("n3")));

    expect(store.getState().notifications.items.map((n) => n._id)).toEqual(["n3", "n1", "n2"]);
    expect(selectUnreadCount(store.getState())).toBe(2);
  });

  it("marks everything read only after the API confirms", async () => {
    const put = vi.spyOn(api, "put").mockResolvedValue({ data: {} });
    const store = makeStore({ notifications: { items: [notification("n1"), notification("n2")] } });

    await store.dispatch(markAllRead());

    expect(put).toHaveBeenCalledWith("/users/notifications/read");
    expect(selectUnreadCount(store.getState())).toBe(0);
  });

  it("keeps unread state when marking as read fails", async () => {
    vi.spyOn(api, "put").mockRejectedValue(httpError(500));
    const store = makeStore({ notifications: { items: [notification("n1")] } });
    await store.dispatch(markAllRead());
    expect(selectUnreadCount(store.getState())).toBe(1);
  });
});
