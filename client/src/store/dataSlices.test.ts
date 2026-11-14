import { describe, it, expect, vi } from "vitest";
import api from "../api/axios";
import { makeStore } from "./index";
import { loggedOut } from "./authSlice";
import { fetchNotifications, markAllRead, notificationReceived } from "./notificationsSlice";
import { deleteTransaction, fetchTransactions } from "./transactionsSlice";
import { fetchGroups } from "./groupsSlice";
import { selectUnreadCount } from "./hooks";
import { httpError, notification, serverDownError, transaction, user } from "../test/fixtures";

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

describe("transactions slice", () => {
  it("tracks loading and stores the fetched list", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: [transaction("t1"), transaction("t2")] });
    const store = makeStore();

    const pending = store.dispatch(fetchTransactions());
    expect(store.getState().transactions.status).toBe("loading");
    await pending;

    expect(store.getState().transactions).toMatchObject({ status: "succeeded", error: null });
    expect(store.getState().transactions.items).toHaveLength(2);
  });

  it("reports an unreachable server separately from an API error", async () => {
    const get = vi.spyOn(api, "get").mockRejectedValueOnce(serverDownError());
    const store = makeStore();
    await store.dispatch(fetchTransactions());
    expect(store.getState().transactions.error).toEqual({ serverDown: true, message: "Failed to load transactions." });

    get.mockRejectedValueOnce(httpError(403, "Not allowed"));
    await store.dispatch(fetchTransactions());
    expect(store.getState().transactions).toMatchObject({ status: "failed", error: { serverDown: false, message: "Not allowed" } });
  });

  it("removes a transaction only after the API deletes it", async () => {
    const del = vi.spyOn(api, "delete").mockRejectedValueOnce(httpError(500));
    const store = makeStore({ transactions: { items: [transaction("t1"), transaction("t2")], status: "succeeded", error: null } });

    await store.dispatch(deleteTransaction("t1"));
    expect(store.getState().transactions.items).toHaveLength(2);

    del.mockResolvedValueOnce({ data: {} });
    await store.dispatch(deleteTransaction("t1"));
    expect(del).toHaveBeenLastCalledWith("/transactions/t1");
    expect(store.getState().transactions.items.map((t) => t._id)).toEqual(["t2"]);
  });

  it("forgets the previous user's data on logout", () => {
    const store = makeStore({ auth: { user }, transactions: { items: [transaction("t1")], status: "succeeded", error: null } });
    store.dispatch(loggedOut());
    expect(store.getState().transactions).toEqual({ items: [], status: "idle", error: null });
  });
});

describe("groups slice", () => {
  it("stores fetched groups and a load error", async () => {
    const group = { _id: "g1", name: "Trip", type: "Travel", adminId: "u1", members: [], joinCode: "ABC123", createdAt: "" };
    const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: [group] });
    const store = makeStore();

    await store.dispatch(fetchGroups());
    expect(store.getState().groups.items).toEqual([group]);

    get.mockRejectedValueOnce(serverDownError());
    await store.dispatch(fetchGroups());
    expect(store.getState().groups.error?.serverDown).toBe(true);
  });
});
