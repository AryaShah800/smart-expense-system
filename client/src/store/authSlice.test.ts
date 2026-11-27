import { describe, it, expect, vi } from "vitest";
import api from "../api/axios";
import { makeStore } from "./index";
import { loggedIn, loggedOut, userUpdated, verifySession, USER_STORAGE_KEY } from "./authSlice";
import { notificationReceived } from "./notificationsSlice";
import { httpError, notification, serverDownError, user } from "../test/fixtures";

const stored = () => JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? "null");

describe("auth slice", () => {
  it("restores the signed-in user from localStorage, without any legacy token", () => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, accessToken: "old", data: { token: "old" } }));
    const withoutToken = { ...user };
    delete withoutToken.token;
    expect(makeStore().getState().auth.user).toEqual(withoutToken);
  });

  it("sends no Authorization header, even with an old token in storage (cookie-only auth)", async () => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, token: "legacy-jwt" }));
    let seen: Record<string, unknown> | undefined;
    await api.get("/anything", {
      adapter: async (config) => {
        seen = { ...config.headers };
        return { data: {}, status: 200, statusText: "OK", headers: {}, config };
      },
    });
    expect(seen?.Authorization).toBeUndefined();
  });

  it("ignores a corrupted stored session", () => {
    localStorage.setItem(USER_STORAGE_KEY, "{broken");
    expect(makeStore().getState().auth.user).toBeNull();
  });

  it("persists login and profile updates, and clears them on logout", () => {
    const store = makeStore();
    store.dispatch(loggedIn(user));
    expect(stored()).toEqual(user);

    store.dispatch(userUpdated({ currency: "USD", theme: "dark" }));
    expect(stored()).toMatchObject({ _id: "u1", currency: "USD", theme: "dark" });

    store.dispatch(loggedOut());
    expect(store.getState().auth.user).toBeNull();
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
  });

  it("clears user data in other slices on logout", () => {
    const store = makeStore();
    store.dispatch(loggedIn(user));
    store.dispatch(notificationReceived(notification("n1")));
    store.dispatch(loggedOut());
    expect(store.getState().notifications.items).toEqual([]);
  });
});

describe("verifySession (cold-start fix)", () => {
  it("signs out when the API says the session expired (401)", async () => {
    vi.spyOn(api, "get").mockRejectedValue(httpError(401));
    const store = makeStore({ auth: { user } });
    await store.dispatch(verifySession());
    expect(store.getState().auth.user).toBeNull();
  });

  it.each([
    ["the server cannot be reached", serverDownError()],
    ["the server returns a 500", httpError(500)],
  ])("keeps the user signed in when %s", async (_, error) => {
    vi.spyOn(api, "get").mockRejectedValue(error);
    const store = makeStore({ auth: { user } });
    await store.dispatch(verifySession());
    expect(store.getState().auth.user).toEqual(user);
  });
});
