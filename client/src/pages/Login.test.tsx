import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "./Login";
import api from "../api/axios";
import { renderWithProviders } from "../test/utils";

vi.mock("../api/axios", async () => {
  const actual = await vi.importActual<typeof import("../api/axios")>("../api/axios");
  return { ...actual, default: { get: vi.fn(), post: vi.fn() } };
});
const get = vi.mocked(api.get);
const post = vi.mocked(api.post);

beforeEach(() => vi.clearAllMocks());

describe("Login demo button", () => {
  it("is hidden when the server has demo mode off", async () => {
    get.mockResolvedValue({ data: { enabled: false } });
    renderWithProviders(<Login />, { preloadedState: { auth: { user: null } } });
    await waitFor(() => expect(get).toHaveBeenCalledWith("/users/demo-status"));
    expect(screen.queryByRole("button", { name: /try the demo/i })).toBeNull();
  });

  it("signs in through /users/demo-login when demo mode is on", async () => {
    get.mockResolvedValue({ data: { enabled: true } });
    post.mockResolvedValue({ data: { _id: "d1", username: "Demo User", email: "demo@smartexpense.app" } });
    renderWithProviders(<Login />, { preloadedState: { auth: { user: null } } });
    await userEvent.click(await screen.findByRole("button", { name: /try the demo/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/users/demo-login"));
  });
});
