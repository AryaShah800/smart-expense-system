import { describe, it, expect, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../api/queryClient";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import api from "../api/axios";
import { socket } from "../api/socket";
import { makeStore } from "../store";
import { loggedOut } from "../store/authSlice";
import Layout from "./Layout";
import ProtectedRoute from "./ProtectedRoute";
import { httpError, notification, serverDownError, user } from "../test/fixtures";

function renderApp(store = makeStore({ auth: { user } })) {
  render(
    <Provider store={store}>
      <QueryClientProvider client={createQueryClient({ retry: false })}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/login" element={<p>Login page</p>} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<p>Dashboard page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  );
  return store;
}

function stubSocket() {
  return {
    connect: vi.spyOn(socket, "connect").mockReturnValue(socket),
    disconnect: vi.spyOn(socket, "disconnect").mockReturnValue(socket),
  };
}

describe("Layout notifications", () => {
  it("fetches notifications and connects the socket once, although Navbar and Header both show them", async () => {
    const { connect } = stubSocket();
    const get = vi.spyOn(api, "get").mockImplementation(async (url: string) =>
      url === "/users/notifications" ? { data: [notification("n1"), notification("n2")] } : { data: user }
    );

    const store = renderApp();

    await waitFor(() => expect(store.getState().notifications.items).toHaveLength(2));
    expect(get.mock.calls.filter(([url]) => url === "/users/notifications")).toHaveLength(1);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("disconnects the socket when the user signs out", async () => {
    const { disconnect } = stubSocket();
    vi.spyOn(api, "get").mockResolvedValue({ data: [] });
    const store = renderApp();
    await screen.findByText("Dashboard page");

    act(() => {
      store.dispatch(loggedOut());
    });

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();
  });
});

describe("ProtectedRoute", () => {
  it("sends signed-out visitors to the login page", () => {
    renderApp(makeStore({ auth: { user: null } }));
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("stays on the page during a cold start, and signs out on a 401", async () => {
    stubSocket();
    const get = vi.spyOn(api, "get").mockImplementation(async (url: string) => {
      if (url === "/users/me") throw serverDownError();
      return { data: [] };
    });
    renderApp();
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/users/me"));
    expect(screen.getByText("Dashboard page")).toBeInTheDocument();
  });

  it("signs out when the background session check returns 401", async () => {
    stubSocket();
    vi.spyOn(api, "get").mockImplementation(async (url: string) => {
      if (url === "/users/me") throw httpError(401);
      return { data: [] };
    });
    const store = renderApp();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(store.getState().auth.user).toBeNull();
  });
});
