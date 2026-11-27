import { afterEach, describe, expect, it, vi } from "vitest";
import api from "./axios";
import { fetchSocketAuth, socket } from "./socket";

afterEach(() => vi.restoreAllMocks());

describe("socket authentication", () => {
  it("asks the API for a socket token and hands it to Socket.IO as auth.token", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: { token: "socket-jwt" } });
    const auth = await new Promise((resolve) => fetchSocketAuth(resolve));

    expect(get).toHaveBeenCalledWith("/users/socket-token");
    expect(auth).toEqual({ token: "socket-jwt" });
  });

  it("connects without a token (and is refused by the server) when the token request fails", async () => {
    vi.spyOn(api, "get").mockRejectedValue(new Error("offline"));
    const auth = await new Promise((resolve) => fetchSocketAuth(resolve));

    expect(auth).toEqual({});
  });

  it("is configured to fetch a fresh token on every (re)connection and send credentials", () => {
    expect(socket.auth).toBe(fetchSocketAuth);
    expect(socket.io.opts.withCredentials).toBe(true);
    expect(socket.io.opts.autoConnect).toBe(false);
  });
});
