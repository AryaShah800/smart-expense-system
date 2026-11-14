import { describe, expect, it } from "vitest";
import { createQueryClient, clearCacheOnUserChange, queryKeys } from "./queryClient";
import { makeStore } from "../store";
import { loggedIn, loggedOut } from "../store/authSlice";
import { user } from "../test/fixtures";

describe("clearCacheOnUserChange", () => {
  it("drops cached server data on logout so the next user never sees it", () => {
    const store = makeStore({ auth: { user } });
    const client = createQueryClient({ retry: false });
    clearCacheOnUserChange(store, client);
    client.setQueryData(queryKeys.transactions, [{ _id: "t1" }]);

    store.dispatch(loggedOut());

    expect(client.getQueryData(queryKeys.transactions)).toBeUndefined();
  });

  it("keeps the cache when the same user's profile changes", () => {
    const store = makeStore({ auth: { user } });
    const client = createQueryClient({ retry: false });
    clearCacheOnUserChange(store, client);
    client.setQueryData(queryKeys.groups, [{ _id: "g1" }]);

    store.dispatch(loggedIn({ ...user, currency: "USD" }));

    expect(client.getQueryData(queryKeys.groups)).toEqual([{ _id: "g1" }]);
  });

  it("clears when a different account signs in", () => {
    const store = makeStore({ auth: { user } });
    const client = createQueryClient({ retry: false });
    clearCacheOnUserChange(store, client);
    client.setQueryData(queryKeys.groups, [{ _id: "g1" }]);

    store.dispatch(loggedIn({ ...user, _id: "u2" }));

    expect(client.getQueryData(queryKeys.groups)).toBeUndefined();
  });
});
