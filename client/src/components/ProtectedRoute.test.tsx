import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { AxiosError } from "axios";
import ProtectedRoute from "./ProtectedRoute";
import api from "../api/axios";
import { renderWithProviders } from "../test/utils";

vi.mock("../api/axios", () => ({ default: { get: vi.fn() } }));
const get = vi.mocked(api.get);

function renderApp(user: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<p>Login page</p>} />
      <Route
        path="/secret"
        element={
          <ProtectedRoute>
            <p>Secret content</p>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { route: "/secret", ...user }
  );
}

function httpError(status: number) {
  return new AxiosError("failed", "ERR", undefined, undefined, { status } as never);
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    get.mockReset();
  });

  it("redirects to /login without calling the API when nobody is signed in", () => {
    renderApp({ user: null });
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("shows the page immediately for a stored user and confirms the session in the background", async () => {
    get.mockResolvedValue({ data: {} });
    renderApp();
    expect(screen.getByText("Secret content")).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/users/me"));
    expect(screen.getByText("Secret content")).toBeInTheDocument();
  });

  it("signs the user out when the session has expired (401)", async () => {
    get.mockRejectedValue(httpError(401));
    renderApp();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(localStorage.getItem("user")).toBeNull();
  });

  it.each([500, 503])("keeps the user signed in on a server error (%i)", async (status) => {
    get.mockRejectedValue(httpError(status));
    renderApp();
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.getByText("Secret content")).toBeInTheDocument();
    expect(localStorage.getItem("user")).not.toBeNull();
  });

  it("keeps the user signed in when the server is unreachable (Render cold start, offline)", async () => {
    get.mockRejectedValue(new AxiosError("Network Error", "ERR_NETWORK"));
    renderApp();
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(screen.getByText("Secret content")).toBeInTheDocument();
    expect(localStorage.getItem("user")).not.toBeNull();
  });
});
