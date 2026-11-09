import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../context/AuthContext";
import { createQueryClient, queryKeys } from "../api/queryClient";
import { useRealtime } from "./useRealtime";
import { socket } from "../api/socket";
import { testUser } from "../test/utils";
import type { Notification } from "../types";

type Handler = (...args: unknown[]) => void;
const handlers = new Map<string, Handler>();

vi.mock("../api/socket", () => ({
  socket: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn((event: string, fn: Handler) => handlers.set(event, fn)),
    off: vi.fn((event: string) => handlers.delete(event)),
  },
}));

function setup(signedIn = true) {
  if (signedIn) localStorage.setItem("user", JSON.stringify(testUser));
  const queryClient = createQueryClient({ retry: false });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  const hook = renderHook(() => useRealtime(), { wrapper });
  return { queryClient, ...hook };
}

describe("useRealtime", () => {
  beforeEach(() => {
    handlers.clear();
    vi.mocked(socket.connect).mockClear();
    vi.mocked(socket.disconnect).mockClear();
  });

  it("does not open a connection when signed out", () => {
    setup(false);
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it("connects once signed in and disconnects on unmount", () => {
    const { unmount } = setup();
    expect(socket.connect).toHaveBeenCalledOnce();
    unmount();
    expect(socket.disconnect).toHaveBeenCalledOnce();
    expect(handlers.size).toBe(0);
  });

  it("prepends a pushed notification to the cached list", () => {
    const { queryClient } = setup();
    const existing: Notification = { message: "old", isRead: true, createdAt: "2026-01-01T00:00:00Z" };
    queryClient.setQueryData(queryKeys.notifications, [existing]);

    const pushed: Notification = { message: "new expense", isRead: false, createdAt: "2026-02-01T00:00:00Z" };
    act(() => handlers.get("new_notification")?.(pushed));

    expect(queryClient.getQueryData(queryKeys.notifications)).toEqual([pushed, existing]);
  });

  it("refreshes group data when a notification arrives", () => {
    const { queryClient } = setup();
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    act(() => handlers.get("new_notification")?.({ message: "x", isRead: false, createdAt: "" }));

    const keys = spy.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toContainEqual(queryKeys.groups);
    expect(keys).toContainEqual(["group"]);
  });

  it("refreshes invitations when an invite arrives", () => {
    const { queryClient } = setup();
    const spy = vi.spyOn(queryClient, "invalidateQueries");
    act(() => handlers.get("new_invite")?.());
    expect(spy).toHaveBeenCalledWith({ queryKey: queryKeys.invitations });
  });
});
